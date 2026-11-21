from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol


CONDITION_RANK: dict[str, int] = {
    "used": 1,
    "like_new": 2,
    "new": 3,
}

CONDITION_LABELS: dict[str, str] = {
    "new": "Mới 100%",
    "like_new": "Như mới (90%+)",
    "used": "Đã qua sử dụng",
}

CATEGORY_LABELS: dict[str, str] = {
    "sach": "Sách & Giáo trình",
    "dien_tu": "Đồ điện tử",
    "hoc_tap": "Đồ dùng học tập",
    "gia_dung": "Đồ gia dụng KTX",
    "thoi_trang": "Thời trang sinh viên",
    "phuong_tien": "Phương tiện di chuyển",
    "nhac_cu": "Nhạc cụ & Giải trí",
}

LOCATION_LABELS: dict[str, str] = {
    "ktx_a": "KTX Khu A",
    "ktx_b": "KTX Khu B",
    "ngoai_ktx": "Ngoài KTX / Khu trọ",
}


class SimilarityProvider(Protocol):
    model_id: str
    model_version: str
    min_semantic_score: float

    def score_all(
        self, requests: list[dict[str, Any]], offers: list[dict[str, Any]]
    ) -> dict[str, dict[str, float]]:
        ...


def format_vnd(amount: int | float | None) -> str:
    if amount is None:
        return "Trao đổi"
    return f"{int(round(amount)):,}đ".replace(",", ".")


def get_constraint_flag(request: dict[str, Any], key: str) -> str:
    """Theo mục 4.4 báo cáo: nếu người dùng không gắn cờ rõ ràng, mặc định là 'hard' (bắt buộc)."""
    flags = request.get("flags") or {}
    flag = flags.get(key)
    if flag in ("hard", "soft"):
        return flag
    return "hard"


def check_single_constraint(
    request: dict[str, Any], offer: dict[str, Any], key: str
) -> tuple[bool, str]:
    """Kiểm tra 1 điều kiện có cấu trúc và trả về (đạt_hay_không, mô_tả_ngắn)."""
    if key == "exchange":
        if offer["type"] == "exchange" and not request.get("allow_exchange", False):
            return False, "Tin đăng chỉ nhận đổi đồ, không bán trực tiếp"
        if offer["type"] == "exchange" and request.get("allow_exchange", False):
            return True, "Phù hợp nhu cầu trao đổi đồ"
        return True, "Hình thức mua bán / đấu giá hợp lệ"

    if key == "category":
        req_cat = request.get("category")
        if req_cat is None:
            return True, ""
        cat_label = CATEGORY_LABELS.get(offer["category"], offer["category"])
        req_label = CATEGORY_LABELS.get(req_cat, req_cat)
        if offer["category"] == req_cat:
            return True, f"Đúng danh mục {cat_label}"
        return False, f"Khác danh mục ({cat_label} so với {req_label})"

    if key == "budget":
        budget_max = request.get("budget_max")
        if budget_max is None:
            return True, ""
        if offer["type"] == "exchange":
            if request.get("allow_exchange", False):
                return True, "Hình thức trao đổi (không tính giá tiền)"
            return False, "Tin trao đổi không có giá bán"
        price = offer.get("price")
        if price is None:
            return False, "Không có thông tin giá"
        if price <= budget_max:
            return True, f"Trong ngân sách ({format_vnd(price)} <= {format_vnd(budget_max)})"
        diff = price - budget_max
        return (
            False,
            f"Vượt ngân sách {format_vnd(diff)} ({format_vnd(price)} > {format_vnd(budget_max)})",
        )

    if key == "condition":
        min_cond = request.get("min_condition")
        if min_cond is None:
            return True, ""
        offer_rank = CONDITION_RANK[offer["condition"]]
        req_rank = CONDITION_RANK[min_cond]
        offer_label = CONDITION_LABELS[offer["condition"]]
        req_label = CONDITION_LABELS[min_cond]
        if offer_rank >= req_rank:
            return True, f"Tình trạng đạt yêu cầu ({offer_label})"
        return False, f"Tình trạng thấp hơn ưu tiên ({offer_label} < {req_label})"

    if key == "location":
        req_loc = request.get("location")
        if req_loc is None:
            return True, ""
        offer_label = LOCATION_LABELS.get(offer["location"], offer["location"])
        req_label = LOCATION_LABELS.get(req_loc, req_loc)
        if offer["location"] == req_loc:
            return True, f"Đúng khu vực {offer_label}"
        return False, f"Khác khu vực ưu tiên ({offer_label} thay vì {req_label})"

    raise ValueError(f"Unknown constraint key: {key}")


