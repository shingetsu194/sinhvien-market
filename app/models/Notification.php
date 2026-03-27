<?php

namespace App\Models;

use Core\Model;

/**
 * Notification Model — Quản lý thông báo in-app
 */
class Notification extends Model
{
    /**
     * Tạo một thông báo mới cho user
     */
    public function create(int $userId, string $type, string $title, string $body = '', string $link = ''): int
    {
        return $this->insert(
            'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
            [$userId, $type, $title, $body ?: null, $link ?: null]
        );
    }

    /**
     * Lấy danh sách thông báo của user (mới nhất trước, giới hạn 50)
     */
    public function getByUser(int $userId, int $limit = 50): array
    {
        return $this->query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [$userId, $limit]
        );
    }

    /**
     * Đếm số thông báo chưa đọc (dùng cho badge trên navbar)
     */
    public function countUnread(int $userId): int
    {
        return $this->count(
            'SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0',
            [$userId]
        );
    }

    /**
     * Đánh dấu một thông báo là đã đọc
     */
    public function markRead(int $notifId, int $userId): void
    {
        $this->execute(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [$notifId, $userId]
        );
    }

    /**
     * Đánh dấu tất cả thông báo của user là đã đọc
     */
    public function markAllRead(int $userId): void
    {
        $this->execute(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [$userId]
        );
    }
}
