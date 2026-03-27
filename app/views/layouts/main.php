<?php
/**
 * Main Layout - dùng cho trang sinh viên
 * $content được inject từ Controller::render()
 * $title  được truyền từ view data
 */
use Core\Flash;

$appUrl  = rtrim($_ENV['APP_URL'] ?? 'http://localhost:8080/sinhvien-market', '/');
$title   = htmlspecialchars($title ?? 'SinhVienMarket', ENT_QUOTES, 'UTF-8');
$user    = $_SESSION['user'] ?? null;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Marketplace mua bán, trao đổi và đấu giá ngược đồ dùng sinh viên KTX">
  <title><?= $title ?> — SinhVienMarket</title>

  <!-- Google Fonts: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <!-- Bootstrap 5.3 -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Bootstrap Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <!-- Custom CSS -->
  <link href="<?= $appUrl ?>/public/css/style.css" rel="stylesheet">
  <script>
    // Áp dụng theme từ localStorage trước khi render body để tránh chớp màn hình (FOUC)
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  </script>
</head>
<body>

<!-- ─── Navbar ─────────────────────────────────────── -->
<nav class="navbar navbar-main navbar-expand-lg" id="mainNavbar">
  <div class="container">
    <a class="navbar-brand" href="<?= $appUrl ?>/">
      <div class="navbar-brand-icon">
        <i class="bi bi-shop-window text-white" style="font-size:1rem"></i>
      </div>
      <div class="navbar-brand-text">SinhVien<span>Market</span></div>
    </a>

    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMain">
      <i class="bi bi-list text-white fs-4"></i>
    </button>

    <div class="collapse navbar-collapse" id="navMain">
      <!-- Search form -->
      <form class="d-flex mx-auto my-2 my-lg-0" action="<?= $appUrl ?>/products" method="GET" style="max-width:400px;width:100%">
        <div class="input-group" style="border-radius:50px;overflow:hidden">
          <input type="text" name="q" class="form-control border-0"
                 style="background:rgba(255,255,255,.15);color:#fff;border-radius:50px 0 0 50px!important;backdrop-filter:blur(8px)"
                 placeholder="Tìm sách, đồ dùng..." value="<?= htmlspecialchars($_GET['q'] ?? '', ENT_QUOTES) ?>">
          <button class="btn px-3" type="submit" title="Tìm kiếm"
                  style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:0 50px 50px 0!important">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </form>

      <ul class="navbar-nav ms-auto align-items-lg-center gap-1">
        <li class="nav-item">
          <a class="nav-link" href="<?= $appUrl ?>/products">
            <i class="bi bi-grid me-1"></i>Sản phẩm
          </a>
        </li>

        <?php if ($user): ?>
          <li class="nav-item">
            <a class="nav-link" href="<?= $appUrl ?>/products/create">
              <i class="bi bi-plus-circle me-1"></i>Đăng bán
            </a>
          </li>

          <!-- CHAT ICON -->
          <li class="nav-item" style="position:relative">
            <a class="nav-link px-2" href="<?= $appUrl ?>/chat" title="Tin nhắn">
              <i class="bi bi-chat-dots" style="font-size:1.2rem"></i>
              <span id="chatBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style="display:none;font-size:.65rem"></span>
            </a>
          </li>

          <!-- NOTIFICATION BELL -->
          <li class="nav-item dropdown" style="position:relative">
            <a class="nav-link px-2" href="#" id="notifDropdown" role="button" data-bs-toggle="dropdown" title="Thông báo">
              <i class="bi bi-bell" style="font-size:1.2rem"></i>
              <span id="notifBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style="display:none;font-size:.65rem"></span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end border-0 rounded-4 mt-1 p-2" style="min-width:300px;max-height:400px;overflow-y:auto" id="notifDropMenu">
              <li class="px-2 py-1 text-muted" style="font-size:.8rem;font-weight:700">Thông báo gần đây</li>
              <li id="notifList"><li class="px-3 py-2 text-muted" style="font-size:.8rem">Đang tải...</li></li>
              <li><hr class="dropdown-divider my-1"></li>
              <li><a class="dropdown-item rounded-3 py-2 text-center text-primary" href="<?= $appUrl ?>/notifications" style="font-size:.8rem;font-weight:600">Xem tất cả thông báo</a></li>
            </ul>
          </li>

          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" role="button" data-bs-toggle="dropdown">
              <div class="nav-avatar">
                <?= mb_strtoupper(mb_substr($user['name'], 0, 1)) ?>
              </div>
              <span><?= htmlspecialchars($user['name'], ENT_QUOTES) ?></span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end border-0 rounded-4 mt-1 p-2" style="min-width:220px">
              <li>
                <a class="dropdown-item rounded-3 py-2" href="<?= $appUrl ?>/dashboard">
                  <i class="bi bi-speedometer2 me-2 text-primary"></i>Dashboard của tôi
                </a>
              </li>
              <li>
                <a class="dropdown-item rounded-3 py-2" href="<?= $appUrl ?>/profile">
                  <i class="bi bi-person-circle me-2 text-primary"></i>Hồ sơ của tôi
                </a>
              </li>
              <li>
                <a class="dropdown-item rounded-3 py-2" href="<?= $appUrl ?>/products/my">
                  <i class="bi bi-box-seam me-2 text-primary"></i>Sản phẩm của tôi
                </a>
              </li>
              <li>
                <a class="dropdown-item rounded-3 py-2" href="<?= $appUrl ?>/transactions/history">
                  <i class="bi bi-receipt me-2 text-primary"></i>Lịch sử giao dịch
                </a>
              </li>
              <li>
                <a class="dropdown-item rounded-3 py-2" href="<?= $appUrl ?>/chat">
                  <i class="bi bi-chat-dots me-2 text-primary"></i>Tin nhắn
                </a>
              </li>
              <li>
                <a class="dropdown-item rounded-3 py-2 fw-600 text-warning" href="<?= $appUrl ?>/#giveaway">
                  <i class="bi bi-gift-fill me-2"></i>Sự kiện Giveaway
                </a>
              </li>
              <?php if ($user['role'] === 'admin'): ?>
                <li><hr class="dropdown-divider my-2"></li>
                <li>
                  <a class="dropdown-item rounded-3 py-2 text-danger" href="<?= $appUrl ?>/admin">
                    <i class="bi bi-shield-lock me-2"></i>Admin Panel
                  </a>
                </li>
              <?php endif; ?>
              <li><hr class="dropdown-divider my-2"></li>
              <li>
                <a class="dropdown-item rounded-3 py-2" href="#" id="themeToggleBtn">
                  <i class="bi bi-moon-stars me-2 text-warning"></i>Giao diện Tối
                </a>
              </li>
              <li><hr class="dropdown-divider my-2"></li>
              <li>
                <a class="dropdown-item rounded-3 py-2 text-danger" href="<?= $appUrl ?>/logout">
                  <i class="bi bi-box-arrow-right me-2"></i>Đăng xuất
                </a>
              </li>
            </ul>
          </li>
        <?php else: ?>
          <li class="nav-item">
            <a class="nav-link" href="<?= $appUrl ?>/login-role">Đăng nhập</a>
          </li>
          <li class="nav-item">
            <a class="nav-link btn-nav-cta" href="<?= $appUrl ?>/register">
              <i class="bi bi-person-plus me-1"></i>Đăng ký
            </a>
          </li>
        <?php endif; ?>
      </ul>
    </div>
  </div>
