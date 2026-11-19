<?php

namespace App\Controllers;

use App\Models\AccessControl;
use App\Models\BuyerRequest;
use App\Models\User;
use App\Services\BuyerRequestValidator;
use Core\ApiController;

/**
 * Buyer REQUESTs (nhu cầu tìm mua). Every endpoint requires a signed-in
 * account with marketplace.request.manage_own and only touches that
 * account's own requests; mutations also require the CSRF token.
 */
class BuyerRequestApiController extends ApiController
{
    /** GET /api/marketplace/requests */
    public function mine(): void
    {
        $user = $this->requirePermission('marketplace.request.manage_own');
        $rows = (new BuyerRequest())->listForUser((int)$user['id']);
        $this->success(array_map([$this, 'dto'], $rows));
    }

    /** POST /api/marketplace/requests */
    public function create(): void
    {
        $user = $this->requirePermission('marketplace.request.manage_own');
        $this->requireCsrf();
        try {
            $req = BuyerRequestValidator::validate($this->requestData());
        } catch (\InvalidArgumentException $e) {
            $this->validationError($e->getMessage());
        }
        $model = new BuyerRequest();
        if ($req['categoryId'] !== null && !$model->categoryExists($req['categoryId'])) {
            $this->validationError('Danh mục không tồn tại.');
        }
        if ($req['buildingId'] !== null && !$model->buildingExists($req['buildingId'])) {
            $this->validationError('Tòa KTX không tồn tại hoặc đã ngừng hoạt động.');
        }
        $id = $model->create((int)$user['id'], $req);
        $saved = $model->findForUser($id, (int)$user['id']);
        $this->created($saved === null ? ['id' => $id] : $this->dto($saved), 'Đã lưu nhu cầu tìm mua.');
    }

    /** POST /api/marketplace/requests/{id}/close */
    public function close(): void
    {
        $user = $this->requirePermission('marketplace.request.manage_own');
        $this->requireCsrf();
        $id = (int)($_GET['id'] ?? 0);
        if ($id < 1 || !(new BuyerRequest())->close($id, (int)$user['id'])) {
            $this->error('NOT_FOUND', 'Không tìm thấy nhu cầu đang mở của bạn.', 404);
        }
        $this->success(['id' => $id, 'status' => 'closed'], 'Đã đóng nhu cầu.');
    }

    /** GET /api/marketplace/requests/{id}/image (owner only) */
    public function image(): void
    {
        $user = $this->requirePermission('marketplace.request.manage_own');
        $image = (new BuyerRequest())->imageForUser((int)($_GET['id'] ?? 0), (int)$user['id']);
        if ($image === null) {
            $this->error('NOT_FOUND', 'Không có ảnh tham khảo.', 404);
        }
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        header('Content-Type: ' . $image['mime']);
        header('Cache-Control: private, max-age=3600');
        header('X-Content-Type-Options: nosniff');
        header('Content-Length: ' . strlen($image['data']));
        echo $image['data'];
        exit;
    }

    private function dto(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'description' => (string)$row['description'],
            'categoryId' => $row['category_id'] === null ? null : (int)$row['category_id'],
            'categoryName' => $row['category_name'],
            'budgetMax' => $row['budget_max'] === null ? null : (int)$row['budget_max'],
            'minCondition' => $row['min_condition'],
            'buildingId' => $row['building_id'] === null ? null : (int)$row['building_id'],
            'buildingName' => $row['building_name'],
            'allowExchange' => (bool)$row['allow_exchange'],
            'flags' => (object)$row['requirement_flags'],
            'hasImage' => (bool)$row['has_image'],
            'status' => (string)$row['status'],
            'expiresAt' => (string)$row['expires_at'],
            'createdAt' => (string)$row['created_at'],
        ];
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