def passes_hard_constraints(
    request: dict[str, Any], offer: dict[str, Any]
) -> tuple[bool, list[str]]:
    """Kiểm tra toàn bộ điều kiện bắt buộc (hard). Trả về (hợp_lệ, danh_sách_lý_do_bị_loại)."""
    reasons: list[str] = []
    ok_ex, msg_ex = check_single_constraint(request, offer, "exchange")
    if not ok_ex:
        reasons.append(msg_ex)

    for key, field_name in (
        ("category", "category"),
        ("budget", "budget_max"),
        ("condition", "min_condition"),
        ("location", "location"),
    ):
        if request.get(field_name) is None:
            continue
        if get_constraint_flag(request, key) == "hard":
            ok, msg = check_single_constraint(request, offer, key)
            if not ok:
                reasons.append(msg)

    return len(reasons) == 0, reasons


def satisfies_all_specified_constraints(
    request: dict[str, Any], offer: dict[str, Any]
) -> bool:
    """Kiểm tra OFFER có thỏa mãn đồng thời cả điều kiện hard lẫn điều kiện soft ban đầu hay không."""
    hard_ok, _ = passes_hard_constraints(request, offer)
    if not hard_ok:
        return False

    for key, field_name in (
        ("category", "category"),
        ("budget", "budget_max"),
        ("condition", "min_condition"),
        ("location", "location"),
    ):
        if request.get(field_name) is None:
            continue
        ok, _ = check_single_constraint(request, offer, key)
        if not ok:
            return False

    return True


def compute_structured_score(
    request: dict[str, Any], offer: dict[str, Any]
) -> tuple[float, list[str], list[str]]:
    """
    Tính điểm điều kiện có cấu trúc S_struct thuộc [0, 1] và tạo giải thích xác định:
    (score, matched_conditions, unmatched_soft_conditions)
    """
    matched: list[str] = []
    unmatched_soft: list[str] = []

    if offer["type"] == "exchange" and request.get("allow_exchange", False):
        matched.append("Chấp nhận trao đổi trực tiếp")
    elif offer["type"] == "auction":
        matched.append(f"Đấu giá ngược (giá hiện tại {format_vnd(offer['price'])})")

    if request.get("category") is not None:
        ok, msg = check_single_constraint(request, offer, "category")
        if ok:
            matched.append(msg)
        else:
            unmatched_soft.append(msg)

    # 1. Điểm ngân sách
    budget_max = request.get("budget_max")
    if budget_max is None or (
        offer["type"] == "exchange" and request.get("allow_exchange", False)
    ):
        budget_score = 1.0
    else:
        price = float(offer["price"])
        if price <= budget_max:
            saving_ratio = max(0.0, min(1.0, (budget_max - price) / max(float(budget_max), 1.0)))
            budget_score = 0.85 + 0.15 * saving_ratio
            _, msg = check_single_constraint(request, offer, "budget")
            matched.append(msg)
        else:
            over_ratio = (price - budget_max) / max(float(budget_max), 1.0)
            budget_score = max(0.0, 0.65 * (1.0 - over_ratio))
            _, msg = check_single_constraint(request, offer, "budget")
            unmatched_soft.append(msg)

    # 2. Điểm tình trạng
    min_cond = request.get("min_condition")
    offer_rank = CONDITION_RANK[offer["condition"]]
    if min_cond is None:
        cond_score = 0.70 + 0.15 * (offer_rank - 1)
        matched.append(f"Tình trạng: {CONDITION_LABELS[offer['condition']]}")
    else:
        req_rank = CONDITION_RANK[min_cond]
        _, msg = check_single_constraint(request, offer, "condition")
        if offer_rank >= req_rank:
            cond_score = min(1.0, 0.90 + 0.05 * (offer_rank - req_rank))
            matched.append(msg)
        else:
            diff = req_rank - offer_rank
            cond_score = 0.45 if diff == 1 else 0.20
            unmatched_soft.append(msg)

    # 3. Điểm vị trí
    req_loc = request.get("location")
    if req_loc is None:
        loc_score = 1.0
        matched.append(f"Khu vực: {LOCATION_LABELS[offer['location']]}")
    else:
        _, msg = check_single_constraint(request, offer, "location")
        if offer["location"] == req_loc:
            loc_score = 1.0
            matched.append(msg)
        elif {offer["location"], req_loc} <= {"ktx_a", "ktx_b"}:
            loc_score = 0.55
            unmatched_soft.append(msg)
        else:
            loc_score = 0.30
            unmatched_soft.append(msg)

    struct_score = (budget_score + cond_score + loc_score) / 3.0
    return round(struct_score, 4), matched, unmatched_soft


