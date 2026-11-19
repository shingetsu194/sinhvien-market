<?php

namespace App\Services;

class GoogleAiService
{
    private const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    public const NO_KEY_MESSAGE = 'Xin lỗi, hiện tại Trợ lý AI đang không thể kết nối với máy chủ.';
    public const BUSY_MESSAGE = 'Xin lỗi, hiện tại Trợ lý AI đang bận một chút, cậu vui lòng đợi chủ shop phản hồi nha!';

    /**
     * Send a prompt to Google Gemini and return the answer, or a friendly
     * Vietnamese fallback message when the AI is unavailable.
     */
    public static function askGemini(string $prompt): string
    {
        if (self::apiKey() === '') {
            return self::NO_KEY_MESSAGE;
        }
        return self::tryAsk($prompt) ?? self::BUSY_MESSAGE;
    }

    /**
     * Same request, but returns null on any failure so callers can decide not
     * to show anything (e.g. never post a fake "AI is down" chat message).
     */
    public static function tryAsk(string $prompt): ?string
    {
        $apiKey = self::apiKey();
        if ($apiKey === '') {
            return null;
        }

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt]
                    ]
                ]
            ],
            // Thêm các tham số cẩn thận để AI nói chuyện giống một người thật
            'generationConfig' => [
                'temperature' => 0.7,
                'maxOutputTokens' => 800,
                // gemini-2.5-flash là model "thinking" — tắt thinking để AI trả lời
                // thẳng, không tốn hết token vào phần suy nghĩ (gây cụt câu).
                'thinkingConfig' => ['thinkingBudget' => 0],
            ]
        ];

        $ch = curl_init(self::API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // Key goes in a header, not the URL, so it never lands in proxy/access logs.
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        // Để tránh delay đồ án quá lâu và timeout, set tối đa 10 giây
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        // SSL verify: tắt chỉ ở môi trường local (Laragon), BẮT BUỘC bật khi production
        $env = $_ENV['APP_ENV'] ?? (getenv('APP_ENV') ?: 'production');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !in_array($env, ['local', 'development'], true));

        $response = curl_exec($ch);
        $error = curl_error($ch);

        if ($error) {
            error_log('Google AI Connection Error: ' . $error);
            return null;
        }

        $data = json_decode((string)$response, true);
        if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            return trim($data['candidates'][0]['content']['parts'][0]['text']);
        }
        if (isset($data['error']['message'])) {
            // Log lỗi API (như hết tiền/hết lượt) để dev kiểm tra
            error_log('Google AI API Error: ' . $data['error']['message']);
        }
        return null;
    }

    /** .env values land in $_ENV; injected process env (Railway, CLI server) only in getenv(). */
    private static function apiKey(): string
    {
        $key = $_ENV['GEMINI_API_KEY'] ?? null;
        if ($key === null) {
            $key = getenv('GEMINI_API_KEY') ?: '';
        }
        return trim((string)$key);
    }
}
