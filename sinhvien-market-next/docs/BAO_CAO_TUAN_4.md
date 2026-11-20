# BÁO CÁO TIẾN ĐỘ ĐỒ ÁN CHUYÊN NGÀNH — TUẦN LỄ 4 (02/11/2026 – 08/11/2026)

- **Trường / Khoa**: Trường Đại học Công nghệ TP.HCM (HUTECH) — Khoa Công nghệ Thông tin
- **Biểu mẫu theo dõi**: `BM03/QT05/ĐT-KT`
- **Tên đề tài**: **SinhVien-Market: Hệ thống giao dịch cho sinh viên ứng dụng AI đa phương thức để tìm kiếm và ghép nối nhu cầu – sản phẩm.**
- **Giảng viên hướng dẫn**: **GV. Dương Thành Phết**
- **Nhóm sinh viên thực hiện**:
  1. **Lê Lương Đại Hợp** — MSSV: `2380600761` — Lớp: `23DTHC1`
  2. **Nguyễn Bảo Trân** — MSSV: `2380602295` — Lớp: `23DTHC1`
- **Ngành**: Công nghệ thông tin — **Chuyên ngành**: Công nghệ phần mềm
- **Thời gian thực hiện**: **Tuần lễ 4 (`02/11/2026 – 08/11/2026`)**

---

## 1. Nội dung công việc theo Phiếu theo dõi tiến độ (Tuần 4)

| STT | Nội dung đăng ký trên Phiếu theo dõi (`BM03/QT05/ĐT-KT`) | Tài liệu / Mã nguồn kết quả | Trạng thái |
|---|---|---|---|
| 1 | **Xây dựng giao diện và kiểm thử lần 1 cho REQUEST – OFFER** | `app/requests/page.tsx`, `app/marketplace/matching/page.tsx`, `lib/matching/engine.ts`, `tests/unit/matching.test.ts` | ✅ Hoàn thành |
| 2 | **Bổ sung database cho dự án** | `database/migrations/20261104_ktx_foundation.sql`, `20261104_ktx_operations.sql`, `lib/data/offers.json`, `lib/data/requests.json` | ✅ Hoàn thành |
| 3 | **Xây dựng 1 vài tính năng mới cho phép quản lý toàn bộ KTX thay vì là web bán hàng đơn thuần** | `app/residence/*`, `app/rentals/page.tsx`, `app/admin/residence/*`, `docs/KTX_PLATFORM_FOUNDATION.md` | ✅ Hoàn thành |
| 4 | **Tối ưu hóa giao diện.** | Đồng bộ hệ màu **Xanh dương – Trắng**, `MainShell.tsx`, `KtxPageHeader.tsx`, `AdminKtxHeader.tsx`, `FlowFrame.tsx` | ✅ Hoàn thành |

---

## 2. Chi tiết kết quả thực hiện trong Tuần 4

### 2.1. Xây dựng giao diện và kiểm thử lần 1 cho REQUEST – OFFER
- **Giao diện Đăng tin Cần mua & Ghép nối AI (`/requests` và `/marketplace/matching`)**:
  - Cho phép sinh viên đăng nhu cầu tìm mua đồ dùng KTX kèm **Hình ảnh mẫu tham chiếu**, chọn từng tiêu chí (Danh mục, Ngân sách tối đa, Tình trạng tối thiểu, Khu vực KTX, Hình thức giao dịch) ở chế độ **Tiêu chí cố định (`hard`)** hoặc **Có thể linh hoạt (`soft`)**.
  - Hiển thị danh sách sản phẩm (`OFFER`) phù hợp nhất kèm **Huy hiệu `% Độ phù hợp`**, các thẻ giải thích lý do khớp ngữ nghĩa/thị giác và hộp **Gợi ý điều chỉnh thông minh từ AI (Counterfactual Recommendation)** có nút *"Áp dụng gợi ý này"* 1 chạm.
- **Kiểm thử lần 1 cho REQUEST – OFFER**:
  - Xây dựng bộ kiểm thử đơn vị `tests/unit/matching.test.ts` (`6/6` bài test đạt) và kiểm thử luồng E2E `tests/e2e/matching-flows.spec.ts`:
    - Kiểm chứng bảo toàn 100% điều kiện bắt buộc (`hard`): tuyệt đối không gợi ý sản phẩm vượt ngân sách cứng hoặc sai danh mục cứng.
    - Kiểm chứng cơ chế Counterfactual: khi nới điều kiện mềm (`soft`), hệ thống tự động tìm ra phương án thay thế tối ưu gần nhất.
    - Bổ sung bộ lọc nhóm khái niệm (`QUERY_CONCEPT_GROUPS`) giúp tìm đúng từng loại vật phẩm chuyên biệt (VD: tìm *"sách Giải tích"* không bị lẫn sách lập trình hay ngoại ngữ cùng danh mục).