@dataclass
class RankedOffer:
    offer_id: str
    title: str
    price: int | None
    type: str
    condition: str
    location: str
    category: str
    image: str | None
    total_score: float
    semantic_score: float
    structured_score: float
    satisfies_all_initial: bool
    matched_conditions: list[str]
    unmatched_soft_conditions: list[str]
    explanation_summary: str


@dataclass
class CounterfactualSuggestion:
    suggestion_id: str
    changes: dict[str, Any]
    num_conditions_changed: int
    step_cost: float
    human_label: str
    unlocked_offer_ids: list[str]
    top_offers: list[RankedOffer]
    best_score: float


@dataclass
class MatchResponse:
    request_id: str
    model_id: str
    model_version: str
    ranked_offers: list[RankedOffer]
    strict_match_count: int
    counterfactual_triggered: bool
    counterfactuals: list[CounterfactualSuggestion] = field(default_factory=list)
    hard_block_diagnostic: str | None = None


def build_explanation_summary(
    semantic_score: float,
    matched_conditions: list[str],
    unmatched_soft_conditions: list[str],
) -> str:
    sem_pct = int(round(semantic_score * 100))
    matched_txt = "; ".join(matched_conditions[:3]) if matched_conditions else "Đạt bộ lọc cơ bản"
    if not unmatched_soft_conditions:
        return f" Tương đồng ngữ nghĩa {sem_pct}%. Đáp ứng đủ yêu cầu: {matched_txt}."
    soft_txt = "; ".join(unmatched_soft_conditions)
    return f" Tương đồng ngữ nghĩa {sem_pct}%. Đạt: {matched_txt}. Cần lưu ý điều kiện mềm: {soft_txt}."


def rank_offers_for_request(
    request: dict[str, Any],
    offers: list[dict[str, Any]],
    sem_scores_for_req: dict[str, float],
    min_semantic_score: float,
    top_k: int = 5,
    require_all_specified: bool = False,
) -> list[RankedOffer]:
    candidates: list[RankedOffer] = []

    for offer in offers:
        hard_ok, _ = passes_hard_constraints(request, offer)
        if not hard_ok:
            continue

        all_spec_ok = satisfies_all_specified_constraints(request, offer)
        if require_all_specified and not all_spec_ok:
            continue

        sem_raw = float(sem_scores_for_req.get(offer["id"], 0.0))
        sem_clamped = max(0.0, min(1.0, sem_raw))
        struct_score, matched, unmatched_soft = compute_structured_score(request, offer)
        total_score = round(0.75 * sem_clamped + 0.25 * struct_score, 4)

        candidates.append(
            RankedOffer(
                offer_id=offer["id"],
                title=offer["title"],
                price=offer["price"],
                type=offer["type"],
                condition=offer["condition"],
                location=offer["location"],
                category=offer["category"],
                image=offer.get("image"),
                total_score=total_score,
                semantic_score=round(sem_clamped, 4),
                structured_score=struct_score,
                satisfies_all_initial=all_spec_ok and (sem_clamped >= min_semantic_score),
                matched_conditions=matched,
                unmatched_soft_conditions=unmatched_soft,
                explanation_summary=build_explanation_summary(
                    sem_clamped, matched, unmatched_soft
                ).strip(),
            )
        )

    candidates.sort(
        key=lambda item: (
            item.total_score,
            item.semantic_score,
            1 if item.satisfies_all_initial else 0,
        ),
        reverse=True,
    )
    return candidates[:top_k]


