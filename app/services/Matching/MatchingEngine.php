<?php

namespace App\Services\Matching;

/**
 * REQUEST–OFFER ranking (báo cáo thiết kế §5–6), ported from the evaluated
 * prototype (ai-lab/matching_core.py). Pure: callers supply candidates with a
 * precomputed semantic score in [0,1]; no database or network access here.
 *
 * Request keys: categoryId, budgetMax, minCondition, buildingId, allowExchange,
 *   flags (constraint => "hard"|"soft"; set constraints default to "hard").
 * Candidate keys: id, title, category_id, category_name, type, price,
 *   condition, seller_building_id, seller_building_name, semantic, semanticVia.
 */
final class MatchingEngine
{
    public const SEMANTIC_WEIGHT = 0.75;
    public const STRUCT_WEIGHT = 0.25;
    /** Gemini threshold carried over from the prototype; re-tune on a dev split (W8). */
    public const DEFAULT_MIN_SEMANTIC = 0.40;

    private const CONDITION_RANK = ['worn' => 0, 'used' => 1, 'like_new' => 2, 'new' => 3];
    private const CONDITION_LABEL = [
        'worn' => 'Cũ', 'used' => 'Đã qua sử dụng', 'like_new' => 'Như mới (90%+)', 'new' => 'Mới 100%',
    ];
    private const BUDGET_STEPS = [50000, 100000, 150000, 250000];

    /**
     * @return array{results: list<array>, counterfactuals: list<array>, hardBlockers: array<string,int>,
     *   relevantCount: int}
     */
    public static function rank(array $request, array $candidates, float $minSemantic = self::DEFAULT_MIN_SEMANTIC, int $limit = 20): array
    {
        $request = self::normalise($request);
        $relevant = array_values(array_filter(
            $candidates,
            static fn(array $c): bool => (float)$c['semantic'] >= $minSemantic
        ));

        $results = [];
        $hardBlockers = [];
        foreach ($relevant as $product) {
            $violations = self::hardViolations($request, $product);
            if ($violations !== []) {
                foreach ($violations as $key) {
                    $hardBlockers[$key] = ($hardBlockers[$key] ?? 0) + 1;
                }
                continue;
            }
            $results[] = self::score($request, $product);
        }
        usort($results, static fn(array $a, array $b): int =>
            ($b['totalScore'] <=> $a['totalScore']) ?: ((int)$a['id'] <=> (int)$b['id']));

        $anyFull = (bool)array_filter($results, static fn(array $r): bool => $r['fullyMatches']);
        $counterfactuals = $anyFull ? [] : self::counterfactuals($request, $relevant);

        return [
            'results' => array_slice($results, 0, max(1, $limit)),
            'counterfactuals' => $counterfactuals,
            'hardBlockers' => $hardBlockers,
            'relevantCount' => count($relevant),
        ];
    }

    /** @return list<string> hard constraints the product violates ("exchange" is always hard) */
    public static function hardViolations(array $request, array $product): array
    {
        $request = self::normalise($request);
        $violations = [];
        if ($product['type'] === 'exchange' && !$request['allowExchange']) {
            $violations[] = 'exchange';
        }
        foreach (['category', 'budget', 'condition', 'location'] as $key) {
            if (($request['flags'][$key] ?? null) === 'hard' && !self::satisfies($request, $product, $key)) {
                $violations[] = $key;
            }
        }
        return $violations;
    }

    private static function satisfies(array $request, array $product, string $key): bool
    {
        return match ($key) {
            'category' => $request['categoryId'] === null || (int)$product['category_id'] === $request['categoryId'],
            'budget' => $request['budgetMax'] === null || $product['price'] === null
                || $product['type'] === 'exchange' || (float)$product['price'] <= $request['budgetMax'],
            'condition' => $request['minCondition'] === null
                || self::CONDITION_RANK[$product['condition']] >= self::CONDITION_RANK[$request['minCondition']],
            'location' => $request['buildingId'] === null
                || (int)($product['seller_building_id'] ?? 0) === $request['buildingId'],
            default => true,
        };
    }

