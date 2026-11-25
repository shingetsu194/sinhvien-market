<?php

namespace App\Controllers;

use App\Models\Auction;
use App\Models\BankAccount;
use App\Models\Category;
use App\Models\Conversation;
use App\Models\LoginAttempt;
use App\Models\LoginSession;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wishlist;
use App\Services\AIModerationService;
use App\Services\EmailTemplate;
use App\Services\MomoService;
use App\Services\NotificationService;
use App\Services\VietQRService;
use App\Services\ZaloPayService;
use Config\Database;
use Core\ApiController;
use Core\Mailer;

/**
 * JSON adapters for the migrated Next.js user flows.
 * These endpoints use the existing PHP session, models and marketplace rules.
 */
class NextApiController extends ApiController
{
    private const BUMP_COST = 50;
    private const BUMP_COOLDOWN_HOURS = 6;

    public function csrf(): void
    {
        $this->success(['token' => $this->csrfToken()]);
    }

    public function register(): void
    {
        $this->requireCsrf();
        $data = $this->requestData();
        $name = trim($this->text($data, 'name'));
        $email = filter_var(trim($this->text($data, 'email')), FILTER_SANITIZE_EMAIL);
        $phone = trim($this->text($data, 'phone'));
        $password = $this->text($data, 'password');
        $passwordConfirm = $this->text($data, 'passwordConfirm', $this->text($data, 'password_confirm'));
        $question = $this->text($data, 'securityQuestion', $this->text($data, 'security_question'));
        $answer = trim($this->text($data, 'securityAnswer', $this->text($data, 'security_answer')));

        $ipKey = md5($this->clientIp());
        $countKey = 'reg_attempts_' . $ipKey;
        $firstAtKey = 'reg_first_at_' . $ipKey;
        $count = (int)($_SESSION[$countKey] ?? 0);
        $firstAt = (int)($_SESSION[$firstAtKey] ?? 0);
        if ($firstAt > 0 && time() - $firstAt >= 600) {
            $count = 0;
            unset($_SESSION[$countKey], $_SESSION[$firstAtKey]);
        }
        if ($count >= 3) {
            $this->error('RATE_LIMITED', 'Bạn đã tạo quá nhiều tài khoản. Vui lòng thử lại sau.', 429);
        }

        if (mb_strlen($name) < 2 || mb_strlen($name) > 100
            || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || ($phone !== '' && !preg_match('/^(0|\+84)[0-9]{8,10}$/', $phone))
            || strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password)
            || $password !== $passwordConfirm
            || !in_array($question, ['q1', 'q2', 'q3'], true) || $answer === '') {
            $this->validationError('Thông tin đăng ký không hợp lệ.');
        }

        $users = new User();
        if ($users->findByEmail($email)) {
            $this->error('EMAIL_EXISTS', 'Email này đã tồn tại.', 409);
        }

        $otp = sprintf('%06d', random_int(100000, 999999));
        $expiresAt = date('Y-m-d H:i:s', time() + 900);
        $userId = $users->create($name, $email, $password, $phone, $question, $answer, $otp, $expiresAt);
        if ($userId < 1) {
            $this->error('REGISTRATION_FAILED', 'Không thể tạo tài khoản lúc này.', 500);
        }

