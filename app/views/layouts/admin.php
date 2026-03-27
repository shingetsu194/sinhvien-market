<?php
/**
 * Admin Layout - sidebar + topbar cho panel quản trị
 * $content được inject từ Controller::render()
 */
use Core\Flash;

$appUrl = rtrim($_ENV['APP_URL'] ?? 'http://localhost:8080/sinhvien-market', '/');
$title  = htmlspecialchars($title ?? 'Admin', ENT_QUOTES, 'UTF-8');
$user   = $_SESSION['user'] ?? [];

// Xác định trang hiện tại để active sidebar
$currentUrl = $_SERVER['REQUEST_URI'] ?? '';
function isActive(string $keyword, string $current): string {
    return str_contains($current, $keyword) ? 'active' : '';
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $title ?> — Admin | SinhVienMarket</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <link href="<?= $appUrl ?>/public/css/style.css" rel="stylesheet">
  <script>
    // Áp dụng theme từ localStorage trước khi render body để tránh chớp màn hình (FOUC)
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  </script>
  <style>
    body { background: var(--bg); font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text); }
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    .admin-wrapper { display: flex; min-height: 100vh; }

    /* ── Sidebar ───────────────────────────────────── */
    .admin-sidebar {
      width: 260px; min-width: 260px;
      background: linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%);
      display: flex; flex-direction: column;
      position: fixed; top: 0; left: 0; bottom: 0;
      z-index: 100; overflow-y: auto; overflow-x: hidden;
      border-right: 1px solid rgba(255,255,255,.05);
      box-shadow: 4px 0 24px rgba(0,0,0,.25);
    }

    .sidebar-brand {
      padding: 1.4rem 1.5rem;
      display: flex; align-items: center; gap: .75rem;
      border-bottom: 1px solid rgba(255,255,255,.07);
      text-decoration: none;
    }
    .sidebar-brand-icon {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; color: #fff;
      box-shadow: 0 4px 12px rgba(99,102,241,.5);
      flex-shrink: 0;
    }
    .sidebar-brand-text {
      font-size: 1.05rem; font-weight: 900; color: #fff;
    }
    .sidebar-brand-text span { color: #a5b4fc; }
    .sidebar-admin-badge {
      font-size: .62rem; font-weight: 700; letter-spacing: .5px;
      color: rgba(255,255,255,.35);
      text-transform: uppercase;
    }

    .sidebar-section {
      padding: .6rem 1.2rem .2rem;
      color: rgba(255,255,255,.3);
      font-size: .68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.2px;
      margin-top: .6rem;
    }

    .sidebar-nav { padding: .75rem .6rem; flex: 1; }
    .sidebar-nav a {
      display: flex; align-items: center; gap: .8rem;
      padding: .65rem 1rem; border-radius: 10px;
      color: rgba(255,255,255,.6);
      font-size: .88rem; font-weight: 600;
      text-decoration: none;
      transition: all .2s cubic-bezier(.4,0,.2,1);
      margin-bottom: 3px; position: relative;
    }
    .sidebar-nav a i { font-size: 1.05rem; width: 20px; flex-shrink: 0; }
    .sidebar-nav a:hover {
      background: rgba(255,255,255,.08);
      color: #fff;
      transform: translateX(3px);
    }
    .sidebar-nav a.active {
      background: linear-gradient(135deg, rgba(99,102,241,.35), rgba(139,92,246,.25));
      color: #a5b4fc;
      border: 1px solid rgba(99,102,241,.3);
      box-shadow: 0 2px 12px rgba(99,102,241,.2), inset 0 0 0 1px rgba(99,102,241,.15);
    }
    .sidebar-nav a.active i { color: #818cf8; }

    .sidebar-footer {
      padding: 1rem .75rem;
      border-top: 1px solid rgba(255,255,255,.06);
    }
    .sidebar-footer a {
      display: flex; align-items: center; gap: .6rem;
      color: rgba(255,255,255,.4); font-size: .82rem; font-weight: 600;
      text-decoration: none; padding: .55rem .85rem; border-radius: 8px;
      transition: all .2s;
    }
    .sidebar-footer a:hover { background: rgba(255,255,255,.07); color: rgba(255,255,255,.8); }

    /* ── Main panel ────────────────────────────────── */
    .admin-main { flex: 1; margin-left: 260px; display: flex; flex-direction: column; }

    /* ── Topbar ────────────────────────────────────── */
    .admin-topbar {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: .85rem 1.75rem;
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 0; z-index: 90;
      box-shadow: 0 1px 8px rgba(0,0,0,.05);
    }
    .admin-topbar-title {
      font-weight: 800; font-size: 1.15rem; color: var(--text); margin: 0;
      display: flex; align-items: center; gap: .6rem;
    }
    .admin-topbar-title::before {
      content: '';
      width: 4px; height: 20px;
      background: linear-gradient(180deg, #6366f1, #8b5cf6);
      border-radius: 99px;
    }

    .topbar-user-info { display: flex; align-items: center; gap: .6rem; }
    .topbar-avatar {
      width: 34px; height: 34px;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: .85rem;
      box-shadow: 0 2px 8px rgba(99,102,241,.35);
    }
    .topbar-name { font-weight: 700; font-size: .88rem; color: var(--text); }
    .topbar-role { font-size: .75rem; color: #94a3b8; font-weight: 500; }

    /* ── Content area ──────────────────────────────── */
    .admin-content { padding: 1.75rem; flex: 1; }

    /* ── Responsive ────────────────────────────────── */
    @media (max-width: 768px) {
      .admin-sidebar { display: none; }
      .admin-main { margin-left: 0; }
    }
  </style>

</head>
<body>
<div class="admin-wrapper">

  <!-- ─── Sidebar ───────────────────────────────── -->
  <aside class="admin-sidebar">
    <a class="sidebar-brand" href="<?= $appUrl ?>/admin">
      <div class="sidebar-brand-icon"><i class="bi bi-shield-lock"></i></div>
      <div>
        <div class="sidebar-brand-text">Admin<span>Panel</span></div>
        <div class="sidebar-admin-badge">SinhVienMarket</div>
      </div>
    </a>

    <nav class="sidebar-nav">
      <div class="sidebar-section">Tổng quan</div>
      <a href="<?= $appUrl ?>/admin" class="<?= isActive('/admin', $currentUrl) && !str_contains($currentUrl, 'users') && !str_contains($currentUrl, 'products') && !str_contains($currentUrl, 'categories') && !str_contains($currentUrl, 'reports') && !str_contains($currentUrl, 'audit') ? 'active' : '' ?>">
        <i class="bi bi-speedometer2"></i> Dashboard
      </a>

      <div class="sidebar-section">Quản lý</div>
      <a href="<?= $appUrl ?>/admin/users" class="<?= isActive('admin/users', $currentUrl) ?>">
        <i class="bi bi-people"></i> Người dùng
      </a>
      <a href="<?= $appUrl ?>/admin/products" class="<?= isActive('admin/products', $currentUrl) ?>">
        <i class="bi bi-card-checklist"></i> Kiểm duyệt bài
      </a>
      <a href="<?= $appUrl ?>/admin/categories" class="<?= isActive('admin/categories', $currentUrl) ?>">
        <i class="bi bi-tags"></i> Danh mục
      </a>
      <a href="<?= $appUrl ?>/admin/giveaways" class="<?= isActive('admin/giveaway', $currentUrl) ?>">
        <i class="bi bi-gift"></i> Sự kiện Giveaway
      </a>

      <div class="sidebar-section">Báo cáo & Vi Phạm</div>
      <a href="<?= $appUrl ?>/admin/reports" class="<?= isActive('admin/reports', $currentUrl) ?>">
        <i class="bi bi-bar-chart-line"></i> Báo cáo giao dịch
      </a>
      <a href="<?= $appUrl ?>/admin/system-reports" class="<?= isActive('system-reports', $currentUrl) ?>">
        <i class="bi bi-shield-exclamation"></i> Tố cáo vi phạm
      </a>
      <a href="<?= $appUrl ?>/admin/audit-log" class="<?= isActive('audit-log', $currentUrl) ?>">
        <i class="bi bi-journal-text"></i> Nhật ký Admin
      </a>
    </nav>

    <div class="sidebar-footer">
      <a href="<?= $appUrl ?>/products" target="_blank">
        <i class="bi bi-box-arrow-up-right"></i> Xem trang web
      </a>
    </div>
  </aside>

  <!-- ─── Main ──────────────────────────────────── -->
  <div class="admin-main">
    <div class="admin-topbar">
      <h5 class="admin-topbar-title"><?= $title ?></h5>
      <div class="topbar-user-info">
        <button id="themeToggleBtnAdmin" class="btn btn-sm btn-icon border-0 me-2 d-flex align-items-center justify-content-center" style="width:34px;height:34px;border-radius:50%;background:rgba(99,102,241,.1)" title="Chuyển chế độ Sáng/Tối">
            <i class="bi bi-moon-stars-fill text-primary"></i>
        </button>
        <div class="topbar-avatar"><?= mb_strtoupper(mb_substr($user['name'] ?? 'A', 0, 1)) ?></div>
        <div>
          <div class="topbar-name"><?= htmlspecialchars($user['name'] ?? 'Admin', ENT_QUOTES) ?></div>
          <div class="topbar-role">Administrator</div>
        </div>
        <a href="<?= $appUrl ?>/logout" class="btn btn-sm ms-2" style="background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:8px;font-weight:700;font-size:.8rem">
          <i class="bi bi-box-arrow-right me-1"></i>Thoát
        </a>
      </div>
    </div>

    <!-- Flash -->
    <div class="flash-banner"><?= Flash::render() ?></div>

    <div class="admin-content">
      <?= $content ?>
    </div>
  </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
  // Dark Mode Toggle Logic for Admin
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('themeToggleBtnAdmin');
    if (!btn) return;

    function updateBtn() {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'dark') {
        btn.innerHTML = '<i class="bi bi-sun-fill text-warning"></i>';
        btn.style.background = 'rgba(245,158,11,.1)';
      } else {
        btn.innerHTML = '<i class="bi bi-moon-stars-fill text-primary"></i>';
        btn.style.background = 'rgba(99,102,241,.1)';
      }
    }
    updateBtn();

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const current = document.documentElement.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      updateBtn();
    });
  });
</script>
</body>
</html>
