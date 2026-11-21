from __future__ import annotations

import argparse
import dataclasses
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from matching_core import (
    evaluate_ir_metrics,
    load_dataset,
    match_single_request,
)
from providers.keyword_baseline import KeywordBM25Provider


def format_pct(val: float) -> str:
    return f"{val * 100:.1f}%"


def build_markdown_report(runs: list[dict[str, Any]]) -> str:
    lines: list[str] = [
        "# Báo cáo Thực nghiệm Ghép nối AI REQUEST – OFFER",
        "",
        "## 1. Bảng so sánh tổng hợp giữa các phương pháp",
        "",
        "| Phương pháp | Model ID | P@1 | P@3 | Recall@5 | MRR | Multimodal P@1 | Multimodal MRR | CF Recovery | Số ĐK đổi TB | Vi phạm Hard | Thời gian (ms) |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in runs:
        m = r["metrics"]
        lines.append(
            f"| **{r['label']}** | `{r['model_id']}` | "
            f"{format_pct(m['precision_at_1'])} | "
            f"{format_pct(m['precision_at_3'])} | "
            f"{format_pct(m['recall_at_5'])} | "
            f"{m['mrr']:.3f} | "
            f"**{format_pct(m['multimodal_precision_at_1'])}** | "
            f"{m['multimodal_mrr']:.3f} | "
            f"{format_pct(m['cf_recovery_rate'])} ({m['cf_recovered_count']}/{m['cf_query_count']}) | "
            f"{m['cf_avg_conditions_changed']:.2f} | "
            f"{m['hard_constraint_violations']} | "
            f"{r['elapsed_ms']:.1f} |"
        )

    lines.extend(
        [
            "",
            "## 2. Chi tiết kết quả từng truy vấn Multimodal (R26 – R30) & Counterfactual (R04, R18, R19, R20, R24, R31)",
            "",
        ]
    )

    highlight_ids = ["R26", "R27", "R28", "R29", "R30", "R04", "R18", "R19", "R20", "R24", "R31"]
    for r in runs:
        lines.append(f"### {r['label']} (`{r['model_version']}`)")
        resps = r["sample_highlights"]
        for rid in highlight_ids:
            if rid not in resps:
                continue
            item = resps[rid]
            top1 = item["top1"]
            cf_txt = item["cf_summary"]
            lines.append(f"- **{rid}**: Top-1 = {top1} | Counterfactual = {cf_txt}")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Chạy thực nghiệm so sánh Keyword BM25, Text-Only, Gemini Embedding 2 và Jina-CLIP-v2"
    )
    parser.add_argument(
        "--skip-gemini", action="store_true", help="Bỏ qua Gemini Embedding 2"
    )
    parser.add_argument(
        "--skip-jina", action="store_true", help="Bỏ qua Jina-CLIP-v2"
    )
    args = parser.parse_args()

    lab_dir = Path(__file__).resolve().parent
    load_dotenv(lab_dir / ".env")

    data_dir = lab_dir / "data"
    cache_dir = lab_dir / "cache"
    results_dir = lab_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    offers, requests, semantic_labels = load_dataset(data_dir)
    runs: list[dict[str, Any]] = []
    exported_matrices: dict[str, dict[str, dict[str, float]]] = {}

    def execute_provider(label: str, provider: Any) -> None:
        print(f"\n>>> Đang chạy: {label} ({provider.model_id} @ {provider.model_version}) ...")
        t0 = time.perf_counter()
        sim_matrix = provider.score_all(requests, offers)
        responses = {
            req["id"]: match_single_request(
                request=req,
                offers=offers,
                sem_scores_for_req=sim_matrix[req["id"]],
                model_id=provider.model_id,
                model_version=provider.model_version,
                min_semantic_score=provider.min_semantic_score,
            )
            for req in requests
        }
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        metrics = evaluate_ir_metrics(requests, offers, semantic_labels, responses)

        highlights: dict[str, dict[str, str]] = {}
        for rid, resp in responses.items():
            top1_str = (
                f"{resp.ranked_offers[0].offer_id} ({resp.ranked_offers[0].title}, sem={resp.ranked_offers[0].semantic_score:.2f})"
                if resp.ranked_offers
                else "Không có"
            )
            if resp.counterfactuals:
                cf0 = resp.counterfactuals[0]
                cf_str = f"{cf0.human_label} -> mở khóa {', '.join(cf0.unlocked_offer_ids)}"
            elif resp.hard_block_diagnostic:
                cf_str = resp.hard_block_diagnostic
            else:
                cf_str = "Đạt điều kiện ngay từ đầu (không cần nới)"
            highlights[rid] = {"top1": top1_str, "cf_summary": cf_str}

        exported_matrices[provider.model_id] = sim_matrix
        runs.append(
            {
                "label": label,
                "model_id": provider.model_id,
                "model_version": provider.model_version,
                "min_semantic_score": provider.min_semantic_score,
                "elapsed_ms": round(elapsed_ms, 2),
                "metrics": metrics,
                "sample_highlights": highlights,
                "sample_responses": {
                    rid: dataclasses.asdict(resp) for rid, resp in responses.items()
                },
            }
        )
        print(
            f"    Hoàn tất trong {elapsed_ms:.1f} ms | "
            f"P@1={metrics['precision_at_1']*100:.1f}% | "
            f"MM P@1={metrics['multimodal_precision_at_1']*100:.1f}% | "
            f"MRR={metrics['mrr']:.3f} | "
            f"CF Recovery={metrics['cf_recovery_rate']*100:.1f}%"
        )

    # 1. Baseline B1: Keyword BM25
    execute_provider("B1 - Keyword BM25 (Tiếng Việt)", KeywordBM25Provider())

    # 2. Gemini Embedding 2 (B2 Text-Only + M1 Multimodal)
    has_gemini_key = bool(
        os.getenv("GEMINI_API_KEYS", "").strip()
        or os.getenv("GEMINI_API_KEY", "").strip()
    )
    if not args.skip_gemini and has_gemini_key:
        from providers.gemini_provider import GeminiEmbedding2Provider

        gem_dim = int(os.getenv("GEMINI_OUTPUT_DIM", "768"))
        execute_provider(
            "B2 (Gemini) - Text-Only Embedding",
            GeminiEmbedding2Provider(
                data_dir=data_dir,
                cache_dir=cache_dir,
                multimodal=False,
                output_dim=gem_dim,
            ),
        )
        execute_provider(
            "M1 - Gemini Embedding 2 (Multimodal)",
            GeminiEmbedding2Provider(
                data_dir=data_dir,
                cache_dir=cache_dir,
                multimodal=True,
                output_dim=gem_dim,
            ),
        )
    elif not args.skip_gemini:
        print(
            "\n[BỎ QUA GEMINI EMBEDDING 2]: Chưa có GEMINI_API_KEYS trong ai-lab/.env"
        )

    # 3. Jina-CLIP-v2 (B2 Text-Only + M2 Multimodal)
    has_jina_api = bool(os.getenv("JINA_API_KEY", "").strip())
    jina_mode_env = os.getenv("JINA_MODE", "auto").strip().lower()
    can_try_local_jina = False
    if jina_mode_env == "local" or (jina_mode_env == "auto" and not has_jina_api):
        try:
            import torch  # noqa: F401
            import transformers  # noqa: F401

            can_try_local_jina = True
        except ImportError:
            can_try_local_jina = False

    if not args.skip_jina and (has_jina_api or can_try_local_jina):
        from providers.jina_clip_provider import JinaClipV2Provider

        jina_dim = int(os.getenv("JINA_OUTPUT_DIM", "1024"))
        execute_provider(
            "B2 (Jina) - Text-Only Embedding",
            JinaClipV2Provider(
                data_dir=data_dir,
                cache_dir=cache_dir,
                multimodal=False,
                output_dim=jina_dim,
            ),
        )
        execute_provider(
            "M2 - Jina-CLIP-v2 (Multimodal)",
            JinaClipV2Provider(
                data_dir=data_dir,
                cache_dir=cache_dir,
                multimodal=True,
                output_dim=jina_dim,
            ),
        )
    elif not args.skip_jina:
        print(
            "\n[BỎ QUA JINA-CLIP-V2]: Chưa có JINA_API_KEY trong ai-lab/.env (hoặc chưa cài torch/transformers cho local mode)"
        )

    report_md = build_markdown_report(runs)
    report_path = results_dir / "benchmark_report.md"
    report_path.write_text(report_md, encoding="utf-8")

    json_payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "dataset_summary": {
            "offer_count": len(offers),
            "request_count": len(requests),
        },
        "runs": [
            {
                "label": r["label"],
                "model_id": r["model_id"],
                "model_version": r["model_version"],
                "min_semantic_score": r["min_semantic_score"],
                "elapsed_ms": r["elapsed_ms"],
                "metrics": r["metrics"],
            }
            for r in runs
        ],
        "similarity_matrices": exported_matrices,
    }
    json_path = results_dir / "benchmark_results.json"
    json_path.write_text(
        json.dumps(json_payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"\n=== ĐÃ LƯU BÁO CÁO THỰC NGHIỆM ===")
    print(f"- Markdown: {report_path}")
    print(f"- JSON    : {json_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
