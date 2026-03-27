<?php
/**
 * View: Thông báo tài khoản bị khóa
 * Hiển thị khi user đang đăng nhập nhưng tài khoản bị admin khóa
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');

// Lấy thông tin user từ session
$lockedUser = $_SESSION['user'] ?? [];

// Nếu không có session, redirect về login
if (empty($lockedUser)) {
    header('Location: ' . $appUrl . '/login-role');
    exit;
}

// Format thời gian
$lockedAt    = $lockedUser['locked_at']    ?? null;
$lockedUntil = $lockedUser['locked_until'] ?? null;
$lockReason  = $lockedUser['lock_reason']  ?? 'Vi phạm điều khoản sử dụng';

$lockedAtFmt    = $lockedAt    ? date('H:i:s \n\g\à\y d/m/Y', strtotime($lockedAt))    : null;
$lockedUntilFmt = $lockedUntil ? date('H:i:s \n\g\à\y d/m/Y', strtotime($lockedUntil)) : null;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tài khoản bị khóa — SinhVienMarket</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #1a055c 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 2rem 1rem; position: relative; overflow: hidden;
    }

    /* Animated blobs */
    .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .45; animation: blobFloat 12s ease-in-out infinite alternate; }
    .blob-1 { width:500px;height:500px;background:#ef4444;top:-180px;right:-100px;animation-duration:14s; }
    .blob-2 { width:380px;height:380px;background:#dc2626;bottom:-150px;left:-80px;animation-duration:10s;animation-delay:-5s; }
    .blob-3 { width:250px;height:250px;background:#7c3aed;top:40%;left:40%;animation-duration:8s;animation-delay:-3s; }
    @keyframes blobFloat { from{transform:translate(0,0) scale(1);} to{transform:translate(30px,20px) scale(1.1);} }

    /* Floating particles */
    .particle {
      position: absolute; width:8px; height:8px; border-radius:50%;
      background: rgba(255,255,255,.3);
      animation: particleFloat 6s ease-in-out infinite alternate;
    }
    @keyframes particleFloat { from{transform:translateY(0);opacity:.2;} to{transform:translateY(-28px);opacity:.8;} }

    /* Card */
    .lock-card {
      position: relative; z-index: 2;
      background: rgba(255,255,255,.95);
      border: 1px solid rgba(255,255,255,.6);
      border-radius: 28px;
      box-shadow: 0 40px 100px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.3);
      padding: 2.75rem 3rem;
      width: 100%; max-width: 560px;
      animation: slideUp .55s cubic-bezier(.16,1,.3,1);
      text-align: center;
    }
    @keyframes slideUp { from{opacity:0;transform:translateY(44px) scale(.97);} to{opacity:1;transform:none;} }

    .lock-icon-wrap {
      width: 88px; height: 88px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.4rem;
      box-shadow: 0 12px 36px rgba(239,68,68,.5);
      animation: iconPulse 2s ease-in-out infinite;
    }
    @keyframes iconPulse {
      0%,100%{box-shadow:0 12px 36px rgba(239,68,68,.5);}
      50%{box-shadow:0 12px 48px rgba(239,68,68,.75),0 0 0 12px rgba(239,68,68,.12);}
    }
    .lock-icon-wrap i { font-size: 2.6rem; color: #fff; }

    .lock-title {
      font-size: 1.65rem; font-weight: 900; color: #0f172a;
      letter-spacing: -.5px; margin-bottom: .35rem;
    }
    .lock-subtitle { font-size: .95rem; color: #64748b; margin-bottom: 1.75rem; }

    .lock-info-card {
      background: #fff7f7;
      border: 1.5px solid #fecaca;
      border-radius: 16px;
      padding: 1.4rem 1.6rem;
      text-align: left;
      margin-bottom: 1.5rem;
    }
    .lock-info-row {
      display: flex; gap: .75rem; align-items: flex-start;
      padding: .6rem 0;
      border-bottom: 1px solid #fee2e2;
    }
    .lock-info-row:last-child { border: none; padding-bottom: 0; }
    .lock-info-icon {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0; margin-top: 2px;
    }
    .lock-info-label { font-size: .78rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; }
    .lock-info-value { font-size: .93rem; font-weight: 700; color: #0f172a; line-height: 1.45; margin-top: 2px; }

    .lock-reason-box {
      background: linear-gradient(135deg, #fef2f2, #fff5f5);
      border: 1.5px solid #fca5a5;
      border-radius: 12px; padding: 1rem 1.2rem;
      font-size: .93rem; font-weight: 600; color: #991b1b;
      text-align: left; line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .lock-reason-box strong { display: block; font-size: .78rem; font-weight: 800; color: #b91c1c; text-transform: uppercase; letter-spacing: .5px; margin-bottom: .35rem; }

    .lock-permanent-badge {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #fef2f2; border: 1.5px solid #fca5a5;
      color: #b91c1c; font-size: .82rem; font-weight: 800;
      padding: .4rem 1rem; border-radius: 50px;
      margin-bottom: 1.5rem;
    }

    .lock-footer-msg {
      font-size: .87rem; color: #94a3b8; line-height: 1.6;
      border-top: 1px solid #e2e8f0; padding-top: 1.2rem;
      margin-top: 1rem;
    }

    .btn-contact {
      display: inline-flex; align-items: center; gap: .5rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; font-weight: 800; font-size: .95rem;
      padding: .75rem 2rem; border-radius: 12px; border: none;
      text-decoration: none; margin-top: 1rem;
      box-shadow: 0 6px 20px rgba(99,102,241,.4);
      transition: all .25s; font-family: inherit; cursor: pointer;
    }
    .btn-contact:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(99,102,241,.5); color: #fff; }
    .btn-logout {
      display: inline-flex; align-items: center; gap: .5rem;
      background: #f1f5f9; color: #64748b; font-weight: 700;
      font-size: .88rem; padding: .65rem 1.5rem;
      border-radius: 12px; border: none; text-decoration: none;
      margin-top: .6rem; margin-left: .5rem;
      transition: all .2s; font-family: inherit; cursor: pointer;
    }
    .btn-logout:hover { background: #e2e8f0; color: #334155; }
  </style>
</head>
<body>
  <!-- Blobs -->
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
  <!-- Particles -->
  <div class="particle" style="top:15%;left:8%;animation-delay:0s"></div>
  <div class="particle" style="top:65%;left:12%;animation-delay:1.8s"></div>
  <div class="particle" style="top:28%;right:9%;animation-delay:.7s"></div>
  <div class="particle" style="top:80%;right:18%;animation-delay:2.5s"></div>

  <div class="lock-card">
    <!-- Icon -->
    <div class="lock-icon-wrap">
      <i class="bi bi-lock-fill"></i>
    </div>

    <h1 class="lock-title">Tài khoản bị khóa</h1>
    <p class="lock-subtitle">Xin chào <strong><?= htmlspecialchars($lockedUser['name'] ?? 'bạn', ENT_QUOTES) ?></strong>, tài khoản của bạn hiện đang bị hạn chế truy cập.</p>

    <!-- Thông tin chi tiết -->
    <div class="lock-info-card">
      <?php if ($lockedAtFmt): ?>
      <div class="lock-info-row">
        <div class="lock-info-icon" style="background:#fef2f2;color:#ef4444">
          <i class="bi bi-clock-fill"></i>
        </div>
        <div>
          <div class="lock-info-label">Thời điểm bị khóa</div>
          <div class="lock-info-value"><?= $lockedAtFmt ?></div>
        </div>
      </div>
      <?php endif; ?>

      <div class="lock-info-row">
        <div class="lock-info-icon" style="background:#fff7ed;color:#f97316">
          <i class="bi bi-exclamation-triangle-fill"></i>
        </div>
        <div>
          <div class="lock-info-label">Lý do khóa</div>
          <div class="lock-info-value" style="color:#dc2626"><?= htmlspecialchars($lockReason, ENT_QUOTES) ?></div>
        </div>
      </div>

      <div class="lock-info-row">
        <div class="lock-info-icon" style="background:#f0fdf4;color:#16a34a">
          <i class="bi bi-calendar-check-fill"></i>
        </div>
        <div>
          <div class="lock-info-label">Hệ thống sẽ mở lại vào</div>
          <?php if ($lockedUntilFmt): ?>
            <div class="lock-info-value" style="color:#16a34a"><?= $lockedUntilFmt ?></div>
          <?php else: ?>
            <div class="lock-info-value" style="color:#991b1b">
              <i class="bi bi-infinity me-1"></i>Vĩnh viễn (liên hệ Admin để được hỗ trợ)
            </div>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <p class="lock-footer-msg">
      <i class="bi bi-info-circle me-1"></i>
      Mong bạn vui lòng sử dụng hệ thống có chuẩn mực hơn!<br>
      Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ với quản trị viên ngay.
    </p>

    <div class="mt-3">
      <a href="mailto:admin@sinhvienmarket.vn?subject=Khiếu nại khóa tài khoản — <?= htmlspecialchars($lockedUser['email'] ?? '', ENT_QUOTES) ?>" class="btn-contact">
        <i class="bi bi-envelope-fill"></i>Liên hệ Admin
      </a>
      <a href="<?= $appUrl ?>/logout" class="btn-logout">
        <i class="bi bi-box-arrow-right"></i>Đăng xuất
      </a>
    </div>
  </div>
</body>
</html>
