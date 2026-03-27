<?php
/**
 * Admin View: Quản lý danh mục (CRUD)
 * Biến: $categories
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
use Core\Flash;

// Danh sách icon Bootstrap phổ biến cho dropdown
$icons = [
  'bi-book' => '📖 Sách / Giáo trình',
  'bi-laptop' => '💻 Điện tử',
  'bi-bicycle' => '🚲 Phương tiện',
  'bi-backpack' => '🎒 Đồ dùng học tập',
  'bi-house' => '🏠 Đồ gia dụng',
  'bi-music-note' => '🎵 Nhạc cụ',
  'bi-brush' => '🎨 Dụng cụ nghệ thuật',
  'bi-controller' => '🎮 Giải trí',
  'bi-bag' => '👜 Thời trang',
  'bi-box-seam' => '📦 Khác',
];
?>
<div class="container-fluid py-4">
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-700 mb-0"><i class="bi bi-tags me-2 text-info"></i>Quản lý danh mục</h4>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addModal">
      <i class="bi bi-plus-lg me-1"></i>Thêm danh mục
    </button>
  </div>

  <?= Flash::render() ?>

  <div class="card-sv">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Icon</th>
            <th>Tên danh mục</th>
            <th>Slug</th>
            <th>Ngày tạo</th>
            <th style="width:180px">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($categories as $i => $cat): ?>
            <tr>
              <td class="small text-muted"><?= $i + 1 ?></td>
              <td>
                <i class="bi <?= htmlspecialchars($cat['icon'] ?? 'bi-tag', ENT_QUOTES) ?> fs-4 text-primary"></i>
              </td>
              <td class="fw-600"><?= htmlspecialchars($cat['name'], ENT_QUOTES) ?></td>
              <td><code><?= htmlspecialchars($cat['slug'], ENT_QUOTES) ?></code></td>
              <td class="small text-muted"><?= date('d/m/Y', strtotime($cat['created_at'])) ?></td>
              <td>
                <div class="d-flex gap-1">
                  <!-- Sửa -->
                  <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal"
                          data-bs-target="#editModal<?= $cat['id'] ?>">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <!-- Xóa -->
                  <form method="POST" action="<?= $appUrl ?>/admin/categories/delete"
                        onsubmit="return confirm('Xóa danh mục «<?= htmlspecialchars($cat['name'], ENT_QUOTES) ?>»?\nDanh mục có sản phẩm sẽ không xóa được.')">
                    <input type="hidden" name="_csrf"        value="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">
                    <input type="hidden" name="category_id"  value="<?= $cat['id'] ?>">
                    <button class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                  </form>
                </div>
              </td>
            </tr>


          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Thêm mới -->
<div class="modal fade" id="addModal" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title"><i class="bi bi-plus-circle me-2"></i>Thêm danh mục mới</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <form method="POST" action="<?= $appUrl ?>/admin/categories/store">
      <input type="hidden" name="_csrf" value="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Tên danh mục <span class="text-danger">*</span></label>
          <input type="text" name="name" class="form-control" required placeholder="VD: Giáo trình">
        </div>
        <div class="mb-3">
          <label class="form-label">Icon Bootstrap</label>
          <select name="icon" class="form-select">
            <?php foreach ($icons as $cls => $label): ?>
              <option value="<?= $cls ?>"><?= $label ?> (<?= $cls ?>)</option>
            <?php endforeach; ?>
          </select>
          <div class="form-text">Xem thêm tại <a href="https://icons.getbootstrap.com" target="_blank">icons.getbootstrap.com</a></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
        <button type="submit" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Tạo danh mục</button>
      </div>
    </form>
    </form>
  </div></div>
</div>

<!-- Modals Sửa danh mục -->
<?php if (!empty($categories)): ?>
  <?php foreach ($categories as $cat): ?>
    <div class="modal fade" id="editModal<?= $cat['id'] ?>" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content border-0 rounded-4">
        <div class="modal-header border-bottom-0 pb-0"><h5 class="modal-title fw-bold text-primary">Sửa danh mục</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <form method="POST" action="<?= $appUrl ?>/admin/categories/update">
          <input type="hidden" name="_csrf"        value="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">
          <input type="hidden" name="category_id"  value="<?= $cat['id'] ?>">
          <div class="modal-body p-4 pt-3">
            <div class="mb-3">
              <label class="form-label fw-bold">Tên danh mục</label>
              <input type="text" name="name" class="form-control" required
                     value="<?= htmlspecialchars($cat['name'], ENT_QUOTES) ?>">
            </div>
            <div class="mb-0">
              <label class="form-label fw-bold">Icon Bootstrap</label>
              <select name="icon" class="form-select">
                <?php foreach ($icons as $cls => $label): ?>
                  <option value="<?= $cls ?>" <?= $cat['icon'] === $cls ? 'selected' : '' ?>>
                    <?= $label ?> (<?= $cls ?>)
                  </option>
                <?php endforeach; ?>
              </select>
            </div>
          </div>
          <div class="modal-footer border-top-0 bg-light rounded-bottom-4">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Hủy</button>
            <button type="submit" class="btn btn-primary px-4 fw-bold">Lưu thay đổi</button>
          </div>
        </form>
      </div></div>
    </div>
  <?php endforeach; ?>
<?php endif; ?>
