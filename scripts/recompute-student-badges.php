<?php
/**
 * Tính lại huy hiệu "Sinh viên đã xác thực" cho tài khoản đã tồn tại theo
 * quy tắc tên miền trường hiện hành (User::isStudentEmail).
 *
 *   php scripts/recompute-student-badges.php           # xem trước, không ghi
 *   php scripts/recompute-student-badges.php --apply   # ghi thay đổi
 *
 * - CẤP cho tài khoản sinh viên đã xác minh email (is_verified = 1) có email trường.
 * - THU HỒI ở tài khoản đang có huy hiệu nhưng email không thuộc tên miền trường
 *   (cấp nhầm bởi quy tắc dò chuỗi con cũ, vd x@student.com).
 * Không in email ra màn hình; chỉ in id và tên miền.
 */

declare(strict_types=1);

define('ROOT', dirname(__DIR__));
require_once ROOT . '/config/Database.php';
require_once ROOT . '/core/Model.php';
require_once ROOT . '/app/models/User.php';

use App\Models\User;
use Config\Database;

$apply = in_array('--apply', $argv, true);
$pdo = Database::getInstance();

$rows = $pdo->query(
    "SELECT id, email, is_verified, is_student_verified FROM users WHERE role = 'student' ORDER BY id"
)->fetchAll(PDO::FETCH_ASSOC);

$grant = [];
$revoke = [];
foreach ($rows as $row) {
    $eligible = (int)$row['is_verified'] === 1 && User::isStudentEmail((string)$row['email']);
    $current = (int)$row['is_student_verified'] === 1;
    $domain = substr((string)strrchr((string)$row['email'], '@'), 1);
    if ($eligible && !$current) {
        $grant[] = [(int)$row['id'], $domain];
    } elseif (!$eligible && $current && !User::isStudentEmail((string)$row['email'])) {
        // Only revoke when the domain itself is not a school domain; an
        // unverified mailbox with a school domain keeps a badge granted earlier.
        $revoke[] = [(int)$row['id'], $domain];
    }
}

printf("Đã xét %d tài khoản sinh viên. Cấp: %d, thu hồi: %d.\n", count($rows), count($grant), count($revoke));
foreach ($grant as [$id, $domain]) {
    printf("  + cấp     user #%d (@%s)\n", $id, $domain);
}
foreach ($revoke as [$id, $domain]) {
    printf("  - thu hồi user #%d (@%s)\n", $id, $domain);
}

if (!$apply) {
    echo "Chế độ xem trước: chưa ghi gì. Thêm --apply để áp dụng.\n";
    exit(0);
}

$pdo->beginTransaction();
try {
    $set = $pdo->prepare('UPDATE users SET is_student_verified = ? WHERE id = ?');
    foreach ($grant as [$id]) {
        $set->execute([1, $id]);
    }
    foreach ($revoke as [$id]) {
        $set->execute([0, $id]);
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}
echo "Đã áp dụng.\n";
