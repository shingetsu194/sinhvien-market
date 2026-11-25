<?php

namespace App\Controllers;

use Core\Controller;
use App\Models\User;
use Core\Flash;

/**
 * GoogleAuthController — Xử lý luồng OAuth 2.0 với Google
 * Không sử dụng thư viện bên ngoài, implement thuần bằng PHP + cURL
 */
class GoogleAuthController extends Controller
{
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;

    private const AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const USER_URL  = 'https://www.googleapis.com/oauth2/v3/userinfo';

    public function __construct()
    {
        $this->clientId     = getenv('GOOGLE_CLIENT_ID')     ?: ($_ENV['GOOGLE_CLIENT_ID'] ?? '');
        $this->clientSecret = getenv('GOOGLE_CLIENT_SECRET') ?: ($_ENV['GOOGLE_CLIENT_SECRET'] ?? '');
        $this->redirectUri  = getenv('GOOGLE_REDIRECT_URI')  ?: ($_ENV['GOOGLE_REDIRECT_URI'] ?? '');
    }

    // ─── Bước 1: Redirect người dùng đến Google ─────────────────────────────
    public function redirectToGoogle(): void
    {
        // Tạo state token chống CSRF
        $state = bin2hex(random_bytes(16));
        $_SESSION['oauth_state'] = $state;

        $params = http_build_query([
            'client_id'     => $this->clientId,
            'redirect_uri'  => $this->redirectUri,
            'response_type' => 'code',
            'scope'         => 'openid email profile',
            'access_type'   => 'online',
            'state'         => $state,
            'prompt'        => 'select_account',
        ]);

        $url = self::AUTH_URL . '?' . $params;
        header('Location: ' . $url);
        exit;
    }

    // ─── Bước 2: Nhận callback từ Google ────────────────────────────────────
    public function callback(): void
    {
        // 1. Kiểm tra lỗi từ Google
        // Next.js cannot read PHP Flash messages, so every failure also carries
        // ?oauth_error=<code> (shown by the /login page) and is logged.
        if (isset($_GET['error'])) {
            error_log('Google OAuth: provider returned error=' . preg_replace('/[^a-z_]/i', '', (string)$_GET['error']));
            Flash::set('error', 'Đăng nhập Google bị hủy: ' . htmlspecialchars($_GET['error']));
            $this->redirect('/login?oauth_error=cancelled');
            return;
        }

        // 2. Kiểm tra state chống CSRF
        if (empty($_GET['state']) || $_GET['state'] !== ($_SESSION['oauth_state'] ?? '')) {
            error_log('Google OAuth: state mismatch (session cookie missing or expired?)');
            Flash::set('error', 'Yêu cầu không hợp lệ. Vui lòng thử lại.');
            $this->redirect('/login?oauth_error=state');
            return;
        }
        unset($_SESSION['oauth_state']);

        // 3. Đổi authorization code lấy access token
        $code        = $_GET['code'] ?? '';
        $tokenData   = $this->fetchAccessToken($code);

        if (empty($tokenData['access_token'])) {
            Flash::set('error', 'Không thể xác thực với Google. Vui lòng thử lại.');
            $this->redirect('/login?oauth_error=token');
            return;
        }

        // 4. Lấy thông tin user từ Google
        $googleUser = $this->fetchGoogleUser($tokenData['access_token']);

        if (empty($googleUser['email'])) {
            Flash::set('error', 'Không lấy được thông tin từ Google. Vui lòng thử lại.');
            $this->redirect('/login?oauth_error=profile');
            return;
        }

        $googleId  = $googleUser['sub']     ?? '';
        $email     = $googleUser['email']   ?? '';
        $name      = $googleUser['name']    ?? $email;
        $avatarUrl = $googleUser['picture'] ?? '';
        // Google chỉ chứng minh quyền sở hữu hộp thư khi email_verified === true.
        $emailVerified = ($googleUser['email_verified'] ?? false) === true;
        // Without a verified address, linking by email would let anyone who adds
        // a victim's address to a Google account take over that local account.
        if (!$emailVerified || $googleId === '') {
            error_log('Google OAuth: refused unverified Google email');
            Flash::set('error', 'Email Google chưa được xác minh nên không thể dùng để đăng nhập.');
            $this->redirect('/login?oauth_error=unverified');
            return;
        }

        // 5. Xử lý logic tạo / tìm tài khoản
        $userModel = new User();

        // Case 1: Đã có google_id trong DB → đăng nhập luôn
        $user = $userModel->findByGoogleId($googleId);
        if ($user) {
            $userModel->linkGoogle($user['id'], $googleId, $avatarUrl);
            $user['is_student_verified'] = (int)$userModel->grantStudentBadgeIfEligible($user, $emailVerified);
            $this->loginUser($user);
            return;
        }

        // Case 2: Email đã tồn tại (account email/password cũ) → link Google vào
        $user = $userModel->findByEmail($email);
        if ($user) {
            $userModel->linkGoogle($user['id'], $googleId, $avatarUrl);
            $user['is_student_verified'] = (int)$userModel->grantStudentBadgeIfEligible($user, $emailVerified);
            Flash::set('success', '✅ Tài khoản Google đã được liên kết thành công!');
            $this->loginUser($user);
            return;
        }

        // Case 3: User mới hoàn toàn → tạo tài khoản
        $userId = $userModel->createFromGoogle($name, $email, $googleId, $avatarUrl);
        $user   = $userModel->findById($userId);
        $user['is_student_verified'] = (int)$userModel->grantStudentBadgeIfEligible($user, $emailVerified);

        Flash::set('success', '🎉 Tài khoản đã được tạo thành công qua Google!');
        $this->loginUser($user);
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private function fetchAccessToken(string $code): array
    {
        $ch = curl_init(self::TOKEN_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'code'          => $code,
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
                'redirect_uri'  => $this->redirectUri,
                'grant_type'    => 'authorization_code',
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT        => 10,
        ]);
        return $this->decodeGoogleResponse($ch, 'token exchange');
    }

