<?php
/**
 * Admin View: Quản lý Báo cáo / Tố cáo vi phạm
 * Biến: $reports, $status
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');

$pendingCount = 0;
foreach ($reports as $r) {
    if ($r['status'] === 'pending') $pendingCount++;
}
?>

<div class="container-fluid py-4">
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-700 mb-0"><i class="bi bi-shield-exclamation text-danger me-2"></i>Tố cáo vi phạm</h4>
    <div>
      <a href="<?= $appUrl ?>/admin/system-reports" class="btn btn-sm <?= $status === '' ? 'btn-dark' : 'btn-outline-dark' ?> rounded-pill px-3">Tất cả</a>
      <a href="<?= $appUrl ?>/admin/system-reports?status=pending" class="btn btn-sm <?= $status === 'pending' ? 'btn-warning' : 'btn-outline-warning' ?> rounded-pill px-3 position-relative">
        Chưa xử lý
        <?php if ($pendingCount > 0): ?>
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.6rem;">
            <?= $pendingCount ?>
          </span>
        <?php endif; ?>
      </a>
      <a href="<?= $appUrl ?>/admin/system-reports?status=resolved" class="btn btn-sm <?= $status === 'resolved' ? 'btn-success' : 'btn-outline-success' ?> rounded-pill px-3">Đã giải quyết</a>
      <a href="<?= $appUrl ?>/admin/system-reports?status=ignored" class="btn btn-sm <?= $status === 'ignored' ? 'btn-secondary' : 'btn-outline-secondary' ?> rounded-pill px-3">Bỏ qua</a>
    </div>
  </div>

  <div class="card-sv">
    <?php if (empty($reports)): ?>
      <div class="p-5 text-center text-muted">
        <i class="bi bi-check-circle text-success fs-1 mb-3 d-block"></i>
        Tuyệt vời! Không có báo cáo vi phạm nào cần xử lý.
      </div>
    <?php else: ?>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th width="3%">#</th>
              <th width="15%">Người tố cáo</th>
              <th width="20%">Đối tượng bị Tố cáo</th>
              <th width="25%">Nội dung vi phạm</th>
              <th width="12%">Trạng thái</th>
              <th width="10%">Ngày tạo</th>
              <th width="15%" class="text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($reports as $i => $r): ?>
              <tr>
                <td class="small text-muted"><?= $r['id'] ?></td>
                <td>
                  <a href="<?= $appUrl ?>/admin/user-detail?id=<?= $r['reporter_id'] ?>" class="text-dark fw-600 text-decoration-none">
                    <?= htmlspecialchars($r['reporter_name'], ENT_QUOTES) ?>
                  </a>
                </td>
                <td>
                  <?php if ($r['target_user_id']): ?>
                    <span class="badge bg-light text-dark border me-1"><i class="bi bi-person me-1"></i>User</span>
                    <a href="<?= $appUrl ?>/admin/user-detail?id=<?= $r['target_user_id'] ?>" class="text-primary fw-600 text-decoration-none">
                      <?= htmlspecialchars($r['target_name'] ?? '', ENT_QUOTES) ?>
                    </a>
                  <?php endif; ?>
                  
                  <?php if ($r['product_id']): ?>
                    <div class="mt-1">
                      <span class="badge bg-light text-dark border me-1"><i class="bi bi-box me-1"></i>Sản phẩm</span>
                      <a href="<?= $appUrl ?>/products/show?id=<?= $r['product_id'] ?>" class="text-info text-decoration-none small" title="<?= htmlspecialchars($r['product_title'] ?? '', ENT_QUOTES) ?>">
                        #<?= $r['product_id'] ?> (Xem)
                      </a>
                    </div>
                  <?php endif; ?>
                </td>
                <td>
                  <div class="fw-bold text-danger small"><?= htmlspecialchars($r['reason'], ENT_QUOTES) ?></div>
                  <div class="small text-muted mt-1" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:0.8rem">
                    <?= nl2br(htmlspecialchars($r['description'], ENT_QUOTES)) ?>
                  </div>
                  <?php if ($r['admin_note']): ?>
                    <div class="mt-2 text-primary small p-1 bg-light rounded"><i class="bi bi-info-circle me-1"></i> Ghi chú: <?= htmlspecialchars($r['admin_note']) ?></div>
                  <?php endif; ?>
                </td>
                <td>
                  <?php if ($r['status'] === 'pending'): ?>
                    <span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Chờ xử lý</span>
                  <?php elseif ($r['status'] === 'resolved'): ?>
                    <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Đã xử lý</span>
                  <?php else: ?>
                    <span class="badge bg-secondary"><i class="bi bi-x-circle me-1"></i>Bỏ qua</span>
                  <?php endif; ?>
                </td>
                <td class="small text-muted">
                  <?= date('d/m/Y H:i', strtotime($r['created_at'])) ?>
                </td>
                <td class="text-end">
                  <?php if ($r['status'] === 'pending'): ?>
                    <button class="btn btn-sm btn-outline-success fw-bold" data-bs-toggle="modal" data-bs-target="#resolveModal<?= $r['id'] ?>" title="Xử lý">
                      <i class="bi bi-check2-all"></i>
                    </button>
                    <form action="<?= $appUrl ?>/admin/system-reports/resolve" method="POST" class="d-inline">
                      <input type="hidden" name="id" value="<?= $r['id'] ?>">
                      <input type="hidden" name="status" value="ignored">
                      <button type="submit" class="btn btn-sm btn-outline-secondary" onclick="return confirm('Bạn chắc chắn muốn bỏ qua tố cáo này chứ?');" title="Bỏ qua">
                        <i class="bi bi-x"></i>
                      </button>
                    </form>
                  <?php else: ?>
                    <button class="btn btn-sm btn-light text-muted disabled"><i class="bi bi-check"></i> Đã đóng</button>
                  <?php endif; ?>
                </td>
              </tr>



            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</div>

<!-- Modals Xử lý Report -->
<?php if (!empty($reports)): ?>
  <?php foreach ($reports as $r): ?>
    <?php if ($r['status'] === 'pending'): ?>
    <div class="modal fade" id="resolveModal<?= $r['id'] ?>" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold text-success"><i class="bi bi-check-circle-fill me-2"></i>Xử lý Tố cáo #<?= $r['id'] ?></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <form action="<?= $appUrl ?>/admin/system-reports/resolve" method="POST">
            <div class="modal-body p-4 pt-3">
              <input type="hidden" name="id" value="<?= $r['id'] ?>">
              <input type="hidden" name="status" value="resolved">
              
              <p class="text-muted small mb-3">Tố cáo này sẽ được đánh dấu là <strong>Đã xử lý</strong>. Bạn có thể để lại chú thích bên dưới để tham khảo về sau khi cần.</p>
              
              <div class="mb-0">
                <label class="form-label fw-semibold">Ghi chú xử lý (Tùy chọn)</label>
                <textarea name="admin_note" class="form-control" rows="3" placeholder="Ví dụ: Đã xóa bài đăng và cảnh cáo User via Email..."></textarea>
              </div>
            </div>
            <div class="modal-footer border-top-0 bg-light rounded-bottom-4">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Hủy</button>
              <button type="submit" class="btn btn-success px-4 fw-bold">Xác nhận Đã Xử Lý</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <?php endif; ?>
  <?php endforeach; ?>
<?php endif; ?>
