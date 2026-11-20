# BÁO CÁO TIẾN ĐỘ ĐỒ ÁN CHUYÊN NGÀNH — TUẦN LỄ 2 (19/10/2026 – 25/10/2026)

- **Trường / Khoa**: Trường Đại học Công nghệ TP.HCM (HUTECH) — Khoa Công nghệ Thông tin
- **Biểu mẫu theo dõi**: `BM03/QT05/ĐT-KT`
- **Tên đề tài**: **SinhVien-Market: Hệ thống giao dịch cho sinh viên ứng dụng AI đa phương thức để tìm kiếm và ghép nối nhu cầu – sản phẩm.**
- **Giảng viên hướng dẫn**: **GV. Dương Thành Phết**
- **Nhóm sinh viên thực hiện**:
  1. **Lê Lương Đại Hợp** — MSSV: `2380600761` — Lớp: `23DTHC1`
  2. **Nguyễn Bảo Trân** — MSSV: `2380602295` — Lớp: `23DTHC1`
- **Ngành**: Công nghệ thông tin — **Chuyên ngành**: Công nghệ phần mềm
- **Thời gian thực hiện**: **Tuần lễ 2 (`19/10/2026 – 25/10/2026`)**

---

## 1. Nội dung công việc theo Phiếu theo dõi tiến độ (Tuần 2)

| STT | Nội dung đăng ký trên Phiếu theo dõi (`BM03/QT05/ĐT-KT`) | Tài liệu / Mã nguồn kết quả | Trạng thái |
|---|---|---|---|
| 1 | **Tiếp tục chỉnh sửa FrontEnd, BackEnd** | Hoàn tất 8/8 màn hình Auth + Khung Quản trị `AdminShell` + Kiểm thử Vitest/Playwright | ✅ Hoàn thành |
| 2 | **Cập nhật bổ sung dữ liệu cho Database** | `database/migrations/`, `scripts/seed-demo.php`, `lib/api/mock/admin.ts` | ✅ Hoàn thành |
| 3 | **Phân chia công việc cho từng thành viên trong nhóm** | Bảng phân công nhiệm vụ chi tiết cho 2 thành viên (`2380600761` & `2380602295`) | ✅ Hoàn thành |
| 4 | **Tìm hiểu thêm về mô hình embedding cho đề tài** | Khảo sát `Gemini Embedding 2`, `Jina-CLIP-v2`, `BM25` và `Text-Only Embedding` | ✅ Hoàn thành |

---

## 2. Chi tiết kết quả thực hiện trong Tuần 2

### 2.1. Tiếp tục chỉnh sửa FrontEnd, BackEnd
- **Hoàn thiện trọn bộ 8/8 màn hình Xác thực & Phân quyền trên Next.js 16**:
  1. Chọn cổng đăng nhập Sinh viên / Ban Quản trị (`/login-role`).
  2. Đăng nhập Sinh viên (`/login`) — lưu tài khoản gần đây an toàn, giới hạn 5 lần sai / 15 phút.
  3. Đăng nhập Quản trị viên (`/admin-login`) — kiểm tra chặt quyền `role === "admin"`.
  4. Đăng ký tài khoản Sinh viên (`/register`) — validate toàn diện kèm thanh đo độ mạnh mật khẩu.
  5. Xác minh mã OTP 6 chữ số (`/verify-otp`) — tự lọc ký tự số, giới hạn gửi lại 3 lần / 10 phút.
  6. Quên mật khẩu 2 bước qua câu hỏi bảo mật (`/forgot-password`).
  7. Đặt lại mật khẩu mới (`/reset-password`).
  8. Thông báo khóa tài khoản chi tiết thời hạn & lý do (`/account-locked`).
- **Rà soát và nâng cấp phân hệ Quản trị (`docs/ADMIN_SCREENS.md` & `docs/ADMIN_API_CONTRACT.md`)**:
  - Phát hiện và xử lý các điểm bất cập của Backend/View cũ: thiếu cột `strike_count` trong truy vấn danh sách người dùng, lỗi chuẩn hóa `slug` tiếng Việt có dấu (`đ/Đ`), thiếu lý do khi từ chối bài đăng và thiếu đồng bộ menu trên thiết bị di động.
- **Kiểm thử tự động & Đo tốc độ xử lý**:
  - **Unit Test (Vitest - `tests/unit/validation.test.ts`)**: `30/30` bài test đạt (`18ms`).
  - **E2E & Performance Test (Playwright - `tests/e2e/flows.spec.ts`, `tests/e2e/performance.spec.ts`)**: `14/14` kịch bản đạt; thời gian tải trang `/login` đạt **160ms**, `/register` đạt **78ms** (vượt xa ngưỡng yêu cầu `<= 2000ms`), tốc độ phản hồi lỗi validate đạt **11ms – 18ms** (`<= 150ms`).

