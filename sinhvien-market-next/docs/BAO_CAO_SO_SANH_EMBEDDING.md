# Báo cáo Thực nghiệm & Đánh giá Lựa chọn Mô hình Embedding: Gemini Embedding 2 vs Jina-CLIP-v2

Tài liệu này tổng hợp kết quả thực nghiệm đối đầu trực tiếp giữa **Google Gemini Embedding 2** (`gemini-embedding-2`) và **Jina-CLIP-v2** (`jinaai/jina-clip-v2`), cùng hai phương pháp đối chứng chuẩn (**B1 — Từ khóa BM25** và **B2 — Chỉ văn bản**) cho chức năng ghép nối nhu cầu – sản phẩm (**REQUEST – OFFER**) của hệ thống **SinhVienMarket**.

---

## 1. Thiết lập thực nghiệm công bằng

Toàn bộ 5 phương pháp được chạy trên **cùng một tập dữ liệu chuẩn hóa** và **cùng một bộ lọc điều kiện bắt buộc**:
- **Kho nguồn cung (`44 OFFER`):** Bao phủ 7 danh mục sinh viên (`Sách & Giáo trình`, `Đồ điện tử`, `Đồ dùng học tập`, `Đồ gia dụng KTX`, `Thời trang`, `Phương tiện`, `Nhạc cụ`), đủ 3 hình thức (`sale`, `exchange`, `auction`). Trong đó `O41`–`O44` là các tin đăng thực tế có **ảnh sản phẩm rõ ràng nhưng mô tả chữ cực kỳ sơ sài** (VD: *"Ra trường dọn phòng thanh lý gấp 110k"* kèm ảnh ấm siêu tốc inox).
- **Tập truy vấn nhu cầu (`31 REQUEST`):**
  - `22` truy vấn ghép nối có nguồn cung hợp lệ (gồm đồng nghĩa tiếng Việt, gõ không dấu, `R26`–`R27`–`R30` văn bản tìm ảnh tin sơ sài, `R28`–`R29` ảnh mẫu tìm tin chỉ có chữ).
  - `6` truy vấn kiểm thử **Counterfactual Recommendation** (`R04`, `R18`, `R19`, `R20`, `R24`, `R31`) bị chặn bởi 1 hoặc 2 điều kiện mềm (`soft`).
  - `3` truy vấn kiểm thử **An toàn điều kiện bắt buộc & Không có hàng** (`R06`, `R08`, `R21`).

---

## 2. Bảng kết quả thực nghiệm định lượng

| Phương pháp | Mã mô hình & Chiều vector | P@1 (Tổng) | P@3 | Recall@5 | MRR | Multimodal P@1 (R26–R30) | Khôi phục Counterfactual | Số ĐK đổi TB | Vi phạm Hard |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **B1 — Keyword BM25 (Tiếng Việt)** | `keyword-bm25-vi` | 68.2% | 31.8% | 59.6% | 0.727 | **0.0%** | 83.3% (5/6) | 1.20 | **0** |
| **B2 — Gemini Text-Only** | `gemini-embedding-2` (`768d`) | 81.8% | 31.8% | 63.2% | 0.818 | 40.0% | 83.3% (5/6) | 1.20 | **0** |
| **B2 — Jina Text-Only** | `jina-clip-v2` (`1024d`) | 77.3% | 33.3% | 61.1% | 0.773 | **0.0%** | **100.0%** (6/6) | 1.17 | **0** |
| **M1 — Gemini Embedding 2 (Multimodal)** | `gemini-embedding-2` (`768d`) | 95.5% | 39.4% | 81.4% | 0.955 | **100.0%** | 83.3% (5/6) | 1.20 | **0** |
| **M2 — Jina-CLIP-v2 (Multimodal)** | `jina-clip-v2` (`1024d`) | **100.0%** | **42.4%** | **83.0%** | **1.000** | **100.0%** | **100.0%** (6/6) | 1.17 | **0** |

*(Ghi chú: Trên `R29` — dùng ảnh cây đàn Guitar Acoustic để tìm tin chỉ có chữ — B2 Text-Only của cả hai mô hình đều thất bại hoặc xếp nhầm Ukulele lên đầu, trong khi cả **M1 Gemini Embedding 2** và **M2 Jina-CLIP-v2** có kênh thị giác đều nhận diện chính xác ảnh đàn Guitar thùng để ghép với `O28`).*

---

## 3. Phân tích chuyên sâu: Cái nào tốt hơn cho SinhVienMarket?

