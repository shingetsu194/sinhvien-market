<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\Report;

/**
 * ReportController — Xử lý gửi tố cáo từ người dùng
 */
class ReportController extends Controller
{
    private Report $reportModel;

    public function __construct()
    {
        $this->reportModel = new Report();
    }

    /**
     * Lưu tố cáo (POST)
     */
    public function store(): void
    {
        Middleware::requireAuth();

        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên làm việc hết hạn. Vui lòng thử lại.');
            $this->redirect('products');
            return;
        }

        $sessionUser = $this->currentUser();
        $reporterId = (int)$sessionUser['id'];

        $targetUserId = (int)$this->input('target_user_id', '0');
        $productId    = (int)$this->input('product_id', '0');
        $reason       = $this->input('reason');
        $description  = $this->input('description');

        if (empty($reason) || empty($description)) {
            Flash::set('danger', 'Lý do và chi tiết tố cáo không được để trống.');
            // Trở lại trang trước đó bằng HTTP_REFERER nếu có
            $referer = $_SERVER['HTTP_REFERER'] ?? '/';
            $this->redirect($referer);
            return;
        }

        if ($targetUserId === 0 && $productId === 0) {
            Flash::set('danger', 'Dữ liệu tố cáo không hợp lệ.');
            $this->redirect('products');
            return;
        }

        $this->reportModel->createReport($reporterId, $targetUserId, $productId, $reason, $description);

        Flash::set('success', 'Đã lưu báo cáo vi phạm. Quản trị viên sẽ xem xét và xử lý sớm nhất.');
        
        $referer = $_SERVER['HTTP_REFERER'] ?? '/products';
        $this->redirect($referer);
    }
}
