<?php
/**
 * Admin View: Chi tiết người dùng
 * Layout: admin
 * Biến: $profile, $products, $transactions, $ratingStats
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
$p = $profile;
?>

<style>
/* ─── Layout ───────────────────────────────────────────────────── */
.ud-grid { display:grid; grid-template-columns:320px 1fr; gap:1.5rem; align-items:start; }
@media(max-width:900px){ .ud-grid { grid-template-columns:1fr; } }

/* ─── Cards ────────────────────────────────────────────────────── */
.ud-card {
  background:#fff; border-radius:18px; border:1.5px solid #e2e8f0;
  overflow:hidden;
}
.ud-card-header {
  padding:.9rem 1.25rem; border-bottom:1.5px solid #f1f5f9;
  display:flex; align-items:center; gap:.6rem;
  font-weight:800; font-size:.9rem; color:#0f172a;
}
.ud-card-icon {
  width:32px; height:32px; border-radius:9px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:.85rem; flex-shrink:0;
}
.ud-card-body { padding:1.25rem; }

/* ─── Profile hero ─────────────────────────────────────────────── */
.ud-hero {
  background:linear-gradient(135deg,#4f46e5,#8b5cf6);
  border-radius:18px; padding:1.5rem; color:#fff;
  display:flex; flex-direction:column; align-items:center; gap:.75rem;
  text-align:center; margin-bottom:1rem;
}
.ud-avatar-big {
  width:72px; height:72px; border-radius:50%;
  background:rgba(255,255,255,.2); border:3px solid rgba(255,255,255,.4);
  display:flex; align-items:center; justify-content:center;
  font-size:2rem; font-weight:800;
}
.ud-hero-name  { font-size:1.25rem; font-weight:800; }
.ud-hero-email { font-size:.82rem; opacity:.8; }

/* ─── Info rows ────────────────────────────────────────────────── */
.ud-info-row {
  display:flex; justify-content:space-between; align-items:flex-start;
  padding:.6rem 0; border-bottom:1px solid #f1f5f9; gap:.5rem;
  font-size:.875rem;
}
.ud-info-row:last-child { border:none; }
.ud-info-label { color:#64748b; white-space:nowrap; min-width:130px; font-weight:600; }
.ud-info-value { color:#0f172a; text-align:right; word-break:break-all; }

/* ─── Badges ───────────────────────────────────────────────────── */
.role-badge-admin   { background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700; }
.role-badge-student { background:#e0e7ff;color:#4f46e5;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700; }
.status-active { background:#dcfce7;color:#16a34a;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700; }
.status-locked { background:#fee2e2;color:#dc2626;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700; }
.status-verified   { background:#dbeafe;color:#2563eb;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700; }
.status-unverified { background:#fef3c7;color:#d97706;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700; }

/* ─── Mini table ───────────────────────────────────────────────── */
.ud-mini-table { width:100%; border-collapse:collapse; font-size:.82rem; }
.ud-mini-table thead th { background:#f8fafc; padding:.6rem .85rem; color:#64748b; font-weight:700; font-size:.73rem; text-transform:uppercase; border-bottom:1.5px solid #e2e8f0; white-space:nowrap; }
.ud-mini-table tbody td { padding:.65rem .85rem; border-bottom:1px solid #f8fafc; vertical-align:middle; color:#334155; }
.ud-mini-table tbody tr:last-child td { border:none; }
.ud-mini-table tbody tr:hover { background:#fafafe; }
.ud-empty { padding:2rem; text-align:center; color:#94a3b8; font-size:.85rem; }

/* ─── Stars ────────────────────────────────────────────────────── */
.ud-stars { color:#fbbf24; }
</style>

<div class="adm-dash">
  <!-- Breadcrumb -->
  <div class="mb-3 d-flex align-items-center gap-2" style="font-size:.85rem; color:#64748b">
    <a href="<?= $appUrl ?>/admin/users" class="text-decoration-none text-primary fw-600">
      <i class="bi bi-people me-1"></i>Người dùng
    </a>
    <i class="bi bi-chevron-right"></i>
    <span class="text-dark fw-700"><?= htmlspecialchars($p['name'], ENT_QUOTES) ?></span>
  </div>

  <div class="ud-grid">

    <!-- ─── CỘT TRÁI: Thông tin cá nhân ─────────────────────────── -->
    <div>

      <!-- Hero card -->
      <div class="ud-hero">
        <div class="ud-avatar-big"><?= mb_strtoupper(mb_substr($p['name'], 0, 1)) ?></div>
        <div>
          <div class="ud-hero-name"><?= htmlspecialchars($p['name'], ENT_QUOTES) ?></div>
          <div class="ud-hero-email"><?= htmlspecialchars($p['email'], ENT_QUOTES) ?></div>
        </div>
        <!-- Stars nếu có -->
        <?php if ($ratingStats['count'] > 0): ?>
          <div>
            <?php for ($i = 1; $i <= 5; $i++): ?>
              <i class="bi bi-star<?= $i <= round($ratingStats['avg']) ? '-fill' : '' ?> ud-stars"></i>
            <?php endfor; ?>
            <span style="font-size:.82rem;opacity:.85"><?= $ratingStats['avg'] ?>/5 (<?= $ratingStats['count'] ?> đánh giá)</span>
          </div>
        <?php endif; ?>
      </div>

      <!-- Thông tin tài khoản -->
      <div class="ud-card mb-3">
        <div class="ud-card-header">
          <div class="ud-card-icon"><i class="bi bi-person-badge"></i></div>
          Thông tin tài khoản
        </div>
        <div class="ud-card-body">
          <div class="ud-info-row">
            <div class="ud-info-label">ID</div>
            <div class="ud-info-value">#<?= $p['id'] ?></div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Vai trò</div>
            <div class="ud-info-value">
              <?php if ($p['role'] === 'admin'): ?>
                <span class="role-badge-admin"><i class="bi bi-shield-fill me-1"></i>Admin</span>
              <?php else: ?>
                <span class="role-badge-student">Sinh viên</span>
              <?php endif; ?>
            </div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Trạng thái</div>
            <div class="ud-info-value">
              <?php if ($p['is_locked']): ?>
                <span class="status-locked"><i class="bi bi-lock-fill me-1"></i>Bị khóa</span>
              <?php else: ?>
                <span class="status-active"><i class="bi bi-check-circle-fill me-1"></i>Hoạt động</span>
              <?php endif; ?>
            </div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Xác thực email</div>
            <div class="ud-info-value">
              <?php if ($p['is_verified']): ?>
                <span class="status-verified"><i class="bi bi-patch-check-fill me-1"></i>Đã xác thực</span>
              <?php else: ?>
                <span class="status-unverified"><i class="bi bi-exclamation-circle me-1"></i>Chưa xác thực</span>
              <?php endif; ?>
            </div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Ngày đăng ký</div>
            <div class="ud-info-value"><?= date('d/m/Y H:i', strtotime($p['created_at'])) ?></div>
          </div>
          <?php if ($p['last_verified_at']): ?>
          <div class="ud-info-row">
            <div class="ud-info-label">Xác thực lần cuối</div>
            <div class="ud-info-value"><?= date('d/m/Y H:i', strtotime($p['last_verified_at'])) ?></div>
          </div>
          <?php endif; ?>
        </div>
      </div>

      <!-- Thông tin cá nhân -->
      <div class="ud-card mb-3">
        <div class="ud-card-header">
          <div class="ud-card-icon"><i class="bi bi-person-lines-fill"></i></div>
          Thông tin cá nhân
        </div>
        <div class="ud-card-body">
          <div class="ud-info-row">
            <div class="ud-info-label">Họ tên</div>
            <div class="ud-info-value"><?= htmlspecialchars($p['name'], ENT_QUOTES) ?></div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Email</div>
            <div class="ud-info-value"><?= htmlspecialchars($p['email'], ENT_QUOTES) ?></div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Số điện thoại</div>
            <div class="ud-info-value"><?= htmlspecialchars($p['phone'] ?: '—', ENT_QUOTES) ?></div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Câu hỏi bảo mật</div>
            <div class="ud-info-value"><?= htmlspecialchars($p['security_question'] ?: '—', ENT_QUOTES) ?></div>
          </div>
        </div>
      </div>

      <!-- Trạng thái khóa nếu bị khóa -->
      <?php if ($p['is_locked']): ?>
      <div class="ud-card mb-3" style="border-color:#fca5a5">
        <div class="ud-card-header" style="background:#fff5f5">
          <div class="ud-card-icon" style="background:linear-gradient(135deg,#ef4444,#dc2626)"><i class="bi bi-lock-fill"></i></div>
          <span style="color:#dc2626">Chi tiết khóa tài khoản</span>
        </div>
        <div class="ud-card-body">
          <div class="ud-info-row">
            <div class="ud-info-label">Lý do</div>
            <div class="ud-info-value" style="color:#dc2626"><?= htmlspecialchars($p['lock_reason'] ?: '—', ENT_QUOTES) ?></div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Khóa lúc</div>
            <div class="ud-info-value"><?= $p['locked_at'] ? date('d/m/Y H:i', strtotime($p['locked_at'])) : '—' ?></div>
          </div>
          <div class="ud-info-row">
            <div class="ud-info-label">Hết hạn khóa</div>
            <div class="ud-info-value">
              <?= $p['locked_until'] ? date('d/m/Y', strtotime($p['locked_until'])) : '<span style="color:#dc2626;font-weight:700">Vĩnh viễn</span>' ?>
            </div>
          </div>
        </div>
      </div>
      <?php endif; ?>

    </div>

    <!-- ─── CỘT PHẢI: Hoạt động ──────────────────────────────────── -->
    <div>

      <!-- Sản phẩm -->
      <div class="ud-card mb-3">
        <div class="ud-card-header">
          <div class="ud-card-icon" style="background:linear-gradient(135deg,#0ea5e9,#0284c7)"><i class="bi bi-box-seam"></i></div>
          Sản phẩm đã đăng
          <span class="ms-auto" style="background:#e0f2fe;color:#0284c7;font-size:.73rem;font-weight:700;padding:.2rem .65rem;border-radius:50px"><?= count($products) ?></span>
        </div>
        <?php if (empty($products)): ?>
          <div class="ud-empty"><i class="bi bi-box-seam opacity-25 fs-3 d-block mb-2"></i>Chưa có sản phẩm nào</div>
        <?php else: ?>
          <div class="table-responsive">
            <table class="ud-mini-table">
              <thead><tr><th>Sản phẩm</th><th>Loại</th><th>Giá</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
              <tbody>
                <?php foreach ($products as $prod): ?>
                  <tr>
                    <td>
                      <a href="<?= $appUrl ?>/products/show?id=<?= $prod['id'] ?>" class="text-decoration-none fw-600 text-dark" target="_blank">
                        <?= htmlspecialchars(mb_strimwidth($prod['title'], 0, 35, '…'), ENT_QUOTES) ?>
                      </a>
                    </td>
                    <td>
                      <?php
                        $typeMap = ['sale' => ['🏷️', '#e0e7ff', '#4f46e5'], 'auction' => ['⚡', '#fce7f3', '#be185d'], 'exchange' => ['🔄', '#dcfce7', '#16a34a']];
                        [$icon, $bg, $col] = $typeMap[$prod['type']] ?? ['?', '#f1f5f9', '#64748b'];
                      ?>
                      <span style="background:<?= $bg ?>;color:<?= $col ?>;padding:.15rem .55rem;border-radius:50px;font-size:.7rem;font-weight:700"><?= $icon ?> <?= $prod['type'] ?></span>
                    </td>
                    <td style="font-weight:700;color:#4f46e5">
                      <?= $prod['price'] ? number_format($prod['price'], 0, ',', '.') . 'đ' : '—' ?>
                    </td>
                    <td>
                      <?php
                        $stMap = ['active' => ['Đang hiển thị','#dcfce7','#16a34a'], 'pending' => ['Chờ duyệt','#fef3c7','#d97706'], 'sold' => ['Đã bán','#e0e7ff','#4f46e5'], 'cancelled' => ['Từ chối','#fee2e2','#dc2626']];
                        [$stLabel, $stBg, $stCol] = $stMap[$prod['status']] ?? [$prod['status'], '#f1f5f9', '#64748b'];
                      ?>
                      <span style="background:<?= $stBg ?>;color:<?= $stCol ?>;padding:.15rem .55rem;border-radius:50px;font-size:.7rem;font-weight:700"><?= $stLabel ?></span>
                    </td>
                    <td style="color:#94a3b8;white-space:nowrap"><?= date('d/m/Y', strtotime($prod['created_at'])) ?></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        <?php endif; ?>
      </div>

      <!-- Giao dịch -->
      <div class="ud-card mb-3">
        <div class="ud-card-header">
          <div class="ud-card-icon" style="background:linear-gradient(135deg,#10b981,#059669)"><i class="bi bi-receipt"></i></div>
          Lịch sử giao dịch
          <span class="ms-auto" style="background:#d1fae5;color:#059669;font-size:.73rem;font-weight:700;padding:.2rem .65rem;border-radius:50px"><?= count($transactions) ?></span>
        </div>
        <?php if (empty($transactions)): ?>
          <div class="ud-empty"><i class="bi bi-receipt opacity-25 fs-3 d-block mb-2"></i>Chưa có giao dịch nào</div>
        <?php else: ?>
          <div class="table-responsive">
            <table class="ud-mini-table">
              <thead><tr><th>Sản phẩm</th><th>Vai trò</th><th>Số tiền</th><th>Thanh toán</th><th>Ngày</th></tr></thead>
              <tbody>
                <?php foreach ($transactions as $tx): ?>
                  <tr>
                    <td class="fw-600"><?= htmlspecialchars(mb_strimwidth($tx['product_title'] ?? '—', 0, 35, '…'), ENT_QUOTES) ?></td>
                    <td>
                      <?php if ((int)$tx['buyer_id'] === (int)$p['id']): ?>
                        <span style="background:#dbeafe;color:#2563eb;padding:.15rem .55rem;border-radius:50px;font-size:.7rem;font-weight:700">🛍️ Người mua</span>
                      <?php else: ?>
                        <span style="background:#fce7f3;color:#be185d;padding:.15rem .55rem;border-radius:50px;font-size:.7rem;font-weight:700">🏷️ Người bán</span>
                      <?php endif; ?>
                    </td>
                    <td style="font-weight:700;color:#059669"><?= number_format((float)($tx['amount'] ?? 0), 0, ',', '.') ?>đ</td>
                    <td>
                      <?php
                        $pmMap = ['cod' => 'COD', 'banking' => 'Chuyển khoản', 'zalopay' => 'ZaloPay'];
                      ?>
                      <span style="font-size:.78rem"><?= $pmMap[$tx['payment_method']] ?? $tx['payment_method'] ?></span>
                    </td>
                    <td style="color:#94a3b8;white-space:nowrap"><?= date('d/m/Y', strtotime($tx['created_at'])) ?></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        <?php endif; ?>
      </div>

    </div>
  </div>
</div>
