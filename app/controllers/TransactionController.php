<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use App\Models\Transaction;

use Core\Flash;

/**
 * TransactionController — Lịch sử giao dịch và Thanh toán
 */
class TransactionController extends Controller
{
    public function checkout(): void
    {
        Middleware::requireAuth();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('products'); return;
        }

        $userId = $this->currentUser()['id'];
        $targetId = (int)$this->input('target_id');
        $type = $this->input('type'); // 'sale' or 'auction'
        $price = (float)$this->input('price');
        $address = $this->input('shipping_address');
        $method = $this->input('payment_method'); // cod, banking, zalopay

        $txModel = new Transaction();
        $pModel = new \App\Models\Product();

        if ($type === 'auction') {
            $aModel = new \App\Models\Auction();
            $auction = $aModel->findById($targetId);
            if (!$auction || $auction['status'] !== 'active') {
                Flash::set('danger', 'Phiên đấu giá không hợp lệ hoặc đã kết thúc.');
                $this->redirect('products'); return;
            }
            $productId = $auction['product_id'];
            $sellerId = $pModel->findById($productId)['user_id'] ?? 0;
            
            // Mark auction as ended
            $aModel->markAsEnded($targetId, $userId, $price);
            $pModel->updateStatus($productId, 'sold');

        } else {
            // Sale
            $productId = $targetId;
            $product = $pModel->findById($productId);
            if (!$product || $product['status'] !== 'active') {
                Flash::set('danger', 'Sản phẩm không hợp lệ hoặc đã bán.');
                $this->redirect('products'); return;
            }
            $sellerId = $product['user_id'];
            $pModel->updateStatus($productId, 'sold');
        }

        $txId = $txModel->createTransaction($userId, $sellerId, $productId, $price, $method, $address);

        if ($method === 'banking') {
            $this->redirect("transactions/bank?id=$txId");
        } elseif ($method === 'zalopay') {
            $this->redirect("transactions/zalopay?id=$txId");
        } else {
            Flash::set('success', 'Đặt hàng thành công! Đơn hàng sẽ thanh toán khi nhận (COD).');
            $this->redirect('transactions/history');
        }
    }

    public function bank(): void
    {
        Middleware::requireAuth();
        $id = (int)($_GET['id'] ?? 0);
        $tx = (new Transaction())->findById($id);
        if (!$tx || (int)$tx['buyer_id'] !== (int)$this->currentUser()['id']) {
            $this->redirect('transactions/history'); return;
        }
        $csrf = $this->csrfToken();
        include APP_PATH . '/views/transactions/bank.php';
    }

    public function bankConfirm(): void
    {
        Middleware::requireAuth();
        if ($this->verifyCsrf()) {
            Flash::set('success', 'Đã ghi nhận yêu cầu. Người bán sẽ xác nhận khi nhận được chuyển khoản.');
        }
        $this->redirect('transactions/history');
    }

    public function zalopay(): void
    {
        Middleware::requireAuth();
        $id = (int)($_GET['id'] ?? 0);
        $tx = (new Transaction())->findById($id);
        if (!$tx || (int)$tx['buyer_id'] !== (int)$this->currentUser()['id']) {
            $this->redirect('transactions/history'); return;
        }
        $csrf = $this->csrfToken();
        include APP_PATH . '/views/transactions/zalopay_sandbox.php';
    }

    public function zalopayCallback(): void
    {
        Middleware::requireAuth();
        if ($this->verifyCsrf()) {
            $id = (int)$this->input('transaction_id');
            // MOCK: Auto mark as paid on sandbox
            (new Transaction())->updatePaymentStatus($id, 'paid');
            Flash::set('success', 'Thanh toán ZaloPay Sandbox thành công!');
        }
        $this->redirect('transactions/history');
    }

    public function history(): void
    {
        Middleware::requireAuth();
        $user         = $this->currentUser();
        $txModel      = new Transaction();
        $transactions = $txModel->getByUser($user['id']);

        $this->render('transactions/history', [
            'title'        => 'Lịch sử giao dịch',
            'transactions' => $transactions,
        ]);
    }

    public function updateStatus(): void
    {
        Middleware::requireAuth();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('transactions/history');
            return;
        }

        $id = (int)$this->input('id');
        $status = $this->input('status'); // shipping, delivered, completed
        $user = $this->currentUser();

        $txModel = new Transaction();
        $tx = $txModel->findById($id);

        if (!$tx) {
            Flash::set('danger', 'Giao dịch không tồn tại.');
            $this->redirect('transactions/history');
            return;
        }

        $isBuyer = (int)$tx['buyer_id'] === (int)$user['id'];
        $isSeller = (int)$tx['seller_id'] === (int)$user['id'];

        // Kiểm tra quyền cập nhật
        if ($isSeller && in_array($status, ['shipping', 'delivered'])) {
            $txModel->updateOrderStatus($id, $status);
            Flash::set('success', 'Đã cập nhật trạng thái đơn hàng thành công!');
        } elseif ($isBuyer && in_array($status, ['completed'])) {
            $txModel->updateOrderStatus($id, $status);
            Flash::set('success', 'Bạn đã xác nhận nhận hàng. Cảm ơn bạn!');
        } else {
            Flash::set('danger', 'Hành động không hợp lệ hoặc không có quyền.');
        }

        $this->redirect('transactions/history');
    }
}
