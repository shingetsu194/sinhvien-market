# BÁO CÁO TIẾN ĐỘ ĐỒ ÁN CHUYÊN NGÀNH — TUẦN LỄ 3 (26/10/2026 – 01/11/2026)

- **Trường / Khoa**: Trường Đại học Công nghệ TP.HCM (HUTECH) — Khoa Công nghệ Thông tin
- **Biểu mẫu theo dõi**: `BM03/QT05/ĐT-KT`
- **Tên đề tài**: **SinhVien-Market: Hệ thống giao dịch cho sinh viên ứng dụng AI đa phương thức để tìm kiếm và ghép nối nhu cầu – sản phẩm.**
- **Giảng viên hướng dẫn**: **GV. Dương Thành Phết**
- **Nhóm sinh viên thực hiện**:
  1. **Lê Lương Đại Hợp** — MSSV: `2380600761` — Lớp: `23DTHC1`
  2. **Nguyễn Bảo Trân** — MSSV: `2380602295` — Lớp: `23DTHC1`
- **Ngành**: Công nghệ thông tin — **Chuyên ngành**: Công nghệ phần mềm
- **Thời gian thực hiện**: **Tuần lễ 3 (`26/10/2026 – 01/11/2026`)**

---

## 1. Nội dung công việc theo Phiếu theo dõi tiến độ (Tuần 3)

| STT | Nội dung đăng ký trên Phiếu theo dõi (`BM03/QT05/ĐT-KT`) | Tài liệu / Mã nguồn kết quả | Trạng thái |
|---|---|---|---|
| 1 | **Thiết kế cấu trúc REQUEST – OFFER** | `docs/AI_REQUEST_OFFER_SPEC.md`, `docs/AI_MATCHING_API_CONTRACT.md`, `lib/types/matching.ts` | ✅ Hoàn thành |
| 2 | **Bổ sung thêm các tính năng mới cho dự án như: mua đồ ăn nhanh, mua gói thành viên cho 1 số dịch vụ,....** | Mở rộng danh mục dịch vụ & tiện ích đời sống sinh viên, Đổi thưởng (`/rewards`), Đấu giá ngược, Giveaway (`/admin/giveaway-spin`) & 13 màn hình Quản trị (`/admin/*`) | ✅ Hoàn thành |
| 3 | **Thiết lập môi trường Python và FastAPI** | `sinhvien-market-next/ai-lab/` (`matching_core.py`, `run_benchmark.py`, Vector Cache & API Key Rotator) | ✅ Hoàn thành |
| 4 | **Kiểm tra thời gian xử lý và chi phí của từng phương án** | `docs/BAO_CAO_SO_SANH_EMBEDDING.md`, `tests/e2e/admin-flows.spec.ts` | ✅ Hoàn thành |

---

## 2. Chi tiết kết quả thực hiện trong Tuần 3

### 2.1. Thiết kế cấu trúc REQUEST – OFFER
- Xây dựng đặc tả kỹ thuật [`docs/AI_REQUEST_OFFER_SPEC.md`](./AI_REQUEST_OFFER_SPEC.md) và hợp đồng giao tiếp API [`docs/AI_MATCHING_API_CONTRACT.md`](./AI_MATCHING_API_CONTRACT.md).
- Thiết kế cấu trúc thực thể song phương:
  - **OFFER (Nguồn cung / Sản phẩm đăng bán)**: gồm `id`, `title`, `description`, `category`, `price`, `condition` (`new` / `like_new` / `used`), `campusZone` (Khu A, Khu B, Cổng chính...), `transactionType` (`sale` / `exchange` / `auction`), `imageUrl`, `embeddingVector`.
  - **REQUEST (Nhu cầu tìm mua / trao đổi của sinh viên)**: gồm mô tả ngữ nghĩa tự nhiên, hình ảnh mẫu tham chiếu (`referenceImage`) và tập ràng buộc có gắn nhãn chế độ **`hard` (bắt buộc thỏa mãn 100%)** hoặc **`soft` (ưu tiên, cho phép hệ thống AI đề xuất nới lỏng có giải thích — Counterfactual Recommendation)**.
- Thiết kế công thức chấm điểm tổng hợp:
  $$\text{Score}(R, O) = w_{\text{sem}} \cdot \text{Sim}_{\text{multimodal}}(R, O) + w_{\text{soft}} \cdot \text{SoftMatch}(R, O)$$
  trong đó mọi `OFFER` vi phạm bất kỳ điều kiện `hard` nào đều bị loại ngay ở bước lọc cứng (`Hard Constraint Violation = 0`).

