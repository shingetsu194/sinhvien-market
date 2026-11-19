<?php

namespace App\Services\Matching;

use App\Models\MarketplaceMatching;

/**
 * Smart product search for a buyer REQUEST: semantic (Gemini text+image)
 * scoring of real active listings, then MatchingEngine for hard filters,
 * explanation and counterfactual suggestions.
 *
 * Transparency: the result always says which mode produced it. If Gemini is
 * not configured or fails, it falls back to the local keyword baseline and
 * reports mode "keyword_fallback" with a reason, never the Gemini label.
 */
class SmartSearchService
{
    /** Max listings embedded during one search (bounds latency and API quota). */
    public const INDEX_BUDGET_PER_SEARCH = 25;
    /** Threshold of the B1 keyword baseline in the prototype experiment. */
    private const KEYWORD_MIN_SEMANTIC = 0.28;

    public function __construct(
        private readonly GeminiEmbeddingService $gemini = new GeminiEmbeddingService(),
        private readonly MarketplaceMatching $model = new MarketplaceMatching(),
    ) {
    }

    /**
     * @param array $request BuyerRequestValidator output (description = buyer text)
     * @param ?int $excludeUserId don't show the buyer their own listings
     */
    public function search(array $request, ?int $excludeUserId = null, int $limit = 20): array
    {
        $t0 = microtime(true);
        $candidates = $this->model->smartCandidates($excludeUserId);
        $warnings = [];
        $mode = 'semantic';
        $fallbackReason = null;
        $indexed = 0;

        $qText = $this->gemini->available()
            ? $this->gemini->embedText($request['description'], 'RETRIEVAL_QUERY') : null;
        if ($qText === null) {
            $mode = 'keyword_fallback';
            $fallbackReason = $this->gemini->available() ? ($this->gemini->lastError() ?? 'api_error') : 'not_configured';
        }

        if ($mode === 'semantic') {
            $qImage = null;
            if (!empty($request['imageData'])) {
                $qImage = $this->gemini->embedImage($request['imageData'], (string)$request['imageMime']);
                if ($qImage === null) {
                    $warnings[] = 'image_unavailable';
                }
            }
            [$candidates, $indexed, $missing] = $this->attachVectors($candidates);
            if ($missing > 0) {
                $warnings[] = 'partial_index';
            }
            $candidates = self::semanticScores($candidates, $qText, $qImage, self::keywordScores($request, $candidates));
            $minSemantic = MatchingEngine::DEFAULT_MIN_SEMANTIC;
        } else {
            // Baseline B1 of the experiment: Vietnamese BM25 only, clearly labelled.
            $keyword = self::keywordScores($request, $candidates);
            foreach ($candidates as &$c) {
                $c['semantic'] = $keyword[$c['id']] ?? 0.0;
                $c['semanticVia'] = 'keyword';
            }
            unset($c);
            $minSemantic = self::KEYWORD_MIN_SEMANTIC;
        }

        $ranked = MatchingEngine::rank($request, $candidates, $minSemantic, $limit);
        $byId = [];
        foreach ($candidates as $c) {
            $byId[(int)$c['id']] = $c;
        }

        return [
            'mode' => $mode,
            'modelKey' => $mode === 'semantic' ? $this->gemini->modelKey() . '+bm25-vi' : 'keyword-bm25-vi',
            'fallbackReason' => $fallbackReason,
            'warnings' => $warnings,
            'indexedDuringSearch' => $indexed,
            'latencyMs' => (int)round((microtime(true) - $t0) * 1000),
            'relevantCount' => $ranked['relevantCount'],
            'hardBlockers' => (object)$ranked['hardBlockers'],
            'results' => array_map(static fn(array $r): array => self::productDto($byId[$r['id']]) + $r, $ranked['results']),
            'counterfactuals' => array_map(static function (array $cf) use ($byId): array {
                $cf['unlockedProducts'] = array_map(
                    static fn(int $id): array => self::productDto($byId[$id]),
                    array_slice($cf['unlockedProductIds'], 0, 3)
                );
                return $cf;
            }, $ranked['counterfactuals']),
        ];
    }

    /**
     * Precompute vectors for every active listing (CLI/admin), unbounded.
     * @return array{mode:string, modelKey:string, candidates:int, indexed:int, missing:int}
     */
    public function indexAll(): array
    {
        if (!$this->gemini->available()) {
            return ['mode' => 'not_configured', 'modelKey' => $this->gemini->modelKey(),
                'candidates' => 0, 'indexed' => 0, 'missing' => 0];
        }
        $candidates = $this->model->smartCandidates(null, 1000);
        [, $indexed, $missing] = $this->attachVectors($candidates, PHP_INT_MAX);
        return ['mode' => 'semantic', 'modelKey' => $this->gemini->modelKey(),
            'candidates' => count($candidates), 'indexed' => $indexed, 'missing' => $missing];
    }

