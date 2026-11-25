# Hướng dẫn cài đặt và chạy SinhVienMarket (local)

Hệ thống gồm 3 phần chạy độc lập:

| Phần | Công nghệ | Địa chỉ mặc định |
|---|---|---|
| Cơ sở dữ liệu | MySQL 8 / MariaDB 10.4+ (ví dụ MariaDB của XAMPP) | `127.0.0.1:3306` |
| API | PHP 8.3, front controller `index.php` | `http://localhost:8081` |
| Giao diện | Next.js 16 (thư mục `sinhvien-market-next/frontend`) | `http://localhost:3000` |

Next.js chuyển mọi request `/api/*` và `/auth/google*` sang PHP, nên người dùng chỉ mở cổng 3000.
Có Docker thì xem thêm [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md).

## 1. Yêu cầu

- PHP **8.3** CLI, bật các extension `pdo_mysql`, `curl`, `mbstring`, `openssl`, `fileinfo`.
  `php.ini` phải trỏ tới một bộ chứng chỉ CA. Nếu thiếu, đăng nhập Google và Gemini sẽ báo **cURL error 60**:
  ```ini
  curl.cainfo = "C:/php/extras/ssl/cacert.pem"
  openssl.cafile = "C:/php/extras/ssl/cacert.pem"
  ```
  (Có thể chép file `ca-bundle.crt` của Git for Windows hoặc `curl-ca-bundle.crt` của XAMPP.)
- MySQL 8 hoặc MariaDB 10.4+.
- Node.js **20+** và npm.

## 2. Cơ sở dữ liệu

```powershell
mysql -u root -e "CREATE DATABASE sinhvien_market CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
Get-Content .\database\schema.sql -Raw | mysql -u root sinhvien_market   # chỉ cho DB mới: file này xóa và tạo lại toàn bộ bảng
php scripts/migrate.php                                                   # chạy các migration còn thiếu (an toàn khi chạy lại)
```

`schema.sql` tạo 3 tài khoản mẫu (mật khẩu `Admin@123`, **đổi ngay sau khi cài**):

| Vai trò | Email |
|---|---|
| Admin (đăng nhập ở `/admin-login`) | `admin@sinhvienmarket.example` |
| Sinh viên (có tích xanh) | `sinhvien.a@hutech.example.edu` |
| Sinh viên | `sinhvien.b@example.com` |

Các email này thuộc tên miền dành riêng cho thử nghiệm, nên không trùng người thật và không nhận được thư.

## 3. Cấu hình API (PHP)

```powershell
Copy-Item .env.example .env
```

Các khóa quan trọng trong `.env`:

| Khóa | Giá trị khi chạy local |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | Thông tin DB ở bước 2 |
| `APP_URL` | `http://localhost:8081` |
| `NEXT_APP_URL` | `http://localhost:3000`. **Bắt buộc**: các trang PHP cũ chuyển hướng sang đây |
| `GEMINI_API_KEY` | Key Google AI Studio: tìm kiếm AI, bot trả lời tin nhắn, kiểm duyệt bài |
| `GEMINI_CHAT_MODEL` | *(tùy chọn)* Danh sách model chat thử lần lượt, mặc định `gemini-3.1-flash-lite,gemini-3.5-flash-lite` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client loại *Web application* |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8081/auth/google/callback`. Phải khai báo **y hệt** trong Google Cloud Console |
| `STUDENT_EMAIL_DOMAINS` | *(tùy chọn)* Đuôi email trường được cấp tích xanh, ngoài `.edu.vn`, `.ac.vn`, `.edu` |

Không commit file `.env`.

Khởi động API:

```powershell
php -S 127.0.0.1:8081 index.php
```

## 4. Giao diện (Next.js)

```powershell
cd sinhvien-market-next/frontend
npm ci
Copy-Item .env.example .env.local
```

Trong `.env.local`:

```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=/api
PHP_BACKEND_URL=http://127.0.0.1:8081
```

```powershell
npm run dev            # phát triển, http://localhost:3000
# hoặc bản chạy demo:
npm run build; npm run start
```

Luôn mở bằng **`localhost`**, đừng dùng `127.0.0.1`: cookie đăng nhập Google gắn với `localhost`.

`NEXT_PUBLIC_USE_MOCK=true` chạy giao diện với dữ liệu giả, không cần PHP. Chế độ này không có tìm kiếm AI thật.

## 5. Dữ liệu demo (tùy chọn)

Chỉ chạy trên DB dành cho demo hoặc thử nghiệm:

```powershell
# 12 nội quy KTX mẫu (Trợ lý nội quy trả lời từ đây). Chạy lại không bị trùng.
Get-Content .\database\demo\dorm-rules.sql -Raw | mysql -u root sinhvien_market

# 20 tài khoản sinh viên test + 108 sản phẩm. Từ chối chạy ở production hoặc khi chạy lần 2.
$env:TEST_ACCOUNTS_PASSWORD = "<mật khẩu chung tự đặt>"
php scripts/seed-test-marketplace.php --database=sinhvien_market --confirm=sinhvien_market

# Tạo vector Gemini cho mọi sản phẩm đang bán (cần GEMINI_API_KEY)
php scripts/index-marketplace-embeddings.php
```

Admin cũng tạo được vector trên giao diện: *So sánh mô hình AI → Cập nhật vector sản phẩm*.
Tin mới được tạo vector ngay khi được duyệt.

## 6. Kiểm thử

```powershell
vendor/bin/phpunit                                    # PHP (cần DB ở bước 2 đang chạy)
cd sinhvien-market-next/frontend
npx vitest run; npx eslint .; npx tsc --noEmit         # tsc cần chạy `npm run build` hoặc `dev` một lần trước để sinh kiểu route
```

Smoke test với dữ liệu thật: xem [`../scripts/qa/README.md`](../scripts/qa/README.md).
Benchmark AI: xem [`../database/demo/marketplace/README.md`](../database/demo/marketplace/README.md) và `scripts/eval/`.

## 7. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Đăng nhập Google báo "Máy chủ không xác thực được với Google"; log có `cURL 60` | `php.ini` thiếu `curl.cainfo` (xem bước 1) |
| Google báo *Access blocked / redirect_uri_mismatch* | `GOOGLE_REDIRECT_URI` khác với URI đã khai báo; hoặc thiếu `GOOGLE_CLIENT_ID` |
| Đăng nhập Google xong vẫn ở trang đăng nhập | Đang mở bằng `127.0.0.1`; hãy dùng `localhost` |
| Mở trang PHP cũ (ví dụ `:8081/login`) gặp lỗi 503 "chưa cấu hình giao diện" | `.env` thiếu `NEXT_APP_URL` (trước đây lỗi này gây vòng lặp chuyển hướng) |
| Tìm kiếm hiện "đang tìm theo từ khóa" (dải màu vàng) | Gemini chưa cấu hình, hết hạn mức hoặc quá tải. Kết quả vẫn đúng nhưng chỉ dựa trên từ khóa |
| Bot không tự trả lời tin nhắn | Model chat bị đóng hoặc quá tải; xem log PHP dòng `Google AI API Error (model)` rồi đổi `GEMINI_CHAT_MODEL` |
| `tsc` báo `Cannot find name 'LayoutProps'` | Chưa chạy `npm run build` hoặc `npm run dev` lần nào (Next sinh kiểu khi chạy) |
