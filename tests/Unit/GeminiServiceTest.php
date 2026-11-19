<?php
namespace Tests\Unit;

use Tests\TestCase;
use App\Services\GoogleAiService;

class GeminiServiceTest extends TestCase
{
    public function test_gemini_returns_error_message_if_no_api_key()
    {
        // Giả lập môi trường không có API Key
        $originalKey = $_ENV['GEMINI_API_KEY'] ?? null;
        $_ENV['GEMINI_API_KEY'] = '';

        $response = GoogleAiService::askGemini("Test prompt");

        // Khẳng định (Assert)
        $this->assertEquals(
            "Xin lỗi, hiện tại Trợ lý AI đang không thể kết nối với máy chủ.", 
            $response
        );

        // Trả lại môi trường cũ
        if ($originalKey !== null) {
            $_ENV['GEMINI_API_KEY'] = $originalKey;
        } else {
            unset($_ENV['GEMINI_API_KEY']);
        }
    }

    public function test_try_ask_returns_null_without_key_so_chat_posts_nothing()
    {
        $originalEnv = $_ENV['GEMINI_API_KEY'] ?? null;
        $originalProcess = getenv('GEMINI_API_KEY');
        unset($_ENV['GEMINI_API_KEY']);
        putenv('GEMINI_API_KEY');

        $this->assertNull(GoogleAiService::tryAsk('Test prompt'));
        $this->assertSame(GoogleAiService::NO_KEY_MESSAGE, GoogleAiService::askGemini('Test prompt'));

        if ($originalEnv !== null) {
            $_ENV['GEMINI_API_KEY'] = $originalEnv;
        }
        if ($originalProcess !== false) {
            putenv('GEMINI_API_KEY=' . $originalProcess);
        }
    }
}
