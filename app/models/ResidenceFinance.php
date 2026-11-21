<?php

namespace App\Models;

use Core\Model;

class ResidenceFinance extends Model
{
    public function feeCategories(bool $activeOnly = false): array
    {
        return $this->query(
            'SELECT id, name, description, is_active FROM residence_fee_categories'
            . ($activeOnly ? ' WHERE is_active = 1' : '')
            . ' ORDER BY name, id'
        );
    }

    public function saveFeeCategory(string $name, ?string $description, bool $active, int $actorId, ?int $id = null): int
    {
        if ($id === null) {
            return $this->insert(
                'INSERT INTO residence_fee_categories (name, description, is_active, created_by) VALUES (?, ?, ?, ?)',
                [$name, $description, $active ? 1 : 0, $actorId]
            );
        }
        $changed = $this->execute(
            'UPDATE residence_fee_categories SET name = ?, description = ?, is_active = ? WHERE id = ?',
            [$name, $description, $active ? 1 : 0, $id]
        );
        if ($changed === 0 && $this->queryOne('SELECT id FROM residence_fee_categories WHERE id = ?', [$id]) === null) {
            throw new \DomainException('FEE_CATEGORY_NOT_FOUND');
        }
        return $id;
    }

    /**
     * @param list<array{feeCategoryId:int, description:string, quantity:int, unitPrice:int}> $lines
     */
    public function createInvoice(
        int $userId,
        ?int $contractId,
        string $description,
        string $issuedAt,
        string $dueDate,
        array $lines,
        int $createdBy
    ): int {
        $this->pdo()->beginTransaction();
        try {
            $student = $this->queryOne(
                "SELECT id FROM users
                 WHERE id = ? AND (
                    role = 'student' OR EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN roles r ON r.id = ur.role_id
                        WHERE ur.user_id = users.id AND r.role_key = 'student'
                    )
                 )",
                [$userId]
            );
            if ($student === null) {
                throw new \DomainException('STUDENT_NOT_FOUND');
            }
            if ($contractId !== null) {
                $contract = $this->queryOne(
                    'SELECT id FROM residence_contracts WHERE id = ? AND user_id = ?',
                    [$contractId, $userId]
                );
                if ($contract === null) {
                    throw new \DomainException('CONTRACT_NOT_FOUND');
                }
            }

            $number = 'KTX-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
            $invoiceId = $this->insert(
                "INSERT INTO residence_invoices
                    (invoice_number, user_id, contract_id, description, issued_at, due_date, total_amount, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 0, 'open', ?)",
                [$number, $userId, $contractId, $description, $issuedAt, $dueDate, $createdBy]
            );
            $total = 0;
            foreach ($lines as $line) {
                $category = $this->queryOne(
                    'SELECT id, name FROM residence_fee_categories WHERE id = ? AND is_active = 1',
                    [$line['feeCategoryId']]
                );
                if ($category === null) {
                    throw new \DomainException('FEE_CATEGORY_NOT_FOUND');
                }
                $lineTotal = $line['quantity'] * $line['unitPrice'];
                if ($lineTotal < 0 || $lineTotal > 99999999999999) {
                    throw new \DomainException('INVALID_INVOICE_TOTAL');
                }
                $this->execute(
                    'INSERT INTO residence_invoice_lines
                        (invoice_id, fee_category_id, category_name, description, quantity, unit_price, line_total)
                     VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        $invoiceId,
                        $category['id'],
                        $category['name'],
                        $line['description'],
                        $line['quantity'],
                        $line['unitPrice'],
                        $lineTotal,
                    ]
                );
                $total += $lineTotal;
            }
            if ($total < 1 || $total > 99999999999999) {
                throw new \DomainException('INVALID_INVOICE_TOTAL');
            }
            $this->execute('UPDATE residence_invoices SET total_amount = ? WHERE id = ?', [$total, $invoiceId]);
            $this->pdo()->commit();
            return $invoiceId;
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function invoices(?int $userId = null): array
    {
        $sql = 'SELECT i.*, u.name AS student_name,
                       COALESCE(paid.paid_amount, 0) AS paid_amount
                FROM residence_invoices i
                JOIN users u ON u.id = i.user_id
                LEFT JOIN (
                    SELECT invoice_id, SUM(amount) AS paid_amount
                    FROM residence_payments WHERE status = \'confirmed\'
                    GROUP BY invoice_id
                ) paid ON paid.invoice_id = i.id';
        $params = [];
        if ($userId !== null) {
            $sql .= ' WHERE i.user_id = ?';
            $params[] = $userId;
        }
        $sql .= ' ORDER BY i.due_date DESC, i.id DESC';
        $invoices = $this->query($sql, $params);
        foreach ($invoices as &$invoice) {
            $invoice['lines'] = $this->query(
                'SELECT id, fee_category_id, category_name, description, quantity, unit_price, line_total
                 FROM residence_invoice_lines WHERE invoice_id = ? ORDER BY id',
                [(int)$invoice['id']]
            );
            $invoice['outstanding_amount'] = max(
                0,
                (int)$invoice['total_amount'] - (int)$invoice['paid_amount']
            );
        }
        unset($invoice);
        return $invoices;
    }

