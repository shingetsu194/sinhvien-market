<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\Auction;
use App\Models\Product;
use App\Models\User;
use App\Services\NotificationService;

/**
 * AuctionController — Phase 4
 * Hai endpoint chính:
 *   GET  /api/auction/price  → JSON giá hiện tại (polling realtime)
 *   POST /auction/buy        → Chốt đơn (SELECT FOR UPDATE)
 */
class AuctionController extends Controller
{
    private Auction $auctionModel;

    public function __construct()
    {
        $this->auctionModel = new Auction();
    }

    // ─── API: Lấy giá hiện tại (polling mỗi 5-10 giây) ──────────────────

    public function apiPrice(): void
    {
        $auctionId = (int)($_GET['id'] ?? 0);
        if ($auctionId <= 0) {
            $this->json(['error' => 'Invalid auction ID'], 400);
        }

        $auction = $this->auctionModel->findById($auctionId);
        if (!$auction || $auction['status'] !== 'active') {
            $this->json([
                'status'        => $auction['status'] ?? 'not_found',
                'current_price' => $auction['final_price'] ?? null,
                'is_at_floor'   => true,
            ]);
            return;
        }

        $priceData = Auction::calculateCurrentPrice($auction);

        $this->json([
            'status'               => 'active',
            'current_price'        => $priceData['current_price'],
            'floor_price'          => $priceData['floor_price'],
            'start_price'          => $priceData['start_price'],
            'is_at_floor'          => $priceData['is_at_floor'],
            'next_drop_in_seconds' => $priceData['next_drop_in_seconds'],
            'formatted_price'      => number_format($priceData['current_price'], 0, ',', '.') . 'đ',
        ]);
    }

    // ─── Chốt đơn mua (POST, yêu cầu đăng nhập + CSRF) ──────────────────

    public function buy(): void
    {
        Middleware::requireAuth();

        // CSRF
        if (!$this->verifyCsrf()) {
            $this->json(['success' => false, 'message' => 'Phiên làm việc hết hạn.'], 403);
        }

        $user      = $this->currentUser();
        $auctionId = (int)($_POST['auction_id'] ?? 0);
        $clientPrice = (int)($_POST['current_price'] ?? 0); // Giá client thấy lúc click

        if ($auctionId <= 0) {
            $this->json(['success' => false, 'message' => 'Dữ liệu không hợp lệ.'], 400);
        }

        // Lấy auction và tính giá thực tế server-side
        $auction = $this->auctionModel->findById($auctionId);

        if (!$auction || $auction['status'] !== 'active') {
            $this->json([
                'success' => false,
                'message' => 'Phiên đấu giá đã kết thúc hoặc không tồn tại.',
            ]);
            return;
        }

        // Tính giá server-side (không tin giá do client gửi lên)
        $priceData    = Auction::calculateCurrentPrice($auction);
        $serverPrice  = $priceData['current_price'];

        // Kiểm tra người bán không thể mua đồ mình đăng
        $productModel = new Product();
        $product      = $productModel->findWithAuction((int)$auction['product_id']);
        if ($product && (int)$product['user_id'] === (int)$user['id']) {
            $this->json([
                'success' => false,
                'message' => 'Bạn không thể mua sản phẩm do chính mình đăng.',
            ]);
            return;
        }

        // Thực hiện chốt đơn với SELECT FOR UPDATE
        $success = $this->auctionModel->lockAndBuy($auctionId, $user['id'], $serverPrice);

        if ($success) {
            // Thông báo cho người bán
            if ($product) {
                $userModel = new User();
                $seller = $userModel->findById((int)$product['user_id']);
                if ($seller) {
                    NotificationService::notifyItemSold(
                        (int)$seller['id'], $seller['email'], $seller['name'],
                        (int)$product['id'], $product['title'],
                        $user['name'], $serverPrice
                    );
                }
            }

            $this->json([
                'success'    => true,
                'message'    => 'Chúc mừng! Bạn đã mua thành công với giá ' .
                                number_format($serverPrice, 0, ',', '.') . 'đ.',
                'final_price' => $serverPrice,
            ]);
        } else {
            $this->json([
                'success' => false,
                'message' => 'Rất tiếc! Sản phẩm vừa được mua bởi người khác trong tích tắc.',
            ]);
        }
    }
}
