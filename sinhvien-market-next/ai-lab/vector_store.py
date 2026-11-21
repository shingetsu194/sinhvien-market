from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any


def l2_normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    if norm <= 1e-12:
        return [0.0 for _ in vec]
    return [x / norm for x in vec]


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if len(vec_a) != len(vec_b):
        raise ValueError(
            f"Không được trộn không gian vector khác số chiều: {len(vec_a)} vs {len(vec_b)}"
        )
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a <= 1e-12 or norm_b <= 1e-12:
        return 0.0
    return dot / (norm_a * norm_b)


def fuse_vectors(
    text_vec: list[float] | None,
    image_vec: list[float] | None,
    text_weight: float = 0.45,
) -> list[float]:
    """Hợp nhất vector văn bản và vector ảnh trong cùng một không gian nhúng đa phương thức."""
    if text_vec is not None and image_vec is not None:
        if len(text_vec) != len(image_vec):
            raise ValueError("Vector văn bản và ảnh không cùng số chiều!")
        t_norm = l2_normalize(text_vec)
        i_norm = l2_normalize(image_vec)
        iw = 1.0 - text_weight
        merged = [text_weight * t + iw * im for t, im in zip(t_norm, i_norm)]
        return l2_normalize(merged)
    if text_vec is not None:
        return l2_normalize(text_vec)
    if image_vec is not None:
        return l2_normalize(image_vec)
    raise ValueError("Cần ít nhất text_vec hoặc image_vec.")


def content_hash(text: str | None, image_path: Path | None) -> str:
    h = hashlib.sha256()
    if text:
        h.update(text.encode("utf-8"))
    if image_path and image_path.exists():
        h.update(b"||IMAGE||")
        h.update(image_path.read_bytes())
    return h.hexdigest()[:24]


class TaggedVectorCache:
    """
    Lưu trữ vector kèm model_id, model_version, modality và mã băm nội dung (Mục 4.5 & 4.6 Báo cáo).
    Đảm bảo không bao giờ trộn lẫn không gian vector giữa hai mô hình hoặc hai phiên bản khác nhau.
    """

    def __init__(self, cache_dir: Path, model_id: str, model_version: str) -> None:
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.model_id = model_id
        self.model_version = model_version
        safe_name = f"{model_id}__{model_version}".replace("/", "_").replace(":", "_")
        self.file_path = self.cache_dir / f"vectors_{safe_name}.json"
        self._records: dict[str, dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        if not self.file_path.exists():
            return
        raw = json.loads(self.file_path.read_text(encoding="utf-8"))
        if (
            raw.get("model_id") != self.model_id
            or raw.get("model_version") != self.model_version
        ):
            raise RuntimeError(
                f"Xung đột phiên bản vector cache trong {self.file_path}: "
                f"{raw.get('model_id')}@{raw.get('model_version')} != {self.model_id}@{self.model_version}"
            )
        self._records = raw.get("records", {})

    def save(self) -> None:
        payload = {
            "model_id": self.model_id,
            "model_version": self.model_version,
            "record_count": len(self._records),
            "records": self._records,
        }
        self.file_path.write_text(
            json.dumps(payload, ensure_ascii=False), encoding="utf-8"
        )

    @staticmethod
    def _make_key(listing_id: str, modality: str, sha: str) -> str:
        return f"{listing_id}::{modality}::{sha}"

    def get(self, listing_id: str, modality: str, sha: str) -> list[float] | None:
        rec = self._records.get(self._make_key(listing_id, modality, sha))
        if rec is None:
            return None
        return rec["vector"]

    def put(
        self, listing_id: str, modality: str, sha: str, vector: list[float]
    ) -> None:
        key = self._make_key(listing_id, modality, sha)
        self._records[key] = {
            "listing_id": listing_id,
            "modality": modality,
            "model_id": self.model_id,
            "model_version": self.model_version,
            "dimensions": len(vector),
            "sha256": sha,
            "vector": [round(float(x), 6) for x in l2_normalize(vector)],
        }