</nav>

<!-- ─── Flash Message ──────────────────────────────── -->
<div class="flash-banner">
  <?= Flash::render() ?>
</div>

<!-- ─── Main Content ───────────────────────────────── -->
<main>
  <?= $content ?>
</main>

<!-- ─── Footer ─────────────────────────────────────── -->
<footer class="site-footer">
  <div class="container">
    <div class="row g-4">
      <!-- Brand & About -->
      <div class="col-md-4">
        <div class="footer-brand"><i class="bi bi-shop-window me-1"></i>SinhVienMarket</div>
        <p class="mb-0" style="font-size:.875rem;line-height:1.7">
          Nền tảng mua bán, trao đổi &amp; đấu giá ngược dành riêng cho sinh viên <strong style="color:rgba(255,255,255,.7)">KTX Khu B</strong>.
          Tiết kiệm chi phí, kết nối cộng đồng.
        </p>
        <div class="mt-3 d-flex gap-2">
          <a href="#" class="btn btn-sm" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);border-radius:8px;width:36px;padding:0;height:36px;display:flex;align-items:center;justify-content:center" title="Facebook">
            <i class="bi bi-facebook"></i>
          </a>
          <a href="#" class="btn btn-sm" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);border-radius:8px;width:36px;padding:0;height:36px;display:flex;align-items:center;justify-content:center" title="Zalo">
            <i class="bi bi-chat-dots"></i>
          </a>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="col-md-2 col-6">
        <div class="footer-heading">Khám phá</div>
        <ul class="footer-links">
          <li><a href="<?= $appUrl ?>/products">Tất cả sản phẩm</a></li>
          <li><a href="<?= $appUrl ?>/products?type=auction">Đấu giá ngược</a></li>
          <li><a href="<?= $appUrl ?>/products?type=exchange">Trao đổi</a></li>
        </ul>
      </div>

      <!-- Account -->
      <div class="col-md-2 col-6">
        <div class="footer-heading">Tài khoản</div>
        <ul class="footer-links">
          <?php if ($user): ?>
            <li><a href="<?= $appUrl ?>/dashboard">Dashboard</a></li>
            <li><a href="<?= $appUrl ?>/products/create">Đăng bán</a></li>
            <li><a href="<?= $appUrl ?>/logout">Đăng xuất</a></li>
          <?php else: ?>
            <li><a href="<?= $appUrl ?>/login-role">Đăng nhập</a></li>
            <li><a href="<?= $appUrl ?>/register">Đăng ký miễn phí</a></li>
          <?php endif; ?>
        </ul>
      </div>

      <!-- Contact -->
      <div class="col-md-4">
        <div class="footer-heading">Thông tin</div>
        <ul class="footer-links">
          <li><i class="bi bi-geo-alt me-2"></i>KTX Khu B, Đại học Quốc gia TP.HCM</li>
          <li><i class="bi bi-envelope me-2"></i>support@sinhvienmarket.edu.vn</li>
          <li><i class="bi bi-clock me-2"></i>Hỗ trợ: 8:00 - 22:00 hàng ngày</li>
        </ul>
      </div>
    </div>

    <hr class="footer-divider">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 footer-bottom">
      <span>© <?= date('Y') ?> SinhVienMarket — Đồ án cơ sở ngành Công nghệ thông tin</span>
      <span>Made with <span style="color:#ef4444">♥</span> for students</span>
    </div>
  </div>
