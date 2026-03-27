<?php

namespace App\Models;

use Core\Model;

/**
 * Rating Model — Hệ thống đánh giá uy tín người bán (1–5 sao)
 */
class Rating extends Model
{
    /**
     * Tạo đánh giá mới (chỉ được tạo 1 lần / giao dịch nhờ UNIQUE KEY)
     */
    public function create(int $txId, int $raterId, int $rateeId, int $productId, int $stars, string $comment = ''): bool
    {
        try {
            $this->insert(
                'INSERT INTO ratings (transaction_id, rater_id, ratee_id, product_id, stars, comment) VALUES (?, ?, ?, ?, ?, ?)',
                [$txId, $raterId, $rateeId, $productId, $stars, $comment ?: null]
            );
            return true;
        } catch (\PDOException $e) {
            // Unique constraint violation => đã đánh giá rồi
            return false;
        }
    }

    /**
     * Kiểm tra giao dịch đã được đánh giá chưa
     */
    public function existsForTransaction(int $txId): bool
    {
        return (bool)$this->queryOne(
            'SELECT id FROM ratings WHERE transaction_id = ? LIMIT 1',
            [$txId]
        );
    }

    /**
     * Lấy tất cả đánh giá của 1 người bán (ratee_id)
     */
    public function getByRatee(int $userId): array
    {
        return $this->query(
            'SELECT r.*, u.name AS rater_name, p.title AS product_title
             FROM ratings r
             JOIN users u    ON u.id = r.rater_id
             JOIN products p ON p.id = r.product_id
             WHERE r.ratee_id = ?
             ORDER BY r.created_at DESC',
            [$userId]
        );
    }

    /**
     * Tính điểm trung bình và tổng số đánh giá của 1 người bán
     * @return array{avg: float, count: int}
     */
    public function getStats(int $userId): array
    {
        $row = $this->queryOne(
            'SELECT ROUND(AVG(stars), 1) AS avg, COUNT(*) AS count
             FROM ratings WHERE ratee_id = ?',
            [$userId]
        );
        return [
            'avg'   => (float)($row['avg']   ?? 0),
            'count' => (int)  ($row['count'] ?? 0),
        ];
    }
}
