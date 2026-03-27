<?php

namespace Core;

/**
 * ErrorHandler — Xử lý lỗi toàn cục
 *
 * Đăng ký ngay trong index.php:
 *   ErrorHandler::register();
 *
 * Hành vi:
 *  - APP_DEBUG=true  → Hiện chi tiết lỗi trên giao diện (chỉ dùng khi dev)
 *  - APP_DEBUG=false → Ghi log âm thầm + hiện trang 500 thân thiện
 */
class ErrorHandler
{
    private static bool $debug = false;

    public static function register(): void
    {
        self::$debug = filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // Ẩn lỗi gốc của PHP khỏi màn hình (để tránh lộ thông tin nhạy cảm)
        ini_set('display_errors', self::$debug ? '1' : '0');
        error_reporting(E_ALL);

        // 1. Bắt PHP Warning / Notice / Deprecated
        set_error_handler([self::class, 'handleError']);

        // 2. Bắt Uncaught Exception
        set_exception_handler([self::class, 'handleException']);

        // 3. Bắt Fatal Error khi script chết
        register_shutdown_function([self::class, 'handleShutdown']);
    }

    // ─── Handlers ─────────────────────────────────────────────────────────────

    /**
     * Bắt PHP Error (Warning, Notice...)
     */
    public static function handleError(int $errno, string $errstr, string $errfile, int $errline): bool
    {
        // Bỏ qua lỗi bị tắt bởi @ operator
        if (!(error_reporting() & $errno)) {
            return false;
        }

        $levelMap = [
            E_USER_ERROR   => 'ERROR',
            E_USER_WARNING => 'WARNING',
            E_USER_NOTICE  => 'NOTICE',
            E_WARNING      => 'WARNING',
            E_NOTICE       => 'NOTICE',
            E_DEPRECATED   => 'DEPRECATED',
        ];
        $level = $levelMap[$errno] ?? 'ERROR';

        Logger::write($level, $errstr, [
            'file' => $errfile . ':' . $errline,
        ]);

        // Nếu ở màn dev thì hiện chi tiết lỗi
        if (self::$debug) {
            return false; // Để PHP xử lý tiếp (hiện lỗi màn hình)
        }

        return true; // Ẩn lỗi ở production
    }

    /**
     * Bắt Uncaught Exception
     */
    public static function handleException(\Throwable $e): void
    {
        Logger::exception($e);

        if (self::$debug) {
            self::renderDebugPage($e);
        } else {
            self::render500();
        }
    }