</footer>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<!-- Global JS -->
<script>
  // Navbar scroll effect
  const navbar = document.getElementById('mainNavbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  // Auto-dismiss alerts sau 5 giây
  document.querySelectorAll('.alert.fade.show').forEach(function(el) {
    setTimeout(function() {
      var alert = bootstrap.Alert.getOrCreateInstance(el);
      if (alert) alert.close();
    }, 5000);
  });

  // Intersection Observer for fade-in-up elements not tied to page load
  if ('IntersectionObserver' in window) {
    const revealEls = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('fade-in-up'); io.unobserve(e.target); }
      });
    }, { threshold: .15 });
    revealEls.forEach(el => io.observe(el));
  }
</script>
<?php if (isset($extraJs)): ?>
  <?= $extraJs ?>
<?php endif; ?>

<?php if ($user): ?>
<script>
// ─── Polling Notifications & Chat Badges ────────────────────────────────────
(function() {
  const BASE = '<?= $appUrl ?>';

  function typeIcon(type) {
    const icons = {
      product_approved: '\u2705',
      product_rejected: '\u274c',
      item_sold:        '\ud83c\udf89',
      wishlist_drop:    '\ud83d\udcc9',
      new_message:      '\ud83d\udcac',
    };
    return icons[type] || '\ud83d\udd14';
  }

  async function pollNotifications() {
    try {
      const res = await fetch(BASE + '/api/notifications/unread');
      const data = await res.json();
      const badge = document.getElementById('notifBadge');
      if (badge) {
        if (data.count > 0) { badge.textContent = data.count > 9 ? '9+' : data.count; badge.style.display = ''; }
        else { badge.style.display = 'none'; }
      }
      const list = document.getElementById('notifList');
      if (list && data.items && data.items.length > 0) {
        list.innerHTML = data.items.map(n =>
          `<li><a class="dropdown-item rounded-3 py-2" href="${n.link || BASE + '/notifications'}" style="white-space:normal">
            <div style="font-weight:600;font-size:.8rem">${typeIcon(n.type)} ${n.title}</div>
            ${n.body ? `<div style="font-size:.73rem;color:#6b7280">${n.body}</div>` : ''}
            <div style="font-size:.68rem;color:#9ca3af;margin-top:2px">${n.time}</div>
          </a></li>`
        ).join('');
      } else if (list) {
        list.innerHTML = '<li class="px-3 py-2 text-muted" style="font-size:.8rem">Đã đọc hết thông báo.</li>';
      }
    } catch(e) {}
  }

  async function pollChat() {
    try {
      const res = await fetch(BASE + '/api/chat/unread');
      const data = await res.json();
      const badge = document.getElementById('chatBadge');
      if (badge && data.success && data.data) {
        let count = data.data.count;
        if (count > 0) { badge.textContent = count > 9 ? '9+' : count; badge.style.display = ''; }
        else { badge.style.display = 'none'; }
      }
    } catch(e) {}
  }

  pollNotifications();
  pollChat();
  setInterval(pollNotifications, 10000);
  setInterval(pollChat, 10000);
})();
</script>
<?php endif; ?>

