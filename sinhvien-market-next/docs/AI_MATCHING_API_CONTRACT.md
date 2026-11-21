# Hợp đồng API: Dịch vụ Ghép nối AI REQUEST – OFFER (`AI Matching API Contract`)

Tài liệu mô tả chuẩn giao tiếp JSON giữa giao diện Next.js (`sinhvien-market-next/frontend`), máy chủ nghiệp vụ Laravel/PHP và dịch vụ AI Python (`sinhvien-market-next/ai-lab` / FastAPI).

---

## 1. Tạo hoặc cập nhật REQUEST của người mua
`POST /api/v1/requests`

### Request Body
```json
{
  "text": "Cần tìm ấm đun nước siêu tốc để pha mì trong phòng trọ",
  "image": "data:image/jpeg;base64,...",
  "category": "gia_dung",
  "budget_max": 180000,
  "min_condition": "used",
  "location": "ktx_a",
  "allow_exchange": false,
  "deadline": "2026-11-30",
  "flags": {
    "category": "hard",
    "budget": "hard",
    "condition": "soft",
    "location": "soft"
  }
}
```
> **Quy tắc mặc định:** Bất kỳ trường điều kiện nào khác `null` nhưng vắng mặt trong `flags` đều được chuẩn hóa thành `"hard"` (bắt buộc) trước khi lưu vào `listing_attributes.requirement_flags`.

---

## 2. Truy vấn kết quả ghép nối & Gợi ý Counterfactual
`POST /api/v1/requests/{id}/match` (và Route nội bộ Next.js `POST /api/ai/match`)

### Query / Body Options
```json
{
  "model_id": "jina-clip-v2-multimodal",
  "top_k": 6
}
```
Giá trị `model_id` hợp lệ:
- `"jina-clip-v2-multimodal"`
- `"gemini-embedding-2-multimodal"`
- `"gemini-embedding-2-text-only"`
- `"jina-clip-v2-text-only"`
- `"keyword-bm25-vi"`

### Response `200 OK`
```json
{
  "requestId": "R20",
  "modelId": "jina-clip-v2-multimodal",
  "modelVersion": "jina-clip-v2-api-d1024",
  "strictMatchCount": 0,
  "counterfactualTriggered": true,
  "latencyMs": 16.2,
  "rankedOffers": [
    {
      "offer": {
        "id": "O18",
        "title": "Balo chống nước đựng laptop 15.6 inch",
        "category": "hoc_tap",
        "type": "sale",
        "price": 180000,
        "condition": "like_new",
        "location": "ngoai_ktx",
        "image": null
      },
      "totalScore": 0.903,
      "semanticScore": 0.991,
      "structuredScore": 0.639,
      "satisfiesAllInitial": false,
      "matchedConditions": [
        "Đúng danh mục Đồ dùng học tập",
        "Trong ngân sách (180.000đ <= 200.000đ)",
        "Tình trạng: Như mới (90%+)"
      ],
      "unmatchedSoftConditions": [
        "Khác khu vực ưu tiên (Ngoài KTX / Khu trọ thay vì KTX Khu A)"
      ],
      "explanationSummary": "Tương đồng ngữ nghĩa 99%. Đạt: Đúng danh mục Đồ dùng học tập; Trong ngân sách (180.000đ <= 200.000đ)."
    }
  ],
  "counterfactuals": [
    {
      "suggestionId": "CF_2",
      "changes": { "location": null },
      "numConditionsChanged": 1,
      "stepCost": 0.35,
      "humanLabel": "Mở rộng ra tất cả khu vực (KTX & Ngoài KTX)",
      "unlockedOfferIds": ["O18"],
      "bestScore": 0.992
    }
  ],
  "hardBlockDiagnostic": null
}
```

---

## 3. Quy ước Bảng Lưu trữ Vector (`listing_embeddings`)
```sql
CREATE TABLE listing_embeddings (
    id BIGSERIAL PRIMARY KEY,
    listing_id VARCHAR(32) NOT NULL,
    modality VARCHAR(32) NOT NULL,      -- 'text_clip' | 'text_retrieval_document' | 'image'
    model_id VARCHAR(64) NOT NULL,      -- 'jina-clip-v2' | 'gemini-embedding-2'
    model_version VARCHAR(64) NOT NULL, -- 'v2-d1024' | 'gemini-embedding-2-d768'
    dimensions INT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    vector vector NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, modality, model_id, model_version)
);
```
> Không bao giờ thực hiện phép tính khoảng cách `<=>` (`pgvector`) giữa hai hàng khác `model_id` hoặc khác `model_version`.