    private static function score(array $request, array $product): array
    {
        $matched = [];
        $unmatched = [];

        if ($product['type'] === 'exchange') {
            $matched[] = 'Tin trao đổi đồ (bạn chấp nhận đổi)';
        }
        if ($request['categoryId'] !== null) {
            self::satisfies($request, $product, 'category')
                ? $matched[] = 'Đúng danh mục ' . $product['category_name']
                : $unmatched[] = 'Khác danh mục mong muốn (' . $product['category_name'] . ')';
        }

        // Budget
        $budgetScore = 1.0;
        if ($request['budgetMax'] !== null && $product['type'] !== 'exchange' && $product['price'] !== null) {
            $price = (float)$product['price'];
            $budget = (float)$request['budgetMax'];
            if ($price <= $budget) {
                $budgetScore = 0.85 + 0.15 * max(0.0, min(1.0, ($budget - $price) / max($budget, 1.0)));
                $matched[] = 'Trong ngân sách (' . self::vnd($price) . ' ≤ ' . self::vnd($budget) . ')';
            } else {
                $budgetScore = max(0.0, 0.65 * (1.0 - ($price - $budget) / max($budget, 1.0)));
                $unmatched[] = 'Vượt ngân sách ' . self::vnd($price - $budget) . ' (' . self::vnd($price) . ')';
            }
        }

        // Condition
        $rank = self::CONDITION_RANK[$product['condition']];
        if ($request['minCondition'] === null) {
            $conditionScore = 0.70 + 0.10 * $rank;
        } else {
            $wanted = self::CONDITION_RANK[$request['minCondition']];
            if ($rank >= $wanted) {
                $conditionScore = min(1.0, 0.90 + 0.05 * ($rank - $wanted));
                $matched[] = 'Tình trạng ' . self::CONDITION_LABEL[$product['condition']] . ' đạt yêu cầu';
            } else {
                $conditionScore = ($wanted - $rank) === 1 ? 0.45 : 0.20;
                $unmatched[] = 'Tình trạng ' . self::CONDITION_LABEL[$product['condition']]
                    . ' thấp hơn mong muốn (' . self::CONDITION_LABEL[$request['minCondition']] . ')';
            }
        }

        // Location (residence context: seller's current building from bed allocations)
        $locationScore = 1.0;
        if ($request['buildingId'] !== null) {
            $sellerBuilding = $product['seller_building_id'] ?? null;
            if ((int)$sellerBuilding === $request['buildingId']) {
                $matched[] = 'Người bán ở cùng ' . $product['seller_building_name'];
            } elseif ($sellerBuilding !== null) {
                $locationScore = 0.55;
                $unmatched[] = 'Người bán ở ' . $product['seller_building_name'] . ' (khác tòa bạn chọn)';
            } else {
                $locationScore = 0.30;
                $unmatched[] = 'Người bán không ở KTX';
            }
        }

        $struct = ($budgetScore + $conditionScore + $locationScore) / 3.0;
        $semantic = (float)$product['semantic'];
        array_unshift($matched, match ($product['semanticVia'] ?? 'text') {
            'image' => 'Hình ảnh giống ảnh bạn gửi',
            'cross' => 'Hình ảnh sản phẩm khớp với mô tả của bạn',
            'keyword' => 'Trùng từ khóa trong tiêu đề/mô tả',
            default => 'Nội dung mô tả khớp với nhu cầu',
        });

        return [
            'id' => (int)$product['id'],
            'semanticScore' => round($semantic, 4),
            'structScore' => round($struct, 4),
            'totalScore' => round(self::SEMANTIC_WEIGHT * $semantic + self::STRUCT_WEIGHT * $struct, 4),
            'fullyMatches' => $unmatched === [],
            'matchedConditions' => $matched,
            'unmatchedConditions' => $unmatched,
        ];
    }

