<div align="center">

# 🏪 SinhVienMarket

**Nền tảng mua bán, trao đổi và đấu giá đồ dùng dành riêng cho sinh viên ký túc xá**

[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Giới Thiệu

**SinhVienMarket** là nền tảng thương mại điện tử nội bộ được thiết kế riêng cho cộng đồng sinh viên ký túc xá — nơi việc trao tay đồ trực tiếp là hoàn toàn khả thi, giúp loại bỏ chi phí vận chuyển và các rào cản không cần thiết của các sàn thương mại lớn.

> **Định hướng mở rộng:** dự án đang phát triển theo hướng nền tảng quản lý KTX tích hợp dịch vụ và sàn giao dịch. Backend vẫn là PHP MVC hiện tại, frontend tiếp tục dùng Next.js. Phạm vi MVP và các quyết định kiến trúc được ghi tại [`docs/KTX_PLATFORM_FOUNDATION.md`](./docs/KTX_PLATFORM_FOUNDATION.md).

### Chạy môi trường phát triển bằng Docker

Yêu cầu Docker Desktop đã cài đặt và đang chạy:

```powershell
docker compose up --build
```

Sau khi MySQL sẵn sàng, chỉ import `database/schema.sql` vào database mới/rỗng một lần (file này xóa và tạo lại toàn bộ bảng), rồi chạy các migration:

```powershell
Get-Content .\database\schema.sql -Raw | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
docker compose exec php php scripts/migrate.php
```

Frontend: `http://localhost:3000`; PHP API: `http://localhost:8080`; MySQL từ máy host: cổng `3307`. Có thể override mật khẩu MySQL local bằng biến `MYSQL_ROOT_PASSWORD`. Không dùng cấu hình mặc định này trong production.

### 🎯 Vấn Đề Cần Giải Quyết

| Vấn đề hiện tại | Giải pháp của SinhVienMarket |
|---|---|
| Rào cản đăng bán phức tạp trên Shopee/Lazada | Đăng bán đơn giản, không cần xác minh cửa hàng |
| Phí ship ngang giá món đồ (sách 20k, ship 25k) | Trao tay trực tiếp trong khuôn viên KTX |
| Không có cộng đồng mua bán nội bộ an toàn | Hệ thống kiểm duyệt bài đăng bởi Admin |
| Giao dịch tự phát qua Facebook/Zalo dễ lừa đảo | Rating, tố cáo vi phạm, nhật ký hành động |

---

## ✨ Tính Năng Chính

### 🛍️ Mua Bán & Giao Dịch
- **3 hình thức giao dịch:** Bán thông thường / Đấu giá ngược (Reverse Auction) / Trao đổi hiện vật
- **Đấu giá ngược (Dutch Auction):** Giá tự động giảm dần theo thời gian, người mua nhấn "Lock & Buy" để chốt đơn
- **Order Tracking:** Theo dõi đơn hàng qua 4 giai đoạn (Chờ xác nhận → Đang giao → Đã giao → Hoàn tất)
- **Hủy đơn & Hoàn tác:** Người bán có quyền hủy giao dịch COD, sản phẩm sẽ tự động quay lại trạng thái "Đang bán" trên sàn.
- **Wishlist:** Lưu sản phẩm yêu thích để theo dõi sau

### 💳 Thanh Toán & Tài Chính
- **Tích hợp ZaloPay & MoMo (Sandbox):** Thanh toán trực tuyến một chạm với luồng IPN/Webhook chuẩn, chống giả mạo chữ ký.
- **Thanh toán VietQR động:** Tự động tạo mã QR chứa thông tin đơn hàng và số tiền (API qrserver/vietqr.io).
- **Hệ thống minh chứng chuyển khoản:** Người mua tải biên lai ảnh, người bán xác nhận thanh toán dễ dàng.

### 🔐 Xác Thực & Bảo Mật
- **Đăng ký / Đăng nhập** qua Email & Mật khẩu với OTP 2 lớp
- **Google OAuth 2.0** — Đăng nhập nhanh bằng tài khoản Google
- **Recent Accounts** — Ghi nhớ tài khoản đã đăng nhập để truy cập nhanh
- **Quên mật khẩu** qua câu hỏi bảo mật cá nhân
- CSRF Protection, Password Bcrypt, XSS Escaping toàn bộ output
- **AI Kiểm Duyệt Nội Dung (Gemini):** Tự động phát hiện và chặn ngôn từ nhạy cảm, lừa đảo, hoặc hàng cấm ngay khi người dùng định đăng bài.
- **Huy Hiệu Sinh Viên 🛡️ (Trust Badge)** — Chỉ cấp cho người dùng đăng ký, xác thực thành công bằng email `.edu.vn` (tự động verify)

### 💎 Cơ Chế Hệ Thống Mới
- **Hệ Thống Xu & Đẩy Tin 🚀** — Điểm danh (check-in) nhận 10 xu mỗi ngày, tiêu 50 xu để đẩy sản phẩm của mình lên đầu trang.
- **Lọc Sản Phẩm Tự Động (Bộ Lọc Nâng Cao)** — Lọc qua Tình trạng (Mới, Đã Dùng...). Badge phân biệt rõ Tình trạng xuất hiện trên Card sản phẩm. Auto-submit filter tức thời.

### 💬 Tương Tác Cộng Đồng
- **Chat Realtime (Pusher WebSocket):** Nhắn tin thời gian thực với độ trễ bằng không, không cần tải lại trang.
- **AI Trợ lý & Gợi ý (Gemini 2.5 Flash):** 
  - Tự động phân tích sản phẩm và gợi ý mức giá bán hợp lý cho người bán.
  - Tự động đóng vai Shop để tư vấn sản phẩm khi người bán vắng mặt.
- **Hệ thống "Make an Offer" (Trả giá / Mặc cả):** Người mua gửi đề nghị giá tự chọn ngay trên trang sản phẩm, người bán nhận **Offer Card** trong Chat với nút Đồng ý / Từ chối (real-time).
- **Bản đồ Vị trí (Google Maps + Nominatim Hybrid):** Hiển thị điểm giao dịch chính xác với Marker animation, InfoWindow địa chỉ và vòng an toàn 200m. Dùng kiến trúc Hybrid: Google Maps SDK cho giao diện premium, Nominatim (OpenStreetMap) cho geocoding miễn phí.
- **Thông báo trong app** — Bell badge cập nhật tin nhắn/duyệt bài/đấu giá
- **Đánh giá người bán** (1–5 sao + nhận xét sau giao dịch)
- **Tố cáo vi phạm** — Báo cáo sản phẩm hoặc tài khoản đáng ngờ
- **Sự kiện Giveaway** — Bốc thăm may mắn trúng quà

### 🛡️ Admin Panel
- Dashboard thống kê tổng quan (Users, Products, Transactions)
- Kiểm duyệt bài đăng (Duyệt / Từ chối với thông báo tự động)
- Quản lý người dùng (Khóa/Mở khóa tài khoản)
- Nhật ký hành động Admin (Audit Log — không thể xóa/sửa)
- Quản lý danh mục, sự kiện Giveaway, báo cáo vi phạm

### 🎨 Giao Diện
- **Dark Mode / Light Mode** — Toggle toàn trang, lưu `localStorage` với hiệu ứng chuyển đổi mượt mà.
- Giao diện Premium Responsive xây dựng bằng **Tailwind CSS 3.4**.
- Trang lỗi 404 & 500 thân thiện với người dùng
- Font Plus Jakarta Sans + Bootstrap Icons

---

## 🗄️ Cấu Trúc Database

```
users                 — Tài khoản sinh viên & Admin (hỗ trợ Google ID)
products              — Sản phẩm đăng bán (sale / auction / exchange)
categories            — Danh mục sản phẩm
transactions          — Lịch sử giao dịch & trạng thái vận chuyển
messages              — Tin nhắn chat
conversations         — Quản lý hội thoại
notifications         — Thông báo đẩy trong app
ratings               — Đánh giá người bán
reports               — Tố cáo vi phạm
wishlists             — Danh sách yêu thích
giveaways             — Sự kiện giveaway
giveaway_participants — Người tham gia giveaway
audit_logs            — Nhật ký hành động Admin
otp_codes             — Mã OTP xác thực
password_resets       — Đặt lại mật khẩu
```

---

## 🏗️ Kiến Trúc Dự Án

Dự án sử dụng kiến trúc **MVC thuần PHP** — không phụ thuộc framework bên ngoài.

```
sinhvien-market/
├── app/
│   ├── controllers/   # 15+ Controllers (Auth, Product, Chat, Admin...)
│   ├── models/        # 10+ Models (User, Product, Transaction...)
│   ├── views/         # PHP error pages (404/500); user/admin UI is in Next.js
│   └── services/      # NotificationService, ...
├── core/
│   ├── Router.php     # URL Dispatcher
│   ├── Controller.php # Base Controller (CSRF, Auth helpers)
│   ├── Model.php      # Base Model (PDO wrapper)
│   ├── ErrorHandler.php
│   └── Middleware.php
├── config/
│   └── Database.php   # Singleton PDO connection
├── database/
│   └── schema.sql     # Full database schema (15+ bảng)
├── public/
│   ├── css/style.css  # Design System (CSS Variables, Dark Mode)
│   ├── uploads/       # Ảnh sản phẩm & Avatar
│   └── index.html
├── storage/logs/      # Log file tự động theo ngày
├── index.php          # Entry point duy nhất
└── .env               # Cấu hình môi trường
```

### Luồng Xử Lý Yêu Cầu (Request Lifecycle)

```
Browser Request
    └─→ .htaccess (Rewrite → index.php)
           └─→ Router::dispatch() (Phân tích URL + HTTP Method)
                  ├─→ Trang đã chuyển → Redirect sang Next.js
                  ├─→ API/backend → Controller → Model::query() → JSON
                  └─→ Lỗi PHP 404/500 → Trang lỗi HTML
```

---

## 🚀 Cài Đặt & Chạy Local

Hướng dẫn đầy đủ (DB, API PHP, giao diện Next.js, dữ liệu demo, kiểm thử, lỗi thường gặp):
**[`docs/HUONG_DAN_CHAY.md`](./docs/HUONG_DAN_CHAY.md)**.

Tóm tắt:

```powershell
# DB mới + migration
Get-Content .\database\schema.sql -Raw | mysql -u root sinhvien_market
php scripts/migrate.php
# API (đã điền .env từ .env.example)
php -S 127.0.0.1:8081 index.php
# Giao diện
cd sinhvien-market-next/frontend; npm ci; npm run dev   # http://localhost:3000
```

## 🔑 Tài Khoản Mẫu

`schema.sql` tạo `admin@sinhvienmarket.example` (admin), `sinhvien.a@hutech.example.edu` và
`sinhvien.b@example.com` với mật khẩu `Admin@123`, chỉ dùng cho môi trường phát triển và **phải đổi ngay sau khi cài**.

---

## 📈 Trạng Thái Dự Án

| Tiêu chí | Điểm | Trạng thái |
|----------|------|------------|
| Project Structure (MVC) | 10/10 | 🟢 Đạt — SRP Controllers (Đã Refactor) |
| API Conventions | 9/10 | 🟢 Đạt |
| Error Handling | 9/10 | 🟢 Đạt — Đã tích hợp AI Fail-Open |
| Database Design | 10/10 | 🟢 Đạt — Pessimistic Locking & Migrations |
| Security | 10/10 | 🟢 Đạt — CSP, Idempotency, 2FA |
| Code Style | 9/10 | 🟢 Đạt |
| Testing (Manual) | 9/10 | 🟢 Đã kiểm thử QA toàn diện |
| Testing (Automated) | 10/10 | 🟢 Đạt — CI/CD GitHub Actions |
| Git Workflow | 9/10 | 🟢 Đạt |

**Điểm trung bình: 9.5/10** *(cập nhật 07/05/2026 — v2.5.0)*

---

## 🗺️ Roadmap

- [x] Bộ lọc sản phẩm nâng cao (khoảng giá, tình trạng hàng)
- [x] Live Search (hiển thị kết quả khi đang gõ) — Autocomplete dạng dropdown, debounce 350ms
- [x] Hệ thống Điểm Danh 7 Ngày (Shopee-style) — Trang /rewards độc lập
- [x] Rank Badge Uy Tín Người Bán (Tân binh / Tích cực / Uy tín)
- [x] QR Code Chia sẻ Sản phẩm + Open Graph SEO Meta
- [x] Make an Offer (Hệ thống Mặc cả / Trả giá trong Chat)
- [x] Rate Limiting (chống spam login/OTP)
- [x] Wishlist Alerts (thông báo khi giá giảm bằng CronJob)
- [x] Unit Tests (PHPUnit) với môi trường Isolated Database
- [x] Leaderboard Người Bán (Top theo số đơn / rating)
- [x] Database Migrations (thay thế schema.sql tĩnh)
- [x] Refactoring God Controllers (Enterprise Architecture)
- [ ] Minigames nhận Xu tại /rewards

---

## 🤝 Đóng Góp

Dự án đồ án cơ sở — mọi góp ý, phát hiện lỗi đều được hoan nghênh qua [Issues](../../issues).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.


<div align="center">
Made with ❤️ by SinhVienMarket Team · Đồ án cơ sở 2026
</div>
