<?php

namespace App\Services;

use App\Models\Notification;
use Core\Mailer;

/**
 * NotificationService — Dịch vụ tập trung gửi thông báo
 * Gửi cả In-App notification + Email cho mọi sự kiện quan trọng
 */
class NotificationService
{
    private static function notifModel(): Notification
    {
        return new Notification();
    }

    private static function baseUrl(): string
    {
        return rtrim($_ENV['APP_URL'] ?? 'http://localhost:8080/sinhvien-market', '/');
    }

    // ─── Sự kiện: Admin duyệt sản phẩm ──────────────────────────────────────

    public static function notifyProductApproved(int $userId, string $userEmail, string $userName, int $productId, string $productTitle): void
    {
        $link = self::baseUrl() . '/products/show?id=' . $productId;
        self::notifModel()->create(
            $userId,
            'product_approved',
            '✅ Bài đăng đã được duyệt',
            "Sản phẩm \"$productTitle\" đã được Admin phê duyệt và hiện đang được hiển thị công khai.",
            $link
        );

        // Gửi email
        Mailer::send(
            $userEmail,
            $userName,
            '✅ Bài đăng của bạn đã được duyệt — SinhVienMarket',
            "Xin chào $userName,<br><br>
            Bài đăng sản phẩm <strong>\"$productTitle\"</strong> của bạn đã được Admin phê duyệt thành công!<br><br>
            Sản phẩm của bạn hiện đang được hiển thị trên trang chủ.<br><br>
            <a href='$link'>➡️ Xem sản phẩm của bạn</a><br><br>
            Trân trọng,<br>Đội ngũ SinhVienMarket"
        );
    }

    // ─── Sự kiện: Admin từ chối sản phẩm ────────────────────────────────────

    public static function notifyProductRejected(int $userId, string $userEmail, string $userName, int $productId, string $productTitle, string $reason = ''): void
    {
        $link = self::baseUrl() . '/products/my';
        self::notifModel()->create(
            $userId,
            'product_rejected',
            '❌ Bài đăng bị từ chối',
            "Sản phẩm \"$productTitle\" đã bị Admin từ chối." . ($reason ? " Lý do: $reason" : ''),
            $link
        );

        $reasonHtml = $reason ? "<p><strong>Lý do:</strong> $reason</p>" : '';
        Mailer::send(
            $userEmail,
            $userName,
            '❌ Bài đăng của bạn bị từ chối — SinhVienMarket',
            "Xin chào $userName,<br><br>
            Rất tiếc, bài đăng sản phẩm <strong>\"$productTitle\"</strong> của bạn đã bị Admin từ chối.<br>
            $reasonHtml<br>
            Vui lòng chỉnh sửa và đăng lại. <a href='$link'>➡️ Xem sản phẩm của tôi</a><br><br>
            Trân trọng,<br>Đội ngũ SinhVienMarket"
        );
    }

    // ─── Sự kiện: Sản phẩm được chốt đơn (người bán nhận thông báo) ──────────

    public static function notifyItemSold(int $sellerId, string $sellerEmail, string $sellerName, int $productId, string $productTitle, string $buyerName, int $finalPrice): void
    {
        $link = self::baseUrl() . '/transactions/history';
        self::notifModel()->create(
            $sellerId,
            'item_sold',
            '🎉 Sản phẩm của bạn đã được mua!',
            "\"$productTitle\" vừa được $buyerName mua với giá " . number_format($finalPrice, 0, ',', '.') . 'đ.',
            $link
        );

        Mailer::send(
            $sellerEmail,
            $sellerName,
            '🎉 Sản phẩm đã được mua — SinhVienMarket',
            "Xin chào $sellerName,<br><br>
            Tin vui! Sản phẩm <strong>\"$productTitle\"</strong> của bạn vừa được <strong>$buyerName</strong> mua với giá 
            <strong>" . number_format($finalPrice, 0, ',', '.') . "đ</strong>.<br><br>
            <a href='$link'>➡️ Xem lịch sử giao dịch</a><br><br>
            Trân trọng,<br>Đội ngũ SinhVienMarket"
        );
    }

    // ─── Sự kiện: Giá sản phẩm yêu thích giảm mạnh ──────────────────────────

    public static function notifyWishlistDrop(int $userId, string $userEmail, string $userName, int $productId, string $productTitle, int $oldPrice, int $newPrice): void
    {
        $link = self::baseUrl() . '/products/show?id=' . $productId;
        $dropPct = $oldPrice > 0 ? round((1 - $newPrice / $oldPrice) * 100) : 0;

        self::notifModel()->create(
            $userId,
            'wishlist_drop',
            "📉 Sản phẩm yêu thích giảm giá {$dropPct}%!",
            "\"$productTitle\" đã giảm từ " . number_format($oldPrice, 0, ',', '.') . 'đ xuống ' . number_format($newPrice, 0, ',', '.') . 'đ.',
            $link
        );

        Mailer::send(
            $userEmail,
            $userName,
            "📉 Sản phẩm yêu thích giảm giá {$dropPct}% — SinhVienMarket",
            "Xin chào $userName,<br><br>
            Một sản phẩm trong danh sách yêu thích của bạn vừa giảm giá!<br><br>
            <strong>\"$productTitle\"</strong><br>
            Giá cũ: <del>" . number_format($oldPrice, 0, ',', '.') . "đ</del><br>
            Giá mới: <strong style='color:red'>" . number_format($newPrice, 0, ',', '.') . "đ</strong> (giảm {$dropPct}%)<br><br>
            <a href='$link'>➡️ Mua ngay trước khi hết!</a><br><br>
            Trân trọng,<br>Đội ngũ SinhVienMarket"
        );
    }

    // ─── Sự kiện: Có tin nhắn mới ────────────────────────────────────────────

    public static function notifyNewMessage(int $receiverId, string $senderName, int $convId, string $productTitle): void
    {
        $link = self::baseUrl() . '/chat/show?id=' . $convId;
        self::notifModel()->create(
            $receiverId,
            'new_message',
            "💬 Tin nhắn mới từ $senderName",
            "về sản phẩm \"$productTitle\"",
            $link
        );
        // Không gửi email cho tin nhắn (tránh spam), chỉ in-app notification
    }
}
