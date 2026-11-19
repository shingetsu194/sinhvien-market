<?php

namespace App\Models;

use Config\Database;

/**
 * LoginSession — Lưu lịch sử đăng nhập và phát hiện thiết bị lạ
 */
class LoginSession
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Ghi nhận phiên đăng nhập mới.
     * Trả về true nếu là thiết bị/IP lần đầu xuất hiện với user này.
     */
    public function record(int $userId, string $ip, string $userAgent): bool
    {
        $device = $this->parseDevice($userAgent);
        $isNew  = $this->isNewDevice($userId, $ip);

        $stmt = $this->db->prepare("
            INSERT INTO login_sessions (user_id, ip_address, user_agent, device_info, is_new_device)
            VALUES (:uid, :ip, :ua, :dev, :new)
        ");
        $stmt->execute([
            ':uid' => $userId,
            ':ip'  => $ip,
            ':ua'  => mb_substr($userAgent, 0, 500),
            ':dev' => $device,
            ':new' => $isNew ? 1 : 0,
        ]);

        return $isNew;
    }

    /**
     * Lấy lịch sử đăng nhập gần nhất của user (mặc định 20 bản ghi)
     */
    public function getByUser(int $userId, int $limit = 20): array
    {
        $stmt = $this->db->prepare("
            SELECT id, ip_address, device_info, is_new_device, logged_at
            FROM login_sessions
            WHERE user_id = :uid
            ORDER BY logged_at DESC
            LIMIT :lim
        ");
        $stmt->bindValue(':uid', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Kiểm tra xem IP này đã từng đăng nhập với user này chưa
     */
    private function isNewDevice(int $userId, string $ip): bool
    {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) FROM login_sessions
            WHERE user_id = :uid AND ip_address = :ip
        ");
        $stmt->execute([':uid' => $userId, ':ip' => $ip]);
        return (int)$stmt->fetchColumn() === 0;
    }

    /**
     * Parse User-Agent thành chuỗi mô tả ngắn gọn
     */
    private function parseDevice(string $ua): string
    {
        $os = 'Unknown OS';
        if (preg_match('/Windows NT ([\d.]+)/', $ua, $m)) {
            $versions = ['10.0'=>'Windows 10/11','6.3'=>'Windows 8.1','6.2'=>'Windows 8','6.1'=>'Windows 7'];
            $os = $versions[$m[1]] ?? 'Windows';
        } elseif (str_contains($ua, 'Mac OS X')) {
            $os = 'macOS';
        } elseif (str_contains($ua, 'Android')) {
            $os = 'Android';
        } elseif (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) {
            $os = 'iOS';
        } elseif (str_contains($ua, 'Linux')) {
            $os = 'Linux';
        }

        $browser = 'Unknown Browser';
        if (str_contains($ua, 'Edg/'))    $browser = 'Microsoft Edge';
        elseif (str_contains($ua, 'Chrome'))  $browser = 'Chrome';
        elseif (str_contains($ua, 'Firefox')) $browser = 'Firefox';
        elseif (str_contains($ua, 'Safari'))  $browser = 'Safari';
        elseif (str_contains($ua, 'OPR'))     $browser = 'Opera';

        return "$browser trên $os";
    }
}
