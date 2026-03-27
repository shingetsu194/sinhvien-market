<?php
/**
 * Front Controller - Điểm vào duy nhất của ứng dụng
 * Mọi request đều được .htaccess chuyển về đây
 */

define('ROOT', __DIR__);
define('APP_PATH', ROOT . '/app');
define('CORE_PATH', ROOT . '/core');
define('CONFIG_PATH', ROOT . '/config');

// ─── HTTP Security Headers (Phase 9) ─────────────────────────────────────────
header('X-Frame-Options: SAMEORIGIN'); // Chống clickjacking
header('X-Content-Type-Options: nosniff'); // Chống MIME-type sniffing
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-XSS-Protection: 1; mode=block'); // Legacy XSS filter
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

// ─── Secure Session Configuration ────────────────────────────────────────────
ini_set('session.cookie_httponly', '1'); // Ngăn JS đọc cookie
ini_set('session.use_strict_mode', '1'); // Từ chối session ID không do server cấp
ini_set('session.cookie_samesite', 'Lax'); // Chống CSRF qua cross-site requests

// Khởi động session
session_start();

// ─── Load .env sớm để APP_URL có sẵn cho mọi view ────────────────────────────
$_envFile = __DIR__ . '/.env';
if (file_exists($_envFile)) {
    foreach (file($_envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        if (str_starts_with(trim($_line), '#') || !str_contains($_line, '='))
            continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_k = trim($_k);
        $_v = trim(trim($_v), '"\'');
        if (!isset($_ENV[$_k])) {
            $_ENV[$_k] = $_v;
            putenv("{$_k}={$_v}");
        }
    }
}
unset($_envFile, $_line, $_k, $_v);

// Autoloader đơn giản theo PSR-4 style
spl_autoload_register(function (string $class): void {
    // Map các namespace → thư mục
    $prefixes = [
        'App\\Controllers\\' => APP_PATH . '/controllers/',
        'App\\Models\\'      => APP_PATH . '/models/',
        'App\\Services\\'    => APP_PATH . '/services/',
        'Core\\'             => CORE_PATH . '/',
        'Config\\'           => CONFIG_PATH . '/',
    ];

    foreach ($prefixes as $prefix => $baseDir) {
        if (str_starts_with($class, $prefix)) {
            $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
            $file = $baseDir . $relative . '.php';
            if (file_exists($file)) {
                require_once $file;
                return;
            }
        }
    }
});

// ─── Global Error Handler (Phase 13) ───────────────────────────────────────
use Core\ErrorHandler;
ErrorHandler::register();

// Load Router và khởi chạy ứng dụng
use Core\Router;

$router = new Router();

// ─── Định nghĩa tất cả routes ────────────────────────────────────────────────

// Auth
$router->get('', 'Home', 'index'); // Trang chủ
$router->get('login-role', 'Auth', 'loginRole');
$router->get('login', 'Auth', 'loginForm');
$router->post('login', 'Auth', 'login');
$router->get('admin-login', 'Auth', 'adminLoginForm');
$router->post('admin-login', 'Auth', 'adminLogin');
$router->get('register', 'Auth', 'registerForm');
$router->post('register', 'Auth', 'register');
$router->get('logout', 'Auth', 'logout');
$router->get('account-locked', 'Auth', 'accountLocked'); // Trang thông báo khóa tài khoản

// OTP & Password Reset
$router->get('verify-otp', 'Auth', 'verifyOtpForm');
$router->post('verify-otp', 'Auth', 'verifyOtp');
$router->get('resend-otp', 'Auth', 'resendOtp');
$router->get('forgot-password', 'Auth', 'forgotPasswordForm');
$router->post('forgot-password', 'Auth', 'forgotPassword');
$router->get('reset-password', 'Auth', 'resetPasswordForm');
$router->post('reset-password', 'Auth', 'resetPassword');

$router->get('dashboard', 'Home', 'dashboard'); // Student dashboard

// ─── Profile ──────────────────────────────────────────────────────────────────
$router->get('profile', 'Profile', 'show');
$router->post('profile/update', 'Profile', 'update');
$router->post('profile/password', 'Profile', 'changePassword');
$router->post('profile/avatar', 'Profile', 'uploadAvatar');


// Products
$router->get('products', 'Product', 'index');
$router->get('products/create', 'Product', 'createForm');
$router->post('products/create', 'Product', 'create');
$router->get('products/show', 'Product', 'show'); // ?id=
$router->get('products/my', 'Product', 'myProducts');
$router->post('products/delete', 'Product', 'delete');

// Auction / Transaction
$router->post('transactions/checkout', 'Transaction', 'checkout');
$router->get('transactions/bank', 'Transaction', 'bank');
$router->post('transactions/bank-confirm', 'Transaction', 'bankConfirm');
$router->get('transactions/zalopay', 'Transaction', 'zalopay');
$router->post('transactions/zalopay-callback', 'Transaction', 'zalopayCallback');

$router->get('transactions/history', 'Transaction', 'history');
$router->post('transactions/update-status', 'Transaction', 'updateStatus');

// API (JSON responses cho polling realtime)
$router->get('api/auction/price', 'Auction', 'apiPrice');

// Admin
$router->get('admin', 'Admin', 'dashboard');
$router->get('admin/users', 'Admin', 'users');
$router->get('admin/users/detail', 'Admin', 'userDetail');
$router->post('admin/users/toggle', 'Admin', 'toggleUser');
$router->get('admin/products', 'Admin', 'products');
$router->post('admin/products/approve', 'Admin', 'approveProduct');
$router->post('admin/products/reject', 'Admin', 'rejectProduct');
$router->post('admin/products/delete', 'Admin', 'deleteProduct');
$router->get('admin/categories', 'Admin', 'categories');
$router->post('admin/categories/store', 'Admin', 'storeCategory');
$router->post('admin/categories/update', 'Admin', 'updateCategory');
$router->post('admin/categories/delete', 'Admin', 'deleteCategory');
$router->get('admin/reports', 'Admin', 'reports');
$router->get('admin/system-reports', 'Admin', 'systemReports');
$router->post('admin/system-reports/resolve', 'Admin', 'resolveReport');
$router->get('admin/audit-log', 'Admin', 'auditLog');

// Admin Giveaways Phase 11.4
$router->get('admin/giveaways', 'Admin', 'giveaways');
$router->post('admin/giveaways/store', 'Admin', 'storeGiveaway');
$router->get('admin/giveaway_spin', 'Admin', 'spinGiveaway');
$router->post('admin/giveaway_spin_api', 'Admin', 'spinGiveawayApi');

// User Giveaways API
$router->post('api/giveaways/join', 'Giveaway', 'join');

// ─── Chat ────────────────────────────────────────────────────────────────────
$router->get('chat', 'Chat', 'index');
$router->get('chat/show', 'Chat', 'show');
$router->post('chat/start', 'Chat', 'start');
$router->post('chat/send', 'Chat', 'send');
$router->get('chat/poll', 'Chat', 'apiPoll');
$router->get('api/chat/unread', 'Chat', 'apiUnreadCount');
// API-prefixed aliases (chuẩn hóa Phase 14)
$router->post('api/chat/send', 'Chat', 'send');
$router->get('api/chat/poll', 'Chat', 'apiPoll');

// ─── Notifications ───────────────────────────────────────────────────────────
$router->get('notifications', 'Notification', 'index');
$router->get('api/notifications/unread', 'Notification', 'apiUnread');
$router->post('notifications/mark-read', 'Notification', 'markRead');

// ─── Ratings ─────────────────────────────────────────────────────────────────
$router->post('ratings/create', 'Rating', 'create');
$router->get('users/profile', 'Rating', 'profile');

// ─── Reports (Tố cáo) ────────────────────────────────────────────────────────
$router->post('reports/store', 'Report', 'store');

// ─── Wishlist ─────────────────────────────────────────────────────────────────
$router->post('wishlist/toggle', 'Wishlist', 'toggle');
$router->get('wishlist', 'Wishlist', 'index');

// ─── Dispatch ────────────────────────────────────────────────────────────────
$router->dispatch();
