<?php

namespace App\Controllers;

use App\Models\AccessControl;
use App\Models\MarketplaceMatching;
use App\Models\User;
use App\Services\LocalMarketplaceEmbeddingService;
use App\Services\MarketplaceMatchingService;
use App\Services\Matching\SmartSearchService;
use Core\ApiController;

class MarketplaceMatchingApiController extends ApiController
{
    public function search(): void
    {
        $this->requirePermission('marketplace.matching.search');
        $query = trim((string)($_GET['q'] ?? ''));
        if (mb_strlen($query) < 2 || mb_strlen($query) > 500) {
            $this->validationError('Nhập từ khóa từ 2 đến 500 ký tự.');
        }
        $filters = [
            'categoryId' => max(0, (int)($_GET['categoryId'] ?? 0)),
            'priceMin' => isset($_GET['priceMin']) && $_GET['priceMin'] !== '' ? max(0, (int)$_GET['priceMin']) : null,
            'priceMax' => isset($_GET['priceMax']) && $_GET['priceMax'] !== '' ? max(0, (int)$_GET['priceMax']) : null,
            'condition' => (string)($_GET['condition'] ?? ''),
            'type' => (string)($_GET['type'] ?? ''),
        ];
        if ($filters['priceMin'] !== null && $filters['priceMax'] !== null
            && $filters['priceMin'] > $filters['priceMax']) {
            $this->validationError('Khoảng giá không hợp lệ.');
        }
        if (!in_array($filters['condition'], ['', 'new', 'like_new', 'used', 'worn'], true)
            || !in_array($filters['type'], ['', 'sale', 'exchange', 'auction'], true)) {
            $this->validationError('Bộ lọc sản phẩm không hợp lệ.');
        }
        $result = (new MarketplaceMatchingService())->search(
            $query,
            $filters,
            max(1, min(50, (int)($_GET['limit'] ?? 20)))
        );
        $result['results'] = array_map(static fn(array $product): array => [
            'id' => (int)$product['id'],
            'title' => (string)$product['title'],
            'description' => (string)$product['description'],
            'image' => $product['image'],
            'type' => (string)$product['type'],
            'price' => $product['price'] === null ? null : (int)$product['price'],
            'condition' => (string)$product['condition'],
            'categoryId' => (int)$product['category_id'],
            'categoryName' => (string)$product['category_name'],
            'sellerName' => (string)$product['seller_name'],
            'sellerVerified' => (bool)$product['seller_verified'],
            'matchScore' => (float)$product['matchScore'],
            'matchReason' => (string)$product['matchReason'],
        ], $result['results']);
        $this->success($result);
    }

    public function indexProducts(): void
    {
        $this->requirePermission('marketplace.matching.manage');
        $this->requireCsrf();
        $rows = (new MarketplaceMatching())->candidates([], 1000);
        $service = new MarketplaceMatchingService();
        // Indexing is an explicit, bounded action; search also refreshes stale product vectors.
        foreach ($rows as $product) {
            $service->indexProduct($product);
        }
        // Gemini vectors used by the real search (only listings missing or changed are embedded).
        $gemini = (new SmartSearchService())->indexAll();
        $this->success([
            'indexedCandidates' => count($rows),
            'modelKey' => LocalMarketplaceEmbeddingService::MODEL_KEY,
            'gemini' => $gemini,
        ], 'Đã cập nhật embedding cho các sản phẩm hiện hoạt.');
    }