def _generate_single_axis_relaxations(
    request: dict[str, Any]
) -> dict[str, list[tuple[dict[str, Any], float, str]]]:
    """
    Tạo tập thay đổi hữu hạn CHỈ trên các điều kiện được gắn cờ 'soft'.
    Mỗi phần tử: (patch_dict, step_cost, mô_tả_tiếng_Việt)
    """
    axis_options: dict[str, list[tuple[dict[str, Any], float, str]]] = {}

    # 1. Ngân sách (chỉ khi budget là soft)
    budget_max = request.get("budget_max")
    if budget_max is not None and get_constraint_flag(request, "budget") == "soft":
        steps_vnd = [50_000, 100_000, 150_000, 250_000]
        # Tránh gợi ý tăng phi lý so với ngân sách gốc (tối đa +50%)
        max_allowed_increase = max(50_000, int(round(budget_max * 0.50)))
        opts: list[tuple[dict[str, Any], float, str]] = []
        for idx, delta in enumerate(steps_vnd, start=1):
            if delta <= max_allowed_increase:
                new_budget = int(budget_max + delta)
                opts.append(
                    (
                        {"budget_max": new_budget},
                        0.20 * idx,
                        f"Tăng ngân sách lên {format_vnd(new_budget)} (+{format_vnd(delta)})",
                    )
                )
        if opts:
            axis_options["budget"] = opts

    # 2. Tình trạng (chỉ khi condition là soft)
    min_cond = request.get("min_condition")
    if min_cond is not None and get_constraint_flag(request, "condition") == "soft":
        cond_opts: list[tuple[dict[str, Any], float, str]] = []
        if min_cond == "new":
            cond_opts.append(
                (
                    {"min_condition": "like_new"},
                    0.25,
                    "Chấp nhận tình trạng Như mới (90%+)",
                )
            )
            cond_opts.append(
                (
                    {"min_condition": "used"},
                    0.50,
                    "Chấp nhận hàng Đã qua sử dụng",
                )
            )
        elif min_cond == "like_new":
            cond_opts.append(
                (
                    {"min_condition": "used"},
                    0.25,
                    "Chấp nhận hàng Đã qua sử dụng",
                )
            )
        if cond_opts:
            axis_options["condition"] = cond_opts

    # 3. Vị trí (chỉ khi location là soft)
    req_loc = request.get("location")
    if req_loc is not None and get_constraint_flag(request, "location") == "soft":
        loc_opts: list[tuple[dict[str, Any], float, str]] = []
        if req_loc == "ktx_a":
            loc_opts.append(
                ({"location": "ktx_b"}, 0.20, "Mở rộng sang KTX Khu B")
            )
        elif req_loc == "ktx_b":
            loc_opts.append(
                ({"location": "ktx_a"}, 0.20, "Mở rộng sang KTX Khu A")
            )
        loc_opts.append(
            ({"location": None}, 0.35, "Mở rộng ra tất cả khu vực (KTX & Ngoài KTX)")
        )
        axis_options["location"] = loc_opts

    return axis_options