<?php
// ─── Giveaway Popup ───────────────────────────────────────────────────────────
// Chỉ load Giveaway đang active, hiển thị popup nếu có
use App\Models\Giveaway;
$_giveawayModel   = new Giveaway();
$_activeGiveaways = $_giveawayModel->getActive();
if (!empty($_activeGiveaways)):
  $_gw = $_activeGiveaways[0]; // Hiển thị sự kiện gần nhất
?>

<!-- ═══ GIVEAWAY POPUP ═══════════════════════════════════════════════════════ -->
<div id="gwOverlay" style="
  display:none; position:fixed; inset:0; z-index:99999;
  background:rgba(10,10,30,.75); backdrop-filter:blur(8px);
  align-items:center; justify-content:center;
  animation:gwFadeIn .35s ease forwards;
">

  <!-- Confetti particles -->
  <div id="gwConfetti" style="position:absolute;inset:0;pointer-events:none;overflow:hidden"></div>

  <!-- Modal box -->
  <div id="gwBox" style="
    position:relative; z-index:2; width:100%; max-width:520px; margin:1rem;
    background:#fff; border-radius:28px; overflow:hidden;
    box-shadow:0 40px 100px rgba(0,0,0,.5);
    animation:gwSlideUp .4s cubic-bezier(.16,1,.3,1) forwards;
  ">

    <!-- Gradient header -->
    <div style="
      background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 30%,#ec4899 70%,#f59e0b 100%);
      padding:2rem 1.75rem 1.5rem; text-align:center; position:relative;
    ">
      <!-- Floating emoji -->
      <div style="font-size:3.5rem; line-height:1; margin-bottom:.75rem; filter:drop-shadow(0 4px 12px rgba(0,0,0,.3))">🎁</div>
      <div style="
        display:inline-block; background:rgba(255,255,255,.2); color:#fff;
        font-size:.72rem; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;
        padding:.3rem .9rem; border-radius:50px; margin-bottom:.6rem; border:1px solid rgba(255,255,255,.3);
      ">🎉 Sự kiện đặc biệt</div>
      <h2 style="color:#fff; font-size:1.45rem; font-weight:900; margin:0; line-height:1.25; text-shadow:0 2px 8px rgba(0,0,0,.25)">
        <?= htmlspecialchars($_gw['title'], ENT_QUOTES) ?>
      </h2>
      <!-- Close btn -->
      <button onclick="closeGwPopup()" style="
        position:absolute; top:12px; right:14px; background:rgba(255,255,255,.2);
        border:none; color:#fff; width:32px; height:32px; border-radius:50%;
        font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center;
        transition:.2s; line-height:1;
      " title="Đóng" onmouseover="this.style.background='rgba(255,255,255,.35)'" onmouseout="this.style.background='rgba(255,255,255,.2)'">✕</button>
    </div>

    <!-- Body -->
    <div style="padding:1.5rem 1.75rem">

      <!-- Description -->
      <?php if (!empty($_gw['description'])): ?>
        <p style="color:#374151; font-size:.9rem; line-height:1.6; margin-bottom:1.25rem; text-align:center">
          <?= nl2br(htmlspecialchars($_gw['description'], ENT_QUOTES)) ?>
        </p>
      <?php endif; ?>

      <!-- Countdown -->
      <div style="
        background:linear-gradient(135deg,#f5f3ff,#fdf2f8); border-radius:16px;
        padding:1rem 1.25rem; margin-bottom:1.25rem; text-align:center;
        border:1.5px solid #e9d5ff;
      ">
        <div style="font-size:.75rem; font-weight:700; color:#7c3aed; text-transform:uppercase; letter-spacing:.8px; margin-bottom:.5rem">
          ⏰ Kết thúc sau
        </div>
        <div id="gwCountdown" style="font-size:1.8rem; font-weight:900; color:#6d28d9; font-variant-numeric:tabular-nums; letter-spacing:2px">
          --:--:--
        </div>
        <div style="font-size:.73rem; color:#9ca3af; margin-top:.3rem">
          Hạn cuối: <?= date('d/m/Y H:i', strtotime($_gw['end_time'])) ?>
        </div>
      </div>

      <!-- Count participants if available -->
      <div style="display:flex; gap:.75rem; justify-content:center; margin-bottom:1.25rem">
        <div style="text-align:center">
          <div style="font-size:1.3rem; font-weight:900; color:#7c3aed"><?= count($_giveawayModel->getParticipants($_gw['id'])) ?></div>
          <div style="font-size:.72rem; color:#6b7280">Người đã tham gia</div>
        </div>
        <div style="width:1px; background:#e5e7eb"></div>
        <div style="text-align:center">
          <div style="font-size:1.3rem; font-weight:900; color:#ec4899"><?= count($_activeGiveaways) ?></div>
          <div style="font-size:.72rem; color:#6b7280">Sự kiện đang diễn ra</div>
        </div>
      </div>

      <!-- CTA Buttons -->
      <div style="display:flex; gap:.75rem; flex-direction:column">
        <a href="<?= $appUrl ?>/#giveaway-section"
           onclick="closeGwPopup()"
           style="
             display:flex; align-items:center; justify-content:center; gap:.6rem;
             background:linear-gradient(135deg,#7c3aed,#ec4899);
             color:#fff; border-radius:14px; padding:.9rem; font-weight:800;
             font-size:1rem; text-decoration:none; transition:.25s;
             box-shadow:0 8px 24px rgba(124,58,237,.4);
           "
           onmouseover="this.style.opacity='.9';this.style.transform='translateY(-2px)'"
           onmouseout="this.style.opacity='1';this.style.transform='none'"
        >
          <span style="font-size:1.2rem">🎰</span> Tham gia Giveaway ngay!
        </a>
        <button onclick="closeGwPopup(true)"
          style="
            background:#f9fafb; color:#6b7280; border:1.5px solid #e5e7eb;
            border-radius:14px; padding:.7rem; font-weight:600; font-size:.875rem;
            cursor:pointer; transition:.2s;
          "
          onmouseover="this.style.background='#f3f4f6'"
          onmouseout="this.style.background='#f9fafb'"
        >Nhắc lại lần sau</button>
      </div>
    </div>
  </div>
</div>

<style>
@keyframes gwFadeIn  { from{opacity:0} to{opacity:1} }
@keyframes gwSlideUp { from{transform:translateY(40px) scale(.95);opacity:0} to{transform:none;opacity:1} }
@keyframes gwFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
#gwBox .emoji-float  { animation:gwFloat 2.5s ease-in-out infinite }
</style>

<script>
(function() {
  // Key theo ID sự kiện, để khi có sự kiện mới thì popup lại
  const GW_KEY = 'gw_seen_<?= $_gw['id'] ?>_<?= date('Ymd') ?>';

  function launchConfetti() {
    const wrap = document.getElementById('gwConfetti');
    if (!wrap) return;
    const colors = ['#7c3aed','#ec4899','#f59e0b','#10b981','#fff','#f3f4f6'];
    for (let i = 0; i < 90; i++) {
      const el = document.createElement('div');
      const size = Math.random() * 10 + 6;
      el.style.cssText = `
        position:absolute;
        left:${Math.random()*100}%;
        top:-${Math.random()*120+20}px;
        width:${size}px; height:${size}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>.5?'50%':'3px'};
        opacity:${Math.random()*.9+.1};
        animation:gwDrop ${Math.random()*2+2}s linear ${Math.random()*1.5}s forwards;
        transform:rotate(${Math.random()*360}deg);
      `;
      wrap.appendChild(el);
    }
    const style = document.createElement('style');
    style.textContent = `@keyframes gwDrop { to { top:110%; transform:rotate(${Math.random()*720}deg); } }`;
    document.head.appendChild(style);
  }

  function startCountdown() {
    const endTime = new Date('<?= date('Y-m-d\TH:i:s', strtotime($_gw['end_time'])) ?>').getTime();
    const el = document.getElementById('gwCountdown');
    if (!el) return;
    function tick() {
      const diff = endTime - Date.now();
      if (diff <= 0) { el.textContent = 'Đã kết thúc'; return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }
    tick();
    setInterval(tick, 1000);
  }

  function openGwPopup() {
    const overlay = document.getElementById('gwOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    launchConfetti();
    startCountdown();
  }

  window.closeGwPopup = function(dismissForToday = false) {
    document.getElementById('gwOverlay').style.display = 'none';
    // Nếu bấm "Nhắc lại lần sau" → lưu theo session (sessionStorage)
    // Nếu bấm "Tham gia ngay" hay X → lưu vào localStorage hết hôm nay
    if (dismissForToday) {
      sessionStorage.setItem(GW_KEY, '1');
    } else {
      localStorage.setItem(GW_KEY, '1');
    }
  };

  // Click nền để đóng
  document.getElementById('gwOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeGwPopup();
  });

  // Kiểm tra xem đã thấy chưa
  const seenSession = sessionStorage.getItem(GW_KEY);
  const seenLocal   = localStorage.getItem(GW_KEY);
  if (!seenSession && !seenLocal) {
    // Delay nhỏ cho trang render xong rồi mới popup
    setTimeout(openGwPopup, 800);
  }
})();
</script>
<?php endif; ?>
<script>
  // Dark Mode Toggle Logic
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    function updateBtn() {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'dark') {
        btn.innerHTML = '<i class="bi bi-sun-fill me-2 text-warning"></i>Giao diện Sáng';
      } else {
        btn.innerHTML = '<i class="bi bi-moon-stars-fill me-2 text-primary"></i>Giao diện Tối';
      }
    }
    updateBtn();

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation(); // Giữ menu không bị đóng nếu muốn (tùy chọn)
      
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
