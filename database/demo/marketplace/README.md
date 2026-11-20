# Bộ dữ liệu đánh giá REQUEST–OFFER (danh mục thật)

Bộ dữ liệu dùng cho benchmark W8. Nó được chuyển từ bộ thực nghiệm của prototype ai-lab
(nhánh `feature/nextjs-frontend`, thư mục `sinhvien-market-next/ai-lab/data`, commit `d35416e`)
sang danh mục, tình trạng và ngữ cảnh lưu trú của hệ thống thật.

| File | Nội dung |
|---|---|
| `offers.json` | 41 OFFER (`ref` = mã gốc O01…O44). Seed vào DB bằng `scripts/seed-demo-marketplace.php`. |
| `requests.json` | 30 REQUEST. Tên trường theo đúng `BuyerRequestValidator` / `MatchingEngine`. |
| `semantic_labels.json` | Nhãn ngữ nghĩa do người gán: 2 = đúng loại đồ, 1 = liên quan gần. Nhãn không xét giá, tình trạng hay vị trí. |
| `images/` | Ảnh OFFER (`oNN.jpg`) và ảnh truy vấn của REQUEST đa phương thức (`r28.jpg`, `r29.jpg`). Tất cả thu nhỏ còn ≤ 800px. |

## Ánh xạ sang hệ thống thật

| Prototype | Hệ thống thật |
|---|---|
| `sach` / `dien_tu` / `hoc_tap` / `thoi_trang` / `gia_dung` | categoryId 1 / 2 / 3 / 4 / 5 |
| `nhac_cu` | 6 (Thể thao & Giải trí) |
| `phuong_tien` (xe cộ) | **Bỏ**: O25, O26, O27 và R11 |
| `location`: `ktx_a` / `ktx_b` / `ngoai_ktx` | `building` "A" / "B" / null. Bên OFFER là trường `seller`, bên REQUEST là trường `building`; harness đổi sang `buildingId` của Tòa A/B. |
| `type`: `auction` | `sale` (O27, O40) |
| `text`, `budget_max`, `min_condition`, `allow_exchange` | `description`, `budgetMax`, `minCondition`, `allowExchange` |

## Thay đổi so với prototype

**Giá OFFER sửa cho sát thị trường** (từ lúc dựng dữ liệu demo):

| OFFER | Giá cũ | Giá mới |
|---|---|---|
| O10 Laptop Dell i5 | 2,9 tr | 6,5 tr |
| O30 Keyboard Casio | 400k | 1,2 tr |
| O38 Wacom | 450k | 650k |
| O40 Loa JBL Go 3 | 1,1 tr (đấu giá) | 450k (bán thường, đã sửa mô tả) |

**Danh mục:** O44 và R27 (vợt cầu lông) chuyển sang Thể thao & Giải trí.

**REQUEST:**
- **R11** (xe đi lại) bị bỏ.
- **R10:** kịch bản `multi_match_auction` đổi tên thành `multi_match`.
- **R22:** ngân sách 500k → 1,3 tr. Nếu giữ 500k, O30 sau khi sửa giá sẽ vượt ngân sách và R22 chỉ còn 1 đáp án, mất ý nghĩa kịch bản `multi_match`. Ground truth của R22 từ {O29, O30} thành {O28, O29, O30}.

Ground truth của 28 REQUEST còn lại giữ nguyên. Cách tính ground truth: OFFER có nhãn ngữ nghĩa ≥ 1 và thỏa mọi điều kiện **hard**. Một điều kiện có giá trị mà không gắn cờ `soft` thì được coi là hard, giống quy tắc của `MatchingEngine`. Quy tắc này cho kết quả trùng 100% với `compute_ground_truth_relevance` của ai-lab trên cả 31 REQUEST gốc.

## Tái tạo

```bash
# từ ai-lab (nhánh feature/nextjs-frontend) sang thư mục này
python -I scripts/eval/build_demo_offers.py   <ai-lab> database/demo/marketplace
python -I scripts/eval/remap_eval_requests.py <ai-lab> database/demo/marketplace
```

Cả 30 REQUEST đều qua `BuyerRequestValidator`, và mọi nhãn đều trỏ tới OFFER có tồn tại.
Việc chia dev/test và chạy ablation (có và không có BM25) để dành cho W8.
