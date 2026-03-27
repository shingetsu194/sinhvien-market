<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Product;
use App\Services\NotificationService;

/**
 * ChatController — Hệ thống nhắn tin giữa người mua và người bán
 */
class ChatController extends Controller
{
    private Conversation $convModel;
    private Message      $msgModel;

    public function __construct()
    {
        $this->convModel = new Conversation();
        $this->msgModel  = new Message();
    }

    // ─── Danh sách tất cả cuộc hội thoại ────────────────────────────────────

    public function index(): void
    {
        Middleware::requireAuth();
        $user = $this->currentUser();

        $conversations = $this->convModel->getByUser($user['id']);

        $this->render('chat/index', [
            'title'         => 'Tin nhắn',
            'conversations' => $conversations,
            'activeConvId'  => null,
            'messages'      => [],
            'activeConv'    => null,
        ]);
    }

    // ─── Xem và chat trong 1 cuộc hội thoại ─────────────────────────────────

    public function show(): void
    {
        Middleware::requireAuth();
        $user   = $this->currentUser();
        $convId = (int)($_GET['id'] ?? 0);

        if ($convId <= 0) {
            $this->redirect('chat');
        }

        $conv = $this->convModel->findByIdForUser($convId, $user['id']);
        if (!$conv) {
            Flash::set('danger', 'Không tìm thấy cuộc hội thoại.');
            $this->redirect('chat');
        }

        // Đánh dấu đã đọc
        $this->msgModel->markAsRead($convId, $user['id']);

        $messages      = $this->msgModel->getByConversation($convId);
        $conversations = $this->convModel->getByUser($user['id']);

        $this->render('chat/index', [
            'title'         => 'Tin nhắn — ' . $conv['product_title'],
            'conversations' => $conversations,
            'activeConvId'  => $convId,
            'messages'      => $messages,
            'activeConv'    => $conv,
        ]);
    }

    // ─── Bắt đầu cuộc hội thoại từ trang sản phẩm ───────────────────────────

    public function start(): void
    {
        Middleware::requireAuth();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên hết hạn.');
            $this->redirect('products');
        }

        $user      = $this->currentUser();
        $productId = (int)($_POST['product_id'] ?? 0);

        if ($productId <= 0) {
            Flash::set('danger', 'Sản phẩm không hợp lệ.');
            $this->redirect('products');
        }

        $productModel = new Product();
        $product      = $productModel->findById($productId);

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('products');
        }

        // Không thể chat với chính mình
        if ((int)$product['user_id'] === (int)$user['id']) {
            Flash::set('warning', 'Bạn không thể liên hệ với chính mình.');
            $this->redirect('products/show?id=' . $productId);
        }

        $sellerId = (int)$product['user_id'];
        $convId   = $this->convModel->findOrCreate($productId, $user['id'], $sellerId);

        $this->redirect('chat/show?id=' . $convId);
    }

    // ─── API: Gửi tin nhắn (AJAX POST) ──────────────────────────────────────

    public function send(): void
    {
        Middleware::requireAuth();

        if (!$this->verifyCsrf()) {
            $this->json(['success' => false, 'message' => 'CSRF không hợp lệ.'], 403);
        }

        $user   = $this->currentUser();
        $convId = (int)($_POST['conversation_id'] ?? 0);
        $body   = trim($_POST['body'] ?? '');

        if ($convId <= 0 || $body === '') {
            $this->json(['success' => false, 'message' => 'Dữ liệu không hợp lệ.'], 400);
        }

        // Kiểm tra quyền truy cập cuộc hội thoại
        $conv = $this->convModel->findByIdForUser($convId, $user['id']);
        if (!$conv) {
            $this->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        // Giới hạn độ dài tin nhắn
        if (mb_strlen($body) > 1000) {
            $this->json(['success' => false, 'message' => 'Tin nhắn tối đa 1000 ký tự.'], 400);
        }

        $msgId = $this->msgModel->send($convId, $user['id'], $body);

        // Xác định người nhận để gửi thông báo
        $receiverId = ((int)$conv['buyer_id'] === (int)$user['id'])
            ? (int)$conv['seller_id']
            : (int)$conv['buyer_id'];

        NotificationService::notifyNewMessage(
            $receiverId,
            $user['name'],
            $convId,
            $conv['product_title']
        );

        $this->json([
            'success' => true,
            'data'    => [
                'message_id' => $msgId,
                'body'       => htmlspecialchars($body, ENT_QUOTES, 'UTF-8'),
                'sender'     => $user['name'],
                'time'       => date('H:i'),
            ],
            'message' => '',
        ]);
    }

    // ─── API: Polling tin nhắn mới ───────────────────────────────────────────

    public function apiPoll(): void
    {
        Middleware::requireAuth();

        $user    = $this->currentUser();
        $convId  = (int)($_GET['conv_id'] ?? 0);
        $afterId = (int)($_GET['after_id'] ?? 0);

        if ($convId <= 0) {
            $this->json(['messages' => []]);
        }

        // Kiểm tra quyền
        $conv = $this->convModel->findByIdForUser($convId, $user['id']);
        if (!$conv) {
            $this->json(['messages' => []], 403);
        }

        // Đánh dấu đã đọc
        $this->msgModel->markAsRead($convId, $user['id']);

        $newMessages = $this->msgModel->getAfter($convId, $afterId);

        $formatted = array_map(fn($m) => [
            'id'          => $m['id'],
            'body'        => htmlspecialchars($m['body'], ENT_QUOTES, 'UTF-8'),
            'sender_name' => $m['sender_name'],
            'sender_id'   => $m['sender_id'],
            'time'        => date('H:i', strtotime($m['created_at'])),
            'is_me'       => (int)$m['sender_id'] === (int)$user['id'],
        ], $newMessages);

        $this->json([
            'success' => true,
            'data'    => ['messages' => $formatted],
            'message' => '',
        ]);
    }

    // ─── API: Đếm tin nhắn chưa đọc (badge trên navbar) ────────────────────

    public function apiUnreadCount(): void
    {
        if (!$this->isLoggedIn()) {
            $this->json([
                'success' => true,
                'data'    => ['count' => 0],
                'message' => ''
            ]);
        }
        $user  = $this->currentUser();
        $count = $this->convModel->countTotalUnread($user['id']);
        $this->json([
            'success' => true,
            'data'    => ['count' => $count],
            'message' => ''
        ]);
    }
}
