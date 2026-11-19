<?php

/**
 * Seed 20 realistic TEST student accounts and their ~108 listings
 * (database/demo/test-marketplace) into an explicitly confirmed database.
 *
 *   TEST_ACCOUNTS_PASSWORD=... php scripts/seed-test-marketplace.php --database=NAME --confirm=NAME
 *
 * - Emails use reserved domains (example.com / *.example.edu): mail can never
 *   reach a real person or university. *.example.edu accounts get the student
 *   badge through User::isStudentEmail(), like real school addresses.
 * - 12 accounts live in Tòa A/B with approved applications, active contracts
 *   and bed allocations, so "Gần tôi" search has real residence context.
 * - No phone numbers or social handles are invented (they could be real people's).
 * - Refuses to run in production, on an unconfirmed database name, or twice.
 */

declare(strict_types=1);

define('ROOT', dirname(__DIR__));
define('APP_PATH', ROOT . '/app');
define('CORE_PATH', ROOT . '/core');
define('CONFIG_PATH', ROOT . '/config');
require_once CONFIG_PATH . '/Database.php';
require_once CORE_PATH . '/Model.php';
require_once APP_PATH . '/models/User.php';

use App\Models\User;
use Config\Database;

$opts = getopt('', ['database:', 'confirm:']);
$target = (string)($opts['database'] ?? '');
if ($target === '' || ($opts['confirm'] ?? '') !== $target) {
    fwrite(STDERR, "Usage: php scripts/seed-test-marketplace.php --database=NAME --confirm=NAME\n");
    exit(2);
}
if ((getenv('APP_ENV') ?: '') === 'production') {
    fwrite(STDERR, "Refusing to seed test accounts in production.\n");
    exit(2);
}
$pdo = Database::getInstance();
if ((string)$pdo->query('SELECT DATABASE()')->fetchColumn() !== $target) {
    fwrite(STDERR, "Connected database does not match --database=$target. Check DB_NAME.\n");
    exit(2);
}

$dir = ROOT . '/database/demo/test-marketplace';
$accounts = json_decode((string)file_get_contents("$dir/accounts.json"), true, 512, JSON_THROW_ON_ERROR);
$listings = json_decode((string)file_get_contents("$dir/listings.json"), true, 512, JSON_THROW_ON_ERROR);

$exists = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = ?');
foreach ($accounts as $a) {
    $exists->execute([$a['email']]);
    if ((int)$exists->fetchColumn() > 0) {
        fwrite(STDERR, "Test account {$a['email']} already exists. Refusing to duplicate test data.\n");
        exit(2);
    }
}

$password = getenv('TEST_ACCOUNTS_PASSWORD') ?: ('Svm-' . bin2hex(random_bytes(6)) . '!');
$hash = password_hash($password, PASSWORD_DEFAULT);
$adminId = (int)$pdo->query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")->fetchColumn();
$semesterStart = '2026-09-01';
$semesterEnd = '2027-06-30';

$one = static function (string $sql, array $params) use ($pdo): int {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int)$stmt->fetchColumn();
};
$exec = static function (string $sql, array $params) use ($pdo): int {
    $pdo->prepare($sql)->execute($params);
    return (int)$pdo->lastInsertId();
};

