from __future__ import annotations

import base64
import mimetypes
import os
import time
from pathlib import Path
from typing import Any

import requests

from providers.keyword_baseline import KeywordBM25Provider
from vector_store import (
    TaggedVectorCache,
    content_hash,
    cosine_similarity,
)


def _clamp01(val: float) -> float:
    return max(0.0, min(1.0, val))


def calibrate_jina_same_modal(raw_cos: float) -> float:
    return _clamp01((raw_cos - 0.38) / (0.78 - 0.38))


def calibrate_jina_cross_modal(raw_cos: float) -> float:
    return _clamp01((raw_cos - 0.21) / (0.33 - 0.21))


class JinaClipV2Provider:
    """
    M2 / B2-Jina: jinaai/jina-clip-v2 (đa ngôn ngữ + đa phương thức Văn bản & Ảnh).
    Hỗ trợ 2 chế độ thực thi:
      1. 'api'  : Gọi Jina Embeddings API (https://api.jina.ai/v1/embeddings) với JINA_API_KEY.
      2. 'local': Chạy cục bộ bằng PyTorch + HuggingFace Transformers.
    Lưu riêng vector 'text' và 'image' đúng thiết kế bảng listing_embeddings (Mục 4.6 Báo cáo).
    """

    def __init__(
        self,
        data_dir: Path,
        cache_dir: Path,
        multimodal: bool = True,
        output_dim: int = 1024,
    ) -> None:
        self.data_dir = data_dir
        self.multimodal = multimodal
        self.output_dim = output_dim

        raw_mode = os.getenv("JINA_MODE", "auto").strip().lower()
        self.api_key = os.getenv("JINA_API_KEY", "").strip()
        if raw_mode == "auto":
            self.mode = "api" if self.api_key else "local"
        else:
            self.mode = raw_mode

        mode_tag = "multimodal" if multimodal else "text-only"
        self.model_id = f"jina-clip-v2-{mode_tag}"
        self.model_version = f"jina-clip-v2-{self.mode}-d{output_dim}"
        self.min_semantic_score = 0.32

        self.cache = TaggedVectorCache(
            cache_dir=cache_dir,
            model_id="jina-clip-v2",
            model_version=f"v2-d{output_dim}",
        )
        self._local_model: Any = None
        self._local_device: str = "cpu"
        self.calls_made = 0
        self.total_embed_ms = 0.0

    def _ensure_local_model(self) -> None:
        if self._local_model is not None:
            return
        try:
            import torch
            from transformers import AutoModel
        except ImportError as exc:
            raise RuntimeError(
                "Chế độ JINA_MODE=local cần cài đặt torch, transformers, timm, einops "
                "(hoặc điền JINA_API_KEY vào .env để chạy chế độ API nhanh gọn)."
            ) from exc

        hf_token = os.getenv("HF_TOKEN", "").strip() or None
        self._local_device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if self._local_device == "cuda" else torch.float32
        self._local_model = AutoModel.from_pretrained(
            "jinaai/jina-clip-v2",
            trust_remote_code=True,
            token=hf_token,
            torch_dtype=dtype,
        ).to(self._local_device)
        self._local_model.eval()

    def _embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        t0 = time.perf_counter()
        if self.mode == "api":
            if not self.api_key:
                raise RuntimeError("Thiếu JINA_API_KEY trong .env cho JINA_MODE=api")
            resp = requests.post(
                "https://api.jina.ai/v1/embeddings",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                json={
                    "model": "jina-clip-v2",
                    "dimensions": self.output_dim,
                    "normalized": True,
                    "input": [{"text": t} for t in texts],
                },
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            data.sort(key=lambda x: x["index"])
            vecs = [item["embedding"] for item in data]
        else:
            self._ensure_local_model()
            arr = self._local_model.encode_text(
                texts, truncate_dim=self.output_dim
            )
            vecs = arr.tolist() if hasattr(arr, "tolist") else [list(v) for v in arr]

        self.calls_made += 1
        self.total_embed_ms += (time.perf_counter() - t0) * 1000.0
        return vecs

    def _embed_images(self, image_paths: list[Path]) -> list[list[float]]:
        if not image_paths:
            return []
        t0 = time.perf_counter()
        if self.mode == "api":
            if not self.api_key:
                raise RuntimeError("Thiếu JINA_API_KEY trong .env cho JINA_MODE=api")
            inputs = []
            for p in image_paths:
                mime, _ = mimetypes.guess_type(str(p))
                b64 = base64.b64encode(p.read_bytes()).decode("ascii")
                inputs.append({"image": f"data:{mime or 'image/jpeg'};base64,{b64}"})
            resp = requests.post(
                "https://api.jina.ai/v1/embeddings",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                json={
                    "model": "jina-clip-v2",
                    "dimensions": self.output_dim,
                    "normalized": True,
                    "input": inputs,
                },
                timeout=90,
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            data.sort(key=lambda x: x["index"])
            vecs = [item["embedding"] for item in data]
        else:
            from PIL import Image

            self._ensure_local_model()
            pil_imgs = [Image.open(p).convert("RGB") for p in image_paths]
            arr = self._local_model.encode_image(
                pil_imgs, truncate_dim=self.output_dim
            )
            vecs = arr.tolist() if hasattr(arr, "tolist") else [list(v) for v in arr]

        self.calls_made += 1
        self.total_embed_ms += (time.perf_counter() - t0) * 1000.0
        return vecs

    def _prepare_entity_vectors(
        self, items: list[dict[str, Any]], is_query: bool
    ) -> dict[str, tuple[list[float], list[float] | None]]:
        missing_texts: list[tuple[str, str, str]] = []
        for item in items:
            lid = item["id"]
            txt = (
                item["text"]
                if is_query
                else f"{item['title']}. {item['description']}"
            )
            sha = content_hash(f"clip_text::{txt}", None)
            if self.cache.get(lid, "text_clip", sha) is None:
                missing_texts.append((lid, txt, sha))

        if missing_texts:
            batch_size = 20
            for start in range(0, len(missing_texts), batch_size):
                chunk = missing_texts[start : start + batch_size]
                vecs = self._embed_texts([c[1] for c in chunk])
                for (lid, _, sha), vec in zip(chunk, vecs):
                    self.cache.put(lid, "text_clip", sha, vec)

        if self.multimodal:
            missing_imgs: list[tuple[str, Path, str]] = []
            for item in items:
                rel_img = item.get("image")
                if not rel_img:
                    continue
                img_path = self.data_dir / rel_img
                if not img_path.exists():
                    continue
                sha = content_hash(None, img_path)
                if self.cache.get(item["id"], "image", sha) is None:
                    missing_imgs.append((item["id"], img_path, sha))

            if missing_imgs:
                batch_size = 6
                for start in range(0, len(missing_imgs), batch_size):
                    chunk = missing_imgs[start : start + batch_size]
                    vecs = self._embed_images([c[1] for c in chunk])
                    for (lid, _, sha), vec in zip(chunk, vecs):
                        self.cache.put(lid, "image", sha, vec)

        self.cache.save()

        out: dict[str, tuple[list[float], list[float] | None]] = {}
        for item in items:
            lid = item["id"]
            txt = (
                item["text"]
                if is_query
                else f"{item['title']}. {item['description']}"
            )
            t_sha = content_hash(f"clip_text::{txt}", None)
            t_vec = self.cache.get(lid, "text_clip", t_sha)
            assert t_vec is not None

            i_vec: list[float] | None = None
            if self.multimodal and item.get("image"):
                img_path = self.data_dir / item["image"]
                if img_path.exists():
                    i_sha = content_hash(None, img_path)
                    i_vec = self.cache.get(lid, "image", i_sha)
            out[lid] = (t_vec, i_vec)
        return out

    def score_all(
        self, requests: list[dict[str, Any]], offers: list[dict[str, Any]]
    ) -> dict[str, dict[str, float]]:
        offer_pairs = self._prepare_entity_vectors(offers, is_query=False)
        req_pairs = self._prepare_entity_vectors(requests, is_query=True)
        lexical_matrix = KeywordBM25Provider().score_all(requests, offers)

        scores: dict[str, dict[str, float]] = {}
        for req in requests:
            rid = req["id"]
            q_text, q_img = req_pairs[rid]
            req_scores: dict[str, float] = {}

            ti_raws = {
                o["id"]: cosine_similarity(q_text, offer_pairs[o["id"]][1])
                for o in offers
                if offer_pairs[o["id"]][1] is not None
            }
            mean_ti = sum(ti_raws.values()) / len(ti_raws) if ti_raws else 0.0

            it_raws = (
                {
                    o["id"]: cosine_similarity(q_img, offer_pairs[o["id"]][0])
                    for o in offers
                }
                if q_img is not None
                else {}
            )
            mean_it = sum(it_raws.values()) / len(it_raws) if it_raws else 0.0

            for offer in offers:
                oid = offer["id"]
                d_text, d_img = offer_pairs[oid]

                s_tt = calibrate_jina_same_modal(cosine_similarity(q_text, d_text))
                kw = lexical_matrix[rid][oid]
                text_chan = (
                    _clamp01(0.72 * s_tt + 0.28 * kw) if kw > 0 else s_tt * 0.56
                )
                channel_scores = [text_chan]

                if d_img is not None:
                    margin_ti = ti_raws[oid] - mean_ti
                    s_ti_abs = calibrate_jina_cross_modal(ti_raws[oid])
                    s_ti_margin = _clamp01((margin_ti - 0.025) / (0.10 - 0.025))
                    channel_scores.append(min(s_ti_abs, s_ti_margin) * 0.85 + 0.15 * s_tt)
                if q_img is not None:
                    margin_it = it_raws[oid] - mean_it
                    s_it_abs = calibrate_jina_cross_modal(it_raws[oid])
                    s_it_margin = _clamp01((margin_it - 0.035) / (0.12 - 0.035))
                    channel_scores.append(min(s_it_abs, s_it_margin) * 0.85 + 0.15 * s_tt)
                if q_img is not None and d_img is not None:
                    channel_scores.append(
                        _clamp01((cosine_similarity(q_img, d_img) - 0.45) / (0.85 - 0.45))
                    )

                req_scores[oid] = round(max(channel_scores), 4)

            scores[rid] = req_scores
        return scores
