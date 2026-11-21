# Báo cáo Thực nghiệm Ghép nối AI REQUEST – OFFER

## 1. Bảng so sánh tổng hợp giữa các phương pháp

| Phương pháp | Model ID | P@1 | P@3 | Recall@5 | MRR | Multimodal P@1 | Multimodal MRR | CF Recovery | Số ĐK đổi TB | Vi phạm Hard | Thời gian (ms) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **B1 - Keyword BM25 (Tiếng Việt)** | `keyword-bm25-vi` | 68.2% | 31.8% | 59.6% | 0.727 | **0.0%** | 0.000 | 83.3% (5/6) | 1.20 | 0 | 17.5 |
| **B2 (Gemini) - Text-Only Embedding** | `gemini-embedding-2-text-only` | 81.8% | 31.8% | 63.2% | 0.818 | **40.0%** | 0.400 | 83.3% (5/6) | 1.20 | 0 | 178.0 |
| **M1 - Gemini Embedding 2 (Multimodal)** | `gemini-embedding-2-multimodal` | 95.5% | 39.4% | 81.4% | 0.955 | **100.0%** | 1.000 | 83.3% (5/6) | 1.20 | 0 | 202.3 |
| **B2 (Jina) - Text-Only Embedding** | `jina-clip-v2-text-only` | 77.3% | 33.3% | 61.1% | 0.773 | **0.0%** | 0.000 | 100.0% (6/6) | 1.17 | 0 | 253.9 |
| **M2 - Jina-CLIP-v2 (Multimodal)** | `jina-clip-v2-multimodal` | 100.0% | 42.4% | 83.0% | 1.000 | **100.0%** | 1.000 | 100.0% (6/6) | 1.17 | 0 | 292.0 |

## 2. Chi tiết kết quả từng truy vấn Multimodal (R26 – R30) & Counterfactual (R04, R18, R19, R20, R24, R31)

### B1 - Keyword BM25 (Tiếng Việt) (`1.0.0`)
- **R26**: Top-1 = O14 (Quạt mini để bàn có đế kẹp, sem=0.35) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R27**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Tin đăng chỉ nhận đổi đồ, không bán trực tiếp; Khác danh mục (Sách & Giáo trình so với Đồ dùng học tập)). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R28**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Khác danh mục (Đồ gia dụng KTX so với Đồ điện tử); Khác danh mục (Phương tiện di chuyển so với Đồ điện tử)). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R29**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Khác danh mục (Đồ điện tử so với Nhạc cụ & Giải trí); Khác danh mục (Đồ gia dụng KTX so với Nhạc cụ & Giải trí)). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R30**: Top-1 = O19 (Bộ bút dạ quang và bút bi 12 cây, sem=0.37) | Counterfactual = Mở rộng sang KTX Khu B -> mở khóa O19
- **R04**: Top-1 = O06 (Bàn phím cơ Keychron K6 Red Switch, sem=0.72) | Counterfactual = Tăng ngân sách lên 850.000đ (+150.000đ) -> mở khóa O06
- **R18**: Top-1 = O11 (Sạc dự phòng Xiaomi 10000mAh, sem=0.76) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O11
- **R19**: Top-1 = O34 (Cáp HDMI 2m và hub USB 4 cổng, sem=0.53) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R20**: Top-1 = O18 (Balo chống nước đựng laptop 15.6 inch, sem=0.92) | Counterfactual = Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O18
- **R24**: Top-1 = O04 (Sách Tiếng Anh TOEIC 600 Starter, sem=0.79) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O04
- **R31**: Top-1 = O15 (Nồi cơm điện mini 0.8L, sem=0.86) | Counterfactual = Chấp nhận hàng Đã qua sử dụng + Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O15

### B2 (Gemini) - Text-Only Embedding (`gemini-embedding-2-d768`)
- **R26**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Tin đăng chỉ nhận đổi đồ, không bán trực tiếp; Tin trao đổi không có giá bán). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R27**: Top-1 = O44 (Ít ra sân nên nhượng lại đồ như ảnh, sem=0.42) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R28**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Khác danh mục (Đồ gia dụng KTX so với Đồ điện tử); Khác danh mục (Phương tiện di chuyển so với Đồ điện tử)). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R29**: Top-1 = O28 (Đàn Guitar Acoustic Rosen G11 kèm bao, sem=0.41) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R30**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Khác danh mục (Sách & Giáo trình so với Đồ dùng học tập); Tình trạng thấp hơn ưu tiên (Đã qua sử dụng < Như mới (90%+))). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R04**: Top-1 = O06 (Bàn phím cơ Keychron K6 Red Switch, sem=0.60) | Counterfactual = Tăng ngân sách lên 850.000đ (+150.000đ) -> mở khóa O06
- **R18**: Top-1 = O11 (Sạc dự phòng Xiaomi 10000mAh, sem=0.41) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O11
- **R19**: Top-1 = O34 (Cáp HDMI 2m và hub USB 4 cổng, sem=0.49) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R20**: Top-1 = O18 (Balo chống nước đựng laptop 15.6 inch, sem=0.98) | Counterfactual = Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O18
- **R24**: Top-1 = O04 (Sách Tiếng Anh TOEIC 600 Starter, sem=0.59) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O04
- **R31**: Top-1 = O15 (Nồi cơm điện mini 0.8L, sem=0.96) | Counterfactual = Chấp nhận hàng Đã qua sử dụng + Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O15

