<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use Core\Mailer;
use App\Models\User;
use App\Models\LoginAttempt;
use App\Models\LoginSession;
use App\Services\EmailTemplate;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS  = 5;   
    private const LOCK_MINUTES  = 15;  

    private \App\Models\User         $userModel;
    private \App\Models\LoginAttempt $attemptModel;

    public function __construct()
    {
        $this->userModel    = new User();
        $this->attemptModel = new LoginAttempt();
    }

    public function index(): void
    {
        $this->redirect('products');
    }

    public function loginRole(): void
    {
        Middleware::requireGuest();
        $this->redirectToNextPage();
    }

    public function loginForm(): void
    {
        Middleware::requireGuest();
        $csrf = $this->csrfToken();
        $this->redirectToNextPage();
    }

    public function login(): void
    {
        $this->processLogin('student', 'login', 'products');
    }

    public function adminLoginForm(): void
    {
        Middleware::requireGuest();
        $csrf = $this->csrfToken();
        $this->redirectToNextPage();
    }

    public function adminLogin(): void
    {
        $this->processLogin('admin', 'admin-login', 'admin');
    }
    public function accountLocked(): void
    {
        // Nếu chưa đăng nhập hoặc không bị khóa, redirect
        if (!isset($_SESSION['user'])) {
            $this->redirect('login-role');
            return;
        }
        if (!(($_SESSION['user']['is_locked'] ?? 0) == 1)) {
            $this->redirect('');
            return;
        }

        // Làm mới thông tin khóa từ DB vào session
        $fresh = $this->userModel->findById($_SESSION['user']['id']);
        if ($fresh && (int)$fresh['is_locked'] === 1) {
            $_SESSION['user']['lock_reason']  = $fresh['lock_reason']  ?? null;
            $_SESSION['user']['locked_at']    = $fresh['locked_at']    ?? null;
            $_SESSION['user']['locked_until'] = $fresh['locked_until'] ?? null;
        } elseif ($fresh && (int)$fresh['is_locked'] === 0) {
            // Admin đã mở khóa — cập nhật session và cho vào bình thường
            $_SESSION['user']['is_locked'] = 0;
            $this->redirect('');
            return;
        }

        $appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
        $this->redirectToNextPage();
    }

    private function processLogin(string $expectedRole, string $redirectBack, string $redirectSuccess): void
    {
        Middleware::requireGuest();

        if (!$this->verifyCsrf()) {

            $this->redirect($redirectBack);
            return;
        }

        $ip     = $this->getClientIp();
        $errors = [];
        $old    = ['email' => $this->input('email')];

        $attempts = $this->attemptModel->getCount($ip, self::LOCK_MINUTES);
        if ($attempts >= self::MAX_ATTEMPTS) {
            $minsLeft = $this->attemptModel->getMinutesLeft($ip, self::LOCK_MINUTES);
            $errors['rate_limit'] = "Quá nhiều lần thất bại. Thử lại sau {$minsLeft} phút.";
            $csrf = $this->csrfToken();
            include APP_PATH . $viewFile;
            return;
        }

        $email    = filter_var($this->input('email'), FILTER_SANITIZE_EMAIL);
        $password = $_POST['password'] ?? '';

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Email không hợp lệ.';
        }
        if (empty($password)) {
            $errors['password'] = 'Vui lòng nhập mật khẩu.';
        }

        if (!empty($errors)) {
            $csrf = $this->csrfToken();
            include APP_PATH . $viewFile;
            return;
        }

        $user = $this->userModel->findByEmail($email);

        if (!$user || !password_verify($password, $user['password'])) {
            $this->attemptModel->increment($ip);
            $attemptsLeft = self::MAX_ATTEMPTS - ($attempts + 1);

            if ($attemptsLeft <= 0) {
                $errors['rate_limit'] = 'Tài khoản bị cấm ' . self::LOCK_MINUTES . ' phút do sai quá nhiều.';
            } else {
                Flash::set('danger', "Sai email hoặc mật khẩu. Còn {$attemptsLeft} lần thử.");
            }
            $csrf = $this->csrfToken();
            include APP_PATH . $viewFile;
            return;
        }

        if ($user['role'] !== $expectedRole) {
            Flash::set('danger', "Email này không có quyền hạn truy cập cổng đăng nhập này.");
            $csrf = $this->csrfToken();
            include APP_PATH . $viewFile;
            return;
        }

        if ((int)$user['is_locked'] === 1) {
            // Lưu thông tin khóa vào session để hiển thị trên trang thông báo
            $_SESSION['user'] = [
                'id'           => $user['id'],
                'name'         => $user['name'],
                'email'        => $user['email'],
                'avatar'       => $user['avatar']       ?? null,
                'avatar_url'   => $user['avatar_url']   ?? null,
                'role'         => $user['role'],
                'is_locked'    => 1,
                'lock_reason'  => $user['lock_reason']  ?? null,
                'locked_at'    => $user['locked_at']    ?? null,
                'locked_until' => $user['locked_until'] ?? null,
            ];
            $this->redirect('account-locked');
            return;
        }

        // Phase 11.2 - Verify OTP & 3-day policy for Admin
        $needsOtp      = false;
        $needsUnverify = false; // BUG-004 fix: khởi tạo sớm tránh undefined variable

        if ((int)$user['is_verified'] === 0) {
            // Chỉ bắt OTP với tài khoản CHƯA xác thực lần nào.
            // Đã BỎ chính sách bắt xác thực lại sau mỗi 3 ngày: vừa khiến student
            // phải nhập OTP liên tục, vừa phụ thuộc email (không ổn định trên Railway).
            $needsOtp = true;
        }

        // $needsUnverify đã được khởi tạo ở dòng 172 (false) hoặc dòng 186 (true)

        if ($needsOtp) {
            $otp    = sprintf("%06d", random_int(100000, 999999)); // V4-001 fix: mt_rand → random_int (CSPRNG)
            $otpExp = date('Y-m-d H:i:s', time() + 15 * 60);
            $this->userModel->updateOtp($user['id'], $otp, $otpExp);
            error_log('[OTP] Generated for user ' . $user['id'] . ' at ' . date('Y-m-d H:i:s'));

            $userName = $user['name'];
            $sendOtp  = fn() => Mailer::send($email, "Xác minh tài khoản SinhVienMarket", EmailTemplate::otpVerify($userName, $otp, 15));

            // PERF: trả trang verify-otp NGAY rồi gửi OTP ở nền (không bắt user chờ SMTP ~4s)
            if (function_exists('fastcgi_finish_request')) {
                if ($needsUnverify) {
                    $this->userModel->unverify($user['id']);
                }
                $_SESSION['verify_email'] = $email;
                Flash::set('info', 'Xác minh bảo mật: Mã OTP đang được gửi vào email của bạn.');
                $this->redirectAndRun('verify-otp', $sendOtp);
                return;
            }

            // Fallback (môi trường không hỗ trợ finish_request): gửi đồng bộ, giữ logic fail-open cũ
            try {
                $sendOtp();
                // BUG-11 FIX: Chỉ unverify SAU KHI gửi mail thành công
                if ($needsUnverify) {
                    $this->userModel->unverify($user['id']);
                }
                $_SESSION['verify_email'] = $email;
                Flash::set('info', 'Xác minh bảo mật: Chúng tôi đã gửi mã OTP vào email của bạn.');
                $this->redirect('verify-otp');
                return;
            } catch (\Throwable $e) {
                // Gửi mail thất bại → KHÔNG unverify, cho đăng nhập bình thường
                error_log('OTP mail failed for user ' . $user['id'] . ': ' . $e->getMessage());
                Flash::set('warning', 'Hệ thống không thể gửi OTP lúc này. Bạn vẫn được đăng nhập bình thường.');
                // Cho luồng tiếp tục tới phần đăng nhập bình thường bên dưới
            }
        }

        $this->attemptModel->reset($ip);
        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id'                  => $user['id'],
            'name'                => $user['name'],
            'email'               => $user['email'],
            'avatar'              => $user['avatar']              ?? null,
            'avatar_url'          => $user['avatar_url']          ?? null,
            'role'                => $user['role'],
            'is_locked'           => $user['is_locked'],
            'is_student_verified' => $user['is_student_verified'] ?? 0,
            'coins'               => $this->userModel->getCoins($user['id']),
        ];

        // ─── Feature 3A: Ghi lịch sử đăng nhập + cảnh báo thiết bị lạ ─────────────
        try {
            $ip        = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $ip        = explode(',', $ip)[0]; // proxy trước
            $ua        = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $sessionMdl = new LoginSession();
            $isNewDevice = $sessionMdl->record($user['id'], $ip, $ua);

            if ($isNewDevice) {
                $time = date('d/m/Y H:i:s');
                $device = $_SERVER['HTTP_USER_AGENT'] ?? 'Không rõ';
                Mailer::send(
                    $user['email'],
                    'Cảnh báo bảo mật: Đăng nhập từ thiết bị lạ — SinhVienMarket',
                    EmailTemplate::newDeviceLogin($user['name'], $ip, $time, $device)
                );
            }
        } catch (\Throwable $e) {
            // Không để lỗi ghi log phá vỡ luồng đăng nhập
            error_log('LoginSession error: ' . $e->getMessage());
        }

        Flash::set('success', 'Chào mừng trở lại, ' . $user['name'] . '!');
        $this->redirect($redirectSuccess);
    }

    public function registerForm(): void
    {
        Middleware::requireGuest();
        $csrf = $this->csrfToken();
        $this->redirectToNextPage();
    }

    public function register(): void
    {
        Middleware::requireGuest();

        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên làm việc hết hạn. Vui lòng thử lại.');
            $this->redirect('register');
            return;
        }

        // ─── Rate Limiting cho Đăng ký ────────────────────────────────────────
        // Chặn spam tạo tài khoản: tối đa 3 lần / 10 phút theo IP
        $ip = $this->getClientIp();
        $regKey    = 'reg_attempts_' . md5($ip);
        $regTimeKey= 'reg_first_at_' . md5($ip);
        $regCount  = (int)($_SESSION[$regKey]    ?? 0);
        $regFirst  = (int)($_SESSION[$regTimeKey] ?? 0);
        $regWindow = 10 * 60; // 10 phút

        // Reset cửa sổ nếu đã qua 10 phút
        if ($regFirst > 0 && (time() - $regFirst) >= $regWindow) {
            $regCount = 0;
            unset($_SESSION[$regKey], $_SESSION[$regTimeKey]);
        }

        if ($regCount >= 3) {
            $minsLeft = max(1, (int)ceil(($regWindow - (time() - $regFirst)) / 60));
            Flash::set('danger', "Bạn đã tạo quá nhiều tài khoản. Vui lòng đợi {$minsLeft} phút rồi thử lại.");
            $csrf = $this->csrfToken();
            $this->redirectToNextPage();
            return;
        }
        // ─────────────────────────────────────────────────────────────────────

        $name            = $this->input('name');
        $email           = filter_var($this->input('email'), FILTER_SANITIZE_EMAIL);
        $phone           = $this->input('phone');
        $password        = $_POST['password'] ?? '';
        $passwordConfirm = $_POST['password_confirm'] ?? '';
        
        $question        = $this->input('security_question');
        $answer          = $this->input('security_answer');

        $old    = ['name' => $name, 'email' => $email, 'phone' => $phone, 'security_question' => $question, 'security_answer' => $answer];
        $errors = [];

        if (mb_strlen($name) < 2 || mb_strlen($name) > 100) { $errors['name'] = 'Họ tên từ 2 - 100 ký tự.'; }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors['email'] = 'Email không hợp lệ.'; }
        elseif ($this->userModel->findByEmail($email)) { $errors['email'] = 'Email này đã tồn tại.'; }
        
        if ($phone && !preg_match('/^(0|\+84)[0-9]{8,10}$/', $phone)) { $errors['phone'] = 'Số điện thoại không hợp lệ.'; }
        if (strlen($password) < 8) {
            $errors['password'] = 'Mật khẩu phải có ít nhất 8 ký tự.';
        } elseif (!preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
            $errors['password'] = 'Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 chữ số.';
        }
        if ($password !== $passwordConfirm) { $errors['password_confirm'] = 'Mật khẩu xác nhận không khớp.'; }
        if (empty($question) || empty($answer)) { $errors['security_question'] = 'Vui lòng điền câu hỏi và câu trả lời bảo mật.'; }

        if (!empty($errors)) {
            $csrf = $this->csrfToken();
            $this->redirectToNextPage();
            return;
        }

        $otp = sprintf("%06d", random_int(100000, 999999)); // V4-001 fix: mt_rand → random_int (CSPRNG)
        $otpExp = date('Y-m-d H:i:s', time() + 15 * 60);

        $userId = $this->userModel->create($name, $email, $password, $phone, $question, $answer, $otp, $otpExp);

        if (!$userId) {
            Flash::set('danger', 'Không thể tạo tài khoản lúc này.');
            $csrf = $this->csrfToken();
            $this->redirectToNextPage();
            return;
        }

        // Ghi nhận lượt đăng ký thành công vào bộ đếm
        if ($regCount === 0) {
            $_SESSION[$regTimeKey] = time();
        }
        $_SESSION[$regKey] = $regCount + 1;

        $_SESSION['verify_email'] = $email;
        Flash::set('success', "Đăng ký thành công! Vui lòng nhập mã OTP đã được gửi đến email $email.");

        $sendOtp = fn() => Mailer::send($email, "Xác minh tài khoản SinhVienMarket", EmailTemplate::otpVerify($name, $otp, 15));
        // PERF: trả trang verify-otp NGAY rồi gửi OTP ở nền (không bắt user chờ SMTP)
        if (function_exists('fastcgi_finish_request')) {
            $this->redirectAndRun('verify-otp', $sendOtp);
            return;
        }
        $sendOtp();
        $this->redirect('verify-otp');
    }

    // ─── OTP / 2FA ────────────────────────────────────────────────────────

    public function logout(): void
    {
        $role = $_SESSION['user']['role'] ?? 'student';
        
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }
        session_destroy();
        
        session_start();
        Flash::set('success', 'Đã đăng xuất thành công.');
        
        if ($role === 'admin') {
            $this->redirect('admin-login');
        } else {
            $this->redirect('login-role');
        }
    }

    private function getClientIp(): string
    {
        foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'] as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = explode(',', $_SERVER[$key])[0];
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return '0.0.0.0';
    }
}
