<?php
/**
 * Error 500 — Lỗi máy chủ
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lỗi máy chủ — SinhVienMarket</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      color: #e2e8f0; padding: 2rem;
    }
    .card {
      background: rgba(255,255,255,.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 28px;
      padding: 3rem;
      max-width: 520px; width: 100%;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0,0,0,.4);
    }
    .icon-wrap {
      width: 88px; height: 88px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 2.5rem; margin: 0 auto 1.5rem;
      box-shadow: 0 0 0 12px rgba(239,68,68,.15), 0 16px 40px rgba(239,68,68,.4);
      animation: pulse 2.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 12px rgba(239,68,68,.1), 0 16px 40px rgba(239,68,68,.3); }
      50%       { box-shadow: 0 0 0 20px rgba(239,68,68,.05), 0 16px 40px rgba(239,68,68,.45); }
    }
    .code {
      font-size: 5rem; font-weight: 900;
      background: linear-gradient(90deg, #ef4444, #f97316);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1; margin-bottom: .5rem;
    }
    h1 { font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: .75rem; }
    p { font-size: .95rem; color: rgba(255,255,255,.6); line-height: 1.7; margin-bottom: 2rem; }
    .actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }
    .btn-home {
      display: inline-flex; align-items: center; gap: .5rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; font-weight: 700; font-size: .9rem;
      padding: .7rem 1.6rem; border-radius: 12px; text-decoration: none;
      transition: all .2s; box-shadow: 0 8px 24px rgba(99,102,241,.4);
    }
    .btn-home:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(99,102,241,.55); color: #fff; }
    .btn-back {
      display: inline-flex; align-items: center; gap: .5rem;
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18);
      color: rgba(255,255,255,.75); font-weight: 600; font-size: .9rem;
      padding: .7rem 1.6rem; border-radius: 12px; text-decoration: none;
      transition: all .2s;
    }
    .btn-back:hover { background: rgba(255,255,255,.15); color: #fff; }
    .footer-note {
      margin-top: 2rem;
      font-size: .78rem; color: rgba(255,255,255,.3);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">⚙️</div>
    <div class="code">500</div>
    <h1>Lỗi máy chủ nội bộ</h1>
    <p>Hệ thống đang gặp sự cố kỹ thuật. Đội ngũ của chúng tôi đã được thông báo và đang khắc phục. Xin lỗi vì sự bất tiện này!</p>
    <div class="actions">
      <a href="<?= $appUrl ?>" class="btn-home">
        <i class="bi bi-house-fill"></i>Về trang chủ
      </a>
      <a href="javascript:history.back()" class="btn-back">
        <i class="bi bi-arrow-left"></i>Quay lại
      </a>
    </div>
    <div class="footer-note">
      <i class="bi bi-shield-check me-1"></i>Lỗi đã được ghi nhật ký tự động.
    </div>
  </div>
</body>
</html>
