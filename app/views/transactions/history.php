<?php
/**
 * View: Lịch sử giao dịch
 * Biến nhận: $transactions
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
$user   = $_SESSION['user'];

$typeLabel = [
    'auction' => ['⚡ Đấu giá', 'danger'],
    'direct'  => ['💰 Bán thường', 'primary'],
];
?>

<div class="container py-4">
  <h4 class="section-title mb-4"><i class="bi bi-receipt me-2 text-primary"></i>Lịch sử giao dịch</h4>

  <?php if (empty($transactions)): ?>
    <div class="empty-state text-center py-5">
      <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/receipt.svg"
           width="80" alt="" class="mb-3 opacity-25">
      <h5 class="text-muted">Chưa có giao dịch nào</h5>
      <p class="text-muted small">Giao dịch sẽ xuất hiện ở đây sau khi bạn mua hoặc bán thành công.</p>
      <a href="<?= $appUrl ?>/products" class="btn btn-primary mt-2">
        <i class="bi bi-bag me-1"></i>Xem sản phẩm
      </a>
    </div>

  <?php else: ?>
    <!-- Tổng kết nhanh -->
    <?php
      $totalBuy  = array_filter($transactions, fn($t) => (int)$t['buyer_id']  === (int)$user['id']);
      $totalSell = array_filter($transactions, fn($t) => (int)$t['seller_id'] === (int)$user['id']);
      $sumBuy    = array_sum(array_column(iterator_to_array((function() use ($totalBuy) { yield from $totalBuy; })()), 'amount'));
      $sumSell   = array_sum(array_column(iterator_to_array((function() use ($totalSell) { yield from $totalSell; })()), 'amount'));
    ?>
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-md-3">
        <div class="card-sv p-3 text-center">
          <div class="text-muted small">Tổng giao dịch</div>
          <div class="fw-800 fs-4"><?= count($transactions) ?></div>
        </div>
      </div>
      <div class="col-sm-6 col-md-3">
        <div class="card-sv p-3 text-center">
          <div class="text-muted small">Đã mua</div>
          <div class="fw-800 fs-4 text-danger"><?= count($totalBuy) ?></div>
        </div>
      </div>
      <div class="col-sm-6 col-md-3">
        <div class="card-sv p-3 text-center">
          <div class="text-muted small">Đã bán</div>
          <div class="fw-800 fs-4 text-success"><?= count($totalSell) ?></div>
        </div>
      </div>
      <div class="col-sm-6 col-md-3">
        <div class="card-sv p-3 text-center">
          <div class="text-muted small">Doanh thu bán</div>
          <div class="fw-800 fs-5 text-success"><?= number_format($sumSell, 0, ',', '.') ?>đ</div>
        </div>
      </div>
    </div>

    <!-- Bảng lịch sử -->
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th width="25%">Sản phẩm</th>
            <th width="15%">Vai trò</th>
            <th width="20%">Trạng thái Đơn hàng & TT</th>
            <th width="15%" class="text-end">Số tiền</th>
            <th width="25%">Ngày & Hành động</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($transactions as $t): ?>
            <?php
              $isBuyer  = (int)$t['buyer_id'] === (int)$user['id'];
              [$typeText, $typeBadge] = $typeLabel[$t['type']] ?? ['?', 'secondary'];
            ?>
            <tr>
              <!-- Sản phẩm -->
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div style="width:44px;height:44px;flex-shrink:0;border-radius:8px;overflow:hidden;background:#f1f3f9">
                    <?php if ($t['product_image']): ?>
                      <img src="<?= $appUrl ?>/public/uploads/<?= htmlspecialchars($t['product_image'], ENT_QUOTES) ?>"
                           style="width:100%;height:100%;object-fit:cover">
                    <?php else: ?>
                      <div class="d-flex align-items-center justify-content-center h-100">
                        <i class="bi bi-image text-muted"></i>
                      </div>
                    <?php endif; ?>
                  </div>
                  <span class="fw-600" style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">
                    <?= htmlspecialchars($t['product_title'], ENT_QUOTES) ?>
                  </span>
                </div>
              </td>

              <!-- Loại GD & Vai trò -->
              <td>
                <div class="mb-1"><span class="badge bg-<?= $typeBadge ?>"><?= $typeText ?></span></div>
                <?php if ($isBuyer): ?>
                  <span class="badge bg-primary"><i class="bi bi-bag me-1"></i>Người mua</span>
                <?php else: ?>
                  <span class="badge bg-success"><i class="bi bi-shop me-1"></i>Người bán</span>
                <?php endif; ?>
                <div class="small text-muted mt-1">
                  Đối tác: 
                  <?php if ($isBuyer): ?>
                    <?= htmlspecialchars($t['seller_name'], ENT_QUOTES) ?>
                  <?php else: ?>
                    <?= htmlspecialchars($t['buyer_name'], ENT_QUOTES) ?>
                  <?php endif; ?>
                </div>
              </td>

              <!-- Trạng thái -->
              <td>
                <div class="small fw-600 mb-2">
                  <?php
                    if ($t['payment_method'] === 'cod') echo '<i class="bi bi-cash text-success me-1"></i>COD';
                    elseif ($t['payment_method'] === 'banking') echo '<i class="bi bi-bank text-primary me-1"></i>Chuyển khoản';
                    elseif ($t['payment_method'] === 'zalopay') echo '<i class="bi bi-wallet2 text-info me-1"></i>ZaloPay';
                    else echo 'N/A';
                  ?>
                  <?php if ($t['payment_status'] === 'paid'): ?>
                    | <span class="text-success small"><i class="bi bi-check-circle me-1"></i>Đã TT</span>
                  <?php else: ?>
                    | <span class="text-warning small"><i class="bi bi-clock me-1"></i>Chờ TT</span>
                  <?php endif; ?>
                </div>
                
                <?php 
                  $os = $t['order_status'] ?? 'pending';
                  $osTheme = 'secondary';
                  $osText = 'Chờ xác nhận';
                  if ($os === 'shipping') { $osTheme = 'info'; $osText = 'Đang giao hàng'; }
                  elseif ($os === 'delivered') { $osTheme = 'primary'; $osText = 'Đã giao đến nơi'; }
                  elseif ($os === 'received' || $os === 'completed') { $osTheme = 'success'; $osText = 'Hoàn tất'; }
                  elseif ($os === 'cancelled') { $osTheme = 'danger'; $osText = 'Đã hủy'; }
                ?>
                <span class="badge bg-<?= $osTheme ?>-subtle text-<?= $osTheme ?> border border-<?= $osTheme ?>-subtle px-2 py-1">
                  <i class="bi bi-box-seam me-1"></i><?= $osText ?>
                </span>
              </td>

              <!-- Số tiền -->
              <td class="text-end fw-700 text-nowrap">
                <?php if ($isBuyer): ?>
                  <span class="text-danger">−<?= number_format($t['amount'], 0, ',', '.') ?>đ</span>
                <?php else: ?>
                  <span class="text-success">+<?= number_format($t['amount'], 0, ',', '.') ?>đ</span>
                <?php endif; ?>
              </td>

              <!-- Ngày & Hành động -->
              <td class="small text-muted">
                <div class="mb-1"><i class="bi bi-clock me-1"></i><?= date('d/m/Y H:i', strtotime($t['created_at'])) ?></div>
                <div class="text-truncate mb-2" style="max-width: 220px;" title="<?= htmlspecialchars($t['shipping_address'] ?? 'Không có', ENT_QUOTES) ?>">
                  <i class="bi bi-geo-alt me-1"></i><?= htmlspecialchars($t['shipping_address'] ?? 'Không có địa chỉ', ENT_QUOTES) ?>
                </div>

                <!-- Action buttons -->
                <?php if ($os !== 'completed' && $os !== 'received' && $os !== 'cancelled'): ?>
                  <form action="<?= $appUrl ?>/transactions/update-status" method="POST" class="mt-2 text-start">
                    <input type="hidden" name="id" value="<?= $t['id'] ?>">
                    
                    <?php if (!$isBuyer): // Seller actions ?>
                      <?php if ($os === 'pending'): ?>
                        <input type="hidden" name="status" value="shipping">
                        <button type="submit" class="btn btn-sm btn-info text-white rounded-pill px-3 shadow-sm" onclick="return confirm('Xác nhận bạn đã đóng gói và bắt đầu giao hàng?');">
                          <i class="bi bi-truck me-1"></i>Gửi hàng
                        </button>
                      <?php elseif ($os === 'shipping'): ?>
                        <input type="hidden" name="status" value="delivered">
                        <button type="submit" class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm">
                          <i class="bi bi-geo me-1"></i>Đã đến nơi
                        </button>
                      <?php endif; ?>
                    <?php else: // Buyer actions ?>
                      <?php if ($os === 'shipping' || $os === 'delivered'): ?>
                        <input type="hidden" name="status" value="completed">
                        <button type="submit" class="btn btn-sm btn-success rounded-pill px-3 shadow-sm fw-bold" onclick="return confirm('Xác nhận bạn đã nhận được hàng và hàng đúng mô tả?');">
                          <i class="bi bi-check-circle-fill me-1"></i>Đã nhận hàng
                        </button>
                      <?php endif; ?>
                    <?php endif; ?>
                  </form>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</div>
