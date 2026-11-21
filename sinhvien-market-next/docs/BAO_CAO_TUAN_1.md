# BÁO CÁO TIẾN ĐỘ ĐỒ ÁN CHUYÊN NGÀNH — TUẦN LỄ 1 (11/10/2026 – 18/10/2026)

- **Trường / Khoa**: Trường Đại học Công nghệ TP.HCM (HUTECH) — Khoa Công nghệ Thông tin
- **Biểu mẫu theo dõi**: `BM03/QT05/ĐT-KT`
- **Tên đề tài**: **SinhVien-Market: Hệ thống giao dịch cho sinh viên ứng dụng AI đa phương thức để tìm kiếm và ghép nối nhu cầu – sản phẩm.**
- **Giảng viên hướng dẫn**: **GV. Dương Thành Phết**
- **Nhóm sinh viên thực hiện**:
  1. **Lê Lương Đại Hợp** — MSSV: `2380600761` — Lớp: `23DTHC1`
  2. **Nguyễn Bảo Trân** — MSSV: `2380602295` — Lớp: `23DTHC1`
- **Ngành**: Công nghệ thông tin — **Chuyên ngành**: Công nghệ phần mềm
- **Thời gian thực hiện**: **Tuần lễ 1 (`11/10/2026 – 18/10/2026`)**

---

## 1. Nội dung công việc theo Phiếu theo dõi tiến độ (Tuần 1)

| STT | Nội dung đăng ký trên Phiếu theo dõi (`BM03/QT05/ĐT-KT`) | Tài liệu / Mã nguồn kết quả | Trạng thái |
|---|---|---|---|
| 1 | **Xác định đề tài** | `docs/AUTH_SCREENS.md`, Đặc tả phạm vi đề tài Đồ án Chuyên ngành | ✅ Hoàn thành |
| 2 | **Thống kê những thay đổi về công nghệ** | Bảng đối chiếu kiến trúc PHP MVC cũ → Next.js 16 + REST API + Multimodal AI | ✅ Hoàn thành |
| 3 | **Chỉnh sửa FrontEnd, BackEnd theo công nghệ mới** | `sinhvien-market-next/frontend/`, `docs/AUTH_API_CONTRACT.md`, `core/ApiController.php` | ✅ Hoàn thành |
| 4 | **Lên kế hoạch chỉnh sửa lâu dài** | `docs/TIEN_DO_TUAN.txt` (Lộ trình 12 tuần Đồ án Chuyên ngành) | ✅ Hoàn thành |

---

## 2. Chi tiết kết quả thực hiện trong Tuần 1

### 2.1. Xác định đề tài & Phạm vi nâng cấp từ Đồ án Cơ sở
- Chốt tên đề tài và mục tiêu cốt lõi: **"SinhVien-Market: Hệ thống giao dịch cho sinh viên ứng dụng AI đa phương thức để tìm kiếm và ghép nối nhu cầu – sản phẩm"**.
- Rà soát toàn bộ mã nguồn bản Đồ án Cơ sở (`sinhvien-market-php`), lập tài liệu khảo sát [`docs/AUTH_SCREENS.md`](./AUTH_SCREENS.md) và ghi nhận **12 điểm chưa đồng nhất** về quy tắc xác thực, phân quyền, giao diện và trải nghiệm tìm kiếm.
- Xác định 3 trụ cột nâng cấp chính của Đồ án Chuyên ngành:
  1. **Tái cấu trúc giao diện & kiến trúc tách lớp (Decoupled Frontend/Backend)** với Next.js 16 và RESTful JSON API.
  2. **Ứng dụng AI đa phương thức (Văn bản + Hình ảnh)** để tìm kiếm và ghép nối hai chiều `REQUEST – OFFER` kèm gợi ý điều chỉnh điều kiện thông minh (**Counterfactual Recommendation**).
  3. **Mở rộng thành Hệ sinh thái Giao dịch & Quản lý Ký túc xá (KTX)** toàn diện thay vì chỉ là website đăng tin bán hàng đơn thuần.

### 2.2. Thống kê những thay đổi về công nghệ