    /**
     * Admin model comparison: one query ranked by every retrieval variant.
     * With relevantProductIds, P@5/Recall@5/MRR@5/NDCG@5 are computed per
     * variant and each run is stored in the evaluation history.
     */
    public function compare(): void
    {
        $actor = $this->requirePermission('marketplace.matching.manage');
        $this->requireCsrf();
        $data = $this->requestData();
        $query = is_scalar($data['queryText'] ?? null) ? trim((string)$data['queryText']) : '';
        if (mb_strlen($query) < 2 || mb_strlen($query) > 500) {
            $this->validationError('Nhập truy vấn từ 2 đến 500 ký tự.');
        }
        $relevantIds = [];
        $relevant = $data['relevantProductIds'] ?? [];
        if (!is_array($relevant) || count($relevant) > 100) {
            $this->validationError('Danh sách ID liên quan không hợp lệ (tối đa 100).');
        }
        foreach ($relevant as $id) {
            $parsedId = filter_var($id, FILTER_VALIDATE_INT);
            if ($parsedId === false || $parsedId < 1) {
                $this->validationError('ID sản phẩm liên quan không hợp lệ.');
            }
            $relevantIds[] = $parsedId;
        }
        $relevantIds = array_values(array_unique($relevantIds));
        $matching = new MarketplaceMatching();
        if ($relevantIds !== [] && !$matching->productIdsExist($relevantIds)) {
            $this->validationError('Một hoặc nhiều ID liên quan không tồn tại trong danh mục sản phẩm.');
        }

        $result = (new SmartSearchService())->compare($query, 10);
        if ($relevantIds !== []) {
            $metricsService = new LocalMarketplaceEmbeddingService();
            foreach ($result['variants'] as &$variant) {
                $rankedIds = array_map(static fn(array $r): int => $r['id'], $variant['results']);
                $variant['metrics'] = $metricsService->evaluate($rankedIds, $relevantIds);
                $matching->saveEvaluation([
                    'queryText' => $query,
                    'relevantProductIds' => $relevantIds,
                    'resultProductIds' => $rankedIds,
                    'metrics' => $variant['metrics'],
                    'modelKey' => $variant['modelKey'],
                ], (int)$actor['id']);
            }
            unset($variant);
        }
        $result['relevantProductIds'] = $relevantIds;
        $this->success($result);
    }

    public function createEvaluation(): void
    {
        $actor = $this->requirePermission('marketplace.matching.manage');
        $this->requireCsrf();
        $data = $this->requestData();
        $query = is_scalar($data['queryText'] ?? null) ? trim((string)$data['queryText']) : '';
        $relevant = $data['relevantProductIds'] ?? null;
        if (mb_strlen($query) < 2 || mb_strlen($query) > 1000 || !is_array($relevant)
            || count($relevant) < 1 || count($relevant) > 100) {
            $this->validationError('Cần truy vấn và danh sách ID sản phẩm liên quan (1–100).');
        }
        $relevantIds = [];
        foreach ($relevant as $id) {
            $parsedId = filter_var($id, FILTER_VALIDATE_INT);
            if ($parsedId === false || $parsedId < 1) {
                $this->validationError('ID sản phẩm liên quan không hợp lệ.');
            }
            $relevantIds[] = $parsedId;
        }
        $relevantIds = array_values(array_unique($relevantIds));
        $matching = new MarketplaceMatching();
        if (!$matching->productIdsExist($relevantIds)) {
            $this->validationError('Một hoặc nhiều ID liên quan không tồn tại trong danh mục sản phẩm.');
        }
        $result = (new MarketplaceMatchingService())->search($query, [], 50);
        $rankedIds = array_map(static fn(array $row): int => (int)$row['id'], $result['results']);
        $metrics = (new LocalMarketplaceEmbeddingService())->evaluate($rankedIds, $relevantIds);
        $evaluation = [
            'queryText' => $query,
            'relevantProductIds' => $relevantIds,
            'resultProductIds' => $rankedIds,
            'metrics' => $metrics,
            'modelKey' => LocalMarketplaceEmbeddingService::MODEL_KEY,
        ];
        $id = $matching->saveEvaluation($evaluation, (int)$actor['id']);
        $this->created(['id' => $id, 'metrics' => $metrics, 'resultProductIds' => $rankedIds], 'Đã lưu lần đánh giá matching.');
    }

    public function evaluations(): void
    {
        $this->requirePermission('marketplace.matching.manage');
        $this->success((new MarketplaceMatching())->evaluations());
    }

    private function requirePermission(string $permission): array
    {
        $session = $this->currentUser();
        if (!$session || empty($session['id'])) {
            $this->unauthorized();
        }
        $users = new User();
        $user = $users->findById((int)$session['id']);
        if (!$user || (int)($user['is_locked'] ?? 0) === 1) {
            $this->unauthorized();
        }
        $sessionToken = (string)($_SESSION['session_token'] ?? '');
        $databaseToken = (string)($user['session_token'] ?? '');
        if ($sessionToken !== '' && $databaseToken !== '' && !hash_equals($databaseToken, $sessionToken)) {
            $this->unauthorized('Phiên đăng nhập đã bị thay thế.');
        }
        if ($sessionToken === '') {
            $sessionToken = bin2hex(random_bytes(16));
            $_SESSION['session_token'] = $sessionToken;
            $users->setSessionToken((int)$user['id'], $sessionToken);
        } elseif ($databaseToken === '') {
            $users->setSessionToken((int)$user['id'], $sessionToken);
        }
        if (!(new AccessControl())->hasPermission((int)$user['id'], $permission)) {
            $this->forbidden();
        }
        return $user;
    }
}