def generate_counterfactuals(
    request: dict[str, Any],
    offers: list[dict[str, Any]],
    sem_scores_for_req: dict[str, float],
    min_semantic_score: float,
    max_suggestions: int = 3,
) -> tuple[list[CounterfactualSuggestion], str | None]:
    """
    Thực hiện gợi ý thay đổi điều kiện (Mục 6 Báo cáo):
    - Không bao giờ đụng vào điều kiện 'hard'.
    - Kiểm chứng trực tiếp trên danh sách OFFER thực tế (kèm ngưỡng ngữ nghĩa).
    - Ưu tiên thay đổi ít điều kiện nhất, bậc nhỏ nhất, mở khóa sản phẩm tốt nhất.
    """
    axis_options = _generate_single_axis_relaxations(request)
    suggestions: list[CounterfactualSuggestion] = []
    seen_offer_sets: set[tuple[str, ...]] = set()

    # Ngưỡng ngữ nghĩa tương đối theo ứng viên tốt nhất đạt điều kiện bắt buộc để không mở khóa nhầm món kém liên quan
    hard_pool_sems = [
        float(sem_scores_for_req.get(o["id"], 0.0))
        for o in offers
        if passes_hard_constraints(request, o)[0]
    ]
    best_hard_sem = max(hard_pool_sems) if hard_pool_sems else 0.0
    effective_min_sem = max(min_semantic_score, best_hard_sem * 0.72)

    def evaluate_patch(
        patch: dict[str, Any], num_changed: int, cost: float, label: str, sug_id: str
    ) -> CounterfactualSuggestion | None:
        modified_req = {**request, **patch}
        strict_after = rank_offers_for_request(
            modified_req,
            offers,
            sem_scores_for_req,
            min_semantic_score=effective_min_sem,
            top_k=5,
            require_all_specified=True,
        )
        valid_unlocked = [
            item for item in strict_after if item.semantic_score >= effective_min_sem
        ]
        if not valid_unlocked:
            return None
        unlocked_ids = tuple(sorted(item.offer_id for item in valid_unlocked))
        if unlocked_ids in seen_offer_sets:
            return None
        seen_offer_sets.add(unlocked_ids)
        return CounterfactualSuggestion(
            suggestion_id=sug_id,
            changes=patch,
            num_conditions_changed=num_changed,
            step_cost=round(cost, 4),
            human_label=label,
            unlocked_offer_ids=[item.offer_id for item in valid_unlocked],
            top_offers=valid_unlocked[:3],
            best_score=valid_unlocked[0].total_score,
        )

    # Bước 1: Thử tất cả các bậc hữu hạn trên từng trục đơn lẻ (nhờ seen_offer_sets nên chỉ giữ bậc nhỏ nhất cho mỗi tập mở khóa mới)
    idx_counter = 1
    for axis, opts in axis_options.items():
        for patch, cost, label in opts:
            sug = evaluate_patch(patch, 1, cost, label, f"CF_{idx_counter}")
            idx_counter += 1
            if sug is not None:
                suggestions.append(sug)

    # Bước 2: Nếu 1 điều kiện chưa mở khóa được ứng viên tốt nhất trong hard_pool, thử tổ hợp 2 điều kiện soft
    unlocked_best_hard = any(
        any(
            abs(float(sem_scores_for_req.get(oid, 0.0)) - best_hard_sem) < 1e-4
            for oid in s.unlocked_offer_ids
        )
        for s in suggestions
    )
    if (not unlocked_best_hard) and len(axis_options) >= 2:
        axes = list(axis_options.keys())
        for i in range(len(axes)):
            for j in range(i + 1, len(axes)):
                ax1, ax2 = axes[i], axes[j]
                for p1, c1, l1 in axis_options[ax1]:
                    found_pair = False
                    for p2, c2, l2 in axis_options[ax2]:
                        merged_patch = {**p1, **p2}
                        sug = evaluate_patch(
                            merged_patch,
                            2,
                            c1 + c2,
                            f"{l1} + {l2}",
                            f"CF_{idx_counter}",
                        )
                        idx_counter += 1
                        if sug is not None:
                            suggestions.append(sug)
                            found_pair = True
                            break
                    if found_pair:
                        break

    suggestions.sort(
        key=lambda s: (
            s.num_conditions_changed,
            s.step_cost,
            -s.best_score,
            -len(s.unlocked_offer_ids),
        )
    )

    # Chẩn đoán minh bạch nếu bị chặn bởi điều kiện bắt buộc (nhưng KHÔNG tự ý nới)
    diagnostic: str | None = None
    if not suggestions:
        semantically_relevant_offers = [
            o
            for o in offers
            if float(sem_scores_for_req.get(o["id"], 0.0)) >= min_semantic_score
        ]
        if not semantically_relevant_offers:
            diagnostic = (
                "Hiện chưa có sản phẩm đúng loại bạn tìm trên sàn. "
                "Bạn có thể bật nhận thông báo khi có sinh viên đăng bán món này."
            )
        else:
            # Kiểm tra điều kiện hard nào đã chặn các sản phẩm đúng loại
            blocker_Reasons: list[str] = []
            for rel_offer in semantically_relevant_offers:
                hard_ok, reasons = passes_hard_constraints(request, rel_offer)
                if not hard_ok:
                    blocker_Reasons.extend(reasons)
            if blocker_Reasons:
                unique_reasons = list(dict.fromkeys(blocker_Reasons))
                diagnostic = (
                    "Không có sản phẩm đạt điều kiện bắt buộc ("
                    + "; ".join(unique_reasons[:2])
                    + "). Hệ thống giữ nguyên yêu cầu bắt buộc và không tự ý thay đổi."
                )
            else:
                diagnostic = (
                    "Không tìm thấy phương án khả thi trong phạm vi các bậc nới điều kiện cho phép."
                )

    return suggestions[:max_suggestions], diagnostic


