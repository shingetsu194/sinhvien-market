<?php

namespace Core;

/**
 * Middleware - Kiểm soát quyền truy cập các route
 */
class Middleware
{
    /**
     * Yêu cầu đăng nhập — nếu chưa login, redirect về /login
     */
    public static function requireAuth(): void
    {
        if (!isset($_SESSION['user'])) {
            Flash::set('error', 'Bạn cần đăng nhập để truy cập trang này.');
            self::redirect('login-role');
            return;
        }

        // Kiểm tra tài khoản có bị khóa không
        if (($_SESSION['user']['is_locked'] ?? 0) == 1) {
            // Lấy thông tin khóa mới nhất từ DB và cập nhật session
            // (Không destroy session để giữ thông tin hiển thị ở trang thông báo)
            self::redirect('account-locked');
            return;
        }
    }

    /**
     * Yêu cầu quyền Admin — nếu không phải admin, redirect về trang chủ
     */
    public static function requireAdmin(): void
    {
        self::requireAuth();

        if (($_SESSION['user']['role'] ?? '') !== 'admin') {
            Flash::set('error', 'Bạn không có quyền truy cập khu vực quản trị.');
            self::redirect('');
        }
    }

    /**
     * Chặn user đã đăng nhập truy cập trang login/register
     */
    public static function requireGuest(): void
    {
        if (isset($_SESSION['user'])) {
            self::redirect('products');
        }
    }

    // ─── Helper private ──────────────────────────────────────────────────────

    private static function redirect(string $path): void
    {
        $base = rtrim($_ENV['APP_URL'] ?? 'http://localhost/sinhvien-market', '/');
        header('Location: ' . $base . '/' . ltrim($path, '/'));
        exit;
    }
}
