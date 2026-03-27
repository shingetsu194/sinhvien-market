<?php

namespace App\Controllers;

use Core\Controller;
use Core\Middleware;
use Core\Flash;
use App\Models\User;

/**
 * ProfileController — Hồ sơ cá nhân người dùng
 */
class ProfileController extends Controller
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    // ─── Hiển thị trang hồ sơ ────────────────────────────────────────────────

    public function show(): void
    {
        Middleware::requireAuth();
        $sessionUser = $this->currentUser();
        $user = $this->userModel->findById((int)$sessionUser['id']);

        $this->render('profile/edit', [
            'title' => 'Hồ sơ của tôi',
            'user'  => $user,
        ]);
    }

    // ─── Cập nhật thông tin cá nhân ──────────────────────────────────────────

    public function update(): void
    {
        Middleware::requireAuth();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('profile');
        }

        $sessionUser = $this->currentUser();
        $userId = (int)$sessionUser['id'];

        $name = trim($this->input('name'));
        if (empty($name)) {
            Flash::set('danger', 'Họ tên không được để trống.');
            $this->redirect('profile');
        }

        $this->userModel->updateProfile($userId, [
            'name'              => $name,
            'phone'             => trim($this->input('phone')),
            'university'        => trim($this->input('university')),
            'student_id'        => trim($this->input('student_id')),
            'dormitory_address' => trim($this->input('dormitory_address')),
            'social_contact'    => trim($this->input('social_contact')),
            'bio'               => trim($this->input('bio')),
            'available_time'    => trim($this->input('available_time')),
        ]);

        // Cập nhật lại session
        $_SESSION['user']['name'] = $name;

        Flash::set('success', '✅ Cập nhật hồ sơ thành công!');
        $this->redirect('profile');
    }

    // ─── Đổi mật khẩu ────────────────────────────────────────────────────────

    public function changePassword(): void
    {
        Middleware::requireAuth();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('profile?tab=security');
        }

        $sessionUser = $this->currentUser();
        $userId = (int)$sessionUser['id'];

        $user = $this->userModel->findById($userId);
        $oldPass = $this->input('old_password');
        $newPass = $this->input('new_password');
        $confirm = $this->input('confirm_password');

        if (!password_verify($oldPass, $user['password'])) {
            Flash::set('danger', '❌ Mật khẩu hiện tại không đúng.');
            $this->redirect('profile?tab=security');
        }

        if (strlen($newPass) < 8) {
            Flash::set('danger', '❌ Mật khẩu mới phải có ít nhất 8 ký tự.');
            $this->redirect('profile?tab=security');
        }

        if ($newPass !== $confirm) {
            Flash::set('danger', '❌ Mật khẩu xác nhận không khớp.');
            $this->redirect('profile?tab=security');
        }

        $this->userModel->updatePassword($userId, $newPass);
        Flash::set('success', '🔒 Đổi mật khẩu thành công!');
        $this->redirect('profile?tab=security');
    }

    // ─── Upload ảnh đại diện ──────────────────────────────────────────────────

    public function uploadAvatar(): void
    {
        Middleware::requireAuth();
        if (!$this->verifyCsrf()) {
            Flash::set('danger', 'Phiên làm việc hết hạn.');
            $this->redirect('profile');
        }

        $sessionUser = $this->currentUser();
        $userId = (int)$sessionUser['id'];

        if (empty($_FILES['avatar']['tmp_name'])) {
            Flash::set('danger', 'Vui lòng chọn ảnh để tải lên.');
            $this->redirect('profile');
        }

        $file     = $_FILES['avatar'];
        $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed  = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!in_array($ext, $allowed)) {
            Flash::set('danger', 'Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF.');
            $this->redirect('profile');
        }

        if ($file['size'] > 2 * 1024 * 1024) { // 2MB
            Flash::set('danger', 'Ảnh không được vượt quá 2MB.');
            $this->redirect('profile');
        }

        $uploadDir = ROOT . '/public/uploads/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = 'avatar_' . $userId . '_' . time() . '.' . $ext;
        $dest = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Flash::set('danger', 'Tải ảnh lên thất bại. Vui lòng thử lại.');
            $this->redirect('profile');
        }

        // Xóa ảnh cũ nếu có
        $oldUser = $this->userModel->findById($userId);
        if (!empty($oldUser['avatar'])) {
            $oldPath = ROOT . '/public/uploads/avatars/' . basename($oldUser['avatar']);
            if (file_exists($oldPath)) {
                @unlink($oldPath);
            }
        }

        $this->userModel->changeAvatar($userId, 'avatars/' . $filename);
        Flash::set('success', '🖼️ Cập nhật ảnh đại diện thành công!');
        $this->redirect('profile');
    }
}
