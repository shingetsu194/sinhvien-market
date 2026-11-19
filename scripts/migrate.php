<?php
/**
 * Simple Database Migration Script
 * Chạy bằng lệnh: php scripts/migrate.php
 */

// Database::loadEnv() needs ROOT when there is no .env file (Docker/CI inject
// DB_* as process environment variables and .dockerignore excludes .env).
defined('ROOT') || define('ROOT', dirname(__DIR__));

require_once __DIR__ . '/../config/Database.php';

// Load .env
$_envFile = __DIR__ . '/../.env';
if (file_exists($_envFile)) {
    foreach (file($_envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        if (str_starts_with(trim($_line), '#') || !str_contains($_line, '=')) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_ENV[trim($_k)] = trim(trim($_v), '"\'');
    }
}

use Config\Database;

$db = Database::getInstance();

// 1. Tạo bảng migrations nếu chưa có
$db->exec("
    CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// 2. Lấy danh sách các migration đã chạy
$stmt = $db->query("SELECT migration FROM migrations");
$executedMigrations = $stmt->fetchAll(PDO::FETCH_COLUMN);

$migrationsDir = __DIR__ . '/../database/migrations';
if (!is_dir($migrationsDir)) {
    mkdir($migrationsDir, 0755, true);
}

// 3. Quét thư mục migrations
$files = scandir($migrationsDir);
$files = array_filter($files, function($file) {
    return str_ends_with($file, '.sql') || str_ends_with($file, '.php');
});
sort($files);

$hasNew = false;
foreach ($files as $file) {
    if (!in_array($file, $executedMigrations)) {
        echo "Running migration: $file...\n";
        $hasNew = true;
        
        $filePath = $migrationsDir . '/' . $file;
        
        if (str_ends_with($file, '.sql')) {
            $sql = file_get_contents($filePath);
            if (!empty(trim($sql))) {
                $db->exec($sql);
            }
        } elseif (str_ends_with($file, '.php')) {
            require_once $filePath;
        }
        
        // Đánh dấu đã chạy
        $stmt = $db->prepare("INSERT INTO migrations (migration) VALUES (?)");
        $stmt->execute([$file]);
        echo "Done: $file\n";
    }
}

if (!$hasNew) {
    echo "Nothing to migrate. Database is up to date.\n";
}
