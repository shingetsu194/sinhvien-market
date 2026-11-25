# Báo cáo benchmark W8: ghép nối REQUEST–OFFER trên pipeline thật

> File này được sinh tự động bởi `php scripts/eval/run-benchmark.php` lúc 25/11/2026 08:07.
> Kết quả tái tạo được không cần API key: vector Gemini được lưu ở `scripts/eval/cache/`.

## 1. Thiết lập

- **Dữ liệu:** 30 REQUEST, 41 OFFER (`database/demo/marketplace`, danh mục thật, không có xe cộ). 27 REQUEST có đáp án; 3 REQUEST không có món nào thỏa điều kiện (hệ thống đúng khi không hiện gì).
- **Đáp án đúng (ground truth):** OFFER có nhãn ngữ nghĩa ≥ 1 (2 = đúng loại đồ, 1 = liên quan gần) **và** không vi phạm điều kiện bắt buộc theo đúng `MatchingEngine` đang chạy.
- **Chia tập cố định:** sắp theo kịch bản rồi mã REQUEST, xen kẽ dev/test → dev 15, test 15. Tham số duy nhất được tinh chỉnh (ngưỡng ngữ nghĩa) chọn **trên dev**; các con số chính báo cáo **trên test**.
- **Chỉ số (k = 5):** nDCG@5 (có phân hạng 2/1), MRR, Recall@5, *Độ chính xác hiển thị* (tỉ lệ món đúng trong những món hệ thống hiện ra, tối đa 5). *Overall* = trung bình trên mọi REQUEST của nDCG@5, trong đó REQUEST "không có hàng" được 1 điểm nếu hệ thống không hiện gì: đây là mục tiêu tinh chỉnh.
- **Mô hình:** `gemini-embedding-2-d768` (Gemini Embedding 2, 768 chiều); xếp hạng cuối bằng `MatchingEngine` (0,75 ngữ nghĩa + 0,25 cấu trúc, lọc điều kiện bắt buộc).

## 2. Kết quả trên tập TEST

| Mã | Biến thể | Ngưỡng (chọn trên dev) | Overall | nDCG@5 | MRR | Recall@5 | Độ chính xác hiển thị | "Không có hàng" đúng |
|---|---|---|---|---|---|---|---|---|
| B0 | Baseline cũ: feature hashing + cosine | 0,10 | **0,48** | 0,55 | 0,58 | 0,54 | 0,38 | 0/2 |
| B1 | BM25 tiếng Việt (không AI) | 0,40 | **0,65** | 0,60 | 0,65 | 0,60 | 0,55 | 2/2 |
| M1 | Gemini văn bản, không BM25, không ảnh | 0,30 | **0,70** | 0,81 | 0,85 | 0,90 | 0,39 | 0/2 |
| M2 | Gemini văn bản + BM25, không ảnh | 0,10 | **0,79** | 0,91 | 0,92 | 0,97 | 0,42 | 0/2 |
| M3 | Gemini văn bản + ảnh, không BM25 | 0,30 | **0,70** | 0,81 | 0,85 | 0,90 | 0,39 | 0/2 |
| M4 | Gemini + BM25 + ảnh (đang chạy thật) | 0,10 | **0,82** | 0,95 | 0,96 | 0,97 | 0,42 | 0/2 |

Cùng tập TEST nhưng dùng ngưỡng mặc định của prototype (không tinh chỉnh), để đối chiếu:

| Mã | Ngưỡng | Overall | nDCG@5 | Độ chính xác hiển thị | "Không có hàng" đúng |
|---|---|---|---|---|---|
| B0 | 0,00 | 0,67 | 0,78 | 0,31 | 0/2 |
| B1 | 0,28 | 0,64 | 0,66 | 0,57 | 1/2 |
| M1 | 0,40 | 0,65 | 0,67 | 0,32 | 1/2 |
| M2 | 0,40 | 0,68 | 0,63 | 0,47 | 2/2 |
| M3 | 0,40 | 0,72 | 0,75 | 0,40 | 1/2 |
| M4 | 0,40 | 0,82 | 0,79 | 0,56 | 2/2 |

## 3. Ablation (bootstrap ghép cặp 5000 lần trên TEST, khoảng tin cậy 95%)

