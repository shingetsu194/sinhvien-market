from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from typing import Any


VN_STOPWORDS = {
    "can", "tim", "mua", "lai", "cho", "cua", "va", "hoac", "voi",
    "o", "tai", "trong", "ngoai", "tren", "duoi", "de", "di", "hoc", "con",
    "mot", "nhung", "cac", "nay", "kia", "rat", "hoi", "nhieu", "it", "gia",
    "re", "tot", "on", "nhu", "hinh", "anh", "minh", "nao", "co",
    "khong", "lay", "muon", "uu", "tien", "kich", "thuoc", "pass", "nhanh",
    "ktx", "sinh", "vien", "phong", "tro", "truong",
}


def strip_vietnamese_diacritics(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


def tokenize_vi(text: str) -> list[str]:
    lowered = strip_vietnamese_diacritics(text.lower())
    words = re.findall(r"[a-z0-9\+]+", lowered)
    filtered = [w for w in words if len(w) > 1 and w not in VN_STOPWORDS]
    # Thêm bigram liền kề để giữ cụm từ tiếng Việt như 'giai tich', 'ban phim', 'tai nghe'
    bigrams = [f"{filtered[i]}_{filtered[i + 1]}" for i in range(len(filtered) - 1)]
    return filtered + bigrams


class KeywordBM25Provider:
    """
    B1: Phương pháp đối chứng từ khóa (BM25 + chuẩn hóa dấu tiếng Việt).
    Không hiểu từ đồng nghĩa ('bàn nhỏ' vs 'bàn gấp gọn mini') và không đọc được ảnh.
    """

    model_id = "keyword-bm25-vi"
    model_version = "1.0.0"
    min_semantic_score = 0.28

    def score_all(
        self, requests: list[dict[str, Any]], offers: list[dict[str, Any]]
    ) -> dict[str, dict[str, float]]:
        offer_docs: dict[str, list[str]] = {}
        df: Counter[str] = Counter()

        for offer in offers:
            full_text = f"{offer['title']} {offer['title']} {offer['description']}"
            tokens = tokenize_vi(full_text)
            offer_docs[offer["id"]] = tokens
            for t in set(tokens):
                df[t] += 1

        n_docs = max(len(offers), 1)
        avg_dl = sum(len(toks) for toks in offer_docs.values()) / float(n_docs)
        k1 = 1.5
        b = 0.75

        result: dict[str, dict[str, float]] = {}
        for req in requests:
            q_tokens = tokenize_vi(req["text"])
            scores: dict[str, float] = {}
            if not q_tokens:
                result[req["id"]] = {o["id"]: 0.0 for o in offers}
                continue

            raw_scores: dict[str, float] = {}
            for offer in offers:
                oid = offer["id"]
                d_tokens = offer_docs[oid]
                dl = len(d_tokens)
                tf_map = Counter(d_tokens)
                bm25 = 0.0
                matched_q = 0
                for qt in q_tokens:
                    tf = tf_map.get(qt, 0)
                    if tf == 0:
                        continue
                    matched_q += 1
                    idf = math.log(1.0 + (n_docs - df[qt] + 0.5) / (df[qt] + 0.5))
                    denom = tf + k1 * (1.0 - b + b * (dl / max(avg_dl, 1.0)))
                    bm25 += idf * ((tf * (k1 + 1.0)) / denom)

                # Quy đổi điểm BM25 sang thang [0, 1] có xét tỷ lệ phủ từ khóa truy vấn
                coverage = matched_q / float(len(q_tokens))
                squashed = 1.0 - math.exp(-bm25 / 4.5)
                raw_scores[oid] = round(0.65 * squashed + 0.35 * coverage, 4)

            result[req["id"]] = raw_scores
        return result
