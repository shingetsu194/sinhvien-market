<?php

namespace App\Controllers;

use App\Models\AccessControl;
use App\Models\ResidenceFinance;
use App\Models\ResidenceNotice;
use App\Models\User;
use Core\ApiController;

class ResidenceFinanceApiController extends ApiController
{
    public function feeCategories(): void
    {
        $this->requirePermission('residence.finance.read');
        $manager = $this->hasPermissionForCurrentUser('residence.finance.manage');
        $rows = (new ResidenceFinance())->feeCategories(!$manager);
        $this->success(array_map(static fn(array $row): array => [
            'id' => (int)$row['id'],
            'name' => (string)$row['name'],
            'description' => $row['description'],
            'isActive' => (bool)$row['is_active'],
        ], $rows));
    }

    public function saveFeeCategory(): void
    {
        $actor = $this->requirePermission('residence.finance.manage');
        $this->requireCsrf();
        $data = $this->requestData();
        $name = $this->field($data, 'name');
        $description = $this->field($data, 'description');
        $active = !array_key_exists('isActive', $data) || filter_var($data['isActive'], FILTER_VALIDATE_BOOL);
        if (mb_strlen($name) < 2 || mb_strlen($name) > 120 || mb_strlen($description) > 500) {
            $this->validationError('Tên danh mục hoặc mô tả không hợp lệ.');
        }
        try {
            $id = (new ResidenceFinance())->saveFeeCategory(
                $name,
                $description !== '' ? $description : null,
                $active,
                (int)$actor['id'],
                $this->optionalPositiveInt($_GET['id'] ?? null)
            );
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                $this->error('DUPLICATE_FEE_CATEGORY', 'Tên danh mục phí đã tồn tại.', 409);
            }
            throw $e;
        }
        $this->success(['id' => $id], 'Đã lưu danh mục phí.');
    }

    public function invoices(): void
    {
        $user = $this->requirePermission('residence.finance.read');
        $all = $this->hasPermissionForCurrentUser('residence.finance.manage');
        $invoices = (new ResidenceFinance())->invoices($all ? null : (int)$user['id']);
        $this->success(array_map([$this, 'invoiceDto'], $invoices));
    }

    public function createInvoice(): void
    {
        $manager = $this->requirePermission('residence.finance.manage');
        $this->requireCsrf();
        $data = $this->requestData();
        $userId = filter_var($data['userId'] ?? null, FILTER_VALIDATE_INT);
        $contractId = !isset($data['contractId']) || $data['contractId'] === ''
            ? null
            : filter_var($data['contractId'], FILTER_VALIDATE_INT);
        $description = $this->field($data, 'description');
        $issuedAt = $this->field($data, 'issuedAt', date('Y-m-d'));
        $dueDate = $this->field($data, 'dueDate');
        $lines = $data['lines'] ?? null;
        if ($userId === false || $userId < 1 || $contractId === false
            || ($contractId !== null && $contractId < 1)
            || mb_strlen($description) < 2 || mb_strlen($description) > 255
            || !$this->isValidDate($issuedAt) || !$this->isValidDate($dueDate) || $dueDate < $issuedAt
            || !is_array($lines) || count($lines) < 1 || count($lines) > 30) {
            $this->validationError('Thông tin hóa đơn hoặc thời hạn không hợp lệ.');
        }
        $normalized = [];
        foreach ($lines as $line) {
            if (!is_array($line)) {
                $this->validationError('Dòng hóa đơn không hợp lệ.');
            }
            $categoryId = filter_var($line['feeCategoryId'] ?? null, FILTER_VALIDATE_INT);
            $quantity = filter_var($line['quantity'] ?? null, FILTER_VALIDATE_INT);
            $unitPrice = filter_var($line['unitPrice'] ?? null, FILTER_VALIDATE_INT);
            $lineDescription = $this->field($line, 'description');
            if ($categoryId === false || $categoryId < 1
                || $quantity === false || $quantity < 1 || $quantity > 10000
                || $unitPrice === false || $unitPrice < 0 || $unitPrice > 999999999
                || mb_strlen($lineDescription) < 1 || mb_strlen($lineDescription) > 255) {
                $this->validationError('Một hoặc nhiều dòng hóa đơn không hợp lệ.');
            }
            $normalized[] = [
                'feeCategoryId' => $categoryId,
                'description' => $lineDescription,
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
            ];
        }
        try {
            $id = (new ResidenceFinance())->createInvoice(
                $userId,
                $contractId,
                $description,
                $issuedAt,
                $dueDate,
                $normalized,
                (int)$manager['id']
            );
        } catch (\DomainException $e) {
            $this->financeDomainError($e);
        }
        $this->created(['id' => $id], 'Đã lập hóa đơn lưu trú.');
    }

    public function payments(): void
    {
        $user = $this->requirePermission('residence.finance.read');
        $all = $this->hasPermissionForCurrentUser('residence.finance.manage');
        $rows = (new ResidenceFinance())->payments($all ? null : (int)$user['id']);
        $this->success(array_map([$this, 'paymentDto'], $rows));
    }

    public function recordPayment(): void
    {
        $actor = $this->requirePermission('residence.finance.pay');
        $this->requireCsrf();
        $data = $this->requestData();
        $invoiceId = filter_var($data['invoiceId'] ?? null, FILTER_VALIDATE_INT);
        $amount = filter_var($data['amount'] ?? null, FILTER_VALIDATE_INT);
        $method = $this->field($data, 'method');
        $reference = $this->field($data, 'reference');
        $note = $this->field($data, 'note');
        if ($invoiceId === false || $invoiceId < 1
            || $amount === false || $amount < 1 || $amount > 99999999999999
            || !in_array($method, ['cash', 'bank_transfer', 'other'], true)
            || mb_strlen($reference) > 120 || mb_strlen($note) > 500) {
            $this->validationError('Thông tin thanh toán không hợp lệ.');
        }
        try {
            $id = (new ResidenceFinance())->recordPayment(
                $invoiceId,
                (int)$actor['id'],
                $amount,
                $method,
                $reference !== '' ? $reference : null,
                $note !== '' ? $note : null,
                (int)$actor['id']
            );
        } catch (\DomainException $e) {
            $this->financeDomainError($e);
        }
        $this->created(['id' => $id], 'Đã ghi nhận yêu cầu thanh toán, đang chờ đối soát.');
    }

    /** Void an invoice issued by mistake (no confirmed payment yet). */
    public function voidInvoice(): void
    {
        $actor = $this->requirePermission('residence.finance.manage');
        $this->requireCsrf();
        try {
            (new ResidenceFinance())->voidInvoice(
                filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT) ?: 0,
                (int)$actor['id']
            );
        } catch (\DomainException $e) {
            $this->financeDomainError($e);
        }
        $this->success(null, 'Đã hủy hóa đơn.');
    }

    public function reviewPayment(): void
    {
        $actor = $this->requirePermission('residence.finance.manage');
        $this->requireCsrf();
        $data = $this->requestData();
        $decision = $this->field($data, 'decision');
        if (!in_array($decision, ['confirmed', 'rejected'], true)) {
            $this->validationError('Trạng thái đối soát không hợp lệ.');
        }
        try {
            (new ResidenceFinance())->reviewPayment(
                filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT) ?: 0,
                (int)$actor['id'],
                $decision
            );
        } catch (\DomainException $e) {
            $this->financeDomainError($e);
        }
        $this->success(null, 'Đã cập nhật trạng thái thanh toán.');
    }

    public function notices(): void
    {
        $user = $this->requirePermission('residence.notice.read');
        $manager = $this->hasPermissionForCurrentUser('residence.notice.manage');
        $rows = (new ResidenceNotice())->list($manager, $manager ? null : (int)$user['id']);
        $this->success(array_map(static fn(array $row): array => [
            'id' => (int)$row['id'],
            'type' => (string)$row['notice_type'],
            'title' => (string)$row['title'],
            'body' => (string)$row['body'],
            'audience' => (string)$row['audience'],
            'startsAt' => $row['starts_at'],
            'endsAt' => $row['ends_at'],
            'status' => (string)$row['status'],
            'authorName' => (string)$row['author_name'],
            'createdAt' => (string)$row['created_at'],
        ], $rows));
    }

    public function createNotice(): void
    {
        $user = $this->requirePermission('residence.notice.manage');
        $this->requireCsrf();
        $data = $this->requestData();
        $type = $this->field($data, 'type');
        $title = $this->field($data, 'title');
        $body = $this->field($data, 'body');
        $audience = $this->field($data, 'audience', 'all');
        $startsAt = $this->field($data, 'startsAt');
        $endsAt = $this->field($data, 'endsAt');
        if (!in_array($type, ['announcement', 'event', 'rule'], true)
            || mb_strlen($title) < 3 || mb_strlen($title) > 180
            || mb_strlen($body) < 3 || mb_strlen($body) > 10000
            || !in_array($audience, ['all', 'residents'], true)
            || ($startsAt !== '' && !$this->isValidDateTime($startsAt))
            || ($endsAt !== '' && !$this->isValidDateTime($endsAt))
            || ($startsAt !== '' && $endsAt !== '' && $endsAt < $startsAt)) {
            $this->validationError('Thông tin thông báo, sự kiện hoặc nội quy không hợp lệ.');
        }
        $id = (new ResidenceNotice())->create(
            $type,
            $title,
            $body,
            $audience,
            $startsAt !== '' ? str_replace('T', ' ', $startsAt) . (strlen($startsAt) === 16 ? ':00' : '') : null,
            $endsAt !== '' ? str_replace('T', ' ', $endsAt) . (strlen($endsAt) === 16 ? ':00' : '') : null,
            (int)$user['id']
        );
        $this->created(['id' => $id], 'Đã đăng thông báo.');
    }

    public function archiveNotice(): void
    {
        $this->requirePermission('residence.notice.manage');
        $this->requireCsrf();
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT) ?: 0;
        if ($id < 1 || !(new ResidenceNotice())->archive($id)) {
            $this->notFound('Không tìm thấy thông báo đang được đăng.');
        }
        $this->success(['id' => $id], 'Đã lưu trữ thông báo.');
    }

    private function invoiceDto(array $invoice): array
    {
        return [
            'id' => (int)$invoice['id'],
            'invoiceNumber' => (string)$invoice['invoice_number'],
            'userId' => (int)$invoice['user_id'],
            'studentName' => (string)$invoice['student_name'],
            'contractId' => $invoice['contract_id'] === null ? null : (int)$invoice['contract_id'],
            'description' => (string)$invoice['description'],
            'issuedAt' => (string)$invoice['issued_at'],
            'dueDate' => (string)$invoice['due_date'],
            'totalAmount' => (int)$invoice['total_amount'],
            'paidAmount' => (int)$invoice['paid_amount'],
            'outstandingAmount' => (int)$invoice['outstanding_amount'],
            'status' => (string)$invoice['status'],
            'lines' => array_map(static fn(array $line): array => [
                'id' => (int)$line['id'],
                'feeCategoryId' => $line['fee_category_id'] === null ? null : (int)$line['fee_category_id'],
                'categoryName' => (string)$line['category_name'],
                'description' => (string)$line['description'],
                'quantity' => (float)$line['quantity'],
                'unitPrice' => (int)$line['unit_price'],
                'lineTotal' => (int)$line['line_total'],
            ], $invoice['lines']),
        ];
    }

    private function paymentDto(array $payment): array
    {
        return [
            'id' => (int)$payment['id'],
            'invoiceId' => (int)$payment['invoice_id'],
            'invoiceNumber' => (string)$payment['invoice_number'],
            'studentName' => (string)$payment['student_name'],
            'amount' => (int)$payment['amount'],
            'method' => (string)$payment['method'],
            'reference' => $payment['reference'],
            'note' => $payment['note'],
            'status' => (string)$payment['status'],
            'createdAt' => (string)$payment['created_at'],
        ];
    }

    private function financeDomainError(\DomainException $error): never
    {
        [$code, $message, $status] = match ($error->getMessage()) {
            'CONTRACT_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy hợp đồng của sinh viên.', 404],
            'STUDENT_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy tài khoản sinh viên hợp lệ.', 404],
            'FEE_CATEGORY_NOT_FOUND' => ['FEE_CATEGORY_NOT_FOUND', 'Danh mục phí không tồn tại hoặc đã ngừng hoạt động.', 409],
            'INVOICE_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy hóa đơn của tài khoản hiện tại.', 404],
            'INVOICE_NOT_PAYABLE' => ['INVOICE_NOT_PAYABLE', 'Hóa đơn đã thanh toán hoặc không còn hiệu lực.', 409],
            'PAYMENT_EXCEEDS_BALANCE' => ['PAYMENT_EXCEEDS_BALANCE', 'Số tiền thanh toán vượt quá số dư hóa đơn.', 409],
            'PAYMENT_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy bản ghi thanh toán.', 404],
            'PAYMENT_ALREADY_REVIEWED' => ['PAYMENT_ALREADY_REVIEWED', 'Bản ghi thanh toán đã được đối soát.', 409],
            'INVOICE_NOT_VOIDABLE' => ['INVOICE_NOT_VOIDABLE', 'Chỉ hủy được hóa đơn chưa thu khoản nào.', 409],
            default => ['VALIDATION_ERROR', 'Dữ liệu hóa đơn không hợp lệ.', 422],
        };
        $this->error($code, $message, $status);
    }

    private function requirePermission(string $permission): array
    {
        $session = $this->currentUser();
        if (!$session || empty($session['id'])) {
            $this->unauthorized();
        }
        $users = new User();
        $user = $users->findById((int)$session['id']);
        if (!$user || (int)($user['is_locked'] ?? 0) === 1) {
            $this->unauthorized();
        }
        $sessionToken = (string)($_SESSION['session_token'] ?? '');
        $databaseToken = (string)($user['session_token'] ?? '');
        if ($sessionToken !== '' && $databaseToken !== '' && !hash_equals($databaseToken, $sessionToken)) {
            $this->unauthorized('Phiên đăng nhập đã bị thay thế.');
        }
        if ($sessionToken === '') {
            $sessionToken = bin2hex(random_bytes(16));
            $_SESSION['session_token'] = $sessionToken;
            $users->setSessionToken((int)$user['id'], $sessionToken);
        } elseif ($databaseToken === '') {
            $users->setSessionToken((int)$user['id'], $sessionToken);
        }
        if (!(new AccessControl())->hasPermission((int)$user['id'], $permission)) {
            $this->forbidden();
        }
        return $user;
    }

    private function hasPermissionForCurrentUser(string $permission): bool
    {
        $user = $this->currentUser();
        return isset($user['id']) && (new AccessControl())->hasPermission((int)$user['id'], $permission);
    }

    private function field(array $data, string $key, string $default = ''): string
    {
        $value = $data[$key] ?? $default;
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function optionalPositiveInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $parsed = filter_var($value, FILTER_VALIDATE_INT);
        if ($parsed === false || $parsed < 1) {
            $this->validationError('ID dữ liệu không hợp lệ.');
        }
        return $parsed;
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function isValidDateTime(string $value): bool
    {
        $normalized = str_replace('T', ' ', $value);
        foreach (['!Y-m-d H:i', '!Y-m-d H:i:s'] as $format) {
            $date = \DateTimeImmutable::createFromFormat($format, $normalized);
            if ($date !== false && $date->format(ltrim($format, '!')) === $normalized) {
                return true;
            }
        }
        return false;
    }
}
