<?php

namespace App\Models;

use Core\Model;

/**
 * User Model - Quản lý tài khoản người dùng
 * Sẽ được triển khai đầy đủ trong Phase 3
 */
class User extends Model
{
    /**
     * Tìm user theo email
     * @return array<string, mixed>|null
     */
    public function findByEmail(string $email): ?array
    {
        return $this->queryOne(
            'SELECT * FROM users WHERE email = ? LIMIT 1',
        [$email]
        );
    }

    /**
     * Tìm user theo ID
     */
    public function findById(int $id): ?array
    {
        return $this->queryOne('SELECT * FROM users WHERE id = ? LIMIT 1', [$id]);
    }

    /**
     * Tạo tài khoản mới
     */
    public function create(string $name, string $email, string $password, string $phone = '', string $question = '', string $answer = '', string $otp = '', string $otpExp = ''): int
    {
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $ansHash = password_hash(trim(mb_strtolower($answer)), PASSWORD_BCRYPT, ['cost' => 12]); // Hash answer for safety

        return $this->insert(
            'INSERT INTO users (name, email, password, phone, security_question, security_answer, otp_code, otp_expires_at, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
            [$name, $email, $hash, $phone, $question, $ansHash, $otp, $otpExp]
        );
    }

    /**
     * Xác nhận OTP
     */
    public function verifyOtp(int $userId): void
    {
        $this->execute('UPDATE users SET is_verified = 1, last_verified_at = NOW(), otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [$userId]);
    }

    /**
     * Tạm thời hủy xác minh (để yêu cầu OTP mới)
     */
    public function unverify(int $userId): void
    {
        $this->execute('UPDATE users SET is_verified = 0 WHERE id = ?', [$userId]);
    }

    /**
     * Cập nhật OTP mới
     */
    public function updateOtp(int $userId, string $otp, string $otpExp): void
    {
        $this->execute('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?', [$otp, $otpExp, $userId]);
    }

    /**
     * Đổi mật khẩu
     */
    public function updatePassword(int $userId, string $newPassword): void
    {
        $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        $this->execute('UPDATE users SET password = ?, otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [$hash, $userId]);
    }

    /**
     * Cập nhật thông tin hồ sơ cá nhân
     */
    public function updateProfile(int $userId, array $data): void
    {
        $this->pdo()->beginTransaction();
        try {
            $this->execute(
                'UPDATE users SET
                    name              = ?,
                    phone             = ?,
                    university        = ?,
                    student_id        = ?,
                    dormitory_address = ?,
                    social_contact    = ?,
                    bio               = ?,
                    available_time    = ?
                 WHERE id = ?',
                [
                    $data['name'],
                    $data['phone']             ?? null,
                    $data['university']        ?? null,
                    $data['student_id']        ?? null,
                    $data['dormitory_address'] ?? null,
                    $data['social_contact']    ?? null,
                    $data['bio']               ?? null,
                    $data['available_time']    ?? null,
                    $userId,
                ]
            );
            $this->execute(
                "INSERT INTO student_profiles (user_id, student_number)
                 SELECT id, NULLIF(TRIM(student_id), '')
                 FROM users
                 WHERE id = ? AND role = 'student'
                 ON DUPLICATE KEY UPDATE student_number = VALUES(student_number)",
                [$userId]
            );
            $this->pdo()->commit();
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Cập nhật đường dẫn ảnh đại diện
     */
    public function changeAvatar(int $userId, string $path): void
    {
        $this->execute('UPDATE users SET avatar = ? WHERE id = ?', [$path, $userId]);
    }

    /** Lưu avatar vào DB (user_avatars) — bền qua redeploy Railway */
    public function saveAvatarImage(int $userId, string $data, string $mime): void
    {
        $this->execute(
            'INSERT INTO user_avatars (user_id, data, mime) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data), mime = VALUES(mime)',
            [$userId, $data, $mime]
        );
    }

    /** Lấy bytes avatar + mime của user */
    public function getAvatarBlob(int $userId): ?array
    {
        return $this->queryOne('SELECT data, mime FROM user_avatars WHERE user_id = ?', [$userId]);
    }

    /** Gán token phiên hiện tại (dùng cho cơ chế 1 tài khoản 1 phiên) */
    public function setSessionToken(int $userId, string $token): void
    {
        $this->execute('UPDATE users SET session_token = ? WHERE id = ?', [$token, $userId]);
    }

    /** Lấy token phiên đang hợp lệ của user */
    public function getSessionToken(int $userId): ?string
    {
        $row = $this->queryOne('SELECT session_token FROM users WHERE id = ?', [$userId]);
        return $row['session_token'] ?? null;
    }

    /** Lần vi phạm gần nhất của user (cho popup cảnh báo vi phạm) */
    public function getLatestViolation(int $userId): ?array
    {
        return $this->queryOne(
            'SELECT id, reason, strike_number, created_at FROM violation_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [$userId]
        );
    }

    /** Đặt/đổi câu hỏi bảo mật (hash câu trả lời như lúc đăng ký) — cho user Google chưa có */
    public function setSecurityQuestion(int $userId, string $question, string $answer): void
    {
        $ansHash = password_hash(trim(mb_strtolower($answer)), PASSWORD_BCRYPT, ['cost' => 12]);
        $this->execute(
            'UPDATE users SET security_question = ?, security_answer = ? WHERE id = ?',
            [$question, $ansHash, $userId]
        );
    }

    /**
     * Lấy tất cả user (cho Admin)
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        return $this->query('SELECT id, name, email, phone, role, is_locked, lock_reason, locked_at, locked_until, created_at FROM users ORDER BY created_at DESC');
    }

    /**
     * Lấy danh sách user để xuất dữ liệu, có hỗ trợ lọc theo ngày
     */
    public function getAllForExport(?string $fromDate = null, ?string $toDate = null): array
    {
        $sql = 'SELECT id, name, email, phone, role, is_locked, lock_reason, locked_at, locked_until, created_at, is_verified, strike_count FROM users WHERE 1=1';
        $params = [];
        
        if ($fromDate) {
            $sql .= ' AND DATE(created_at) >= ?';
            $params[] = $fromDate;
        }
        if ($toDate) {
            $sql .= ' AND DATE(created_at) <= ?';
            $params[] = $toDate;
        }
        $sql .= ' ORDER BY created_at DESC';
        
        return $this->query($sql, $params);
    }

    /**
     * Toggle trạng thái khóa tài khoản
     * @param int         $newLock    1 = khóa, 0 = mở khóa
     * @param string|null $reason     Lý do khóa (chỉ cần khi khóa)
     * @param string|null $lockedUntil DATETIME khóa đến khi nào (NULL = vĩnh viễn)
     */
    public function toggleLock(int $userId, int $newLock, string $reason = '', ?string $lockedUntil = null): void
    {
        if ($newLock === 1) {
            $this->execute(
                'UPDATE users SET is_locked = 1, lock_reason = ?, locked_at = NOW(), locked_until = ? WHERE id = ?',
                [$reason, $lockedUntil, $userId]
            );
        } else {
            // Mở khóa: xóa hết thông tin khóa
            $this->execute(
                'UPDATE users SET is_locked = 0, lock_reason = NULL, locked_at = NULL, locked_until = NULL WHERE id = ?',
                [$userId]
            );
        }
    }

    /**
     * Lấy đầy đủ thông tin user (cho Admin xem chi tiết)
     */
    public function findByIdFull(int $id): ?array
    {
        return $this->queryOne(
            'SELECT id, name, email, phone, role,
                    is_locked, lock_reason, locked_at, locked_until,
                    is_verified, last_verified_at, security_question,
                    created_at
             FROM users WHERE id = ? LIMIT 1',
            [$id]
        );
    }

    /**
     * Đếm tổng số user
     */
    public function countAll(): int
    {
        return $this->count('SELECT COUNT(*) FROM users WHERE role = "student"');
    }

    // ─── Google OAuth Methods ─────────────────────────────────────────────────

    /**
     * Tìm user theo Google ID
     */
    public function findByGoogleId(string $googleId): ?array
    {
        return $this->queryOne(
            'SELECT * FROM users WHERE google_id = ? LIMIT 1',
            [$googleId]
        );
    }

    /**
     * Tạo tài khoản mới từ Google (không có password, is_verified = 1)
     */
    public function createFromGoogle(string $name, string $email, string $googleId, string $avatarUrl): int
    {
        return $this->insert(
            'INSERT INTO users (name, email, password, google_id, avatar_url, role, is_verified, created_at)
             VALUES (?, ?, ?, ?, ?, "student", 1, NOW())',
            [$name, $email, '', $googleId, $avatarUrl]
        );
    }

    /**
     * Gắn Google ID vào tài khoản đã có
     */
    public function linkGoogle(int $userId, string $googleId, string $avatarUrl): void
    {
        $this->execute(
            'UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?',
            [$googleId, $avatarUrl, $userId]
        );
    }

    // ─── Feature 1: Huy hiệu Sinh Viên Đã Xác Thực ───────────────────────────

    /** Academic suffixes: a school domain must sit UNDER one of these (e.g. hutech.edu.vn). */
    private const ACADEMIC_SUFFIXES = ['edu.vn', 'ac.vn', 'edu'];

    /**
     * Kiểm tra email có thuộc tên miền trường học không, dựa trên PHẦN ĐUÔI
     * của tên miền (sau dấu @ cuối cùng), không dò chuỗi con trong cả email.
     *
     * - Hợp lệ: tên miền con của edu.vn / ac.vn / edu (hutech.edu.vn,
     *   student.hcmus.edu.vn, mit.edu) hoặc tên miền trường được khai báo thêm
     *   trong STUDENT_EMAIL_DOMAINS (vd "udn.vn,ox.ac.uk"), kể cả tên miền con.
     * - Không hợp lệ: chính "edu.vn"/"edu" (không phải trường), và các tên miền
     *   chỉ CHỨA chuỗi học thuật như student.com hay edu.vn.attacker.io.
     *
     * Lưu ý: email trường cũng có thể là của cán bộ/giảng viên; huy hiệu chỉ
     * khẳng định người dùng sở hữu một hộp thư thuộc trường.
     */
    public static function isStudentEmail(string $email): bool
    {
        $email = strtolower(trim($email));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return false;
        }
        $domain = rtrim(substr($email, strrpos($email, '@') + 1), '.');
        if ($domain === '') {
            return false;
        }

        foreach (self::ACADEMIC_SUFFIXES as $suffix) {
            if (str_ends_with($domain, '.' . $suffix)) {
                return true;
            }
        }
        foreach (self::configuredSchoolDomains() as $schoolDomain) {
            if ($domain === $schoolDomain || str_ends_with($domain, '.' . $schoolDomain)) {
                return true;
            }
        }
        return false;
    }

    /** @return list<string> extra school domains from STUDENT_EMAIL_DOMAINS */
    private static function configuredSchoolDomains(): array
    {
        $raw = $_ENV['STUDENT_EMAIL_DOMAINS'] ?? getenv('STUDENT_EMAIL_DOMAINS');
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $domains = [];
        foreach (explode(',', strtolower($raw)) as $entry) {
            $entry = trim(ltrim(trim($entry), '@.'));
            // Require at least "name.tld" so a bare TLD cannot whitelist everything.
            if (preg_match('/^[a-z0-9-]+(\.[a-z0-9-]+)+$/', $entry) === 1) {
                $domains[] = $entry;
            }
        }
        return $domains;
    }

    /**
     * Đánh dấu người dùng là sinh viên đã xác thực
     */
    public function verifyStudent(int $userId): void
    {
        $this->execute('UPDATE users SET is_student_verified = 1 WHERE id = ?', [$userId]);
    }

    /**
     * Cấp huy hiệu khi hộp thư đã được chứng minh quyền sở hữu (OTP hoặc
     * Google email_verified) và thuộc tên miền trường. Trả về cờ sau xử lý.
     */
    public function grantStudentBadgeIfEligible(array $user, bool $emailOwnershipProven): bool
    {
        if ((int)($user['is_student_verified'] ?? 0) === 1) {
            return true;
        }
        if (!$emailOwnershipProven || ($user['role'] ?? '') !== 'student'
            || !self::isStudentEmail((string)($user['email'] ?? ''))) {
            return false;
        }
        $this->verifyStudent((int)$user['id']);
        return true;
    }

    // ─── Feature 2: Hệ thống Xu & Đẩy Tin ───────────────────────────────────

    /**
     * Lấy số xu hiện tại của user
     */
    public function getCoins(int $userId): int
    {
        $row = $this->queryOne('SELECT coins FROM users WHERE id = ?', [$userId]);
        return (int)($row['coins'] ?? 0);
    }

    /**
     * Cộng xu cho user
     */
    public function addCoins(int $userId, int $amount): void
    {
        $this->execute('UPDATE users SET coins = COALESCE(coins, 0) + ? WHERE id = ?', [$amount, $userId]);
    }

    /**
     * Trừ xu (trả về false nếu không đủ xu)
     */
    public function spendCoins(int $userId, int $amount): bool
    {
        if ($amount <= 0) {
            return false;
        }
        return $this->execute(
            'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
            [$amount, $userId, $amount]
        ) === 1;
    }

    /**
     * Kiểm tra user có thể check-in hôm nay không
     */
    public function canCheckin(int $userId): bool
    {
        $row = $this->queryOne('SELECT last_checkin FROM users WHERE id = ?', [$userId]);
        $last = $row['last_checkin'] ?? null;
        return $last !== date('Y-m-d'); // check-in nếu chưa check-in hôm nay
    }

    /**
     * Thực hiện check-in: Tính toán streak 7 ngày và số xu thưởng
     * Trả về mảng ['bonus' => int, 'streak' => int]
     */
    public function doCheckin(int $userId): array
    {
        $row = $this->queryOne('SELECT checkin_streak, last_checkin FROM users WHERE id = ?', [$userId]);
        $streak = (int)($row['checkin_streak'] ?? 0);
        $lastCheckin = $row['last_checkin'] ?? null;
        
        $bonus = 10;
        
        // Tính toán chuỗi liên tiếp
        if ($lastCheckin) {
            $diff = (new \DateTime())->diff(new \DateTime($lastCheckin))->days;
            if ($diff == 1) {
                $streak++; // Check-in liên tiếp
            } else {
                $streak = 1; // Bị đứt chuỗi
            }
        } else {
            $streak = 1;
        }

        // Nếu đạt mốc 7 ngày, thưởng lớn 50 xu và reset hoặc giữ nguyên.
        if ($streak == 7) {
            $bonus = 50;
        } elseif ($streak > 7) {
            $streak = 1; // Qua chu kỳ mới
            $bonus = 10;
        }

        // Fix race condition (spam click): bắt điều kiện ở UPDATE chứ không chỉ qua check SELECT
        $affectedRows = $this->execute(
            'UPDATE users SET coins = COALESCE(coins, 0) + ?, checkin_streak = ?, last_checkin = CURDATE() WHERE id = ? AND (last_checkin IS NULL OR last_checkin < CURDATE())',
            [$bonus, $streak, $userId]
        );

        // Nếu lệnh UPDATE không tác động dòng nào -> bị trùng (spam click) đã điểm danh
        if ($affectedRows === 0) {
            return ['bonus' => 0, 'streak' => $streak];
        }

        return ['bonus' => $bonus, 'streak' => $streak];
    }
    /**
     * Lấy thứ hạng/cấp bậc người bán dựa trên số lượng sản phẩm đã đăng
     * Trả về mảng chứa name, color, icon để render UI
     */
    public function getRankLevel(int $userId): array
    {
        // BUG-015 fix: chỉ tính sản phẩm đã được duyệt (active) hoặc đã bán (sold)
        // Loại bỏ pending/cancelled để rank phản ánh uy tín thực sự
        $countRow = $this->queryOne(
            'SELECT COUNT(*) as total FROM products WHERE user_id = ? AND status IN ("active", "sold")',
            [$userId]
        );
        $total = (int)($countRow['total'] ?? 0);

        if ($total >= 5) {
            return ['name' => 'Uy tín', 'color' => 'warning', 'icon' => 'star-fill'];
        } elseif ($total >= 1) {
            return ['name' => 'Tích cực', 'color' => 'info', 'icon' => 'activity'];
        }
        return ['name' => 'Tân binh', 'color' => 'secondary', 'icon' => 'person'];
    }

    /**
     * Lấy bảng xếp hạng người bán (Top Sellers)
     * Scoring: sold_count × 5 + avg_rating × 10 + product_count × 1
     * @return array<int, array<string, mixed>>
     */
    public function getLeaderboard(int $limit = 10): array
    {
        return $this->query(
            "SELECT
                u.id, u.name, u.avatar, u.avatar_url, u.is_student_verified,
                COUNT(DISTINCT p.id)                                                AS product_count,
                COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END)          AS sold_count,
                COALESCE(ROUND(AVG(r.stars), 1), 0)                                AS avg_rating,
                COUNT(DISTINCT r.id)                                                AS rating_count,
                (COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END) * 5
                    + COALESCE(AVG(r.stars), 0) * 10
                    + COUNT(DISTINCT p.id) * 1)                                     AS score
             FROM users u
             LEFT JOIN products p ON p.user_id = u.id
             LEFT JOIN ratings  r ON r.ratee_id = u.id
             WHERE u.role = 'student' AND u.is_locked = 0
             GROUP BY u.id
             ORDER BY score DESC, sold_count DESC, avg_rating DESC
             LIMIT ?",
            [$limit]
        );
    }

    /**
     * Lấy thống kê leaderboard của một người bán mà không tải toàn bộ bảng.
     */
    public function getLeaderboardUser(int $userId): ?array
    {
        return $this->queryOne(
            "SELECT
                u.id, u.name, u.avatar, u.avatar_url, u.is_student_verified,
                COUNT(DISTINCT p.id) AS product_count,
                COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END) AS sold_count,
                COALESCE(ROUND(AVG(r.stars), 1), 0) AS avg_rating,
                COUNT(DISTINCT r.id) AS rating_count,
                (COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END) * 5
                    + COALESCE(AVG(r.stars), 0) * 10
                    + COUNT(DISTINCT p.id)) AS score
             FROM users u
             LEFT JOIN products p ON p.user_id = u.id
             LEFT JOIN ratings r ON r.ratee_id = u.id
             WHERE u.id = ? AND u.role = 'student' AND u.is_locked = 0
             GROUP BY u.id",
            [$userId]
        );
    }

    /**
     * Lấy thứ hạng của 1 user cụ thể trong bảng xếp hạng
     */
    public function getMyRank(int $userId): int
    {
        $result = $this->queryOne(
            "SELECT ranked.rank_pos FROM (
                SELECT u.id,
                       RANK() OVER (
                           ORDER BY
                               (COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END) * 5
                                + COALESCE(AVG(r.stars), 0) * 10
                                + COUNT(DISTINCT p.id) * 1) DESC,
                               COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END) DESC,
                               COALESCE(AVG(r.stars), 0) DESC
                       ) AS rank_pos
                FROM users u
                LEFT JOIN products p ON p.user_id = u.id
                LEFT JOIN ratings  r ON r.ratee_id = u.id
                WHERE u.role = 'student' AND u.is_locked = 0
                GROUP BY u.id
             ) ranked
             WHERE ranked.id = ?",
            [$userId]
        );
        return (int)($result['rank_pos'] ?? 0);
    }

    // ─── HỆ THỐNG STRIKE & BAN ──────────────────────────────────────────────

    /**
     * Tặng 1 gậy cảnh cáo cho người dùng
     */
    public function addStrike(int $userId, int $adminId, string $reason, string $evidenceUrl = null): array
    {
        $user = $this->findById($userId);
        if (!$user) return ['success' => false, 'message' => 'Người dùng không tồn tại.'];

        $newStrikeCount = (int)$user['strike_count'] + 1;

        // Lưu vào violation_logs
        $this->insert(
            'INSERT INTO violation_logs (user_id, admin_id, reason, evidence_url, strike_number, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [$userId, $adminId, $reason, $evidenceUrl, $newStrikeCount]
        );

        // Cập nhật users table
        if ($newStrikeCount === 1) {
            $this->execute('UPDATE users SET strike_count = 1 WHERE id = ?', [$userId]);
            $action = 'warning';
        } elseif ($newStrikeCount === 2) {
            $this->execute('UPDATE users SET strike_count = 2, is_locked = 1, locked_until = DATE_ADD(NOW(), INTERVAL 7 DAY), lock_reason = ? WHERE id = ?', ["Tạm khóa 7 ngày do nhận 2 gậy vi phạm. Lý do gần nhất: $reason", $userId]);
            $action = 'suspend_7_days';
        } else {
            // >= 3 gậy: Khóa vĩnh viễn
            $this->execute('UPDATE users SET strike_count = ?, is_locked = 1, locked_until = NULL, lock_reason = ? WHERE id = ?', [$newStrikeCount, "Khóa vĩnh viễn do nhận $newStrikeCount gậy vi phạm. Lý do gần nhất: $reason", $userId]);
            $action = 'ban_permanent';
        }

        return [
            'success'       => true,
            'strike_count'  => $newStrikeCount,
            'action'        => $action
        ];
    }

    /**
     * Lấy lịch sử vi phạm (danh sách gậy)
     */
    public function getViolationHistory(int $userId): array
    {
        return $this->query(
            'SELECT v.*, u.name as admin_name 
             FROM violation_logs v
             JOIN users u ON v.admin_id = u.id
             WHERE v.user_id = ?
             ORDER BY v.created_at DESC',
            [$userId]
        );
    }
}
