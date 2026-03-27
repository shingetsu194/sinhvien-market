<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\User;
use App\Models\Product;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\AuditLog;
use App\Services\NotificationService;

/**
 * AdminController — Phase 7
 * Tất cả route /admin/* đều yêu cầu role = 'admin'
 */
class AdminController extends Controller
{
    private User $userModel;
    private Product $productModel;
    private Category $categoryModel;
    private Transaction $txModel;
    private AuditLog $auditModel;

    public function __construct()
    {
        $this->userModel = new User();
        $this->productModel = new Product();
        $this->categoryModel = new Category();
        $this->txModel = new Transaction();
        $this->auditModel = new AuditLog();
    }

    // ─── Dashboard ───────────────────────────────────────────────────────

    public function dashboard(): void
    {
        Middleware::requireAdmin();

        $stats = [
            'total_users' => $this->userModel->countAll(),
            'active_products' => $this->productModel->countActive(),
            'pending_count' => count($this->productModel->getPending()),
            'tx_today' => $this->txModel->countToday(),
            'recent_tx' => $this->txModel->getAll('', '', 5),
            'recent_products' => $this->productModel->getPending(),
        ];

        $this->render('admin/dashboard', ['title' => 'Dashboard', 'stats' => $stats], 'admin');
    }

    // ─── Quản lý người dùng ──────────────────────────────────────────────

    public function users(): void
    {
        Middleware::requireAdmin();
        $users = $this->userModel->all();
        $this->render('admin/users', ['title' => 'Quản lý người dùng', 'users' => $users], 'admin');
    }

    public function userDetail(): void
    {
        Middleware::requireAdmin();
        $userId = (int)($_GET['id'] ?? 0);
        $user   = $this->userModel->findByIdFull($userId);

        if (!$user) {
            Flash::set('danger', 'Người dùng không tồn tại.');
            $this->redirect('admin/users');
        }

        // Sản phẩm của user
        $products = $this->productModel->getByUser($userId);

        // Giao dịch của user (mua + bán)
        $transactions = $this->txModel->getByUser($userId);

        // Rating stats
        $ratingModel = new \App\Models\Rating();
        $ratingStats = $ratingModel->getStats($userId);

        $this->render('admin/user_detail', [
            'title'        => 'Chi tiết người dùng: ' . $user['name'],
            'profile'      => $user,
            'products'     => $products,
            'transactions' => $transactions,
            'ratingStats'  => $ratingStats,
        ], 'admin');
    }

    public function toggleUser(): void
    {
        Middleware::requireAdmin();

        // CSRF validation
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        $tokenFromPost = $_POST['_csrf'] ?? '';
        if (!hash_equals($_SESSION['csrf_token'], $tokenFromPost)) {
            Flash::set('danger', 'Token bảo mật không hợp lệ. Vui lòng tải lại trang và thử lại.');
            $this->redirect('admin/users');
            return;
        }

        $admin  = $this->currentUser();
        $userId = (int)($_POST['user_id'] ?? 0);

        if ($userId <= 0) {
            Flash::set('danger', 'ID người dùng không hợp lệ.');
            $this->redirect('admin/users');
            return;
        }

        $user = $this->userModel->findById($userId);

        if (!$user) {
            Flash::set('danger', 'Không tìm thấy người dùng này.');
            $this->redirect('admin/users');
            return;
        }
        if ($user['role'] === 'admin') {
            Flash::set('danger', 'Không thể khóa tài khoản Admin.');
            $this->redirect('admin/users');
            return;
        }
        if ((int)$user['id'] === (int)$admin['id']) {
            Flash::set('danger', 'Không thể tự khóa tài khoản của mình.');
            $this->redirect('admin/users');
            return;
        }

        // ── Xử lý KHÓA ──────────────────────────────────────
        if (!$user['is_locked']) {
            $reason   = trim($_POST['lock_reason'] ?? '');
            $duration = $_POST['lock_duration'] ?? '';

            if (empty($reason)) {
                Flash::set('danger', 'Vui lòng nhập lý do khóa tài khoản.');
                $this->redirect('admin/users');
                return;
            }

            // Tính locked_until dựa trên cấp độ
            $durationMap = [
                '3days'    => '+3 days',
                '1week'    => '+1 week',
                '2weeks'   => '+2 weeks',
                '1month'   => '+1 month',
                '3months'  => '+3 months',
                '6months'  => '+6 months',
                'forever'  => null,   // vĩnh viễn
            ];

            if (!array_key_exists($duration, $durationMap)) {
                Flash::set('danger', 'Thời hạn khóa không hợp lệ.');
                $this->redirect('admin/users');
                return;
            }

            $lockedUntil = $durationMap[$duration] !== null
                ? date('Y-m-d H:i:s', strtotime($durationMap[$duration]))
                : null;

            $this->userModel->toggleLock($userId, 1, $reason, $lockedUntil);

            $note = "Khóa User: {$user['name']} | Lý do: $reason | Hạn: " . ($lockedUntil ?? 'Vĩnh viễn');
            $this->auditModel->log($admin['id'], 'lock_user', 'user', $userId, $note);

            $durationLabel = [
                '3days' => '3 ngày', '1week' => '1 tuần', '2weeks' => '2 tuần',
                '1month' => '1 tháng', '3months' => '3 tháng', '6months' => '6 tháng',
                'forever' => 'Vĩnh viễn',
            ][$duration];

            Flash::set('success', "✅ Đã khóa tài khoản <strong>{$user['name']}</strong> trong $durationLabel.");
        }
        // ── Xử lý MỞ KHÓA ───────────────────────────────────
        else {
            $this->userModel->toggleLock($userId, 0);
            $note = "Mở khóa User: {$user['name']} ({$user['email']})";
            $this->auditModel->log($admin['id'], 'unlock_user', 'user', $userId, $note);
            Flash::set('success', "✅ Đã mở khóa tài khoản <strong>{$user['name']}</strong>.");
        }

        $this->redirect('admin/users');
    }

