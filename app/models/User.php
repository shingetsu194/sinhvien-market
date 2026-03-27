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
    }

    /**
     * Cập nhật đường dẫn ảnh đại diện
     */
    public function changeAvatar(int $userId, string $path): void
    {
        $this->execute('UPDATE users SET avatar = ? WHERE id = ?', [$path, $userId]);
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
}
