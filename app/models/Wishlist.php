<?php

namespace App\Models;

use Core\Model;

/**
 * Wishlist Model — Danh sách sản phẩm yêu thích
 */
class Wishlist extends Model
{
    /**
     * Thêm sản phẩm vào yêu thích (IGNORE nếu đã có)
     */
    public function add(int $userId, int $productId, ?int $price): void
    {
        $this->execute(
            'INSERT IGNORE INTO wishlists (user_id, product_id, price_at_save) VALUES (?, ?, ?)',
            [$userId, $productId, $price]
        );
    }

    /**
     * Xóa sản phẩm khỏi yêu thích
     */
    public function remove(int $userId, int $productId): void
    {
        $this->execute(
            'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
            [$userId, $productId]
        );
    }

    /**
     * Kiểm tra xem user đã thêm sản phẩm vào yêu thích chưa
     */
    public function exists(int $userId, int $productId): bool
    {
        return (bool)$this->queryOne(
            'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? LIMIT 1',
            [$userId, $productId]
        );
    }

    /**
     * Lấy danh sách yêu thích của user kèm thông tin sản phẩm
     */
    public function getByUser(int $userId): array
    {
        return $this->query(
            'SELECT w.*, p.title, p.image, p.type, p.status, p.price AS current_price,
                    c.name AS category_name, u.name AS seller_name
             FROM wishlists w
             JOIN products p   ON p.id = w.product_id
             JOIN categories c ON c.id = p.category_id
             JOIN users u      ON u.id = p.user_id
             WHERE w.user_id = ?
             ORDER BY w.created_at DESC',
            [$userId]
        );
    }

    /**
     * Lấy tất cả wishlist items của 1 sản phẩm (để gửi notification khi giá giảm)
     */
    public function getByProduct(int $productId): array
    {
        return $this->query(
            'SELECT w.*, u.email AS user_email, u.name AS user_name
             FROM wishlists w
             JOIN users u ON u.id = w.user_id
             WHERE w.product_id = ?',
            [$productId]
        );
    }

    /**
     * Cập nhật giá lưu trong wishlist (sau khi gửi thông báo giảm giá)
     */
    public function updateSavedPrice(int $userId, int $productId, int $newPrice): void
    {
        $this->execute(
            'UPDATE wishlists SET price_at_save = ? WHERE user_id = ? AND product_id = ?',
            [$newPrice, $userId, $productId]
        );
    }
}
