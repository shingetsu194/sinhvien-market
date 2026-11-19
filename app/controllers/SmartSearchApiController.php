<?php

namespace App\Controllers;

use App\Models\MarketplaceMatching;
use App\Models\RateLimiter;
use App\Services\BuyerRequestValidator;
use App\Services\Matching\SmartSearchService;
use Core\ApiController;

/**
 * POST /api/marketplace/smart-search — the one product search box.
 * Public for text (the product list is public); searching with an image
 * requires an account. Every call is rate limited because it can spend
 * Gemini quota, and requires the CSRF token so other sites cannot drive it.
 */
class SmartSearchApiController extends ApiController
{
    public const GUEST_LIMIT = 10;
    public const USER_LIMIT = 30;
    public const WINDOW_SECONDS = 300;

    public function search(): void
    {
        $this->requireCsrf();
        $data = $this->requestData();
        $user = $this->currentUser();
        $userId = !empty($user['id']) ? (int)$user['id'] : null;

        if ($userId === null && !empty($data['imageDataUrl'])) {
            $this->error('LOGIN_REQUIRED', 'Đăng nhập để tìm kiếm bằng ảnh.', 401);
        }
        $client = $userId !== null ? 'user:' . $userId : 'ip:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $max = $userId !== null ? self::USER_LIMIT : self::GUEST_LIMIT;
        if (!(new RateLimiter())->hit('smart_search', $client, $max, self::WINDOW_SECONDS)) {
            $this->error('RATE_LIMITED', 'Bạn tìm kiếm quá nhanh. Vui lòng thử lại sau ít phút.', 429);
        }

        try {
            $request = BuyerRequestValidator::validate($data, 2);
        } catch (\InvalidArgumentException $e) {
            $this->validationError($e->getMessage());
        }
        // "Gần tôi": resolve the searcher's own building from their bed allocation,
        // so students never pick building ids and the location is verified.
        $nearMe = filter_var($data['nearMe'] ?? false, FILTER_VALIDATE_BOOL);
        $notInDormitory = false;
        if ($nearMe) {
            if ($userId === null) {
                $this->error('LOGIN_REQUIRED', 'Đăng nhập để tìm người bán gần bạn.', 401);
            }
            $request['buildingId'] = (new MarketplaceMatching())->currentBuildingId($userId);
            $notInDormitory = $request['buildingId'] === null;
            if (!$notInDormitory && !isset($request['flags']['location'])) {
                $soft = is_array($data['flags'] ?? null) && ($data['flags']['location'] ?? '') === 'soft';
                $request['flags']['location'] = $soft ? 'soft' : 'hard';
            }
        }
        $limit = max(1, min(50, (int)($data['limit'] ?? 20)));
        $result = (new SmartSearchService())->search($request, $userId, $limit);
        if ($notInDormitory) {
            $result['warnings'][] = 'not_in_dormitory';
        }
        $this->success($result);
    }
}