    /**
     * Void an invoice issued by mistake. Only an "open" invoice with no
     * confirmed payment can be voided; payments still waiting for review are
     * rejected so the student is not asked to pay a void invoice.
     */
    public function voidInvoice(int $invoiceId, int $actorId): void
    {
        $this->pdo()->beginTransaction();
        try {
            $invoice = $this->queryOne('SELECT * FROM residence_invoices WHERE id = ? FOR UPDATE', [$invoiceId]);
            if ($invoice === null) {
                throw new \DomainException('INVOICE_NOT_FOUND');
            }
            $confirmed = $this->queryOne(
                "SELECT COUNT(*) AS n FROM residence_payments WHERE invoice_id = ? AND status = 'confirmed'",
                [$invoiceId]
            );
            if ($invoice['status'] !== 'open' || (int)$confirmed['n'] > 0) {
                throw new \DomainException('INVOICE_NOT_VOIDABLE');
            }
            $this->execute(
                "UPDATE residence_payments SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
                 WHERE invoice_id = ? AND status = 'pending'",
                [$actorId, $invoiceId]
            );
            $this->execute("UPDATE residence_invoices SET status = 'void' WHERE id = ?", [$invoiceId]);
            $this->pdo()->commit();
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function payments(?int $userId = null): array
    {
        $sql = 'SELECT p.*, i.invoice_number, u.name AS student_name
                FROM residence_payments p
                JOIN residence_invoices i ON i.id = p.invoice_id
                JOIN users u ON u.id = p.user_id';
        $params = [];
        if ($userId !== null) {
            $sql .= ' WHERE p.user_id = ?';
            $params[] = $userId;
        }
        $sql .= ' ORDER BY p.created_at DESC, p.id DESC';
        return $this->query($sql, $params);
    }

    public function recordPayment(
        int $invoiceId,
        int $userId,
        int $amount,
        string $method,
        ?string $reference,
        ?string $note,
        int $actorId
    ): int {
        $this->pdo()->beginTransaction();
        try {
            $invoice = $this->queryOne(
                'SELECT * FROM residence_invoices WHERE id = ? AND user_id = ? FOR UPDATE',
                [$invoiceId, $userId]
            );
            if ($invoice === null) {
                throw new \DomainException('INVOICE_NOT_FOUND');
            }
            if ($invoice['status'] === 'void' || $invoice['status'] === 'paid') {
                throw new \DomainException('INVOICE_NOT_PAYABLE');
            }
            $reserved = $this->queryOne(
                "SELECT COALESCE(SUM(amount), 0) AS amount FROM residence_payments
                 WHERE invoice_id = ? AND status IN ('pending', 'confirmed')",
                [$invoiceId]
            );
            if ($amount > (int)$invoice['total_amount'] - (int)($reserved['amount'] ?? 0)) {
                throw new \DomainException('PAYMENT_EXCEEDS_BALANCE');
            }
            $paymentId = $this->insert(
                "INSERT INTO residence_payments
                    (invoice_id, user_id, amount, method, reference, note, status, recorded_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
                [$invoiceId, $userId, $amount, $method, $reference, $note, $actorId]
            );
            $this->pdo()->commit();
            return $paymentId;
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function reviewPayment(int $paymentId, int $reviewerId, string $decision): void
    {
        $this->pdo()->beginTransaction();
        try {
            $payment = $this->queryOne('SELECT * FROM residence_payments WHERE id = ? FOR UPDATE', [$paymentId]);
            if ($payment === null) {
                throw new \DomainException('PAYMENT_NOT_FOUND');
            }
            if ($payment['status'] !== 'pending') {
                throw new \DomainException('PAYMENT_ALREADY_REVIEWED');
            }
            if ($decision === 'confirmed') {
                $invoice = $this->queryOne(
                    'SELECT * FROM residence_invoices WHERE id = ? FOR UPDATE',
                    [(int)$payment['invoice_id']]
                );
                $paid = $this->queryOne(
                    "SELECT COALESCE(SUM(amount), 0) AS amount FROM residence_payments
                     WHERE invoice_id = ? AND status = 'confirmed'",
                    [(int)$payment['invoice_id']]
                );
                if ($invoice === null || (int)$paid['amount'] + (int)$payment['amount'] > (int)$invoice['total_amount']) {
                    throw new \DomainException('PAYMENT_EXCEEDS_BALANCE');
                }
                $this->execute(
                    "UPDATE residence_payments SET status = 'confirmed', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
                     WHERE id = ?",
                    [$reviewerId, $paymentId]
                );
                $newPaid = (int)$paid['amount'] + (int)$payment['amount'];
                $newStatus = $newPaid >= (int)$invoice['total_amount'] ? 'paid' : 'partial';
                $this->execute('UPDATE residence_invoices SET status = ? WHERE id = ?', [$newStatus, $invoice['id']]);
            } else {
                $this->execute(
                    "UPDATE residence_payments SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
                     WHERE id = ?",
                    [$reviewerId, $paymentId]
                );
            }
            $this->pdo()->commit();
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }
}
