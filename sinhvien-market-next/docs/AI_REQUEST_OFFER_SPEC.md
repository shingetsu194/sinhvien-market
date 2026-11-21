# Đặc tả Kỹ thuật: Hệ thống Ghép nối AI REQUEST – OFFER & Gợi ý Thay đổi Điều kiện

Tài liệu này cụ thể hóa thiết kế từ báo cáo đề tài *SinhVienMarket: Hệ thống giao dịch sinh viên ứng dụng AI đa phương thức để tìm kiếm và ghép nối nhu cầu – sản phẩm* thành quy tắc tính toán xác định, phục vụ đồng thời thực nghiệm đánh giá mô hình (`sinhvien-market-next/ai-lab`) và giao diện web (`sinhvien-market-next/frontend`).

---

## 1. Cấu trúc dữ liệu chuẩn

### 1.1 OFFER (Sản phẩm đăng bán / trao đổi / đấu giá ngược)
| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | `string` | Có | Mã định danh duy nhất (VD: `O01`..`O44`) |
| `title` | `string` | Có | Tiêu đề tin đăng của người bán |
| `description` | `string` | Có | Mô tả chi tiết tự do |
| `image` | `string \| null` | Không | Đường dẫn tới tối đa 1 ảnh chính đã duyệt |
| `category` | `CategorySlug` | Có | `sach` \| `dien_tu` \| `hoc_tap` \| `gia_dung` \| `thoi_trang` \| `phuong_tien` \| `nhac_cu` |
| `type` | `OfferType` | Có | `sale` (bán) \| `exchange` (đổi đồ, `price = null`) \| `auction` (đấu giá ngược) |
| `price` | `number \| null` | Tùy loại | Giá VND (`> 0` với `sale`/`auction`, `null` với `exchange`) |
| `condition` | `ConditionLevel` | Có | `new` (Mới 100%) \| `like_new` (Như mới 90%+) \| `used` (Đã qua sử dụng) |
| `location` | `LocationCode` | Có | `ktx_a` (KTX Khu A) \| `ktx_b` (KTX Khu B) \| `ngoai_ktx` (Ngoài KTX / Khu trọ) |

### 1.2 REQUEST (Nhu cầu tìm mua / trao đổi của sinh viên)
| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | `string` | Có | Mã định danh nhu cầu (VD: `R01`..`R31`) |
| `text` | `string` | Có | Mô tả nhu cầu tự nhiên của người mua |
| `image` | `string \| null` | Không | Ảnh mẫu tham khảo (nếu người mua tìm món giống hình) |
| `category` | `CategorySlug \| null` | Không | Danh mục mong muốn (`null` = tìm toàn sàn) |
| `budget_max` | `number \| null` | Không | Ngân sách tối đa VND (`null` = không giới hạn giá) |
| `min_condition` | `ConditionLevel \| null` | Không | Tình trạng tối thiểu chấp nhận (`used < like_new < new`) |
| `location` | `LocationCode \| null` | Không | Khu vực giao dịch mong muốn |
| `allow_exchange` | `boolean` | Có | `true` nếu chấp nhận tin đổi đồ (`type = "exchange"`), mặc định `false` |
| `flags` | `Record<ConstraintKey, "hard" \| "soft">` | Có | Phân loại từng điều kiện thành **Bắt buộc (`hard`)** hoặc **Có thể nới lỏng (`soft`)** |

> **Quy tắc mặc định an toàn (Mục 4.4 Báo cáo):** Mọi điều kiện người dùng có nhập giá trị (`!= null`) nhưng không khai báo trong `flags` đều mặc định là **`hard` (bắt buộc)**. Hệ thống tuyệt đối không tự ý nới điều kiện khi người mua chưa cho phép.

---

## 2. Quy trình ghép nối và xếp hạng (Mục 5 Báo cáo)

