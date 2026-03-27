<?php

namespace App\Models;

use Core\Model;

/**
 * Report Model - Quản lý tố cáo vi phạm
 */
class Report extends Model
{
    /**
     * Lấy tất cả báo cáo (Dành cho Admin)
     */
    public function getAll(string $status = ''): array
    {
        $sql = 'SELECT r.*, 
                       reporter.name AS reporter_name, 
                       target.name AS target_name,
                       p.title AS product_title
                FROM reports r
                JOIN users reporter ON r.reporter_id = reporter.id
                LEFT JOIN users target ON r.target_user_id = target.id
                LEFT JOIN products p ON r.product_id = p.id
                WHERE 1=1';

        $params = [];
        if ($status !== '') {
            $sql .= ' AND r.status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY r.created_at DESC';

        return $this->query($sql, $params);
    }

    /**
     * Đếm số báo cáo mới (chưa xử lý)
     */
    public function countPending(): int
    {
        return $this->count('SELECT COUNT(*) FROM reports WHERE status = "pending"');
    }

    /**
     * Tìm báo cáo theo ID
     */
    public function findById(int $id): ?array
    {
        return $this->queryOne('SELECT * FROM reports WHERE id = ?', [$id]);
    }

    /**
     * Tạo báo cáo mới
     */
    public function createReport(
        int $reporterId, 
        int $targetUserId, 
        int $productId, 
        string $reason, 
        string $description
    ): int {
        return $this->insert(
            'INSERT INTO reports (reporter_id, target_user_id, product_id, reason, description, status) 
             VALUES (?, ?, ?, ?, ?, "pending")',
            [
                $reporterId, 
                $targetUserId > 0 ? $targetUserId : null, 
                $productId > 0 ? $productId : null, 
                $reason, 
                $description
            ]
        );
    }

    /**
     * Cập nhật trạng thái báo cáo (Dành cho Admin)
     */
    public function updateStatus(int $id, string $status, ?string $adminNote = null): void
    {
        if ($adminNote !== null) {
            $this->execute(
                'UPDATE reports SET status = ?, admin_note = ? WHERE id = ?', 
                [$status, $adminNote, $id]
            );
        } else {
            $this->execute(
                'UPDATE reports SET status = ? WHERE id = ?', 
                [$status, $id]
            );
        }
    }
}