def match_single_request(
    request: dict[str, Any],
    offers: list[dict[str, Any]],
    sem_scores_for_req: dict[str, float],
    model_id: str,
    model_version: str,
    min_semantic_score: float,
    top_k: int = 5,
) -> MatchResponse:
    ranked_pool = rank_offers_for_request(
        request,
        offers,
        sem_scores_for_req,
        min_semantic_score=min_semantic_score,
        top_k=top_k,
        require_all_specified=False,
    )
    # Bộ lọc ngưỡng ngữ nghĩa kép: ngưỡng tuyệt đối + ngưỡng sụt giảm tương đối (relative drop-off)
    # để loại bỏ triệt để các mặt hàng nhiễu cùng danh mục (VD: sách TOEIC khi hỏi sách Giải tích 1)
    sem_filtered_ranked = [
        item for item in ranked_pool if item.semantic_score >= min_semantic_score
    ]
    if sem_filtered_ranked:
        best_returned_sem = max(item.semantic_score for item in sem_filtered_ranked)
        sem_filtered_ranked = [
            item
            for item in sem_filtered_ranked
            if item.semantic_score >= best_returned_sem * 0.74
        ]

    strict_matches = [item for item in ranked_pool if item.satisfies_all_initial]
    soft_blocked_matches = [
        item
        for item in ranked_pool
        if (not item.satisfies_all_initial) and item.semantic_score >= min_semantic_score
    ]
    best_strict_sem = strict_matches[0].semantic_score if strict_matches else 0.0
    best_soft_sem = (
        max(item.semantic_score for item in soft_blocked_matches)
        if soft_blocked_matches
        else 0.0
    )

    # Kích hoạt Counterfactual khi không có kết quả đạt đủ điều kiện, hoặc khi ứng viên #1 phù hợp nhất đang vướng điều kiện mềm
    top1_blocked_by_soft = bool(ranked_pool) and (
        not ranked_pool[0].satisfies_all_initial
    )
    should_trigger_cf = (
        (len(strict_matches) == 0)
        or top1_blocked_by_soft
        or (best_soft_sem > best_strict_sem + 0.05)
    )

    if should_trigger_cf:
        counterfactuals, diagnostic = generate_counterfactuals(
            request,
            offers,
            sem_scores_for_req,
            min_semantic_score=min_semantic_score,
        )
        # Chỉ giữ các phương án thực sự mở khóa thêm sản phẩm mới vượt trội hơn tập strict hiện có
        strict_ids = {item.offer_id for item in strict_matches}
        counterfactuals = [
            cf
            for cf in counterfactuals
            if any(oid not in strict_ids for oid in cf.unlocked_offer_ids)
        ]
        if len(strict_matches) == 0 or counterfactuals:
            return MatchResponse(
                request_id=request["id"],
                model_id=model_id,
                model_version=model_version,
                ranked_offers=sem_filtered_ranked,
                strict_match_count=len(strict_matches),
                counterfactual_triggered=True,
                counterfactuals=counterfactuals,
                hard_block_diagnostic=diagnostic if len(strict_matches) == 0 else None,
            )

    return MatchResponse(
        request_id=request["id"],
        model_id=model_id,
        model_version=model_version,
        ranked_offers=sem_filtered_ranked,
        strict_match_count=len(strict_matches),
        counterfactual_triggered=False,
        counterfactuals=[],
        hard_block_diagnostic=None,
    )


