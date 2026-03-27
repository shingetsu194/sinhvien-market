<?php

namespace Core;

/**
 * ApiController — Base class cho mọi endpoint trả về JSON
 *
 * Cung cấp response helpers theo chuẩn envelope:
 *   Thành công: { "success": true,  "data": {...}, "message": "..." }
 *   Lỗi:        { "success": false, "error": { "code": "...", "message": "..." } }
 */
abstract class ApiController extends Controller
{
    // ─── Success Responses ───────────────────────────────────────────────────

    /**
     * 200 OK — Trả dữ liệu thành công
     */
    protected function success(mixed $data = null, string $message = '', int $status = 200): never
    {
        $this->sendJson([
            'success' => true,
            'data'    => $data,
            'message' => $message,
        ], $status);
    }

    /**
     * 201 Created — Tạo mới thành công
     */
    protected function created(mixed $data = null, string $message = 'Tạo thành công.'): never
    {
        $this->success($data, $message, 201);
    }

    // ─── Error Responses ─────────────────────────────────────────────────────

    /**
     * Trả về JSON lỗi theo chuẩn envelope
     *
     * @param string $code    Error code ngắn gọn, UPPER_SNAKE, VD: "INVALID_CSRF"
     * @param string $message Thông báo thân thiện cho người dùng
     * @param int    $status  HTTP Status Code
     */
    protected function error(string $code, string $message, int $status = 400): never
    {
        $this->sendJson([
            'success' => false,
            'error'   => [
                'code'    => $code,
                'message' => $message,
            ],
        ], $status);
    }

    /**
     * 401 Unauthorized — Chưa đăng nhập
     */
    protected function unauthorized(string $message = 'Bạn cần đăng nhập để thực hiện thao tác này.'): never
    {
        $this->error('UNAUTHORIZED', $message, 401);
    }

    /**
     * 403 Forbidden — Không có quyền
     */
    protected function forbidden(string $message = 'Bạn không có quyền thực hiện thao tác này.'): never
    {
        $this->error('FORBIDDEN', $message, 403);
    }

    /**
     * 404 Not Found — Resource không tồn tại
     */
    protected function notFound(string $message = 'Không tìm thấy dữ liệu.'): never
    {
        $this->error('NOT_FOUND', $message, 404);
    }

    /**
     * 422 Unprocessable — Lỗi validation dữ liệu đầu vào
     */
    protected function validationError(string $message): never
    {
        $this->error('VALIDATION_ERROR', $message, 422);
    }

    // ─── Auth Helpers ────────────────────────────────────────────────────────

    /**
     * Yêu cầu đăng nhập — nếu chưa, trả JSON 401 thay vì redirect
     */
    protected function requireApiAuth(): array
    {
        $user = $this->currentUser();
        if (!$user) {
            $this->unauthorized();
        }
        return $user;
    }

    /**
     * Yêu cầu CSRF — nếu sai, trả JSON 403
     */
    protected function requireCsrf(): void
    {
        if (!$this->verifyCsrf()) {
            $this->error('INVALID_CSRF', 'Token bảo mật không hợp lệ hoặc đã hết hạn.', 403);
        }
    }

    // ─── Core JSON sender ────────────────────────────────────────────────────

    private function sendJson(array $payload, int $status): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
