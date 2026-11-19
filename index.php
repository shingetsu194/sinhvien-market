<?php
/**
 * Front Controller - Điểm vào duy nhất của ứng dụng
 * Mọi request đều được .htaccess chuyển về đây
 */

define('ROOT', __DIR__);
define('APP_PATH', ROOT . '/app');
define('CORE_PATH', ROOT . '/core');
define('CONFIG_PATH', ROOT . '/config');

// ─── HTTP Security Headers ─────────────────────────────────────────────────
header('X-Frame-Options: SAMEORIGIN');                          // Chống Clickjacking
header('X-Content-Type-Options: nosniff');                      // Chống MIME-type sniffing
header('Referrer-Policy: strict-origin-when-cross-origin');     // Giới hạn thông tin Referrer
header('X-XSS-Protection: 1; mode=block');                      // Legacy XSS filter (trình duyệt cũ)
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()'); // Tắt API nhạy cảm

// ─── Content Security Policy (CSP) ─────────────────────────────────────────
// Chặn XSS, data injection và tài nguyên không được ủy quyền
// 'unsafe-inline' & 'unsafe-eval' được giữ lại tạm thời cho Alpine.js + inline scripts
// TODO: Giai đoạn sau có thể thắt chặt bằng nonce-based CSP
header(implode('', [
    "Content-Security-Policy: ",
    "default-src 'self'; ",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' ",
        "https://cdn.jsdelivr.net ",
        "https://cdn.tailwindcss.com ",
        "https://js.pusher.com ",
        "https://unpkg.com; ",
    "style-src 'self' 'unsafe-inline' ",
        "https://cdn.jsdelivr.net ",
        "https://fonts.googleapis.com; ",
    "font-src 'self' ",
        "https://cdn.jsdelivr.net ",
        "https://fonts.gstatic.com; ",
    "img-src 'self' data: blob: ",
        "https://ui-avatars.com ",
        "https://lh3.googleusercontent.com ",
        "https://api.qrserver.com ",
        "https://img.vietqr.io ",
        "https://cdn.jsdelivr.net; ",
    "connect-src 'self' ",
        "wss://ws-ap1.pusher.com ",
        "ws://ws-ap1.pusher.com ",
        "https://sockjs-ap1.pusher.com; ",
    "frame-src 'none'; ",
    "object-src 'none'; ",
    "base-uri 'self'; ",
    "form-action 'self';",
]));

// ─── HSTS (Strict-Transport-Security) ─────────────────────────────────────
// Ép trình duyệt luôn dùng HTTPS; chỉ kích hoạt khi đang chạy trên HTTPS
if ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
    (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
}

// ─── Secure Session Configuration ──────────────────────────────────────────
ini_set('session.cookie_httponly', '1');   // Ngăn JS đọc session cookie
ini_set('session.use_strict_mode', '1');   // Từ chối session ID không do server cấp
ini_set('session.cookie_samesite', 'Lax'); // Chống CSRF qua cross-site requests
// Bật Secure flag khi chạy trên HTTPS thực tế
if ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')) {
    ini_set('session.cookie_secure', '1');
}
// Tăng entropy của session ID
ini_set('session.sid_length', '48');
ini_set('session.sid_bits_per_character', '6');

// Khởi động session
session_start();