### Bước 1: Lọc điều kiện bắt buộc (`Hard Filter`)
Một `OFFER` bị loại ngay khỏi tập ứng viên nếu vi phạm bất kỳ điều kiện nào sau đây:
1. **Tương thích loại giao dịch (`exchange`):** Nếu `offer.type == "exchange"` và `request.allow_exchange == false` -> Loại (không bao giờ coi `price = null` là `0đ`).
2. **Danh mục (`category` = `hard`):** `offer.category != request.category`.
3. **Ngân sách (`budget` = `hard`):** Với `offer.price != null`, `offer.price > request.budget_max`.
4. **Tình trạng (`condition` = `hard`):** Thứ tự `used (1) < like_new (2) < new (3)`; loại nếu `rank(offer.condition) < rank(request.min_condition)`.
5. **Vị trí (`location` = `hard`):** `offer.location != request.location`.

### Bước 2: Biểu diễn đa phương thức & Độ tương đồng ngữ nghĩa $S_{\text{sem}}(R, O)$
- Mỗi thực thể được nhúng vào không gian vector chung kèm định danh `model_id` và `model_version` để không bao giờ trộn lẫn không gian vector giữa hai mô hình khác nhau.
- Với thực thể có cả văn bản và ảnh chính, vector tổng hợp được chuẩn hóa đơn vị (L2-normalized) từ kết hợp có trọng số giữa vector văn bản và vector ảnh (hoặc đầu vào đa phương thức hợp nhất của mô hình):
  $$v_{\text{fused}} = \text{normalize}\big(\alpha \cdot v_{\text{text}} + (1 - \alpha) \cdot v_{\text{image}}\big)$$
  (Khi một chiều không có dữ liệu như `image = null`, dùng 100% chiều còn lại).
- Độ tương đồng ngữ nghĩa chuẩn hóa về đoạn $[0, 1]$:
  $$S_{\text{sem}}(R, O) = \max\big(0, \cos(v_R, v_O)\big)$$

### Bước 3: Chấm điểm điều kiện có cấu trúc $S_{\text{struct}}(R, O)$ & Tổng hợp
Các điều kiện có thể nới lỏng (`soft`) đóng góp vào điểm cấu trúc $S_{\text{struct}} \in [0, 1]$ trên 3 chiều (ngân sách, tình trạng, vị trí):
- **Ngân sách:** Đạt ngưỡng `<= budget_max` nhận `[0.85..1.00]` (ưu tiên giá tiết kiệm hơn); vượt ngưỡng `soft` bị giảm điểm tuyến tính theo tỷ lệ vượt.
- **Tình trạng:** Đạt từ `min_condition` trở lên nhận `[0.90..1.00]`; thấp hơn 1 bậc nhận `0.45`, thấp hơn 2 bậc nhận `0.20`.
- **Vị trí:** Khớp đúng khu vực nhận `1.00`; khác khu KTX liền kề (`ktx_a <-> ktx_b`) nhận `0.55`; lệch giữa KTX và ngoài KTX nhận `0.30`.

Điểm xếp hạng tổng hợp:
$$\text{TotalScore}(R, O) = 0.75 \cdot S_{\text{sem}}(R, O) + 0.25 \cdot S_{\text{struct}}(R, O)$$

### Bước 4: Giải thích kết quả xác định (Deterministic Explanation)
Mỗi cặp `REQUEST–OFFER` trả về cấu trúc giải thích tường minh từ chính bộ chấm điểm:
- `matched_conditions`: Danh sách điều kiện khớp (VD: *"Đúng danh mục Đồ điện tử"*, *"Trong ngân sách (720.000đ <= 800.000đ)"*, *"Tình trạng Như mới đạt yêu cầu"*).
- `unmatched_soft_conditions`: Các điều kiện `soft` chưa khớp hoàn toàn nhưng vẫn được giữ lại để người mua cân nhắc (VD: *"Khác khu vực ưu tiên: KTX Khu A so với KTX Khu B"*).
- Mô hình ngôn ngữ (nếu bật) chỉ viết lại các mục trên thành câu tự nhiên, không can thiệp điểm số hay thứ hạng.

---

## 3. Cơ chế Gợi ý Thay đổi Điều kiện — Counterfactual Recommendation (Mục 6 Báo cáo)

### Khi nào kích hoạt?
Kích hoạt khi **không có OFFER hợp lệ về ngữ nghĩa** ($S_{\text{sem}} \ge \tau_{\text{sem}}$) nào đáp ứng đồng thời toàn bộ điều kiện ban đầu (cả `hard` lẫn `soft`) của người mua.

