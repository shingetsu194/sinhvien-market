# BÁO CÁO TIẾN ĐỘ ĐỒ ÁN CHUYÊN NGÀNH — TUẦN LỄ 5 (09/11/2026 – 15/11/2026)

- **Trường / Khoa**: Trường Đại học Công nghệ TP.HCM (HUTECH) — Khoa Công nghệ Thông tin
- **Biểu mẫu theo dõi**: `BM03/QT05/ĐT-KT`
- **Tên đề tài**: **SinhVien-Market: Hệ thống giao dịch cho sinh viên ứng dụng AI đa phương thức để tìm kiếm và ghép nối nhu cầu – sản phẩm.**
- **Giảng viên hướng dẫn**: **GV. Dương Thành Phết**
- **Nhóm sinh viên thực hiện**:
  1. **Lê Lương Đại Hợp** — MSSV: `2380600761` — Lớp: `23DTHC1`
  2. **Nguyễn Bảo Trân** — MSSV: `2380602295` — Lớp: `23DTHC1`
- **Ngành**: Công nghệ thông tin — **Chuyên ngành**: Công nghệ phần mềm
- **Thời gian thực hiện**: **Tuần lễ 5 (`09/11/2026 – 15/11/2026`)**

---

## 1. Nội dung công việc theo Phiếu theo dõi tiến độ (Tuần 5)

| STT | Nội dung đăng ký trên Phiếu theo dõi (`BM03/QT05/ĐT-KT`) | Tài liệu / Mã nguồn kết quả | Trạng thái |
|---|---|---|---|
| 1 | **Xây dựng hệ thống quản lý phí, hóa đơn và thông tin chung** | `app/residence/finance/page.tsx`, `app/residence/announcements/page.tsx`, `app/admin/residence/finance/page.tsx`, `app/admin/residence/dashboard/page.tsx`, `20261113_week9_12_finance_notices_matching.sql` | ✅ Hoàn thành |
| 2 | **Hoàn thiện AI Matching baseline** | `lib/matching/engine.ts`, `lib/api/marketplace.ts`, `app/admin/marketplace/matching/page.tsx`, `20261114_week13_14_local_intelligence.sql` | ✅ Hoàn thành |
| 3 | **Kiểm thử API Marketplace** | `tests/Unit/*Test.php` (9 bộ PHPUnit test), `tests/unit/*.test.ts` (54/54 bài Vitest đạt 100%), nâng cấp bảo mật `Next.js 16.4.6` (`0 vulnerabilities`) | ✅ Hoàn thành |
| 4 | **Tích hợp vào frontend** | Tích hợp **Tìm kiếm AI Đa phương thức (Văn bản & Hình ảnh)** trực tiếp vào thanh tìm kiếm Navbar (`MainShell.tsx`) và Chợ Sản phẩm (`app/products/page.tsx`), hoàn thiện đồng bộ toàn bộ màn hình User & Admin | ✅ Hoàn thành |

---

## 2. Chi tiết kết quả thực hiện trong Tuần 5

### 2.1. Xây dựng hệ thống quản lý phí, hóa đơn và thông tin chung
- **Quản lý Phí & Hóa đơn KTX (`/residence/finance` & `/admin/residence/finance`)**:
  - **Phía Sinh viên (`/residence/finance`)**: Hiển thị 3 thẻ KPI tổng hợp (*Tổng phát sinh, Đã thanh toán, Còn phải đóng*), bảng chi tiết từng khoản thu (tiền phòng KTX, điện, nước, phí dịch vụ), lịch sử giao dịch và tính năng thanh toán trực tuyến có nút *"Điền số tiền còn nợ"* 1 chạm.
  - **Phía Quản trị viên (`/admin/residence/finance` & `/admin/residence/dashboard`)**: Thống kê tỷ lệ thu phí toàn KTX, phát hành hóa đơn mới theo hợp đồng lưu trú, ghi nhận giao dịch thanh toán của sinh viên và ban hành thông báo vận hành trực tiếp.
  - **Bảo mật Thanh toán Backend**: Triển khai xác thực chữ ký giao dịch và chống giả mạo Webhook (`PaymentSignatureTest.php`, `PaymentWebhookGuardTest.php`, `PaymentWebhookProcessorTest.php`).
- **Hệ thống Thông tin chung & Bảng tin KTX (`/residence/announcements`)**:
  - Cung cấp bảng tin tập trung cho sinh viên nội trú với bộ lọc theo phân loại (*Tất cả / Thông báo / Sự kiện / Nội quy*), tìm kiếm từ khóa tức thì và đánh dấu thông báo quan trọng từ Ban Quản lý.

