"""Chuyển 44 OFFER mẫu của ai-lab sang dữ liệu demo cho bảng products thật.
- Danh mục thật của main; BỎ toàn bộ xe cộ (phuong_tien).
- Sửa các giá vô lý; nhạc cụ + vợt cầu lông -> Thể thao & Giải trí; đấu giá -> bán thường.
- ktx_a/ktx_b/ngoai_ktx -> người bán ở Tòa A / Tòa B / ngoài KTX.
- Ảnh thu nhỏ tối đa 800px, JPEG q82.
python -I scripts/eval/build_demo_offers.py <ai_lab_dir> database/demo/marketplace
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
lab, out = Path(sys.argv[1]), Path(sys.argv[2])
offers = json.loads((lab / "data" / "offers.json").read_text(encoding="utf-8"))
offers = offers if isinstance(offers, list) else offers["offers"]

CATEGORY = {"sach": 1, "dien_tu": 2, "hoc_tap": 3, "thoi_trang": 4, "gia_dung": 5, "nhac_cu": 6}
SELLER = {"ktx_a": "A", "ktx_b": "B", "ngoai_ktx": "C"}
PRICE_FIX = {"O10": 6500000, "O40": 450000, "O30": 1200000, "O38": 650000}
CATEGORY_FIX = {"O44": 6}
# O40 is no longer an auction: drop the "đấu giá ngược" wording.
DESCRIPTION_FIX = {"O40": "Loa mini chống nước, pin ổn, nghe nhạc trong phòng vẫn to rõ."}

(out / "images").mkdir(parents=True, exist_ok=True)
rows, dropped = [], []
for o in offers:
    if o["category"] == "phuong_tien":
        dropped.append(o["id"])
        continue
    image_name = None
    if o.get("image"):
        src = lab / "data" / o["image"] if not Path(o["image"]).is_absolute() else Path(o["image"])
        if not src.exists():
            src = lab / "data" / "images" / Path(o["image"]).name
        image_name = f"{o['id'].lower()}.jpg"
        with Image.open(src) as im:
            im = im.convert("RGB")
            im.thumbnail((800, 800))
            im.save(out / "images" / image_name, "JPEG", quality=82, optimize=True)
    rows.append({
        "ref": o["id"],
        "title": o["title"],
        "description": DESCRIPTION_FIX.get(o["id"], o["description"]),
        "categoryId": CATEGORY_FIX.get(o["id"], CATEGORY[o["category"]]),
        "type": "exchange" if o["type"] == "exchange" else "sale",
        "price": None if o["type"] == "exchange" else PRICE_FIX.get(o["id"], o["price"]),
        "condition": o["condition"],
        "seller": SELLER[o["location"]],
        "image": image_name,
    })

(out / "offers.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
size = sum(f.stat().st_size for f in (out / "images").glob("*.jpg"))
print(f"{len(rows)} sản phẩm, bỏ {len(dropped)} tin xe cộ {dropped}, {len(list((out / 'images').glob('*.jpg')))} ảnh = {size // 1024} KB")
