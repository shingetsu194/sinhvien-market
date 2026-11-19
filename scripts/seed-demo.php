<?php

declare(strict_types=1);

define('ROOT', dirname(__DIR__));
require_once ROOT . '/config/Database.php';

use Config\Database;

$configuredDatabase = getenv('MYSQLDATABASE') ?: (getenv('DB_NAME') ?: 'sinhvien_market');
if ($configuredDatabase !== 'sinhvien_market_demo' || (getenv('APP_ENV') ?: '') === 'production') {
    fwrite(STDERR, "Refusing to seed: only the isolated sinhvien_market_demo database is allowed.\n");
    exit(2);
}

$pdo = Database::getInstance();
$actualDatabase = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
if ($actualDatabase !== 'sinhvien_market_demo') {
    fwrite(STDERR, "Refusing to seed: connected database does not match the demo allowlist.\n");
    exit(2);
}
$required = [
    'residence_service_request_classifications',
    'residence_notices',
    'residence_service_requests',
    'roles',
    'user_roles',
];
foreach ($required as $table) {
    // SHOW statements cannot take placeholders when PDO uses native prepares
    // (Database sets ATTR_EMULATE_PREPARES=false), so query information_schema.
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute([$table]);
    if (!$stmt->fetchColumn()) {
        fwrite(STDERR, "Missing $table. Create a fresh demo schema and apply migrations first.\n");
        exit(2);
    }
}

$emails = ['demo-student@example.test', 'demo-manager@example.test'];
$lookup = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
foreach ($emails as $email) {
    $lookup->execute([$email]);
    if ($lookup->fetchColumn()) {
        fwrite(STDERR, "Demo account already exists ($email). Refusing to reset credentials or duplicate fixtures.\n");
        exit(2);
    }
}

$pdo->beginTransaction();
try {
    $createUser = $pdo->prepare(
        "INSERT INTO users (name, email, password, role, is_verified)
         VALUES (?, ?, ?, 'student', 1)"
    );
    $accounts = [];
    foreach ([['Demo Sinh viên', $emails[0]], ['Demo Quản lý', $emails[1]]] as [$name, $email]) {
        $password = bin2hex(random_bytes(18));
        $createUser->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        $accounts[] = ['email' => $email, 'password' => $password, 'id' => (int)$pdo->lastInsertId()];
    }

    $role = $pdo->prepare("SELECT id FROM roles WHERE role_key = 'dorm_manager' LIMIT 1");
    $role->execute();
    $roleId = $role->fetchColumn();
    if (!$roleId) {
        throw new RuntimeException('Missing dorm_manager role. Apply foundation migrations first.');
    }
    $assign = $pdo->prepare('INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)');
    $assign->execute([$accounts[1]['id'], (int)$roleId, $accounts[1]['id']]);

    $notice = $pdo->prepare(
        "INSERT INTO residence_notices (notice_type, title, body, audience, status, created_by)
         VALUES ('rule', ?, ?, 'all', 'published', ?)"
    );
    $notice->execute([
        'Demo: giờ yên tĩnh',
        'Giữ yên lặng tại khu lưu trú sau 22:00. Liên hệ Ban quản lý nếu cần hỗ trợ.',
        $accounts[1]['id'],
    ]);

    $request = $pdo->prepare(
        "INSERT INTO residence_service_requests (user_id, request_type, title, description, priority)
         VALUES (?, 'repair', 'Demo: vòi nước rò rỉ', 'Vòi nước trong phòng bị rò rỉ, cần kiểm tra.', 'normal')"
    );
    $request->execute([$accounts[0]['id']]);
    $classification = $pdo->prepare(
        "INSERT INTO residence_service_request_classifications
            (request_id, category, confidence, recommended_priority, reason, model_key)
         VALUES (?, 'plumbing', 0.7500, 'high', 'Phân loại demo; nhân viên cần xác nhận.', 'local-keyword-triage-v1')"
    );
    $classification->execute([(int)$pdo->lastInsertId()]);
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}

fwrite(STDOUT, "Demo accounts created. One-time passwords (store securely; never use in production):\n");
foreach ($accounts as $account) {
    fwrite(STDOUT, $account['email'] . '  ' . $account['password'] . PHP_EOL);
}
