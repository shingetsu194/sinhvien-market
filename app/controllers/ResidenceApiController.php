<?php

namespace App\Controllers;

use App\Models\AccessControl;
use App\Models\ResidenceApplication;
use App\Models\ResidenceOperations;
use App\Models\StudentProfile;
use App\Models\User;
use App\Services\LocalDormRulesAssistant;
use App\Services\LocalRepairClassifier;
use Core\ApiController;

class ResidenceApiController extends ApiController
{
    public function studentProfile(): void
    {
        $user = $this->requirePermission('student.profile.read');
        $profile = (new StudentProfile())->findByUserId((int)$user['id']);
        if ($profile === null) {
            $this->notFound('Không tìm thấy hồ sơ sinh viên.');
        }

        $this->success($this->studentProfileDto($profile));
    }

    public function updateStudentProfile(): void
    {
        $user = $this->requirePermission('student.profile.update');
        $this->requireCsrf();
        $data = $this->requestData();

        $name = $this->field($data, 'name');
        $phone = $this->field($data, 'phone');
        $studentNumber = $this->field($data, 'studentNumber');
        $university = $this->field($data, 'university');
        $faculty = $this->field($data, 'faculty');
        $program = $this->field($data, 'program');
        $academicYear = $this->field($data, 'academicYear');
        $dateOfBirth = $this->field($data, 'dateOfBirth');
        $emergencyName = $this->field($data, 'emergencyContactName');
        $emergencyPhone = $this->field($data, 'emergencyContactPhone');

        if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
            $this->validationError('Họ tên phải từ 2 đến 100 ký tự.');
        }
        if ($phone !== '' && !preg_match('/^(0|\+84)[0-9]{8,10}$/', $phone)) {
            $this->validationError('Số điện thoại sinh viên không hợp lệ.');
        }
        if (mb_strlen($studentNumber) > 30 || mb_strlen($university) > 200
            || mb_strlen($faculty) > 150 || mb_strlen($program) > 150
            || mb_strlen($academicYear) > 20 || mb_strlen($emergencyName) > 100) {
            $this->validationError('Một hoặc nhiều trường hồ sơ vượt quá độ dài cho phép.');
        }
        if ($emergencyPhone !== '' && !preg_match('/^(0|\+84)[0-9]{8,10}$/', $emergencyPhone)) {
            $this->validationError('Số điện thoại liên hệ khẩn cấp không hợp lệ.');
        }
        if ($dateOfBirth !== '' && !$this->isValidDate($dateOfBirth)) {
            $this->validationError('Ngày sinh phải theo định dạng YYYY-MM-DD.');
        }