### 2.2. Bổ sung thêm các tính năng mới cho dự án
- Mở rộng các tính năng phục vụ đời sống và nhu cầu dịch vụ của sinh viên nội khu:
  - Hỗ trợ giao dịch đa hình thức: **Mua bán trực tiếp**, **Đấu giá ngược (giá giảm tự động theo thời gian đến giá sàn)**, **Trao đổi đồ dùng KTX**, cùng các nhóm dịch vụ tiện ích sinh viên (đặt mua đồ ăn nhanh nội khu, gói thành viên dịch vụ học tập/giải trí hợp lệ, thuê mặt bằng sinh viên) và cơ chế kiểm duyệt chặn kinh doanh tài khoản chia sẻ trái phép.
  - Bổ sung phân hệ **Đổi quà & Điểm thưởng uy tín (`/rewards`)**, **Bảng xếp hạng sinh viên tích cực (`/leaderboard`)** và **Vòng quay may mắn Giveaway (`/admin/giveaways`, `/admin/giveaway-spin`)**.
- Hoàn thiện trọn bộ **13/13 màn hình Quản trị viên (`/admin/*`)** trên Next.js 16 (Dashboard, Kiểm duyệt bài đăng, Quản lý danh mục, Banner, Quản lý người dùng & Phạt Gậy `1/2/3+`, Hồ sơ 360°, Lịch sử vi phạm, Báo cáo doanh thu, Tố cáo vi phạm, Kiểm duyệt đánh giá, Giveaways, Vòng quay thưởng, Nhật ký bảo mật Read-only Audit Trail) cùng `18/18` bài Unit Test nghiệp vụ Admin (`tests/unit/admin-validation.test.ts`).

### 2.3. Thiết lập môi trường Python và FastAPI
- Khởi tạo môi trường thực nghiệm AI tại `sinhvien-market-next/ai-lab/` với Python, FastAPI và các thư viện xử lý vector (`numpy`, `httpx`, `Pillow`).
- Xây dựng cơ chế **Xoay vòng khóa API (`Key Rotator`)** và **Bộ nhớ đệm Vector (`Vector Cache`)** theo khóa `(item_id, model_id, model_version, content_hash)` giúp lưu trữ bền vững vector đã nhúng, giảm thời gian truy vấn lặp lại xuống mức mili-giây và tiết kiệm tối đa hạn ngạch gọi API.

### 2.4. Kiểm tra thời gian xử lý và chi phí của từng phương án

Nhóm đã tiến hành đo đạc thực tế trên tập dữ liệu thử nghiệm (`44 OFFER × 31 REQUEST`) đối với 5 phương án:

| Phương án / Mô hình | Số chiều Vector | Thời gian tạo Vector trung bình / mục | Thời gian truy vấn & xếp hạng (sau Cache) | Chi phí vận hành (API / Hạ tầng) | Độ chính xác P@1 (Tổng) | Độ chính xác P@1 (Truy vấn có Ảnh) |
|---|---:|---:|---:|---|---:|---:|
| **B1 — Keyword BM25 (Tiếng Việt)** | N/A | `0 ms` (chỉ mục từ khóa) | **`< 5 ms`** | **Miễn phí (0đ)** — chạy nội bộ trên CPU | 68.2% | 0.0% |
| **B2 — Gemini Text-Only** | `768d` | `~210 ms / mục` | **`~12 ms`** | Rất thấp (Free Tier / Pay-as-you-go nhẹ) | 81.8% | 40.0% |
| **B2 — Jina Text-Only** | `1024d` | `~185 ms / mục` | **`~14 ms`** | Miễn phí hạn ngạch đầu (`1M tokens`) | 77.3% | 0.0% |
| **M1 — Gemini Embedding 2 (Multimodal)** | `768d` | `~320 ms / mục` (Text + Ảnh) | **`~15 ms`** | Thấp — tối ưu bằng Vector Cache bền vững | 95.5% | **100.0%** |
| **M2 — Jina-CLIP-v2 (Multimodal)** | `1024d` | `~280 ms / mục` (Text + Ảnh) | **`~16 ms`** | Thấp — hỗ trợ tốt cả Cloud API & Local | **100.0%** | **100.0%** |

- **Kết luận đánh giá kỹ thuật & chi phí**:
  - Việc kết hợp **Pre-computed Vector Cache** cho toàn bộ `OFFER` đang bán cùng **Local Concept & Visual Baseline** giúp thời gian phản hồi tìm kiếm và ghép nối thực tế trên giao diện Web luôn đạt **`< 50 ms`** với chi phí vận hành gần như bằng `0` cho các truy vấn lặp lại.
  - Kiểm thử tốc độ tải toàn bộ các màn hình bằng Playwright (`tests/e2e/admin-flows.spec.ts`) đều đạt dưới ngưỡng **`<= 2000 ms`**.
