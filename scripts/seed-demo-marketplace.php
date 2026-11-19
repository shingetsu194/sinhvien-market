<?php

/**
 * Demo marketplace listings for smart search (database/demo/marketplace).
 * Creates three demo sellers — in Tòa A, in Tòa B (active bed allocations) and
 * outside the dormitory — and their 41 listings (no vehicles), with images.
 *
 * Only runs against the isolated sinhvien_market_demo database and refuses to
 * run twice. Passwords are random and printed once.
 *   php scripts/seed-demo-marketplace.php
 */

declare(strict_types=1);

define('ROOT', dirname(__DIR__));
require_once ROOT . '/config/Database.php';

use Config\Database;

$configured = getenv('MYSQLDATABASE') ?: (getenv('DB_NAME') ?: 'sinhvien_market');
if ($configured !== 'sinhvien_market_demo' || (getenv('APP_ENV') ?: '') === 'production') {
    fwrite(STDERR, "Refusing to seed: only the isolated sinhvien_market_demo database is allowed.\n");
    exit(2);
}
$pdo = Database::getInstance();
if ((string)$pdo->query('SELECT DATABASE()')->fetchColumn() !== 'sinhvien_market_demo') {
    fwrite(STDERR, "Refusing to seed: connected database does not match the demo allowlist.\n");
    exit(2);
}
foreach (['residence_bed_allocations', 'product_images', 'marketplace_buyer_requests'] as $table) {
    $stmt = $pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?');
    $stmt->execute([$table]);
    if (!$stmt->fetchColumn()) {
        fwrite(STDERR, "Missing $table. Apply all migrations first.\n");
        exit(2);
    }
}

$sellers = [
    'A' => ['Demo Người bán Tòa A', 'demo-seller-a@example.test', 'DEMO-A', 'Tòa A (demo)'],
    'B' => ['Demo Người bán Tòa B', 'demo-seller-b@example.test', 'DEMO-B', 'Tòa B (demo)'],
    'C' => ['Demo Người bán ngoài KTX', 'demo-seller-c@example.test', null, null],
];
$exists = $pdo->prepare('SELECT id FROM users WHERE email = ?');
foreach ($sellers as [, $email]) {
    $exists->execute([$email]);
    if ($exists->fetchColumn()) {
        fwrite(STDERR, "Demo seller already exists ($email). Refusing to duplicate demo listings.\n");
        exit(2);
    }
}

$offers = json_decode((string)file_get_contents(ROOT . '/database/demo/marketplace/offers.json'), true, 512, JSON_THROW_ON_ERROR);
$today = date('Y-m-d');
$passwords = [];

$pdo->beginTransaction();
try {
    $adminId = (int)$pdo->query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")->fetchColumn();
    $sellerIds = [];
    foreach ($sellers as $key => [$name, $email, $code, $buildingName]) {
        $password = bin2hex(random_bytes(18));
        $pdo->prepare("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'student', 1)")
            ->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        $userId = (int)$pdo->lastInsertId();
        $sellerIds[$key] = $userId;
        $passwords[$email] = $password;
        if ($code === null) {
            continue; // seller C lives outside the dormitory
        }

        // Building -> floor -> room -> bed (reuse if a previous demo created them).
        $find = $pdo->prepare('SELECT id FROM residence_buildings WHERE code = ?');
        $find->execute([$code]);
        $buildingId = (int)$find->fetchColumn();
        if ($buildingId === 0) {
            $pdo->prepare("INSERT INTO residence_buildings (code, name, address, status) VALUES (?, ?, 'KTX demo', 'active')")
                ->execute([$code, $buildingName]);
            $buildingId = (int)$pdo->lastInsertId();
            $pdo->prepare('INSERT INTO residence_floors (building_id, floor_number, name) VALUES (?, 1, ?)')
                ->execute([$buildingId, 'Tầng 1']);
            $floorId = (int)$pdo->lastInsertId();
            $pdo->prepare("INSERT INTO residence_rooms (floor_id, room_number, room_type, capacity, status) VALUES (?, ?, 'standard', 4, 'active')")
                ->execute([$floorId, $key . '101']);
            $roomId = (int)$pdo->lastInsertId();
            $pdo->prepare("INSERT INTO residence_beds (room_id, bed_number, status) VALUES (?, '1', 'available')")
                ->execute([$roomId]);
        }
        $bed = $pdo->prepare(
            "SELECT bd.id FROM residence_beds bd JOIN residence_rooms r ON r.id = bd.room_id
             JOIN residence_floors f ON f.id = r.floor_id WHERE f.building_id = ? AND bd.status = 'available' LIMIT 1"
        );
        $bed->execute([$buildingId]);
        $bedId = (int)$bed->fetchColumn();
        if ($bedId === 0) {
            throw new RuntimeException("No free demo bed in $code.");
        }

        $start = date('Y-m-d', strtotime('-30 days'));
        $end = date('Y-m-d', strtotime('+300 days'));
        $pdo->prepare("INSERT INTO residence_applications (application_number, user_id, start_date, end_date, status)
                       VALUES (?, ?, ?, ?, 'approved')")
            ->execute(['DEMO-APP-' . $userId, $userId, $start, $end]);
        $applicationId = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO residence_contracts (contract_number, application_id, user_id, start_date, end_date, status)
                       VALUES (?, ?, ?, ?, ?, 'active')")
            ->execute(['DEMO-HD-' . $userId, $applicationId, $userId, $start, $end]);
        $contractId = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO residence_bed_allocations (bed_id, user_id, contract_id, start_date, end_date, status, assigned_by)
                       VALUES (?, ?, ?, ?, ?, 'active', ?)")
            ->execute([$bedId, $userId, $contractId, $start, $end, $adminId ?: $userId]);
        $pdo->prepare("UPDATE residence_beds SET status = 'occupied' WHERE id = ?")->execute([$bedId]);
    }

    $insertProduct = $pdo->prepare(
        "INSERT INTO products (user_id, category_id, title, description, image, type, status, price, `condition`)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)"
    );
    $insertImage = $pdo->prepare('INSERT INTO product_images (product_id, data, mime) VALUES (?, ?, ?)');
    $images = 0;
    foreach ($offers as $offer) {
        $insertProduct->execute([
            $sellerIds[$offer['seller']], $offer['categoryId'], $offer['title'], $offer['description'],
            // 'db' = image stored in product_images (same marker as NextApiController uploads).
            $offer['image'] !== null ? 'db' : null,
            $offer['type'], $offer['price'], $offer['condition'],
        ]);
        if ($offer['image'] !== null) {
            $insertImage->execute([(int)$pdo->lastInsertId(),
                file_get_contents(ROOT . '/database/demo/marketplace/images/' . $offer['image']), 'image/jpeg']);
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

fwrite(STDOUT, sprintf("Seeded %d demo listings (%d with images) for 3 sellers on %s.\n", count($offers), $images, $today));
fwrite(STDOUT, "Demo seller one-time passwords (never use in production):\n");
foreach ($passwords as $email => $password) {
    fwrite(STDOUT, "$email  $password\n");
}
