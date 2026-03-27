<?php
/**
 * Notifications View — Trang xem tất cả thông báo
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');

$typeIcons = [
    'product_approved' => ['icon' => 'bi-check-circle-fill', 'color' => '#22c55e'],
    'product_rejected' => ['icon' => 'bi-x-circle-fill',     'color' => '#ef4444'],
    'item_sold'        => ['icon' => 'bi-bag-check-fill',     'color' => '#8b5cf6'],
    'wishlist_drop'    => ['icon' => 'bi-graph-down-arrow',   'color' => '#f59e0b'],
    'new_message'      => ['icon' => 'bi-chat-dots-fill',     'color' => '#3b82f6'],
];
?>

<style>
.notif-page { max-width:720px; margin:2rem auto; padding:0 1rem; }
.notif-page-title { font-size:1.5rem; font-weight:800; margin-bottom:1.5rem; }
.notif-card { background:#fff; border-radius:14px; border:1.5px solid #e8ecf0; padding:16px 20px;
              display:flex; gap:14px; align-items:flex-start; transition:.2s; margin-bottom:10px; text-decoration:none; color:inherit; }
.notif-card:hover { border-color:#4f46e5; box-shadow:0 4px 16px rgba(79,70,229,.1); }
.notif-card.unread { background:linear-gradient(135deg,rgba(79,70,229,.04),rgba(139,92,246,.04)); }
.notif-icon { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; }
.notif-content { flex:1; min-width:0; }
.notif-title { font-weight:700; font-size:.9rem; margin-bottom:2px; }
.notif-body { font-size:.8rem; color:#6b7280; }
.notif-time { font-size:.72rem; color:#9ca3af; margin-top:4px; }
.notif-dot { width:8px; height:8px; border-radius:50%; background:#4f46e5; flex-shrink:0; margin-top:8px; }
.empty-notif { text-align:center; padding:4rem 1rem; color:#9ca3af; }
</style>

<div class="notif-page">
  <div class="notif-page-title">
    <i class="bi bi-bell me-2 text-primary"></i>Thông báo của tôi
  </div>

  <?php if (empty($notifications)): ?>
    <div class="empty-notif">
      <i class="bi bi-bell-slash fs-1 d-block mb-3 opacity-30"></i>
      <div class="fw-600" style="font-size:1.1rem">Chưa có thông báo nào</div>
      <div style="font-size:.875rem">Khi có cập nhật, chúng sẽ xuất hiện ở đây.</div>
    </div>
  <?php else: ?>
    <?php foreach ($notifications as $n): ?>
      <?php
        $meta  = $typeIcons[$n['type']] ?? ['icon' => 'bi-bell-fill', 'color' => '#6b7280'];
        $target = $n['link'] ? htmlspecialchars($n['link'], ENT_QUOTES) : '#';
      ?>
      <a href="<?= $target ?>"
         class="notif-card <?= !$n['is_read'] ? 'unread' : '' ?>">
        <div class="notif-icon" style="background:<?= $meta['color'] ?>22">
          <i class="<?= $meta['icon'] ?>" style="color:<?= $meta['color'] ?>"></i>
        </div>
        <div class="notif-content">
          <div class="notif-title"><?= htmlspecialchars($n['title'], ENT_QUOTES) ?></div>
          <?php if ($n['body']): ?>
            <div class="notif-body"><?= htmlspecialchars($n['body'], ENT_QUOTES) ?></div>
          <?php endif; ?>
          <div class="notif-time">
            <i class="bi bi-clock me-1"></i>
            <?php
              $diff = time() - strtotime($n['created_at']);
              if ($diff < 60)      echo 'Vừa xong';
              elseif ($diff < 3600) echo floor($diff/60) . ' phút trước';
              elseif ($diff < 86400) echo floor($diff/3600) . ' giờ trước';
              else echo date('d/m/Y H:i', strtotime($n['created_at']));
            ?>
          </div>
        </div>
        <?php if (!$n['is_read']): ?>
          <div class="notif-dot"></div>
        <?php endif; ?>
      </a>
    <?php endforeach; ?>
  <?php endif; ?>
</div>