$pdo->beginTransaction();
try {
    $ids = [];
    $badges = 0;
    $residents = 0;
    foreach ($accounts as $a) {
        $inDorm = !empty($a['building']);
        $address = $inDorm ? "KTX – Tòa {$a['building']}, phòng {$a['room']}" : $a['dormitoryAddress'];
        $badge = User::isStudentEmail($a['email']) ? 1 : 0;
        $badges += $badge;
        $userId = $exec(
            "INSERT INTO users (name, email, password, role, is_verified, university, student_id, dormitory_address,
                                bio, available_time, is_student_verified, coins, created_at)
             VALUES (?, ?, ?, 'student', 1, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
            [$a['name'], $a['email'], $hash, $a['university'], $a['studentNumber'], $address, $a['bio'],
                $a['availableTime'], $badge, random_int(20, 300), random_int(35, 120)]
        );
        $ids[$a['key']] = $userId;
        $exec(
            'INSERT INTO student_profiles (user_id, student_number, faculty, program, academic_year, date_of_birth)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$userId, $a['studentNumber'], $a['faculty'], $a['program'], $a['academicYear'], $a['dob']]
        );
        if (!$inDorm) {
            continue;
        }

        // Tòa A/B -> floor (2nd char of the room) -> room -> next free bed.
        $code = 'KTX-' . $a['building'];
        $buildingId = $one('SELECT id FROM residence_buildings WHERE code = ?', [$code])
            ?: $exec("INSERT INTO residence_buildings (code, name, address, status) VALUES (?, ?, 'Ký túc xá sinh viên', 'active')",
                [$code, 'Tòa ' . $a['building']]);
        $floorNumber = (int)substr($a['room'], 1, 1);
        $floorId = $one('SELECT id FROM residence_floors WHERE building_id = ? AND floor_number = ?', [$buildingId, $floorNumber])
            ?: $exec('INSERT INTO residence_floors (building_id, floor_number, name) VALUES (?, ?, ?)',
                [$buildingId, $floorNumber, "Tầng $floorNumber"]);
        $roomId = $one('SELECT id FROM residence_rooms WHERE floor_id = ? AND room_number = ?', [$floorId, $a['room']])
            ?: $exec("INSERT INTO residence_rooms (floor_id, room_number, room_type, capacity, status) VALUES (?, ?, 'standard', 4, 'active')",
                [$floorId, $a['room']]);
        $bedNumber = 1 + $one('SELECT COUNT(*) FROM residence_beds WHERE room_id = ?', [$roomId]);
        $bedId = $exec("INSERT INTO residence_beds (room_id, bed_number, status) VALUES (?, ?, 'occupied')",
            [$roomId, (string)$bedNumber]);

        $applicationId = $exec(
            "INSERT INTO residence_applications (application_number, user_id, start_date, end_date, preferred_room_type, status)
             VALUES (?, ?, ?, ?, 'standard', 'approved')",
            ['TEST-HS-' . $userId, $userId, $semesterStart, $semesterEnd]
        );
        $contractId = $exec(
            "INSERT INTO residence_contracts (contract_number, application_id, user_id, start_date, end_date, status)
             VALUES (?, ?, ?, ?, ?, 'active')",
            ['TEST-HD-' . $userId, $applicationId, $userId, $semesterStart, $semesterEnd]
        );
        $exec(
            "INSERT INTO residence_bed_allocations (bed_id, user_id, contract_id, start_date, end_date, status, assigned_by)
             VALUES (?, ?, ?, ?, ?, 'active', ?)",
            [$bedId, $userId, $contractId, $semesterStart, $semesterEnd, $adminId ?: $userId]
        );
        $residents++;
    }

    $images = 0;
    foreach ($listings as $l) {
        $hasImage = !empty($l['image']) && is_file("$dir/images/{$l['image']}");
        $productId = $exec(
            "INSERT INTO products (user_id, category_id, title, description, image, type, status, price, `condition`, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))",
            [$ids[$l['s']], $l['c'], $l['t'], $l['d'], $hasImage ? 'db' : null, $l['ty'], $l['p'], $l['cond'],
                random_int(1, 30 * 24)]
        );
        if ($hasImage) {
            $exec('INSERT INTO product_images (product_id, data, mime) VALUES (?, ?, ?)',
                [$productId, file_get_contents("$dir/images/{$l['image']}"), 'image/jpeg']);
            $images++;
        }
    }
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}

fwrite(STDOUT, sprintf(
    "[%s] %d test accounts (%d with student badge, %d living in KTX), %d listings (%d with photos).\n",
    $target, count($accounts), $badges, $residents, count($listings), $images
));
if (!getenv('TEST_ACCOUNTS_PASSWORD')) {
    fwrite(STDOUT, "Shared test password (shown once, test databases only): $password\n");
}