### 2.2. Bổ sung Database cho dự án
- Thiết kế và triển khai các bản Migration mở rộng cơ sở dữ liệu Ký túc xá:
  - `database/migrations/20261104_ktx_foundation.sql`: Bổ sung các bảng quản lý Tòa nhà (`ktx_buildings`), Tầng/Phòng ở (`ktx_rooms`), Giường lưu trú (`ktx_beds`), Đơn đăng ký lưu trú (`residence_applications`) và Hợp đồng nội trú (`residence_contracts`).
  - `database/migrations/20261104_ktx_operations.sql`: Bổ sung các bảng Phiếu yêu cầu sửa chữa/bảo trì (`maintenance_requests`), Lịch sử lưu trú (`stay_history`), Mặt bằng tiện ích cho thuê (`rental_spaces`) và Đơn đăng ký thuê mặt bằng (`rental_applications`).
- Chuẩn hóa bộ dữ liệu sản phẩm và nhu cầu KTX (`lib/data/offers.json` gồm `44 OFFER`, `lib/data/requests.json` gồm `31 REQUEST` cùng bộ ảnh thật tại `public/demo-matching/images/`), loại bỏ hoàn toàn các mặt hàng không phù hợp với môi trường nội khu KTX (như xe cộ).

### 2.3. Xây dựng các tính năng mới cho phép quản lý toàn bộ KTX thay vì là web bán hàng đơn thuần
Mở rộng hệ thống từ sàn mua bán đồ cũ thành **Nền tảng Giao dịch Sinh viên & Quản lý Ký túc xá hợp nhất**:
1. **Phân hệ Lưu trú KTX cho Sinh viên (`/residence`)**:
   - Đăng ký phòng mới, xin gia hạn hợp đồng, xin chuyển phòng hoặc trả phòng trực tuyến; theo dõi trạng thái hồ sơ (*Chờ xét duyệt, Đã duyệt, Đang hiệu lực*) và thông tin Tòa/Phòng/Giường hiện tại.
2. **Phân hệ Dịch vụ & Báo hỏng kỹ thuật (`/residence/services`)**:
   - Gửi yêu cầu sửa chữa điện, nước, quạt, đèn, giường tủ trong phòng KTX kèm 3 mẫu điền nhanh; hệ thống tự động phân loại nhóm kỹ thuật và mức độ ưu tiên (*Khẩn cấp / Cao / Trung bình*).
3. **Trợ lý Hỏi đáp Nội quy KTX (`/residence/assistant`)**:
   - Tra cứu tức thì quy định giờ giấc đóng/mở cổng, thiết bị điện được phép sử dụng trong phòng, quy định tiếp khách và thủ tục lưu trú kèm 5 câu hỏi gợi ý 1 chạm.
4. **Cổng Thuê Mặt bằng Dịch vụ Sinh viên (`/rentals`)**:
   - Xem danh sách mặt bằng ki-ốt, quầy dịch vụ sinh viên trong khuôn viên KTX (diện tích $\text{m}^2$, giá thuê/tháng, vị trí) và gửi hồ sơ đăng ký thuê trực tiếp.
5. **Phân hệ Quản trị KTX dành cho Ban Quản lý (`/admin/residence`, `/admin/residence/operations`)**:
   - Xét duyệt hồ sơ lưu trú, xếp giường trực quan theo sơ đồ **Tòa → Tầng → Phòng → Giường**, khởi tạo phòng mới và điều phối xử lý phiếu bảo trì kỹ thuật.

### 2.4. Tối ưu hóa giao diện
- Chuyển đổi và đồng bộ toàn bộ giao diện ứng dụng sang bảng màu **Xanh dương – Trắng (`#2563eb`, `#1d4ed8`, `#0284c7`)** hiện đại, rõ ràng, tạo cảm giác tin cậy của cổng thông tin đại học & ký túc xá.
- Thiết kế khung điều hướng chuyên biệt `KtxPageHeader` (cho sinh viên) và `AdminKtxHeader` (tích hợp trong `AdminShell` cho quản trị viên) giúp chuyển đổi mượt mà giữa các phân hệ KTX.
- Chuẩn hóa bộ chọn ngày tháng hiển thị định dạng tiếng Việt `dd/mm/yyyy` (`DateFieldVi`) và tối ưu bố cục đáp ứng (Responsive) không bị tràn ngang hay rớt chữ trên mọi kích thước màn hình từ Mobile tới Desktop.
