<?php

namespace App\Models;

use Core\Model;

/**
 * AuditLog Model — Ghi lại hành động của Admin
 */
class AuditLog extends Model
{
    /**
     * Ghi một hành động vào audit log
     */
    public function log(int $adminId, string $action, string $targetType, int $targetId, ?string $note = null): void
    {
        $this->execute(
            'INSERT INTO audit_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [$adminId, $action, $targetType, $targetId, $note]
        );
    }

    /**
     * Lấy toàn bộ audit log (có join tên admin)
     */
    public function getAll(int $limit = 200): array
    {
        return $this->query(
            'SELECT al.*, u.name AS admin_name, u.email AS admin_email
             FROM audit_logs al
             JOIN users u ON u.id = al.admin_id
             ORDER BY al.created_at DESC
             LIMIT ?',
            [$limit]
        );
    }
}
