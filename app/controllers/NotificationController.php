<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\Notification;

/**
 * NotificationController — Quản lý thông báo in-app
 */
class NotificationController extends Controller
{
    private Notification $notifModel;

    public function __construct()
    {
        $this->notifModel = new Notification();
    }

    // ─── Trang xem tất cả thông báo ─────────────────────────────────────────

    public function index(): void
    {
        Middleware::requireAuth();
        $user = $this->currentUser();

        // Đánh dấu tất cả là đã đọc khi vào trang
        $this->notifModel->markAllRead($user['id']);

        $notifications = $this->notifModel->getByUser($user['id'], 100);

        $this->render('notifications/index', [
            'title'         => 'Thông báo của tôi',
            'notifications' => $notifications,
        ]);
    }

    // ─── API: Lấy thông báo chưa đọc (badge polling) ────────────────────────

    public function apiUnread(): void
    {
        if (!$this->isLoggedIn()) {
            $this->json([
                'success' => true,
                'data'    => ['count' => 0, 'items' => []],
                'message' => ''
            ]);
        }

        $user  = $this->currentUser();
        $count = $this->notifModel->countUnread($user['id']);
        $items = $this->notifModel->getByUser($user['id'], 5); // 5 mới nhất cho dropdown

        $this->json([
            'success' => true,
            'data'    => [
                'count' => $count,
                'items' => array_map(fn($n) => [
                    'id'      => $n['id'],
                    'type'    => $n['type'],
                    'title'   => $n['title'],
                    'body'    => $n['body'],
                    'link'    => $n['link'],
                    'is_read' => (bool)$n['is_read'],
                    'time'    => $this->timeAgo($n['created_at']),
                ], $items),
            ],
            'message' => ''
        ]);
    }

    // ─── API: Đánh dấu 1 thông báo đã đọc ──────────────────────────────────

    public function markRead(): void
    {
        Middleware::requireAuth();
        $user    = $this->currentUser();
        $notifId = (int)($_POST['id'] ?? 0);

        if ($notifId > 0) {
            $this->notifModel->markRead($notifId, $user['id']);
        }

        $this->json(['success' => true]);
    }

    // ─── Helper: Hiển thị thời gian tương đối ───────────────────────────────

    private function timeAgo(string $datetime): string
    {
        $diff = time() - strtotime($datetime);
        if ($diff < 60)      return 'Vừa xong';
        if ($diff < 3600)    return floor($diff / 60) . ' phút trước';
        if ($diff < 86400)   return floor($diff / 3600) . ' giờ trước';
        return floor($diff / 86400) . ' ngày trước';
    }
}
