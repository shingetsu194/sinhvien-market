# 🛒 SinhVienMarket

> **Chợ mua bán, trao đổi và đấu giá ngược đồ dùng sinh viên KTX**

[![PHP](https://img.shields.io/badge/PHP-8.1+-777BB4?logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql&logoColor=white)](https://mysql.com)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com)

---

## 📋 Giới thiệu

**SinhVienMarket** là nền tảng marketplace dành riêng cho sinh viên KTX, hỗ trợ:

- 🛍️ **Mua bán thông thường** — Đăng sản phẩm, đặt giá cố định
- ⚡ **Đấu giá ngược** — Giá tự giảm theo thời gian, mua ngay khi ưng
- 🔄 **Trao đổi** — Swap đồ dùng với sinh viên khác
- 🎁 **Giveaway** — Sự kiện quay số trúng thưởng
- 💬 **Nhắn tin** — Chat trực tiếp giữa người mua/bán
- 🔔 **Thông báo** — Realtime notification
- ⭐ **Đánh giá** — Rating người bán sau giao dịch
- 🚩 **Tố cáo** — Report vi phạm lên Admin

---

## 🏗️ Kiến trúc

```
sinhvien-market/
├── app/
│   ├── controllers/    # Xử lý logic (MVC Controller)
│   ├── models/         # Tương tác database (MVC Model)
│   ├── views/          # Giao diện PHP (MVC View)
│   │   ├── admin/      # Trang quản trị
│   │   ├── auth/       # Đăng nhập / Đăng ký
│   │   ├── home/       # Trang chủ
│   │   ├── layouts/    # Layout chung (header, navbar, footer)
│   │   ├── products/   # Chi tiết sản phẩm
│   │   ├── chat/       # Nhắn tin
│   │   ├── profile/    # Hồ sơ cá nhân
│   │   └── ...
│   └── services/       # Service layer (Notification, ...)
├── core/               # Framework core (Router, Model, Middleware...)
├── config/             # Database config
├── database/
│   ├── schema.sql      # Toàn bộ schema DB
│   └── migrate_*.sql   # Migration scripts
├── public/
│   ├── css/style.css   # Global stylesheet
│   ├── js/             # JavaScript
│   └── uploads/        # Ảnh upload
├── storage/logs/       # Log files
├── .env.example        # Mẫu biến môi trường
└── index.php           # Front controller
```

**Tech stack:** PHP 8.1+ · MySQL 8 · Bootstrap 5 · Vanilla JS · CSS Variables

---

## ⚙️ Cài đặt

### Yêu cầu
- PHP 8.1+
- MySQL 8.0+ / MariaDB 10.6+
- Apache (có mod_rewrite) hoặc Nginx
- Laragon / XAMPP / WAMP (Windows)

### Các bước cài đặt

**1. Clone repo**
```bash
git clone https://github.com/shingetsu194/sinhvien-market.git
cd sinhvien-market
```

**2. Tạo file `.env`**
```bash
cp .env.example .env
```
Chỉnh sửa `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sinhvien_market
DB_USER=root
DB_PASS=

APP_NAME=SinhVienMarket
APP_URL=http://localhost/sinhvien-market
APP_ENV=development
APP_DEBUG=true
```

**3. Tạo database và import schema**
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS sinhvien_market CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root sinhvien_market < database/schema.sql
```

**4. Phân quyền thư mục upload**
```bash
# Windows (Laragon) — thường tự động
# Linux/Mac:
chmod -R 775 public/uploads storage/logs
```

**5. Truy cập ứng dụng**
```
http://localhost/sinhvien-market
```

### Tài khoản Admin mặc định
| Email | Mật khẩu |
|-------|-----------|
| `admin@market.com` | `Admin@123` |

---

## 🗄️ Cấu trúc Database

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản sinh viên & admin |
| `products` | Sản phẩm (sale / auction / exchange) |
| `categories` | Danh mục sản phẩm |
| `transactions` | Lịch sử giao dịch |
| `messages` | Tin nhắn chat |
| `conversations` | Cuộc hội thoại |
| `notifications` | Thông báo người dùng |
| `ratings` | Đánh giá người bán |
| `reports` | Tố cáo vi phạm |
| `wishlists` | Danh sách yêu thích |
| `giveaways` | Sự kiện giveaway |
| `giveaway_participants` | Người tham gia giveaway |
| `audit_logs` | Nhật ký hành động admin |
| `otp_codes` | Mã OTP xác thực |
| `password_resets` | Đặt lại mật khẩu |

---

## ✨ Tính năng nổi bật

### Đấu giá ngược (Reverse Auction)
Giá sản phẩm **tự động giảm** theo thời gian từ `start_price` xuống `min_price`. Người mua có thể "Lock & Buy" bất cứ lúc nào với giá hiện tại.

### Giao diện Tối / Sáng
Toggle dark mode tích hợp sẵn, lưu preference vào localStorage.

### Bảo mật
- CSRF token trên mọi form
- Password hashing (bcrypt)
- Session-based auth
- Input sanitization
- Account lock sau nhiều lần đăng nhập sai

---

## 🔧 Changelog & Bugfixes

### v1.1.0 — 2026-03-27

#### 🐛 Database Schema Fixes
| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `500` toàn app | Thiếu bảng `giveaways` và `giveaway_participants` | Thêm vào `schema.sql` + migrate DB |
| `500` trang Admin Users | Thiếu cột `lock_reason`, `locked_at`, `locked_until` trong bảng `users` | `ALTER TABLE` + cập nhật schema |
| `500` trang Tố cáo | Thiếu bảng `reports` | Thêm vào `schema.sql` + migrate DB |

#### 🌙 Dark Mode Fixes (`public/css/style.css`)
| Thành phần | Vấn đề | Fix |
|-----------|--------|-----|
| Form inputs / select | `background: #fff` hardcoded | → `var(--card-bg)` |
| Input group, password toggle | `background: #fff` hardcoded | → `var(--card-bg)` |
| Navbar dropdown menu | `background: rgba(255,255,255,.98)` hardcoded | → `var(--bs-dropdown-bg)` |
| Bootstrap dropdown | Thiếu CSS variable override | Thêm `--bs-dropdown-bg`, `--bs-dropdown-color` vào `[data-theme="dark"]` |
| Auth card (login/register) | Nền trắng trong dark mode | Thêm dark mode override cho `.auth-card` |

#### 🏠 Home Page Dark Mode Fixes (`app/views/home/index.php`)
| Thành phần | Vấn đề | Fix |
|-----------|--------|-----|
| Section "Đấu giá HOT" | `background: #fff` inline | → `var(--bg)` |
| Section "Danh mục" | `background: linear-gradient(#f8fafc...)` inline | → class `.hp-category-section` với dark override |
| Section "Sản phẩm mới nhất" | `background: #fff` inline | → `var(--card-bg)` |
| `.hp-auction-card` | `background: #fff` hardcoded | → `var(--card-bg)`, border `var(--border)` |
| `.hp-cat-card` | `background: #fff` hardcoded | → `var(--card-bg)`, border `var(--border)` |
| `.hp-product-card` | `background: #fff` hardcoded | → `var(--card-bg)`, border `var(--border)` |
| Text màu card title | `color: #0f172a` hardcoded | → `var(--text)` |

---

## 📄 License

MIT License — Free to use for educational purposes.

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/shingetsu194">shingetsu194</a>
</div>
