<?php

namespace App\Models;

use Core\Model;

/**
 * Conversation Model — Quản lý cuộc hội thoại giữa người mua và người bán
 */
class Conversation extends Model
{
    /**
     * Tìm hoặc tạo mới cuộc hội thoại cho bộ (product, buyer, seller)
     */
    public function findOrCreate(int $productId, int $buyerId, int $sellerId): int
    {
        $existing = $this->queryOne(
            'SELECT id FROM conversations WHERE product_id = ? AND buyer_id = ? AND seller_id = ? LIMIT 1',
            [$productId, $buyerId, $sellerId]
        );
        if ($existing) {
            return $existing['id'];
        }
        return $this->insert(
            'INSERT INTO conversations (product_id, buyer_id, seller_id) VALUES (?, ?, ?)',
            [$productId, $buyerId, $sellerId]
        );
    }

    /**
     * Lấy tất cả cuộc hội thoại của 1 user (mua hoặc bán) kèm tin nhắn cuối cùng
     */
    public function getByUser(int $userId): array
    {
        return $this->query(
            'SELECT c.*,
                    p.title AS product_title, p.image AS product_image,
                    buyer.name  AS buyer_name,
                    seller.name AS seller_name,
                    (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
                    (SELECT created_at FROM messages m2 WHERE m2.conversation_id = c.id ORDER BY m2.id DESC LIMIT 1) AS last_message_at,
                    (SELECT COUNT(*) FROM messages m3 WHERE m3.conversation_id = c.id AND m3.sender_id != ? AND m3.is_read = 0) AS unread_count
             FROM conversations c
             JOIN products p     ON p.id = c.product_id
             JOIN users buyer    ON buyer.id  = c.buyer_id
             JOIN users seller   ON seller.id = c.seller_id
             WHERE c.buyer_id = ? OR c.seller_id = ?
             ORDER BY last_message_at DESC',
            [$userId, $userId, $userId]
        );
    }

    /**
     * Lấy 1 cuộc hội thoại theo ID (có kiểm tra quyền truy cập)
     */
    public function findByIdForUser(int $convId, int $userId): ?array
    {
        return $this->queryOne(
            'SELECT c.*,
                    p.title AS product_title, p.image AS product_image, p.user_id AS seller_id_check,
                    buyer.name  AS buyer_name,
                    seller.name AS seller_name
             FROM conversations c
             JOIN products p     ON p.id = c.product_id
             JOIN users buyer    ON buyer.id  = c.buyer_id
             JOIN users seller   ON seller.id = c.seller_id
             WHERE c.id = ? AND (c.buyer_id = ? OR c.seller_id = ?)',
            [$convId, $userId, $userId]
        );
    }

    /**
     * Đếm tổng số tin nhắn chưa đọc của một user (dùng cho badge trên navbar)
     */
    public function countTotalUnread(int $userId): int
    {
        return $this->count(
            'SELECT COUNT(*) FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
             WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id != ? AND m.is_read = 0',
            [$userId, $userId, $userId]
        );
    }
}
