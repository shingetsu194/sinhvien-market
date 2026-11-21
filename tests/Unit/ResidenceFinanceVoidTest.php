<?php

namespace Tests\Unit;

use App\Models\ResidenceFinance;
use Config\Database;
use PHPUnit\Framework\TestCase;

class ResidenceFinanceVoidTest extends TestCase
{
    private \PDO $db;
    private ResidenceFinance $finance;
    private int $studentId;
    private int $managerId;
    private int $categoryId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db = Database::getInstance();
        $this->finance = new ResidenceFinance();
        $this->studentId = $this->createUser('student');
        $this->managerId = $this->createUser('admin');
        $this->categoryId = $this->finance->saveFeeCategory(
            'Test fee ' . bin2hex(random_bytes(3)), null, true, $this->managerId
        );
    }

    protected function tearDown(): void
    {
        $this->db->prepare('DELETE FROM residence_payments WHERE user_id = ?')->execute([$this->studentId]);
        $this->db->prepare(
            'DELETE l FROM residence_invoice_lines l JOIN residence_invoices i ON i.id = l.invoice_id WHERE i.user_id = ?'
        )->execute([$this->studentId]);
        $this->db->prepare('DELETE FROM residence_invoices WHERE user_id = ?')->execute([$this->studentId]);
        $this->db->prepare('DELETE FROM residence_fee_categories WHERE id = ?')->execute([$this->categoryId]);
        $this->db->prepare('DELETE FROM users WHERE id IN (?, ?)')->execute([$this->studentId, $this->managerId]);
        parent::tearDown();
    }

    public function test_open_invoice_is_voided_and_its_pending_payment_rejected(): void
    {
        $invoiceId = $this->invoice();
        $paymentId = $this->finance->recordPayment(
            $invoiceId, $this->studentId, 100000, 'bank_transfer', 'REF-1', null, $this->studentId
        );

        $this->finance->voidInvoice($invoiceId, $this->managerId);

        self::assertSame('void', $this->scalar('SELECT status FROM residence_invoices WHERE id = ?', [$invoiceId]));
        self::assertSame('rejected', $this->scalar('SELECT status FROM residence_payments WHERE id = ?', [$paymentId]));
    }

    public function test_invoice_with_a_confirmed_payment_cannot_be_voided(): void
    {
        $invoiceId = $this->invoice();
        $paymentId = $this->finance->recordPayment(
            $invoiceId, $this->studentId, 100000, 'cash', null, null, $this->managerId
        );
        $this->finance->reviewPayment($paymentId, $this->managerId, 'confirmed');

        try {
            $this->finance->voidInvoice($invoiceId, $this->managerId);
            self::fail('An invoice with collected money must not be voided.');
        } catch (\DomainException $e) {
            self::assertSame('INVOICE_NOT_VOIDABLE', $e->getMessage());
        }
        self::assertNotSame('void', $this->scalar('SELECT status FROM residence_invoices WHERE id = ?', [$invoiceId]));
    }

    private function invoice(): int
    {
        return $this->finance->createInvoice(
            $this->studentId,
            null,
            'Test invoice',
            '2030-01-01',
            '2030-01-15',
            [['feeCategoryId' => $this->categoryId, 'description' => 'Room', 'quantity' => 1, 'unitPrice' => 300000]],
            $this->managerId
        );
    }

    private function createUser(string $role): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 1)'
        );
        $stmt->execute([
            'KTX Finance Test',
            'ktx-finance-' . bin2hex(random_bytes(6)) . '@example.test',
            password_hash('TestPass123', PASSWORD_DEFAULT),
            $role,
        ]);
        return (int)$this->db->lastInsertId();
    }

    private function scalar(string $sql, array $params = []): mixed
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }
}
