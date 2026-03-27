<?php

namespace Core;

/**
 * Logger — Ghi lỗi ra file theo ngày
 * Dùng: Logger::error('Message');
 *       Logger::warning('...');
 *       Logger::info('...');
 */
class Logger
{
    private static string $logDir = ROOT . '/storage/logs';

    // ─── Public API ───────────────────────────────────────────────────────────

    public static function error(string $message, array $context = []): void
    {
        self::write('ERROR', $message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::write('WARNING', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    public static function write(string $level, string $message, array $context = []): void
    {
        // Tạo thư mục nếu chưa có
        if (!is_dir(self::$logDir)) {
            mkdir(self::$logDir, 0755, true);
        }

        $date    = date('Y-m-d');
        $time    = date('Y-m-d H:i:s');
        $file    = self::$logDir . "/app-{$date}.log";

        // Format log entry
        $entry = "[{$time}] [{$level}] {$message}";

        // Thêm context nếu có (file, line, trace...)
        if (!empty($context)) {
            foreach ($context as $key => $val) {
                $entry .= "\n    {$key}: {$val}";
            }
        }

        // Thêm request info để dễ debug
        $url    = ($_SERVER['REQUEST_METHOD'] ?? 'CLI') . ' ' . ($_SERVER['REQUEST_URI'] ?? '');
        $ip     = $_SERVER['REMOTE_ADDR'] ?? 'CLI';
        $entry .= "\n    request: {$url}  ip: {$ip}";

        file_put_contents($file, $entry . PHP_EOL . str_repeat('-', 80) . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    /**
     * Log một Exception hoàn chỉnh (file, line, trace)
     */
    public static function exception(\Throwable $e): void
    {
        self::error(
            get_class($e) . ': ' . $e->getMessage(),
            [
                'file'  => $e->getFile() . ':' . $e->getLine(),
                'trace' => self::truncateTrace($e->getTraceAsString()),
            ]
        );
    }

    /**
     * Rút gọn stack trace để log không quá dài
     */
    private static function truncateTrace(string $trace): string
    {
        $lines = explode("\n", $trace);
        return implode("\n    ", array_slice($lines, 0, 8))
            . (count($lines) > 8 ? "\n    ... +" . (count($lines) - 8) . ' more' : '');
    }
}