    // ─── Kiểm duyệt sản phẩm ────────────────────────────────────────────

    public function products(): void
    {
        Middleware::requireAdmin();
        $tab = $_GET['tab'] ?? 'pending';
        $products = ($tab === 'all')
            ? $this->productModel->getAllForAdmin()
            : $this->productModel->getPending();
        $this->render('admin/products', [
            'title' => 'Kiểm duyệt bài đăng',
            'products' => $products,
            'tab' => $tab,
        ], 'admin');
    }

    public function approveProduct(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'CSRF không hợp lệ.');
            $this->redirect('admin/products');
        }

        $admin = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);
        $product = $this->productModel->findWithAuction($productId);

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('admin/products');
        }

        $this->productModel->updateStatus($productId, 'active');
        $this->auditModel->log($admin['id'], 'approve_product', 'product', $productId, "Duyệt: {$product['title']}");

        // Gửi thông báo cho người đăng
        $seller = $this->userModel->findById((int)$product['user_id']);
        if ($seller) {
            NotificationService::notifyProductApproved(
                (int)$seller['id'], $seller['email'], $seller['name'],
                $productId, $product['title']
            );
        }

        Flash::set('success', "Đã duyệt: {$product['title']}");
        $this->redirect('admin/products');
    }

    public function rejectProduct(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'CSRF không hợp lệ.');
            $this->redirect('admin/products');
        }

        $admin = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);
        $product = $this->productModel->findWithAuction($productId);
        $reason = trim($_POST['reject_reason'] ?? '');

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('admin/products');
        }

        $this->productModel->updateStatus($productId, 'cancelled');
        $this->auditModel->log($admin['id'], 'reject_product', 'product', $productId, "Từ chối: {$product['title']}");

        // Gửi thông báo cho người đăng
        $seller = $this->userModel->findById((int)$product['user_id']);
        if ($seller) {
            NotificationService::notifyProductRejected(
                (int)$seller['id'], $seller['email'], $seller['name'],
                $productId, $product['title'], $reason
            );
        }

        Flash::set('warning', "Đã từ chối: {$product['title']}");
        $this->redirect('admin/products');
    }

    public function deleteProduct(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'CSRF không hợp lệ.');
            $this->redirect('admin/products');
        }

        $admin = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);
        $product = $this->productModel->findWithAuction($productId);

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('admin/products');
        }

        $this->productModel->updateStatus($productId, 'cancelled');
        $this->auditModel->log($admin['id'], 'delete_product', 'product', $productId, "Xóa: {$product['title']} — đăng bởi {$product['seller_name']}");
        Flash::set('success', "Đã xóa bài đăng: {$product['title']}");
        $this->redirect('admin/products');
    }

    // ─── Quản lý danh mục ────────────────────────────────────────────────

    public function categories(): void
    {
        Middleware::requireAdmin();
        $categories = $this->categoryModel->all();
        $this->render('admin/categories', [
            'title' => 'Quản lý danh mục',
            'categories' => $categories,
            'csrf' => $this->csrfToken()
        ], 'admin');
    }

    public function storeCategory(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'CSRF không hợp lệ.');
            $this->redirect('admin/categories');
        }

        $admin = $this->currentUser();
        $name = trim($_POST['name'] ?? '');
        $icon = trim($_POST['icon'] ?? 'bi-tag');

        if (mb_strlen($name) < 2) {
            Flash::set('danger', 'Tên danh mục phải có ít nhất 2 ký tự.');
            $this->redirect('admin/categories');
        }

        $slug = Category::makeSlug($name);
        $id = $this->categoryModel->create($name, $slug, $icon);
        $this->auditModel->log($admin['id'], 'create_category', 'category', $id, "Tạo: $name");
        Flash::set('success', "Đã tạo danh mục: $name");
        $this->redirect('admin/categories');
    }

    public function updateCategory(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'CSRF không hợp lệ.');
            $this->redirect('admin/categories');
        }

        $admin = $this->currentUser();
        $id = (int)($_POST['category_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $icon = trim($_POST['icon'] ?? 'bi-tag');

        if (!$id || mb_strlen($name) < 2) {
            Flash::set('danger', 'Dữ liệu không hợp lệ.');
            $this->redirect('admin/categories');
        }

        $slug = Category::makeSlug($name);
        $this->categoryModel->update($id, $name, $slug, $icon);
        $this->auditModel->log($admin['id'], 'update_category', 'category', $id, "Sửa: $name");
        Flash::set('success', "Đã cập nhật danh mục: $name");
        $this->redirect('admin/categories');
    }

    public function deleteCategory(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'CSRF không hợp lệ.');
            $this->redirect('admin/categories');
        }

        $admin = $this->currentUser();
        $id = (int)($_POST['category_id'] ?? 0);
        $cat = $this->categoryModel->findById($id);

        if (!$cat) {
            Flash::set('danger', 'Danh mục không tồn tại.');
            $this->redirect('admin/categories');
        }

        try {
            $this->categoryModel->delete($id);
            $this->auditModel->log($admin['id'], 'delete_category', 'category', $id, "Xóa: {$cat['name']}");
            Flash::set('success', "Đã xóa danh mục: {$cat['name']}");
        }
        catch (\PDOException $e) {
            Flash::set('danger', 'Không thể xóa danh mục đang có sản phẩm.');
        }
        $this->redirect('admin/categories');
    }

    // ─── Báo cáo giao dịch ───────────────────────────────────────────────

    public function reports(): void
    {
        Middleware::requireAdmin();
        $fromDate = $_GET['from'] ?? date('Y-m-01');
        $toDate = $_GET['to'] ?? date('Y-m-d');

        $transactions = $this->txModel->getAll($fromDate, $toDate);
        $totalAmount = array_sum(array_column($transactions, 'amount'));

        $this->render('admin/reports', [
            'title' => 'Báo cáo giao dịch',
            'transactions' => $transactions,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'totalAmount' => $totalAmount,
        ], 'admin');
    }

    // ─── Audit Log ───────────────────────────────────────────────────────

    public function auditLog(): void
    {
        Middleware::requireAdmin();
        $logs = $this->auditModel->getAll(300);
        $this->render('admin/audit_log', [
            'title' => 'Nhật ký hành động Admin',
            'logs' => $logs,
        ], 'admin');
    }

    // ─── PHẦN 11.4: QUẢN LÝ GIVEAWAYS ─────────────────────────
    public function giveaways(): void
    {
        Middleware::requireAdmin();
        $model = new \App\Models\Giveaway();
        $items = $model->getAll();

        $this->render('admin/giveaways', [
            'title'     => 'Quản lý Giveaways',
            'giveaways' => $items,
        ], 'admin');
    }

    public function storeGiveaway(): void
    {
        Middleware::requireAdmin();
        if ($this->verifyCsrf()) {
            $data = [
                'title'       => $this->input('title'),
                'description' => $this->input('description'),
                'image'       => '',
                'end_time'    => $this->input('end_time'),
            ];

            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                // Upload logic
                $tmp  = $_FILES['image']['tmp_name'];
                $name = time() . '_' . preg_replace('/[^a-zA-Z0-9.\-_]/', '', $_FILES['image']['name']);
                $dest = APP_PATH . '/../public/uploads/' . $name;
                if (move_uploaded_file($tmp, $dest)) {
                    $data['image'] = $name;
                }
            }

            (new \App\Models\Giveaway())->create($data);
            \Core\Flash::set('success', 'Tạo Giveaway thành công!');
        }
        $this->redirect('admin/giveaways');
    }

    public function spinGiveaway(): void
    {
        Middleware::requireAdmin();
        $id = (int)($_GET['id'] ?? 0);
        $model = new \App\Models\Giveaway();
        $giveaway = $model->findById($id);

        if (!$giveaway || $giveaway['status'] === 'ended') {
            \Core\Flash::set('danger', 'Sự kiện không tồn tại hoặc đã kết thúc!');
            $this->redirect('admin/giveaways');
            return;
        }

        $participants = $model->getParticipants($id);
        
        $this->render('admin/giveaway_spin', [
            'title'        => 'Vòng Quay May Mắn - ' . htmlspecialchars($giveaway['title'], ENT_QUOTES),
            'giveaway'     => $giveaway,
            'participants' => json_encode($participants, JSON_UNESCAPED_UNICODE),
        ], 'admin');
    }

    public function spinGiveawayApi(): void
    {
        Middleware::requireAdmin();

        $id       = (int)$this->input('id');
        $winnerId = (int)$this->input('winner_id');

        if ($id > 0 && $winnerId > 0) {
            $model = new \App\Models\Giveaway();
            $model->setWinner($id, $winnerId);
            
            // Lấy thông tin người trúng giải và sự kiện để gửi thông báo
            $userModel = new \App\Models\User();
            $winner = $userModel->findById($winnerId);
            $giveaway = $model->findById($id);
            
            if ($winner && $giveaway) {
                // Sử dụng hàm notify tùy chỉnh cho Giveaway (nếu chưa có thì tạm dùng notify qua Mailer trực tiếp ở đây)
                $link = rtrim($_ENV['APP_URL'] ?? '', '/') . '/giveaways';
                \App\Models\Notification::create(
                    $winnerId,
                    'giveaway_win',
                    '🎉 Xin chúc mừng, bạn đã trúng Giveaway!',
                    'Bạn là người may mắn trúng giải sự kiện "' . $giveaway['title'] . '". Vui lòng liên hệ Ban Quản Trị Ký túc xá để nhận giải.',
                    $link
                );
                
                \Core\Mailer::send(
                    $winner['email'],
                    $winner['name'],
                    '🎉 Bạn đã trúng giải sự kiện SinhVienMarket',
                    "Xin chào {$winner['name']},<br><br>
                    Xin chúc mừng! Bạn là người may mắn trúng giải thưởng trong sự kiện <strong>\"{$giveaway['title']}\"</strong>.<br><br>
                    Vui lòng liên hệ với Ban Quản Trị hoặc Admin tại văn phòng KTX Khu B để nhận phần thưởng của mình.<br><br>
                    <a href='{$link}'>➡️ Xem chi tiết trên trang chủ</a><br><br>
                    Trân trọng,<br>Đội ngũ SinhVienMarket"
                );
            }

            http_response_code(200);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => true,
                'data'    => null,
                'message' => 'Đã lưu người trúng giải thành công!',
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(422);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error'   => ['code' => 'VALIDATION_ERROR', 'message' => 'Dữ liệu không hợp lệ.'],
            ], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    // ─── Quản lý Tố Cáo & Vi phạm ───────────────────────────────────────

    public function systemReports(): void
    {
        Middleware::requireAdmin();
        $reportModel = new \App\Models\Report();
        $status = $_GET['status'] ?? ''; // pending, resolved, ignored
        $reports = $reportModel->getAll((string)$status);
        
        $this->render('admin/system_reports', [
            'title'   => 'Quản lý Báo cáo Vi phạm',
            'reports' => $reports,
            'status'  => $status
        ], 'admin');
    }

    public function resolveReport(): void
    {
        Middleware::requireAdmin();
        // Không kiểm tra CSRF tạm thời để dễ tích hợp với button, xử lý qua POST
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = (int)$this->input('id');
            $status = $this->input('status'); // resolved / ignored
            $adminNote = $this->input('admin_note');
            
            if ($id > 0 && in_array($status, ['resolved', 'ignored'])) {
                $reportModel = new \App\Models\Report();
                $reportModel->updateStatus($id, $status, $adminNote);
                Flash::set('success', 'Đã lưu kết quả xử lý báo cáo vi phạm.');
            }
        }
        $this->redirect('admin/system-reports');
    }
}
