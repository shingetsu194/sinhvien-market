<?php
/**
 * User Public Profile View — Hồ sơ & Đánh giá người bán
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
?>

<style>
.profile-wrap { max-width:760px; margin:2.5rem auto; padding:0 1rem; }
.profile-hero { background:linear-gradient(135deg,#4f46e5,#8b5cf6); border-radius:20px; padding:2rem; color:#fff; display:flex; gap:1.5rem; align-items:center; margin-bottom:1.5rem; }
.profile-avatar-big { width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; font-size:2.2rem; font-weight:800; border:3px solid rgba(255,255,255,.4); flex-shrink:0; }
.profile-name { font-size:1.5rem; font-weight:800; }
.profile-role { font-size:.8rem; opacity:.8; }
.profile-meta { font-size:.85rem; opacity:.85; margin-top:.5rem; }
.profile-stats { display:flex; gap:1.5rem; margin-top:1rem; flex-wrap:wrap; }
.profile-stat-item { text-align:center; }
.profile-stat-num { font-size:1.5rem; font-weight:800; }
.profile-stat-label { font-size:.72rem; opacity:.8; }
.stars-display { color:#fbbf24; font-size:1.1rem; }
.stars-display .empty { color:rgba(255,255,255,.3); }

.rating-card { background:#fff; border-radius:14px; border:1.5px solid #e8ecf0; padding:16px 20px; margin-bottom:12px; }
.rating-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
.rating-stars { color:#fbbf24; }
.rating-rater { font-weight:600; font-size:.875rem; }
.rating-product { font-size:.78rem; color:#6b7280; }
.rating-comment { font-size:.875rem; color:#374151; border-left:3px solid #e8ecf0; padding-left:12px; margin-top:10px; }
.rating-date { font-size:.72rem; color:#9ca3af; }
</style>

<div class="profile-wrap">
  <!-- Hero -->
  <div class="profile-hero">
    <div class="profile-avatar-big" style="overflow:hidden;">
      <?php if (!empty($profile['avatar'])): ?>
        <img src="<?= $appUrl ?>/public/uploads/<?= htmlspecialchars($profile['avatar'], ENT_QUOTES) ?>" alt="Avatar" style="width:100%;height:100%;object-fit:cover;">
      <?php else: ?>
        <?= mb_strtoupper(mb_substr($profile['name'], 0, 1)) ?>
      <?php endif; ?>
    </div>
    <div style="flex:1">
      <div class="d-flex justify-content-between align-items-start">
        <div class="profile-name"><?= htmlspecialchars($profile['name'], ENT_QUOTES) ?></div>
        <?php if (isset($user) && $user['id'] !== $profile['id']): ?>
          <button class="btn btn-sm btn-light text-danger rounded-pill px-3 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#reportUserModal">
            <i class="bi bi-flag-fill me-1"></i>Tố cáo
          </button>
        <?php endif; ?>
      </div>
      <div class="profile-role">
        <i class="bi bi-person-badge me-1"></i>Sinh viên · Tham gia <?= date('m/Y', strtotime($profile['created_at'])) ?>
      </div>
      <div class="profile-stats">
        <div class="profile-stat-item">
          <div class="profile-stat-num">
            <?php
              $avg = $stats['avg'];
              for ($i = 1; $i <= 5; $i++) {
                echo $i <= round($avg)
                  ? '<i class="bi bi-star-fill stars-display"></i>'
                  : '<i class="bi bi-star stars-display empty"></i>';
              }
            ?>
          </div>
          <div class="profile-stat-label"><?= $stats['avg'] ?> / 5 trung bình</div>
        </div>
        <div class="profile-stat-item">
          <div class="profile-stat-num"><?= $stats['count'] ?></div>
          <div class="profile-stat-label">Đánh giá nhận được</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Thông tin cá nhân -->
  <div class="card border-0 shadow-sm rounded-4 mb-4">
    <div class="card-body p-4">
      <h6 class="text-primary fw-bold text-uppercase mb-3" style="font-size: 0.85rem; letter-spacing: 1px;"><i class="bi bi-person-lines-fill me-2"></i>Giới thiệu</h6>
      
      <?php if (!empty($profile['bio'])): ?>
        <p class="mb-4" style="font-size:0.95rem; color:#4b5563; line-height:1.6;">
          "<em><?= nl2br(htmlspecialchars($profile['bio'], ENT_QUOTES)) ?></em>"
        </p>
      <?php endif; ?>

      <div class="row g-3">
        <?php if (!empty($profile['university'])): ?>
        <div class="col-md-6 d-flex">
          <div class="text-muted me-2 mt-1"><i class="bi bi-building"></i></div>
          <div>
            <div class="small text-muted fw-semibold">Trường / Khoa</div>
            <div class="fw-medium text-dark"><?= htmlspecialchars($profile['university'], ENT_QUOTES) ?></div>
          </div>
        </div>
        <?php endif; ?>

        <?php if (!empty($profile['dormitory_address'])): ?>
        <div class="col-md-6 d-flex">
          <div class="text-muted me-2 mt-1"><i class="bi bi-geo-alt"></i></div>
          <div>
            <div class="small text-muted fw-semibold">Khu vực / KTX</div>
            <div class="fw-medium text-dark"><?= htmlspecialchars($profile['dormitory_address'], ENT_QUOTES) ?></div>
          </div>
        </div>
        <?php endif; ?>

        <?php if (!empty($profile['social_contact'])): ?>
        <div class="col-md-6 d-flex">
          <div class="text-muted me-2 mt-1"><i class="bi bi-link-45deg"></i></div>
          <div>
            <div class="small text-muted fw-semibold">Liên hệ MXH</div>
            <div class="fw-medium text-primary text-break">
              <a href="<?= str_starts_with($profile['social_contact'], 'http') ? htmlspecialchars($profile['social_contact'], ENT_QUOTES) : 'https://' . htmlspecialchars($profile['social_contact'], ENT_QUOTES) ?>" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                <?= htmlspecialchars($profile['social_contact'], ENT_QUOTES) ?>
              </a>
            </div>
          </div>
        </div>
        <?php endif; ?>

        <?php if (!empty($profile['available_time'])): ?>
        <div class="col-md-6 d-flex">
          <div class="text-muted me-2 mt-1"><i class="bi bi-clock"></i></div>
          <div>
            <div class="small text-muted fw-semibold">Thời gian online</div>
            <div class="fw-medium text-dark"><?= htmlspecialchars($profile['available_time'], ENT_QUOTES) ?></div>
          </div>
        </div>
        <?php endif; ?>
      </div>

      <?php if (empty($profile['bio']) && empty($profile['university']) && empty($profile['dormitory_address']) && empty($profile['social_contact']) && empty($profile['available_time'])): ?>
        <div class="text-muted text-center py-3">Người dùng này chưa cập nhật thông tin cá nhân.</div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Danh sách đánh giá -->
  <div class="fw-700 mb-3" style="font-size:1.1rem">
    <i class="bi bi-star me-2 text-warning"></i>Đánh giá từ người mua
  </div>

  <?php if (empty($ratings)): ?>
    <div class="text-center py-5 text-muted">
      <i class="bi bi-star fs-1 d-block mb-3 opacity-25"></i>
      <div>Người bán này chưa có đánh giá nào.</div>
    </div>
  <?php else: ?>
    <?php foreach ($ratings as $r): ?>
      <div class="rating-card">
        <div class="rating-header">
          <div>
            <div class="rating-rater"><?= htmlspecialchars($r['rater_name'], ENT_QUOTES) ?></div>
            <div class="rating-product">
              <i class="bi bi-box-seam me-1"></i><?= htmlspecialchars($r['product_title'], ENT_QUOTES) ?>
            </div>
          </div>
          <div class="text-end">
            <div class="rating-stars">
              <?php for ($i = 1; $i <= 5; $i++): ?>
                <i class="bi bi-star<?= $i <= $r['stars'] ? '-fill' : '' ?>"></i>
              <?php endfor; ?>
            </div>
            <div class="rating-date"><?= date('d/m/Y', strtotime($r['created_at'])) ?></div>
          </div>
        </div>
        <?php if ($r['comment']): ?>
          <div class="rating-comment"><?= nl2br(htmlspecialchars($r['comment'], ENT_QUOTES)) ?></div>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<!-- ─── Modal Tố Cáo Người Dùng (Report) ──────────────────────────────── -->
<div class="modal fade" id="reportUserModal" tabindex="-1" aria-labelledby="reportUserModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 shadow-lg rounded-4">
      <div class="modal-header bg-danger text-white border-bottom-0 pb-3 rounded-top-4">
        <h5 class="modal-title fw-bold" id="reportUserModalLabel"><i class="bi bi-shield-exclamation me-2"></i>Báo cáo người dùng</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <form action="<?= $appUrl ?>/reports/store" method="POST">
        <input type="hidden" name="_csrf" value="<?= htmlspecialchars($csrf ?? '', ENT_QUOTES) ?>">
        <input type="hidden" name="target_user_id" value="<?= $profile['id'] ?>">

        <div class="modal-body p-4">
          <p class="text-muted small mb-4">Bạn đang tố cáo tài khoản <strong><?= htmlspecialchars($profile['name'], ENT_QUOTES) ?></strong>. Vui lòng cung cấp chi tiết vi phạm để được xử lý nhanh nhất.</p>
          
          <div class="mb-3">
            <label class="form-label fw-semibold">Lý do báo cáo <span class="text-danger">*</span></label>
            <select name="reason" class="form-select" required>
              <option value="">-- Chọn lý do --</option>
              <option value="Lừa đảo">Người dùng có dấu hiệu lừa đảo</option>
              <option value="Hàng giả / Trái pháp luật">Mua bán hàng giả / cấm</option>
              <option value="Tài khoản giả mạo">Tài khoản giả mạo / Spam</option>
              <option value="Ngôn từ đe dọa">Ngôn từ đe dọa / Quấy rối</option>
              <option value="Khác">Lý do khác</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Chi tiết vi phạm <span class="text-danger">*</span></label>
            <textarea name="description" class="form-control" rows="4" placeholder="Mô tả sự việc..." required></textarea>
          </div>
        </div>
        
        <div class="modal-footer bg-light border-top-0 rounded-bottom-4">
          <button type="button" class="btn btn-secondary px-4 rounded-pill" data-bs-dismiss="modal">Hủy</button>
          <button type="submit" class="btn btn-danger px-4 rounded-pill fw-semibold"><i class="bi bi-send-fill me-2"></i>Gửi báo cáo</button>
        </div>
      </form>
    </div>
  </div>
</div>
