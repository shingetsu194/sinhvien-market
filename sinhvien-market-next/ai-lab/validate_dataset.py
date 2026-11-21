from __future__ import annotations

import json
import sys
from pathlib import Path

from matching_core import (
    CATEGORY_LABELS,
    CONDITION_RANK,
    LOCATION_LABELS,
    compute_ground_truth_relevance,
    evaluate_ir_metrics,
    load_dataset,
    match_single_request,
    satisfies_all_specified_constraints,
)
from providers.keyword_baseline import KeywordBM25Provider


def main() -> int:
    lab_dir = Path(__file__).resolve().parent
    data_dir = lab_dir / "data"
    offers, requests, semantic_labels = load_dataset(data_dir)

    print(f"=== KIỂM TRA BỘ DỮ LIỆU ĐÁNH GIÁ REQUEST-OFFER ===")
    print(f"- Số lượng OFFER : {len(offers)}")
    print(f"- Số lượng REQUEST: {len(requests)}")

    errors: list[str] = []
    offer_ids = set()
    for o in offers:
        oid = o["id"]
        if oid in offer_ids:
            errors.append(f"Trùng mã OFFER: {oid}")
        offer_ids.add(oid)
        if o["category"] not in CATEGORY_LABELS:
            errors.append(f"{oid}: category không hợp lệ ({o['category']})")
        if o["condition"] not in CONDITION_RANK:
            errors.append(f"{oid}: condition không hợp lệ ({o['condition']})")
        if o["location"] not in LOCATION_LABELS:
            errors.append(f"{oid}: location không hợp lệ ({o['location']})")
        if o["type"] == "exchange" and o["price"] is not None:
            errors.append(f"{oid}: type=exchange nhưng price khác null")
        if o["type"] in ("sale", "auction") and (o["price"] is None or o["price"] <= 0):
            errors.append(f"{oid}: type={o['type']} nhưng thiếu giá hợp lệ")
        if o.get("image"):
            img_path = data_dir / o["image"]
            if not img_path.exists():
                errors.append(f"{oid}: Không tìm thấy file ảnh {img_path}")

    req_ids = set()
    for r in requests:
        rid = r["id"]
        if rid in req_ids:
            errors.append(f"Trùng mã REQUEST: {rid}")
        req_ids.add(rid)
        if r.get("category") is not None and r["category"] not in CATEGORY_LABELS:
            errors.append(f"{rid}: category không hợp lệ ({r['category']})")
        if r.get("min_condition") is not None and r["min_condition"] not in CONDITION_RANK:
            errors.append(f"{rid}: min_condition không hợp lệ ({r['min_condition']})")
        if r.get("location") is not None and r["location"] not in LOCATION_LABELS:
            errors.append(f"{rid}: location không hợp lệ ({r['location']})")
        if r.get("image"):
            img_path = data_dir / r["image"]
            if not img_path.exists():
                errors.append(f"{rid}: Không tìm thấy file ảnh {img_path}")
        if rid not in semantic_labels:
            errors.append(f"{rid}: Chưa có mục nhãn trong semantic_labels.json")

    for rid, label_map in semantic_labels.items():
        if rid not in req_ids:
            errors.append(f"semantic_labels chứa REQUEST lạ: {rid}")
        for oid, grade in label_map.items():
            if oid not in offer_ids:
                errors.append(f"semantic_labels[{rid}] trỏ tới OFFER không tồn tại: {oid}")
            if grade not in (1, 2):
                errors.append(f"semantic_labels[{rid}][{oid}] có mức điểm không hợp lệ: {grade}")

    if errors:
        print("\n[LỖI DỮ LIỆU]:")
        for err in errors:
            print(f"  - {err}")
        return 1

    offer_by_id = {o["id"]: o for o in offers}
    retrieval_reqs = []
    cf_reqs = []
    blocked_reqs = []
    for r in requests:
        gt_hard = compute_ground_truth_relevance(r, offers, semantic_labels[r["id"]])
        gt_strict = {
            oid: g
            for oid, g in gt_hard.items()
            if satisfies_all_specified_constraints(r, offer_by_id[oid])
        }
        if gt_strict:
            retrieval_reqs.append(r["id"])
        elif gt_hard:
            cf_reqs.append(r["id"])
        else:
            blocked_reqs.append(r["id"])

    mm_offers = [o["id"] for o in offers if o.get("image")]
    mm_reqs = [r["id"] for r in requests if str(r.get("scenario", "")).startswith("multimodal_")]

    print(f"- OFFER có ảnh thực tế     : {len(mm_offers)} ({', '.join(mm_offers)})")
    print(f"- Truy vấn ghép nối chuẩn  : {len(retrieval_reqs)} ({', '.join(retrieval_reqs)})")
    print(f"  + Trong đó Multimodal    : {len(mm_reqs)} ({', '.join(mm_reqs)})")
    print(f"- Truy vấn Counterfactual  : {len(cf_reqs)} ({', '.join(cf_reqs)})")
    print(f"- Truy vấn Chặn cứng/Rỗng  : {len(blocked_reqs)} ({', '.join(blocked_reqs)})")
    print("-> Toàn bộ schema, ràng buộc và file ảnh đều HỢP LỆ 100%!\n")

    # Kiểm chứng Oracle (giả sử ngữ nghĩa lý tưởng = semantic_labels / 2.0) để đảm bảo Counterfactual & Hard Filter chuẩn xác tuyệt đối
    oracle_scores = {
        r["id"]: {
            o["id"]: (0.95 if semantic_labels[r["id"]].get(o["id"]) == 2 else (0.70 if semantic_labels[r["id"]].get(o["id"]) == 1 else 0.05))
            for o in offers
        }
        for r in requests
    }
    oracle_resps = {
        r["id"]: match_single_request(
            r, offers, oracle_scores[r["id"]], "oracle-check", "1.0", min_semantic_score=0.50
        )
        for r in requests
    }
    oracle_metrics = evaluate_ir_metrics(requests, offers, semantic_labels, oracle_resps)
    assert oracle_metrics["precision_at_1"] == 1.0, f"Oracle P@1 phải đạt 1.0, thực tế: {oracle_metrics}"
    assert oracle_metrics["cf_recovery_rate"] == 1.0, f"Oracle CF Recovery phải đạt 1.0, thực tế: {oracle_metrics}"
    assert oracle_metrics["hard_constraint_violations"] == 0
    assert oracle_metrics["false_cf_on_blocked"] == 0
    print("[ORACLE SELF-CHECK PASS] P@1 = 1.00 | CF Recovery = 1.00 | Hard Violations = 0 | False CF = 0\n")

    # Chạy ngay Baseline B1 (Keyword BM25)
    b1 = KeywordBM25Provider()
    b1_scores = b1.score_all(requests, offers)
    b1_resps = {
        r["id"]: match_single_request(
            r,
            offers,
            b1_scores[r["id"]],
            b1.model_id,
            b1.model_version,
            min_semantic_score=b1.min_semantic_score,
        )
        for r in requests
    }
    b1_metrics = evaluate_ir_metrics(requests, offers, semantic_labels, b1_resps)
    print("=== KẾT QUẢ ĐỐI CHỨNG CƠ SỞ B1 (KEYWORD BM25 TIẾNG VIỆT) ===")
    print(json.dumps(b1_metrics, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