    /** Bounded relaxations of SOFT constraints only, each verified on the real candidates. */
    private static function counterfactuals(array $request, array $relevant): array
    {
        $axes = [];
        if ($request['budgetMax'] !== null && ($request['flags']['budget'] ?? 'hard') === 'soft') {
            $cap = max(50000, (int)round($request['budgetMax'] * 0.5));
            foreach (self::BUDGET_STEPS as $i => $delta) {
                if ($delta <= $cap) {
                    $new = $request['budgetMax'] + $delta;
                    $axes['budget'][] = [['budgetMax' => $new], 0.2 * ($i + 1),
                        'Tăng ngân sách lên ' . self::vnd($new) . ' (+' . self::vnd($delta) . ')'];
                }
            }
        }
        if ($request['minCondition'] !== null && ($request['flags']['condition'] ?? 'hard') === 'soft') {
            $wanted = self::CONDITION_RANK[$request['minCondition']];
            foreach ([1, 2] as $steps) {
                $target = array_search($wanted - $steps, self::CONDITION_RANK, true);
                if ($target !== false) {
                    $axes['condition'][] = [['minCondition' => $target], 0.25 * $steps,
                        'Chấp nhận tình trạng ' . self::CONDITION_LABEL[$target]];
                }
            }
        }
        if ($request['buildingId'] !== null && ($request['flags']['location'] ?? 'hard') === 'soft') {
            $axes['location'][] = [['buildingId' => null], 0.3, 'Mở rộng ra mọi tòa KTX và ngoài KTX'];
        }

        $options = [];
        foreach ($axes as $axisOptions) {
            foreach ($axisOptions as [$patch, $cost, $label]) {
                $options[] = self::evaluatePatch($request, $relevant, [$patch], $cost, [$label]);
            }
        }
        $options = array_values(array_filter($options));
        if ($options === [] && count($axes) >= 2) {
            $keys = array_keys($axes);
            for ($i = 0; $i < count($keys); $i++) {
                for ($j = $i + 1; $j < count($keys); $j++) {
                    foreach ($axes[$keys[$i]] as [$p1, $c1, $l1]) {
                        foreach ($axes[$keys[$j]] as [$p2, $c2, $l2]) {
                            $options[] = self::evaluatePatch($request, $relevant, [$p1, $p2], $c1 + $c2, [$l1, $l2]);
                        }
                    }
                }
            }
            $options = array_values(array_filter($options));
        }
        usort($options, static fn(array $a, array $b): int =>
            [$a['changes'], $a['cost'], -$a['bestScore']] <=> [$b['changes'], $b['cost'], -$b['bestScore']]);
        return array_map(static function (array $o): array {
            unset($o['cost']);
            return $o;
        }, array_slice($options, 0, 3));
    }

    private static function evaluatePatch(array $request, array $relevant, array $patches, float $cost, array $labels): ?array
    {
        $patched = $request;
        foreach ($patches as $patch) {
            $patched = array_merge($patched, $patch);
        }
        $unlocked = [];
        foreach ($relevant as $product) {
            if (self::hardViolations($patched, $product) !== []) {
                continue;
            }
            $scored = self::score($patched, $product);
            if ($scored['fullyMatches']) {
                $unlocked[] = $scored;
            }
        }
        if ($unlocked === []) {
            return null;
        }
        usort($unlocked, static fn(array $a, array $b): int => $b['totalScore'] <=> $a['totalScore']);
        return [
            'label' => implode(' + ', $labels),
            'changes' => count($patches),
            'cost' => $cost,
            'patch' => array_merge(...$patches),
            'unlockedProductIds' => array_map(static fn(array $u): int => $u['id'], $unlocked),
            'bestScore' => $unlocked[0]['totalScore'],
        ];
    }

    private static function normalise(array $request): array
    {
        $n = [
            'categoryId' => isset($request['categoryId']) ? (int)$request['categoryId'] ?: null : null,
            'budgetMax' => isset($request['budgetMax']) ? (int)$request['budgetMax'] ?: null : null,
            'minCondition' => $request['minCondition'] ?? null,
            'buildingId' => isset($request['buildingId']) ? (int)$request['buildingId'] ?: null : null,
            'allowExchange' => (bool)($request['allowExchange'] ?? false),
        ];
        // Safe default: any set constraint without an explicit "soft" flag is hard.
        $flags = [];
        $set = ['category' => $n['categoryId'] !== null, 'budget' => $n['budgetMax'] !== null,
            'condition' => $n['minCondition'] !== null, 'location' => $n['buildingId'] !== null];
        foreach ($set as $key => $isSet) {
            if ($isSet) {
                $flags[$key] = (($request['flags'][$key] ?? 'hard') === 'soft') ? 'soft' : 'hard';
            }
        }
        $n['flags'] = $flags;
        return $n;
    }

    private static function vnd(float $amount): string
    {
        return number_format($amount, 0, ',', '.') . 'đ';
    }
}
