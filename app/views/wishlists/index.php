<?php
/**
 * Wishlist Index View — Danh sách sản phẩm yêu thích
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
?>
<div class="container py-4">
  <h1 class="fw-800 mb-4" style="font-size:1.5rem"><i class="bi bi-heart-fill text-danger me-2"></i>Danh sách yêu thích</h1>

  <?php if (empty($products)): ?>
    <div class="text-center py-5 text-muted">
      <i class="bi bi-heart fs-1 d-block mb-3 opacity-25"></i>
      <div class="fw-600" style="font-size:1.1rem">Chưa có sản phẩm yêu thích</div>
      <a href="<?= $appUrl ?>/products" class="btn btn-primary mt-3 rounded-pill px-4">Khám phá sản phẩm</a>
    </div>
  <?php else: ?>
    <div class="row g-3">
      <?php foreach ($products as $p): ?>
        <div class="col-md-4 col-sm-6">
          <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
            <?php if ($p['image']): ?>
              <img src="<?= $appUrl ?>/public/uploads/<?= htmlspecialchars($p['image'], ENT_QUOTES) ?>"
                   class="card-img-top" style="height:180px;object-fit:cover"
                   alt="<?= htmlspecialchars($p['title'], ENT_QUOTES) ?>">
            <?php else: ?>
              <div class="bg-light d-flex align-items-center justify-content-center" style="height:180px">
                <i class="bi bi-image text-muted" style="font-size:2rem"></i>
              </div>
            <?php endif; ?>
            <div class="card-body">
              <span class="badge bg-secondary mb-2"><?= htmlspecialchars($p['category_name'], ENT_QUOTES) ?></span>
              <h5 class="card-title fw-700" style="font-size:.95rem">
                <a href="<?= $appUrl ?>/products/show?id=<?= $p['product_id'] ?>" class="text-decoration-none text-dark">
                  <?= htmlspecialchars($p['title'], ENT_QUOTES) ?>
                </a>
              </h5>
              <div class="fw-700 text-primary">
                <?php if ($p['type'] === 'auction'): ?>
                  <i class="bi bi-graph-down-arrow me-1"></i>
                  <?= number_format($p['current_price'] ?? 0, 0, ',', '.') ?>đ <small class="text-muted fw-normal">(hiện tại)</small>
                <?php else: ?>
                  <?= number_format($p['current_price'], 0, ',', '.') ?>đ
                <?php endif; ?>
              </div>
              <div class="text-muted mt-1" style="font-size:.78rem">
                <i class="bi bi-person me-1"></i><?= htmlspecialchars($p['seller_name'], ENT_QUOTES) ?>
              </div>
            </div>
            <div class="card-footer border-0 bg-transparent pb-3 d-flex gap-2">
              <a href="<?= $appUrl ?>/products/show?id=<?= $p['product_id'] ?>"
                 class="btn btn-primary btn-sm rounded-pill flex-fill">Xem chi tiết</a>
              <button class="btn btn-outline-danger btn-sm rounded-pill wishlist-remove-btn"
                      data-id="<?= $p['product_id'] ?>"
                      data-csrf="<?= htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES) ?>"
                      title="Xóa khỏi yêu thích">
                <i class="bi bi-heart-fill"></i>
              </button>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>

<script>
document.querySelectorAll('.wishlist-remove-btn').forEach(btn => {
  btn.addEventListener('click', async function() {
    const productId = this.dataset.id;
    const csrf = this.dataset.csrf;
    const card = this.closest('.col-md-4');
    const res = await fetch('<?= $appUrl ?>/wishlist/toggle', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `product_id=${productId}&_csrf=${csrf}`
    });
    const data = await res.json();
    if (data.success) card.remove();
  });
});
</script>