        try {
            (new StudentProfile())->save((int)$user['id'], [
                'name' => $name,
                'phone' => $phone !== '' ? $phone : null,
                'student_number' => $studentNumber !== '' ? $studentNumber : null,
                'university' => $university !== '' ? $university : null,
                'faculty' => $faculty !== '' ? $faculty : null,
                'program' => $program !== '' ? $program : null,
                'academic_year' => $academicYear !== '' ? $academicYear : null,
                'date_of_birth' => $dateOfBirth !== '' ? $dateOfBirth : null,
                'emergency_contact_name' => $emergencyName !== '' ? $emergencyName : null,
                'emergency_contact_phone' => $emergencyPhone !== '' ? $emergencyPhone : null,
            ]);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                $this->error('STUDENT_NUMBER_EXISTS', 'Mã số sinh viên đã được sử dụng.', 409);
            }
            throw $e;
        }

        $_SESSION['user']['name'] = $name;
        $saved = (new StudentProfile())->findByUserId((int)$user['id']);
        if ($saved === null) {
            throw new \RuntimeException('Student profile disappeared after a successful update.');
        }
        $this->success($this->studentProfileDto($saved), 'Đã cập nhật hồ sơ sinh viên.');
    }

    public function applications(): void
    {
        $user = $this->requirePermission('residence.application.read');
        $rows = (new ResidenceApplication())->listForStudent((int)$user['id']);
        $this->success(array_map([$this, 'applicationDto'], $rows));
    }

    public function submitApplication(): void
    {
        $user = $this->requirePermission('residence.application.create');
        $this->requireCsrf();
        $data = $this->requestData();
        $startDate = $this->field($data, 'startDate');
        $endDate = $this->field($data, 'endDate');
        $roomType = $this->field($data, 'preferredRoomType', 'any');
        $note = $this->field($data, 'note');

        if (!$this->isValidDate($startDate) || !$this->isValidDate($endDate)
            || $startDate < (new \DateTimeImmutable('today', new \DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d')
            || $endDate <= $startDate) {
            $this->validationError('Thời gian lưu trú không hợp lệ.');
        }
        if (!in_array($roomType, ['any', 'standard', 'private', 'accessible'], true)) {
            $this->validationError('Loại phòng mong muốn không hợp lệ.');
        }
        if (mb_strlen($note) > 1000) {
            $this->validationError('Ghi chú không được vượt quá 1000 ký tự.');
        }

        $profile = (new StudentProfile())->findByUserId((int)$user['id']);
        if ($profile === null || trim((string)($profile['student_number'] ?? '')) === ''
            || trim((string)($profile['university'] ?? '')) === '') {
            $this->error(
                'PROFILE_INCOMPLETE',
                'Vui lòng cập nhật mã số sinh viên và trường học trước khi đăng ký lưu trú.',
                409
            );
        }

        try {
            $application = (new ResidenceApplication())->submit(
                (int)$user['id'],
                $startDate,
                $endDate,
                $roomType,
                $note !== '' ? $note : null
            );
        } catch (\DomainException $e) {
            if ($e->getMessage() === 'APPLICATION_OVERLAP') {
                $this->error('APPLICATION_OVERLAP', 'Đã có hồ sơ lưu trú đang hoạt động trong khoảng thời gian này.', 409);
            }
            throw $e;
        }

        $this->created($this->applicationDto($application), 'Đã gửi hồ sơ đăng ký lưu trú.');
    }

    public function contracts(): void
    {
        $user = $this->requirePermission('residence.contract.read');
        $rows = (new ResidenceApplication())->listContractsForStudent((int)$user['id']);
        $this->success(array_map([$this, 'contractDto'], $rows));
    }

    public function reviewApplications(): void
    {
        $this->requirePermission('residence.application.review');
        $rows = (new ResidenceApplication())->listForReview();
        $this->success(array_map([$this, 'applicationDto'], $rows));
    }

    public function reviewApplication(): void
    {
        $reviewer = $this->requirePermission('residence.application.review');
        $this->requireCsrf();
        $applicationId = (int)($_GET['id'] ?? 0);
        $data = $this->requestData();
        $decision = $this->field($data, 'decision');
        $note = $this->field($data, 'note');

        if ($applicationId <= 0 || !in_array($decision, ['under_review', 'approve', 'reject'], true)) {
            $this->validationError('Quyết định xét duyệt không hợp lệ.');
        }
        if (mb_strlen($note) > 1000 || ($decision === 'reject' && trim($note) === '')) {
            $this->validationError('Vui lòng nhập lý do từ chối, tối đa 1000 ký tự.');
        }

        try {
            $application = (new ResidenceApplication())->review(
                $applicationId,
                (int)$reviewer['id'],
                $decision,
                $note !== '' ? $note : null
            );
        } catch (\OutOfBoundsException $e) {
            $this->notFound('Không tìm thấy hồ sơ lưu trú.');
        } catch (\DomainException $e) {
            $this->error('INVALID_STATE_TRANSITION', 'Hồ sơ này không còn ở trạng thái có thể xét duyệt.', 409);
        } catch (\InvalidArgumentException $e) {
            $this->validationError('Quyết định xét duyệt không hợp lệ.');
        }

        $message = $decision === 'approve'
            ? 'Đã duyệt hồ sơ và tạo hợp đồng chờ phân phòng.'
            : ($decision === 'reject' ? 'Đã từ chối hồ sơ lưu trú.' : 'Đã tiếp nhận hồ sơ để xét duyệt.');
        $this->success($this->applicationDto($application), $message);
    }

    public function residenceContractsForManagers(): void
    {
        $this->requirePermission('residence.contract.manage');
        $rows = (new ResidenceApplication())->listContractsForManagers();
        $this->success(array_map([$this, 'contractDto'], $rows));
    }

    public function assignableRoles(): void
    {
        $this->requirePermission('system.roles.manage');
        $this->success((new AccessControl())->assignableRoles());
    }

    public function assignRole(): void
    {
        $admin = $this->requirePermission('system.roles.manage');
        $this->requireCsrf();
        $userId = (int)($_GET['id'] ?? 0);
        $roleKey = $this->field($this->requestData(), 'roleKey');
        if ($userId <= 0 || $roleKey === '') {
            $this->validationError('Tài khoản và vai trò cần gán không hợp lệ.');
        }
        if (!(new User())->findById($userId)) {
            $this->notFound('Không tìm thấy tài khoản.');
        }
        if (!(new AccessControl())->assignRole($userId, $roleKey, (int)$admin['id'])) {
            $this->validationError('Vai trò được yêu cầu không được phép gán.');
        }

        $this->success(['userId' => $userId, 'roleKey' => $roleKey], 'Đã cấp vai trò cho tài khoản.');
    }

    public function inventory(): void
    {
        $this->requirePermission('building.manage');
        $this->success($this->camelize((new ResidenceOperations())->inventory()));
    }

    public function availableBeds(): void
    {
        $this->requirePermission('residence.contract.manage');
        $this->success($this->camelize((new ResidenceOperations())->availableBeds()));
    }

    public function contractAllocations(): void
    {
        $this->requirePermission('residence.contract.manage');
        $this->success($this->camelize((new ResidenceOperations())->contractAllocations()));
    }

    public function createBuilding(): void { $this->createInventoryResource('buildings'); }
    public function updateBuilding(): void { $this->updateInventoryResource('buildings'); }
    public function deleteBuilding(): void { $this->deleteInventoryResource('buildings'); }
    public function createFloor(): void { $this->createInventoryResource('floors'); }
    public function updateFloor(): void { $this->updateInventoryResource('floors'); }
    public function deleteFloor(): void { $this->deleteInventoryResource('floors'); }
    public function createRoom(): void { $this->createInventoryResource('rooms'); }
    public function updateRoom(): void { $this->updateInventoryResource('rooms'); }
    public function deleteRoom(): void { $this->deleteInventoryResource('rooms'); }
    public function createBed(): void { $this->createInventoryResource('beds'); }
    public function updateBed(): void { $this->updateInventoryResource('beds'); }
    public function deleteBed(): void { $this->deleteInventoryResource('beds'); }

    public function allocateBed(): void
    {
        $actor = $this->requirePermission('residence.contract.manage');
        $this->requireCsrf();
        $data = $this->requestData();
        $contractId = (int)($data['contractId'] ?? 0);
        $bedId = (int)($data['bedId'] ?? 0);
        $note = $this->field($data, 'note');
        if ($contractId < 1 || $bedId < 1 || mb_strlen($note) > 1000) {
            $this->validationError('Hợp đồng, giường và ghi chú phân phòng không hợp lệ.');
        }
        try {
            $allocation = (new ResidenceOperations())->allocateBed(
                $contractId, $bedId, (int)$actor['id'], $note !== '' ? $note : null
            );
            $this->created($this->camelize($allocation), 'Đã phân giường cho hợp đồng.');
        } catch (\DomainException $e) {
            $this->operationDomainError($e);
        }
    }

    /** Check-out / end a residence contract and free its bed. */
    public function endContract(): void
    {
        $actor = $this->requirePermission('residence.contract.manage');
        $this->requireCsrf();
        $contractId = (int)($_GET['id'] ?? 0);
        $data = $this->requestData();
        $status = $this->field($data, 'status') ?: 'expired';
        $endDate = $this->field($data, 'endDate') ?: date('Y-m-d');
        $note = $this->field($data, 'note');
        if ($contractId < 1 || !in_array($status, ['expired', 'terminated'], true)
            || !$this->isValidDate($endDate) || mb_strlen($note) > 1000) {
            $this->validationError('Thông tin kết thúc hợp đồng không hợp lệ.');
        }
        try {
            $contract = (new ResidenceOperations())->endResidenceContract(
                $contractId, $status, $endDate, (int)$actor['id'], $note !== '' ? $note : null
            );
            $this->success($this->camelize($contract), 'Đã kết thúc hợp đồng và trả giường.');
        } catch (\DomainException $e) {
            $this->operationDomainError($e);
        }
    }

    /** End an active rental (kiosk) contract early. */
    public function terminateRentalContract(): void
    {
        $this->requirePermission('rental.space.manage');
        $this->requireCsrf();
        $contractId = (int)($_GET['id'] ?? 0);
        $endDate = $this->field($this->requestData(), 'endDate') ?: date('Y-m-d');
        if ($contractId < 1 || !$this->isValidDate($endDate)) {
            $this->validationError('Thông tin chấm dứt hợp đồng thuê không hợp lệ.');
        }
        try {
            $contract = (new ResidenceOperations())->terminateRentalContract($contractId, $endDate);
            $this->success($this->camelize($contract), 'Đã chấm dứt hợp đồng thuê mặt bằng.');
        } catch (\DomainException $e) {
            $this->operationDomainError($e);
        }
    }

    public function transferBed(): void
    {
        $actor = $this->requirePermission('residence.contract.manage');
        $this->requireCsrf();
        $allocationId = (int)($_GET['id'] ?? 0);
        $data = $this->requestData();
        $bedId = (int)($data['bedId'] ?? 0);
        $date = $this->field($data, 'effectiveDate');
        $note = $this->field($data, 'note');
        if ($allocationId < 1 || $bedId < 1 || !$this->isValidDate($date) || mb_strlen($note) > 1000) {
            $this->validationError('Thông tin chuyển phòng không hợp lệ.');
        }
        try {
            $allocation = (new ResidenceOperations())->transferBed(
                $allocationId, $bedId, $date, (int)$actor['id'], $note !== '' ? $note : null
            );
            $this->success($this->camelize($allocation), 'Đã chuyển giường và lưu lịch sử.');
        } catch (\DomainException $e) {
            $this->operationDomainError($e);
        }
    }

    public function accommodationHistory(): void
    {
        $user = $this->requirePermission('residence.contract.read');
        $this->success($this->camelize((new ResidenceOperations())->accommodationHistory((int)$user['id'])));
    }

    public function serviceRequests(): void
    {
        $user = $this->requirePermission('service.request.read');
        $manager = (new AccessControl())->hasPermission((int)$user['id'], 'service.request.manage');
        $rows = (new ResidenceOperations())->serviceRequests($manager ? null : (int)$user['id']);
        $this->success($this->camelize($rows));
    }

    public function createServiceRequest(): void
    {
        $user = $this->requirePermission('service.request.create');
        $this->requireCsrf();
        $data = $this->requestData();
        $type = $this->field($data, 'requestType');
        $title = $this->field($data, 'title');
        $description = $this->field($data, 'description');
        $roomId = isset($data['roomId']) && $data['roomId'] !== '' ? (int)$data['roomId'] : null;
        $priority = $this->field($data, 'priority', 'normal');
        if (!in_array($type, ['service', 'repair', 'feedback'], true)
            || mb_strlen($title) < 3 || mb_strlen($title) > 160
            || mb_strlen($description) < 3 || mb_strlen($description) > 2000
            || !in_array($priority, ['low', 'normal', 'high', 'urgent'], true)
            || ($roomId !== null && $roomId < 1)) {
            $this->validationError('Nội dung yêu cầu dịch vụ không hợp lệ.');
        }
        $classification = null;
        if ($type === 'repair') {
            $this->requirePermission('residence.ai.repair.classify');
            $classification = (new LocalRepairClassifier())->classify($title . ' ' . $description);
        }
        try {
            $id = (new ResidenceOperations())->createServiceRequest(
                (int)$user['id'], $type, $title, $description, $roomId, $priority, $classification
            );
        } catch (\DomainException $e) {
            if ($e->getMessage() === 'ROOM_NOT_ASSIGNED_TO_USER') {
                $this->error('ROOM_NOT_ASSIGNED_TO_USER', 'Chỉ có thể gắn yêu cầu với phòng đang lưu trú của bạn.', 403);
            }
            throw $e;
        }
        $this->created([
            'id' => $id,
            'classification' => $classification,
        ], 'Đã gửi yêu cầu.');
    }

    public function dormRulesAssistant(): void
    {
        $user = $this->requirePermission('residence.ai.rules_assistant.use');
        $this->requireCsrf();
        $data = $this->requestData();
        $question = $this->field($data, 'question');
        if ($question === '' || mb_strlen($question) > 500) {
            $this->validationError('Câu hỏi không được để trống và tối đa 500 ký tự.');
        }
        $allRules = (new AccessControl())->hasPermission((int)$user['id'], 'residence.notice.manage');
        $answer = (new LocalDormRulesAssistant())->answer(
            $question,
            $allRules ? null : (int)$user['id']
        );
        $this->success($answer);
    }

    public function operationsDashboard(): void
    {
        $this->requirePermission('residence.operations.dashboard.read');
        $this->success($this->camelize((new ResidenceOperations())->operationsDashboard()));
    }

    public function updateServiceRequest(): void
    {
        $this->requirePermission('service.request.manage');
        $this->requireCsrf();
        $id = (int)($_GET['id'] ?? 0);
        $data = $this->requestData();
        $assigneeId = isset($data['assignedTo']) && $data['assignedTo'] !== '' ? (int)$data['assignedTo'] : null;
        $status = isset($data['status']) ? $this->field($data, 'status') : null;
        $note = isset($data['staffNote']) ? $this->field($data, 'staffNote') : null;
        if ($id < 1 || ($status !== null && !in_array($status, ['submitted', 'assigned', 'in_progress', 'resolved', 'closed'], true))
            || ($assigneeId !== null && $assigneeId < 1) || ($note !== null && mb_strlen($note) > 1000)) {
            $this->validationError('Thông tin phân công yêu cầu không hợp lệ.');
        }
        if ($assigneeId !== null && !(new AccessControl())->hasPermission($assigneeId, 'service.request.manage')) {
            $this->validationError('Tài khoản được chọn không phải nhân viên dịch vụ.');
        }
        try {
            if (!(new ResidenceOperations())->updateServiceRequest($id, $assigneeId, $status, $note)) {
                $this->notFound('Không tìm thấy yêu cầu dịch vụ.');
            }
        } catch (\DomainException $e) {
            if ($e->getMessage() === 'INVALID_SERVICE_TRANSITION') {
                $this->error('INVALID_STATE_TRANSITION', 'Trạng thái yêu cầu không thể chuyển theo quy trình hiện tại.', 409);
            }
            if ($e->getMessage() === 'SERVICE_ASSIGNEE_REQUIRED') {
                $this->error('SERVICE_ASSIGNEE_REQUIRED', 'Hãy phân công nhân viên trước khi đánh dấu đã phân công.', 422);
            }
            throw $e;
        }
        $this->success(['id' => $id], 'Đã cập nhật yêu cầu dịch vụ.');
    }

    public function rentalSpaces(): void
    {
        $this->requirePermission('rental.space.read');
        $this->success($this->camelize((new ResidenceOperations())->listRentalSpaces()));
    }

    public function createRentalSpace(): void { $this->createInventoryResource('rental-spaces'); }
    public function updateRentalSpace(): void { $this->updateInventoryResource('rental-spaces'); }
    public function deleteRentalSpace(): void { $this->deleteInventoryResource('rental-spaces'); }

    public function rentalApplications(): void
    {
        $user = $this->requirePermission('rental.application.create');
        $this->success($this->camelize((new ResidenceOperations())->rentalApplications((int)$user['id'])));
    }

    public function submitRentalApplication(): void
    {
        $user = $this->requirePermission('rental.application.create');
        $this->requireCsrf();
        $data = $this->requestData();
        $spaceId = (int)($data['spaceId'] ?? 0);
        $start = $this->field($data, 'startDate');
        $end = $this->field($data, 'endDate');
        $businessName = $this->field($data, 'businessName');
        $note = $this->field($data, 'note');
        $today = (new \DateTimeImmutable('today', new \DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
        if ($spaceId < 1 || !$this->isValidDate($start) || !$this->isValidDate($end)
            || $start < $today || $end <= $start || mb_strlen($businessName) < 2
            || mb_strlen($businessName) > 150 || mb_strlen($note) > 1000) {
            $this->validationError('Thông tin đề nghị thuê mặt bằng không hợp lệ.');
        }
        try {
            $id = (new ResidenceOperations())->submitRentalApplication(
                (int)$user['id'], $spaceId, $start, $end, $businessName, $note !== '' ? $note : null
            );
            $this->created(['id' => $id], 'Đã gửi đề nghị thuê mặt bằng.');
        } catch (\DomainException $e) {
            $this->operationDomainError($e);
        }
    }

    public function rentalApplicationsForReview(): void
    {
        $this->requirePermission('rental.application.review');
        $this->success($this->camelize((new ResidenceOperations())->rentalApplications()));
    }

    public function reviewRentalApplication(): void
    {
        $actor = $this->requirePermission('rental.application.review');
        $this->requireCsrf();
        $id = (int)($_GET['id'] ?? 0);
        $data = $this->requestData();
        $decision = $this->field($data, 'decision');
        $note = $this->field($data, 'note');
        if ($id < 1 || !in_array($decision, ['under_review', 'approve', 'reject'], true)
            || mb_strlen($note) > 1000 || ($decision === 'reject' && $note === '')) {
            $this->validationError('Quyết định xét duyệt đề nghị thuê không hợp lệ.');
        }
        try {
            $application = (new ResidenceOperations())->reviewRentalApplication(
                $id, (int)$actor['id'], $decision, $note !== '' ? $note : null
            );
            $this->success($this->camelize($application), 'Đã cập nhật đề nghị thuê.');
        } catch (\OutOfBoundsException $e) {
            $this->notFound('Không tìm thấy đề nghị thuê mặt bằng.');
        } catch (\DomainException $e) {
            $this->operationDomainError($e);
        }
    }

    public function rentalContracts(): void
    {
        $user = $this->requirePermission('rental.contract.read');
        $manager = (new AccessControl())->hasPermission((int)$user['id'], 'rental.application.review');
        $this->success($this->camelize((new ResidenceOperations())->rentalContracts(
            $manager ? null : (int)$user['id']
        )));
    }

    private function createInventoryResource(string $resource): void
    {
        $this->requirePermission($resource === 'rental-spaces' ? 'rental.space.manage' : 'building.manage');
        $this->requireCsrf();
        $data = $this->resourceData($resource, $this->requestData());
        try {
            $id = (new ResidenceOperations())->saveResource($resource, $data);
            $this->created(['id' => $id], 'Đã tạo dữ liệu.');
        } catch (\DomainException $e) {
            $codes = [
                'ROOM_CAPACITY_REACHED' => 'Phòng đã đạt sức chứa tối đa.',
                'ROOM_NOT_FOUND' => 'Không tìm thấy phòng được chọn.',
                'RESOURCE_NOT_FOUND' => 'Không tìm thấy dữ liệu cần cập nhật.',
                'BED_HAS_NO_ALLOCATION' => 'Giường mới không thể được đánh dấu đang sử dụng trước khi phân phòng.',
            ];
            if (isset($codes[$e->getMessage()])) {
                $this->error($e->getMessage(), $codes[$e->getMessage()],
                    in_array($e->getMessage(), ['ROOM_NOT_FOUND', 'RESOURCE_NOT_FOUND'], true) ? 404 : 409);
            }
            throw $e;
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                $this->error('DUPLICATE_RESOURCE', 'Mã hoặc tên dữ liệu đã tồn tại hoặc đang được sử dụng.', 409);
            }
            throw $e;
        }
    }

    private function updateInventoryResource(string $resource): void
    {
        $this->requirePermission($resource === 'rental-spaces' ? 'rental.space.manage' : 'building.manage');
        $this->requireCsrf();
        $id = (int)($_GET['id'] ?? 0);
        if ($id < 1) {
            $this->validationError('ID dữ liệu không hợp lệ.');
        }
        $data = $this->resourceData($resource, $this->requestData());
        try {
            (new ResidenceOperations())->saveResource($resource, $data, $id);
            $this->success(['id' => $id], 'Đã cập nhật dữ liệu.');
        } catch (\DomainException $e) {
            $codes = [
                'CAPACITY_BELOW_BEDS' => 'Sức chứa không được thấp hơn số giường hiện có.',
                'ROOM_CAPACITY_REACHED' => 'Phòng đã đạt sức chứa tối đa.',
                'BED_HAS_ACTIVE_ALLOCATION' => 'Không thể đổi trạng thái giường đang có người lưu trú.',
                'BED_HAS_NO_ALLOCATION' => 'Không thể đánh dấu giường đang sử dụng khi chưa có phân phòng.',
                'SPACE_HAS_ACTIVE_CONTRACT' => 'Không thể mở lại mặt bằng đang được hợp đồng sử dụng.',
            ];
            if (isset($codes[$e->getMessage()])) {
                $this->error($e->getMessage(), $codes[$e->getMessage()], 409);
            }
            throw $e;
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                $this->error('DUPLICATE_RESOURCE', 'Mã hoặc tên dữ liệu đã tồn tại.', 409);
            }
            throw $e;
        }
    }

    private function deleteInventoryResource(string $resource): void
    {
        $this->requirePermission($resource === 'rental-spaces' ? 'rental.space.manage' : 'building.manage');
        $this->requireCsrf();
        $id = (int)($_GET['id'] ?? 0);
        if ($id < 1) {
            $this->validationError('ID dữ liệu không hợp lệ.');
        }
        try {
            if (!(new ResidenceOperations())->deleteResource($resource, $id)) {
                $this->notFound('Không tìm thấy dữ liệu.');
            }
            $this->success(['id' => $id], 'Đã xóa dữ liệu.');
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                $this->error('RESOURCE_IN_USE', 'Không thể xóa dữ liệu đang được sử dụng.', 409);
            }
            throw $e;
        }
    }

    private function resourceData(string $resource, array $data): array
    {
        $fields = match ($resource) {
            'buildings' => ['code', 'name', 'address', 'status'],
            'floors' => ['buildingId' => 'building_id', 'floorNumber' => 'floor_number', 'name' => 'name'],
            'rooms' => ['floorId' => 'floor_id', 'roomNumber' => 'room_number', 'roomType' => 'room_type', 'capacity' => 'capacity', 'status' => 'status'],
            'beds' => ['roomId' => 'room_id', 'bedNumber' => 'bed_number', 'status' => 'status'],
            'rental-spaces' => ['spaceCode' => 'space_code', 'name' => 'name', 'location' => 'location',
                'areaSqm' => 'area_sqm', 'monthlyPrice' => 'monthly_price', 'description' => 'description', 'status' => 'status'],
            default => [],
        };
        $mapped = [];
        foreach ($fields as $input => $column) {
            if (is_int($input)) {
                $input = $column;
            }
            if (array_key_exists($input, $data)) {
                $mapped[$column] = $data[$input];
            }
        }
        foreach ($mapped as $column => $value) {
            if ($value !== null && !is_scalar($value)) {
                $this->validationError('Một hoặc nhiều trường dữ liệu không hợp lệ.');
            }
            if (is_string($value)) {
                $mapped[$column] = trim($value);
            }
        }
        if ($resource === 'buildings') {
            if (mb_strlen((string)($mapped['code'] ?? '')) < 1 || mb_strlen((string)($mapped['code'] ?? '')) > 30
                || mb_strlen((string)($mapped['name'] ?? '')) < 2 || mb_strlen((string)($mapped['name'] ?? '')) > 120
                || mb_strlen((string)($mapped['address'] ?? '')) > 255
                || !in_array($mapped['status'] ?? 'active', ['active', 'inactive'], true)) {
                $this->validationError('Thông tin tòa nhà không hợp lệ.');
            }
        } elseif ($resource === 'floors') {
            if ((int)($mapped['building_id'] ?? 0) < 1 || !isset($mapped['floor_number'])
                || !is_numeric($mapped['floor_number']) || (int)$mapped['floor_number'] < -5
                || (int)$mapped['floor_number'] > 200 || mb_strlen((string)($mapped['name'] ?? '')) > 100) {
                $this->validationError('Thông tin tầng không hợp lệ.');
            }
            $mapped['building_id'] = (int)$mapped['building_id'];
            $mapped['floor_number'] = (int)$mapped['floor_number'];
        } elseif ($resource === 'rooms') {
            if ((int)($mapped['floor_id'] ?? 0) < 1 || mb_strlen((string)($mapped['room_number'] ?? '')) < 1
                || mb_strlen((string)($mapped['room_number'] ?? '')) > 30
                || !in_array($mapped['room_type'] ?? '', ['standard', 'private', 'accessible'], true)
                || !is_numeric($mapped['capacity'] ?? null) || (int)$mapped['capacity'] < 1 || (int)$mapped['capacity'] > 500
                || !in_array($mapped['status'] ?? 'active', ['active', 'inactive', 'maintenance'], true)) {
                $this->validationError('Thông tin phòng không hợp lệ.');
            }
            $mapped['floor_id'] = (int)$mapped['floor_id'];
            $mapped['capacity'] = (int)$mapped['capacity'];
        } elseif ($resource === 'beds') {
            if ((int)($mapped['room_id'] ?? 0) < 1 || mb_strlen((string)($mapped['bed_number'] ?? '')) < 1
                || mb_strlen((string)($mapped['bed_number'] ?? '')) > 30
                || !in_array($mapped['status'] ?? 'available', ['available', 'occupied', 'maintenance', 'inactive'], true)) {
                $this->validationError('Thông tin giường không hợp lệ.');
            }
                $mapped['room_id'] = (int)$mapped['room_id'];
        } elseif ($resource === 'rental-spaces') {
            if (mb_strlen((string)($mapped['space_code'] ?? '')) < 1 || mb_strlen((string)($mapped['space_code'] ?? '')) > 30
                || mb_strlen((string)($mapped['name'] ?? '')) < 2 || mb_strlen((string)($mapped['name'] ?? '')) > 150
                || mb_strlen((string)($mapped['location'] ?? '')) < 2 || mb_strlen((string)($mapped['location'] ?? '')) > 255
                || !is_numeric($mapped['area_sqm'] ?? null) || (float)$mapped['area_sqm'] <= 0
                || (float)($mapped['area_sqm'] ?? 0) > 99999999.99
                || !is_numeric($mapped['monthly_price'] ?? null) || (float)$mapped['monthly_price'] < 0
                || (float)($mapped['monthly_price'] ?? 0) > 999999999999.99
                || mb_strlen((string)($mapped['description'] ?? '')) > 2000
                || !in_array($mapped['status'] ?? 'available', ['available', 'reserved', 'occupied', 'inactive'], true)) {
                $this->validationError('Thông tin mặt bằng không hợp lệ.');
            }
        }
        return $mapped;
    }

    private function operationDomainError(\DomainException $error): never
    {
        $code = $error->getMessage();
        $messages = [
            'CONTRACT_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy hợp đồng lưu trú.', 404],
            'ALLOCATION_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy phân phòng.', 404],
            'BED_NOT_AVAILABLE' => ['BED_NOT_AVAILABLE', 'Giường không khả dụng hoặc phòng đang ngừng hoạt động.', 409],
            'ROOM_TYPE_MISMATCH' => ['ROOM_TYPE_MISMATCH', 'Loại phòng không phù hợp với nguyện vọng trong hồ sơ.', 409],
            'ALLOCATION_SCHEDULE_CONFLICT' => ['ALLOCATION_SCHEDULE_CONFLICT', 'Lịch phân giường bị trùng với lịch lưu trú hiện có.', 409],
            'CONTRACT_NOT_ASSIGNABLE' => ['INVALID_STATE_TRANSITION', 'Hợp đồng không ở trạng thái chờ phân phòng.', 409],
            'ALLOCATION_NOT_ACTIVE' => ['INVALID_STATE_TRANSITION', 'Phân phòng hiện tại không còn hiệu lực.', 409],
            'INVALID_TRANSFER_DATE' => ['INVALID_TRANSFER_DATE', 'Ngày chuyển phòng phải nằm trong thời hạn và sau ngày nhận phòng.', 422],
            'SPACE_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy mặt bằng.', 404],
            'SPACE_NOT_AVAILABLE' => ['SPACE_NOT_AVAILABLE', 'Mặt bằng hiện không còn khả dụng.', 409],
            'RENTAL_SPACE_OVERLAP' => ['RENTAL_SPACE_OVERLAP', 'Khoảng thời gian thuê bị trùng hoặc mặt bằng đã được đặt.', 409],
            'INVALID_STATE_TRANSITION' => ['INVALID_STATE_TRANSITION', 'Đề nghị thuê đã được xử lý.', 409],
            'CONTRACT_NOT_ACTIVE' => ['INVALID_STATE_TRANSITION', 'Hợp đồng đã kết thúc trước đó.', 409],
            'INVALID_END_DATE' => ['INVALID_END_DATE', 'Ngày kết thúc phải nằm trong thời hạn hợp đồng và sau ngày nhận phòng.', 422],
            'RENTAL_CONTRACT_NOT_FOUND' => ['NOT_FOUND', 'Không tìm thấy hợp đồng thuê mặt bằng.', 404],
        ];
        [$apiCode, $message, $status] = $messages[$code] ?? ['OPERATION_CONFLICT', 'Không thể hoàn tất thao tác.', 409];
        $this->error($apiCode, $message, $status);
    }

    private function camelize(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        $result = [];
        foreach ($value as $key => $item) {
            $camelKey = is_string($key)
                ? lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))))
                : $key;
            $result[$camelKey] = $this->camelize($item);
        }
        return $result;
    }

    private function requirePermission(string $permission): array
    {
        $session = $this->currentUser();
        if (!$session || empty($session['id'])) {
            $this->unauthorized();
        }

        $users = new User();
        $user = $users->findById((int)$session['id']);
        if (!$user) {
            $this->unauthorized();
        }
        if ((int)($user['is_locked'] ?? 0) === 1) {
            $this->error('ACCOUNT_LOCKED', 'Tài khoản đang bị khóa.', 423);
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

    /**
     * @param array<string, mixed> $data
     */
    private function field(array $data, string $key, string $default = ''): string
    {
        $value = $data[$key] ?? $default;
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $date !== false && $date->format('Y-m-d') === $value;
    }

    /**
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    private function studentProfileDto(array $profile): array
    {
        return [
            'userId' => (int)$profile['user_id'],
            'name' => (string)$profile['name'],
            'email' => (string)$profile['email'],
            'phone' => (string)($profile['phone'] ?? ''),
            'studentNumber' => (string)($profile['student_number'] ?? ''),
            'university' => (string)($profile['university'] ?? ''),
            'faculty' => (string)($profile['faculty'] ?? ''),
            'program' => (string)($profile['program'] ?? ''),
            'academicYear' => (string)($profile['academic_year'] ?? ''),
            'dateOfBirth' => $profile['date_of_birth'] ?? null,
            'emergencyContactName' => (string)($profile['emergency_contact_name'] ?? ''),
            'emergencyContactPhone' => (string)($profile['emergency_contact_phone'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $application
     * @return array<string, mixed>
     */
    private function applicationDto(array $application): array
    {
        return [
            'id' => (int)$application['id'],
            'contractId' => isset($application['contract_id']) ? (int)$application['contract_id'] : null,
            'applicationNumber' => (string)$application['application_number'],
            'studentName' => (string)($application['student_name'] ?? ''),
            'studentEmail' => (string)($application['student_email'] ?? ''),
            'studentNumber' => (string)($application['student_number'] ?? ''),
            'university' => (string)($application['university'] ?? ''),
            'startDate' => (string)$application['start_date'],
            'endDate' => (string)$application['end_date'],
            'preferredRoomType' => (string)$application['preferred_room_type'],
            'note' => $application['note'] ?? null,
            'status' => (string)$application['status'],
            'decisionNote' => $application['decision_note'] ?? null,
            'createdAt' => (string)$application['created_at'],
            'contractNumber' => $application['contract_number'] ?? null,
            'contractStatus' => $application['contract_status'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $contract
     * @return array<string, mixed>
     */
    private function contractDto(array $contract): array
    {
        return [
            'id' => (int)$contract['id'],
            'contractNumber' => (string)$contract['contract_number'],
            'applicationNumber' => (string)$contract['application_number'],
            'studentName' => (string)($contract['student_name'] ?? ''),
            'studentNumber' => (string)($contract['student_number'] ?? ''),
            'startDate' => (string)$contract['start_date'],
            'endDate' => (string)$contract['end_date'],
            'status' => (string)$contract['status'],
        ];
    }
}