    /** Embed listings missing a vector for this model (bounded), using cached ones otherwise. */
    private function attachVectors(array $candidates, int $budget = self::INDEX_BUDGET_PER_SEARCH): array
    {
        $indexed = 0;
        $missing = 0;
        $key = $this->gemini->modelKey();
        foreach ($candidates as &$c) {
            $id = (int)$c['id'];
            $text = $c['title'] . "\n" . $c['description'] . "\nDanh mục: " . $c['category_name'];
            $textHash = hash('sha256', $text);
            $c['textVec'] = $this->model->savedEmbedding($id, $key . ':text', $textHash);
            if ($c['textVec'] === null && $budget > 0) {
                $budget--;
                $c['textVec'] = $this->gemini->embedText($text, 'RETRIEVAL_DOCUMENT');
                if ($c['textVec'] !== null) {
                    $this->model->saveEmbedding($id, $key . ':text', $c['textVec'], $textHash);
                    $indexed++;
                }
            }
            $c['imageVec'] = null;
            if ((int)$c['has_image'] === 1) {
                $image = $this->model->productImage($id);
                if ($image !== null) {
                    $imageHash = hash('sha256', $image['data']);
                    $c['imageVec'] = $this->model->savedEmbedding($id, $key . ':image', $imageHash);
                    if ($c['imageVec'] === null && $budget > 0) {
                        $budget--;
                        $c['imageVec'] = $this->gemini->embedImage($image['data'], $image['mime']);
                        if ($c['imageVec'] !== null) {
                            $this->model->saveEmbedding($id, $key . ':image', $c['imageVec'], $imageHash);
                            $indexed++;
                        }
                    }
                }
            }
            if ($c['textVec'] === null) {
                $missing++;
            }
        }
        unset($c);
        return [$candidates, $indexed, $missing];
    }

    /**
     * Channel scores with the prototype's per-modality calibration for Gemini
     * (cross-modal cosines sit lower than same-modality ones: "modality gap").
     * Constants come from the evaluated prototype; re-tune on a dev split (W8).
     */
    /** @return array<int,float> product id => BM25 relevance (title weighted twice, as in the prototype) */
    private static function keywordScores(array $request, array $candidates): array
    {
        $docs = [];
        foreach ($candidates as $c) {
            $docs[(int)$c['id']] = $c['title'] . ' ' . $c['title'] . ' ' . $c['description'];
        }
        return VietnameseBm25::scores($request['description'], $docs);
    }

    private static function semanticScores(array $candidates, array $qText, ?array $qImage, array $keyword): array
    {
        $clamp = static fn(float $v): float => max(0.0, min(1.0, $v));
        $ti = [];
        $it = [];
        foreach ($candidates as $c) {
            if ($c['imageVec'] !== null) {
                $ti[$c['id']] = GeminiEmbeddingService::cosine($qText, $c['imageVec']);
            }
            if ($qImage !== null && $c['textVec'] !== null) {
                $it[$c['id']] = GeminiEmbeddingService::cosine($qImage, $c['textVec']);
            }
        }
        $meanTi = $ti ? array_sum($ti) / count($ti) : 0.0;
        $meanIt = $it ? array_sum($it) / count($it) : 0.0;

        foreach ($candidates as &$c) {
            $channels = [];
            $tt = $c['textVec'] !== null
                ? $clamp((GeminiEmbeddingService::cosine($qText, $c['textVec']) - 0.45) / (0.83 - 0.45)) : 0.0;
            // Hybrid text channel exactly as evaluated (prototype M1): embedding + Vietnamese BM25.
            $kw = (float)($keyword[$c['id']] ?? 0.0);
            $channels['text'] = $kw > 0 ? $clamp(0.72 * $tt + 0.28 * $kw) : $tt * 0.56;
            if (isset($ti[$c['id']])) {
                $abs = $clamp(($ti[$c['id']] - 0.30) / (0.44 - 0.30));
                $margin = $clamp(($ti[$c['id']] - $meanTi - 0.025) / (0.10 - 0.025));
                $channels['cross'] = min($abs, $margin) * 0.85 + 0.15 * $tt;
            }
            if (isset($it[$c['id']])) {
                $abs = $clamp(($it[$c['id']] - 0.28) / (0.40 - 0.28));
                $margin = $clamp(($it[$c['id']] - $meanIt - 0.03) / (0.12 - 0.03));
                $channels['cross_image'] = min($abs, $margin) * 0.85 + 0.15 * $tt;
            }
            if ($qImage !== null && $c['imageVec'] !== null) {
                $channels['image'] = $clamp((GeminiEmbeddingService::cosine($qImage, $c['imageVec']) - 0.52) / (0.86 - 0.52));
            }
            arsort($channels);
            $best = (string)array_key_first($channels);
            $c['semantic'] = round((float)reset($channels), 4);
            $c['semanticVia'] = match ($best) {
                'image' => 'image',
                'cross', 'cross_image' => 'cross',
                default => 'text',
            };
        }
        unset($c);
        return $candidates;
    }

    /** Same shape as the marketplace list API so the UI reuses one product card. */
    private static function productDto(array $p): array
    {
        $id = (int)$p['id'];
        return [
            'id' => $id,
            'title' => (string)$p['title'],
            'type' => (string)$p['type'],
            'price' => $p['price'] === null ? null : (int)$p['price'],
            'condition' => (string)$p['condition'],
            'categoryId' => (int)$p['category_id'],
            'categoryName' => (string)$p['category_name'],
            'sellerId' => (int)$p['user_id'],
            'sellerName' => (string)$p['seller_name'],
            'sellerVerified' => (bool)$p['seller_verified'],
            'sellerBuildingName' => $p['seller_building_name'],
            'imageUrl' => (int)$p['has_image'] === 1
                ? rtrim((string)($_ENV['APP_URL'] ?? ''), '/') . '/products/image?id=' . $id : null,
            'createdAt' => $p['created_at'] ?? null,
        ];
    }
}
