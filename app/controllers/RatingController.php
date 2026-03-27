<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\Rating;
use App\Models\Transaction;
use App\Models\User;

/**
 * RatingController — Hệ thống đánh giá uy tín người bán (1–5 sao)
 */
class RatingController extends Controller
{
    private Rating $ratingModel;

    public function __construct()
    {
        $this->ratingModel = new Rating();
    }

    // ─── Gửi đánh giá (POST từ trang lịch sử giao dịch) ────────────────────

    public function create(): void
    {
        Middleware::requireAuth();

        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên hết hạn, thử lại.');
            $this->redirect('transactions/history');
        }

        $user  = $this->currentUser();
        $txId  = (int)($_POST['transaction_id'] ?? 0);
        $stars = (int)($_POST['stars'] ?? 0);
        $comment = trim($_POST['comment'] ?? '');

        // Validate stars
        if ($stars < 1 || $stars > 5) {
            Flash::set('danger', 'Vui lòng chọn từ 1 đến 5 sao.');
            $this->redirect('transactions/history');
        }

        // Lấy giao dịch và kiểm tra người dùng có quyền đánh giá không
        $txModel  = new Transaction();
        $tx = $txModel->findById($txId);

        if (!$tx || (int)$tx['buyer_id'] !== (int)$user['id']) {
            Flash::set('danger', 'Không tìm thấy giao dịch hoặc bạn không có quyền đánh giá.');
            $this->redirect('transactions/history');
        }

        // Kiểm tra đã đánh giá chưa
        if ($this->ratingModel->existsForTransaction($txId)) {
            Flash::set('warning', 'Bạn đã đánh giá giao dịch này rồi.');
            $this->redirect('transactions/history');
        }

        $success = $this->ratingModel->create(
            $txId,
            (int)$user['id'],
            (int)$tx['seller_id'],
            (int)$tx['product_id'],
            $stars,
            $comment
        );

        if ($success) {
            Flash::set('success', 'Cảm ơn bạn đã đánh giá! ⭐');
        } else {
            Flash::set('danger', 'Bạn đã đánh giá giao dịch này rồi.');
        }

        $this->redirect('transactions/history');
    }

    // ─── Trang hồ sơ người dùng (public profile) ────────────────────────────

    public function profile(): void
    {
        $targetId = (int)($_GET['id'] ?? 0);

        if ($targetId <= 0) {
            http_response_code(404);
            include APP_PATH . '/views/errors/404.php';
            exit;
        }

        $userModel = new User();
        $profile   = $userModel->findById($targetId);

        if (!$profile || $profile['role'] !== 'student') {
            http_response_code(404);
            include APP_PATH . '/views/errors/404.php';
            exit;
        }

        $ratings = $this->ratingModel->getByRatee($targetId);
        $stats   = $this->ratingModel->getStats($targetId);

        $this->render('users/profile', [
            'title'   => 'Hồ sơ — ' . $profile['name'],
            'profile' => $profile,
            'ratings' => $ratings,
            'stats'   => $stats,
        ]);
    }
}