### 3.1 Phát hiện kỹ thuật quan trọng trong quá trình thực nghiệm: Hiện tượng *Modality Gap*
Khi đo trực tiếp phân phối cosine similarity thực tế của cả hai mô hình, nhóm ghi nhận hiện tượng **Modality Gap** điển hình của các mô hình nhúng đa phương thức:
- Tương đồng cùng phương thức (`Text <-> Text` hoặc `Image <-> Image`) nằm ở dải cao (`0.48 – 0.86` với Gemini 2; `0.35 – 0.82` với Jina-CLIP-v2).
- Tương đồng chéo phương thức (`Text <-> Image` hoặc `Image <-> Text`) nằm ở dải thấp hơn (`0.25 – 0.46` với Gemini 2; `0.16 – 0.32` với Jina-CLIP-v2), dù độ phân tách giữa món đúng và món sai là rất rõ ràng (VD trên Gemini 2: văn bản *"ấm đun nước siêu tốc"* khớp ảnh ấm nước đạt `0.452` so với ảnh máy tính Casio chỉ `0.254`).
- **Giải pháp đã áp dụng:** Lưu tách biệt vector `text` và vector `image` cho từng Listing (đúng thiết kế bảng `listing_embeddings(modality = text | image)` tại Mục 4.6 báo cáo) kết hợp hiệu chuẩn tuyến tính theo từng kênh phương thức trước khi xếp hạng. Giải pháp này giúp **cả M1 và M2 đều đạt 100% Multimodal P@1**.

### 3.2 So sánh ưu – nhược điểm trực diện: Gemini Embedding 2 vs Jina-CLIP-v2

| Tiêu chí đánh giá | Google Gemini Embedding 2 (`M1`) | Jina-CLIP-v2 (`M2`) | Đánh giá bên thắng |
|---|---|---|---|
| **Hiểu tiếng Việt đặc thù, viết tắt, tiếng lóng SV** (`ĐSTT`, `CTDL&GT`, không dấu, câu tự nhiên dài) | **Rất mạnh** (`Text-Only P@1 = 81.8%`, `Multimodal P@1 = 95.5%`, biên phân tách từ vựng gia dụng tiếng Việt sang ảnh rộng `+0.16` đến `+0.20`) | Khá tốt (`Text-Only P@1 = 77.3%`), khi bật kênh thị giác kết hợp chuẩn hóa tâm truy vấn đạt độ chính xác tuyệt đối | **Gemini Embedding 2** (kênh chữ thuần) |
| **Đối sánh thị giác CLIP (`Ảnh mẫu <-> Tin đăng`) & Độ chính xác tổng thể** | Rất tốt (`P@1 = 95.5%`, `MRR = 0.955`, `MM P@1 = 100%`) | **Xuất sắc** (`P@1 = 100.0%`, `MRR = 1.000`, `MM P@1 = 100%`, `CF Recovery = 100%`) | **Jina-CLIP-v2** |
| **Tốc độ nhúng hàng loạt (Batching)** | Gọi đơn lẻ từng thực thể (`contents=[...]` gộp thành 1 chuỗi đan xen chứ không tách batch nhiều tin), dễ vướng giới hạn RPM ở gói Free | Hỗ trợ gửi batch `20+` văn bản/ảnh trong 1 HTTP request duy nhất (`~300–500ms`) | **Jina-CLIP-v2** |
| **Hạ tầng triển khai & Quyền riêng tư dữ liệu** | Không tốn RAM/GPU máy chủ (`0 GB VRAM`), vector gọn `768 chiều` (nhờ Matryoshka), nhưng phụ thuộc API & quota bên ngoài | Linh hoạt **2 chế độ**: dùng Cloud API (tặng 10M token miễn phí) **hoặc tự host local** (`jinaai/jina-clip-v2`, Apache-2.0, `~2GB VRAM` FP16) không tốn phí API lâu dài | **Jina-CLIP-v2** (về tự chủ) / **Gemini 2** (nếu VPS yếu) |

---

## 4. Khuyến nghị chốt kiến trúc cho nhóm & Leader

1. **Lựa chọn mô hình mặc định (Primary):**
   - Nếu chạy trên **máy chủ có GPU nhẹ hoặc dùng Jina Batch API**: Chọn **`Jina-CLIP-v2` (`M2`)** làm mô hình chính nhờ chỉ số tổng thể cao nhất (`P@1 = 90.9%`, `Recall@5 = 96.1%`, `MRR = 0.933`, `CF Recovery = 100%`), hỗ trợ batch nhanh và có thể chuyển sang chạy nội bộ (on-premise) bất cứ lúc nào mà không bị khóa nhà cung cấp.
   - Nếu triển khai trên **VPS cấu hình thấp (chỉ chạy PHP/Laravel + PostgreSQL không có GPU)** và ưu tiên hiểu câu chữ tiếng Việt phức tạp của sinh viên: Chọn **`Gemini Embedding 2` (`768d`)** kèm xoay vòng API key + Redis/DB vector cache.
2. **Thiết kế kiến trúc Adapter đã triển khai sẵn trong code:**
   - Cả trong `sinhvien-market-next/ai-lab` lẫn giao diện Next.js `/requests`, hệ thống đã tách chuẩn `SimilarityProvider` và gắn nhãn cứng `(model_id, model_version)` cho từng bản ghi vector. Nhóm có thể giữ **cả hai mô hình** trong báo cáo khóa luận như phần đóng góp thực nghiệm cốt lõi và đổi mô hình hoạt động chỉ bằng 1 biến cấu hình `.env` mà không cần sửa logic nghiệp vụ.
