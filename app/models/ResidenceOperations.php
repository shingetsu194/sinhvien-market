<?php

namespace App\Models;

use Core\Model;

/**
 * Inventory, accommodation operations, service desk, and commercial rentals.
 */
class ResidenceOperations extends Model
{
    private const TABLES = [
        'buildings' => ['residence_buildings', ['code', 'name', 'address', 'status']],
        'floors' => ['residence_floors', ['building_id', 'floor_number', 'name']],
        'rooms' => ['residence_rooms', ['floor_id', 'room_number', 'room_type', 'capacity', 'status']],
        'beds' => ['residence_beds', ['room_id', 'bed_number', 'status']],
        'rental-spaces' => ['rental_spaces', ['space_code', 'name', 'location', 'area_sqm', 'monthly_price', 'description', 'status']],
    ];

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    public function inventory(): array
    {
        return [
            'buildings' => $this->query('SELECT * FROM residence_buildings ORDER BY name, id'),
            'floors' => $this->query(
                'SELECT f.*, b.code AS building_code, b.name AS building_name
                 FROM residence_floors f JOIN residence_buildings b ON b.id = f.building_id
                 ORDER BY b.name, f.floor_number'
            ),
            'rooms' => $this->query(
                'SELECT r.*, f.floor_number, b.code AS building_code, b.name AS building_name,
                        (SELECT COUNT(*) FROM residence_beds bed WHERE bed.room_id = r.id) AS bed_count
                 FROM residence_rooms r
                 JOIN residence_floors f ON f.id = r.floor_id
                 JOIN residence_buildings b ON b.id = f.building_id
                 ORDER BY b.name, f.floor_number, r.room_number'
            ),
            'beds' => $this->query(
                'SELECT bed.*, r.room_number, f.floor_number, b.code AS building_code, b.name AS building_name
                 FROM residence_beds bed
                 JOIN residence_rooms r ON r.id = bed.room_id
                 JOIN residence_floors f ON f.id = r.floor_id
                 JOIN residence_buildings b ON b.id = f.building_id
                 ORDER BY b.name, f.floor_number, r.room_number, bed.bed_number'
            ),
        ];
    }

    public function saveResource(string $resource, array $data, ?int $id = null): int
    {
        if (!isset(self::TABLES[$resource])) {
            throw new \InvalidArgumentException('INVALID_RESOURCE');
        }
        [$table, $allowed] = self::TABLES[$resource];
        $columns = array_values(array_intersect($allowed, array_keys($data)));
        if ($columns === []) {
            throw new \InvalidArgumentException('EMPTY_RESOURCE');
        }
        $values = array_map(static fn(string $column) => $data[$column], $columns);

        if ($resource === 'beds' && isset($data['room_id'])) {
            $room = $this->queryOne('SELECT capacity FROM residence_rooms WHERE id = ?', [(int)$data['room_id']]);
            if ($room === null) {
                throw new \DomainException('ROOM_NOT_FOUND');
            }
            $otherBeds = $this->count(
                'SELECT COUNT(*) FROM residence_beds WHERE room_id = ? AND id <> ?',
                [(int)$data['room_id'], $id ?? 0]
            );
            if ($otherBeds >= (int)$room['capacity']) {
                throw new \DomainException('ROOM_CAPACITY_REACHED');
            }
        }
        if ($resource === 'beds' && $id === null && ($data['status'] ?? 'available') === 'occupied') {
            throw new \DomainException('BED_HAS_NO_ALLOCATION');
        }
        if ($resource === 'beds' && $id !== null && isset($data['status'])) {
            $active = $this->queryOne(
                "SELECT id FROM residence_bed_allocations
                 WHERE bed_id = ? AND status = 'active' AND end_date >= CURRENT_DATE LIMIT 1",
                [$id]
            );
            if ($active && $data['status'] !== 'occupied') {
                throw new \DomainException('BED_HAS_ACTIVE_ALLOCATION');
            }
            if (!$active && $data['status'] === 'occupied') {
                throw new \DomainException('BED_HAS_NO_ALLOCATION');
            }
        }
        if ($id === null) {
            $fields = implode(', ', array_map(static fn(string $column) => "`{$column}`", $columns));
            $marks = implode(', ', array_fill(0, count($columns), '?'));
            return $this->insert("INSERT INTO `{$table}` ({$fields}) VALUES ({$marks})", $values);
        }

        if ($resource === 'rooms' && isset($data['capacity'])) {
            $bedCount = $this->count('SELECT COUNT(*) FROM residence_beds WHERE room_id = ?', [$id]);
            if ((int)$data['capacity'] < $bedCount) {
                throw new \DomainException('CAPACITY_BELOW_BEDS');
            }
        }
        if ($resource === 'rental-spaces' && ($data['status'] ?? '') === 'available') {
            $activeContract = $id === null ? null : $this->queryOne(
                "SELECT id FROM rental_contracts
                 WHERE space_id = ? AND status = 'active' AND end_date >= CURRENT_DATE
                 LIMIT 1",
                [$id]
            );
            if ($activeContract) {
                throw new \DomainException('SPACE_HAS_ACTIVE_CONTRACT');
            }
        }
        if ($this->queryOne("SELECT id FROM `{$table}` WHERE id = ?", [$id]) === null) {
            throw new \DomainException('RESOURCE_NOT_FOUND');
        }
        $sets = implode(', ', array_map(static fn(string $column) => "`{$column}` = ?", $columns));
        $this->execute("UPDATE `{$table}` SET {$sets} WHERE id = ?", [...$values, $id]);
        return $id;
    }