// ─── Tích hợp thư viện Composer (Google API, v.v) ───────────────────────────
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// ─── Load .env sớm để APP_URL có sẵn cho mọi view ────────────────────────────
$_envFile = __DIR__ . '/.env';
if (file_exists($_envFile)) {
    // Local: đọc từ file .env
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
} else {
    // Railway: env vars được inject vào process, không có file .env
    // Sync $_SERVER → $_ENV để APP_URL, PUSHER_*, GEMINI_API_KEY... hoạt động qua $_ENV
    foreach ($_SERVER as $_k => $_v) {
        if (!isset($_ENV[$_k]) && is_string($_v)) {
            $_ENV[$_k] = $_v;
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

use Core\PostResponseJson;
PostResponseJson::start();

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
$router->get('verify-otp', 'Otp', 'verifyOtpForm');
$router->post('verify-otp', 'Otp', 'verifyOtp');
$router->get('resend-otp', 'Otp', 'resendOtp');
$router->get('forgot-password', 'PasswordReset', 'forgotPasswordForm');
$router->post('forgot-password', 'PasswordReset', 'forgotPassword');
$router->get('reset-password', 'PasswordReset', 'resetPasswordForm');
$router->post('reset-password', 'PasswordReset', 'resetPassword');

// Google OAuth
$router->get('auth/google',          'GoogleAuth', 'redirectToGoogle');
$router->get('auth/google/callback', 'GoogleAuth', 'callback');

// ─── Coins & Bump (Feature 2) ─────────────────────────────────────────────
$router->get('rewards',        'Coin', 'index');
$router->post('coins/checkin', 'Coin', 'checkIn');
$router->post('coins/bump',    'Coin', 'bump');

// Leaderboard (Feature v1.6.0)
$router->get('leaderboard', 'Leaderboard', 'index');


$router->get('dashboard', 'Home', 'dashboard'); // Student dashboard

// ─── Profile ──────────────────────────────────────────────────────────────────
$router->get('profile', 'Profile', 'show');
$router->get('users/avatar', 'Profile', 'avatar'); // ?id= — avatar từ DB (public)
$router->post('profile/update', 'Profile', 'update');
$router->post('profile/password', 'Profile', 'changePassword');
$router->post('profile/avatar', 'Profile', 'uploadAvatar');
$router->post('profile/bank', 'Profile', 'saveBankAccount');
$router->post('profile/security-question', 'Profile', 'saveSecurityQuestion');


// Products
$router->get('products', 'Product', 'index');
$router->get('products/create', 'Product', 'createForm');
$router->post('products/create', 'Product', 'create');
$router->post('products/suggest-price', 'Product', 'suggestPrice');
$router->get('products/show', 'Product', 'show'); // ?id=
$router->get('products/image', 'Product', 'image'); // ?id= — phục vụ ảnh từ DB
$router->get('products/my', 'Product', 'myProducts');
$router->post('products/delete', 'Product', 'delete');

// Auction / Transaction
$router->post('transactions/checkout', 'Transaction', 'checkout');
$router->get('transactions/bank', 'Transaction', 'bank');
$router->post('transactions/bank-confirm', 'Transaction', 'bankConfirm');
$router->post('transactions/bank-received', 'Transaction', 'bankReceived');
$router->get('transactions/zalopay', 'Transaction', 'zalopay');
$router->get('transactions/zalopay-return', 'Transaction', 'zalopayReturn');
$router->post('transactions/zalopay-ipn', 'Transaction', 'zalopayIpn');
// MoMo Sandbox
$router->get('transactions/momo', 'Transaction', 'momo');
$router->get('transactions/momo-return', 'Transaction', 'momoReturn');
$router->post('transactions/momo-ipn', 'Transaction', 'momoIpn');

$router->get('transactions/history', 'Transaction', 'history');
$router->get('transactions/proof', 'Transaction', 'proof'); // ?id= — biên lai từ DB (mua/bán/admin)
$router->post('transactions/update-status', 'Transaction', 'updateStatus');

// API (JSON responses cho polling realtime)
$router->get('api/marketplace/home', 'MarketplaceApi', 'home');
$router->get('api/marketplace/leaderboard', 'MarketplaceApi', 'leaderboard');
$router->get('api/marketplace/categories', 'MarketplaceApi', 'categories');
$router->get('api/marketplace/products', 'MarketplaceApi', 'products');
$router->get('api/marketplace/product', 'MarketplaceApi', 'product');
$router->get('api/marketplace/matching/search', 'MarketplaceMatchingApi', 'search');
$router->post('api/admin/marketplace/matching/index', 'MarketplaceMatchingApi', 'indexProducts');
$router->get('api/admin/marketplace/matching/evaluations', 'MarketplaceMatchingApi', 'evaluations');
$router->post('api/admin/marketplace/matching/evaluations', 'MarketplaceMatchingApi', 'createEvaluation');
// Buyer REQUESTs (nhu cầu tìm mua): signed-in owner only.
$router->get('api/marketplace/requests', 'BuyerRequestApi', 'mine');
$router->post('api/marketplace/requests', 'BuyerRequestApi', 'create');
$router->post('api/marketplace/requests/{id}/close', 'BuyerRequestApi', 'close');
$router->get('api/marketplace/requests/{id}/image', 'BuyerRequestApi', 'image');
$router->get('api/products/search', 'Product', 'apiSearch');
$router->get('api/auction/price', 'Auction', 'apiPrice');

// Next.js session-backed JSON API. Mutations require the session CSRF token
// returned by GET /api/auth/csrf (header X-CSRF-Token or JSON _csrf).
$router->get('api/auth/me', 'NextApi', 'me');
$router->get('api/auth/locked-info', 'NextApi', 'lockedInfo');
$router->get('api/auth/csrf', 'NextApi', 'csrf');
$router->post('api/auth/login', 'NextApi', 'login');
$router->post('api/auth/register', 'NextApi', 'register');
$router->post('api/auth/logout', 'NextApi', 'logout');
$router->post('api/auth/password/forgot/question', 'NextApi', 'forgotPasswordQuestion');
$router->post('api/auth/password/forgot/answer', 'NextApi', 'forgotPasswordAnswer');
$router->post('api/auth/password/reset', 'NextApi', 'resetPassword');
$router->get('api/auth/otp/session', 'NextApi', 'otpSession');
$router->post('api/auth/otp/verify', 'NextApi', 'verifyOtp');
$router->post('api/auth/otp/resend', 'NextApi', 'resendOtp');
$router->get('api/profile/me', 'NextApi', 'profileMe');
$router->put('api/profile/me', 'NextApi', 'updateProfile');
$router->get('api/profile/public', 'NextApi', 'publicProfile');
$router->get('api/users/profile', 'NextApi', 'publicProfile');
$router->get('api/users/{id}/profile', 'NextApi', 'publicProfile');
$router->post('api/profile/password', 'NextApi', 'updatePassword');
$router->post('api/profile/avatar', 'NextApi', 'uploadAvatar');
$router->post('api/profile/bank', 'NextApi', 'saveBank');
$router->post('api/profile/security-question', 'NextApi', 'saveSecurityQuestion');
$router->get('api/student/profile', 'ResidenceApi', 'studentProfile');
$router->put('api/student/profile', 'ResidenceApi', 'updateStudentProfile');
$router->get('api/residence/applications', 'ResidenceApi', 'applications');
$router->post('api/residence/applications', 'ResidenceApi', 'submitApplication');
$router->get('api/residence/contracts', 'ResidenceApi', 'contracts');
$router->get('api/admin/residence/applications', 'ResidenceApi', 'reviewApplications');
$router->post('api/admin/residence/applications/{id}/review', 'ResidenceApi', 'reviewApplication');
$router->get('api/admin/residence/contracts', 'ResidenceApi', 'residenceContractsForManagers');
$router->get('api/admin/residence/inventory', 'ResidenceApi', 'inventory');
$router->get('api/admin/residence/available-beds', 'ResidenceApi', 'availableBeds');
$router->get('api/admin/residence/allocations', 'ResidenceApi', 'contractAllocations');
$router->post('api/admin/residence/allocations', 'ResidenceApi', 'allocateBed');
$router->post('api/admin/residence/allocations/{id}/transfer', 'ResidenceApi', 'transferBed');
$router->get('api/residence/accommodation/history', 'ResidenceApi', 'accommodationHistory');
$router->post('api/admin/residence/buildings', 'ResidenceApi', 'createBuilding');
$router->put('api/admin/residence/buildings/{id}', 'ResidenceApi', 'updateBuilding');
$router->delete('api/admin/residence/buildings/{id}', 'ResidenceApi', 'deleteBuilding');
$router->post('api/admin/residence/floors', 'ResidenceApi', 'createFloor');
$router->put('api/admin/residence/floors/{id}', 'ResidenceApi', 'updateFloor');
$router->delete('api/admin/residence/floors/{id}', 'ResidenceApi', 'deleteFloor');
$router->post('api/admin/residence/rooms', 'ResidenceApi', 'createRoom');
$router->put('api/admin/residence/rooms/{id}', 'ResidenceApi', 'updateRoom');
$router->delete('api/admin/residence/rooms/{id}', 'ResidenceApi', 'deleteRoom');
$router->post('api/admin/residence/beds', 'ResidenceApi', 'createBed');
$router->put('api/admin/residence/beds/{id}', 'ResidenceApi', 'updateBed');
$router->delete('api/admin/residence/beds/{id}', 'ResidenceApi', 'deleteBed');
$router->get('api/residence/service-requests', 'ResidenceApi', 'serviceRequests');
$router->post('api/residence/service-requests', 'ResidenceApi', 'createServiceRequest');
$router->put('api/admin/residence/service-requests/{id}', 'ResidenceApi', 'updateServiceRequest');
$router->post('api/residence/assistant/rules', 'ResidenceApi', 'dormRulesAssistant');
$router->get('api/admin/residence/dashboard', 'ResidenceApi', 'operationsDashboard');
$router->get('api/rental/spaces', 'ResidenceApi', 'rentalSpaces');
$router->post('api/admin/rental/spaces', 'ResidenceApi', 'createRentalSpace');
$router->put('api/admin/rental/spaces/{id}', 'ResidenceApi', 'updateRentalSpace');
$router->delete('api/admin/rental/spaces/{id}', 'ResidenceApi', 'deleteRentalSpace');
$router->get('api/rental/applications', 'ResidenceApi', 'rentalApplications');
$router->post('api/rental/applications', 'ResidenceApi', 'submitRentalApplication');
$router->get('api/admin/rental/applications', 'ResidenceApi', 'rentalApplicationsForReview');
$router->post('api/admin/rental/applications/{id}/review', 'ResidenceApi', 'reviewRentalApplication');
$router->get('api/rental/contracts', 'ResidenceApi', 'rentalContracts');
$router->get('api/residence/fee-categories', 'ResidenceFinanceApi', 'feeCategories');
$router->post('api/admin/residence/fee-categories', 'ResidenceFinanceApi', 'saveFeeCategory');
$router->put('api/admin/residence/fee-categories/{id}', 'ResidenceFinanceApi', 'saveFeeCategory');
$router->get('api/residence/invoices', 'ResidenceFinanceApi', 'invoices');
$router->post('api/admin/residence/invoices', 'ResidenceFinanceApi', 'createInvoice');
$router->get('api/residence/payments', 'ResidenceFinanceApi', 'payments');
$router->post('api/residence/payments', 'ResidenceFinanceApi', 'recordPayment');
$router->post('api/admin/residence/payments/{id}/review', 'ResidenceFinanceApi', 'reviewPayment');
$router->get('api/residence/notices', 'ResidenceFinanceApi', 'notices');
$router->post('api/admin/residence/notices', 'ResidenceFinanceApi', 'createNotice');
$router->post('api/admin/residence/notices/{id}/archive', 'ResidenceFinanceApi', 'archiveNotice');
$router->get('api/admin/roles', 'ResidenceApi', 'assignableRoles');
$router->post('api/admin/users/{id}/roles', 'ResidenceApi', 'assignRole');
$router->get('api/user/products', 'NextApi', 'products');
$router->post('api/user/products', 'NextApi', 'createProduct');
$router->delete('api/user/products', 'NextApi', 'deleteProduct');
$router->get('api/user/conversations', 'NextApi', 'conversations');
$router->post('api/user/conversations', 'NextApi', 'startConversation');
$router->get('api/user/transactions', 'NextApi', 'transactions');
$router->post('api/user/transactions/status', 'NextApi', 'updateTransactionStatus');
$router->post('api/user/transactions/checkout', 'NextApi', 'checkout');
$router->get('api/user/transactions/payment', 'NextApi', 'transactionPaymentInfo');
$router->post('api/user/transactions/payment/start', 'NextApi', 'startTransactionPayment');
$router->post('api/user/transactions/payment/proof', 'NextApi', 'uploadTransactionPaymentProof');
$router->post('api/user/transactions/payment/confirm', 'NextApi', 'confirmTransactionBankPayment');
$router->get('api/user/notifications', 'NextApi', 'notifications');
$router->post('api/user/notifications/mark-read', 'NextApi', 'markNotificationRead');
$router->get('api/user/rewards', 'NextApi', 'rewards');
$router->post('api/user/rewards/checkin', 'NextApi', 'checkin');
$router->post('api/user/rewards/bump', 'NextApi', 'bump');
$router->get('api/user/wishlist', 'NextApi', 'wishlist');
$router->post('api/user/wishlist/toggle', 'NextApi', 'toggleWishlist');

// Admin
$router->get('api/admin/dashboard', 'AdminApi', 'dashboard');
$router->get('api/admin/products', 'AdminApi', 'products');
$router->post('api/admin/products/approve', 'AdminApi', 'approveProduct');
$router->post('api/admin/products/reject', 'AdminApi', 'rejectProduct');
$router->post('api/admin/products/delete', 'AdminApi', 'deleteProduct');
$router->get('api/admin/transactions', 'AdminApi', 'transactions');
$router->get('api/admin/categories', 'AdminApi', 'categories');
$router->post('api/admin/categories', 'AdminApi', 'createCategory');
$router->put('api/admin/categories/{id}', 'AdminApi', 'updateCategory');
$router->delete('api/admin/categories/{id}', 'AdminApi', 'deleteCategory');
$router->get('api/admin/users', 'AdminApi', 'users');
$router->get('api/admin/users/{id}/violations', 'AdminApi', 'userViolations');
$router->post('api/admin/users/{id}/toggle-lock', 'AdminApi', 'toggleUserLock');
$router->post('api/admin/users/{id}/strike', 'AdminApi', 'strikeUser');
$router->get('api/admin/users/{id}', 'AdminApi', 'userDetail');
$router->get('api/admin/reports', 'AdminApi', 'transactionReports');
$router->get('api/admin/system-reports', 'AdminApi', 'systemReports');
$router->get('api/admin/reports/evidence', 'AdminApi', 'reportEvidence');
$router->post('api/admin/system-reports/{id}/resolve', 'AdminApi', 'resolveSystemReport');
$router->get('api/admin/ratings', 'AdminApi', 'ratings');
$router->post('api/admin/ratings/{id}/toggle', 'AdminApi', 'toggleRating');
$router->get('api/admin/banners', 'AdminApi', 'banners');
$router->post('api/admin/banners', 'AdminApi', 'createBanner');
$router->put('api/admin/banners/{id}', 'AdminApi', 'updateBanner');
$router->post('api/admin/banners/{id}/toggle', 'AdminApi', 'toggleBanner');
$router->delete('api/admin/banners/{id}', 'AdminApi', 'deleteBanner');
$router->get('api/admin/giveaways', 'AdminApi', 'giveaways');
$router->post('api/admin/giveaways', 'AdminApi', 'createGiveaway');
$router->get('api/admin/giveaways/{id}', 'AdminApi', 'giveawayDetail');
$router->delete('api/admin/giveaways/{id}', 'AdminApi', 'deleteGiveaway');
$router->post('api/admin/giveaways/{id}/spin', 'AdminApi', 'saveGiveawayWinner');
$router->get('api/admin/audit-log', 'AdminApi', 'auditLog');
$router->get('api/admin/export', 'AdminApi', 'export');

$router->get('admin', 'Admin', 'dashboard');
$router->get('admin/users', 'AdminUser', 'users');
$router->get('admin/users/detail', 'AdminUser', 'userDetail');
$router->post('admin/users/toggle', 'AdminUser', 'toggleUser');
$router->post('admin/users/strike', 'AdminUser', 'strikeUser');
$router->get('admin/users/violations', 'AdminUser', 'userViolations');
$router->get('admin/products', 'AdminProduct', 'products');
$router->post('admin/products/approve', 'AdminProduct', 'approveProduct');
$router->post('admin/products/reject', 'AdminProduct', 'rejectProduct');
$router->post('admin/products/delete', 'AdminProduct', 'deleteProduct');
$router->get('admin/categories', 'AdminProduct', 'categories');
$router->post('admin/categories/store', 'AdminProduct', 'storeCategory');
$router->post('admin/categories/update', 'AdminProduct', 'updateCategory');
$router->post('admin/categories/delete', 'AdminProduct', 'deleteCategory');

// Admin Banners
$router->get('banners/image', 'AdminProduct', 'bannerImage'); // ?id= — phục vụ ảnh banner từ DB (public)
$router->get('admin/banners', 'AdminProduct', 'banners');
$router->post('admin/banners/store', 'AdminProduct', 'storeBanner');
$router->post('admin/banners/update', 'AdminProduct', 'updateBanner');
$router->post('admin/banners/toggle', 'AdminProduct', 'toggleBanner');
$router->post('admin/banners/delete', 'AdminProduct', 'deleteBanner');

$router->get('admin/reports', 'AdminReport', 'reports');
$router->get('admin/system-reports', 'AdminReport', 'systemReports');
$router->get('admin/reports/evidence', 'AdminReport', 'evidence'); // ?id= — ảnh tố cáo từ DB (admin)
$router->post('admin/system-reports/resolve', 'AdminReport', 'resolveReport');
$router->get('admin/audit-log', 'Admin', 'auditLog');

// Export
$router->get('admin/export', 'Admin', 'exportData');

// Admin Ratings
$router->get('admin/ratings', 'AdminReport', 'ratings');
$router->post('admin/ratings/toggle', 'AdminReport', 'toggleRating');

// Admin Giveaways Phase 11.4
$router->get('admin/giveaways', 'AdminGiveaway', 'giveaways');
$router->post('admin/giveaways/store', 'AdminGiveaway', 'storeGiveaway');
$router->post('admin/giveaways/delete', 'AdminGiveaway', 'deleteGiveaway');
$router->get('admin/giveaway_spin', 'AdminGiveaway', 'spinGiveaway');
$router->post('admin/giveaway_spin_api', 'AdminGiveaway', 'spinGiveawayApi');

// User Giveaways API
$router->post('api/giveaways/join', 'Giveaway', 'join');
$router->get('giveaways/image', 'Giveaway', 'image'); // ?id= — ảnh giveaway từ DB (public)

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
$router->post('api/chat/offer', 'Chat', 'sendOffer');
$router->post('api/chat/offer/respond', 'Chat', 'respondOffer');

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
