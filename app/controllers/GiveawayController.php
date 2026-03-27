<?php
namespace App\Controllers;

use Core\ApiController;
use Core\Middleware;
use App\Models\Giveaway;

/**
 * GiveawayController — Chuẩn hóa theo API Conventions (Phase 14)
 */
class GiveawayController extends ApiController
{
    public function join(): void
    {
        $user = $this->requireApiAuth();
        $this->requireCsrf();

        $giveawayId = (int)$this->input('giveaway_id');

        $model = new Giveaway();
        $ga = $model->findById($giveawayId);

        if (!$ga || $ga['status'] !== 'active' || strtotime($ga['end_time']) < time()) {
            $this->notFound('Sự kiện đã kết thúc hoặc không tồn tại.');
        }

        if ($model->join($giveawayId, $user['id'])) {
            $this->success(null, 'Đăng ký tham gia thành công! Chúc bạn may mắn. 🎉');
        } else {
            $this->error('ALREADY_JOINED', 'Bạn đã tham gia sự kiện này rồi!', 409);
        }
    }
}