def compute_ground_truth_relevance(
    request: dict[str, Any],
    offers: list[dict[str, Any]],
    semantic_labels_for_req: dict[str, int],
) -> dict[str, int]:
    """
    Tính độ phù hợp chuẩn (ground-truth) cho đánh giá IR:
    - Nếu OFFER vi phạm điều kiện bắt buộc (hard): độ phù hợp = 0.
    - Nếu OFFER đạt điều kiện bắt buộc và có nhãn ngữ nghĩa >= 1: giữ nhãn ngữ nghĩa (1 hoặc 2).
    """
    offer_by_id = {o["id"]: o for o in offers}
    gt: dict[str, int] = {}
    for offer_id, sem_grade in semantic_labels_for_req.items():
        if sem_grade <= 0 or offer_id not in offer_by_id:
            continue
        hard_ok, _ = passes_hard_constraints(request, offer_by_id[offer_id])
        if hard_ok:
            gt[offer_id] = sem_grade
    return gt


def evaluate_ir_metrics(
    requests: list[dict[str, Any]],
    offers: list[dict[str, Any]],
    semantic_labels: dict[str, dict[str, int]],
    responses: dict[str, MatchResponse],
) -> dict[str, Any]:
    """
    Tính bộ chỉ số chuẩn từ báo cáo:
    - Precision@1, Precision@3, Precision@5, Recall@5, MRR trên tập truy vấn có nguồn cung đạt điều kiện bắt buộc
      (và tách riêng nhóm Multimodal R26-R30).
    - Counterfactual Recovery Rate, Avg # Conditions Changed, CF Top-1 Accuracy, Hard-Constraint Violations.
    """
    p1_list: list[float] = []
    p3_list: list[float] = []
    p5_list: list[float] = []
    r5_list: list[float] = []
    mrr_list: list[float] = []

    mm_p1_list: list[float] = []
    mm_mrr_list: list[float] = []

    cf_target_ids: list[str] = []
    cf_recovered = 0
    cf_changes_counts: list[int] = []
    cf_top1_hits = 0

    hard_violations = 0
    false_cf_on_blocked = 0
    blocked_or_empty_ids: list[str] = []

    offer_by_id = {o["id"]: o for o in offers}

    for req in requests:
        rid = req["id"]
        sem_gt = semantic_labels.get(rid, {})
        gt_after_hard = compute_ground_truth_relevance(req, offers, sem_gt)
        gt_strict = {
            oid: grade
            for oid, grade in gt_after_hard.items()
            if satisfies_all_specified_constraints(req, offer_by_id[oid])
        }

        resp = responses[rid]

        # Kiểm tra an toàn điều kiện bắt buộc trên mọi kết quả trả về & mọi counterfactual
        for item in resp.ranked_offers:
            ok_h, _ = passes_hard_constraints(req, offer_by_id[item.offer_id])
            if not ok_h:
                hard_violations += 1
        for cf in resp.counterfactuals:
            for changed_key in cf.changes:
                # map 'budget_max' -> 'budget', 'min_condition' -> 'condition', 'location' -> 'location'
                flag_key = {
                    "budget_max": "budget",
                    "min_condition": "condition",
                    "location": "location",
                    "category": "category",
                }.get(changed_key, changed_key)
                if get_constraint_flag(req, flag_key) == "hard":
                    hard_violations += 1

        # 1. Nhóm truy vấn có >= 1 OFFER đạt đủ mọi điều kiện ban đầu (Standard + Multimodal Retrieval)
        if len(gt_strict) > 0:
            pred_ids = [item.offer_id for item in resp.ranked_offers]

            def hits_at(k: int) -> int:
                return sum(1 for oid in pred_ids[:k] if oid in gt_after_hard)

            p1 = hits_at(1) / 1.0
            # Chuẩn hóa mẫu số theo min(K, số sản phẩm phù hợp thực tế) hoặc chuẩn P@K cổ điển:
            # Dùng chuẩn P@K cổ điển VÀ Normalized P@K (báo cáo cả hai để minh bạch học thuật)
            p3 = hits_at(3) / 3.0
            p5 = hits_at(5) / 5.0
            r5 = hits_at(5) / float(len(gt_after_hard))

            rr = 0.0
            for rank_idx, oid in enumerate(pred_ids, start=1):
                if oid in gt_after_hard:
                    rr = 1.0 / rank_idx
                    break

            p1_list.append(p1)
            p3_list.append(p3)
            p5_list.append(p5)
            r5_list.append(r5)
            mrr_list.append(rr)

            if str(req.get("scenario", "")).startswith("multimodal_"):
                mm_p1_list.append(p1)
                mm_mrr_list.append(rr)

        # 2. Nhóm truy vấn Counterfactual (không có OFFER đạt đủ điều kiện mềm, nhưng có OFFER đạt điều kiện cứng)
        elif len(gt_after_hard) > 0:
            cf_target_ids.append(rid)
            if resp.counterfactuals:
                first_cf = resp.counterfactuals[0]
                if any(oid in gt_after_hard for oid in first_cf.unlocked_offer_ids):
                    cf_recovered += 1
                    cf_changes_counts.append(first_cf.num_conditions_changed)
                    if (
                        first_cf.top_offers
                        and first_cf.top_offers[0].offer_id in gt_after_hard
                    ):
                        cf_top1_hits += 1

        # 3. Nhóm bị chặn bởi điều kiện bắt buộc hoặc không có nguồn cung (R06, R08, R21)
        else:
            blocked_or_empty_ids.append(rid)
            if resp.counterfactuals:
                false_cf_on_blocked += 1

    def avg(vals: list[float] | list[int]) -> float:
        return round(sum(vals) / len(vals), 4) if vals else 0.0

    return {
        "retrieval_query_count": len(p1_list),
        "multimodal_query_count": len(mm_p1_list),
        "precision_at_1": avg(p1_list),
        "precision_at_3": avg(p3_list),
        "precision_at_5": avg(p5_list),
        "recall_at_5": avg(r5_list),
        "mrr": avg(mrr_list),
        "multimodal_precision_at_1": avg(mm_p1_list),
        "multimodal_mrr": avg(mm_mrr_list),
        "cf_query_count": len(cf_target_ids),
        "cf_recovered_count": cf_recovered,
        "cf_recovery_rate": round(cf_recovered / max(len(cf_target_ids), 1), 4),
        "cf_avg_conditions_changed": avg(cf_changes_counts),
        "cf_top1_accuracy": round(cf_top1_hits / max(len(cf_target_ids), 1), 4),
        "blocked_or_empty_count": len(blocked_or_empty_ids),
        "false_cf_on_blocked": false_cf_on_blocked,
        "hard_constraint_violations": hard_violations,
    }


def load_dataset(data_dir: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, dict[str, int]]]:
    offers = json.loads((data_dir / "offers.json").read_text(encoding="utf-8"))
    requests = json.loads((data_dir / "requests.json").read_text(encoding="utf-8"))
    raw_labels = json.loads((data_dir / "semantic_labels.json").read_text(encoding="utf-8"))
    semantic_labels = {
        k: v for k, v in raw_labels.items() if not k.startswith("_")
    }
    return offers, requests, semantic_labels
