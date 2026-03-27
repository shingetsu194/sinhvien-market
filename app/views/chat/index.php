<?php
/**
 * Chat View — Danh sách hội thoại + Khung chat
 * Layout: main.php
 */
$appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
$me     = $_SESSION['user'] ?? [];
?>

<style>
.chat-wrap { display:flex; height:calc(100vh - 130px); background:#f8f9fa; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
.chat-sidebar { width:320px; border-right:1px solid #e8ecf0; background:#fff; overflow-y:auto; flex-shrink:0; }
.chat-sidebar-header { padding:16px 20px; font-weight:700; font-size:1rem; border-bottom:1px solid #e8ecf0; background:#fff; position:sticky; top:0; z-index:1; }
.conv-item { padding:14px 18px; border-bottom:1px solid #f0f2f5; cursor:pointer; transition:.15s; display:flex; gap:12px; align-items:center; text-decoration:none; color:inherit; }
.conv-item:hover, .conv-item.active { background:linear-gradient(135deg,rgba(79,70,229,.06),rgba(139,92,246,.06)); }
.conv-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1.1rem; flex-shrink:0; }
.conv-info { flex:1; min-width:0; }
.conv-name { font-weight:600; font-size:.875rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.conv-last-msg { font-size:.78rem; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.conv-badge { background:#ef4444; color:#fff; border-radius:50px; font-size:.7rem; padding:2px 7px; font-weight:700; flex-shrink:0; }

/* Chat box */
.chat-box { flex:1; display:flex; flex-direction:column; min-width:0; }
.chat-box-header { padding:14px 20px; border-bottom:1px solid #e8ecf0; background:#fff; display:flex; align-items:center; gap:12px; }
.chat-messages { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; }
.chat-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af; }
.msg-bubble { max-width:68%; padding:10px 15px; border-radius:18px; font-size:.875rem; line-height:1.5; position:relative; word-break:break-word; }
.msg-bubble.me { background:linear-gradient(135deg,#4f46e5,#8b5cf6); color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }
.msg-bubble.other { background:#fff; color:#1f2937; border:1px solid #e8ecf0; align-self:flex-start; border-bottom-left-radius:4px; }
.msg-time { font-size:.68rem; opacity:.65; margin-top:4px; }
.msg-row { display:flex; flex-direction:column; }
.msg-row.me { align-items:flex-end; }
.chat-input-bar { padding:16px; border-top:1px solid #e8ecf0; background:#fff; display:flex; gap:10px; align-items:flex-end; }
.chat-input-bar textarea { flex:1; border:1.5px solid #e8ecf0; border-radius:12px; padding:10px 14px; font-size:.875rem; resize:none; outline:none; transition:.2s; max-height:100px; min-height:44px; font-family:inherit; }
.chat-input-bar textarea:focus { border-color:#4f46e5; box-shadow:0 0 0 3px rgba(79,70,229,.12); }
.chat-send-btn { background:linear-gradient(135deg,#4f46e5,#8b5cf6); color:#fff; border:none; border-radius:12px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.2s; flex-shrink:0; }
.chat-send-btn:hover { transform:scale(1.05); opacity:.9; }
.no-conv-selected { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:#9ca3af; }
</style>

<div class="container-fluid px-3 py-3">
  <div class="chat-wrap">

    <!-- Sidebar danh sách hội thoại -->
    <div class="chat-sidebar">
      <div class="chat-sidebar-header">
        <i class="bi bi-chat-dots me-2 text-primary"></i>Tin nhắn
      </div>
      <?php if (empty($conversations)): ?>
        <div class="p-4 text-center text-muted" style="font-size:.875rem">
          <i class="bi bi-chat-square-dots fs-2 d-block mb-2 opacity-50"></i>Chưa có cuộc trò chuyện nào.
        </div>
      <?php else: ?>
        <?php foreach ($conversations as $c): ?>
          <?php
            $other = ((int)$c['buyer_id'] === (int)$me['id']) ? $c['seller_name'] : $c['buyer_name'];
            $initial = mb_strtoupper(mb_substr($other, 0, 1));
          ?>
          <a href="<?= $appUrl ?>/chat/show?id=<?= $c['id'] ?>"
             class="conv-item <?= ($activeConvId == $c['id']) ? 'active' : '' ?>">
            <div class="conv-avatar"><?= $initial ?></div>
            <div class="conv-info">
              <div class="conv-name"><?= htmlspecialchars($other, ENT_QUOTES) ?></div>
              <div class="conv-last-msg">
                <?= htmlspecialchars(mb_strimwidth($c['last_message'] ?? 'Bắt đầu chat...', 0, 40, '…'), ENT_QUOTES) ?>
              </div>
            </div>
            <?php if ($c['unread_count'] > 0): ?>
              <span class="conv-badge"><?= $c['unread_count'] ?></span>
            <?php endif; ?>
          </a>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>

    <!-- Khung chat chính -->
    <div class="chat-box">
      <?php if ($activeConv): ?>

        <!-- Header -->
        <div class="chat-box-header">
          <?php
            $otherName = ((int)$activeConv['buyer_id'] === (int)$me['id'])
              ? $activeConv['seller_name']
              : $activeConv['buyer_name'];
          ?>
          <div class="conv-avatar" style="width:38px;height:38px;font-size:.9rem">
            <?= mb_strtoupper(mb_substr($otherName, 0, 1)) ?>
          </div>
          <div>
            <div class="fw-700" style="font-weight:700"><?= htmlspecialchars($otherName, ENT_QUOTES) ?></div>
            <div class="text-muted" style="font-size:.75rem">
              Re: <?= htmlspecialchars($activeConv['product_title'], ENT_QUOTES) ?>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages" id="chatMessages">
          <?php if (empty($messages)): ?>
            <div class="chat-empty">
              <i class="bi bi-chat-heart fs-1 opacity-30"></i>
              <div>Hãy gửi tin nhắn đầu tiên!</div>
            </div>
          <?php else: ?>
            <?php foreach ($messages as $msg): ?>
              <?php $isMe = (int)$msg['sender_id'] === (int)$me['id']; ?>
              <div class="msg-row <?= $isMe ? 'me' : '' ?>">
                <?php if (!$isMe): ?>
                  <div style="font-size:.72rem;color:#9ca3af;margin-bottom:3px"><?= htmlspecialchars($msg['sender_name'], ENT_QUOTES) ?></div>
                <?php endif; ?>
                <div class="msg-bubble <?= $isMe ? 'me' : 'other' ?>">
                  <?= nl2br(htmlspecialchars($msg['body'], ENT_QUOTES)) ?>
                  <div class="msg-time"><?= date('H:i', strtotime($msg['created_at'])) ?></div>
                </div>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>

        <!-- Input -->
        <div class="chat-input-bar">
          <input type="hidden" id="csrfToken" value="<?= htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES) ?>">
          <input type="hidden" id="convId" value="<?= $activeConv['id'] ?>">
          <input type="hidden" id="lastMsgId" value="<?= !empty($messages) ? end($messages)['id'] : 0 ?>">
          <textarea id="msgInput" placeholder="Nhập tin nhắn..." rows="1"
                    onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg();}"></textarea>
          <button class="chat-send-btn" onclick="sendMsg()" title="Gửi">
            <i class="bi bi-send-fill"></i>
          </button>
        </div>

      <?php else: ?>
        <div class="no-conv-selected">
          <i class="bi bi-chat-left-dots fs-1 opacity-25"></i>
          <div>Chọn một cuộc trò chuyện để bắt đầu</div>
        </div>
      <?php endif; ?>
    </div>

  </div>
</div>

<?php if ($activeConv): ?>
<script>
const BASE = '<?= $appUrl ?>';
const convId = <?= $activeConv['id'] ?>;

// Scroll xuống cuối
function scrollBottom() {
  const el = document.getElementById('chatMessages');
  if (el) el.scrollTop = el.scrollHeight;
}
scrollBottom();

// Gửi tin nhắn
async function sendMsg() {
  const input = document.getElementById('msgInput');
  const body  = input.value.trim();
  if (!body) return;
  input.value = '';
  input.style.height = 'auto';

  const res = await fetch(BASE + '/chat/send', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: `conversation_id=${convId}&body=${encodeURIComponent(body)}&_csrf=${document.getElementById('csrfToken').value}`
  });
  const data = await res.json();
  if (data.success) {
    appendMsg({ id: data.data.message_id, body: escHtml(data.data.body), is_me: true, sender_name: '', time: data.data.time });
    document.getElementById('lastMsgId').value = data.data.message_id;
    scrollBottom();
  }
}

// Append bubble
function appendMsg(m) {
  const wrap = document.getElementById('chatMessages');
  const el   = document.createElement('div');
  el.className = 'msg-row ' + (m.is_me ? 'me' : '');
  el.innerHTML = `
    ${!m.is_me ? `<div style="font-size:.72rem;color:#9ca3af;margin-bottom:3px">${escHtml(m.sender_name)}</div>` : ''}
    <div class="msg-bubble ${m.is_me ? 'me' : 'other'}">
      ${m.body.replace(/\n/g,'<br>')}
      <div class="msg-time">${m.time}</div>
    </div>`;
  wrap.appendChild(el);
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Polling mỗi 3 giây để lấy tin nhắn mới
setInterval(async () => {
  const lastId = document.getElementById('lastMsgId').value;
  const res = await fetch(`${BASE}/chat/poll?conv_id=${convId}&after_id=${lastId}`);
  const data = await res.json();
  if (data.success && data.data.messages && data.data.messages.length > 0) {
    data.data.messages.forEach(m => appendMsg(m));
    document.getElementById('lastMsgId').value = data.data.messages[data.data.messages.length - 1].id;
    scrollBottom();
  }
}, 3000);

// Auto-resize textarea
document.getElementById('msgInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});
</script>
<?php endif; ?>