    /**
     * Run a Google request and decode its JSON, logging why it failed
     * (cURL/TLS error such as a missing CA bundle, or Google's error code).
     * Never logs the authorization code, tokens or response bodies.
     */
    private function decodeGoogleResponse(\CurlHandle $ch, string $step): array
    {
        $response = curl_exec($ch);
        if ($response === false) {
            error_log(sprintf(
                'Google OAuth %s failed: cURL %d %s%s',
                $step,
                curl_errno($ch),
                curl_error($ch),
                curl_errno($ch) === 60 ? ' (set curl.cainfo/openssl.cafile to a CA bundle in php.ini)' : ''
            ));
            return [];
        }
        $data = json_decode((string)$response, true);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (!is_array($data) || $status >= 400) {
            $error = is_array($data) ? (string)($data['error'] ?? '') : 'invalid_json';
            error_log(sprintf('Google OAuth %s failed: HTTP %d %s', $step, $status, preg_replace('/[^a-z_]/i', '', $error)));
            return [];
        }
        return $data;
    }

    private function fetchGoogleUser(string $accessToken): array
    {
        $ch = curl_init(self::USER_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT        => 10,
        ]);
        return $this->decodeGoogleResponse($ch, 'userinfo');
    }

    private function loginUser(array $user): void
    {
        $userModel = new User();
        // Same rules as the password login: locked accounts stay out, and admins
        // use the admin portal (password + its own checks), not Google.
        if ((int)($user['is_locked'] ?? 0) === 1) {
            Flash::set('error', 'Tài khoản đang bị khóa.');
            $this->redirect('/login?oauth_error=locked');
            return;
        }
        if (($user['role'] ?? 'student') === 'admin') {
            Flash::set('error', 'Tài khoản quản trị đăng nhập qua cổng Admin.');
            $this->redirect('/login?oauth_error=admin');
            return;
        }
        // New session id after authentication (prevents session fixation).
        session_regenerate_id(true);
        // Ghi session đăng nhập (giống AuthController::login)
        $_SESSION['user'] = [
            'id'                  => $user['id'],
            'name'                => $user['name'],
            'email'               => $user['email'],
            'avatar'              => $user['avatar']              ?? null,
            'avatar_url'          => $user['avatar_url']          ?? null,
            'role'                => $user['role']                ?? 'student',
            'is_locked'           => $user['is_locked']           ?? 0,
            'is_student_verified' => $user['is_student_verified'] ?? 0,
            'coins'               => $userModel->getCoins($user['id']),
        ];

        // Lưu info cho tính năng "recent accounts" (đọc bằng JS localStorage)
        // Được set bằng cookie tạm, JS sẽ đọc và lưu vào localStorage
        // V3-004 fix: thêm secure=true, httpOnly=true để bảo vệ email khỏi XSS
        setcookie('_recent_user', json_encode([
            'name'  => $user['name'],
            'email' => $user['email'],
        ]), time() + 300, '/', '', true, true);

        $this->redirect('/');
    }
}