| Thành phần | Công nghệ cũ (Đồ án Cơ sở) | Công nghệ mới (Đồ án Chuyên ngành) | Lý do & Lợi ích nâng cấp |
|---|---|---|---|
| **Frontend UI** | PHP Views (SSR thuần) + CSS rời rạc | **Next.js 16 (App Router) + React 19 + TypeScript (`strict`) + Tailwind CSS 4** | Phản hồi tức thì phía Client, kiểm tra kiểu dữ liệu chặt chẽ, tái sử dụng Component đồng nhất. |
| **Quản lý Form & Validate** | Kiểm tra thủ công rải rác bằng JS/PHP | **React Hook Form + Zod Schema** | Hiển thị đồng thời đầy đủ lỗi trên mọi trường dữ liệu với độ trễ `< 20ms`, đồng bộ quy tắc giữa Client và Server. |
| **Giao tiếp Backend** | Form POST truyền thống + Session Redirect | **RESTful JSON API (`ApiController`, `PostResponseJson`) + Dual-mode API Client (`USE_MOCK`)** | Cho phép phát triển và kiểm thử độc lập giữa Frontend, Backend PHP và dịch vụ AI. |
| **Tìm kiếm & Ghép nối** | Truy vấn SQL `LIKE '%keyword%'` thuần từ khóa | **AI Đa phương thức (Multimodal Embedding: Văn bản + Hình ảnh) & Counterfactual Engine** | Hiểu ngữ nghĩa tự nhiên, tìm sản phẩm bằng hình ảnh mẫu và gợi ý nới điều kiện mềm khi không có kết quả khớp 100%. |
| **Kiểm thử tự động** | Kiểm thử thủ công trên trình duyệt | **Vitest (Unit Test) + Playwright (E2E & Performance) + PHPUnit (Backend)** | Tự động hóa kiểm thử hồi quy và kiểm soát thời gian tải trang `<= 2000ms`. |

### 2.3. Chỉnh sửa FrontEnd, BackEnd theo công nghệ mới
- **Khởi tạo nền tảng Frontend (`sinhvien-market-next/frontend/`)**:
  - Thiết lập cấu hình `Next.js 16`, `TypeScript strict`, `Tailwind CSS 4`, bộ font `Plus Jakarta Sans` & `JetBrains Mono`, hỗ trợ chuyển đổi giao diện Sáng/Tối.
  - Xây dựng bộ UI Component dùng chung: `Button`, `Input`, `PasswordInput`, `Select`, `Alert`, `Card`, `Spinner`, `Logo`, `ThemeToggle` và khung `AuthShell`.
  - Xây dựng tầng giao tiếp API (`lib/api/client.ts`, `lib/api/auth.ts`) và bộ Schema kiểm tra dữ liệu (`lib/validation/auth.ts`) kèm thanh đo độ mạnh mật khẩu 4 mức.
  - Triển khai đợt 1 các màn hình xác thực sinh viên: Đăng nhập (`/login`), Đăng ký (`/register`), Quên mật khẩu 2 bước (`/forgot-password`).
- **Chỉnh sửa tầng phản hồi Backend**:
  - Bổ sung chuẩn hóa phản hồi JSON (`core/ApiController.php`, `core/PostResponseJson.php`) và soạn thảo hợp đồng tích hợp [`docs/AUTH_API_CONTRACT.md`](./AUTH_API_CONTRACT.md).

### 2.4. Lên kế hoạch chỉnh sửa lâu dài
- Thống nhất lộ trình thực hiện Đồ án Chuyên ngành theo từng tuần (Tuần 1 → Tuần 12):
  - **Tuần 1 – Tuần 2**: Hoàn thiện nền tảng Frontend/Backend, cụm màn hình Xác thực & Phân quyền, cập nhật Database ban đầu, phân công nhiệm vụ và khảo sát mô hình Embedding.
  - **Tuần 3**: Thiết kế cấu trúc `REQUEST – OFFER`, bổ sung tính năng tiện ích mới cho dự án, thiết lập môi trường Python/FastAPI và đánh giá thời gian xử lý & chi phí của từng phương án AI.
  - **Tuần 4**: Xây dựng giao diện và kiểm thử lần 1 cho `REQUEST – OFFER`, mở rộng Database KTX, xây dựng phân hệ quản lý toàn bộ KTX và tối ưu hóa giao diện.
  - **Tuần 5**: Xây dựng hệ thống quản lý phí, hóa đơn và thông tin chung KTX, hoàn thiện AI Matching baseline, kiểm thử API Marketplace và tích hợp đồng bộ vào Frontend.
  - **Tuần 6 – Tuần 12**: Kiểm thử tích hợp toàn hệ thống, tối ưu hiệu năng và hoàn thiện cuốn báo cáo tổng kết Đồ án Chuyên ngành.
