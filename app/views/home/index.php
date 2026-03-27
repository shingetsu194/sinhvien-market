<?php
/**
 * View: Trang chủ — Premium Edition
 * Hero + Giveaway + Đấu giá hot + Danh mục + Sản phẩm mới + CTA
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
$user   = $_SESSION['user'] ?? null;

function hp(int $price): string {
    return number_format($price, 0, ',', '.') . 'đ';
}
?>

<!-- ─── HERO ─────────────────────────────────────────────────────── -->
<section class="hp-hero">
  <!-- Animated blobs background -->
  <div class="hp-blob hp-blob-1"></div>
  <div class="hp-blob hp-blob-2"></div>
  <div class="hp-blob hp-blob-3"></div>
  <!-- Floating particles -->
  <div class="hp-particle" style="top:20%;left:8%;animation-delay:0s"></div>
  <div class="hp-particle" style="top:60%;left:15%;animation-delay:1.5s"></div>
  <div class="hp-particle" style="top:35%;right:10%;animation-delay:.8s"></div>
  <div class="hp-particle" style="top:75%;right:20%;animation-delay:2.2s"></div>

  <div class="container hp-hero-content">
    <div class="row align-items-center" style="min-height:580px;padding:80px 0 60px">
      <!-- Left: Text -->
      <div class="col-lg-6 text-center text-lg-start fade-in-up">
        <div class="hp-hero-badge mb-4">
          <i class="bi bi-lightning-fill me-1"></i>Đấu giá ngược &middot; Mua bán &middot; Giveaway
        </div>
        <h1 class="hp-hero-title">
          Chợ Sinh Viên<br>
          <span class="hp-hero-gradient">KTX Khu B</span>
        </h1>
        <p class="hp-hero-sub">
          Mua bán sách giáo trình, đồ dùng với giá hợp lý nhất.<br>
          Tham gia đấu giá ngược — <strong style="color:#c4b5fd">giá tự giảm</strong>, mua ngay khi ưng!
        </p>
        <div class="d-flex gap-3 flex-wrap justify-content-center justify-content-lg-start mt-4">
          <a href="<?= $appUrl ?>/products" class="hp-btn-primary">
            <i class="bi bi-bag-fill me-2"></i>Mua sắm ngay
          </a>
          <?php if ($user): ?>
            <a href="<?= $appUrl ?>/products/create" class="hp-btn-glass">
              <i class="bi bi-plus-circle me-2"></i>Đăng bán
            </a>
          <?php else: ?>
            <a href="<?= $appUrl ?>/register" class="hp-btn-glass">
              <i class="bi bi-person-plus me-2"></i>Đăng ký miễn phí
            </a>
          <?php endif; ?>
        </div>

        <!-- Stats row -->
        <div class="hp-stats fade-in-up delay-200">
          <div class="hp-stat">
            <span class="hp-stat-num"><?= number_format($stats['products']) ?>+</span>
            <span class="hp-stat-lbl">Sản phẩm</span>
          </div>
          <div class="hp-stat-divider"></div>
          <div class="hp-stat">
            <span class="hp-stat-num"><?= number_format($stats['users']) ?>+</span>
            <span class="hp-stat-lbl">Sinh viên</span>
          </div>
          <div class="hp-stat-divider"></div>
          <div class="hp-stat">
            <span class="hp-stat-num"><?= number_format($stats['tx']) ?>+</span>
            <span class="hp-stat-lbl">GD hôm nay</span>
          </div>
        </div>
      </div>

      <!-- Right: Feature Card -->
      <div class="col-lg-6 d-none d-lg-flex justify-content-center fade-in-up delay-300">
        <div class="hp-feature-card">
          <div class="hp-feature-row">
            <div class="hp-feat-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
              <i class="bi bi-lightning-fill"></i>
            </div>
            <div>
              <div class="hp-feat-title">Đấu giá ngược</div>
              <div class="hp-feat-desc">Giá giảm dần — mua ngay khi ưng</div>
            </div>
          </div>
          <div class="hp-feature-row">
            <div class="hp-feat-icon" style="background:linear-gradient(135deg,#ec4899,#f97316)">
              <i class="bi bi-gift-fill"></i>
            </div>
            <div>
              <div class="hp-feat-title">Sự kiện Giveaway</div>
              <div class="hp-feat-desc">Quay số trúng thưởng mỗi tuần</div>
            </div>
          </div>
          <div class="hp-feature-row">
            <div class="hp-feat-icon" style="background:linear-gradient(135deg,#06b6d4,#3b82f6)">
              <i class="bi bi-credit-card-2-front-fill"></i>
            </div>
            <div>
              <div class="hp-feat-title">Thanh toán đa dạng</div>
              <div class="hp-feat-desc">ZaloPay, chuyển khoản, COD</div>
            </div>
          </div>
          <div class="hp-feature-row" style="border:none">
            <div class="hp-feat-icon" style="background:linear-gradient(135deg,#10b981,#059669)">
              <i class="bi bi-shield-fill-check"></i>
            </div>
            <div>
              <div class="hp-feat-title">Bảo mật & An toàn</div>
              <div class="hp-feat-desc">Tài khoản xác thực & CSRF protect</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── GIVEAWAY EVENT ───────────────────────────────────────────── -->
<?php if (!empty($giveaway)): ?>
<section class="hp-giveaway" id="giveaway">
  <div class="hp-gw-blob-1"></div>
  <div class="hp-gw-blob-2"></div>
  <div class="container" style="position:relative;z-index:2">
    <div class="row align-items-center justify-content-center g-4 text-center text-md-start">
      <div class="col-auto">
        <?php if ($giveaway['image']): ?>
          <div class="hp-gw-img-wrap">
            <img src="<?= $appUrl ?>/public/uploads/<?= htmlspecialchars($giveaway['image']) ?>" alt="">
            <div class="hp-gw-badge-top">🎁</div>
          </div>
        <?php else: ?>
          <div class="hp-gw-icon-placeholder"><i class="bi bi-gift-fill"></i></div>
        <?php endif; ?>
      </div>
      <div class="col-md-7">
        <div class="hp-gw-label mb-2">
          <i class="bi bi-stars me-1"></i>SỰ KIỆN ĐẶC BIỆT
        </div>
        <h2 class="fw-900 text-white mb-1" style="font-size:clamp(1.5rem,3.5vw,2.2rem)">
          <i class="bi bi-gift-fill text-warning me-2"></i><?= htmlspecialchars($giveaway['title']) ?>
        </h2>
        <p style="color:rgba(255,255,255,.65);font-size:.95rem;max-width:520px;line-height:1.7;margin-bottom:1rem">
          <?= nl2br(htmlspecialchars($giveaway['description'])) ?>
        </p>
        <div class="hp-gw-time mb-4">
          <i class="bi bi-clock-history me-1"></i>
          Kết thúc: <strong style="color:rgba(255,255,255,.9)"><?= date('d/m/Y H:i', strtotime($giveaway['end_time'])) ?></strong>
        </div>
        <?php if (!$user): ?>
          <a href="<?= $appUrl ?>/login" class="hp-gw-btn">
            <i class="bi bi-box-arrow-in-right me-2"></i>Đăng nhập để tham gia
          </a>
        <?php elseif ($hasJoinedGiveaway): ?>
          <button class="hp-gw-btn-joined" disabled>
            <i class="bi bi-check-circle-fill me-2"></i>Đã đăng ký tham gia ✓
          </button>
        <?php else: ?>
          <button id="btnJoinGiveaway" class="hp-gw-btn-join" data-id="<?= $giveaway['id'] ?>">
            <i class="bi bi-controller me-2"></i>Tham gia vòng quay ngay!
          </button>
        <?php endif; ?>
      </div>
    </div>
  </div>
</section>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnJoinGiveaway');
  if (btn) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang xử lý...';
      try {
        const formData = new FormData();
        formData.append('giveaway_id', btn.dataset.id);
        formData.append('_csrf', '<?= htmlspecialchars($this->csrfToken() ?? "") ?>');
        const response = await fetch('<?= $appUrl ?>/api/giveaways/join', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) { alert(result.message || 'Đăng ký thành công!'); window.location.reload(); }
        else {
          alert((result.error && result.error.message) || 'Có lỗi xảy ra.');
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-controller me-2"></i>Tham gia vòng quay ngay!';
        }
      } catch (err) {
        alert('Lỗi mạng, vui lòng thử lại.');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-controller me-2"></i>Tham gia vòng quay ngay!';
      }
    });
  }
});
</script>
<?php endif; ?>

<!-- ─── ĐẤU GIÁ HOT ─────────────────────────────────────────────── -->
<?php if (!empty($auctionProducts)): ?>
<section style="padding:72px 0;background:var(--bg, #fff);transition:background .3s">
  <div class="container">
    <div class="d-flex justify-content-between align-items-end mb-5">
      <div>
        <span class="hp-section-badge" style="background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.2)">
          <i class="bi bi-lightning-charge-fill me-1"></i>ĐANG DIỄN RA
        </span>
        <h2 class="section-title mt-2">Đấu giá đang HOT 🔥</h2>
        <p class="text-muted small mb-0">Giá tự giảm theo thời gian · Mua ngay trước khi người khác nhanh hơn!</p>
      </div>
      <a href="<?= $appUrl ?>/products?type=auction" class="hp-link-all d-none d-md-flex">
        Xem tất cả <i class="bi bi-arrow-right ms-1"></i>
      </a>
    </div>
    <div class="row g-4">
      <?php foreach ($auctionProducts as $p): ?>
        <div class="col-md-4 fade-in-up delay-100">
          <a href="<?= $appUrl ?>/products/show?id=<?= $p['id'] ?>" class="text-decoration-none">
            <div class="hp-auction-card">
              <div class="hp-auction-img">
                <?php if ($p['image']): ?>
                  <img src="<?= $appUrl ?>/public/uploads/<?= htmlspecialchars($p['image'], ENT_QUOTES) ?>" alt="">
                <?php else: ?>
                  <div class="hp-auction-placeholder"><i class="bi bi-lightning-fill"></i></div>
                <?php endif; ?>
                <div class="hp-auction-tag"><i class="bi bi-lightning-fill me-1"></i>Đấu giá</div>
                <div class="hp-auction-overlay"></div>
              </div>
              <div class="hp-auction-body">
                <div class="hp-auction-cat"><?= htmlspecialchars($p['category_name'], ENT_QUOTES) ?></div>
                <h6 class="hp-auction-title"><?= htmlspecialchars($p['title'], ENT_QUOTES) ?></h6>
                <div class="d-flex justify-content-between align-items-center mt-2">
                  <div>
                    <div class="hp-auction-price"><?= hp($p['current_price'] ?? $p['start_price']) ?></div>
                    <div class="hp-auction-orig">Gốc: <s><?= hp($p['start_price']) ?></s></div>
                  </div>
                  <div class="hp-auction-down">
                    <i class="bi bi-arrow-down-circle-fill"></i>
                    <span>Đang giảm</span>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── DANH MỤC ────────────────────────────────────────────────── -->
<section class="hp-category-section" style="padding:72px 0">
  <div class="container">
    <div class="text-center mb-5">
      <span class="hp-section-badge">
        <i class="bi bi-grid-fill me-1"></i>DANH MỤC
      </span>
      <h2 class="section-title mt-2" style="display:block">Mua sắm theo danh mục</h2>
      <p class="text-muted" style="font-size:.95rem">Chọn danh mục yêu thích để tìm nhanh hơn</p>
    </div>
    <?php
    $catColors = [
      ['bg'=>'linear-gradient(135deg,#6366f1,#8b5cf6)','shadow'=>'rgba(99,102,241,.4)'],
      ['bg'=>'linear-gradient(135deg,#ec4899,#f97316)','shadow'=>'rgba(236,72,153,.4)'],
      ['bg'=>'linear-gradient(135deg,#06b6d4,#3b82f6)','shadow'=>'rgba(6,182,212,.4)'],
      ['bg'=>'linear-gradient(135deg,#10b981,#059669)','shadow'=>'rgba(16,185,129,.4)'],
      ['bg'=>'linear-gradient(135deg,#f59e0b,#ef4444)','shadow'=>'rgba(245,158,11,.4)'],
      ['bg'=>'linear-gradient(135deg,#8b5cf6,#ec4899)','shadow'=>'rgba(139,92,246,.4)'],
      ['bg'=>'linear-gradient(135deg,#14b8a6,#6366f1)','shadow'=>'rgba(20,184,166,.4)'],
      ['bg'=>'linear-gradient(135deg,#f43f5e,#f97316)','shadow'=>'rgba(244,63,94,.4)'],
    ];
    $catIdx = 0;
    ?>
    <div class="row g-3 justify-content-center">
      <?php foreach ($categories as $cat):
        $clr = $catColors[$catIdx % count($catColors)]; $catIdx++;
      ?>
        <div class="col-6 col-sm-4 col-md-3 col-lg-2">
          <a href="<?= $appUrl ?>/products?category=<?= $cat['id'] ?>" class="text-decoration-none">
            <div class="hp-cat-card" data-shadow="<?= $clr['shadow'] ?>">
              <div class="hp-cat-icon" style="background:<?= $clr['bg'] ?>;box-shadow:0 8px 20px <?= $clr['shadow'] ?>">
                <i class="bi <?= htmlspecialchars($cat['icon'] ?? 'bi-tag', ENT_QUOTES) ?>"></i>
              </div>
              <div class="hp-cat-name"><?= htmlspecialchars($cat['name'], ENT_QUOTES) ?></div>
            </div>
          </a>
        </div>
      <?php endforeach; ?>
      <div class="col-6 col-sm-4 col-md-3 col-lg-2">
        <a href="<?= $appUrl ?>/products" class="text-decoration-none">
          <div class="hp-cat-card hp-cat-all">
            <div class="hp-cat-icon" style="background:#f1f5f9;box-shadow:none">
              <i class="bi bi-grid" style="color:#94a3b8"></i>
            </div>
            <div class="hp-cat-name" style="color:#64748b">Tất cả</div>
          </div>
        </a>
      </div>
    </div>
  </div>
</section>

<!-- ─── SẢN PHẨM MỚI NHẤT ──────────────────────────────────────── -->
<section style="padding:72px 0;background:var(--card-bg, #fff);transition:background .3s">
  <div class="container">
    <div class="d-flex justify-content-between align-items-end mb-5">
      <div>
        <span class="hp-section-badge">
          <i class="bi bi-stars me-1"></i>MỚI NHẤT
        </span>
        <h2 class="section-title mt-2">Sản phẩm mới nhất</h2>
      </div>
      <a href="<?= $appUrl ?>/products" class="hp-link-all d-none d-md-flex">
        Xem tất cả <i class="bi bi-arrow-right ms-1"></i>
      </a>
    </div>

    <?php if (empty($featuredProducts)): ?>
      <div class="text-center py-5">
        <div class="hp-empty-icon"><i class="bi bi-bag-x"></i></div>
        <h5 class="text-muted mt-3">Chưa có sản phẩm nào</h5>
        <?php if ($user): ?>
          <a href="<?= $appUrl ?>/products/create" class="btn btn-primary mt-3">
            <i class="bi bi-plus-lg me-1"></i>Đăng sản phẩm đầu tiên
          </a>
        <?php endif; ?>
      </div>
    <?php else: ?>
      <div class="row g-4">
        <?php foreach ($featuredProducts as $idx => $p): ?>
          <div class="col-sm-6 col-md-4 col-xl-2 fade-in-up" style="animation-delay:<?= $idx * 60 ?>ms">
            <a href="<?= $appUrl ?>/products/show?id=<?= $p['id'] ?>" class="text-decoration-none">
              <div class="hp-product-card">
                <div class="hp-product-img">
                  <?php if ($p['image']): ?>
                    <img src="<?= $appUrl ?>/public/uploads/<?= htmlspecialchars($p['image'], ENT_QUOTES) ?>" alt="">
                  <?php else: ?>
                    <div class="hp-product-placeholder"><i class="bi bi-image"></i></div>
                  <?php endif; ?>
                  <?php if ($p['type'] === 'auction'): ?>
                    <span class="hp-product-type-badge" style="background:linear-gradient(135deg,#ef4444,#f97316)">⚡ Đấu giá</span>
                  <?php elseif ($p['type'] === 'exchange'): ?>
                    <span class="hp-product-type-badge" style="background:linear-gradient(135deg,#06b6d4,#3b82f6)">🔄 Trao đổi</span>
                  <?php endif; ?>
                </div>
                <div class="hp-product-body">
                  <div class="hp-product-cat"><?= htmlspecialchars($p['category_name'], ENT_QUOTES) ?></div>
                  <div class="hp-product-title"><?= htmlspecialchars($p['title'], ENT_QUOTES) ?></div>
                  <div class="hp-product-price">
                    <?php if ($p['type'] === 'auction'): ?>
                      <?= hp($p['current_price'] ?? $p['start_price']) ?>
                    <?php elseif ($p['type'] === 'sale'): ?>
                      <?= hp((int)$p['price']) ?>
                    <?php else: ?>
                      <span style="color:#06b6d4;font-size:.9rem">Trao đổi</span>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            </a>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</section>

<!-- ─── CTA BANNER ──────────────────────────────────────────────── -->
<?php if (!$user): ?>
<section class="hp-cta">
  <div class="hp-cta-blob-1"></div>
  <div class="hp-cta-blob-2"></div>
  <div class="container text-center" style="position:relative;z-index:2;padding:80px 0">
    <div class="hp-section-badge mb-3" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#e0e7ff">
      <i class="bi bi-rocket-takeoff-fill me-1"></i>BẮT ĐẦU MIỄN PHÍ
    </div>
    <h2 class="fw-900 text-white mb-3" style="font-size:clamp(1.8rem,4vw,2.8rem)">
      Sẵn sàng mua sắm thông minh?
    </h2>
    <p class="text-white mb-5" style="opacity:.75;max-width:480px;margin:0 auto 2rem;font-size:1.05rem;line-height:1.7">
      Đăng ký miễn phí, đăng bài trong 2 phút, tiết kiệm hàng trăm nghìn mỗi học kỳ.
    </p>
    <div class="d-flex gap-3 justify-content-center flex-wrap">
      <a href="<?= $appUrl ?>/register" class="hp-cta-btn-primary">
        <i class="bi bi-person-plus-fill me-2"></i>Tạo tài khoản ngay
      </a>
      <a href="<?= $appUrl ?>/products" class="hp-cta-btn-glass">
        <i class="bi bi-bag me-2"></i>Khám phá sản phẩm
      </a>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── Styles ────────────────────────────────────────────────────  -->
<style>
/* ── Hero ────────────────────────────────────────── */
.hp-hero {
  position: relative; min-height: 640px;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  overflow: hidden;
}
.hp-blob {
  position: absolute; border-radius: 50%;
  filter: blur(90px); opacity: .5;
  animation: blobFloat 12s ease-in-out infinite alternate;
}
.hp-blob-1 { width:600px;height:600px;background:#6366f1;top:-200px;left:-150px;animation-duration:14s; }
.hp-blob-2 { width:450px;height:450px;background:#ec4899;bottom:-180px;right:-100px;animation-duration:11s;animation-delay:-4s; }
.hp-blob-3 { width:300px;height:300px;background:#8b5cf6;top:40%;left:40%;animation-duration:9s;animation-delay:-7s; }
@keyframes blobFloat {
  from { transform: translate(0,0) scale(1); }
  to   { transform: translate(40px,30px) scale(1.12); }
}
.hp-particle {
  position: absolute; width:8px; height:8px;
  background: rgba(255,255,255,.35);
  border-radius: 50%;
  animation: particleFloat 6s ease-in-out infinite alternate;
}
@keyframes particleFloat {
  from { transform: translateY(0); opacity:.3; }
  to   { transform: translateY(-30px); opacity:.9; }
}
.hp-hero-content { position: relative; z-index: 2; }

.hp-hero-badge {
  display: inline-block;
  background: rgba(255,255,255,.12);
  backdrop-filter: blur(8px);
  color: #c4b5fd;
  padding: 6px 18px;
  border-radius: 50px;
  font-size: .83rem; font-weight: 700;
  border: 1px solid rgba(255,255,255,.2);
  letter-spacing: .4px;
}
.hp-hero-title {
  font-size: clamp(2.4rem,5.5vw,4rem);
  font-weight: 900; color: #fff; line-height: 1.1;
  letter-spacing: -1.5px; margin: 1rem 0 .8rem;
}
.hp-hero-gradient {
  background: linear-gradient(90deg, #a78bfa, #f472b6, #fb923c);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hp-hero-sub {
  font-size: 1.05rem; color: rgba(255,255,255,.75);
  line-height: 1.75; max-width: 500px;
}
.hp-btn-primary {
  display: inline-flex; align-items: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-weight: 800; font-size: 1rem;
  padding: .8rem 1.8rem; border-radius: 14px;
  border: none; box-shadow: 0 8px 28px rgba(99,102,241,.5);
  transition: all .25s; text-decoration: none;
  position: relative; overflow: hidden;
}
.hp-btn-primary::after {
  content:'';position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%);
  transform:translateX(-100%);transition:transform .5s;
}
.hp-btn-primary:hover { transform:translateY(-3px);box-shadow:0 14px 38px rgba(99,102,241,.6);color:#fff; }
.hp-btn-primary:hover::after { transform:translateX(100%); }
.hp-btn-glass {
  display: inline-flex; align-items: center;
  background: rgba(255,255,255,.12);
  backdrop-filter: blur(8px);
  color: #fff; font-weight: 700; font-size: 1rem;
  padding: .8rem 1.8rem; border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,.28);
  transition: all .25s; text-decoration: none;
}
.hp-btn-glass:hover { background:rgba(255,255,255,.22);color:#fff;transform:translateY(-2px); }

/* Stats */
.hp-stats {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 16px;
  padding: 16px 28px;
  margin-top: 2rem;
  display: inline-flex;
}
.hp-stat { text-align:center; padding:0 22px; }
.hp-stat-num { display:block;font-size:1.7rem;font-weight:900;color:#fff;line-height:1; }
.hp-stat-lbl { display:block;font-size:.75rem;color:rgba(255,255,255,.6);margin-top:4px; }
.hp-stat-divider { width:1px;height:40px;background:rgba(255,255,255,.2); }

/* Feature card */
.hp-feature-card {
  background: rgba(255,255,255,.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 24px;
  padding: 2rem;
  width: 100%; max-width: 380px;
  animation: cardFloat 5s ease-in-out infinite alternate;
}
@keyframes cardFloat {
  from { transform: translateY(0); }
  to   { transform: translateY(-12px); }
}
.hp-feature-row {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.hp-feature-row:last-child { border:none; padding-bottom:0; }
.hp-feat-icon {
  width:48px;height:48px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  font-size:1.3rem;color:#fff;flex-shrink:0;
}
.hp-feat-title { font-weight:700;color:#fff;font-size:.95rem; }
.hp-feat-desc  { font-size:.8rem;color:rgba(255,255,255,.55);margin-top:2px; }

/* ── Giveaway ────────────────────────────────────── */
.hp-giveaway {
  position:relative;overflow:hidden;
  background:linear-gradient(135deg,#0f0c29 0%,#302b63 40%,#1a055c 100%);
  padding:72px 0;
}
.hp-gw-blob-1 {
  position:absolute;width:450px;height:450px;
  background:radial-gradient(circle,rgba(139,92,246,.3) 0%,transparent 65%);
  border-radius:50%;top:-150px;right:-80px;pointer-events:none;
}
.hp-gw-blob-2 {
  position:absolute;width:350px;height:350px;
  background:radial-gradient(circle,rgba(236,72,153,.25) 0%,transparent 65%);
  border-radius:50%;bottom:-120px;left:-50px;pointer-events:none;
}
.hp-gw-img-wrap {
  position:relative;display:inline-block;
}
.hp-gw-img-wrap img {
  width:170px;height:170px;object-fit:cover;border-radius:22px;
  box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 3px rgba(251,191,36,.35);
}
.hp-gw-badge-top {
  position:absolute;top:-12px;right:-12px;
  width:36px;height:36px;
  background:linear-gradient(135deg,#f59e0b,#ef4444);
  border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;
}
.hp-gw-icon-placeholder {
  width:150px;height:150px;
  background:rgba(255,255,255,.07);border-radius:22px;
  display:flex;align-items:center;justify-content:center;
  font-size:4rem;color:rgba(255,255,255,.4);
}
.hp-gw-label {
  display:inline-block;
  background:rgba(251,191,36,.14);border:1px solid rgba(251,191,36,.3);
  color:#fbbf24;font-size:.78rem;font-weight:800;
  padding:.4rem 1rem;border-radius:50px;letter-spacing:.5px;
}
.hp-gw-time { font-size:.88rem;color:rgba(255,255,255,.55); }
.hp-gw-btn {
  display:inline-flex;align-items:center;
  background:linear-gradient(135deg,#f59e0b,#ef4444);
  color:#fff;font-weight:800;padding:.8rem 2rem;border-radius:14px;
  border:none;font-size:.95rem;
  box-shadow:0 8px 28px rgba(245,158,11,.45);
  transition:all .25s;text-decoration:none;cursor:pointer;font-family:inherit;
}
.hp-gw-btn:hover { transform:translateY(-3px);box-shadow:0 14px 36px rgba(245,158,11,.55);color:#fff; }
.hp-gw-btn-joined {
  display:inline-flex;align-items:center;
  background:rgba(16,185,129,.14);border:1.5px solid rgba(16,185,129,.4);
  color:#34d399;font-weight:800;padding:.8rem 2rem;border-radius:14px;
  font-size:.95rem;cursor:not-allowed;font-family:inherit;
}
.hp-gw-btn-join {
  display:inline-flex;align-items:center;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;font-weight:800;padding:.8rem 2rem;border-radius:14px;
  border:none;font-size:.95rem;
  box-shadow:0 8px 28px rgba(99,102,241,.45);
  transition:all .25s;cursor:pointer;font-family:inherit;
}
.hp-gw-btn-join:hover { transform:translateY(-3px);box-shadow:0 14px 36px rgba(99,102,241,.55); }

/* ── Section Badges ──────────────────────────────── */
.hp-section-badge {
  display:inline-block;
  background:rgba(99,102,241,.1);
  border:1px solid rgba(99,102,241,.2);
  color:#6366f1;font-size:.73rem;font-weight:800;
  padding:.35rem 1rem;border-radius:50px;letter-spacing:.6px;
}
.hp-link-all {
  display:flex;align-items:center;gap:.4rem;
  color:#6366f1;font-weight:700;font-size:.9rem;
  text-decoration:none;transition:gap .2s;
}
.hp-link-all:hover { gap:.7rem; }

/* ── Auction Card ────────────────────────────────── */
.hp-auction-card {
  background:var(--card-bg, #fff);border-radius:20px;
  border:1.5px solid var(--border, #e2e8f0);overflow:hidden;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s,background .3s,border-color .3s;
}
.hp-auction-card:hover { transform:translateY(-8px);box-shadow:0 20px 50px rgba(239,68,68,.18);border-color:#fca5a5; }
.hp-auction-img {
  height:200px;overflow:hidden;background:#fee2e2;position:relative;
}
.hp-auction-img img { width:100%;height:100%;object-fit:cover;transition:transform .4s; }
.hp-auction-card:hover .hp-auction-img img { transform:scale(1.06); }
.hp-auction-placeholder { display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;color:rgba(239,68,68,.2); }
.hp-auction-tag {
  position:absolute;top:12px;left:12px;
  background:linear-gradient(135deg,#dc2626,#ef4444);
  color:#fff;font-size:.72rem;font-weight:700;padding:.3rem .75rem;border-radius:50px;
  animation:badgePulse 1.5s ease-in-out infinite;
}
.hp-auction-overlay {
  position:absolute;inset:0;
  background:linear-gradient(to top,rgba(0,0,0,.55) 0%,transparent 55%);
  opacity:0;transition:opacity .3s;
}
.hp-auction-card:hover .hp-auction-overlay { opacity:1; }
.hp-auction-body { padding:1rem 1.1rem; }
.hp-auction-cat { font-size:.75rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:.35rem; }
.hp-auction-title {
  font-weight:700;font-size:.95rem;color:var(--text, #0f172a);line-height:1.35;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
.hp-auction-price { font-size:1.4rem;font-weight:900;color:#ef4444; }
.hp-auction-orig  { font-size:.77rem;color:#94a3b8; }
.hp-auction-down  { display:flex;flex-direction:column;align-items:center;gap:2px;color:#ef4444;font-size:.78rem;font-weight:700; }
.hp-auction-down i { font-size:1.4rem;animation:bounceDown .8s ease-in-out infinite alternate; }
@keyframes bounceDown {
  from { transform:translateY(0); }
  to   { transform:translateY(5px); }
}
@keyframes badgePulse {
  0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4);}
  50%{box-shadow:0 0 0 6px rgba(239,68,68,0);}
}

/* ── Category Card ───────────────────────────────── */
.hp-cat-card {
  background:var(--card-bg, #fff);border-radius:20px;
  border:1.5px solid var(--border, #e2e8f0);padding:1.5rem 1rem;
  text-align:center;
  transition:all .32s cubic-bezier(.34,1.56,.64,1),background .3s;
  cursor:pointer;
}
.hp-cat-card:hover {
  transform:translateY(-7px) scale(1.03);
  border-color:transparent;
  box-shadow:0 18px 42px var(--cat-shadow, rgba(99,102,241,.35));
}
.hp-cat-all:hover { box-shadow:0 12px 32px rgba(100,116,139,.2) !important; }
.hp-cat-icon {
  width:58px;height:58px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 12px;font-size:1.5rem;color:#fff;
}
.hp-cat-name { font-size:.82rem;font-weight:700;color:var(--dark-3, #334155);line-height:1.3; }

/* ── Product Card ────────────────────────────────── */
.hp-product-card {
  background:var(--card-bg, #fff);border-radius:18px;
  border:1.5px solid var(--border, #e2e8f0);overflow:hidden;
  transition:transform .32s cubic-bezier(.34,1.56,.64,1),box-shadow .28s,background .3s,border-color .3s;
}
.hp-product-card:hover { transform:translateY(-7px);box-shadow:0 18px 42px rgba(99,102,241,.14);border-color:#c7d2fe; }
.hp-product-img { height:160px;background:#f8fafc;position:relative;overflow:hidden; }
.hp-product-img img { width:100%;height:100%;object-fit:cover;transition:transform .4s; }
.hp-product-card:hover .hp-product-img img { transform:scale(1.07); }
.hp-product-placeholder { display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;color:rgba(100,116,139,.2); }
.hp-product-type-badge {
  position:absolute;top:8px;left:8px;
  color:#fff;font-size:.68rem;font-weight:800;padding:.25rem .65rem;border-radius:50px;
}
.hp-product-body { padding:.85rem; }
.hp-product-cat { font-size:.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:.3rem; }
.hp-product-title {
  font-size:.88rem;font-weight:700;color:var(--text, #0f172a);line-height:1.35;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  margin-bottom:.5rem;
}
.hp-product-price { font-size:.95rem;font-weight:900;color:#6366f1; }

/* ── Empty state ─────────────────────────────────── */
.hp-empty-icon {
  width:80px;height:80px;background:#e0e7ff;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  margin:0 auto;font-size:2.2rem;color:#6366f1;
}

/* ── CTA Banner ──────────────────────────────────── */
.hp-cta {
  position:relative;overflow:hidden;
  background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 50%,#7c3aed 100%);
}
.hp-cta-blob-1 {
  position:absolute;width:500px;height:500px;
  background:radial-gradient(circle,rgba(99,102,241,.4) 0%,transparent 65%);
  border-radius:50%;top:-200px;left:-100px;pointer-events:none;
}
.hp-cta-blob-2 {
  position:absolute;width:400px;height:400px;
  background:radial-gradient(circle,rgba(236,72,153,.3) 0%,transparent 65%);
  border-radius:50%;bottom:-180px;right:-80px;pointer-events:none;
}
.hp-cta-btn-primary {
  display:inline-flex;align-items:center;
  background:#fff;color:#4f46e5;font-weight:800;
  padding:.85rem 2rem;border-radius:14px;font-size:1rem;
  box-shadow:0 8px 28px rgba(0,0,0,.2);
  transition:all .25s;text-decoration:none;
}
.hp-cta-btn-primary:hover { transform:translateY(-3px);box-shadow:0 14px 38px rgba(0,0,0,.28);color:#4f46e5; }
.hp-cta-btn-glass {
  display:inline-flex;align-items:center;
  background:rgba(255,255,255,.12);
  backdrop-filter:blur(8px);
  color:#fff;font-weight:700;
  padding:.85rem 2rem;border-radius:14px;font-size:1rem;
  border:1.5px solid rgba(255,255,255,.28);
  transition:all .25s;text-decoration:none;
}
.hp-cta-btn-glass:hover { background:rgba(255,255,255,.22);color:#fff;transform:translateY(-2px); }

/* ── Dark Mode overrides ───────────────────────────── */
.hp-category-section {
  background: linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);
  transition: background .3s;
}
[data-theme="dark"] .hp-category-section {
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
}
[data-theme="dark"] .hp-cat-icon[style*="background:#f1f5f9"] {
  background: #334155 !important;
}
[data-theme="dark"] .hp-auction-img { background: #1e293b; }
[data-theme="dark"] .hp-product-img { background: #1e293b; }
[data-theme="dark"] .hp-auction-cat,
[data-theme="dark"] .hp-product-cat { color: #64748b; }
[data-theme="dark"] .hp-auction-orig { color: #64748b; }
[data-theme="dark"] .hp-cat-name[style] { color: var(--muted) !important; }
</style>