    /**
     * Bắt Fatal Error lúc shutdown
     */
    public static function handleShutdown(): void
    {
        $error = error_get_last();
        if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            Logger::error('FATAL: ' . $error['message'], [
                'file' => $error['file'] . ':' . $error['line'],
            ]);

            if (!self::$debug) {
                self::render500();
            }
        }
    }

    // ─── Render Helpers ───────────────────────────────────────────────────────

    /**
     * Trang 500 thân thiện (production)
     */
    private static function render500(): void
    {
        if (headers_sent()) {
            return;
        }
        http_response_code(500);
        $view = ROOT . '/app/views/errors/500.php';
        if (file_exists($view)) {
            require $view;
        } else {
            echo '<h1>500 - Lỗi máy chủ</h1><p>Chúng tôi đang khắc phục sự cố. Vui lòng thử lại sau.</p>';
        }
        exit;
    }

    /**
     * Trang debug đẹp (development only)
     */
    private static function renderDebugPage(\Throwable $e): void
    {
        if (headers_sent()) {
            return;
        }
        http_response_code(500);
        $appUrl   = rtrim($_ENV['APP_URL'] ?? '', '/');
        $class    = get_class($e);
        $message  = htmlspecialchars($e->getMessage(), ENT_QUOTES);
        $file     = htmlspecialchars($e->getFile(), ENT_QUOTES);
        $line     = $e->getLine();
        $trace    = htmlspecialchars($e->getTraceAsString(), ENT_QUOTES);

        // Đọc dòng code bị lỗi để highlight
        $snippet  = self::getCodeSnippet($e->getFile(), $line);

        echo <<<HTML
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>⚠️ {$class}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:2rem}
    .card{background:#1e293b;border-radius:16px;padding:2rem;max-width:1000px;margin:0 auto;border:1px solid #334155;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    .header{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid #334155}
    .icon{width:52px;height:52px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0}
    h1{font-size:1.5rem;font-weight:800;color:#fca5a5;margin-bottom:.25rem}
    .class-name{font-size:.85rem;color:#64748b}
    .message-box{background:#0f172a;border:1px solid #dc2626;border-radius:12px;padding:1.2rem 1.5rem;margin-bottom:1.5rem;color:#fca5a5;font-size:1.05rem;font-weight:600}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1.5rem}
    .meta-item{background:#0f172a;border-radius:10px;padding:1rem;border:1px solid #334155}
    .meta-label{font-size:.72rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.4rem}
    .meta-value{font-family:monospace;font-size:.88rem;color:#a5b4fc;word-break:break-all}
    .snippet{background:#0f172a;border-radius:12px;overflow:auto;margin-bottom:1.5rem;border:1px solid #334155}
    .snippet table{width:100%;border-collapse:collapse}
    .snippet td{padding:.3rem .8rem;font-family:monospace;font-size:.82rem;vertical-align:top;white-space:pre}
    .snippet .ln{color:#475569;user-select:none;text-align:right;padding-right:1.2rem;border-right:1px solid #334155;min-width:50px}
    .snippet .highlight{background:#451a1a;color:#fca5a5}
    .trace-box{background:#0f172a;border-radius:12px;padding:1.2rem;border:1px solid #334155;font-family:monospace;font-size:.78rem;color:#94a3b8;white-space:pre-wrap;overflow:auto;max-height:320px}
    .section-title{font-size:.85rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.75rem}
    .back-link{display:inline-flex;align-items:center;gap:.5rem;color:#818cf8;text-decoration:none;font-size:.88rem;font-weight:600;margin-top:1.5rem}
    .back-link:hover{color:#a5b4fc}
    .env-badge{display:inline-block;background:rgba(245,158,11,.15);color:#fbbf24;border:1px solid rgba(245,158,11,.3);padding:.2rem .7rem;border-radius:50px;font-size:.72rem;font-weight:700;margin-left:.5rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">⚠️</div>
      <div>
        <h1>{$message}</h1>
        <div class="class-name">{$class} <span class="env-badge">🐛 DEBUG MODE</span></div>
      </div>
    </div>

    <div class="message-box">{$message}</div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">📁 File</div>
        <div class="meta-value">{$file}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">📍 Dòng</div>
        <div class="meta-value">{$line}</div>
      </div>
    </div>

    <div class="section-title">📝 Code snippet</div>
    <div class="snippet">
      <table>{$snippet}</table>
    </div>

    <div class="section-title">🔍 Stack Trace</div>
    <div class="trace-box">{$trace}</div>

    <a href="{$appUrl}" class="back-link">← Về trang chủ</a>
  </div>
</body>
</html>
HTML;
        exit;
    }

    /**
     * Đọc các dòng code xung quanh lỗi để hiện snippet
     */
    private static function getCodeSnippet(string $file, int $errorLine, int $radius = 7): string
    {
        if (!file_exists($file)) {
            return '';
        }
        $lines = file($file);
        $start = max(0, $errorLine - $radius - 1);
        $end   = min(count($lines) - 1, $errorLine + $radius - 1);
        $html  = '';
        for ($i = $start; $i <= $end; $i++) {
            $ln      = $i + 1;
            $code    = htmlspecialchars($lines[$i], ENT_QUOTES);
            $class   = ($ln === $errorLine) ? 'highlight' : '';
            $html   .= "<tr class=\"{$class}\"><td class=\"ln\">{$ln}</td><td>{$code}</td></tr>";
        }
        return $html;
    }
}