        $_SESSION[$firstAtKey] = $count === 0 ? time() : $firstAt;
        $_SESSION[$countKey] = $count + 1;
        $_SESSION['verify_email'] = $email;
        $_SESSION['verify_role'] = 'student';
        unset($_SESSION['otp_fail_count'], $_SESSION['otp_resend_count'], $_SESSION['otp_resend_first_at']);
        try {
            Mailer::send($email, 'Xác minh tài khoản SinhVienMarket', EmailTemplate::otpVerify($name, $otp, 15));
        } catch (\Throwable $e) {
            error_log('API registration OTP mail failed for user ' . $userId . ': ' . $e->getMessage());
            $this->error('OTP_DELIVERY_FAILED', 'Tài khoản đã được tạo nhưng không thể gửi mã xác minh. Vui lòng thử đăng nhập để gửi lại mã.', 503);
        }
        $this->created([
            'status' => 'verify_otp',
            'email' => $email,
            'message' => 'Đăng ký thành công. Vui lòng nhập mã OTP đã gửi đến email.',
        ], 'Đăng ký thành công.');
    }

    public function me(): void
    {
        if (!$this->isLoggedIn()) {
            $this->success(null);
        }
        $user = $this->requireAuthenticatedUser();
        $this->success($this->authDto($user));
    }

    public function lockedInfo(): void
    {
        $sessionUser = $this->currentUser();
        if (!$sessionUser || empty($sessionUser['id'])) {
            $this->error('NOT_AUTHENTICATED', 'Bạn cần đăng nhập để truy cập thông tin khóa tài khoản.', 401);
        }
        $user = (new User())->findById((int)$sessionUser['id']);
        if (!$user || ($user['role'] ?? '') !== 'student') {
            $this->unauthorized();
        }
        if ((int)($user['is_locked'] ?? 0) !== 1) {
            unset($_SESSION['user']['is_locked'], $_SESSION['user']['lock_reason'], $_SESSION['user']['locked_at'], $_SESSION['user']['locked_until']);
            $this->error('NOT_LOCKED', 'Tài khoản không bị khóa.', 409);
        }
        $_SESSION['user']['is_locked'] = 1;
        $_SESSION['user']['lock_reason'] = $user['lock_reason'] ?? null;
        $_SESSION['user']['locked_at'] = $user['locked_at'] ?? null;
        $_SESSION['user']['locked_until'] = $user['locked_until'] ?? null;
        $this->success([
            'name' => (string)$user['name'],
            'email' => (string)$user['email'],
            'reason' => $user['lock_reason'] ?? null,
            'lockedAt' => $user['locked_at'] ?? null,
            'lockedUntil' => $user['locked_until'] ?? null,
        ]);
    }

    public function login(): void
    {
        $this->requireCsrf();
        $data = $this->requestData();
        $role = $this->text($data, 'role', 'student');
        if (!in_array($role, ['student', 'admin'], true)) {
            $this->error('WRONG_ROLE', 'Cổng đăng nhập không hợp lệ.', 403);
        }
        $email = filter_var(trim($this->text($data, 'email')), FILTER_SANITIZE_EMAIL);
        $password = $this->text($data, 'password');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            $this->validationError('Email hoặc mật khẩu không hợp lệ.');
        }

        $ip = $this->clientIp();
        $attempts = new LoginAttempt();
        if ($attempts->getCount($ip, 15) >= 5) {
            $this->error('RATE_LIMITED', 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.', 429);
        }

        $users = new User();
        $user = $users->findByEmail($email);
        if (!$user || ($user['role'] ?? '') !== $role || !password_verify($password, $user['password'])) {
            $attempts->increment($ip);
            $this->error('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 401);
        }
        if ((int)$user['is_locked'] === 1) {
            if ($role === 'admin') {
                $this->error('ACCOUNT_LOCKED', 'Tài khoản quản trị đang bị khóa.', 423);
            }
            // Mirror the existing HTML locked-account flow: permit only a
            // restricted session so the client can retrieve lock information.
            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'is_locked' => 1,
                'lock_reason' => $user['lock_reason'] ?? null,
                'locked_at' => $user['locked_at'] ?? null,
                'locked_until' => $user['locked_until'] ?? null,
            ];
            unset($_SESSION['session_token']);
            $this->success([
                'status' => 'locked',
                'lock' => [
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'reason' => $user['lock_reason'] ?? null,
                    'lockedAt' => $user['locked_at'] ?? null,
                    'lockedUntil' => $user['locked_until'] ?? null,
                ],
            ]);
        }

        if ((int)($user['is_verified'] ?? 0) !== 1) {
            $otp = sprintf('%06d', random_int(100000, 999999));
            $users->updateOtp((int)$user['id'], $otp, date('Y-m-d H:i:s', time() + 900));
            $_SESSION['verify_email'] = $email;
            $_SESSION['verify_role'] = $role;
            unset($_SESSION['otp_fail_count'], $_SESSION['otp_resend_count'], $_SESSION['otp_resend_first_at']);
            try {
                Mailer::send($email, 'Xác minh tài khoản SinhVienMarket', EmailTemplate::otpVerify($user['name'], $otp, 15));
            } catch (\Throwable $e) {
                error_log('API OTP mail failed for user ' . (int)$user['id'] . ': ' . $e->getMessage());
                $this->error('OTP_DELIVERY_FAILED', 'Không thể gửi mã xác minh. Vui lòng thử lại hoặc dùng trang xác minh.', 503);
            }
            $this->success(['status' => 'verify_otp', 'email' => $email, 'message' => 'Cần xác minh OTP trước khi đăng nhập.']);
        }

        $attempts->reset($ip);
        session_regenerate_id(true);
        $this->establishSession($user, $users);
        $csrf = $this->csrfToken();
        try {
            (new LoginSession())->record((int)$user['id'], $ip, $_SERVER['HTTP_USER_AGENT'] ?? '');
        } catch (\Throwable $e) {
            error_log('API LoginSession error: ' . $e->getMessage());
        }
        $this->success([
            'status' => 'ok',
            'user' => $this->authDto($user),
            'redirectTo' => $role === 'admin' ? '/admin' : '/products',
            'message' => 'Đăng nhập thành công.',
            'csrfToken' => $csrf,
        ]);
    }

    public function logout(): void
    {
        // Any signed-in account (student, admin, dorm staff) must be able to log
        // out; requireUser() is student-only and made admin logout return 403.
        // Logging out an already-expired session is a no-op success.
        $this->requireCsrf();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        $this->success(['message' => 'Đã đăng xuất.']);
    }

    public function otpSession(): void
    {
        if (empty($_SESSION['verify_email'])) {
            $this->error('NO_VERIFY_SESSION', 'Không có phiên xác minh OTP đang hoạt động.', 401);
        }
        $count = (int)($_SESSION['otp_resend_count'] ?? 0);
        $this->success([
            'email' => (string)$_SESSION['verify_email'],
            'role' => ($_SESSION['verify_role'] ?? 'student') === 'admin' ? 'admin' : 'student',
            'resendRemaining' => max(0, 3 - $count),
        ]);
    }

    public function verifyOtp(): void
    {
        $this->requireCsrf();
        $email = (string)($_SESSION['verify_email'] ?? '');
        $role = (string)($_SESSION['verify_role'] ?? 'student');
        if ($email === '') {
            $this->error('NO_VERIFY_SESSION', 'Không có phiên xác minh OTP đang hoạt động.', 401);
        }
        $failCount = (int)($_SESSION['otp_fail_count'] ?? 0);
        if ($failCount >= 5) {
            unset($_SESSION['verify_email'], $_SESSION['verify_role'], $_SESSION['otp_fail_count'], $_SESSION['otp_resend_count'], $_SESSION['otp_resend_first_at']);
            $this->error('OTP_SESSION_CANCELLED', 'Phiên xác minh bị hủy do nhập sai quá nhiều lần.', 429);
        }
        $otp = $this->text($this->requestData(), 'otp', $this->text($this->requestData(), 'otp_code'));
        if (!preg_match('/^\d{6}$/', $otp)) {
            $this->validationError('Mã OTP phải gồm 6 chữ số.');
        }
        $model = new User();
        $user = $model->findByEmail($email);
        if (!$user || !hash_equals((string)($user['otp_code'] ?? ''), $otp)) {
            $_SESSION['otp_fail_count'] = $failCount + 1;
            if ($_SESSION['otp_fail_count'] >= 5) {
                unset($_SESSION['verify_email'], $_SESSION['verify_role'], $_SESSION['otp_fail_count'], $_SESSION['otp_resend_count'], $_SESSION['otp_resend_first_at']);
                $this->error('OTP_SESSION_CANCELLED', 'Phiên xác minh bị hủy do nhập sai quá nhiều lần.', 429);
            }
            $this->error('OTP_INVALID', 'Mã OTP không chính xác.', 422);
        }
        if (empty($user['otp_expires_at']) || strtotime($user['otp_expires_at']) < time()) {
            $this->error('OTP_EXPIRED', 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.', 422);
        }
        if (($user['role'] ?? '') !== $role) { $this->forbidden('Phiên xác minh không hợp lệ.'); }
        if ((int)($user['is_locked'] ?? 0) === 1) { $this->error('ACCOUNT_LOCKED', 'Tài khoản đang bị khóa.', 423); }
        $model->verifyOtp((int)$user['id']);
        if ($role === 'student' && User::isStudentEmail($user['email'])) {
            $model->verifyStudent((int)$user['id']);
            $user['is_student_verified'] = 1;
        }
        unset($_SESSION['verify_email'], $_SESSION['verify_role'], $_SESSION['otp_fail_count'], $_SESSION['otp_resend_count'], $_SESSION['otp_resend_first_at']);
        session_regenerate_id(true);
        $this->establishSession($user, $model);
        $this->success([
            'user' => $this->authDto($user),
            'redirectTo' => $role === 'admin' ? '/admin' : '/products',
            'message' => 'Xác minh thành công.',
            'csrfToken' => $this->csrfToken(),
        ]);
    }

    public function resendOtp(): void
    {
        $this->requireCsrf();
        $email = (string)($_SESSION['verify_email'] ?? '');
        $role = (string)($_SESSION['verify_role'] ?? 'student');
        if ($email === '') {
            $this->error('NO_VERIFY_SESSION', 'Không có phiên xác minh OTP đang hoạt động.', 401);
        }
        $count = (int)($_SESSION['otp_resend_count'] ?? 0);
        $firstAt = (int)($_SESSION['otp_resend_first_at'] ?? 0);
        if ($firstAt > 0 && time() - $firstAt >= 600) {
            $count = 0;
            $firstAt = 0;
        }
        if ($count >= 3) {
            $this->error('RATE_LIMITED', 'Đã gửi lại OTP quá nhiều lần.', 429);
        }
        $model = new User();
        $user = $model->findByEmail($email);
        if (!$user) {
            $this->error('NO_VERIFY_SESSION', 'Tài khoản xác minh không còn tồn tại.', 401);
        }
        if (($user['role'] ?? '') !== $role) {
            $this->forbidden('Phiên xác minh không hợp lệ.');
        }
        $otp = sprintf('%06d', random_int(100000, 999999));
        $model->updateOtp((int)$user['id'], $otp, date('Y-m-d H:i:s', time() + 900));
        $_SESSION['otp_resend_first_at'] = $firstAt ?: time();
        $_SESSION['otp_resend_count'] = $count + 1;
        try {
            Mailer::send($email, 'Xác minh tài khoản SinhVienMarket', EmailTemplate::otpVerify($user['name'], $otp, 15));
        } catch (\Throwable $e) {
            error_log('API OTP resend failed for user ' . (int)$user['id'] . ': ' . $e->getMessage());
            $this->error('OTP_DELIVERY_FAILED', 'Không thể gửi lại mã xác minh.', 503);
        }
        $this->success(['resendRemaining' => max(0, 3 - ($count + 1)), 'message' => 'Đã gửi lại mã OTP.']);
    }

    public function forgotPasswordQuestion(): void
    {
        $data = $this->requestData();
        $email = filter_var(trim($this->text($data, 'email')), FILTER_SANITIZE_EMAIL);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->validationError('Email không hợp lệ.');
        }
        $user = (new User())->findByEmail($email);
        if (!$user) {
            $this->error('EMAIL_NOT_FOUND', 'Email không tồn tại.', 404);
        }
        $labels = [
            'q1' => 'Tên trường cấp 1 của bạn là gì?',
            'q2' => 'Tên thú cưng đầu tiên của bạn?',
            'q3' => 'Bạn thân thời thơ ấu của bạn tên gì?',
        ];
        $question = $labels[$user['security_question'] ?? ''] ?? null;
        if ($question === null || empty($user['security_answer'])) {
            $this->error('NO_SECURITY_QUESTION', 'Email chưa cài đặt câu hỏi bảo mật.', 404);
        }
        $this->success(['email' => $email, 'question' => $question]);
    }

    public function forgotPasswordAnswer(): void
    {
        $this->requireCsrf();
        $data = $this->requestData();
        $email = filter_var(trim($this->text($data, 'email')), FILTER_SANITIZE_EMAIL);
        $answer = trim($this->text($data, 'securityAnswer', $this->text($data, 'security_answer')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $answer === '') {
            $this->validationError('Email hoặc câu trả lời bảo mật không hợp lệ.');
        }

        // Bound guessing within a session; do not reveal or return the reset token to the browser.
        $attemptKey = 'reset_answer_' . hash('sha256', strtolower($email));
        $attempt = $_SESSION[$attemptKey] ?? ['count' => 0, 'firstAt' => time()];
        if (time() - (int)$attempt['firstAt'] >= 900) {
            $attempt = ['count' => 0, 'firstAt' => time()];
        }
        if ((int)$attempt['count'] >= 5) {
            $this->error('RATE_LIMITED', 'Quá nhiều lần thử câu trả lời. Vui lòng thử lại sau.', 429);
        }

        $model = new User();
        $user = $model->findByEmail($email);
        if (!$user) {
            $this->error('EMAIL_NOT_FOUND', 'Email không tồn tại.', 404);
        }
        if (empty($user['security_question']) || empty($user['security_answer'])) {
            $this->error('NO_SECURITY_QUESTION', 'Email chưa cài đặt câu hỏi bảo mật.', 404);
        }
        if (!password_verify(mb_strtolower($answer), (string)$user['security_answer'])) {
            $attempt['count'] = (int)$attempt['count'] + 1;
            $_SESSION[$attemptKey] = $attempt;
            $this->error('SECURITY_ANSWER_INCORRECT', 'Câu trả lời bảo mật không chính xác.', 400);
        }

        unset($_SESSION[$attemptKey]);
        $token = bin2hex(random_bytes(16));
        $model->updateOtp((int)$user['id'], $token, date('Y-m-d H:i:s', time() + 900));
        $appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'http://localhost/sinhvien-market'), '/');
        $resetLink = $appUrl . '/reset-password?token=' . rawurlencode($token) . '&email=' . rawurlencode($email);
        try {
            Mailer::send($email, 'Khôi phục mật khẩu SinhVienMarket', EmailTemplate::resetPassword($user['name'], $resetLink));
        } catch (\Throwable $e) {
            error_log('API password reset mail failed for user ' . (int)$user['id'] . ': ' . $e->getMessage());
            $this->error('RESET_EMAIL_FAILED', 'Không thể gửi liên kết đặt lại mật khẩu. Vui lòng thử lại.', 503);
        }
        $this->success(['message' => 'Hãy kiểm tra email để lấy liên kết đổi mật khẩu.']);
    }

    public function resetPassword(): void
    {
        $this->requireCsrf();
        $data = $this->requestData();
        $email = filter_var(trim($this->text($data, 'email')), FILTER_SANITIZE_EMAIL);
        $token = $this->text($data, 'token');
        $password = $this->text($data, 'password');
        $confirm = $this->text($data, 'passwordConfirm', $this->text($data, 'password_confirm'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $token === ''
            || strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password)
            || $password !== $confirm) {
            $this->validationError('Thông tin đặt lại mật khẩu không hợp lệ.');
        }
        $model = new User();
        $user = $model->findByEmail($email);
        if (!$user || empty($user['otp_code']) || !hash_equals((string)$user['otp_code'], $token)
            || empty($user['otp_expires_at']) || strtotime($user['otp_expires_at']) < time()) {
            $this->error('RESET_LINK_INVALID', 'Liên kết hết hạn hoặc không hợp lệ.', 400);
        }
        $model->updatePassword((int)$user['id'], $password);
        $this->success(['message' => 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.']);
    }

    public function profileMe(): void
    {
        $sessionUser = $this->requireUser();
        $user = (new User())->findById((int)$sessionUser['id']);
        if (!$user) {
            $this->notFound('Không tìm thấy tài khoản.');
        }
        $bank = (new BankAccount())->findByUserId((int)$user['id']);
        $rank = (new User())->getRankLevel((int)$user['id']);
        $history = [];
        try {
            $history = (new LoginSession())->getByUser((int)$user['id'], 15);
        } catch (\Throwable $e) {}
        $avatar = null;
        if (!empty($user['avatar'])) {
            $blob = (new User())->getAvatarBlob((int)$user['id']);
            if ($blob && !empty($blob['data'])) {
                $avatar = 'data:' . $blob['mime'] . ';base64,' . base64_encode($blob['data']);
            }
        } elseif (!empty($user['avatar_url'])) {
            $avatar = $user['avatar_url'];
        }
        $this->success([
            'id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email'],
            'phone' => $user['phone'] ?? '', 'university' => $user['university'] ?? '',
            'studentId' => $user['student_id'] ?? '', 'dormitoryAddress' => $user['dormitory_address'] ?? '',
            'socialContact' => $user['social_contact'] ?? '', 'bio' => $user['bio'] ?? '',
            'availableTime' => $user['available_time'] ?? '', 'avatarDataUrl' => $avatar,
            'createdAt' => $user['created_at'] ?? null, 'emailVerified' => (bool)($user['is_verified'] ?? false),
            'studentVerified' => (bool)($user['is_student_verified'] ?? false), 'coins' => (int)($user['coins'] ?? 0),
            'rankName' => $rank['name'], 'rankIcon' => $rank['icon'], 'rankColor' => $rank['color'],
            'securityQuestion' => $user['security_question'] ?? null,
            'bankAccount' => $bank ? [
                'bankName' => $bank['bank_name'],
                'bankCode' => $bank['bank_code'],
                'accountNo' => $bank['account_no'],
                'accountName' => $bank['account_name'],
            ] : null,
            'loginHistory' => array_map(static fn(array $item): array => [
                'id' => (int)$item['id'], 'loggedAt' => $item['logged_at'],
                'ipAddress' => $item['ip_address'], 'deviceInfo' => $item['device_info'],
                'isCurrent' => false, 'isNewDevice' => (bool)$item['is_new_device'],
            ], $history),
        ]);
    }

    public function publicProfile(): void
    {
        $id = $this->integer($_GET['id'] ?? null, 'id');
        $user = $id > 0 ? (new User())->findById($id) : null;
        if (!$user || ($user['role'] ?? '') !== 'student' || (int)($user['is_locked'] ?? 0) === 1) {
            $this->notFound('Không tìm thấy hồ sơ.');
        }
        $ratings = (new \App\Models\Rating())->getByRatee($id);
        $stats = (new \App\Models\Rating())->getStats($id);
        $avatar = null;
        if (!empty($user['avatar'])) {
            $blob = (new User())->getAvatarBlob($id);
            if ($blob && !empty($blob['data'])) { $avatar = 'data:' . $blob['mime'] . ';base64,' . base64_encode($blob['data']); }
        } else {
            $avatar = $user['avatar_url'] ?? null;
        }
        $activeProducts = array_values(array_filter((new Product())->getByUser($id), static fn(array $p): bool => $p['status'] === 'active'));
        $this->success([
            'id' => (int)$user['id'],
            'name' => (string)$user['name'],
            'avatarDataUrl' => $avatar,
            'studentVerified' => (bool)($user['is_student_verified'] ?? false),
            'createdAt' => $user['created_at'] ?? null,
            'bio' => $user['bio'] ?? '', 'university' => $user['university'] ?? '',
            'dormitoryAddress' => $user['dormitory_address'] ?? '',
            'socialContact' => $user['social_contact'] ?? '', 'availableTime' => $user['available_time'] ?? '',
            'averageRating' => $stats['avg'], 'ratingCount' => $stats['count'],
            'reviews' => array_map(static fn(array $r): array => [
                'id' => (int)$r['id'], 'raterName' => $r['rater_name'], 'productTitle' => $r['product_title'],
                'stars' => (int)$r['stars'], 'comment' => $r['comment'], 'createdAt' => $r['created_at'],
            ], $ratings),
            'activeProducts' => array_map(fn(array $p): array => $this->productDto($p, $user), $activeProducts),
        ]);
    }

    public function updateProfile(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $name = trim($this->text($data, 'name'));
        if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
            $this->validationError('Họ tên phải từ 2 đến 100 ký tự.');
        }
        $phone = trim($this->text($data, 'phone'));
        if ($phone !== '' && !preg_match('/^(0|\+84)[0-9]{8,10}$/', $phone)) {
            $this->validationError('Số điện thoại không hợp lệ.');
        }
        $profile = [];
        foreach ([
            'university' => 'university', 'student_id' => 'studentId',
            'dormitory_address' => 'dormitoryAddress', 'social_contact' => 'socialContact',
            'bio' => 'bio', 'available_time' => 'availableTime',
        ] as $key => $camel) {
            $profile[$key] = trim($this->text($data, $camel, $this->text($data, $key)));
        }
        try {
            (new User())->updateProfile((int)$user['id'], array_merge($profile, ['name' => $name, 'phone' => $phone]));
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                $this->error('STUDENT_NUMBER_EXISTS', 'Mã số sinh viên đã được sử dụng.', 409);
            }
            throw $e;
        }
        $_SESSION['user']['name'] = $name;
        $fresh = (new User())->findById((int)$user['id']);
        $this->success($this->ownProfileDto($fresh ?? array_merge($user, ['name' => $name])), 'Cập nhật hồ sơ thành công.');
    }

    public function updatePassword(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $model = new User();
        $fresh = $model->findById((int)$user['id']);
        $old = $this->text($data, 'currentPassword', $this->text($data, 'old_password'));
        $new = $this->text($data, 'newPassword', $this->text($data, 'new_password'));
        $confirm = $this->text($data, 'confirmPassword', $this->text($data, 'confirm_password'));
        if (!$fresh || !password_verify($old, $fresh['password'])) {
            $this->error('INVALID_PASSWORD', 'Mật khẩu hiện tại không chính xác.', 422);
        }
        if (strlen($new) < 8 || !preg_match('/[A-Z]/', $new) || !preg_match('/[0-9]/', $new)) {
            $this->validationError('Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa và chữ số.');
        }
        if ($new !== $confirm) {
            $this->validationError('Mật khẩu xác nhận không khớp.');
        }
        $model->updatePassword((int)$user['id'], $new);
        $this->success(null, 'Đổi mật khẩu thành công.');
    }

    public function saveBank(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $keys = ['bank_name' => 'bankName', 'bank_code' => 'bankCode', 'account_no' => 'accountNo', 'account_name' => 'accountName'];
        foreach ($keys as $key => $camel) {
            if (trim($this->text($data, $camel, $this->text($data, $key))) === '') {
                $this->validationError('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng.');
            }
        }
        (new BankAccount())->save((int)$user['id'], trim($this->text($data, 'bankName', $this->text($data, 'bank_name'))), trim($this->text($data, 'bankCode', $this->text($data, 'bank_code'))), trim($this->text($data, 'accountNo', $this->text($data, 'account_no'))), trim($this->text($data, 'accountName', $this->text($data, 'account_name'))));
        $this->success(null, 'Đã lưu tài khoản ngân hàng.');
    }

    public function saveSecurityQuestion(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $question = $this->text($data, 'securityQuestion', $this->text($data, 'security_question'));
        $answer = trim($this->text($data, 'securityAnswer', $this->text($data, 'security_answer')));
        if (!in_array($question, ['q1', 'q2', 'q3'], true) || $answer === '') {
            $this->validationError('Câu hỏi và câu trả lời bảo mật không hợp lệ.');
        }
        (new User())->setSecurityQuestion((int)$user['id'], $question, $answer);
        $this->success(null, 'Đã cập nhật câu hỏi bảo mật.');
    }

    public function uploadAvatar(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $file = $_FILES['avatar'] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || ($file['size'] ?? 0) > 10 * 1024 * 1024) {
            $this->validationError('Vui lòng chọn ảnh có kích thước tối đa 10 MB.');
        }
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
            $this->validationError('Định dạng ảnh không được hỗ trợ.');
        }
        $model = new User();
        $model->saveAvatarImage((int)$user['id'], file_get_contents($file['tmp_name']), $mime);
        $model->changeAvatar((int)$user['id'], 'db');
        $_SESSION['user']['avatar'] = 'db';
        $this->success(['avatarUrl' => $this->avatarUrl((int)$user['id'], ['avatar' => 'db'])], 'Cập nhật ảnh đại diện thành công.');
    }

    public function products(): void
    {
        $user = $this->requireUser();
        $rows = (new Product())->getByUser((int)$user['id']);
        $this->success(array_map(fn(array $p): array => $this->productDto($p, $user), $rows));
    }

    public function createProduct(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $title = trim($this->text($data, 'title'));
        $description = trim($this->text($data, 'description'));
        $categoryValue = $data['categoryId'] ?? $data['category_id'] ?? null;
        $categoryId = (is_string($categoryValue) || is_int($categoryValue))
            ? filter_var($categoryValue, FILTER_VALIDATE_INT)
            : false;
        $type = $this->text($data, 'type', 'sale');
        $condition = $this->text($data, 'condition', 'used');
        if (mb_strlen($title) < 5 || mb_strlen($title) > 200 || mb_strlen($description) < 10) {
            $this->validationError('Tiêu đề phải từ 5 đến 200 ký tự và mô tả ít nhất 10 ký tự.');
        }
        if (!$categoryId || !(new Category())->findById((int)$categoryId)) {
            $this->validationError('Danh mục không hợp lệ.');
        }
        if (!in_array($type, ['sale', 'exchange', 'auction'], true) || !in_array($condition, ['new', 'like_new', 'used', 'worn'], true)) {
            $this->validationError('Loại hoặc tình trạng sản phẩm không hợp lệ.');
        }
        $price = $type === 'sale' ? $this->money($data['price'] ?? null) : null;
        $start = $floor = $decrease = null;
        $stepValue = $data['stepMinutes'] ?? $data['step_minutes'] ?? 10;
        if (!is_string($stepValue) && !is_int($stepValue)) {
            $this->validationError('Chu kỳ đấu giá không hợp lệ.');
        }
        $step = (int)$stepValue;
        if ($type === 'sale' && (!$price || $price <= 0)) {
            $this->validationError('Giá bán phải lớn hơn 0.');
        }
        if ($type === 'auction') {
            $start = $this->money($data['startPrice'] ?? $data['start_price'] ?? null);
            $floor = $this->money($data['floorPrice'] ?? $data['floor_price'] ?? null);
            $decrease = $this->money($data['decreaseAmount'] ?? $data['decrease_amount'] ?? null);
            if (!$start || !$floor || !$decrease || $floor >= $start || $step < 1) {
                $this->validationError('Thông số đấu giá không hợp lệ.');
            }
        }
        $image = null;
        $mime = null;
        if (isset($_FILES['image']) && ($_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $file = $_FILES['image'];
            if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || ($file['size'] ?? 0) > 3 * 1024 * 1024) {
                $this->validationError('Ảnh không hợp lệ hoặc vượt quá 3 MB.');
            }
            $mime = mime_content_type($file['tmp_name']);
            if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
                $this->validationError('Định dạng ảnh không được hỗ trợ.');
            }
            $image = file_get_contents($file['tmp_name']);
        }

        $products = new Product();
        $productId = $products->create([
            'user_id' => (int)$user['id'], 'category_id' => (int)$categoryId,
            'title' => $title, 'description' => $description, 'image' => $image !== null ? 'db' : null,
            'type' => $type, 'price' => $price, 'condition' => $condition,
        ]);
        if ($image !== null) {
            $products->saveImage($productId, $image, $mime);
        }
        if ($type === 'auction') {
            (new Auction())->createAuction($productId, $start, $floor, $decrease, $step);
        }

        try {
            $review = AIModerationService::reviewProduct($title, $description);
        } catch (\Throwable $e) {
            error_log('API product moderation failed: ' . $e->getMessage());
            $review = ['status' => 'suspicious', 'reason' => 'Không thể xác minh tự động; cần Admin duyệt.'];
        }
        $products->updateAiReview($productId, $review['status'], $review['reason'] ?? '');
        $status = 'pending';
        if ($review['status'] === 'safe') {
            $status = 'active';
            $products->updateStatus($productId, 'active');
            // Auto-approved by AI moderation: embed now so AI search finds it immediately (best effort).
            try { (new \App\Services\Matching\SmartSearchService())->indexProduct($productId); } catch (\Throwable $e) { error_log('Embedding on approval failed: ' . $e->getMessage()); }
            try { NotificationService::notifyProductApproved((int)$user['id'], $user['email'], $user['name'], $productId, $title); } catch (\Throwable $e) {}
        } elseif ($review['status'] === 'violation') {
            $status = 'cancelled';
            $products->updateStatus($productId, 'cancelled');
            try { NotificationService::notifyProductRejected((int)$user['id'], $user['email'], $user['name'], $productId, $title, 'AI phát hiện nội dung vi phạm.'); } catch (\Throwable $e) {}
        }
        $created = null;
        foreach ($products->getByUser((int)$user['id']) as $row) {
            if ((int)$row['id'] === $productId) { $created = $row; break; }
        }
        $created ??= ['id' => $productId, 'user_id' => $user['id'], 'title' => $title, 'description' => $description, 'category_id' => $categoryId, 'type' => $type, 'price' => $price, 'condition' => $condition, 'status' => $status];
        $this->created($this->productDto($created, $user), 'Đã tiếp nhận bài đăng.');
    }

    public function deleteProduct(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $id = $this->integer($_GET['id'] ?? $this->requestData()['id'] ?? null, 'id');
        $productModel = new Product();
        $product = $id > 0 ? $productModel->findById($id) : null;
        if (!$product || (int)$product['user_id'] !== (int)$user['id']) {
            $this->notFound('Không tìm thấy bài đăng của bạn.');
        }
        if ($product['status'] === 'sold') {
            $this->error('LISTING_SOLD', 'Không thể thu hồi sản phẩm đã bán.', 409);
        }
        if ($productModel->hasTransactions($id)) {
            $this->error('LISTING_HAS_TRANSACTION', 'Không thể thu hồi sản phẩm đã có giao dịch.', 409);
        }
        $productModel->updateStatus($id, 'cancelled');
        $this->success(['id' => $id, 'message' => 'Đã thu hồi bài đăng.']);
    }

    public function conversations(): void
    {
        $user = $this->requireUser();
        $rows = (new Conversation())->getByUser((int)$user['id']);
        $this->success(array_map(fn(array $c): array => $this->conversationDto($c, (int)$user['id']), $rows));
    }

    public function startConversation(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $productId = $this->integer($data['productId'] ?? $data['product_id'] ?? null, 'productId');
        $product = $productId > 0 ? (new Product())->findById($productId) : null;
        if (!$product || $product['status'] !== 'active') {
            $this->notFound('Không tìm thấy sản phẩm đang hoạt động.');
        }
        if ((int)$product['user_id'] === (int)$user['id']) {
            $this->validationError('Không thể bắt đầu hội thoại với chính mình.');
        }
        $id = (new Conversation())->findOrCreate($productId, (int)$user['id'], (int)$product['user_id']);
        $offer = $this->integer($data['offer_price'] ?? null, 'offer_price');
        if ($offer > 0) {
            (new Message())->sendOffer($id, (int)$user['id'], $offer);
        }
        $conversation = null;
        foreach ((new Conversation())->getByUser((int)$user['id']) as $row) {
            if ((int)$row['id'] === $id) { $conversation = $row; break; }
        }
        $this->created($conversation ? $this->conversationDto($conversation, (int)$user['id']) : ['id' => $id], 'Đã mở hội thoại.');
    }

    public function transactions(): void
    {
        $user = $this->requireUser();
        $rows = (new Transaction())->getByUser((int)$user['id']);
        $this->success(array_map(fn(array $tx): array => $this->transactionDto($tx, (int)$user['id']), $rows));
    }

    public function transactionPaymentInfo(): void
    {
        $user = $this->requireUser();
        $id = $this->integer($_GET['id'] ?? null, 'id');
        $transaction = (new Transaction())->findById($id);
        if (!$transaction || (int)$transaction['buyer_id'] !== (int)$user['id']) {
            $this->notFound('Không tìm thấy giao dịch cần thanh toán.');
        }

        $bankAccount = null;
        $qrUrl = null;
        if ($transaction['payment_method'] === 'banking') {
            $bankAccount = (new BankAccount())->findByUserId((int)$transaction['seller_id']);
            if ($bankAccount) {
                $qrUrl = VietQRService::generateQRUrl(
                    (string)$bankAccount['bank_code'],
                    (string)$bankAccount['account_no'],
                    (int)$transaction['amount'],
                    'DH ' . (int)$transaction['id'],
                    (string)$bankAccount['account_name']
                );
            }
        }

        $this->success([
            'id' => (int)$transaction['id'],
            'amount' => (int)$transaction['amount'],
            'paymentMethod' => $transaction['payment_method'],
            'paymentStatus' => $transaction['payment_status'],
            'orderStatus' => $transaction['order_status'],
            'hasPaymentProof' => !empty($transaction['payment_proof']),
            'bankAccount' => $bankAccount ? [
                'bankName' => $bankAccount['bank_name'],
                'bankCode' => $bankAccount['bank_code'],
                'accountNo' => $bankAccount['account_no'],
                'accountName' => $bankAccount['account_name'],
                'qrUrl' => $qrUrl,
            ] : null,
        ]);
    }

    public function startTransactionPayment(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $id = $this->integer($data['id'] ?? null, 'id');
        $transaction = (new Transaction())->findById($id);
        if (!$transaction || (int)$transaction['buyer_id'] !== (int)$user['id']) {
            $this->notFound('Không tìm thấy giao dịch cần thanh toán.');
        }
        if (!in_array($transaction['payment_method'], ['zalopay', 'momo'], true)) {
            $this->validationError('Giao dịch này không sử dụng cổng thanh toán trực tuyến.');
        }
        if ($transaction['payment_status'] === 'paid' || $transaction['order_status'] !== 'pending') {
            $this->error('PAYMENT_NOT_AVAILABLE', 'Giao dịch không còn chờ thanh toán.', 409);
        }

        $result = $transaction['payment_method'] === 'zalopay'
            ? ZaloPayService::createPayment(
                $id,
                (int)$transaction['amount'],
                'Thanh toán SinhVienMarket #' . $id
            )
            : MomoService::createPayment(
                $id,
                (int)$transaction['amount'],
                'SinhVienMarket ĐH #' . $id
            );

        $paymentUrl = $result['payUrl'] ?? '';
        $parts = is_string($paymentUrl) ? parse_url($paymentUrl) : false;
        if (empty($result['success']) || $parts === false
            || strtolower((string)($parts['scheme'] ?? '')) !== 'https'
            || empty($parts['host'])) {
            $this->error(
                'PAYMENT_PROVIDER_ERROR',
                (string)($result['message'] ?? 'Không thể khởi tạo thanh toán. Vui lòng thử lại.'),
                502
            );
        }

        $this->success(['redirectUrl' => $paymentUrl]);
    }

    public function uploadTransactionPaymentProof(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $id = $this->integer($_POST['id'] ?? null, 'id');
        $transaction = (new Transaction())->findById($id);
        if (!$transaction || (int)$transaction['buyer_id'] !== (int)$user['id']) {
            $this->notFound('Không tìm thấy giao dịch cần thanh toán.');
        }
        if ($transaction['payment_method'] !== 'banking'
            || $transaction['payment_status'] !== 'pending'
            || $transaction['order_status'] !== 'pending') {
            $this->error('PAYMENT_NOT_AVAILABLE', 'Giao dịch không còn chờ xác nhận chuyển khoản.', 409);
        }

        $file = $_FILES['proof'] ?? null;
        if (!is_array($file) || !isset($file['error'], $file['tmp_name'], $file['size'])
            || (int)$file['error'] !== UPLOAD_ERR_OK) {
            $this->validationError('Vui lòng chọn ảnh biên lai chuyển khoản hợp lệ.');
        }
        if ((int)$file['size'] < 1 || (int)$file['size'] > 3 * 1024 * 1024
            || !is_uploaded_file((string)$file['tmp_name'])) {
            $this->validationError('Ảnh biên lai phải nhỏ hơn 3 MB.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file((string)$file['tmp_name']);
        $image = @getimagesize((string)$file['tmp_name']);
        $allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!is_string($mime) || !in_array($mime, $allowedMime, true)
            || $image === false || $image['mime'] !== $mime) {
            $this->validationError('Tệp tải lên phải là ảnh JPG, PNG, WEBP hoặc GIF.');
        }

        $bytes = file_get_contents((string)$file['tmp_name']);
        if ($bytes === false) {
            $this->error('UPLOAD_FAILED', 'Không thể đọc ảnh biên lai. Vui lòng thử lại.', 500);
        }
        $transactionModel = new Transaction();
        $transactionModel->saveProofImage($id, $bytes, $mime);
        $transactionModel->updatePaymentProof($id, 'db');
        $this->success(['hasPaymentProof' => true], 'Đã gửi biên lai. Đang chờ người bán xác nhận.');
    }

    public function confirmTransactionBankPayment(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $id = $this->integer($data['id'] ?? null, 'id');
        $db = Database::getInstance();

        try {
            $db->beginTransaction();
            $stmt = $db->prepare('SELECT * FROM transactions WHERE id = ? FOR UPDATE');
            $stmt->execute([$id]);
            $transaction = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$transaction || (int)$transaction['seller_id'] !== (int)$user['id']) {
                $db->rollBack();
                $this->notFound('Không tìm thấy giao dịch cần xác nhận.');
            }
            if ($transaction['payment_method'] !== 'banking'
                || $transaction['payment_status'] !== 'pending'
                || $transaction['order_status'] !== 'pending') {
                $db->rollBack();
                $this->error('PAYMENT_NOT_AVAILABLE', 'Giao dịch không còn chờ xác nhận chuyển khoản.', 409);
            }
            $proofStmt = $db->prepare('SELECT 1 FROM transaction_proofs WHERE transaction_id = ? LIMIT 1');
            $proofStmt->execute([$id]);
            if (!$proofStmt->fetchColumn()) {
                $db->rollBack();
                $this->error('PAYMENT_PROOF_REQUIRED', 'Người mua chưa tải lên biên lai chuyển khoản.', 409);
            }

            $db->prepare(
                'UPDATE transactions
                 SET payment_status = "paid", payment_confirmed_at = NOW(), order_status = "shipping"
                 WHERE id = ?'
            )->execute([$id]);
            $db->prepare('UPDATE products SET status = "sold" WHERE id = ?')->execute([$transaction['product_id']]);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        $this->success(['message' => 'Đã xác nhận nhận tiền và chuyển đơn hàng sang trạng thái đang giao.']);
    }

    public function updateTransactionStatus(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $id = $this->integer($data['id'] ?? null, 'id');
        $status = $this->text($data, 'status');
        if (!in_array($status, ['shipping', 'delivered', 'cancelled', 'completed'], true)) {
            $this->validationError('Trạng thái giao dịch không hợp lệ.');
        }
        $db = Database::getInstance();
        try {
            $db->beginTransaction();
            $stmt = $db->prepare('SELECT * FROM transactions WHERE id = ? FOR UPDATE');
            $stmt->execute([$id]);
            $tx = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$tx) {
                $db->rollBack();
                $this->notFound('Không tìm thấy giao dịch.');
            }
            $isBuyer = (int)$tx['buyer_id'] === (int)$user['id'];
            $isSeller = (int)$tx['seller_id'] === (int)$user['id'];
            $current = $tx['order_status'];
            $sellerAllowed = ($status === 'shipping' && $current === 'pending')
                || ($status === 'delivered' && $current === 'shipping')
                || ($status === 'cancelled' && in_array($current, ['pending', 'shipping'], true));
            $buyerAllowed = $isBuyer && $status === 'completed' && in_array($current, ['shipping', 'delivered'], true);
            if (!(($isSeller && $sellerAllowed) || $buyerAllowed)) {
                $db->rollBack();
                $this->error('INVALID_TRANSITION', 'Không được phép chuyển giao dịch sang trạng thái này.', 409);
            }
            if ($status === 'shipping'
                && $tx['payment_method'] !== 'cod'
                && $tx['payment_status'] !== 'paid') {
                $db->rollBack();
                $this->error('PAYMENT_NOT_CONFIRMED', 'Chỉ có thể giao đơn sau khi đã xác nhận thanh toán.', 409);
            }
            if ($status === 'cancelled'
                && ($tx['payment_status'] === 'paid' || !empty($tx['payment_proof']))) {
                $db->rollBack();
                $this->error('PAYMENT_NOT_AVAILABLE', 'Không thể hủy đơn sau khi đã có biên lai hoặc thanh toán được xác nhận.', 409);
            }
            $db->prepare('UPDATE transactions SET order_status = ? WHERE id = ?')->execute([$status, $id]);
            if ($status === 'cancelled') {
                $db->prepare('UPDATE products SET status = "active" WHERE id = ? AND status = "sold"')->execute([$tx['product_id']]);
            }
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) { $db->rollBack(); }
            throw $e;
        }
        $this->success(['message' => 'Đã cập nhật trạng thái giao dịch.']);
    }

    public function checkout(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $kind = $this->text($data, 'type', 'sale');
        $productId = $this->integer($data['productId'] ?? $data['target_id'] ?? null, 'productId');
        if (!array_key_exists('type', $data) && $productId > 0) {
            $candidate = (new Product())->findById($productId);
            if (($candidate['type'] ?? '') === 'exchange') {
                $this->error('EXCHANGE_UNSUPPORTED', 'Giao dịch trao đổi chưa được hỗ trợ; chưa có quy trình chấp nhận và hoàn tất trao đổi.', 422);
            }
            if (($candidate['type'] ?? '') === 'auction') {
                $kind = 'auction';
            }
        }
        if ($kind === 'exchange') {
            $this->error('EXCHANGE_UNSUPPORTED', 'Giao dịch trao đổi chưa được hỗ trợ; chưa có quy trình chấp nhận và hoàn tất trao đổi.', 422);
        }
        if ($kind === 'auction') {
            $auctionId = $this->integer($data['auction_id'] ?? $data['target_id'] ?? null, 'auction_id');
            if ($auctionId === 0 && $productId > 0) {
                $auctionId = (int)((new Auction())->findByProduct($productId)['id'] ?? 0);
            }
            $auctionModel = new Auction();
            $auction = $auctionModel->findById($auctionId);
            if (!$auction || $auction['status'] !== 'active') {
                $this->notFound('Phiên đấu giá không còn hoạt động.');
            }
            $product = (new Product())->findById((int)$auction['product_id']);
            if (!$product || $product['status'] !== 'active' || $product['type'] !== 'auction'
                || (int)$product['user_id'] === (int)$user['id']) {
                $this->error('INVALID_PURCHASE', 'Không thể mua phiên đấu giá này.', 409);
            }
            $txId = $auctionModel->lockAndBuy($auctionId, (int)$user['id']);
            if (!$txId) {
                $this->error('AUCTION_ENDED', 'Phiên đấu giá vừa kết thúc hoặc đã có người mua.', 409);
            }
            $lockedTransaction = (new Transaction())->findById($txId);
            if (!$lockedTransaction) {
                $this->error('TRANSACTION_NOT_FOUND', 'Không thể tải giao dịch vừa tạo.', 500);
            }
            $price = (int)$lockedTransaction['amount'];
            try {
                $seller = (new User())->findById((int)$product['user_id']);
                if ($seller) {
                    NotificationService::notifyItemSold((int)$seller['id'], $seller['email'], $seller['name'], (int)$product['id'], $product['title'], $user['name'], $price);
                }
            } catch (\Throwable $e) {
                error_log('API auction notification failed: ' . $e->getMessage());
            }
            $this->created($this->findTransactionDto($txId, (int)$user['id']), 'Đã chốt mua đấu giá.');
        }
        if ($kind !== 'sale') {
            $this->validationError('Loại giao dịch không hợp lệ.');
        }
        $targetId = $productId;
        $method = $this->text($data, 'paymentMethod', $this->text($data, 'payment_method', 'cod'));
        if (!in_array($method, ['cod', 'banking', 'zalopay', 'momo'], true)) {
            $this->validationError('Phương thức thanh toán không hợp lệ.');
        }
        $db = Database::getInstance();
        try {
            $db->beginTransaction();
            $productModel = new Product();
            $product = $productModel->findByIdForUpdate($targetId);
            if (($product['type'] ?? '') === 'exchange') {
                $db->rollBack();
                $this->error('EXCHANGE_UNSUPPORTED', 'Giao dịch trao đổi chưa được hỗ trợ; chưa có quy trình chấp nhận và hoàn tất trao đổi.', 422);
            }
            if (!$product || $product['status'] !== 'active' || $product['type'] !== 'sale') {
                $db->rollBack();
                $this->error('PRODUCT_UNAVAILABLE', 'Sản phẩm không còn bán hoặc không hỗ trợ mua trực tiếp.', 409);
            }
            if ((int)$product['user_id'] === (int)$user['id']) {
                $db->rollBack();
                $this->validationError('Không thể mua sản phẩm của chính mình.');
            }
            $amount = (int)$product['price'];
            $sellerId = (int)$product['user_id'];
            if ($method !== 'momo') {
                $productModel->updateStatus($targetId, 'sold');
            }
            $shippingAddress = trim($this->text($data, 'shippingAddress', $this->text($data, 'shipping_address')));
            if (mb_strlen($shippingAddress) < 8) {
                $db->rollBack();
                $this->validationError('Địa chỉ giao hàng phải có ít nhất 8 ký tự.');
            }
            $txId = (new Transaction())->createTransaction((int)$user['id'], $sellerId, $targetId, $amount, $method, $shippingAddress);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) { $db->rollBack(); }
            throw $e;
        }
        $this->created($this->findTransactionDto($txId, (int)$user['id']), 'Đã tạo giao dịch.');
    }

    public function notifications(): void
    {
        $user = $this->requireUser();
        $model = new Notification();
        $items = $model->getByUser((int)$user['id'], 100);
        $this->success(array_map(static fn(array $n): array => [
            'id' => (int)$n['id'], 'title' => $n['title'], 'body' => $n['body'] ?? '',
            'type' => $n['type'], 'href' => $n['link'], 'isRead' => (bool)$n['is_read'],
            'createdAt' => $n['created_at'],
        ], $items));
    }

    public function markNotificationRead(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $data = $this->requestData();
        $model = new Notification();
        if (!empty($data['mark_all'])) {
            $model->markAllRead((int)$user['id']);
        } else {
            $id = $this->integer($data['id'] ?? null, 'id');
            if ($id < 1) { $this->validationError('Mã thông báo không hợp lệ.'); }
            $model->markRead($id, (int)$user['id']);
        }
        $this->success(null, 'Đã cập nhật thông báo.');
    }

    public function rewards(): void
    {
        $user = $this->requireUser();
        $model = new User();
        $fresh = $model->findById((int)$user['id']);
        $last = $fresh['last_checkin'] ?? null;
        $streak = (int)($fresh['checkin_streak'] ?? 0);
        if ($last && $last !== date('Y-m-d') && $last !== date('Y-m-d', strtotime('-1 day'))) { $streak = 0; }
        $this->success([
            'balance' => (int)($fresh['coins'] ?? 0), 'checkinStreak' => $streak,
            'checkedInToday' => $last === date('Y-m-d'),
            'nextCheckinReward' => $streak === 6 ? 50 : 10,
        ]);
    }

    public function checkin(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $model = new User();
        if (!$model->canCheckin((int)$user['id'])) {
            $this->error('ALREADY_CHECKED_IN', 'Bạn đã điểm danh hôm nay.', 409);
        }
        $result = $model->doCheckin((int)$user['id']);
        if ($result['bonus'] === 0) { $this->error('ALREADY_CHECKED_IN', 'Bạn đã điểm danh hôm nay.', 409); }
        $coins = $model->getCoins((int)$user['id']);
        $_SESSION['user']['coins'] = $coins;
        $this->success([
            'balance' => $coins, 'checkinStreak' => $result['streak'],
            'checkedInToday' => true, 'nextCheckinReward' => $result['streak'] === 6 ? 50 : 10,
        ], 'Điểm danh thành công.');
    }

    public function bump(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $rewardData = $this->requestData();
        $productId = $this->integer($rewardData['productId'] ?? $rewardData['product_id'] ?? null, 'productId');
        $db = Database::getInstance();
        try {
            $db->beginTransaction();
            $productModel = new Product();
            $product = $productModel->findByIdForUpdate($productId);
            if (!$product || (int)$product['user_id'] !== (int)$user['id']) {
                $db->rollBack();
                $this->notFound('Không tìm thấy bài đăng của bạn.');
            }
            if ($product['status'] !== 'active') {
                $db->rollBack();
                $this->error('LISTING_INACTIVE', 'Chỉ có thể đẩy bài đăng đang hoạt động.', 409);
            }
            if (!empty($product['bumped_at']) && (time() - strtotime($product['bumped_at'])) < self::BUMP_COOLDOWN_HOURS * 3600) {
                $db->rollBack();
                $this->error('BUMP_COOLDOWN', 'Bài đăng đang trong thời gian chờ trước lần đẩy tiếp theo.', 409);
            }
            if (!(new User())->spendCoins((int)$user['id'], self::BUMP_COST)) {
                $db->rollBack();
                $this->error('INSUFFICIENT_COINS', 'Bạn không đủ xu để đẩy tin.', 422);
            }
            $productModel->bump($productId);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) { $db->rollBack(); }
            throw $e;
        }
        $coins = (new User())->getCoins((int)$user['id']);
        $_SESSION['user']['coins'] = $coins;
        $fresh = (new User())->findById((int)$user['id']);
        $streak = (int)($fresh['checkin_streak'] ?? 0);
        $this->success([
            'balance' => $coins, 'checkinStreak' => $streak,
            'checkedInToday' => ($fresh['last_checkin'] ?? null) === date('Y-m-d'),
            'nextCheckinReward' => $streak === 6 ? 50 : 10,
        ], 'Đã đẩy bài đăng.');
    }

    public function wishlist(): void
    {
        $user = $this->requireUser();
        $rows = (new Wishlist())->getByUser((int)$user['id']);
        $this->success(array_map(fn(array $w): array => $this->wishlistDto($w), $rows));
    }

    public function toggleWishlist(): void
    {
        $user = $this->requireUser();
        $this->requireCsrf();
        $toggleData = $this->requestData();
        $productId = $this->integer($toggleData['productId'] ?? $toggleData['product_id'] ?? null, 'productId');
        $product = $productId > 0 ? (new Product())->findById($productId) : null;
        if (!$product || $product['status'] !== 'active') { $this->notFound('Không tìm thấy sản phẩm đang hoạt động.'); }
        $model = new Wishlist();
        if ($model->exists((int)$user['id'], $productId)) {
            $model->remove((int)$user['id'], $productId);
            $this->success(['action' => 'removed', 'productId' => $productId]);
        }
        $model->add((int)$user['id'], $productId, !empty($product['price']) ? (int)$product['price'] : null);
        $this->success(['action' => 'added', 'productId' => $productId]);
    }

    private function requireUser(): array
    {
        $user = $this->requireAuthenticatedUser();
        if (($user['role'] ?? '') !== 'student') {
            $this->forbidden('API này chỉ dành cho tài khoản sinh viên.');
        }
        return $user;
    }

    private function requireAuthenticatedUser(): array
    {
        $session = $this->currentUser();
        if (!$session || empty($session['id'])) { $this->unauthorized(); }
        $model = new User();
        $user = $model->findById((int)$session['id']);
        if (!$user) { $this->unauthorized(); }
        if ((int)($user['is_locked'] ?? 0) === 1) { $this->error('ACCOUNT_LOCKED', 'Tài khoản đang bị khóa.', 423); }
        $dbToken = (string)($user['session_token'] ?? '');
        $sessionToken = (string)($_SESSION['session_token'] ?? '');
        if ($sessionToken !== '' && $dbToken !== '' && !hash_equals($dbToken, $sessionToken)) {
            $this->unauthorized('Phiên đăng nhập đã bị thay thế.');
        }
        if ($sessionToken === '') {
            $sessionToken = bin2hex(random_bytes(16));
            $_SESSION['session_token'] = $sessionToken;
            $model->setSessionToken((int)$user['id'], $sessionToken);
        } elseif ($dbToken === '') {
            $model->setSessionToken((int)$user['id'], $sessionToken);
        }
        return $user;
    }

    private function establishSession(array $user, User $model): void
    {
        $token = bin2hex(random_bytes(16));
        $model->setSessionToken((int)$user['id'], $token);
        $_SESSION['session_token'] = $token;
        $_SESSION['user'] = [
            'id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email'],
            'avatar' => $user['avatar'] ?? null, 'avatar_url' => $user['avatar_url'] ?? null,
            'role' => $user['role'], 'is_locked' => 0,
            'is_student_verified' => (int)($user['is_student_verified'] ?? 0),
            'coins' => $model->getCoins((int)$user['id']),
        ];
    }

    private function authDto(array $user): array
    {
        return [
            'id' => (int)$user['id'], 'name' => $user['name'],
            'email' => $user['email'], 'role' => $user['role'],
            'roles' => (new \App\Models\AccessControl())->rolesForUser((int)$user['id']),
        ];
    }

    private function ownProfileDto(array $user): array
    {
        $bank = (new BankAccount())->findByUserId((int)$user['id']);
        $rank = (new User())->getRankLevel((int)$user['id']);
        $avatar = null;
        if (!empty($user['avatar'])) {
            $blob = (new User())->getAvatarBlob((int)$user['id']);
            if ($blob && !empty($blob['data'])) { $avatar = 'data:' . $blob['mime'] . ';base64,' . base64_encode($blob['data']); }
        } elseif (!empty($user['avatar_url'])) {
            $avatar = $user['avatar_url'];
        }
        return [
            'id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email'],
            'phone' => $user['phone'] ?? '', 'university' => $user['university'] ?? '',
            'studentId' => $user['student_id'] ?? '', 'dormitoryAddress' => $user['dormitory_address'] ?? '',
            'socialContact' => $user['social_contact'] ?? '', 'bio' => $user['bio'] ?? '',
            'availableTime' => $user['available_time'] ?? '', 'avatarDataUrl' => $avatar,
            'createdAt' => $user['created_at'] ?? '', 'emailVerified' => (bool)($user['is_verified'] ?? false),
            'studentVerified' => (bool)($user['is_student_verified'] ?? false), 'coins' => (int)($user['coins'] ?? 0),
            'rankName' => $rank['name'], 'rankIcon' => $rank['icon'], 'rankColor' => $rank['color'],
            'securityQuestion' => $user['security_question'] ?? null,
            'bankAccount' => $bank ? [
                'bankName' => $bank['bank_name'], 'bankCode' => $bank['bank_code'],
                'accountNo' => $bank['account_no'], 'accountName' => $bank['account_name'],
            ] : null,
            'loginHistory' => [],
        ];
    }

    private function avatarUrl(int $id, array $user): ?string
    {
        if (!empty($user['avatar'])) {
            return rtrim((string)($_ENV['APP_URL'] ?? ''), '/') . '/users/avatar?id=' . $id;
        }
        return !empty($user['avatar_url']) ? (string)$user['avatar_url'] : null;
    }

    private function productDto(array $p, ?array $owner = null): array
    {
        $price = isset($p['price']) ? (int)$p['price'] : null;
        if ($price === null && $p['type'] === 'auction' && isset($p['start_price'])) { $price = (int)$p['start_price']; }
        $currentPrice = null;
        $isAtFloor = null;
        if (($p['type'] ?? '') === 'auction' && ($p['auction_status'] ?? '') === 'active' && !empty($p['started_at'])) {
            $auctionPrice = Auction::calculateCurrentPrice($p);
            $currentPrice = $auctionPrice['current_price'];
            $isAtFloor = $auctionPrice['is_at_floor'];
        }
        return [
            'id' => (int)$p['id'], 'title' => $p['title'],
            'categoryId' => (int)$p['category_id'], 'categoryName' => $p['category_name'] ?? '',
            'sellerId' => (int)($p['user_id'] ?? $owner['id'] ?? 0),
            'sellerName' => $p['seller_name'] ?? $owner['name'] ?? '',
            'type' => $p['type'], 'status' => $p['status'], 'price' => $price,
            'condition' => $p['condition'], 'imageUrl' => !empty($p['image']) ? $this->publicUrl('/products/image?id=' . (int)$p['id']) : null,
            'createdAt' => $p['created_at'] ?? date('c'), 'sellerVerified' => (bool)($owner['is_student_verified'] ?? false),
            'currentPrice' => $currentPrice, 'isAtFloor' => $isAtFloor,
            'hasTransactions' => (new Product())->hasTransactions((int)$p['id']),
            'rejectionReason' => $p['ai_review_note'] ?? null, 'description' => $p['description'] ?? '',
        ];
    }

    private function conversationDto(array $c, int $userId): array
    {
        $isBuyer = (int)$c['buyer_id'] === $userId;
        return [
            'id' => (int)$c['id'], 'ownerId' => $userId,
            'productId' => (int)$c['product_id'], 'productTitle' => $c['product_title'],
            'otherUserId' => $isBuyer ? (int)$c['seller_id'] : (int)$c['buyer_id'],
            'otherUserName' => $isBuyer ? $c['seller_name'] : $c['buyer_name'],
            'lastMessage' => $c['last_message'] ?? '',
            'updatedAt' => $c['last_message_at'] ?? $c['created_at'],
            'unreadCount' => (int)$c['unread_count'],
        ];
    }

    private function transactionDto(array $tx, int $userId): array
    {
        return [
            'id' => (int)$tx['id'], 'productId' => (int)$tx['product_id'],
            'productTitle' => $tx['product_title'] ?? '[Sản phẩm đã xóa]',
            'buyerId' => (int)$tx['buyer_id'], 'buyerName' => $tx['buyer_name'] ?? '',
            'sellerId' => (int)$tx['seller_id'], 'sellerName' => $tx['seller_name'] ?? '',
            'type' => ($tx['type'] ?? '') === 'auction' ? 'auction' : 'sale',
            'amount' => (int)$tx['amount'], 'paymentMethod' => $tx['payment_method'],
            'orderStatus' => $tx['order_status'], 'createdAt' => $tx['created_at'],
            'paymentStatus' => $tx['payment_status'] ?? 'pending',
            'hasPaymentProof' => !empty($tx['payment_proof']),
            'role' => (int)$tx['buyer_id'] === $userId ? 'buyer' : 'seller',
            'shippingAddress' => $tx['shipping_address'] ?? '',
        ];
    }

    private function findTransactionDto(int $id, int $userId): array
    {
        foreach ((new Transaction())->getByUser($userId) as $row) {
            if ((int)$row['id'] === $id) { return $this->transactionDto($row, $userId); }
        }
        $this->error('TRANSACTION_NOT_FOUND', 'Không thể tải giao dịch vừa tạo.', 500);
    }

    private function wishlistDto(array $w): array
    {
        $currentPrice = isset($w['current_price']) ? (int)$w['current_price'] : null;
        $isAtFloor = null;
        if (($w['type'] ?? '') === 'auction' && ($w['auction_status'] ?? '') === 'active' && !empty($w['started_at'])) {
            $price = Auction::calculateCurrentPrice($w);
            $currentPrice = $price['current_price'];
            $isAtFloor = $price['is_at_floor'];
        }
        return [
            'id' => (int)$w['product_id'], 'title' => $w['title'],
            'categoryId' => (int)$w['category_id'], 'categoryName' => $w['category_name'],
            'sellerId' => (int)$w['user_id'], 'sellerName' => $w['seller_name'],
            'type' => $w['type'], 'price' => $currentPrice,
            'condition' => $w['condition'], 'status' => $w['status'],
            'hasTransactions' => (new Product())->hasTransactions((int)$w['product_id']), 'rejectionReason' => null,
            'createdAt' => $w['product_created_at'], 'imageUrl' => !empty($w['image']) ? $this->publicUrl('/products/image?id=' . (int)$w['product_id']) : null,
            'sellerVerified' => (bool)$w['seller_verified'], 'currentPrice' => $currentPrice, 'isAtFloor' => $isAtFloor,
            'savedAt' => $w['created_at'],
        ];
    }

    private function money(mixed $value): ?int
    {
        if (!is_string($value) && !is_int($value) && !is_float($value)) { return null; }
        $text = (string)$value;
        if (!preg_match('/^[0-9.,]+$/', $text)) { return null; }
        $digits = str_replace(['.', ','], '', $text);
        return ctype_digit($digits) ? (int)$digits : null;
    }

    private function text(array $data, string $key, string $default = ''): string
    {
        $value = $data[$key] ?? $default;
        if (!is_string($value) && !is_int($value) && !is_float($value)) {
            $this->validationError('Trường "' . $key . '" không hợp lệ.');
        }
        return (string)$value;
    }

    private function integer(mixed $value, string $field, int $default = 0): int
    {
        if ($value === null) { return $default; }
        if (!is_string($value) && !is_int($value)) {
            $this->validationError('Trường "' . $field . '" phải là số nguyên.');
        }
        $parsed = filter_var($value, FILTER_VALIDATE_INT);
        if ($parsed === false || $parsed < 0) {
            $this->validationError('Trường "' . $field . '" không hợp lệ.');
        }
        return (int)$parsed;
    }

    private function publicUrl(string $path): string
    {
        return rtrim((string)($_ENV['APP_URL'] ?? ''), '/') . $path;
    }

    private function clientIp(): string
    {
        $candidate = $_SERVER['REMOTE_ADDR'] ?? '';
        return filter_var($candidate, FILTER_VALIDATE_IP) ? $candidate : '0.0.0.0';
    }
}