    public function deleteResource(string $resource, int $id): bool
    {
        if (!isset(self::TABLES[$resource])) {
            throw new \InvalidArgumentException('INVALID_RESOURCE');
        }
        [$table] = self::TABLES[$resource];
        return $this->execute("DELETE FROM `{$table}` WHERE id = ?", [$id]) > 0;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function availableBeds(): array
    {
        return $this->query(
            "SELECT bed.id, bed.bed_number, r.id AS room_id, r.room_number, r.room_type,
                    f.floor_number, b.code AS building_code, b.name AS building_name
             FROM residence_beds bed
             JOIN residence_rooms r ON r.id = bed.room_id
             JOIN residence_floors f ON f.id = r.floor_id
             JOIN residence_buildings b ON b.id = f.building_id
             WHERE bed.status IN ('available', 'occupied')
               AND NOT EXISTS (
                    SELECT 1 FROM residence_bed_allocations allocation
                    WHERE allocation.bed_id = bed.id AND allocation.status = 'active'
                      AND allocation.end_date >= CURRENT_DATE
               )
               AND r.status = 'active' AND b.status = 'active'
             ORDER BY b.name, f.floor_number, r.room_number, bed.bed_number"
        );
    }

    public function allocateBed(int $contractId, int $bedId, int $actorId, ?string $note): array
    {
        $this->pdo()->beginTransaction();
        try {
            $contract = $this->queryOne(
                'SELECT c.*, a.preferred_room_type
                 FROM residence_contracts c
                 JOIN residence_applications a ON a.id = c.application_id
                 WHERE c.id = ? FOR UPDATE',
                [$contractId]
            );
            if (!$contract || $contract['status'] !== 'pending_assignment') {
                throw new \DomainException($contract ? 'CONTRACT_NOT_ASSIGNABLE' : 'CONTRACT_NOT_FOUND');
            }
            $this->queryOne('SELECT id FROM users WHERE id = ? FOR UPDATE', [(int)$contract['user_id']]);
            $bed = $this->queryOne(
                "SELECT bed.*, r.status AS room_status, r.room_type, b.status AS building_status
                 FROM residence_beds bed
                 JOIN residence_rooms r ON r.id = bed.room_id
                 JOIN residence_floors f ON f.id = r.floor_id
                 JOIN residence_buildings b ON b.id = f.building_id
                 WHERE bed.id = ? FOR UPDATE",
                [$bedId]
            );
            if (!$bed || !in_array($bed['status'], ['available', 'occupied'], true) || $bed['room_status'] !== 'active'
                || $bed['building_status'] !== 'active') {
                throw new \DomainException('BED_NOT_AVAILABLE');
            }
            if ($contract['preferred_room_type'] !== 'any'
                && $contract['preferred_room_type'] !== $bed['room_type']) {
                throw new \DomainException('ROOM_TYPE_MISMATCH');
            }
            $this->assertNoAllocationOverlap($bedId, (int)$contract['user_id'], $contract['start_date'], $contract['end_date']);
            $id = $this->insert(
                "INSERT INTO residence_bed_allocations
                    (bed_id, user_id, contract_id, start_date, end_date, status, assigned_by, note)
                 VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
                [$bedId, $contract['user_id'], $contractId, $contract['start_date'], $contract['end_date'], $actorId, $note]
            );
            $this->execute("UPDATE residence_beds SET status = 'occupied' WHERE id = ?", [$bedId]);
            $this->execute("UPDATE residence_contracts SET status = 'active' WHERE id = ?", [$contractId]);
            $this->recordAllocationEvent($id, $actorId, 'allocated', null, $bedId, $contract['start_date'], $note);
            $this->pdo()->commit();
            return $this->allocationById($id) ?? throw new \RuntimeException('Allocation could not be reloaded.');
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function transferBed(int $allocationId, int $newBedId, string $effectiveDate, int $actorId, ?string $note): array
    {
        $this->pdo()->beginTransaction();
        try {
            $current = $this->queryOne(
                'SELECT * FROM residence_bed_allocations WHERE id = ? FOR UPDATE',
                [$allocationId]
            );
            if (!$current || $current['status'] !== 'active') {
                throw new \DomainException($current ? 'ALLOCATION_NOT_ACTIVE' : 'ALLOCATION_NOT_FOUND');
            }
            $this->queryOne('SELECT id FROM users WHERE id = ? FOR UPDATE', [(int)$current['user_id']]);
            if ($effectiveDate <= $current['start_date'] || $effectiveDate > $current['end_date']) {
                throw new \DomainException('INVALID_TRANSFER_DATE');
            }
            $bed = $this->queryOne(
                "SELECT bed.*, r.status AS room_status, b.status AS building_status
                 FROM residence_beds bed
                 JOIN residence_rooms r ON r.id = bed.room_id
                 JOIN residence_floors f ON f.id = r.floor_id
                 JOIN residence_buildings b ON b.id = f.building_id
                 WHERE bed.id = ? FOR UPDATE",
                [$newBedId]
            );
            if (!$bed || !in_array($bed['status'], ['available', 'occupied'], true) || $bed['room_status'] !== 'active'
                || $bed['building_status'] !== 'active' || $newBedId === (int)$current['bed_id']) {
                throw new \DomainException('BED_NOT_AVAILABLE');
            }
            $this->assertNoAllocationOverlap(
                $newBedId,
                (int)$current['user_id'],
                $effectiveDate,
                $current['end_date'],
                $allocationId
            );
            $previousEnd = (new \DateTimeImmutable($effectiveDate))->modify('-1 day')->format('Y-m-d');
            $this->execute(
                "UPDATE residence_bed_allocations SET end_date = ?, status = 'transferred' WHERE id = ?",
                [$previousEnd, $allocationId]
            );
            $this->execute("UPDATE residence_beds SET status = 'available' WHERE id = ?", [(int)$current['bed_id']]);
            $newAllocationId = $this->insert(
                "INSERT INTO residence_bed_allocations
                    (bed_id, user_id, contract_id, start_date, end_date, status, assigned_by, note)
                 VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
                [$newBedId, $current['user_id'], $current['contract_id'], $effectiveDate, $current['end_date'], $actorId, $note]
            );
            $this->execute("UPDATE residence_beds SET status = 'occupied' WHERE id = ?", [$newBedId]);
            $this->recordAllocationEvent($newAllocationId, $actorId, 'transferred', (int)$current['bed_id'], $newBedId, $effectiveDate, $note);
            $this->pdo()->commit();
            return $this->allocationById($newAllocationId) ?? throw new \RuntimeException('Transferred allocation could not be reloaded.');
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Check-out: end a residence contract. "expired" = the stay ran to term,
     * "terminated" = ended early. The active bed allocation is completed on
     * $endDate, the bed becomes available again and the event is logged.
     * A contract still waiting for a bed can be ended too (no allocation).
     *
     * @return array<string, mixed> the updated contract
     */
    public function endResidenceContract(int $contractId, string $status, string $endDate, int $actorId, ?string $note): array
    {
        if (!in_array($status, ['expired', 'terminated'], true)) {
            throw new \InvalidArgumentException('INVALID_CONTRACT_END_STATUS');
        }
        $this->pdo()->beginTransaction();
        try {
            $contract = $this->queryOne('SELECT * FROM residence_contracts WHERE id = ? FOR UPDATE', [$contractId]);
            if (!$contract) {
                throw new \DomainException('CONTRACT_NOT_FOUND');
            }
            if (!in_array($contract['status'], ['pending_assignment', 'active'], true)) {
                throw new \DomainException('CONTRACT_NOT_ACTIVE');
            }
            if ($endDate < $contract['start_date'] || $endDate > $contract['end_date']) {
                throw new \DomainException('INVALID_END_DATE');
            }
            $allocation = $this->queryOne(
                "SELECT * FROM residence_bed_allocations WHERE contract_id = ? AND status = 'active' FOR UPDATE",
                [$contractId]
            );
            if ($allocation) {
                if ($endDate < $allocation['start_date']) {
                    throw new \DomainException('INVALID_END_DATE');
                }
                $this->execute(
                    "UPDATE residence_bed_allocations SET status = 'completed', end_date = ? WHERE id = ?",
                    [$endDate, (int)$allocation['id']]
                );
                $this->execute("UPDATE residence_beds SET status = 'available' WHERE id = ?", [(int)$allocation['bed_id']]);
                $this->recordAllocationEvent((int)$allocation['id'], $actorId, 'completed', (int)$allocation['bed_id'], null, $endDate, $note);
            }
            $this->execute(
                'UPDATE residence_contracts SET status = ?, end_date = ? WHERE id = ?',
                [$status, $endDate, $contractId]
            );
            $this->pdo()->commit();
            return $this->queryOne(
                'SELECT c.*, u.name AS student_name FROM residence_contracts c JOIN users u ON u.id = c.user_id WHERE c.id = ?',
                [$contractId]
            ) ?? throw new \RuntimeException('Ended contract could not be reloaded.');
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    /**
     * End an active rental (kiosk) contract early on $endDate.
     *
     * @return array<string, mixed> the updated contract
     */
    public function terminateRentalContract(int $contractId, string $endDate): array
    {
        $this->pdo()->beginTransaction();
        try {
            $contract = $this->queryOne('SELECT * FROM rental_contracts WHERE id = ? FOR UPDATE', [$contractId]);
            if (!$contract) {
                throw new \DomainException('RENTAL_CONTRACT_NOT_FOUND');
            }
            if ($contract['status'] !== 'active') {
                throw new \DomainException('CONTRACT_NOT_ACTIVE');
            }
            if ($endDate < $contract['start_date'] || $endDate > $contract['end_date']) {
                throw new \DomainException('INVALID_END_DATE');
            }
            $this->execute(
                "UPDATE rental_contracts SET status = 'terminated', end_date = ? WHERE id = ?",
                [$endDate, $contractId]
            );
            $this->pdo()->commit();
            return $this->queryOne(
                'SELECT c.*, s.space_code, s.name AS space_name, u.name AS tenant_name
                 FROM rental_contracts c JOIN rental_spaces s ON s.id = c.space_id
                 JOIN users u ON u.id = c.user_id WHERE c.id = ?',
                [$contractId]
            ) ?? throw new \RuntimeException('Terminated rental contract could not be reloaded.');
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function accommodationHistory(int $userId): array
    {
        return $this->query(
            'SELECT a.id AS allocation_id, a.start_date, a.end_date, a.status AS allocation_status,
                    b.code AS building_code, f.floor_number, r.room_number, bed.bed_number,
                    e.event_type, e.event_date, e.note AS event_note, e.created_at AS event_at
             FROM residence_bed_allocations a
             JOIN residence_beds bed ON bed.id = a.bed_id
             JOIN residence_rooms r ON r.id = bed.room_id
             JOIN residence_floors f ON f.id = r.floor_id
             JOIN residence_buildings b ON b.id = f.building_id
             LEFT JOIN residence_allocation_events e ON e.allocation_id = a.id
             WHERE a.user_id = ?
             ORDER BY a.start_date DESC, e.created_at DESC',
            [$userId]
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function contractAllocations(): array
    {
        return $this->query(
            "SELECT c.id AS contract_id, c.contract_number, c.user_id, u.name AS student_name,
                    a.id AS allocation_id, a.start_date, a.end_date, a.bed_id, b.code AS building_code, f.floor_number,
                    r.room_number, bed.bed_number
             FROM residence_contracts c
             JOIN users u ON u.id = c.user_id
             LEFT JOIN residence_bed_allocations a ON a.contract_id = c.id AND a.status = 'active'
             LEFT JOIN residence_beds bed ON bed.id = a.bed_id
             LEFT JOIN residence_rooms r ON r.id = bed.room_id
             LEFT JOIN residence_floors f ON f.id = r.floor_id
             LEFT JOIN residence_buildings b ON b.id = f.building_id
             WHERE c.status IN ('pending_assignment', 'active')
             ORDER BY c.start_date, c.id"
        );
    }

    public function createServiceRequest(
        int $userId,
        string $type,
        string $title,
        string $description,
        ?int $roomId,
        string $priority,
        ?array $classification = null
    ): int
    {
        if ($roomId !== null && $this->queryOne(
            "SELECT a.id
             FROM residence_bed_allocations a
             JOIN residence_beds bed ON bed.id = a.bed_id
             WHERE a.user_id = ? AND bed.room_id = ? AND a.status = 'active'
               AND a.start_date <= CURRENT_DATE AND a.end_date >= CURRENT_DATE
             LIMIT 1",
            [$userId, $roomId]
        ) === null) {
            throw new \DomainException('ROOM_NOT_ASSIGNED_TO_USER');
        }
        $this->pdo()->beginTransaction();
        try {
            $id = $this->insert(
                "INSERT INTO residence_service_requests (user_id, request_type, title, description, room_id, priority)
                 VALUES (?, ?, ?, ?, ?, ?)",
                [$userId, $type, $title, $description, $roomId, $priority]
            );
            if ($type === 'repair' && $classification !== null) {
                $this->execute(
                    'INSERT INTO residence_service_request_classifications
                        (request_id, category, confidence, recommended_priority, reason, model_key)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE category = VALUES(category), confidence = VALUES(confidence),
                        recommended_priority = VALUES(recommended_priority), reason = VALUES(reason),
                        model_key = VALUES(model_key)',
                    [
                        $id,
                        $classification['category'],
                        $classification['confidence'],
                        $classification['recommendedPriority'],
                        $classification['reason'],
                        $classification['modelKey'],
                    ]
                );
            }
            $this->pdo()->commit();
            return $id;
        } catch (\Throwable $error) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $error;
        }
    }

    public function serviceRequests(?int $userId = null): array
    {
        $where = $userId === null ? '' : 'WHERE q.user_id = ?';
        return $this->query(
            "SELECT q.*, u.name AS requester_name, u.email AS requester_email,
                    staff.name AS assigned_name, r.room_number,
                    classification.category AS ai_category,
                    classification.confidence AS ai_confidence,
                    classification.recommended_priority AS ai_recommended_priority,
                    classification.reason AS ai_reason,
                    classification.model_key AS ai_model_key
             FROM residence_service_requests q
             JOIN users u ON u.id = q.user_id
             LEFT JOIN users staff ON staff.id = q.assigned_to
             LEFT JOIN residence_rooms r ON r.id = q.room_id
             LEFT JOIN residence_service_request_classifications classification ON classification.request_id = q.id
             {$where}
             ORDER BY FIELD(q.status, 'submitted', 'assigned', 'in_progress', 'resolved', 'closed'),
                      q.created_at DESC",
            $userId === null ? [] : [$userId]
        );
    }

    /**
     * Aggregate-only operational metrics. No names, contact details, IDs, or notes.
     *
     * @return array<string, int>
     */
    public function operationsDashboard(): array
    {
        $row = $this->queryOne(
            "SELECT
                (SELECT COUNT(*) FROM residence_buildings WHERE status = 'active') AS active_buildings,
                (SELECT COUNT(*) FROM residence_rooms WHERE status = 'active') AS active_rooms,
                (SELECT COUNT(*) FROM residence_beds WHERE status <> 'inactive') AS total_beds,
                (SELECT COUNT(DISTINCT bed_id) FROM residence_bed_allocations
                    WHERE status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE) AS occupied_beds,
                (SELECT COUNT(*) FROM residence_service_requests
                    WHERE status IN ('submitted', 'assigned', 'in_progress')) AS open_service_requests,
                (SELECT COUNT(*) FROM residence_applications
                    WHERE status IN ('submitted', 'under_review')) AS pending_residence_applications,
                (SELECT COUNT(*) FROM residence_invoices
                    WHERE status IN ('open', 'partial')) AS outstanding_invoices,
                (SELECT COUNT(*) FROM residence_payments WHERE status = 'pending') AS pending_payment_reviews"
        ) ?? [];
        return array_map('intval', $row);
    }

    public function updateServiceRequest(int $id, ?int $assigneeId, ?string $status, ?string $staffNote): bool
    {
        $request = $this->queryOne('SELECT id, assigned_to, status FROM residence_service_requests WHERE id = ?', [$id]);
        if ($request === null) {
            return false;
        }
        if ($status !== null && $status !== $request['status']) {
            $transitions = [
                'submitted' => ['assigned', 'in_progress', 'resolved', 'closed'],
                'assigned' => ['in_progress', 'resolved', 'closed'],
                'in_progress' => ['resolved', 'closed'],
                'resolved' => ['closed'],
                'closed' => [],
            ];
            if (!in_array($status, $transitions[$request['status']] ?? [], true)) {
                throw new \DomainException('INVALID_SERVICE_TRANSITION');
            }
        }
        if ($status === 'assigned' && $assigneeId === null && $request['assigned_to'] === null) {
            throw new \DomainException('SERVICE_ASSIGNEE_REQUIRED');
        }
        $this->execute(
            "UPDATE residence_service_requests
             SET assigned_to = COALESCE(?, assigned_to),
                 status = COALESCE(?, status),
                 staff_note = COALESCE(?, staff_note)
             WHERE id = ?",
            [$assigneeId, $status, $staffNote, $id]
        );
        return true;
    }

    public function listRentalSpaces(): array
    {
        return $this->query(
            "SELECT s.*,
                    CASE WHEN EXISTS (
                        SELECT 1 FROM rental_contracts c
                        WHERE c.space_id = s.id AND c.status = 'active'
                          AND c.start_date <= CURRENT_DATE AND c.end_date >= CURRENT_DATE
                    ) THEN 'occupied' ELSE s.status END AS status
             FROM rental_spaces s
             ORDER BY FIELD(status, 'available', 'reserved', 'occupied', 'inactive'), name"
        );
    }

    public function submitRentalApplication(int $userId, int $spaceId, string $startDate, string $endDate, string $businessName, ?string $note): int
    {
        $this->pdo()->beginTransaction();
        try {
            $space = $this->queryOne('SELECT id, status FROM rental_spaces WHERE id = ? FOR UPDATE', [$spaceId]);
            if (!$space || $space['status'] !== 'available') {
                throw new \DomainException($space ? 'SPACE_NOT_AVAILABLE' : 'SPACE_NOT_FOUND');
            }
            $overlap = $this->queryOne(
                "SELECT id FROM rental_applications
                 WHERE space_id = ? AND status IN ('submitted', 'under_review', 'approved')
                   AND start_date <= ? AND end_date >= ? LIMIT 1",
                [$spaceId, $endDate, $startDate]
            );
            if ($overlap) {
                throw new \DomainException('RENTAL_SPACE_OVERLAP');
            }
            $number = 'MB-' . date('Ym') . '-' . strtoupper(bin2hex(random_bytes(4)));
            $id = $this->insert(
                'INSERT INTO rental_applications
                    (application_number, space_id, user_id, start_date, end_date, business_name, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$number, $spaceId, $userId, $startDate, $endDate, $businessName, $note]
            );
            $this->pdo()->commit();
            return $id;
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function rentalApplications(?int $userId = null): array
    {
        $where = $userId === null ? '' : 'WHERE a.user_id = ?';
        return $this->query(
            "SELECT a.*, s.space_code, s.name AS space_name, u.name AS applicant_name,
                    u.email AS applicant_email, c.contract_number
             FROM rental_applications a
             JOIN rental_spaces s ON s.id = a.space_id
             JOIN users u ON u.id = a.user_id
             LEFT JOIN rental_contracts c ON c.application_id = a.id
             {$where}
             ORDER BY a.created_at DESC",
            $userId === null ? [] : [$userId]
        );
    }

    public function reviewRentalApplication(int $applicationId, int $reviewerId, string $decision, ?string $note): array
    {
        $this->pdo()->beginTransaction();
        try {
            $application = $this->queryOne('SELECT * FROM rental_applications WHERE id = ? FOR UPDATE', [$applicationId]);
            if (!$application) {
                throw new \OutOfBoundsException('RENTAL_APPLICATION_NOT_FOUND');
            }
            if (!in_array($application['status'], ['submitted', 'under_review'], true)) {
                throw new \DomainException('INVALID_STATE_TRANSITION');
            }
            $status = ['under_review' => 'under_review', 'approve' => 'approved', 'reject' => 'rejected'][$decision] ?? null;
            if ($status === null) {
                throw new \InvalidArgumentException('INVALID_DECISION');
            }
            $space = $this->queryOne('SELECT * FROM rental_spaces WHERE id = ? FOR UPDATE', [(int)$application['space_id']]);
            if ($status === 'approved') {
                $overlap = $this->queryOne(
                    "SELECT id FROM rental_contracts
                     WHERE space_id = ? AND status = 'active' AND start_date <= ? AND end_date >= ? LIMIT 1",
                    [(int)$application['space_id'], $application['end_date'], $application['start_date']]
                );
                if ($overlap || !$space || $space['status'] !== 'available') {
                    throw new \DomainException('RENTAL_SPACE_OVERLAP');
                }
            }
            $this->execute(
                'UPDATE rental_applications SET status = ?, reviewed_by = ?, decision_note = ? WHERE id = ?',
                [$status, $reviewerId, $note, $applicationId]
            );
            if ($status === 'approved') {
                $number = 'HDMB-' . date('Ym') . '-' . strtoupper(bin2hex(random_bytes(4)));
                $this->execute(
                    "INSERT INTO rental_contracts
                        (contract_number, application_id, space_id, user_id, start_date, end_date, monthly_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [$number, $applicationId, $application['space_id'], $application['user_id'],
                        $application['start_date'], $application['end_date'], $space['monthly_price']]
                );
            }
            $this->pdo()->commit();
            return $this->queryOne(
                'SELECT a.*, s.name AS space_name, u.name AS applicant_name, c.contract_number
                 FROM rental_applications a
                 JOIN rental_spaces s ON s.id = a.space_id
                 JOIN users u ON u.id = a.user_id
                 LEFT JOIN rental_contracts c ON c.application_id = a.id
                 WHERE a.id = ?',
                [$applicationId]
            ) ?? throw new \RuntimeException('Reviewed rental application could not be reloaded.');
        } catch (\Throwable $e) {
            if ($this->pdo()->inTransaction()) {
                $this->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function rentalContracts(?int $userId = null): array
    {
        $where = $userId === null ? '' : 'WHERE c.user_id = ?';
        return $this->query(
            "SELECT c.*, s.space_code, s.name AS space_name, u.name AS tenant_name
             FROM rental_contracts c JOIN rental_spaces s ON s.id = c.space_id
             JOIN users u ON u.id = c.user_id {$where}
             ORDER BY c.created_at DESC",
            $userId === null ? [] : [$userId]
        );
    }

    private function assertNoAllocationOverlap(
        int $bedId,
        int $userId,
        string $startDate,
        string $endDate,
        int $excludeAllocationId = 0
    ): void
    {
        $conflict = $this->queryOne(
            "SELECT id FROM residence_bed_allocations
             WHERE status IN ('active', 'transferred')
               AND id <> ?
               AND (bed_id = ? OR user_id = ?)
               AND start_date <= ? AND end_date >= ?
             LIMIT 1 FOR UPDATE",
            [$excludeAllocationId, $bedId, $userId, $endDate, $startDate]
        );
        if ($conflict) {
            throw new \DomainException('ALLOCATION_SCHEDULE_CONFLICT');
        }
    }

    private function recordAllocationEvent(int $allocationId, int $actorId, string $type, ?int $fromBed, ?int $toBed, string $date, ?string $note): void
    {
        $this->execute(
            'INSERT INTO residence_allocation_events
                (allocation_id, actor_id, event_type, from_bed_id, to_bed_id, event_date, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$allocationId, $actorId, $type, $fromBed, $toBed, $date, $note]
        );
    }

    private function allocationById(int $id): ?array
    {
        return $this->queryOne(
            'SELECT a.*, bed.bed_number, r.room_number, f.floor_number, b.code AS building_code
             FROM residence_bed_allocations a
             JOIN residence_beds bed ON bed.id = a.bed_id
             JOIN residence_rooms r ON r.id = bed.room_id
             JOIN residence_floors f ON f.id = r.floor_id
             JOIN residence_buildings b ON b.id = f.building_id
             WHERE a.id = ?',
            [$id]
        );
    }
}
