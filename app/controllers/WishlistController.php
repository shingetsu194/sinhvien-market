<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\Wishlist;
use App\Models\Product;
use App\Models\Auction;

/**
 * WishlistController — Quản lý danh sách yêu thích
 */
class WishlistController extends Controller
{
    private Wishlist $wishlistModel;

    public function __construct()
    {
        $this->wishlistModel = new Wishlist();
    }

    // ─── Trang danh sách yêu thích ───────────────────────────────────────

    public function index(): void
    {
        Middleware::requireAuth();
        $user     = $this->currentUser();
        $products = $this->wishlistModel->getByUser($user['id']);

        // Tính giá hiện tại cho sản phẩm đấu giá
        foreach ($products as &$p) {
            if ($p['type'] === 'auction' && !empty($p['started_at'])) {
                $priceData = Auction::calculateCurrentPrice($p);
                $p['current_price']  = $priceData['current_price'];
                $p['is_at_floor']    = $priceData['is_at_floor'];
            }
        }
        unset($p);

        $this->render('wishlists/index', [
            'title'    => 'Sản phẩm yêu thích',
            'products' => $products,
        ]);
    }

    // ─── Toggle thêm/xóa khỏi yêu thích (AJAX POST) ─────────────────────

    public function toggle(): void
    {
        Middleware::requireAuth();

        if (!$this->verifyCsrf()) {
            $this->json(['success' => false, 'message' => 'CSRF không hợp lệ.'], 403);
        }

        $user      = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);

        if ($productId <= 0) {
            $this->json(['success' => false, 'message' => 'Sản phẩm không hợp lệ.'], 400);
        }

        $productModel = new Product();
        $product      = $productModel->findById($productId);

        if (!$product || $product['status'] !== 'active') {
            $this->json(['success' => false, 'message' => 'Sản phẩm không tồn tại.'], 404);
        }

        $exists = $this->wishlistModel->exists($user['id'], $productId);

        if ($exists) {
            $this->wishlistModel->remove($user['id'], $productId);
            $this->json(['success' => true, 'action' => 'removed', 'message' => 'Đã xóa khỏi danh sách yêu thích.']);
        } else {
            $price = (int)($product['price'] ?? 0);
            $this->wishlistModel->add($user['id'], $productId, $price ?: null);
            $this->json(['success' => true, 'action' => 'added', 'message' => 'Đã thêm vào danh sách yêu thích! ❤️']);
        }
    }
}