### Tập biến đổi hữu hạn (chỉ áp dụng trên điều kiện `soft`)
1. **Ngân sách (`budget` = `soft`):** Thử tuần tự các bậc cố định `+50.000đ`, `+100.000đ`, `+150.000đ`, `+250.000đ` (giới hạn mức tăng không vượt quá `+50%` ngân sách gốc đối với món giá nhỏ, hoặc bậc phần trăm `+15%`, `+25%`, `+35%`).
2. **Tình trạng (`condition` = `soft`):** Hạ từng bậc `new -> like_new` (1 bậc), `new -> used` (2 bậc), `like_new -> used` (1 bậc).
3. **Vị trí (`location` = `soft`):** Mở rộng sang khu KTX lân cận (`ktx_a <-> ktx_b`, bậc 1) hoặc mở rộng toàn khu vực (`any`, bậc 2).
4. **Tổ hợp tối đa 2 điều kiện `soft`:** Chỉ thử khi nới 1 điều kiện đơn lẻ chưa tìm thấy kết quả hợp lệ.

### Quy tắc bất biến
- **Không bao giờ tự động vi phạm điều kiện `hard`.** Nếu nguyên nhân duy nhất khiến không có kết quả là một điều kiện `hard` (VD: `R06`, `R21`), hệ thống không sinh phương án vi phạm mà thông báo rõ điều kiện bắt buộc nào đang chặn để người mua chủ động quyết định.
- **Kiểm chứng thực trên dữ liệu:** Mọi phương án gợi ý đều phải chạy lại bộ lọc + kiểm tra ngưỡng ngữ nghĩa trên kho `OFFER` thực tế và chỉ hiển thị khi mở khóa được `>= 1` sản phẩm thực sự liên quan.
- **Thứ tự ưu tiên phương án:** Xếp tăng dần theo `(số điều kiện phải đổi, độ lớn bậc nới)` và giảm dần theo `(điểm phù hợp cao nhất đạt được, số sản phẩm mở khóa)`.

---

## 4. Thiết kế Thực nghiệm So sánh Mô hình (Benchmark)

So sánh 4 phương pháp trên cùng tập `44 OFFER` (`O01`–`O44`, gồm cả tin chỉ chữ và tin ảnh rõ + mô tả sơ sài) và `31 REQUEST` (`R01`–`R31`, gồm truy vấn đồng nghĩa, không dấu, ảnh mẫu tìm chữ, chữ tìm ảnh, chặn cứng và gợi ý nới điều kiện):

1. **B1 — Keyword Baseline:** Khớp từ khóa tiếng Việt chuẩn hóa dấu + BM25 trên tiêu đề & mô tả.
2. **B2 — Text-only Embedding:** Nhúng ngữ nghĩa chỉ dùng văn bản (`title + description` với `request.text`), bỏ qua ảnh.
3. **M1 — Gemini Embedding 2 (`gemini-embedding-2`):** Đa phương thức văn bản + ảnh qua Google AI Studio API trong cùng không gian vector.
4. **M2 — Jina-CLIP-v2 (`jinaai/jina-clip-v2`):** Đa phương thức văn bản + ảnh chạy cục bộ (local inference), hỗ trợ đa ngôn ngữ.

### Bộ chỉ số đánh giá
- **Nhóm truy vấn ghép nối (22 REQUEST có nguồn cung hợp lệ):** `Precision@1`, `Precision@3`, `Precision@5`, `Recall@5`, `MRR` (Mean Reciprocal Rank), phân tách thêm nhóm **Multimodal (`R26`–`R30`)** để thấy rõ chênh lệch giữa Text-only và Multimodal.
- **Nhóm gợi ý thay đổi điều kiện (6 REQUEST bị chặn bởi điều kiện `soft` + 3 REQUEST chặn `hard`/không có hàng):** Tỷ lệ khôi phục thành công (`Counterfactual Recovery Rate`), số điều kiện thay đổi trung bình, độ chính xác sản phẩm gợi ý (`CF P@1`), và tỷ lệ tuân thủ điều kiện bắt buộc (`Hard-Constraint Safety = 100%`).
- **Vận hành kỹ thuật:** Độ trễ trung bình mỗi truy vấn (`ms`), số chiều vector, dung lượng lưu trữ và khả năng chạy offline / chi phí API.
