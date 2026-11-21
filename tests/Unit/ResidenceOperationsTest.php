<?php

namespace Tests\Unit;

use App\Models\ResidenceOperations;
use Config\Database;
use PHPUnit\Framework\TestCase;

class ResidenceOperationsTest extends TestCase
{
    private \PDO $db;
    private int $studentId;
    private int $secondStudentId;
    private int $managerId;
    private int $buildingId;
    private int $floorId;
    private int $roomId;
    /** @var list<int> */
    private array $bedIds = [];
    private int $spaceId;
    private ResidenceOperations $operations;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db = Database::getInstance();
        $this->operations = new ResidenceOperations();
        $this->studentId = $this->createUser('student');
        $this->secondStudentId = $this->createUser('student');
        $this->managerId = $this->createUser('admin');

        $this->buildingId = $this->operations->saveResource('buildings', [
            'code' => 'T-' . strtoupper(bin2hex(random_bytes(3))),
            'name' => 'Test residence',
            'status' => 'active',
        ]);
        $this->floorId = $this->operations->saveResource('floors', [
            'building_id' => $this->buildingId, 'floor_number' => 1, 'name' => 'Floor 1',
        ]);
        $this->roomId = $this->operations->saveResource('rooms', [
            'floor_id' => $this->floorId, 'room_number' => 'R-' . random_int(1000, 9999),
            'room_type' => 'standard', 'capacity' => 3, 'status' => 'active',
        ]);
        for ($i = 1; $i <= 3; $i++) {
            $this->bedIds[] = $this->operations->saveResource('beds', [
                'room_id' => $this->roomId, 'bed_number' => 'B' . $i, 'status' => 'available',
            ]);
        }
        $this->spaceId = $this->operations->saveResource('rental-spaces', [
            'space_code' => 'S-' . strtoupper(bin2hex(random_bytes(3))),
            'name' => 'Test rental space', 'location' => 'Campus', 'area_sqm' => 20,
            'monthly_price' => 5000000, 'status' => 'available',
        ]);
    }

    protected function tearDown(): void
    {
        $userIds = [$this->studentId, $this->secondStudentId, $this->managerId];
        $marks = implode(',', array_fill(0, count($userIds), '?'));

        $this->db->prepare("DELETE FROM residence_service_requests WHERE user_id IN ({$marks}) OR assigned_to IN ({$marks})")
            ->execute([...$userIds, ...$userIds]);
        $this->db->prepare(
            "DELETE e FROM residence_allocation_events e
             JOIN residence_bed_allocations a ON a.id = e.allocation_id
             WHERE a.user_id IN ({$marks})"
        )->execute($userIds);
        $this->db->prepare("DELETE FROM residence_bed_allocations WHERE user_id IN ({$marks})")->execute($userIds);

        $this->db->prepare(
            "DELETE c FROM rental_contracts c WHERE c.user_id IN ({$marks})"
        )->execute($userIds);
        $this->db->prepare("DELETE FROM rental_applications WHERE user_id IN ({$marks})")->execute($userIds);
        $this->db->prepare(
            "DELETE c FROM residence_contracts c WHERE c.user_id IN ({$marks})"
        )->execute($userIds);
        $this->db->prepare("DELETE FROM residence_applications WHERE user_id IN ({$marks})")->execute($userIds);

        if ($this->spaceId > 0) {
            $this->db->prepare('DELETE FROM rental_spaces WHERE id = ?')->execute([$this->spaceId]);
        }
        foreach ($this->bedIds as $bedId) {
            $this->db->prepare('DELETE FROM residence_beds WHERE id = ?')->execute([$bedId]);
        }
        if ($this->roomId > 0) {
            $this->db->prepare('DELETE FROM residence_rooms WHERE id = ?')->execute([$this->roomId]);
        }
        if ($this->floorId > 0) {
            $this->db->prepare('DELETE FROM residence_floors WHERE id = ?')->execute([$this->floorId]);
        }
        if ($this->buildingId > 0) {
            $this->db->prepare('DELETE FROM residence_buildings WHERE id = ?')->execute([$this->buildingId]);
        }
        $this->db->prepare(
            "DELETE FROM user_role_events WHERE user_id IN ({$marks}) OR actor_id IN ({$marks})"
        )->execute([...$userIds, ...$userIds]);
        $this->db->prepare("DELETE FROM user_roles WHERE user_id IN ({$marks})")->execute($userIds);
        $this->db->prepare("DELETE FROM student_profiles WHERE user_id IN ({$marks})")->execute($userIds);
        $this->db->prepare("DELETE FROM users WHERE id IN ({$marks})")->execute($userIds);
        parent::tearDown();
    }

    public function test_bed_assignment_rejects_overlapping_student_schedule_and_transfer_is_audited(): void
    {
        $contractId = $this->createResidenceContract($this->studentId, '2030-08-01', '2031-07-31');
        $allocation = $this->operations->allocateBed($contractId, $this->bedIds[0], $this->managerId, 'Initial assignment');

        $overlapContract = $this->createResidenceContract($this->studentId, '2031-01-01', '2031-12-31');
        try {
            $this->operations->allocateBed($overlapContract, $this->bedIds[1], $this->managerId, null);
            self::fail('Overlapping residence allocations for one student must be rejected.');
        } catch (\DomainException $e) {
            self::assertSame('ALLOCATION_SCHEDULE_CONFLICT', $e->getMessage());
        }

        $moved = $this->operations->transferBed(
            (int)$allocation['id'], $this->bedIds[2], '2030-10-01', $this->managerId, 'Room change'
        );
        self::assertSame($this->bedIds[2], (int)$moved['bed_id']);
        self::assertSame('2030-09-30', $this->scalar(
            'SELECT end_date FROM residence_bed_allocations WHERE id = ?', [(int)$allocation['id']]
        ));
        self::assertSame('transferred', $this->scalar(
            'SELECT status FROM residence_bed_allocations WHERE id = ?', [(int)$allocation['id']]
        ));
        self::assertSame('transferred', $this->scalar(
            'SELECT event_type FROM residence_allocation_events WHERE allocation_id = ?', [(int)$moved['id']]
        ));
    }

    public function test_service_ticket_assignment_and_rental_approval_create_contract(): void
    {
        $ticketId = $this->operations->createServiceRequest(
            $this->studentId, 'repair', 'Broken light', 'The desk lamp is not working.', null, 'normal'
        );
        self::assertTrue($this->operations->updateServiceRequest(
            $ticketId, $this->managerId, 'in_progress', 'Technician dispatched'
        ));
        self::assertSame('in_progress', $this->scalar(
            'SELECT status FROM residence_service_requests WHERE id = ?', [$ticketId]
        ));

        $rentalAppId = $this->operations->submitRentalApplication(
            $this->secondStudentId, $this->spaceId, '2030-01-01', '2030-12-31', 'Campus Books', null
        );
        $approved = $this->operations->reviewRentalApplication(
            $rentalAppId, $this->managerId, 'approve', 'Approved'
        );
        self::assertSame('approved', $approved['status']);
        self::assertNotEmpty($approved['contract_number']);
        self::assertSame(1, (int)$this->scalar(
            'SELECT COUNT(*) FROM rental_contracts WHERE application_id = ?', [$rentalAppId]
        ));
    }

    public function test_check_out_completes_allocation_frees_bed_and_cannot_repeat(): void
    {
        $contractId = $this->createResidenceContract($this->studentId, '2030-08-01', '2031-07-31');
        $allocation = $this->operations->allocateBed($contractId, $this->bedIds[0], $this->managerId, null);

        try {
            $this->operations->endResidenceContract($contractId, 'terminated', '2030-07-01', $this->managerId, null);
            self::fail('An end date before check-in must be rejected.');
        } catch (\DomainException $e) {
            self::assertSame('INVALID_END_DATE', $e->getMessage());
        }

        $ended = $this->operations->endResidenceContract(
            $contractId, 'terminated', '2031-01-15', $this->managerId, 'Left early'
        );
        self::assertSame('terminated', $ended['status']);
        self::assertSame('2031-01-15', $ended['end_date']);
        self::assertSame('completed', $this->scalar(
            'SELECT status FROM residence_bed_allocations WHERE id = ?', [(int)$allocation['id']]
        ));
        self::assertSame('available', $this->scalar('SELECT status FROM residence_beds WHERE id = ?', [$this->bedIds[0]]));
        self::assertSame('completed', $this->scalar(
            "SELECT event_type FROM residence_allocation_events WHERE allocation_id = ? ORDER BY id DESC LIMIT 1",
            [(int)$allocation['id']]
        ));

        // The freed bed can be given to another student right away.
        $next = $this->createResidenceContract($this->secondStudentId, '2031-02-01', '2031-07-31');
        self::assertSame($this->bedIds[0], (int)$this->operations->allocateBed($next, $this->bedIds[0], $this->managerId, null)['bed_id']);

        try {
            $this->operations->endResidenceContract($contractId, 'expired', '2031-01-20', $this->managerId, null);
            self::fail('An ended contract cannot be ended again.');
        } catch (\DomainException $e) {
            self::assertSame('CONTRACT_NOT_ACTIVE', $e->getMessage());
        }
    }

    public function test_active_rental_contract_can_be_terminated_once(): void
    {
        $rentalAppId = $this->operations->submitRentalApplication(
            $this->secondStudentId, $this->spaceId, '2030-01-01', '2030-12-31', 'Campus Books', null
        );
        $this->operations->reviewRentalApplication($rentalAppId, $this->managerId, 'approve', null);
        $contractId = (int)$this->scalar('SELECT id FROM rental_contracts WHERE application_id = ?', [$rentalAppId]);

        $ended = $this->operations->terminateRentalContract($contractId, '2030-06-30');
        self::assertSame('terminated', $ended['status']);
        self::assertSame('2030-06-30', $ended['end_date']);
        try {
            $this->operations->terminateRentalContract($contractId, '2030-07-31');
            self::fail('A terminated rental contract cannot be terminated again.');
        } catch (\DomainException $e) {
            self::assertSame('CONTRACT_NOT_ACTIVE', $e->getMessage());
        }
    }

    private function createResidenceContract(int $userId, string $start, string $end): int
    {
        $number = 'TEST-' . strtoupper(bin2hex(random_bytes(5)));
        $stmt = $this->db->prepare(
            'INSERT INTO residence_applications
                (application_number, user_id, start_date, end_date, preferred_room_type)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$number, $userId, $start, $end, 'standard']);
        $applicationId = (int)$this->db->lastInsertId();
        $stmt = $this->db->prepare(
            'INSERT INTO residence_contracts
                (contract_number, application_id, user_id, start_date, end_date, status)
             VALUES (?, ?, ?, ?, ?, "pending_assignment")'
        );
        $stmt->execute(['HD-' . $number, $applicationId, $userId, $start, $end]);
        return (int)$this->db->lastInsertId();
    }

    private function createUser(string $role): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 1)'
        );
        $stmt->execute([
            'KTX Operations Test',
            'ktx-operations-' . bin2hex(random_bytes(6)) . '@example.test',
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