### M1 - Gemini Embedding 2 (Multimodal) (`gemini-embedding-2-d768`)
- **R26**: Top-1 = O42 (Ra trường dọn phòng thanh lý gấp 110k, sem=0.95) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R27**: Top-1 = O44 (Ít ra sân nên nhượng lại đồ như ảnh, sem=0.69) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R28**: Top-1 = O06 (Bàn phím cơ Keychron K6 Red Switch, sem=0.92) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R29**: Top-1 = O28 (Đàn Guitar Acoustic Rosen G11 kèm bao, sem=0.58) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R30**: Top-1 = O41 (Pass nhanh món như ảnh chụp còn mới 95%, sem=0.46) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R04**: Top-1 = O06 (Bàn phím cơ Keychron K6 Red Switch, sem=0.60) | Counterfactual = Tăng ngân sách lên 850.000đ (+150.000đ) -> mở khóa O06
- **R18**: Top-1 = O11 (Sạc dự phòng Xiaomi 10000mAh, sem=0.41) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O11
- **R19**: Top-1 = O34 (Cáp HDMI 2m và hub USB 4 cổng, sem=0.49) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R20**: Top-1 = O18 (Balo chống nước đựng laptop 15.6 inch, sem=0.98) | Counterfactual = Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O18
- **R24**: Top-1 = O04 (Sách Tiếng Anh TOEIC 600 Starter, sem=0.59) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O04
- **R31**: Top-1 = O15 (Nồi cơm điện mini 0.8L, sem=0.96) | Counterfactual = Chấp nhận hàng Đã qua sử dụng + Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O15

### B2 (Jina) - Text-Only Embedding (`jina-clip-v2-api-d1024`)
- **R26**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Tin đăng chỉ nhận đổi đồ, không bán trực tiếp; Tin trao đổi không có giá bán). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R27**: Top-1 = Không có | Counterfactual = Hiện chưa có sản phẩm đúng loại bạn tìm trên sàn. Bạn có thể bật nhận thông báo khi có sinh viên đăng bán món này.
- **R28**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Khác danh mục (Đồ dùng học tập so với Đồ điện tử); Khác danh mục (Đồ gia dụng KTX so với Đồ điện tử)). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R29**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Khác danh mục (Đồ dùng học tập so với Nhạc cụ & Giải trí); Khác danh mục (Đồ gia dụng KTX so với Nhạc cụ & Giải trí)). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R30**: Top-1 = Không có | Counterfactual = Không có sản phẩm đạt điều kiện bắt buộc (Vượt ngân sách 20.000đ (380.000đ > 360.000đ); Tình trạng thấp hơn ưu tiên (Đã qua sử dụng < Như mới (90%+))). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi.
- **R04**: Top-1 = O06 (Bàn phím cơ Keychron K6 Red Switch, sem=0.56) | Counterfactual = Tăng ngân sách lên 850.000đ (+150.000đ) -> mở khóa O06
- **R18**: Top-1 = O11 (Sạc dự phòng Xiaomi 10000mAh, sem=0.59) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O11
- **R19**: Top-1 = O33 (Màn hình 22 inch Dell P2219H, sem=0.41) | Counterfactual = Mở rộng sang KTX Khu B -> mở khóa O33
- **R20**: Top-1 = O18 (Balo chống nước đựng laptop 15.6 inch, sem=0.98) | Counterfactual = Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O18
- **R24**: Top-1 = O04 (Sách Tiếng Anh TOEIC 600 Starter, sem=0.63) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O04
- **R31**: Top-1 = O15 (Nồi cơm điện mini 0.8L, sem=0.82) | Counterfactual = Chấp nhận hàng Đã qua sử dụng + Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O15

### M2 - Jina-CLIP-v2 (Multimodal) (`jina-clip-v2-api-d1024`)
- **R26**: Top-1 = O42 (Ra trường dọn phòng thanh lý gấp 110k, sem=0.71) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R27**: Top-1 = O44 (Ít ra sân nên nhượng lại đồ như ảnh, sem=0.40) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R28**: Top-1 = O06 (Bàn phím cơ Keychron K6 Red Switch, sem=0.79) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R29**: Top-1 = O28 (Đàn Guitar Acoustic Rosen G11 kèm bao, sem=0.79) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R30**: Top-1 = O41 (Pass nhanh món như ảnh chụp còn mới 95%, sem=0.82) | Counterfactual = Đạt điều kiện ngay từ đầu (không cần nới)
- **R04**: Top-1 = O06 (Bàn phím cơ Keychron K6 Red Switch, sem=0.56) | Counterfactual = Tăng ngân sách lên 850.000đ (+150.000đ) -> mở khóa O06
- **R18**: Top-1 = O11 (Sạc dự phòng Xiaomi 10000mAh, sem=0.59) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O11
- **R19**: Top-1 = O33 (Màn hình 22 inch Dell P2219H, sem=0.41) | Counterfactual = Mở rộng sang KTX Khu B -> mở khóa O33
- **R20**: Top-1 = O18 (Balo chống nước đựng laptop 15.6 inch, sem=0.98) | Counterfactual = Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O18
- **R24**: Top-1 = O04 (Sách Tiếng Anh TOEIC 600 Starter, sem=0.63) | Counterfactual = Chấp nhận hàng Đã qua sử dụng -> mở khóa O04
- **R31**: Top-1 = O15 (Nồi cơm điện mini 0.8L, sem=0.82) | Counterfactual = Chấp nhận hàng Đã qua sử dụng + Mở rộng ra tất cả khu vực (KTX & Ngoài KTX) -> mở khóa O15
