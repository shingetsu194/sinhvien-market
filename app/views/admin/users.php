<?php
/**
 * Admin View: Quản lý người dùng — Plus Lock Reason & Duration Modal
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
$me     = $_SESSION['user'];

// Generate CSRF token properly from session
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf = $_SESSION['csrf_token'];

use Core\Flash;

$durationOptions = [
    '3days'   => '📅 3 ngày (nhắc nhở nhẹ)',
    '1week'   => '📅 1 tuần (vi phạm nhẹ)',
    '2weeks'  => '📅 2 tuần (vi phạm vừa)',
    '1month'  => '📅 1 tháng (vi phạm nặng)',
    '3months' => '📅 3 tháng (vi phạm nghiêm trọng)',
    '6months' => '📅 6 tháng (tái phạm nhiều lần)',
    'forever' => '🔒 Vĩnh viễn (trường hợp đặc biệt)',
];
?>

<style>
/* ── Table styles ──────────────────────── */
.usr-card { background:#fff;border-radius:20px;border:1.5px solid #e2e8f0;overflow:hidden; }
.usr-header { display:flex;align-items:center;justify-content:space-between;padding:1.2rem 1.5rem;border-bottom:1.5px solid #f1f5f9; }
.usr-header-title { display:flex;align-items:center;gap:.75rem;font-weight:800;font-size:1.05rem;color:#0f172a; }
.usr-header-icon { width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1rem; }
.usr-count-badge { background:#e0e7ff;color:#4f46e5;font-size:.78rem;font-weight:700;padding:.3rem .85rem;border-radius:50px; }

table.usr-table { width:100%;border-collapse:collapse; }
table.usr-table thead th { background:#f8fafc;padding:.75rem 1rem;font-size:.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid #e2e8f0;white-space:nowrap; }
table.usr-table tbody td { padding:.9rem 1rem;border-bottom:1px solid #f1f5f9;font-size:.9rem;vertical-align:middle; }
table.usr-table tbody tr:last-child td { border:none; }
table.usr-table tbody tr:hover { background:#fafafe; }

.usr-avatar { width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1rem;flex-shrink:0; }
.usr-name { font-weight:700;color:#0f172a;font-size:.92rem; }
.usr-email { font-size:.78rem;color:#94a3b8; }

.role-badge-admin   { background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:.25rem .75rem;border-radius:50px;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;gap:.35rem; }
.role-badge-student { background:#e0e7ff;color:#4f46e5;padding:.25rem .75rem;border-radius:50px;font-size:.72rem;font-weight:700; }

.status-active { background:#dcfce7;color:#16a34a;padding:.25rem .75rem;border-radius:50px;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;gap:.35rem; }
.status-locked { background:#fee2e2;color:#dc2626;padding:.25rem .75rem;border-radius:50px;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;gap:.35rem;animation:pulseLock 1.5s ease-in-out infinite; }
@keyframes pulseLock { 0%,100%{opacity:1} 50%{opacity:.7} }

.btn-lock   { background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:.4rem .9rem;border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;display:inline-flex;align-items:center;gap:.35rem; }
.btn-lock:hover   { transform:translateY(-2px);box-shadow:0 6px 16px rgba(239,68,68,.35); }
.btn-unlock { background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:.4rem .9rem;border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;display:inline-flex;align-items:center;gap:.35rem; }
.btn-unlock:hover { transform:translateY(-2px);box-shadow:0 6px 16px rgba(16,185,129,.35); }

/* ── Lock Modal ──────────────────────────── */
.modal-overlay {
  display:none; position:fixed; inset:0; z-index:9999;
  background:rgba(15,23,42,.6); backdrop-filter:blur(6px);
  align-items:center; justify-content:center;
}
.modal-overlay.active { display:flex; animation:fadeOverlay .2s; }
@keyframes fadeOverlay { from{opacity:0;} to{opacity:1;} }
.modal-box {
  background:#fff; border-radius:22px;
  box-shadow:0 40px 100px rgba(0,0,0,.3);
  padding:2rem 2.25rem; width:100%; max-width:500px;
  animation:slideModal .3s cubic-bezier(.16,1,.3,1);
}
@keyframes slideModal { from{transform:translateY(30px) scale(.97);opacity:0;} to{transform:none;opacity:1;} }
.modal-icon {
  width:56px;height:56px;background:linear-gradient(135deg,#ef4444,#dc2626);
  border-radius:16px;display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:1.5rem;margin-bottom:1rem;
  box-shadow:0 8px 24px rgba(239,68,68,.4);
}
.modal-title { font-size:1.2rem;font-weight:900;color:#0f172a;margin-bottom:.3rem; }
.modal-sub   { font-size:.9rem;color:#64748b;margin-bottom:1.5rem; }

.dur-grid { display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1.2rem; }
.dur-option { position:relative; }
.dur-option input[type=radio] { position:absolute;opacity:0;width:0;height:0; }
.dur-label {
  display:block;padding:.65rem .9rem;border-radius:10px;
  border:2px solid #e2e8f0;font-size:.82rem;font-weight:600;
  color:#334155;cursor:pointer;transition:all .18s;line-height:1.3;
}
.dur-label:hover { border-color:#fca5a5;background:#fff7f7; }
.dur-option input:checked + .dur-label {
  border-color:#ef4444;background:#fef2f2;color:#dc2626;font-weight:800;
  box-shadow:0 0 0 3px rgba(239,68,68,.12);
}
.dur-option:last-child .dur-label {
  border-color:#7f1d1d;background:#fff7f7;color:#7f1d1d;
}
.dur-option:last-child input:checked + .dur-label {
  border-color:#991b1b;background:#fef2f2;box-shadow:0 0 0 3px rgba(153,27,27,.18);
}

.reason-input {
  width:100%;border:2px solid #e2e8f0;border-radius:12px;
  padding:.75rem 1rem;font-size:.92rem;font-family:inherit;
  resize:vertical;min-height:90px;transition:border-color .2s;
  color:#0f172a;
}
.reason-input:focus { outline:none;border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1); }
.reason-input::placeholder { color:#94a3b8; }

.btn-modal-confirm {
  width:100%;background:linear-gradient(135deg,#ef4444,#dc2626);
  color:#fff;border:none;border-radius:12px;
  padding:.8rem;font-weight:800;font-size:.95rem;
  font-family:inherit;cursor:pointer;transition:all .25s;
  margin-top:1rem;position:relative;overflow:hidden;
}
.btn-modal-confirm::after { content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.2) 50%,transparent 60%);transform:translateX(-100%);transition:transform .5s; }
.btn-modal-confirm:hover { filter:brightness(1.07);transform:translateY(-2px);box-shadow:0 8px 24px rgba(239,68,68,.4); }
.btn-modal-confirm:hover::after { transform:translateX(100%); }
.btn-modal-cancel {
  width:100%;background:#f1f5f9;color:#64748b;
  border:none;border-radius:12px;padding:.75rem;
  font-weight:700;font-size:.9rem;font-family:inherit;
  cursor:pointer;margin-top:.5rem;transition:all .2s;
}
.btn-modal-cancel:hover { background:#e2e8f0;color:#334155; }

.locked-reason-tip { font-size:.8rem;color:#94a3b8;margin-top:.4rem; }
</style>

<div class="adm-dash">
  <!-- Page Header -->
  <div class="adm-welcome" style="margin-bottom:1.5rem">
    <div class="adm-welcome-blob-1"></div>
    <div class="d-flex align-items-center gap-3" style="position:relative;z-index:2">
      <div class="adm-welcome-avatar" style="border-radius:14px"><i class="bi bi-people-fill"></i></div>
      <div>
        <div class="adm-welcome-greeting">Quản lý</div>
        <h2 class="adm-welcome-name">Danh sách người dùng</h2>
        <div class="adm-welcome-sub">Khóa / Mở khóa tài khoản sinh viên</div>
      </div>
    </div>
    <div style="position:relative;z-index:2" class="d-none d-lg-block">
      <span class="adm-alert-badge"><i class="bi bi-people me-1"></i><?= count($users) ?> tài khoản</span>
    </div>
  </div>

  <?= Flash::render() ?>

  <div class="usr-card">
    <div class="usr-header">
      <div class="usr-header-title">
        <div class="usr-header-icon"><i class="bi bi-people-fill"></i></div>
        Tất cả tài khoản
      </div>
      <span class="usr-count-badge"><?= count($users) ?> người dùng</span>
    </div>

    <div class="table-responsive">
      <table class="usr-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Người dùng</th>
            <th>SĐT</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($users as $i => $u): ?>
            <tr>
              <td style="color:#94a3b8;font-size:.82rem;font-weight:600"><?= $i + 1 ?></td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="usr-avatar"><?= mb_strtoupper(mb_substr($u['name'], 0, 1)) ?></div>
                  <div>
                    <div class="usr-name"><?= htmlspecialchars($u['name'], ENT_QUOTES) ?></div>
                    <div class="usr-email"><?= htmlspecialchars($u['email'], ENT_QUOTES) ?></div>
                  </div>
                </div>
              </td>
              <td style="color:#64748b;font-size:.85rem"><?= htmlspecialchars($u['phone'] ?? '—', ENT_QUOTES) ?></td>
              <td>
                <?php if ($u['role'] === 'admin'): ?>
                  <span class="role-badge-admin"><i class="bi bi-shield-fill"></i>Admin</span>
                <?php else: ?>
                  <span class="role-badge-student">Sinh viên</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($u['is_locked']): ?>
                  <div>
                    <span class="status-locked"><i class="bi bi-lock-fill"></i>Bị khóa</span>
                    <?php if (!empty($u['locked_until'])): ?>
                      <div style="font-size:.72rem;color:#94a3b8;margin-top:3px">
                        đến <?= date('d/m/Y', strtotime($u['locked_until'])) ?>
                      </div>
                    <?php else: ?>
                      <div style="font-size:.72rem;color:#dc2626;margin-top:3px">Vĩnh viễn</div>
                    <?php endif; ?>
                  </div>
                <?php else: ?>
                  <span class="status-active"><i class="bi bi-check-circle-fill"></i>Hoạt động</span>
                <?php endif; ?>
              </td>
              <td style="color:#64748b;font-size:.83rem;white-space:nowrap">
                <?= date('d/m/Y', strtotime($u['created_at'])) ?>
              </td>
              <td>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <!-- XEM CHI TIẾT -->
                  <a href="<?= $appUrl ?>/admin/users/detail?id=<?= (int)$u['id'] ?>"
                     class="btn-unlock" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);text-decoration:none">
                    <i class="bi bi-eye-fill"></i>Chi tiết
                  </a>
                  <?php if ($u['role'] !== 'admin' && (int)$u['id'] !== (int)$me['id']): ?>
                    <?php if ($u['is_locked']): ?>
                      <!-- MỞ KHÓA -->
                      <form method="POST" action="<?= $appUrl ?>/admin/users/toggle"
                            onsubmit="return confirm('Mở khóa tài khoản <?= htmlspecialchars(addslashes($u['name']), ENT_QUOTES) ?>?')">
                        <input type="hidden" name="_csrf"   value="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">
                        <input type="hidden" name="user_id" value="<?= (int)$u['id'] ?>">
                        <button type="submit" class="btn-unlock">
                          <i class="bi bi-unlock-fill"></i>Mở khóa
                        </button>
                      </form>
                    <?php else: ?>
                      <!-- KHÓA -->
                      <button type="button" class="btn-lock"
                              onclick="openLockModal(<?= (int)$u['id'] ?>, '<?= htmlspecialchars(addslashes($u['name']), ENT_QUOTES) ?>')">
                        <i class="bi bi-lock-fill"></i>Khóa
                      </button>
                    <?php endif; ?>
                  <?php endif; ?>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- ─── LOCK MODAL ──────────────────────────────────────────────── -->
<div class="modal-overlay" id="lockModal">
  <div class="modal-box">
    <div class="modal-icon"><i class="bi bi-lock-fill"></i></div>
    <div class="modal-title">Khóa tài khoản</div>
    <div class="modal-sub" id="modalSubtitle">Chọn lý do và thời hạn trước khi khóa</div>

    <form method="POST" action="<?= $appUrl ?>/admin/users/toggle" id="lockForm">
      <input type="hidden" name="_csrf"    value="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">
      <input type="hidden" name="user_id"  id="modalUserId" value="">

      <!-- Thời hạn khóa -->
      <div style="margin-bottom:1rem">
        <div style="font-size:.82rem;font-weight:700;color:#334155;margin-bottom:.6rem">
          <i class="bi bi-clock-history me-1 text-danger"></i>Thời hạn khóa
        </div>
        <div class="dur-grid">
          <?php foreach ($durationOptions as $val => $label): ?>
            <div class="dur-option <?= ($val === 'forever') ? 'col-span-2' : '' ?>">
              <input type="radio" name="lock_duration" id="dur_<?= $val ?>" value="<?= $val ?>"
                     <?= $val === '3days' ? 'checked' : '' ?>>
              <label class="dur-label" for="dur_<?= $val ?>"><?= $label ?></label>
            </div>
          <?php endforeach; ?>
        </div>
      </div>

      <!-- Lý do khóa -->
      <div style="margin-bottom:.4rem;font-size:.82rem;font-weight:700;color:#334155">
        <i class="bi bi-exclamation-triangle me-1 text-danger"></i>Lý do khóa <span style="color:#ef4444">*</span>
      </div>
      <textarea name="lock_reason" id="lockReason" class="reason-input"
                placeholder="Ví dụ: Đăng bài vi phạm nội quy, hình ảnh không phù hợp, lừa đảo người dùng..."
                required></textarea>
      <div class="locked-reason-tip">Lý do này sẽ hiển thị cho người dùng khi họ cố đăng nhập.</div>

      <button type="submit" class="btn-modal-confirm">
        <i class="bi bi-lock-fill me-2"></i>Xác nhận khóa tài khoản
      </button>
      <button type="button" class="btn-modal-cancel" onclick="closeLockModal()">Hủy bỏ</button>
    </form>
  </div>
</div>

<script>
// Vì last option (forever) nên span 2 cột
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.dur-grid');
  if (grid) {
    const lastOpt = grid.lastElementChild;
    if (lastOpt) lastOpt.style.gridColumn = '1 / -1';
  }
});

function openLockModal(userId, userName) {
  document.getElementById('modalUserId').value  = userId;
  document.getElementById('modalSubtitle').textContent = `Khóa tài khoản: ${userName}`;
  document.getElementById('lockReason').value   = '';
  document.getElementById('lockModal').classList.add('active');
}
function closeLockModal() {
  document.getElementById('lockModal').classList.remove('active');
}
// Click ngoài modal để đóng
document.getElementById('lockModal').addEventListener('click', function(e) {
  if (e.target === this) closeLockModal();
});
// Validate reason trước khi submit
document.getElementById('lockForm').addEventListener('submit', function(e) {
  const reason = document.getElementById('lockReason').value.trim();
  const dur    = document.querySelector('input[name="lock_duration"]:checked');
  if (!reason) {
    e.preventDefault();
    document.getElementById('lockReason').focus();
    document.getElementById('lockReason').style.borderColor = '#ef4444';
    alert('Vui lòng nhập lý do khóa tài khoản!');
    return false;
  }
  if (!dur) {
    e.preventDefault();
    alert('Vui lòng chọn thời hạn khóa!');
    return false;
  }
  return confirm(`Xác nhận khóa tài khoản trong ${dur.parentElement.querySelector('label').textContent.replace(/[📅🔒]/g,'').trim()}?`);
});
</script>
