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
            return;
        }

        $user      = $this->currentUser();
        $input     = $this->requestData();
        $productId = (int)($input['product_id'] ?? 0);

        if ($productId <= 0) {
            Flash::set('danger', 'Sản phẩm không hợp lệ.');
            $this->redirect('products');
            return;
        }

        $productModel = new Product();
        $product      = $productModel->findById($productId);

        if (!$product) {
            Flash::set('danger', 'Sản phẩm không tồn tại.');
            $this->redirect('products');
            return;
        }

        // Không thể chat với chính mình
        if ((int)$product['user_id'] === (int)$user['id']) {
            Flash::set('warning', 'Bạn không thể liên hệ với chính mình.');
            $this->redirect('products/show?id=' . $productId);
            return;
        }

        $sellerId = (int)$product['user_id'];
        $convId   = $this->convModel->findOrCreate($productId, $user['id'], $sellerId);

        $offerPrice = (int)($input['offer_price'] ?? 0);
        if ($offerPrice > 0) {
            $this->msgModel->sendOffer($convId, $user['id'], $offerPrice);
        }

        $this->redirect('chat/show?id=' . $convId);
    }

    // ─── API: Gửi tin nhắn (AJAX POST) ──────────────────────────────────────

    public function send(): void
    {
        Middleware::requireAuth();

        if (!$this->verifyCsrf()) {
            $this->json(['success' => false, 'message' => 'CSRF không hợp lệ.'], 403);
            return;
        }

        $user   = $this->currentUser();
        $input  = $this->requestData();
        $convId = (int)($input['conversation_id'] ?? 0);
        $body   = trim((string)($input['body'] ?? ''));

        if ($convId <= 0 || $body === '') {
            $this->json(['success' => false, 'message' => 'Dữ liệu không hợp lệ.'], 400);
            return;
        }

        // Kiểm tra quyền truy cập cuộc hội thoại
        $conv = $this->convModel->findByIdForUser($convId, $user['id']);
        if (!$conv) {
            $this->json(['success' => false, 'message' => 'Không có quyền.'], 403);
            return;
        }

        // Giới hạn độ dài tin nhắn
        if (mb_strlen($body) > 1000) {
            $this->json(['success' => false, 'message' => 'Tin nhắn tối đa 1000 ký tự.'], 400);
            return;
        }

        $msgId = $this->msgModel->send($convId, $user['id'], $body);

        // Trả response cho người gửi NGAY (không bắt chờ Pusher/AI vốn chậm trên
        // Railway); phần thông báo + Pusher + AI auto-responder chạy ở nền.
        $this->jsonThenRun([
            'success' => true,
            'data'    => [
                'message_id' => $msgId,
                'body'       => htmlspecialchars($body, ENT_QUOTES, 'UTF-8'),
                'sender'     => $user['name'],
                'time'       => date('H:i'),
            ],
            'message' => '',
        ], function () use ($conv, $user, $convId, $body, $msgId) {
            // Xác định người nhận để gửi thông báo
            $receiverId = ((int)$conv['buyer_id'] === (int)$user['id'])
                ? (int)$conv['seller_id']
                : (int)$conv['buyer_id'];

            NotificationService::notifyNewMessage($receiverId, $user['name'], $convId, $conv['product_title']);

            // Bắn Pusher cho người nhận
            $pusher = new \App\Services\PusherService();
            $pusher->trigger('chat.' . $receiverId, 'new_message', [
                'id'          => $msgId,
                'body'        => htmlspecialchars($body, ENT_QUOTES, 'UTF-8'),
                'msg_type'    => 'text',
                'sender_name' => $user['name'],
                'sender_id'   => $user['id'],
                'time'        => date('H:i'),
                'conv_id'     => $convId
            ]);

            // ─── AI Auto-Responder ─────────────────────────────────────────────
            // Người mua nhắn tin → Bot AI tự phản hồi 1 lần (theo cooldown).
            if ((int)$conv['buyer_id'] === (int)$user['id']) {
                $lastSellerTime = $this->msgModel->getLastMessageTimeBySender($convId, $conv['seller_id']);
                $lastBuyerTime  = $this->msgModel->getLastMessageTimeBySender($convId, $conv['buyer_id'], $msgId);

                $sellerCooledDown = !($lastSellerTime && (time() - strtotime($lastSellerTime)) < 12 * 3600);
                $isNewSession     = !($lastBuyerTime  && (time() - strtotime($lastBuyerTime))  < 5 * 60);

                if ($sellerCooledDown && $isNewSession) {
                    $p = (new Product())->findById($conv['product_id']);
                    if ($p) {
                        $prompt = "Bạn là AI trợ lý bán hàng tự động của SinhVienMarket. Người dùng đang hỏi hoặc chào hỏi về món đồ cũ:\n";
                        $prompt .= "- Tên sản phẩm: {$p['title']}\n";
                        $prompt .= "- Giá: {$p['price']} VNĐ\n";
                        $prompt .= "- Tình trạng bề ngoài: {$p['condition']}\n";
                        // Products have no address column: use the seller's own address, and
                        // never let the bot invent a meeting place when there is none.
                        $seller = (new \App\Models\User())->findById((int)$conv['seller_id']);
                        $sellerAddress = trim((string)($seller['dormitory_address'] ?? ''));
                        $prompt .= "- Nơi giao dịch: " . ($sellerAddress !== ''
                            ? $sellerAddress
                            : 'chưa có, hãy mời khách nhắn để thống nhất, không tự bịa địa điểm') . "\n";
                        $prompt .= "\nKhách hàng vừa nhắn tin nhắn đầu tiên: \"$body\"\n";
                        $prompt .= "\nNhiệm vụ của bạn: Đóng vai người bán hàng, hãy trả lời thật ngắn gọn (dưới 40 chữ), thân thiện năng động chuẩn sinh viên, xưng hô 'mình' và 'cậu' hoặc 'bạn'. Có thể dựa vào nội dung khách nhắn để nương theo, nếu khách chỉ chào thì bạn cũng chào lại và giới thiệu tắt về sản phẩm.";

                        // tryAsk() returns null when Gemini is unavailable: post nothing rather
                        // than an "AI is down" line that looks like it came from the seller.
                        $aiResponse = \App\Services\GoogleAiService::tryAsk($prompt, 20); // runs after the sender's response
                        if ($aiResponse !== null && $aiResponse !== '') {
                            $aiText  = "🤖 *[Hệ thống tự động]* " . $aiResponse . "\n_(Chủ shop đang vắng mặt, bạn cứ để lại lời nhắn nha)_";
                            $aiMsgId = $this->msgModel->send($convId, $conv['seller_id'], $aiText);
                            $pusher->trigger('chat.' . $user['id'], 'new_message', [
                                'id'          => $aiMsgId,
                                'body'        => htmlspecialchars($aiText, ENT_QUOTES, 'UTF-8'),
                                'msg_type'    => 'text',
                                'sender_name' => 'AI Assistant',
                                'sender_id'   => $conv['seller_id'],
                                'time'        => date('H:i'),
                                'conv_id'     => $convId
                            ]);
                        }
                    }
                }
            }
        });
    }

    public function sendOffer(): void
    {
        Middleware::requireAuth();
        if (!$this->verifyCsrf()) {
            $this->json(['success' => false, 'message' => 'CSRF không hợp lệ.'], 403);
            return;
        }
        $user   = $this->currentUser();
        $input  = $this->requestData();
        $convId = (int)($input['conversation_id'] ?? 0);
        $price  = (int)($input['offer_price'] ?? 0);

        if ($convId <= 0 || $price <= 0) {
            $this->json(['success' => false, 'message' => 'Giá trả phải lớn hơn 0.'], 400);
            return;
        }
        $conv = $this->convModel->findByIdForUser($convId, $user['id']);
        if (!$conv) {
            $this->json(['success' => false, 'message' => 'Không có quyền.'], 403);
            return;
        }

        // Chỉ người mua mới có quyền gửi Trả giá.
        if ((int)$conv['buyer_id'] !== (int)$user['id']) {
            $this->json(['success' => false, 'message' => 'Chỉ người mua mới được gửi đề nghị.'], 400);
            return; // BUG-009 fix
        }

        $msgId = $this->msgModel->sendOffer($convId, $user['id'], $price);
        
        $receiverId = (int)$conv['seller_id'];
        (new \App\Services\PusherService())->trigger('chat.' . $receiverId, 'new_message', [
            'id'          => $msgId,
            'body'        => '',
            'msg_type'    => 'offer',
            'offer_price' => $price,
            'offer_status'=> 'pending',
            'sender_name' => $user['name'],
            'sender_id'   => $user['id'],
            'time'        => date('H:i'),
            'conv_id'     => $convId
        ]);

        $this->json(['success' => true, 'message' => 'Đã gửi đề nghị thành công.']);
    }

    public function respondOffer(): void
    {
        Middleware::requireAuth();
        if (!$this->verifyCsrf()) {
            $this->json(['success' => false, 'message' => 'CSRF không hợp lệ.'], 403);
            return;
        }
        $user   = $this->currentUser();
        $input  = $this->requestData();
        $msgId  = (int)($input['message_id'] ?? 0);
        $status = $input['status'] ?? ''; // 'accepted' or 'rejected'
        $convId = (int)($input['conversation_id'] ?? 0);

        if (!in_array($status, ['accepted', 'rejected'])) {
            $this->json(['success' => false, 'message' => 'Logic lỗi.'], 400);
            return;
        }

        $conv = $this->convModel->findByIdForUser($convId, $user['id']);
        if (!$conv) {
            $this->json(['success' => false, 'message' => 'Không có quyền.'], 403);
            return;
        }
        if ((int)$conv['seller_id'] !== (int)$user['id']) {
            $this->json(['success' => false, 'message' => 'Chỉ người bán mới có quyền duyệt offer.'], 400);
            return; // BUG-010 fix
        }

        $this->msgModel->updateOfferStatus($msgId, $status);
        
        $replyText = ($status === 'accepted') ? "✅ Mình đồng ý với mức giá đề nghị của bạn. Giao dịch nhé!" : "❌ Mình chưa thể bán với mức giá này nha. Bạn có thể trả thêm chút không?";
        $newMsgId = $this->msgModel->send($convId, $user['id'], $replyText);

        $receiverId = (int)$conv['buyer_id'];
        (new \App\Services\PusherService())->trigger('chat.' . $receiverId, 'new_message', [
            'id'          => $newMsgId,
            'body'        => htmlspecialchars($replyText, ENT_QUOTES, 'UTF-8'),
            'msg_type'    => 'text',
            'sender_name' => $user['name'],
            'sender_id'   => $user['id'],
            'time'        => date('H:i'),
            'conv_id'     => $convId,
            'update_offer_id' => $msgId,
            'update_offer_status' => $status
        ]);

        $this->json(['success' => true]);
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
            return; // BUG-008 fix
        }

        // Kiểm tra quyền
        $conv = $this->convModel->findByIdForUser($convId, $user['id']);
        if (!$conv) {
            $this->json(['messages' => []], 403);
            return; // BUG-008 fix
        }

        // Đánh dấu đã đọc
        $this->msgModel->markAsRead($convId, $user['id']);

        $newMessages = $this->msgModel->getAfter($convId, $afterId);

        $formatted = array_map(fn($m) => [
            'id'          => $m['id'],
            'body'        => htmlspecialchars($m['body'], ENT_QUOTES, 'UTF-8'),
            'msg_type'    => $m['msg_type'] ?? 'text',
            'type'        => $m['msg_type'] ?? 'text',
            'offer_price' => $m['offer_price'] ?? null,
            'offer_status'=> $m['offer_status'] ?? null,
            'sender_name' => $m['sender_name'],
            'sender'      => $m['sender_name'],
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
            return;
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
