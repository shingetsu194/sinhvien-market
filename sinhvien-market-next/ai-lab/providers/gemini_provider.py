from __future__ import annotations

import mimetypes
import os
import time
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from providers.keyword_baseline import KeywordBM25Provider
from vector_store import TaggedVectorCache, content_hash, cosine_similarity


def load_gemini_keys() -> list[str]:
    raw_multi = os.getenv("GEMINI_API_KEYS", "")
    raw_single = os.getenv("GEMINI_API_KEY", "")
    keys = [
        k.strip()
        for k in (raw_multi.split(",") + [raw_single])
        if k.strip()
    ]
    return list(dict.fromkeys(keys))


def _clamp01(val: float) -> float:
    return max(0.0, min(1.0, val))


def calibrate_gemini_same_modal(raw_cos: float) -> float:
    # hiệu chuẩn khoảng cách cosine cùng phương thức (text<->text, image<->image) về [0, 1]
    return _clamp01((raw_cos - 0.45) / (0.83 - 0.45))


def calibrate_gemini_cross_modal(raw_cos: float) -> float:
    # hiệu chuẩn khoảng cách Modality Gap kênh chéo (text<->image, image<->text) về [0, 1]
    return _clamp01((raw_cos - 0.30) / (0.44 - 0.30))


class GeminiEmbedding2Provider:
    """
    M1 / B2-Gemini: Google Gemini Embedding 2 (gemini-embedding-2).
    - Hỗ trợ xoay vòng nhiều API key (round-robin + retry backoff khi gặp 429).
    - Lưu tách biệt vector 'text' và vector 'image' trong cùng không gian nhúng 768 chiều
      đúng cấu trúc bảng listing_embeddings (Mục 4.6 Báo cáo), kèm hiệu chuẩn Modality Gap.
    """

    def __init__(
        self,
        data_dir: Path,
        cache_dir: Path,
        multimodal: bool = True,
        output_dim: int = 768,
    ) -> None:
        self.data_dir = data_dir
        self.multimodal = multimodal
        self.output_dim = output_dim
        self.keys = load_gemini_keys()
        if not self.keys:
            raise RuntimeError(
                "Chưa cấu hình GEMINI_API_KEYS hoặc GEMINI_API_KEY trong file .env"
            )
        self._clients = [genai.Client(api_key=k) for k in self.keys]
        self._key_idx = 0
        self._resolved_api_model = self._resolve_model_name(cache_dir)

        mode_tag = "multimodal" if multimodal else "text-only"
        self.model_id = f"gemini-embedding-2-{mode_tag}"
        self.model_version = f"{self._resolved_api_model}-d{output_dim}"
        self.min_semantic_score = 0.40

        self.cache = TaggedVectorCache(
            cache_dir=cache_dir,
            model_id="gemini-embedding-2",
            model_version=self.model_version,
        )
        self.api_calls_made = 0
        self.total_api_ms = 0.0

    def _resolve_model_name(self, cache_dir: Path) -> str:
        preferred = os.getenv("GEMINI_MODEL", "gemini-embedding-2").strip()
        candidates = list(
            dict.fromkeys(
                [preferred, "gemini-embedding-2", "gemini-embedding-2-preview"]
            )
        )
        for model_name in candidates:
            expected_cache = (
                cache_dir
                / f"vectors_gemini-embedding-2__{model_name}-d{self.output_dim}.json"
            )
            if expected_cache.exists():
                return model_name
        last_err: Exception | None = None
        for model_name in candidates:
            try:
                client = self._clients[0]
                client.models.embed_content(
                    model=model_name,
                    contents="test",
                    config=types.EmbedContentConfig(
                        output_dimensionality=self.output_dim
                    ),
                )
                return model_name
            except Exception as exc:
                msg = str(exc).lower()
                if "not found" in msg or "404" in msg or "not supported" in msg:
                    last_err = exc
                    continue
                return model_name
        raise RuntimeError(
            f"Không tìm thấy model Gemini Embedding 2 trong danh sách {candidates}: {last_err}"
        )

    def _embed_with_rotation(
        self, contents: Any, task_type: str | None = None
    ) -> list[float]:
        max_attempts = max(len(self._clients) * 6, 8)
        last_exc: Exception | None = None

        cfg = (
            types.EmbedContentConfig(
                output_dimensionality=self.output_dim,
                task_type=task_type,
            )
            if task_type
            else types.EmbedContentConfig(output_dimensionality=self.output_dim)
        )

        for attempt in range(max_attempts):
            client = self._clients[self._key_idx % len(self._clients)]
            self._key_idx += 1
            t0 = time.perf_counter()
            try:
                resp = client.models.embed_content(
                    model=self._resolved_api_model,
                    contents=contents,
                    config=cfg,
                )
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                self.api_calls_made += 1
                self.total_api_ms += elapsed_ms
                if self.api_calls_made % 10 == 0:
                    self.cache.save()
                return list(resp.embeddings[0].values)
            except Exception as exc:
                last_exc = exc
                err_str = str(exc)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    wait_s = min(20.0, 2.5 * (attempt + 1))
                    print(
                        f"      [Gemini 429 rate-limit, đợi {wait_s:.1f}s rồi thử tiếp...]"
                    )
                    time.sleep(wait_s)
                    continue
                raise

        raise RuntimeError(
            f"Đã thử xoay vòng tất cả {len(self._clients)} Gemini API key nhưng vẫn bị giới hạn: {last_exc}"
        )

    def _get_text_vector(
        self, listing_id: str, text: str, task_type: str
    ) -> list[float]:
        modality = f"text_{task_type.lower()}"
        sha = content_hash(f"{task_type}::{text}", None)
        cached = self.cache.get(listing_id, modality, sha)
        if cached is not None:
            return cached
        vec = self._embed_with_rotation(contents=text, task_type=task_type)
        self.cache.put(listing_id, modality, sha, vec)
        return self.cache.get(listing_id, modality, sha) or vec

    def _get_image_vector(
        self, listing_id: str, rel_image: str | None
    ) -> list[float] | None:
        if not self.multimodal or not rel_image:
            return None
        img_path = self.data_dir / rel_image
        if not img_path.exists():
            return None
        modality = "image"
        sha = content_hash(None, img_path)
        cached = self.cache.get(listing_id, modality, sha)
        if cached is not None:
            return cached
        mime, _ = mimetypes.guess_type(str(img_path))
        part = types.Part.from_bytes(
            data=img_path.read_bytes(),
            mime_type=mime or "image/jpeg",
        )
        vec = self._embed_with_rotation(contents=[part], task_type=None)
        self.cache.put(listing_id, modality, sha, vec)
        return self.cache.get(listing_id, modality, sha) or vec

    def score_all(
        self, requests: list[dict[str, Any]], offers: list[dict[str, Any]]
    ) -> dict[str, dict[str, float]]:
        offer_pairs: dict[str, tuple[list[float], list[float] | None]] = {}
        for offer in offers:
            doc_text = f"{offer['title']}. {offer['description']}"
            t_vec = self._get_text_vector(
                offer["id"], doc_text, "RETRIEVAL_DOCUMENT"
            )
            i_vec = self._get_image_vector(offer["id"], offer.get("image"))
            offer_pairs[offer["id"]] = (t_vec, i_vec)

        req_pairs: dict[str, tuple[list[float], list[float] | None]] = {}
        for req in requests:
            t_vec = self._get_text_vector(
                req["id"], req["text"], "RETRIEVAL_QUERY"
            )
            i_vec = self._get_image_vector(req["id"], req.get("image"))
            req_pairs[req["id"]] = (t_vec, i_vec)

        self.cache.save()
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

                s_tt = calibrate_gemini_same_modal(cosine_similarity(q_text, d_text))
                kw = lexical_matrix[rid][oid]
                text_chan = (
                    _clamp01(0.72 * s_tt + 0.28 * kw) if kw > 0 else s_tt * 0.56
                )
                channel_scores = [text_chan]

                if d_img is not None:
                    margin_ti = ti_raws[oid] - mean_ti
                    s_ti_abs = calibrate_gemini_cross_modal(ti_raws[oid])
                    s_ti_margin = _clamp01((margin_ti - 0.025) / (0.10 - 0.025))
                    channel_scores.append(min(s_ti_abs, s_ti_margin) * 0.85 + 0.15 * s_tt)
                if q_img is not None:
                    margin_it = it_raws[oid] - mean_it
                    s_it_abs = _clamp01((it_raws[oid] - 0.28) / (0.40 - 0.28))
                    s_it_margin = _clamp01((margin_it - 0.03) / (0.12 - 0.03))
                    channel_scores.append(min(s_it_abs, s_it_margin) * 0.85 + 0.15 * s_tt)
                if q_img is not None and d_img is not None:
                    channel_scores.append(
                        _clamp01((cosine_similarity(q_img, d_img) - 0.52) / (0.86 - 0.52))
                    )

                req_scores[oid] = round(max(channel_scores), 4)

            scores[rid] = req_scores
        return scores
