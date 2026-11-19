<?php

namespace App\Controllers;

use App\Models\AuditLog;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Giveaway;
use App\Models\Product;
use App\Models\Rating;
use App\Models\Report;
use App\Models\Transaction;
use App\Models\User;
use App\Services\NotificationService;
use Config\Database;
use Core\ApiController;

/**
 * JSON adapter for the Next.js admin API. Legacy HTML admin routes remain
 * registered separately and continue to use their existing controllers.
 */
class AdminApiController extends ApiController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function dashboard(): void
    {
        $this->requireAdminSession();
        $users = new User();
        $products = new Product();
        $transactions = new Transaction();
        $recentTx = array_slice($transactions->getAll('', '', 5), 0, 5);
        $recentProducts = array_slice($products->getPending(), 0, 5);

        $this->success([
            'totalUsers' => $users->countAll(),
            'activeProducts' => $products->countActive(),
            'pendingCount' => count($products->getPending()),
            'txToday' => $transactions->countToday(),
            'recentTx' => array_map(fn(array $row): array => $this->transactionDto($row), $recentTx),
            'recentProducts' => array_map(fn(array $row): array => $this->productDto($row), $recentProducts),
        ]);
    }

    public function products(): void
    {
        $this->requireAdminSession();
        $model = new Product();
        $tab = ($_GET['tab'] ?? 'pending') === 'all' ? 'all' : 'pending';
        $rows = $tab === 'all' ? $model->getAllForAdmin() : $model->getPending();
        $this->success(array_map(fn(array $row): array => $this->productDto($row), $rows));
    }

    public function approveProduct(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $id = $this->positiveInt($data['productId'] ?? null);
        if (!$id) {
            $this->validationError('ID sản phẩm không hợp lệ.');
        }

        $products = new Product();
        $product = $products->findWithAuction($id);
        if (!$product) {
            $this->notFound('Sản phẩm không tồn tại.');
        }
        $products->updateStatus($id, 'active');
        // Embed now so the listing is found by AI search immediately (best effort).
        try {
            (new \App\Services\Matching\SmartSearchService())->indexProduct($id);
        } catch (\Throwable $e) {
            error_log('Embedding on approval failed: ' . $e->getMessage());
        }
        (new AuditLog())->log((int)$admin['id'], 'approve_product', 'product', $id, 'Duyệt: ' . $product['title']);

        $seller = (new User())->findById((int)$product['user_id']);
        if ($seller) {
            NotificationService::notifyProductApproved(
                (int)$seller['id'], $seller['email'], $seller['name'], $id, $product['title']
            );
        }
        $message = 'Đã duyệt sản phẩm.';
        $this->success(['message' => $message], $message);
    }

    public function rejectProduct(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $id = $this->positiveInt($data['productId'] ?? null);
        $reason = trim((string)($data['reason'] ?? ''));
        if (!$id || $reason === '') {
            $this->validationError('ID sản phẩm và lý do từ chối là bắt buộc.');
        }

        $products = new Product();
        $product = $products->findWithAuction($id);
        if (!$product) {
            $this->notFound('Sản phẩm không tồn tại.');
        }
        $products->updateStatus($id, 'cancelled');
        (new AuditLog())->log((int)$admin['id'], 'reject_product', 'product', $id, 'Từ chối: ' . $product['title']);

        $seller = (new User())->findById((int)$product['user_id']);
        if ($seller) {
            NotificationService::notifyProductRejected(
                (int)$seller['id'], $seller['email'], $seller['name'], $id, $product['title'], $reason
            );
        }
        $message = 'Đã từ chối sản phẩm.';
        $this->success(['message' => $message], $message);
    }

    public function deleteProduct(): void
    {
        $admin = $this->requireAdminMutation();
        $id = $this->positiveInt($this->requestData()['productId'] ?? null);
        if (!$id) {
            $this->validationError('ID sản phẩm không hợp lệ.');
        }

        $products = new Product();
        $product = $products->findWithAuction($id);
        if (!$product) {
            $this->notFound('Sản phẩm không tồn tại.');
        }
        if ($products->hasTransactions($id)) {
            $this->error('CONFLICT', 'Không thể xóa sản phẩm đã phát sinh giao dịch.', 409);
        }
        try {
            $products->delete($id);
        } catch (\PDOException $e) {
            $this->error('CONFLICT', 'Không thể xóa sản phẩm do đang được dữ liệu khác tham chiếu.', 409);
        }
        (new AuditLog())->log(
            (int)$admin['id'], 'delete_product', 'product', $id,
            'Xóa: ' . $product['title'] . ' — đăng bởi ' . ($product['seller_name'] ?? '')
        );
        $message = 'Đã xóa sản phẩm.';
        $this->success(['message' => $message], $message);
    }

    public function transactions(): void
    {
        $this->requireAdminSession();
        $rows = (new Transaction())->getAll('', '', 10000);
        $this->success(array_map(fn(array $row): array => $this->transactionDto($row), $rows));
    }

    public function categories(): void
    {
        $this->requireAdminSession();
        $rows = (new Category())->all();
        $this->success(array_map(fn(array $row): array => $this->categoryDto($row), $rows));
    }

    public function createCategory(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        [$name, $icon] = $this->validateCategoryInput($data);
        try {
            $id = (new Category())->create($name, Category::makeSlug($name), $icon);
        } catch (\PDOException $e) {
            $this->error('CONFLICT', 'Tên hoặc đường dẫn danh mục đã tồn tại.', 409);
        }
        $category = (new Category())->findById($id);
        (new AuditLog())->log((int)$admin['id'], 'create_category', 'category', $id, 'Tạo: ' . $name);
        $message = 'Đã tạo danh mục.';
        $this->created(['category' => $this->categoryDto($category ?? []), 'message' => $message], $message);
    }

    public function updateCategory(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $id = $this->pathId();
        if (!$id) {
            $id = $this->positiveInt($data['id'] ?? null);
        }
        if (!$id) {
            $this->validationError('ID danh mục không hợp lệ.');
        }
        $model = new Category();
        if (!$model->findById($id)) {
            $this->notFound('Danh mục không tồn tại.');
        }
        [$name, $icon] = $this->validateCategoryInput($data);
        try {
            $model->update($id, $name, Category::makeSlug($name), $icon);
        } catch (\PDOException $e) {
            $this->error('CONFLICT', 'Tên hoặc đường dẫn danh mục đã tồn tại.', 409);
        }
        (new AuditLog())->log((int)$admin['id'], 'update_category', 'category', $id, 'Sửa: ' . $name);
        $message = 'Đã cập nhật danh mục.';
        $this->success(['category' => $this->categoryDto($model->findById($id) ?? []), 'message' => $message], $message);
    }

    public function deleteCategory(): void
    {
        $admin = $this->requireAdminMutation();
        $id = $this->pathId() ?: $this->positiveInt($this->requestData()['id'] ?? null);
        if (!$id) {
            $this->validationError('ID danh mục không hợp lệ.');
        }
        $model = new Category();
        $category = $model->findById($id);
        if (!$category) {
            $this->notFound('Danh mục không tồn tại.');
        }
        try {
            $model->delete($id);
        } catch (\PDOException $e) {
            $this->error('CONFLICT', 'Không thể xóa danh mục đang được sản phẩm sử dụng.', 409);
        }
        (new AuditLog())->log((int)$admin['id'], 'delete_category', 'category', $id, 'Xóa: ' . $category['name']);
        $message = 'Đã xóa danh mục.';
        $this->success(['message' => $message], $message);
    }

    public function users(): void
    {
        $this->requireAdminSession();
        $rows = $this->all(
            'SELECT id, name, email, phone, role, is_locked, lock_reason, locked_at, locked_until,
                    is_verified, last_verified_at, security_question, strike_count, created_at
             FROM users ORDER BY created_at DESC'
        );
        $this->success(array_map(fn(array $row): array => $this->userDto($row), $rows));
    }

    public function userDetail(): void
    {
        $this->requireAdminSession();
        $id = $this->pathId();
        if (!$id) {
            $this->validationError('ID người dùng không hợp lệ.');
        }
        $user = (new User())->findByIdFull($id);
        if (!$user) {
            $this->notFound('Người dùng không tồn tại.');
        }
        $profileRow = $this->one('SELECT strike_count FROM users WHERE id = ?', [$id]) ?? [];
        $profile = $this->userDto(array_merge($user, $profileRow));
        $products = (new Product())->getByUser($id);
        $transactions = (new Transaction())->getByUser($id);
        $reports = (new Report())->getByTargetUser($id);
        foreach ($reports as &$report) {
            $report['target_name'] = $user['name'];
        }
        unset($report);
        $this->success([
            'profile' => $profile,
            'products' => array_map(fn(array $row): array => $this->productDto($row), $products),
            'transactions' => array_map(fn(array $row): array => $this->transactionDto($row), $transactions),
            'reports' => array_map(fn(array $row): array => $this->reportDto($row), $reports),
            'ratingStats' => (new Rating())->getStats($id),
        ]);
    }

    public function userViolations(): void
    {
        $this->requireAdminSession();
        $id = $this->pathId();
        if (!$id) {
            $this->validationError('ID người dùng không hợp lệ.');
        }
        $userModel = new User();
        $user = $userModel->findById($id);
        if (!$user) {
            $this->notFound('Người dùng không tồn tại.');
        }
        $rows = $userModel->getViolationHistory($id);
        $this->success([
            'user' => $this->userDto($user),
            'violations' => array_map(fn(array $row): array => [
                'id' => (int)$row['id'],
                'userId' => (int)$row['user_id'],
                'adminId' => (int)$row['admin_id'],
                'adminName' => (string)$row['admin_name'],
                'strikeNumber' => (int)$row['strike_number'],
                'reason' => (string)$row['reason'],
                'evidenceUrl' => $row['evidence_url'] ?? null,
                'createdAt' => (string)$row['created_at'],
            ], $rows),
        ]);
    }

    public function toggleUserLock(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $id = $this->pathId();
        if (!$id) {
            $id = $this->positiveInt($data['userId'] ?? null);
        }
        if (!$id) {
            $this->validationError('ID người dùng không hợp lệ.');
        }
        $model = new User();
        $user = $model->findById($id);
        if (!$user) {
            $this->notFound('Người dùng không tồn tại.');
        }
        if (($user['role'] ?? '') === 'admin' || (int)$user['id'] === (int)$admin['id']) {
            $this->forbidden('Không thể khóa tài khoản Admin hoặc tự khóa tài khoản của mình.');
        }

        if ((int)$user['is_locked'] === 1) {
            $model->toggleLock($id, 0);
            (new AuditLog())->log((int)$admin['id'], 'unlock_user', 'user', $id, 'Mở khóa User: ' . $user['name']);
            $message = 'Đã mở khóa tài khoản.';
        } else {
            $reason = trim((string)($data['reason'] ?? ''));
            $duration = (string)($data['duration'] ?? '');
            $durationMap = [
                '3days' => '+3 days', '1week' => '+1 week', '2weeks' => '+2 weeks',
                '1month' => '+1 month', '3months' => '+3 months', '6months' => '+6 months',
                'forever' => null,
            ];
            if ($reason === '' || mb_strlen($reason) > 255 || !array_key_exists($duration, $durationMap)) {
                $this->validationError('Lý do khóa và thời hạn khóa hợp lệ là bắt buộc.');
            }
            $until = $durationMap[$duration] === null ? null : date('Y-m-d H:i:s', strtotime($durationMap[$duration]));
            $model->toggleLock($id, 1, $reason, $until);
            (new AuditLog())->log(
                (int)$admin['id'], 'lock_user', 'user', $id,
                'Khóa User: ' . $user['name'] . ' | Lý do: ' . $reason . ' | Hạn: ' . ($until ?? 'Vĩnh viễn')
            );
            $message = 'Đã khóa tài khoản.';
        }
        $this->success(['user' => $this->reloadUserDto($id), 'message' => $message], $message);
    }

    public function strikeUser(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $id = $this->pathId();
        if (!$id) {
            $id = $this->positiveInt($data['userId'] ?? null);
        }
        $reason = trim((string)($data['reason'] ?? ''));
        $evidenceUrl = trim((string)($data['evidenceUrl'] ?? ''));
        if (!$id || $reason === '' || mb_strlen($reason) > 255 || mb_strlen($evidenceUrl) > 255) {
            $this->validationError('ID người dùng và lý do vi phạm là bắt buộc.');
        }
        $users = new User();
        $user = $users->findById($id);
        if (!$user) {
            $this->notFound('Người dùng không tồn tại.');
        }
        if (($user['role'] ?? '') === 'admin') {
            $this->forbidden('Không thể cảnh cáo tài khoản Admin.');
        }
        $result = $users->addStrike($id, (int)$admin['id'], $reason, $evidenceUrl ?: null);
        if (empty($result['success'])) {
            $this->error('STRIKE_FAILED', (string)($result['message'] ?? 'Không thể ghi nhận vi phạm.'), 409);
        }
        (new AuditLog())->log(
            (int)$admin['id'], 'strike_user', 'user', $id,
            'Gậy thứ ' . $result['strike_count'] . ': ' . $reason
        );
        if ($result['action'] === 'warning') {
            NotificationService::notifyStrikeReceived($id, $user['email'], $user['name'], $reason);
        } elseif ($result['action'] === 'suspend_7_days') {
            NotificationService::notifyAccountSuspended($id, $user['email'], $user['name'], $reason);
        } else {
            NotificationService::notifyAccountBanned($id, $user['email'], $user['name'], $reason);
        }
        $message = 'Đã ghi nhận vi phạm.';
        $this->success([
            'user' => $this->reloadUserDto($id),
            'action' => $result['action'],
            'message' => $message,
        ], $message);
    }

    public function transactionReports(): void
    {
        $this->requireAdminSession();
        $from = trim((string)($_GET['from'] ?? ''));
        $to = trim((string)($_GET['to'] ?? ''));
        if (!$this->validDate($from) || !$this->validDate($to) || $from > $to) {
            $this->validationError('Khoảng ngày báo cáo không hợp lệ.');
        }
        $rows = (new Transaction())->getAll($from, $to, 10000);
        $completed = array_values(array_filter($rows, fn(array $row): bool =>
            in_array($row['order_status'] ?? '', ['delivered', 'received', 'completed'], true)
        ));
        $amount = array_sum(array_map(fn(array $row): float => (float)$row['amount'], $completed));
        $byDay = [];
        foreach ($completed as $row) {
            $day = substr((string)$row['created_at'], 0, 10);
            $byDay[$day] = ($byDay[$day] ?? 0) + (float)$row['amount'];
        }
        ksort($byDay);
        $this->success([
            'transactions' => array_map(fn(array $row): array => $this->transactionDto($row), $completed),
            'totalAmount' => $amount,
            'totalCount' => count($completed),
            'avgAmount' => count($completed) ? $amount / count($completed) : 0,
            'byDay' => array_map(fn(string $day, float $sum): array => ['day' => $day, 'amount' => $sum],
                array_keys($byDay), array_values($byDay)),
        ]);
    }

    public function systemReports(): void
    {
        $this->requireAdminSession();
        $status = (string)($_GET['status'] ?? '');
        if ($status !== '' && !in_array($status, ['pending', 'resolved', 'ignored'], true)) {
            $this->validationError('Trạng thái báo cáo không hợp lệ.');
        }
        $reports = new Report();
        $rows = $reports->getAll($status);
        $this->success([
            'reports' => array_map(fn(array $row): array => $this->reportDto($row), $rows),
            'pendingCount' => $reports->countPending(),
        ]);
    }

    public function reportEvidence(): void
    {
        $this->requireAdminSession();
        $id = $this->positiveInt($_GET['id'] ?? null);
        $image = $id > 0 ? (new Report())->getEvidenceBlob($id) : null;
        $this->serveImageBlob($image);
    }

    public function resolveSystemReport(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $id = $this->pathId();
        if (!$id) {
            $id = $this->positiveInt($data['id'] ?? null);
        }
        $status = (string)($data['status'] ?? '');
        if (!$id || !in_array($status, ['resolved', 'ignored'], true)) {
            $this->validationError('Báo cáo hoặc trạng thái xử lý không hợp lệ.');
        }
        if (trim((string)($data['evidenceUrl'] ?? '')) !== '') {
            $this->error('UNSUPPORTED_FIELD', 'Lược đồ báo cáo hiện không lưu evidenceUrl.', 422);
        }
        $reports = new Report();
        if (!$reports->findById($id)) {
            $this->notFound('Báo cáo không tồn tại.');
        }
        $note = array_key_exists('adminNote', $data) ? trim((string)$data['adminNote']) : null;
        $reports->updateStatus($id, $status, $note);
        (new AuditLog())->log((int)$admin['id'], $status === 'resolved' ? 'resolve_report' : 'ignore_report', 'report', $id, $note);
        $message = 'Đã cập nhật kết quả xử lý báo cáo.';
        $this->success(['message' => $message], $message);
    }

    public function ratings(): void
    {
        $this->requireAdminSession();
        $rows = (new Rating())->getAllForAdmin();
        $this->success(array_map(fn(array $row): array => $this->ratingDto($row), $rows));
    }

    public function toggleRating(): void
    {
        $admin = $this->requireAdminMutation();
        $id = $this->pathId();
        if (!$id) {
            $this->validationError('ID đánh giá không hợp lệ.');
        }
        $model = new Rating();
        $rating = $model->findById($id);
        if (!$rating) {
            $this->notFound('Đánh giá không tồn tại.');
        }
        $model->toggleHide($id);
        (new AuditLog())->log((int)$admin['id'], 'toggle_rating', 'rating', $id, null);
        $row = $this->one(
            'SELECT r.*, ur.name AS rater_name, ur.email AS rater_email,
                    ue.name AS ratee_name, ue.email AS ratee_email, p.title AS product_title
             FROM ratings r JOIN users ur ON ur.id = r.rater_id
             JOIN users ue ON ue.id = r.ratee_id JOIN products p ON p.id = r.product_id
             WHERE r.id = ?',
            [$id]
        );
        $message = 'Đã thay đổi trạng thái đánh giá.';
        $this->success(['rating' => $this->ratingDto($row ?? []), 'message' => $message], $message);
    }

    public function banners(): void
    {
        $this->requireAdminSession();
        $rows = (new Banner())->getAllForAdmin();
        $this->success(array_map(fn(array $row): array => $this->bannerDto($row), $rows));
    }

    public function createBanner(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $title = trim((string)($data['title'] ?? ''));
        $link = trim((string)($data['link'] ?? ''));
        $image = $this->parseImageInput(trim((string)($data['imageUrl'] ?? '')), true);
        $order = filter_var($data['displayOrder'] ?? null, FILTER_VALIDATE_INT);
        if ($title === '' || mb_strlen($title) > 200 || $order === false || $order < 0 || !array_key_exists('isActive', $data)) {
            $this->validationError('Tiêu đề, thứ tự hiển thị và trạng thái banner không hợp lệ.');
        }
        if (strlen($link) > 255) {
            $this->validationError('Liên kết banner vượt quá giới hạn.');
        }
        $model = new Banner();
        $this->db->beginTransaction();
        try {
            $id = $model->create(
                $image['path'],
                $link,
                $title,
                (int)$order,
                !empty($data['isActive']) ? 1 : 0
            );
            if ($image['data'] !== null) {
                $model->saveImage($id, $image['data'], $image['mime']);
            }
            (new AuditLog())->log((int)$admin['id'], 'create_banner', 'banner', $id, 'Tạo: ' . $title);
            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
        $message = 'Đã tạo banner.';
        $this->created(['banner' => $this->bannerDto($model->findById($id) ?? []), 'message' => $message], $message);
    }

    public function updateBanner(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $id = $this->pathId();
        if (!$id) {
            $this->validationError('ID banner không hợp lệ.');
        }
        $title = trim((string)($data['title'] ?? ''));
        $link = trim((string)($data['link'] ?? ''));
        $order = filter_var($data['displayOrder'] ?? null, FILTER_VALIDATE_INT);
        $model = new Banner();
        if (!$model->findById($id)) {
            $this->notFound('Banner không tồn tại.');
        }
        if ($title === '' || mb_strlen($title) > 200 || $order === false || $order < 0 || strlen($link) > 255) {
            $this->validationError('Thông tin banner không hợp lệ.');
        }
        $model->update($id, $link, $title, (int)$order);
        (new AuditLog())->log((int)$admin['id'], 'update_banner', 'banner', $id, 'Sửa: ' . $title);
        $message = 'Đã cập nhật banner.';
        $this->success(['banner' => $this->bannerDto($model->findById($id) ?? []), 'message' => $message], $message);
    }

    public function toggleBanner(): void
    {
        $admin = $this->requireAdminMutation();
        $id = $this->pathId();
        $model = new Banner();
        if (!$id || !$model->findById($id)) {
            $this->notFound('Banner không tồn tại.');
        }
        $model->toggleStatus($id);
        (new AuditLog())->log((int)$admin['id'], 'toggle_banner', 'banner', $id, null);
        $message = 'Đã thay đổi trạng thái banner.';
        $this->success(['banner' => $this->bannerDto($model->findById($id) ?? []), 'message' => $message], $message);
    }

    public function deleteBanner(): void
    {
        $admin = $this->requireAdminMutation();
        $id = $this->pathId();
        $model = new Banner();
        $banner = $id ? $model->findById($id) : null;
        if (!$banner) {
            $this->notFound('Banner không tồn tại.');
        }
        $model->delete($id);
        (new AuditLog())->log((int)$admin['id'], 'delete_banner', 'banner', $id, 'Xóa: ' . $banner['title']);
        $message = 'Đã xóa banner.';
        $this->success(['message' => $message], $message);
    }

    public function giveaways(): void
    {
        $this->requireAdminSession();
        $rows = (new Giveaway())->getAll();
        $this->success(array_map(fn(array $row): array => $this->giveawayDto($row), $rows));
    }

    public function giveawayDetail(): void
    {
        $this->requireAdminSession();
        $id = $this->pathId();
        $model = new Giveaway();
        $row = $id ? $model->findById($id) : null;
        if (!$row) {
            $this->notFound('Sự kiện giveaway không tồn tại.');
        }
        $winner = $row['winner_id'] ? $this->one('SELECT name AS winner_name FROM users WHERE id = ?', [(int)$row['winner_id']]) : null;
        $row['winner_name'] = $winner['winner_name'] ?? null;
        $this->success($this->giveawayDto($row));
    }

    public function createGiveaway(): void
    {
        $admin = $this->requireAdminMutation();
        $data = $this->requestData();
        $title = trim((string)($data['title'] ?? ''));
        $description = trim((string)($data['description'] ?? ''));
        $endTime = trim((string)($data['endTime'] ?? ''));
        $image = $this->parseImageInput(trim((string)($data['imageUrl'] ?? '')));
        if ($title === '' || !$this->validDateTime($endTime)) {
            $this->validationError('Tiêu đề và thời điểm kết thúc giveaway hợp lệ là bắt buộc.');
        }
        $model = new Giveaway();
        $this->db->beginTransaction();
        try {
            $id = $model->create([
                'title' => $title,
                'description' => $description,
                'image' => $image['path'],
                'end_time' => date('Y-m-d H:i:s', strtotime($endTime)),
            ]);
            if ($image['data'] !== null) {
                $model->saveImage($id, $image['data'], $image['mime']);
            }
            (new AuditLog())->log((int)$admin['id'], 'create_giveaway', 'giveaway', $id, 'Tạo: ' . $title);
            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
        $row = $model->findById($id) ?? [];
        $row['winner_name'] = null;
        $message = 'Đã tạo giveaway.';
        $this->created(['giveaway' => $this->giveawayDto($row), 'message' => $message], $message);
    }

    public function deleteGiveaway(): void
    {
        $admin = $this->requireAdminMutation();
        $id = $this->pathId();
        $model = new Giveaway();
        $row = $id ? $model->findById($id) : null;
        if (!$row) {
            $this->notFound('Sự kiện giveaway không tồn tại.');
        }
        $model->delete($id);
        (new AuditLog())->log((int)$admin['id'], 'delete_giveaway', 'giveaway', $id, 'Xóa: ' . $row['title']);
        $message = 'Đã xóa giveaway.';
        $this->success(['message' => $message], $message);
    }

    public function saveGiveawayWinner(): void
    {
        $admin = $this->requireAdminMutation();
        $id = $this->pathId();
        $winnerId = $this->positiveInt($this->requestData()['winnerId'] ?? null);
        if (!$id || !$winnerId) {
            $this->validationError('Sự kiện và người trúng giải không hợp lệ.');
        }
        $model = new Giveaway();
        $giveaway = $model->findById($id);
        if (!$giveaway) {
            $this->notFound('Sự kiện giveaway không tồn tại.');
        }
        if ($giveaway['status'] !== 'active') {
            $this->error('CONFLICT', 'Sự kiện giveaway đã kết thúc.', 409);
        }
        $participant = $this->one(
            'SELECT 1 AS found FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?',
            [$id, $winnerId]
        );
        if (!$participant) {
            $this->validationError('Người được chọn không tham gia sự kiện này.');
        }
        $winner = (new User())->findById($winnerId);
        if (!$winner) {
            $this->notFound('Người trúng giải không tồn tại.');
        }
        $model->setWinner($id, $winnerId);
        (new AuditLog())->log((int)$admin['id'], 'spin_giveaway', 'giveaway', $id, 'Người trúng giải: ' . $winner['name']);

        $link = rtrim($_ENV['APP_URL'] ?? '', '/') . '/giveaways';
        (new \App\Models\Notification())->create(
            $winnerId, 'giveaway_win', '🎉 Xin chúc mừng, bạn đã trúng Giveaway!',
            'Bạn là người may mắn trúng giải sự kiện "' . $giveaway['title'] . '". Vui lòng liên hệ Ban Quản Trị để nhận giải.',
            $link
        );
        $emailSent = \Core\Mailer::send(
            $winner['email'],
            '🎉 Bạn đã trúng giải sự kiện SinhVienMarket',
            'Xin chào ' . htmlspecialchars((string)$winner['name'], ENT_QUOTES, 'UTF-8') . ',<br><br>'
            . 'Xin chúc mừng! Bạn là người may mắn trúng giải thưởng trong sự kiện <strong>"'
            . htmlspecialchars((string)$giveaway['title'], ENT_QUOTES, 'UTF-8')
            . '"</strong>.<br><br>Vui lòng liên hệ Ban Quản Trị để nhận phần thưởng.<br><br>'
            . '<a href="' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '">Xem chi tiết trên trang chủ</a>'
        );
        $message = $emailSent
            ? 'Đã lưu người trúng giải thành công!'
            : 'Đã lưu người trúng giải và thông báo trong ứng dụng, nhưng email chưa gửi được.';
        $this->success(['message' => $message], $message);
    }

    public function auditLog(): void
    {
        $this->requireAdminSession();
        $rows = (new AuditLog())->getAll(300);
        $this->success(array_map(fn(array $row): array => [
            'id' => (int)$row['id'],
            'adminId' => (int)$row['admin_id'],
            'adminName' => (string)$row['admin_name'],
            'adminEmail' => (string)$row['admin_email'],
            'action' => (string)$row['action'],
            'targetType' => (string)$row['target_type'],
            'targetId' => (int)$row['target_id'],
            'note' => $row['note'] ?? null,
            'createdAt' => (string)$row['created_at'],
        ], $rows));
    }

    public function export(): void
    {
        $this->requireAdminSession();
        $type = (string)($_GET['type'] ?? '');
        if (!in_array($type, ['users', 'products', 'transactions'], true)) {
            $this->validationError('Loại dữ liệu xuất không hợp lệ.');
        }
        $from = trim((string)($_GET['from'] ?? ''));
        $to = trim((string)($_GET['to'] ?? ''));
        if (($from !== '' && !$this->validDate($from)) || ($to !== '' && !$this->validDate($to))
            || ($from !== '' && $to !== '' && $from > $to)) {
            $this->validationError('Khoảng ngày xuất dữ liệu không hợp lệ.');
        }
        $stream = fopen('php://temp', 'r+');
        if ($type === 'users') {
            $rows = (new User())->getAllForExport($from ?: null, $to ?: null);
            fputcsv($stream, ['ID', 'Name', 'Email', 'Phone', 'Role', 'IsLocked', 'IsVerified', 'StrikeCount', 'CreatedAt'], ',', '"', '');
            foreach ($rows as $row) {
                fputcsv($stream, [$row['id'], $row['name'], $row['email'], $row['phone'], $row['role'], $row['is_locked'], $row['is_verified'], $row['strike_count'], $row['created_at']], ',', '"', '');
            }
        } elseif ($type === 'products') {
            $rows = (new Product())->getAllForExport($from ?: null, $to ?: null);
            fputcsv($stream, ['ID', 'Title', 'Category', 'Seller', 'Type', 'Price', 'Condition', 'Status', 'CreatedAt'], ',', '"', '');
            foreach ($rows as $row) {
                fputcsv($stream, [$row['id'], $row['title'], $row['category_name'], $row['seller_name'], $row['type'], $row['price'], $row['condition'], $row['status'], $row['created_at']], ',', '"', '');
            }
        } else {
            $rows = (new Transaction())->getAll($from, $to, 10000);
            fputcsv($stream, ['ID', 'Product', 'Buyer', 'Seller', 'Amount', 'PaymentMethod', 'OrderStatus', 'CreatedAt'], ',', '"', '');
            foreach ($rows as $row) {
                fputcsv($stream, [$row['id'], $row['product_title'], $row['buyer_name'], $row['seller_name'], $row['amount'], $row['payment_method'], $row['order_status'], $row['created_at']], ',', '"', '');
            }
        }
        rewind($stream);
        $content = stream_get_contents($stream);
        fclose($stream);
        $this->success([
            'filename' => 'export_' . $type . '_' . date('Ymd_His') . '.csv',
            'content' => "\xEF\xBB\xBF" . $content,
        ]);
    }

    private function requireAdminSession(): array
    {
        $sessionUser = $this->requireApiAuth();
        $users = new User();
        $user = $users->findById((int)($sessionUser['id'] ?? 0));
        if (!$user) {
            $this->unauthorized();
        }
        if (($user['role'] ?? '') !== 'admin') {
            $this->forbidden('Chỉ quản trị viên mới được truy cập API này.');
        }
        if ((int)($user['is_locked'] ?? 0) === 1) {
            $this->error('ACCOUNT_LOCKED', 'Tài khoản quản trị đang bị khóa.', 423);
        }
        $dbToken = (string)($user['session_token'] ?? '');
        $sessionToken = (string)($_SESSION['session_token'] ?? '');
        if ($sessionToken !== '' && $dbToken !== '' && !hash_equals($dbToken, $sessionToken)) {
            $this->unauthorized('Phiên đăng nhập đã bị thay thế.');
        }
        if ($sessionToken === '') {
            $sessionToken = bin2hex(random_bytes(16));
            $_SESSION['session_token'] = $sessionToken;
            $users->setSessionToken((int)$user['id'], $sessionToken);
        } elseif ($dbToken === '') {
            $users->setSessionToken((int)$user['id'], $sessionToken);
        }
        return $user;
    }

    private function requireAdminMutation(): array
    {
        $user = $this->requireAdminSession();
        $this->requireCsrf();
        return $user;
    }

    private function pathId(): int
    {
        return $this->positiveInt($_GET['id'] ?? null);
    }

    private function positiveInt(mixed $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);
        return $id !== false && $id > 0 ? $id : 0;
    }

    private function validateCategoryInput(array $data): array
    {
        $name = trim((string)($data['name'] ?? ''));
        $icon = trim((string)($data['icon'] ?? ''));
        $allowed = ['bi-book', 'bi-laptop', 'bi-bicycle', 'bi-backpack', 'bi-house',
            'bi-music-note', 'bi-brush', 'bi-controller', 'bi-bag', 'bi-box-seam'];
        if (mb_strlen($name) < 2 || mb_strlen($name) > 100 || !in_array($icon, $allowed, true)) {
            $this->validationError('Tên hoặc biểu tượng danh mục không hợp lệ.');
        }
        return [$name, $icon];
    }

    private function categoryDto(array $row): array
    {
        $icon = (string)($row['icon'] ?? '');
        // The current DB seed predates CategoryIconKey and contains these
        // visually equivalent legacy Bootstrap icon names.
        $icon = ['bi-pencil' => 'bi-backpack', 'bi-grid' => 'bi-box-seam'][$icon] ?? $icon;
        $allowed = ['bi-book', 'bi-laptop', 'bi-bicycle', 'bi-backpack', 'bi-house',
            'bi-music-note', 'bi-brush', 'bi-controller', 'bi-bag', 'bi-box-seam'];
        return [
            'id' => (int)($row['id'] ?? 0),
            'name' => (string)($row['name'] ?? ''),
            'slug' => (string)($row['slug'] ?? ''),
            'icon' => in_array($icon, $allowed, true) ? $icon : 'bi-box-seam',
            'createdAt' => (string)($row['created_at'] ?? ''),
        ];
    }

    private function productDto(array $row): array
    {
        $productId = (int)$row['id'];
        $hasTransactions = $this->one('SELECT 1 FROM transactions WHERE product_id = ? LIMIT 1', [$productId]) !== null;
        $condition = (string)($row['condition'] ?? 'used');
        return [
            'id' => $productId,
            'title' => (string)$row['title'],
            'categoryId' => (int)$row['category_id'],
            'categoryName' => (string)($row['category_name'] ?? ''),
            'sellerId' => (int)($row['user_id'] ?? 0),
            'sellerName' => (string)($row['seller_name'] ?? ''),
            'sellerEmail' => (string)($row['seller_email'] ?? ''),
            'type' => (string)$row['type'],
            'price' => $row['price'] === null ? null : (float)$row['price'],
            'condition' => $condition === 'worn' ? 'used' : $condition,
            'status' => (string)$row['status'],
            'hasTransactions' => $hasTransactions,
            'rejectionReason' => null,
            'createdAt' => (string)$row['created_at'],
        ];
    }

    private function transactionDto(array $row): array
    {
        $payment = (string)($row['payment_method'] ?? 'cod');
        if (!in_array($payment, ['cod', 'banking', 'zalopay', 'momo'], true)) {
            $this->error('UNSUPPORTED_PAYMENT_METHOD', 'Giao dịch chứa phương thức thanh toán không được hỗ trợ.', 422);
        }
        $status = (string)($row['order_status'] ?? 'pending');
        if (!in_array($status, ['pending', 'shipping', 'delivered', 'received', 'completed', 'cancelled'], true)) {
            $this->error('UNSUPPORTED_ORDER_STATUS', 'Giao dịch chứa trạng thái đơn hàng không được hỗ trợ.', 422);
        }
        return [
            'id' => (int)$row['id'],
            'productId' => (int)$row['product_id'],
            'productTitle' => (string)($row['product_title'] ?? ''),
            'buyerId' => (int)$row['buyer_id'],
            'buyerName' => (string)($row['buyer_name'] ?? ''),
            'sellerId' => (int)$row['seller_id'],
            'sellerName' => (string)($row['seller_name'] ?? ''),
            'type' => ($row['type'] ?? '') === 'auction' ? 'auction' : 'sale',
            'amount' => (float)$row['amount'],
            'paymentMethod' => $payment,
            'orderStatus' => $status,
            'createdAt' => (string)$row['created_at'],
        ];
    }

    private function userDto(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'name' => (string)$row['name'],
            'email' => (string)$row['email'],
            'phone' => $row['phone'] ?? null,
            'role' => (string)$row['role'],
            'isLocked' => (bool)$row['is_locked'],
            'lockReason' => $row['lock_reason'] ?? null,
            'lockedAt' => $row['locked_at'] ?? null,
            'lockedUntil' => $row['locked_until'] ?? null,
            'isVerified' => (bool)($row['is_verified'] ?? false),
            'lastVerifiedAt' => $row['last_verified_at'] ?? null,
            'securityQuestion' => $row['security_question'] ?? null,
            'strikeCount' => (int)($row['strike_count'] ?? 0),
            'createdAt' => (string)$row['created_at'],
        ];
    }

    private function reloadUserDto(int $id): array
    {
        $row = $this->one(
            'SELECT id, name, email, phone, role, is_locked, lock_reason, locked_at, locked_until,
                    is_verified, last_verified_at, security_question, strike_count, created_at
             FROM users WHERE id = ?',
            [$id]
        );
        return $this->userDto($row ?? []);
    }

    private function reportDto(array $row): array
    {
        $evidence = $this->one('SELECT 1 AS found FROM report_evidence WHERE report_id = ?', [(int)$row['id']]);
        return [
            'id' => (int)$row['id'],
            'reporterId' => (int)$row['reporter_id'],
            'reporterName' => (string)($row['reporter_name'] ?? ''),
            'targetUserId' => isset($row['target_user_id']) ? (int)$row['target_user_id'] : null,
            'targetName' => $row['target_name'] ?? null,
            'productId' => isset($row['product_id']) ? (int)$row['product_id'] : null,
            'productTitle' => $row['product_title'] ?? null,
            'reason' => (string)$row['reason'],
            'description' => (string)$row['description'],
            'status' => (string)$row['status'],
            'adminNote' => $row['admin_note'] ?? null,
            'evidenceUrl' => $evidence ? '/api/admin/reports/evidence?id=' . (int)$row['id'] : null,
            'createdAt' => (string)$row['created_at'],
        ];
    }

    private function ratingDto(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'transactionId' => (int)$row['transaction_id'],
            'raterId' => (int)$row['rater_id'],
            'raterName' => (string)($row['rater_name'] ?? ''),
            'raterEmail' => (string)($row['rater_email'] ?? ''),
            'rateeId' => (int)$row['ratee_id'],
            'rateeName' => (string)($row['ratee_name'] ?? ''),
            'rateeEmail' => (string)($row['ratee_email'] ?? ''),
            'productId' => (int)$row['product_id'],
            'productTitle' => (string)($row['product_title'] ?? ''),
            'stars' => (int)$row['stars'],
            'comment' => $row['comment'] ?? null,
            'status' => (string)$row['status'],
            'createdAt' => (string)$row['created_at'],
        ];
    }

    private function bannerDto(array $row): array
    {
        $image = (string)($row['image'] ?? '');
        if ($image === 'db') {
            $image = '/banners/image?id=' . (int)$row['id'];
        }
        return [
            'id' => (int)($row['id'] ?? 0),
            'title' => (string)($row['title'] ?? ''),
            'imageUrl' => $image,
            'link' => (string)($row['link'] ?? ''),
            'isActive' => (bool)($row['is_active'] ?? false),
            'displayOrder' => (int)($row['display_order'] ?? 0),
            'createdAt' => (string)($row['created_at'] ?? ''),
        ];
    }

    private function giveawayDto(array $row): array
    {
        $id = (int)$row['id'];
        $participants = (new Giveaway())->getParticipants($id);
        $image = $row['image'] ?? null;
        if ($image === 'db') {
            $image = '/giveaways/image?id=' . $id;
        }
        return [
            'id' => $id,
            'title' => (string)$row['title'],
            'description' => (string)($row['description'] ?? ''),
            'imageUrl' => $image,
            'endTime' => (string)$row['end_time'],
            'status' => (string)$row['status'],
            'winnerId' => isset($row['winner_id']) ? (int)$row['winner_id'] : null,
            'winnerName' => $row['winner_name'] ?? null,
            'participants' => array_map(fn(array $participant): array => [
                'id' => (int)$participant['id'],
                'name' => (string)$participant['name'],
                'email' => (string)$participant['email'],
                'joinedAt' => (string)$participant['joined_at'],
            ], $participants),
            'createdAt' => (string)($row['created_at'] ?? ''),
        ];
    }

    private function validDate(string $date): bool
    {
        if ($date === '') {
            return false;
        }
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        return $parsed !== false && $parsed->format('Y-m-d') === $date;
    }

    private function validDateTime(string $dateTime): bool
    {
        return $dateTime !== '' && strtotime($dateTime) !== false;
    }

    private function parseImageInput(string $input, bool $required = false): array
    {
        if ($input === '') {
            if ($required) {
                $this->validationError('Vui lòng chọn ảnh hợp lệ.');
            }
            return ['path' => null, 'data' => null, 'mime' => null];
        }

        if (str_starts_with($input, 'data:')) {
            if (!preg_match(
                '#\Adata:(image/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]*={0,2})\z#',
                $input,
                $matches
            )) {
                $this->validationError('Ảnh phải là JPEG, PNG, GIF hoặc WebP hợp lệ.');
            }
            $bytes = base64_decode($matches[2], true);
            $imageInfo = $bytes === false ? false : getimagesizefromstring($bytes);
            if ($bytes === false || strlen($bytes) === 0 || strlen($bytes) > 1_048_576
                || $imageInfo === false || ($imageInfo['mime'] ?? '') !== $matches[1]) {
                $this->validationError('Ảnh không hợp lệ hoặc vượt quá giới hạn 1 MB.');
            }
            return ['path' => 'db', 'data' => $bytes, 'mime' => $matches[1]];
        }

        $scheme = parse_url($input, PHP_URL_SCHEME);
        $isUrl = filter_var($input, FILTER_VALIDATE_URL) !== false
            && in_array(strtolower((string)$scheme), ['http', 'https'], true);
        $isLocalPath = str_starts_with($input, '/') && !str_starts_with($input, '//');
        if (strlen($input) > 255 || (!$isUrl && !$isLocalPath)) {
            $this->validationError('Đường dẫn ảnh không hợp lệ.');
        }
        return ['path' => $input, 'data' => null, 'mime' => null];
    }

    private function all(string $sql, array $params = []): array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function one(string $sql, array $params = []): ?array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        $row = $statement->fetch(\PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
