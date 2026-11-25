# Báo cáo W9: Hardening (bảo mật, hiệu năng, độ ổn định)

Ngày 25/11/2026. Nhánh `merge/tran-ui-into-integration`.

## 1. Bảo mật

| Vấn đề phát hiện | Mức độ | Xử lý |
|---|---|---|
| `schema.sql` tạo sẵn 2 tài khoản Gmail thật của nhóm (một tài khoản là **admin**), mật khẩu `Admin@123` ghi ngay trong file, trên repo công khai | Cao | Thay bằng tài khoản mẫu thuộc tên miền dành riêng (RFC 2606), kèm ghi chú bắt buộc đổi mật khẩu. **Các DB đã tạo từ schema cũ phải tự đổi mật khẩu 3 tài khoản đầu.** |
| Đăng nhập Google gộp vào tài khoản có sẵn theo email kể cả khi Google **chưa xác minh** email đó, nên có thể bị chiếm tài khoản | Cao | Từ chối email Google chưa xác minh (`?oauth_error=unverified`) |
| Tài khoản **đã bị khóa** vẫn đăng nhập được qua Google | Cao | Chặn (`?oauth_error=locked`) |
| Không tạo lại session id sau khi đăng nhập Google (session fixation) | Trung bình | `session_regenerate_id(true)` |
| Admin đăng nhập được bằng Google, bỏ qua cổng Admin | Trung bình | Admin phải dùng cổng Admin (`?oauth_error=admin`) |
| Bỏ qua OTP viết cứng cho `admin@market.com` / `admin@sinhvienmarket.com` | Trung bình | Gỡ bỏ ở cả 2 luồng đăng nhập; admin mẫu đã ở trạng thái xác thực |
| Route `/api/ai/match` (prototype) không cần đăng nhập mà vẫn tiêu key Gemini/Jina | Trung bình | Đã gỡ khi merge giao diện (21/11) |
| `php.ini` thiếu bộ chứng chỉ CA nên đăng nhập Google và Gemini lỗi cURL 60 | Vận hành | Cấu hình `curl.cainfo` / `openssl.cafile`; ghi vào hướng dẫn cài đặt |

Đã kiểm tra lại: cookie phiên `HttpOnly` + `SameSite=Lax` (+ `Secure` khi HTTPS); có header `X-Frame-Options`, `X-Content-Type-Options` và CSP; mọi API ghi dữ liệu đều kiểm tra CSRF; tìm kiếm AI có giới hạn tần suất (khách 10 lượt / 5 phút, người dùng 30 lượt).

## 2. Hiệu năng tìm kiếm AI

Trước W9, mỗi lượt tìm kiếm chạy 1 truy vấn cho vector văn bản, 1 truy vấn **tải nguyên ảnh** để băm, và 1 truy vấn cho vector ảnh, **cho từng tin đăng** (lỗi N+1).

| Đo trên DB demo (111 tin, 39 ảnh) | Trước | Sau |
|---|---|---|
| Số truy vấn SQL mỗi lượt tìm | 191 | **3** |
| Dữ liệu đọc từ DB mỗi lượt tìm | ~5,0 MB | ~2,4 MB (chỉ còn vector) |
| Thời gian nạp vector (trung vị 7 lần) | 141 ms | **75 ms** |

Cách làm:
- tải mọi vector của model bằng một truy vấn;
- băm ảnh ngay trong DB bằng `SHA2(data, 256)`;
- chỉ đọc ảnh khi thật sự cần tạo vector mới.

Kết quả xếp hạng giữ nguyên. Thời gian còn lại của một lượt tìm chủ yếu là lời gọi API nhúng câu truy vấn: trung vị 0,84 giây (xem [BAO_CAO_BENCHMARK_W8.md](./BAO_CAO_BENCHMARK_W8.md)).

## 3. Sửa lỗi chức năng

- **Trạng thái mặt bằng:** duyệt đề nghị thuê thì mặt bằng chuyển sang "occupied"; chấm dứt hợp đồng thì về lại "available" (trừ khi admin đã cho ngừng hoạt động).
- **Form thêm tòa/tầng/phòng/giường:** điền sẵn trạng thái và loại phòng mặc định, không còn hiện "-- Chọn --".

## 4. CI

Workflow `.github/workflows/phpunit.yml` (đổi tên thành "Tests"):
- PHP 8.1 → **8.3** cho khớp môi trường chạy;
- chạy cả trên nhánh `fix/**`, `merge/**`;
- **thêm job frontend:** `npm ci`, ESLint, Vitest, `next build`, `tsc`.

## 5. Kiểm thử hồi quy toàn hệ thống (DB sạch, API thật)

DB demo được dựng lại từ đầu (`schema.sql` + migration + `seed-demo.php`) để chạy kiểm thử. Sau đó DB được khôi phục từ bản sao lưu.

| Bộ kiểm thử | Kết quả |
|---|---|
| PHPUnit | **100/100** (242 assertion) |
| Vitest | **57/57** |
| ESLint, TypeScript, `next build` | Sạch / đạt |
| Smoke test API: 3 hành trình demo + kiểm tra bảo mật (`scripts/qa/smoke_test.py`) | **44/44 PASS** |
| Duyệt giao diện 4 vai trò, 56 lượt trang (`scripts/qa/ui_crawl.cjs`) | 51 trang sạch; 5 trang có mã 401/403/404 **đúng thiết kế** (khách gọi API cần đăng nhập, hồ sơ admin không công khai, sinh viên không có quyền xem hợp đồng thuê, id không tồn tại); **0 lỗi JavaScript** |

## 6. Còn lại sau W9

- Vector lưu dạng JSON (khoảng 11 KB/tin). Khi số tin tăng lên hàng nghìn, nên chuyển sang dạng nhị phân hoặc dùng chỉ mục vector.
- Chưa có E2E Playwright chạy với API thật trong CI. Hiện smoke test và UI crawl chạy tay theo [`scripts/qa/README.md`](../scripts/qa/README.md).
- Bot trả lời tin nhắn phụ thuộc các model Gemini lite, đôi lúc quá tải (đã có cơ chế thử model dự phòng).
