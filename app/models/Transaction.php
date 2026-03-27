<?php

namespace App\Models;

use Core\Model;

/**
 * Transaction Model - Lịch sử giao dịch
 */
class Transaction extends Model
{
    /**
     * Lấy giao dịch của người mua hoặc người bán
     */
    public function getByUser(int $userId): array
    {
        return $this->query(
            'SELECT t.*, p.title AS product_title, p.image AS product_image,
                    buyer.name AS buyer_name, seller.name AS seller_name
             FROM transactions t
             JOIN products p       ON p.id = t.product_id
             JOIN users buyer      ON buyer.id = t.buyer_id
             JOIN users seller     ON seller.id = t.seller_id
             WHERE t.buyer_id = ? OR t.seller_id = ?
             ORDER BY t.created_at DESC',
        [$userId, $userId]
        );
    }

    /**
     * Lấy giao dịch theo ID
     */
    public function findById(int $id): ?array
    {
        return $this->queryOne('SELECT * FROM transactions WHERE id = ? LIMIT 1', [$id]);
    }

    /**
     * Tạo giao dịch
     */
    public function createTransaction(int $buyerId, int $sellerId, int $productId, float $amount, string $paymentMethod, string $shippingAddress): int
    {
        return $this->insert(
            'INSERT INTO transactions 
             (buyer_id, seller_id, product_id, amount, payment_method, shipping_address, payment_status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, "pending", NOW())',
            [$buyerId, $sellerId, $productId, $amount, $paymentMethod, $shippingAddress]
        );
    }

    /**
     * Cập nhật trạng thái thanh toán
     */
    public function updatePaymentStatus(int $id, string $status): void
    {
        $this->execute('UPDATE transactions SET payment_status = ? WHERE id = ?', [$status, $id]);
    }

    /**
     * Cập nhật trạng thái giao hàng (Order Tracking)
     */
    public function updateOrderStatus(int $id, string $status): void
    {
        $this->execute('UPDATE transactions SET order_status = ? WHERE id = ?', [$status, $id]);
    }

    /**
     * Lấy tất cả giao dịch (Admin)
     */
    public function getAll(string $fromDate = '', string $toDate = '', int $limit = 1000): array
    {
        $sql = 'SELECT t.*, p.title AS product_title, buyer.name AS buyer_name,
                          seller.name AS seller_name
                   FROM transactions t
                   JOIN products p   ON p.id = t.product_id
                   JOIN users buyer  ON buyer.id = t.buyer_id
                   JOIN users seller ON seller.id = t.seller_id
                   WHERE 1';
        $params = [];

        if ($fromDate) {
            $sql .= ' AND DATE(t.created_at) >= ?';
            $params[] = $fromDate;
        }
        if ($toDate) {
            $sql .= ' AND DATE(t.created_at) <= ?';
            $params[] = $toDate;
        }

        $sql .= ' ORDER BY t.created_at DESC LIMIT ?';
        $params[] = $limit;
        return $this->query($sql, $params);
    }

    /**
     * Đếm giao dịch hôm nay (cho admin dashboard)
     */
    public function countToday(): int
    {
        return $this->count(
            'SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = CURDATE()'
        );
    }
}