| So sánh | Thành phần được kiểm chứng | Chênh lệch Overall | KTC 95% | Kết luận |
|---|---|---|---|---|
| M2 vs M1 | BM25 trong kênh văn bản (không có ảnh) | +0.093 | [-0.045; +0.253] | Chưa đủ bằng chứng (KTC chứa 0) |
| M4 vs M3 | BM25 trong kênh văn bản (có ảnh) | +0.123 | [+0.011; +0.274] | Có ích, khác biệt có ý nghĩa |
| M4 vs M2 | Kênh ảnh (khi đã có BM25) | +0.030 | [+0.000; +0.085] | Chưa đủ bằng chứng (KTC chứa 0) |
| M4 vs B1 | Hệ thống AI so với chỉ dùng từ khóa | +0.170 | [-0.127; +0.463] | Chưa đủ bằng chứng (KTC chứa 0) |
| M4 vs B0 | Hệ thống AI so với baseline cũ | +0.341 | [+0.124; +0.583] | Có ích, khác biệt có ý nghĩa |

## 4. Cấu hình đang chạy thật (M4, ngưỡng 0,40) trên toàn bộ 30 REQUEST

Overall 0,81 · nDCG@5 0,82 · MRR 0,87 · Độ chính xác hiển thị 0,64 · "Không có hàng" đúng 2/3.

Các REQUEST chưa đạt điểm tối đa (phân tích lỗi):

| REQUEST | Kịch bản | Mô tả | Đáp án | Hệ thống hiện (top 5) | Điểm |
|---|---|---|---|---|---|
| R10 | multi_match | thiết bị nghe nhạc di động | O07, O40 | (không hiện gì) | 0,00 |
| R16 | exchange_excluded | muốn tìm đồ để nấu ăn trong phòng | O15, O42(1) | O42✓, O15✓, O43 | 0,80 |
| R18 | counterfactual_condition | cần pin sạc dự phòng đi học, tình trạng còn mới | O11 | (không hiện gì) | 0,00 |
| R19 | counterfactual_location | tìm màn hình để làm việc với laptop | O33 | O34 | 0,00 |
| R21 | hard_block_no_diacritics | can ban hoc ktx khu a | — (không có hàng) | O12, O14, O43 | 0,00 |
| R23 | multi_match | đồ dùng tiện lợi cho giường tầng ktx | O35, O13, O14, O36(1), O17(1) | O17✓, O35✓, O13✓, O43, O36✓ | 0,66 |
| R25 | text_only | ai có đồ gì để mang đi học vẽ không | O38, O20(1), O19(1) | O20✓ | 0,24 |
| R29 | multimodal_image_query | tìm mua lại 1 cây y hệt ảnh chụp để tự tập ở phòng, ai có nhắn mình | O28, O29(1) | O44, O28✓ | 0,52 |

## 5. Độ trễ

| Bước | Số lần gọi | Trung vị | p95 |
|---|---|---|---|
| Nhúng câu truy vấn (văn bản), gọi API | 30 | 838 ms | 1457 ms |
| Nhúng ảnh truy vấn, gọi API | 2 | 1584 ms | 1657 ms |
| Nhúng một tin đăng (văn bản), một lần khi duyệt tin | 41 | 1010 ms | 1457 ms |
| Nhúng ảnh tin đăng, một lần khi duyệt tin | 4 | 1626 ms | 2257 ms |
| Chấm điểm + xếp hạng 41 tin khi đã có vector (warm), M4 | 30 | 1,64 ms | |

## 6. Giới hạn

- Bộ dữ liệu nhỏ (30 REQUEST, 15 ở test): khoảng tin cậy rộng, nên chênh lệch nhỏ giữa các ngưỡng nằm trong mức nhiễu.
- Chỉ 4 OFFER và 2 REQUEST có ảnh, nên đóng góp của kênh ảnh mới là bằng chứng sơ bộ.
- Nhãn ngữ nghĩa do nhóm tự gán (một người gán), chưa đo độ đồng thuận giữa người gán.
- Hằng số hiệu chỉnh từng kênh lấy từ prototype; W8 chỉ tinh chỉnh ngưỡng trên dev.
