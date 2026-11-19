# Kiểm tra trước demo (dữ liệu thật, không mock)

Chạy trên **database demo cô lập** `sinhvien_market_demo` sau khi đã import
`database/schema.sql`, chạy `php scripts/migrate.php` và `php scripts/seed-demo.php`.
Lưu output của seed (mật khẩu một lần) vào một file, ví dụ `seed-output.txt`;
**không commit file này**.

## 1. Smoke test API — 3 hành trình demo + bảo mật (44 bước)

```powershell
python -I scripts/qa/smoke_test.py http://127.0.0.1:3000 seed-output.txt
```

Gọi qua Next.js (`/api` proxy) hoặc trực tiếp backend PHP. Script tạo dữ liệu
(hồ sơ, hợp đồng, hóa đơn...), nên chạy trên DB vừa seed; chạy lại cần DB mới.

## 2. Duyệt toàn bộ giao diện theo vai trò

Cần thêm một tài khoản `demo-admin@example.test` (role `admin`) trong DB demo và
dòng tương ứng trong file seed output. Playwright lấy từ `node_modules` của frontend:

```powershell
node scripts/qa/ui_crawl.cjs sinhvien-market-next/frontend http://127.0.0.1:3000 seed-output.txt
```

Ghi lại lỗi JavaScript, `console.error` và request `/api` lỗi cho từng trang với
vai trò khách, sinh viên, quản lý KTX và admin; kết quả chi tiết ở
`ui_crawl_result.json` trong thư mục đang đứng. 401/403/404 ở trang yêu cầu đăng
nhập hoặc id không tồn tại là hành vi đúng — đọc từng cảnh báo trước khi kết luận.