### 2.2. Cập nhật bổ sung dữ liệu cho Database
- Bổ sung chỉ mục truy vấn (`database/migrations/20260507_add_indexes.sql`) và kịch bản khởi tạo dữ liệu mẫu (`scripts/seed-demo.php`).
- Chuẩn hóa dữ liệu danh mục sản phẩm phục vụ đúng nhu cầu sinh viên nội trú KTX:
  1. *Sách & Giáo trình*
  2. *Đồ điện tử*
  3. *Đồ gia dụng KTX*
  4. *Thời trang & Phụ kiện*
  5. *Đồ dùng học tập*
  6. *Nhạc cụ & Giải trí*
- Bổ sung dữ liệu mẫu cho 4 nhóm tài khoản kiểm thử (`student@demo.vn`, `unverified@demo.vn`, `locked@demo.vn`, `admin@demo.vn`), bảng sản phẩm nhiều hình thức (*Mua bán, Đấu giá ngược, Trao đổi*), bảng lịch sử phạt gậy (`violations`), bảng tố cáo (`system_reports`) và nhật ký bảo mật (`audit_logs`).

### 2.3. Phân chia công việc cho từng thành viên trong nhóm

| Thành viên | MSSV | Vai trò & Nhiệm vụ phụ trách chính |
|---|---|---|
| **Lê Lương Đại Hợp** | `2380600761` | • Phụ trách kiến trúc Backend PHP MVC & RESTful API (`core/`, `app/controllers/`).<br>• Thiết kế và quản lý Database Migrations (`database/migrations/`), tối ưu truy vấn MySQL.<br>• Xây dựng nghiệp vụ Backend Quản lý Ký túc xá, Hóa đơn & Thanh toán (`PaymentSignature`, `PaymentWebhookProcessor`), Phân loại báo hỏng & Trợ lý nội quy nội bộ.<br>• Thiết lập Docker (`docker-compose.yml`) và viết Unit Test Backend (`tests/Unit/*Test.php`). |
| **Nguyễn Bảo Trân** | `2380602295` | • Phụ trách kiến trúc và phát triển toàn bộ giao diện **Frontend Next.js 16** (Cổng Sinh viên, Cổng Ký túc xá, Cổng Quản trị Admin).<br>• Nghiên cứu, xây dựng bộ dữ liệu thực nghiệm và cài đặt thuật toán **AI Đa phương thức (`REQUEST – OFFER`, Tìm kiếm bằng Văn bản & Hình ảnh, Counterfactual Recommendation)**.<br>• Xây dựng tầng API Client & Mock State (`lib/api/*`) đảm bảo ứng dụng vận hành trơn tru.<br>• Viết bộ kiểm thử tự động Frontend (`Vitest` Unit Test & `Playwright` E2E / Performance Test) và biên soạn tài liệu đặc tả. |

### 2.4. Tìm hiểu thêm về mô hình Embedding cho đề tài
Nhóm đã khảo sát chuyên sâu 4 hướng tiếp cận biểu diễn đặc trưng để chuẩn bị cho bài toán tìm kiếm và ghép nối nhu cầu – sản phẩm:
1. **Google Gemini Embedding 2 (`gemini-embedding-2`, `768 chiều`)**:
   - Hỗ trợ biểu diễn ngữ nghĩa tiếng Việt tự nhiên rất mạnh và có khả năng nhúng đa phương thức (văn bản kết hợp hình ảnh).
2. **Jina-CLIP-v2 (`jina-clip-v2`, `1024 chiều`)**:
   - Mô hình Multimodal CLIP thế hệ mới hỗ trợ đa ngôn ngữ (bao gồm tiếng Việt), ánh xạ trực tiếp cả **Văn bản** và **Hình ảnh** vào cùng một không gian vector `1024 chiều` với độ tương đồng Cosine chuẩn hóa.
3. **Baseline B1 — Keyword BM25 tiếng Việt (`keyword-bm25-vi`)**:
   - Phương pháp khớp từ khóa truyền thống có chuẩn hóa dấu tiếng Việt để làm mốc đối chứng cơ sở.
4. **Baseline B2 — Text-Only Embedding**:
   - Chỉ sử dụng văn bản mô tả mà bỏ qua kênh hình ảnh, dùng để chứng minh giá trị gia tăng của việc kết hợp đa phương thức (Văn bản + Hình ảnh) khi sinh viên tải ảnh món đồ cần tìm lên hệ thống.
