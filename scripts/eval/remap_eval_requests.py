"""Phần 5: chuyển bộ đánh giá 31 REQUEST + nhãn ngữ nghĩa của ai-lab sang danh mục thật.

- Danh mục prototype -> categoryId thật (1..6); vợt cầu lông (O44, R27) -> Thể thao & Giải trí.
- Bỏ REQUEST xe cộ (R11) và mọi nhãn trỏ tới OFFER xe cộ (O25-O27, đã bị bỏ ở offers.json).
- Trường đổi sang đúng tên mà BuyerRequestValidator/MatchingEngine nhận (description, categoryId,
  budgetMax, minCondition, building, allowExchange, flags); ktx_a/ktx_b -> building "A"/"B".
- Kịch bản *_auction đổi tên vì tin đấu giá đã thành tin bán.
- In bảng ground truth trước/sau (nhãn ngữ nghĩa >= 1 và thỏa mọi điều kiện HARD) để thấy thay đổi.

python -I scripts/eval/remap_eval_requests.py <ai_lab_dir> database/demo/marketplace
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
LAB, OUT = Path(sys.argv[1]), Path(sys.argv[2])

CATEGORY = {"sach": 1, "dien_tu": 2, "hoc_tap": 3, "thoi_trang": 4, "gia_dung": 5, "nhac_cu": 6}
CATEGORY_FIX = {"R27": 6}  # vợt cầu lông: cùng danh mục mới với O44
BUILDING = {"ktx_a": "A", "ktx_b": "B"}
DROPPED_REQUESTS = {"R11": "nhu cầu xe đi lại (danh mục phương tiện đã bỏ)"}
# O30 (keyboard) was repriced 400k -> 1.2tr; keep R22 a multi-match by giving a realistic beginner budget.
BUDGET_FIX = {"R22": 1300000}
SCENARIO_RENAME = {"multi_match_auction": "multi_match"}
COND_RANK = {"worn": 0, "used": 1, "like_new": 2, "new": 3}

requests = json.loads((LAB / "data" / "requests.json").read_text(encoding="utf-8"))
raw_labels = json.loads((LAB / "data" / "semantic_labels.json").read_text(encoding="utf-8"))
proto_offers = {o["id"]: o for o in json.loads((LAB / "data" / "offers.json").read_text(encoding="utf-8"))}
real_offers = {o["ref"]: o for o in json.loads((OUT / "offers.json").read_text(encoding="utf-8"))}


def hard_ok(req, offer, *, real):
    """Same rule as the PHP engine: a constraint that is set and not flagged soft is hard."""
    flags = req["flags"]
    cat = req["categoryId"] if real else req["category"]
    budget = req["budgetMax"] if real else req["budget_max"]
    cond = req["minCondition"] if real else req["min_condition"]
    loc = req["building"] if real else req["location"]
    allow_ex = req["allowExchange"] if real else req["allow_exchange"]
    o_cat = offer["categoryId"] if real else offer["category"]
    o_loc = offer["seller"] if real else offer["location"]
    checks = {
        "category": cat is None or o_cat == cat,
        # As in the prototype: with a budget, an exchange listing passes only if exchange is allowed.
        "budget": budget is None or (allow_ex if offer["price"] is None else offer["price"] <= budget),
        "condition": cond is None or COND_RANK[offer["condition"]] >= COND_RANK[cond],
        "location": loc is None or o_loc == loc,
    }
    return all(ok or flags.get(k) == "soft" for k, ok in checks.items())


out_requests, out_labels, changes = [], {"_note": raw_labels.get("_note", "")}, []
(OUT / "images").mkdir(exist_ok=True)
for r in requests:
    rid = r["id"]
    labels = {k: v for k, v in raw_labels.get(rid, {}).items() if v > 0}
    proto_gt = {k: v for k, v in labels.items() if hard_ok(r, proto_offers[k], real=False)}
    if rid in DROPPED_REQUESTS:
        changes.append((rid, "BỎ", DROPPED_REQUESTS[rid], proto_gt, None))
        continue
    image = None
    if r.get("image"):
        image = f"{rid.lower()}.jpg"
        with Image.open(LAB / "data" / r["image"]) as im:
            im = im.convert("RGB")
            im.thumbnail((800, 800))
            im.save(OUT / "images" / image, "JPEG", quality=82, optimize=True)
    new = {
        "id": rid,
        "description": r["text"],
        "image": image,
        "categoryId": CATEGORY_FIX.get(rid, CATEGORY.get(r["category"])) if r["category"] else None,
        "budgetMax": BUDGET_FIX.get(rid, r["budget_max"]),
        "minCondition": r["min_condition"],
        "building": BUILDING.get(r["location"]) if r["location"] else None,
        "allowExchange": r["allow_exchange"],
        "flags": r["flags"],
        "scenario": SCENARIO_RENAME.get(r["scenario"], r["scenario"]),
    }
    kept = {k: v for k, v in labels.items() if k in real_offers}
    real_gt = {k: v for k, v in kept.items() if hard_ok(new, real_offers[k], real=True)}
    out_requests.append(new)
    out_labels[rid] = kept
    note = []
    if new["scenario"] != r["scenario"]:
        note.append(f"kịch bản {r['scenario']} -> {new['scenario']}")
    if rid in BUDGET_FIX:
        note.append(f"ngân sách {r['budget_max']} -> {BUDGET_FIX[rid]}")
    if rid in CATEGORY_FIX:
        note.append("danh mục -> Thể thao & Giải trí")
    if proto_gt != real_gt:
        note.append("ground truth đổi do giá đã sửa")
    if note:
        changes.append((rid, "ĐỔI", "; ".join(note), proto_gt, real_gt))
    print(f"{rid} {new['scenario']:<26} GT trước {sorted(proto_gt)!s:<22} sau {sorted(real_gt)}")

(OUT / "requests.json").write_text(json.dumps(out_requests, ensure_ascii=False, indent=1), encoding="utf-8")
(OUT / "semantic_labels.json").write_text(json.dumps(out_labels, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"\n{len(out_requests)} REQUEST, {sum(1 for v in out_labels.values() if isinstance(v, dict) and v)} có nhãn,"
      f" {sum(1 for r in out_requests if r['image'])} có ảnh.")
print("Thay đổi so với prototype:")
for rid, kind, why, before, after in changes:
    print(f"  {rid} {kind}: {why} | GT {sorted(before)} -> {sorted(after) if after is not None else '-'}")