### 2.2. Hoàn thiện AI Matching Baseline
- **Chuẩn hóa thuật toán AI Matching Đa phương thức (`lib/api/marketplace.ts` & `lib/matching/engine.ts`)**:
  - Kết hợp **So khớp ngữ nghĩa văn bản tự nhiên** (tự động bóc tách ràng buộc giá như *"dưới 80k"*, *"dưới 500k"* ngay trong câu tìm kiếm) với **Đối sánh đặc trưng thị giác hình ảnh mẫu** (nhận diện qua chữ ký màu RGB `8x8` trên `<canvas>` kết hợp kho ảnh tham chiếu và Multimodal Embedding).
  - Xây dựng bộ quy tắc khóa khái niệm sản phẩm (`PRODUCT_CONCEPT_RULES` gồm 9 nhóm vật phẩm đặc trưng KTX: *Đèn bàn học, Bàn phím cơ, Tai nghe, Ấm đun siêu tốc, Máy tính Casio, Đàn Guitar, Giáo trình Giải tích, Giáo trình Lập trình, Bàn học gấp gọn*), đảm bảo tìm bằng ảnh hoặc câu mô tả trả về chính xác 100% đúng loại sản phẩm (**Độ phù hợp lên tới 99%**), không bị nhiễu bởi các từ chung như *"bàn"* hay *"học"*.
  - Tích hợp cơ chế **Gợi ý điều chỉnh thông minh Counterfactual AI** ngay khi bộ lọc quá chặt (chưa có sản phẩm khớp), đề xuất nới lỏng điều kiện giá/tình trạng/danh mục chỉ với 1 cú nhấp chuột.
- **Màn hình Quản trị AI Matching (`/admin/marketplace/matching`)**:
  - Cho phép Admin theo dõi tổng số sản phẩm đã đồng bộ Vector Embedding, kích hoạt đồng bộ lại (`Rebuild Embeddings`) và chạy kiểm thử truy vấn ghép nối trực tiếp trên bảng điều khiển.

### 2.3. Kiểm thử API Marketplace & Toàn hệ thống
- **Kiểm thử Unit Test Frontend (`npx vitest run`)**:
  - Đạt tuyệt đối **`54 / 54` bài kiểm thử (100%)** trên 3 bộ test:
    - `tests/unit/validation.test.ts`: `30/30` test (Xác thực & Độ mạnh mật khẩu).
    - `tests/unit/admin-validation.test.ts`: `18/18` test (Nghiệp vụ Quản trị, Phạt Gậy 3 mức, Slug tiếng Việt, Xuất CSV).
    - `tests/unit/matching.test.ts`: `6/6` test (Ràng buộc cứng `hard`, gợi ý `Counterfactual`, xếp hạng `REQUEST – OFFER`).
- **Kiểm thử Unit Test Backend (`tests/Unit/*Test.php`)**:
  - Hoàn thiện 9 bộ kiểm thử PHPUnit cho dịch vụ AI nội bộ và KTX: `LocalMarketplaceEmbeddingServiceTest`, `LocalDormRulesAssistantTest`, `LocalRepairClassifierTest`, `ResidenceApplicationTest`, `ResidenceOperationsTest`, `ResidenceAiAuthorizationPolicyTest`, `PaymentSignatureTest`, `PaymentWebhookGuardTest`, `PaymentWebhookProcessorTest`.
- **Kiểm tra tĩnh & Bảo mật**:
  - `npx tsc --noEmit`: `0` lỗi kiểu dữ liệu TypeScript.
  - `npx eslint .`: `0` lỗi, `0` cảnh báo.
  - Nâng cấp `next` và `eslint-config-next` lên phiên bản `16.4.6` (`npm audit --omit=dev` đạt **`0 vulnerabilities`**).

### 2.4. Tích hợp vào Frontend
- **Tích hợp AI trực tiếp vào Thanh tìm kiếm chính (`MainShell.tsx` & `app/products/page.tsx`)**:
  - Tinh gọn thanh điều hướng chính và tích hợp trực tiếp **Tìm kiếm AI Đa phương thức** (ô nhập ngôn ngữ tự nhiên + nút tải ảnh `📷` + khay 5 ảnh mẫu thử nhanh 1 chạm + chip gợi ý truy vấn thông minh) ngay trên thanh tìm kiếm trung tâm của Navbar và trang **Chợ Sản phẩm (`/products`)**.
  - Hiển thị trực quan huy hiệu `✨ Phù hợp X%` ở góc dưới ảnh sản phẩm và các thẻ lý do khớp (`Khớp thị giác ảnh mẫu AI`, `Khớp ngữ nghĩa & tên SP`, `Trong ngân sách ≤ ...`) trên từng thẻ sản phẩm.
- **Hoàn thiện đồng bộ toàn bộ giao diện Người dùng & Quản trị**:
  - Hoàn tất giao diện đồng bộ tông **Xanh dương – Trắng** trên tất cả các trang: Trang chủ (`/`), Chợ sản phẩm & Tìm kiếm AI (`/products`, `/products/[id]`, `/products/create`), Tin cần mua (`/requests`), Lưu trú & Tài chính KTX (`/residence/*`, `/rentals`), Cổng cá nhân (`/dashboard`, `/my-listings`, `/wishlist`, `/transactions`, `/profile`, `/rewards`, `/leaderboard`) và toàn bộ 18 trang Quản trị viên (`/admin/*`).
