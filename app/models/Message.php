<?php

namespace App\Models;

use Core\Model;

/**
 * Message Model — Quản lý tin nhắn trong các cuộc hội thoại
 */
class Message extends Model
{
    /**
     * Lấy tất cả tin nhắn của một cuộc hội thoại (sắp xếp từ cũ đến mới)
     */
    public function getByConversation(int $convId): array
    {
        return $this->query(
            'SELECT m.*, u.name AS sender_name
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ?
             ORDER BY m.created_at ASC',
            [$convId]
        );
    }

    /**
     * Lấy tin nhắn mới hơn một ID nhất định (dùng cho polling)
     */
    public function getAfter(int $convId, int $afterId): array
    {
        return $this->query(
            'SELECT m.*, u.name AS sender_name
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ? AND m.id > ?
             ORDER BY m.created_at ASC',
            [$convId, $afterId]
        );
    }

    /**
     * Gửi tin nhắn mới
     */
    public function send(int $convId, int $senderId, string $body): int
    {
        return $this->insert(
            'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
            [$convId, $senderId, trim($body)]
        );
    }

    /**
     * Đánh dấu tất cả tin nhắn của đối phương trong cuộc hội thoại là đã đọc
     */
    public function markAsRead(int $convId, int $currentUserId): void
    {
        $this->execute(
            'UPDATE messages SET is_read = 1
             WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
            [$convId, $currentUserId]
        );
    }
}
