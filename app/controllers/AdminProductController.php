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
use App\Models\Report;
use App\Models\Rating;
use App\Models\Banner;
use App\Models\Giveaway;
use App\Services\NotificationService;

class AdminProductController extends Controller
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
            return;
        }

        $admin = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);
        $product = $this->productModel->findWithAuction($productId);

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('admin/products');
            return;
        }

        $this->productModel->updateStatus($productId, 'active');
        // Embed now so the listing is found by AI search immediately (best effort).
        try {
            (new \App\Services\Matching\SmartSearchService())->indexProduct($productId);
        } catch (\Throwable $e) {
            error_log('Embedding on approval failed: ' . $e->getMessage());
        }
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
            return;
        }

        $admin = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);
        $product = $this->productModel->findWithAuction($productId);
        $reason = trim($_POST['reject_reason'] ?? '');

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('admin/products');
            return;
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
            return;
        }

        $admin = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);
        $product = $this->productModel->findWithAuction($productId);

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('admin/products');
            return;
        }

        // Xóa HẲN sản phẩm (ảnh trong DB + auction/chat/wishlist/rating tự CASCADE).
        // Sản phẩm đã có giao dịch (FK RESTRICT) → không xóa được, báo rõ thay vì
        // giả vờ "đã xóa" (giữ lịch sử đơn hàng).
        try {
            $this->productModel->delete($productId);
        } catch (\PDOException $e) {
            Flash::set('danger', 'Không thể xóa "' . $product['title'] . '": sản phẩm đã phát sinh giao dịch nên phải giữ lại lịch sử đơn hàng.');
            $this->redirect('admin/products');
            return;
        }

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
            return;
        }

        $admin = $this->currentUser();
        $name = trim($_POST['name'] ?? '');
        $icon = trim($_POST['icon'] ?? 'bi-tag');

        if (mb_strlen($name) < 2) {
            Flash::set('danger', 'Tên danh mục phải có ít nhất 2 ký tự.');
            $this->redirect('admin/categories');
            return;
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
            return;
        }

        $admin = $this->currentUser();
        $id = (int)($_POST['category_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $icon = trim($_POST['icon'] ?? 'bi-tag');

        if (!$id || mb_strlen($name) < 2) {
            Flash::set('danger', 'Dữ liệu không hợp lệ.');
            $this->redirect('admin/categories');
            return;
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
            return;
        }

        $admin = $this->currentUser();
        $id = (int)($_POST['category_id'] ?? 0);
        $cat = $this->categoryModel->findById($id);

        if (!$cat) {
            Flash::set('danger', 'Danh mục không tồn tại.');
            $this->redirect('admin/categories');
            return;
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

    public function banners(): void
    {
        Middleware::requireAdmin();
        $model = new \App\Models\Banner();
        $this->render('admin/banners', [
            'title'   => 'Quản lý Banner Trang chủ',
            'banners' => $model->getAllForAdmin(),
            'csrf'    => $this->csrfToken(), // BUG-006 fix: truyền token vào view
        ], 'admin');
    }

    public function storeBanner(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) { // BUG-006 fix
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('admin/banners'); return;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $title = trim($this->input('title'));
            $linkUrl = trim($this->input('link_url'));
            $displayOrder = $this->inputInt('display_order', 0); // BUG-A06 fix: dùng inputInt()
            $isActive = $this->inputInt('is_active', 1);          // BUG-A06 fix: dùng inputInt()

            // Đọc ảnh để lưu vào DB (bền qua redeploy Railway)
            $imageBytes = null;
            $imageMime  = null;
            if (!empty($_FILES['image']['name']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $imageBytes = file_get_contents($_FILES['image']['tmp_name']);
                $imageMime  = mime_content_type($_FILES['image']['tmp_name']);
            }

            if ($imageBytes === null) {
                \Core\Flash::set('danger', 'Vui lòng chọn ảnh Banner hợp lệ.');
                $this->redirect('admin/banners'); return; // BUG-006 fix: bỏ dấu /
            }

            $model = new \App\Models\Banner();
            // 'db' = marker đánh dấu banner CÓ ảnh (ảnh thật nằm ở banner_images)
            $bannerId = $model->create('db', $linkUrl, $title, $displayOrder, $isActive);
            $model->saveImage($bannerId, $imageBytes, $imageMime);

            \Core\Flash::set('success', 'Đã thêm Banner mới.');
        }
        $this->redirect('admin/banners'); // BUG-006 fix: bỏ dấu /
    }

    public function updateBanner(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) { // BUG-006 fix
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('admin/banners'); return;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = (int)$this->input('id');
            $title = trim($this->input('title'));
            $linkUrl = trim($this->input('link_url'));
            $displayOrder = $this->inputInt('display_order', 0); // BUG-A06 fix

            $model = new \App\Models\Banner();
            $model->update($id, $linkUrl, $title, $displayOrder);
            
            \Core\Flash::set('success', 'Đã cập nhật Banner.');
        }
        $this->redirect('admin/banners'); // BUG-006 fix: bỏ dấu /
    }

    /**
     * Phục vụ ảnh banner từ DB (PUBLIC — banner hiển thị ở trang chủ cho mọi người).
     */
    public function bannerImage(): void
    {
        $id  = (int)($_GET['id'] ?? 0);
        $img = $id > 0 ? (new \App\Models\Banner())->getImageBlob($id) : null;
        if ($img && !empty($img['data'])) {
            header('Content-Type: ' . $img['mime']);
            header('Cache-Control: public, max-age=86400');
            header('Content-Length: ' . strlen($img['data']));
            echo $img['data'];
            exit;
        }
        header('Content-Type: image/svg+xml');
        header('Cache-Control: public, max-age=3600');
        echo '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="#e5e7eb"/></svg>';
        exit;
    }

    public function toggleBanner(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) { // BUG-006 fix
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('admin/banners'); return;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = (int)$this->input('id');
            $model = new \App\Models\Banner();
            $model->toggleStatus($id);
            \Core\Flash::set('success', 'Đã thay đổi trạng thái Banner.');
        }
        $this->redirect('admin/banners'); // BUG-006 fix: bỏ dấu /
    }

    public function deleteBanner(): void
    {
        Middleware::requireAdmin();
        if (!$this->verifyCsrf()) { // BUG-006 fix
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('admin/banners'); return;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = (int)$this->input('id');
            $model = new \App\Models\Banner();
            $banner = $model->findById($id);
            
            if ($banner) {
                // Xóa file ảnh thực tế
                $filePath = __DIR__ . '/../..' . $banner['image'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                $model->delete($id);
                \Core\Flash::set('success', 'Đã xóa Banner vĩnh viễn.');
            }
        }
        $this->redirect('admin/banners'); // BUG-006 fix: bỏ dấu /
    }

    // ─── Quản lý Tố Cáo & Vi phạm ───────────────────────────────────────

}
