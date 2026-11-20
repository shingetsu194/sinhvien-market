import type {
  BuyerRequest,
  ConditionLevel,
  ConstraintKey,
  ConstraintRigidity,
  CounterfactualOption,
  EmbeddingModelId,
  LocationCode,
  MarketplaceOffer,
  MatchingCategorySlug,
  RankedOfferMatch,
  RequestMatchResult,
} from "@/lib/types/matching";

export const CONDITION_RANK: Record<ConditionLevel, number> = {
  used: 1,
  like_new: 2,
  new: 3,
};

export const CONDITION_LABELS: Record<ConditionLevel, string> = {
  new: "Mới 100%",
  like_new: "Như mới (90%+)",
  used: "Đã qua sử dụng",
};

export const CATEGORY_LABELS: Record<MatchingCategorySlug, string> = {
  sach: "Sách & Giáo trình",
  dien_tu: "Đồ điện tử",
  hoc_tap: "Đồ dùng học tập",
  gia_dung: "Đồ gia dụng KTX",
  thoi_trang: "Thời trang sinh viên",
  nhac_cu: "Nhạc cụ & Giải trí",
};

export const LOCATION_LABELS: Record<LocationCode, string> = {
  ktx_a: "KTX Khu A",
  ktx_b: "KTX Khu B",
  ngoai_ktx: "Ngoài KTX / Khu trọ",
};

export const MODEL_META: Record<
  EmbeddingModelId,
  { label: string; version: string; minSemanticScore: number; badge: string }
> = {
  "gemini-embedding-2-multimodal": {
    label: "Gemini Embedding 2 (Đa phương thức)",
    version: "gemini-embedding-2-d768",
    minSemanticScore: 0.4,
    badge: "Google Cloud API • Text + Image",
  },
  "jina-clip-v2-multimodal": {
    label: "Jina-CLIP-v2 (Đa phương thức)",
    version: "jina-clip-v2-d1024",
    minSemanticScore: 0.32,
    badge: "Đa ngôn ngữ • Text + Image",
  },
  "gemini-embedding-2-text-only": {
    label: "Đối chứng B2 (Gemini Chỉ văn bản)",
    version: "gemini-embedding-2-text-d768",
    minSemanticScore: 0.4,
    badge: "Baseline B2 • Text-Only",
  },
  "jina-clip-v2-text-only": {
    label: "Đối chứng B2 (Jina Chỉ văn bản)",
    version: "jina-clip-v2-text-d1024",
    minSemanticScore: 0.32,
    badge: "Baseline B2 • Text-Only",
  },
  "keyword-bm25-vi": {
    label: "Đối chứng B1 (Từ khóa BM25)",
    version: "keyword-bm25-vi-1.0.0",
    minSemanticScore: 0.28,
    badge: "Baseline B1 • Keyword",
  },
};

export function formatMatchingVnd(amount: number | null): string {
  if (amount === null) return "Trao đổi";
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

/**
 * Quy tắc an toàn Mục 4.4 Báo cáo: nếu người dùng không gắn cờ rõ ràng, mặc định là 'hard' (bắt buộc).
 */
export function getConstraintFlag(
  request: BuyerRequest,
  key: ConstraintKey,
): ConstraintRigidity {
  const flag = request.flags?.[key];
  return flag === "soft" ? "soft" : "hard";
}

export function checkSingleConstraint(
  request: BuyerRequest,
  offer: MarketplaceOffer,
  key: ConstraintKey | "exchange",
): { ok: boolean; message: string } {
  if (key === "exchange") {
    if (offer.type === "exchange" && !request.allow_exchange) {
      return {
        ok: false,
        message: "Tin đăng chỉ nhận đổi đồ, không bán trực tiếp",
      };
    }
    if (offer.type === "exchange" && request.allow_exchange) {
      return { ok: true, message: "Phù hợp nhu cầu trao đổi đồ" };
    }
    return { ok: true, message: "Hình thức mua bán / đấu giá hợp lệ" };
  }

  if (key === "category") {
    if (request.category === null) return { ok: true, message: "" };
    const offerCat = CATEGORY_LABELS[offer.category];
    const reqCat = CATEGORY_LABELS[request.category];
    if (offer.category === request.category) {
      return { ok: true, message: `Đúng danh mục ${offerCat}` };
    }
    return {
      ok: false,
      message: `Khác danh mục (${offerCat} so với ${reqCat})`,
    };
  }

  if (key === "budget") {
    if (request.budget_max === null) return { ok: true, message: "" };
    if (offer.type === "exchange") {
      return request.allow_exchange
        ? { ok: true, message: "Hình thức trao đổi (không tính giá tiền)" }
        : { ok: false, message: "Tin trao đổi không có giá bán" };
    }
    if (offer.price === null) {
      return { ok: false, message: "Không có thông tin giá" };
    }
    if (offer.price <= request.budget_max) {
      return {
        ok: true,
        message: `Trong ngân sách (${formatMatchingVnd(offer.price)} <= ${formatMatchingVnd(request.budget_max)})`,
      };
    }
    const diff = offer.price - request.budget_max;
    return {
      ok: false,
      message: `Vượt ngân sách ${formatMatchingVnd(diff)} (${formatMatchingVnd(offer.price)} > ${formatMatchingVnd(request.budget_max)})`,
    };
  }

  if (key === "condition") {
    if (request.min_condition === null) return { ok: true, message: "" };
    const offerRank = CONDITION_RANK[offer.condition];
    const reqRank = CONDITION_RANK[request.min_condition];
    const offerLabel = CONDITION_LABELS[offer.condition];
    const reqLabel = CONDITION_LABELS[request.min_condition];
    if (offerRank >= reqRank) {
      return { ok: true, message: `Tình trạng đạt yêu cầu (${offerLabel})` };
    }
    return {
      ok: false,
      message: `Tình trạng thấp hơn ưu tiên (${offerLabel} < ${reqLabel})`,
    };
  }

  if (request.location === null) return { ok: true, message: "" };
  const offerLoc = LOCATION_LABELS[offer.location];
  const reqLoc = LOCATION_LABELS[request.location];
  if (offer.location === request.location) {
    return { ok: true, message: `Đúng khu vực ${offerLoc}` };
  }
  return {
    ok: false,
    message: `Khác khu vực ưu tiên (${offerLoc} thay vì ${reqLoc})`,
  };
}

export function passesHardConstraints(
  request: BuyerRequest,
  offer: MarketplaceOffer,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const ex = checkSingleConstraint(request, offer, "exchange");
  if (!ex.ok) reasons.push(ex.message);

  const pairs: Array<[ConstraintKey, unknown]> = [
    ["category", request.category],
    ["budget", request.budget_max],
    ["condition", request.min_condition],
    ["location", request.location],
  ];

  for (const [key, val] of pairs) {
    if (val === null || val === undefined) continue;
    if (getConstraintFlag(request, key) === "hard") {
      const res = checkSingleConstraint(request, offer, key);
      if (!res.ok) reasons.push(res.message);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

export function satisfiesAllSpecifiedConstraints(
  request: BuyerRequest,
  offer: MarketplaceOffer,
): boolean {
  const hard = passesHardConstraints(request, offer);
  if (!hard.ok) return false;

  const pairs: Array<[ConstraintKey, unknown]> = [
    ["category", request.category],
    ["budget", request.budget_max],
    ["condition", request.min_condition],
    ["location", request.location],
  ];

  for (const [key, val] of pairs) {
    if (val === null || val === undefined) continue;
    if (!checkSingleConstraint(request, offer, key).ok) return false;
  }
  return true;
}

export function computeStructuredScore(
  request: BuyerRequest,
  offer: MarketplaceOffer,
): {
  score: number;
  matchedConditions: string[];
  unmatchedSoftConditions: string[];
} {
  const matchedConditions: string[] = [];
  const unmatchedSoftConditions: string[] = [];

  if (offer.type === "exchange" && request.allow_exchange) {
    matchedConditions.push("Chấp nhận trao đổi trực tiếp");
  } else if (offer.type === "auction") {
    matchedConditions.push(
      `Đấu giá ngược (giá hiện tại ${formatMatchingVnd(offer.price)})`,
    );
  }

  if (request.category !== null) {
    const catRes = checkSingleConstraint(request, offer, "category");
    if (catRes.ok) matchedConditions.push(catRes.message);
    else unmatchedSoftConditions.push(catRes.message);
  }

  let budgetScore = 1.0;
  if (
    request.budget_max !== null &&
    !(offer.type === "exchange" && request.allow_exchange)
  ) {
    const price = offer.price ?? 0;
    const budgetRes = checkSingleConstraint(request, offer, "budget");
    if (price <= request.budget_max) {
      const savingRatio = Math.max(
        0,
        Math.min(1, (request.budget_max - price) / Math.max(request.budget_max, 1)),
      );
      budgetScore = 0.85 + 0.15 * savingRatio;
      matchedConditions.push(budgetRes.message);
    } else {
      const overRatio =
        (price - request.budget_max) / Math.max(request.budget_max, 1);
      budgetScore = Math.max(0, 0.65 * (1 - overRatio));
      unmatchedSoftConditions.push(budgetRes.message);
    }
  }

  let condScore = 1.0;
  const offerRank = CONDITION_RANK[offer.condition];
  if (request.min_condition === null) {
    condScore = 0.7 + 0.15 * (offerRank - 1);
    matchedConditions.push(`Tình trạng: ${CONDITION_LABELS[offer.condition]}`);
  } else {
    const reqRank = CONDITION_RANK[request.min_condition];
    const condRes = checkSingleConstraint(request, offer, "condition");
    if (offerRank >= reqRank) {
      condScore = Math.min(1, 0.9 + 0.05 * (offerRank - reqRank));
      matchedConditions.push(condRes.message);
    } else {
      const diff = reqRank - offerRank;
      condScore = diff === 1 ? 0.45 : 0.2;
      unmatchedSoftConditions.push(condRes.message);
    }
  }

  let locScore = 1.0;
  if (request.location === null) {
    matchedConditions.push(`Khu vực: ${LOCATION_LABELS[offer.location]}`);
  } else {
    const locRes = checkSingleConstraint(request, offer, "location");
    if (offer.location === request.location) {
      locScore = 1.0;
      matchedConditions.push(locRes.message);
    } else if (
      (offer.location === "ktx_a" || offer.location === "ktx_b") &&
      (request.location === "ktx_a" || request.location === "ktx_b")
    ) {
      locScore = 0.55;
      unmatchedSoftConditions.push(locRes.message);
    } else {
      locScore = 0.3;
      unmatchedSoftConditions.push(locRes.message);
    }
  }

  const score = Number(((budgetScore + condScore + locScore) / 3).toFixed(4));
  return { score, matchedConditions, unmatchedSoftConditions };
}

const VN_STOPWORDS = new Set([
  "can", "tim", "mua", "lai", "cho", "cua", "va", "hoac", "voi",
  "o", "tai", "trong", "ngoai", "tren", "duoi", "de", "di", "hoc", "con",
  "mot", "nhung", "cac", "nay", "kia", "rat", "hoi", "nhieu", "it", "gia",
  "re", "tot", "on", "nhu", "hinh", "anh", "minh", "nao", "co",
  "khong", "lay", "muon", "uu", "tien", "kich", "thuoc", "pass", "nhanh",
  "ktx", "sinh", "vien", "phong", "tro", "truong",
]);

export function stripViDiacritics(input: string): string {
  return input
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenizeVi(input: string): string[] {
  const clean = stripViDiacritics(input.toLowerCase());
  const words = clean.match(/[a-z0-9+]+/g) ?? [];
  const filtered = words.filter((w) => w.length > 1 && !VN_STOPWORDS.has(w));
  const bigrams: string[] = [];
  for (let i = 0; i < filtered.length - 1; i += 1) {
    bigrams.push(`${filtered[i]}_${filtered[i + 1]}`);
  }
  return [...filtered, ...bigrams];
}

export function computeKeywordBm25Scores(
  queryText: string,
  offers: MarketplaceOffer[],
): Record<string, number> {
  const qTokens = tokenizeVi(queryText);
  const out: Record<string, number> = {};
  if (qTokens.length === 0) {
    for (const o of offers) out[o.id] = 0;
    return out;
  }

  const docs: Record<string, string[]> = {};
  const df: Record<string, number> = {};
  let totalDl = 0;

  for (const o of offers) {
    const toks = tokenizeVi(`${o.title} ${o.title} ${o.description}`);
    docs[o.id] = toks;
    totalDl += toks.length;
    for (const uniq of new Set(toks)) {
      df[uniq] = (df[uniq] ?? 0) + 1;
    }
  }

  const nDocs = Math.max(offers.length, 1);
  const avgDl = totalDl / nDocs;
  const k1 = 1.5;
  const b = 0.75;

  for (const o of offers) {
    const dToks = docs[o.id];
    const tfMap: Record<string, number> = {};
    for (const t of dToks) tfMap[t] = (tfMap[t] ?? 0) + 1;

    let bm25 = 0;
    let matchedQ = 0;
    for (const qt of qTokens) {
      const tf = tfMap[qt] ?? 0;
      if (tf === 0) continue;
      matchedQ += 1;
      const docFreq = df[qt] ?? 0;
      const idf = Math.log(1 + (nDocs - docFreq + 0.5) / (docFreq + 0.5));
      const denom = tf + k1 * (1 - b + b * (dToks.length / Math.max(avgDl, 1)));
      bm25 += idf * ((tf * (k1 + 1)) / denom);
    }
    const coverage = matchedQ / qTokens.length;
    const squashed = 1 - Math.exp(-bm25 / 4.5);
    out[o.id] = Number((0.65 * squashed + 0.35 * coverage).toFixed(4));
  }
  return out;
}

function buildExplanationSummary(
  semanticScore: number,
  matchedConditions: string[],
  unmatchedSoftConditions: string[],
): string {
  const semPct = Math.round(semanticScore * 100);
  const matchedTxt =
    matchedConditions.slice(0, 3).join("; ") || "Đạt bộ lọc cơ bản";
  if (unmatchedSoftConditions.length === 0) {
    return `Tương đồng ngữ nghĩa ${semPct}%. Đáp ứng đủ yêu cầu: ${matchedTxt}.`;
  }
  return `Tương đồng ngữ nghĩa ${semPct}%. Đạt: ${matchedTxt}. Cần lưu ý điều kiện mềm: ${unmatchedSoftConditions.join("; ")}.`;
}

export function rankOffersForRequest(
  request: BuyerRequest,
  offers: MarketplaceOffer[],
  semanticScores: Record<string, number>,
  minSemanticScore: number,
  topK = 6,
  requireAllSpecified = false,
): RankedOfferMatch[] {
  const candidates: RankedOfferMatch[] = [];

  for (const offer of offers) {
    if (!passesHardConstraints(request, offer).ok) continue;
    const allSpecOk = satisfiesAllSpecifiedConstraints(request, offer);
    if (requireAllSpecified && !allSpecOk) continue;

    const semScore = Math.max(
      0,
      Math.min(1, Number((semanticScores[offer.id] ?? 0).toFixed(4))),
    );
    const { score: structScore, matchedConditions, unmatchedSoftConditions } =
      computeStructuredScore(request, offer);
    const totalScore = Number((0.75 * semScore + 0.25 * structScore).toFixed(4));

    candidates.push({
      offer,
      totalScore,
      semanticScore: semScore,
      structuredScore: structScore,
      satisfiesAllInitial: allSpecOk && semScore >= minSemanticScore,
      matchedConditions,
      unmatchedSoftConditions,
      explanationSummary: buildExplanationSummary(
        semScore,
        matchedConditions,
        unmatchedSoftConditions,
      ),
    });
  }

  candidates.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.semanticScore !== a.semanticScore) {
      return b.semanticScore - a.semanticScore;
    }
    return Number(b.satisfiesAllInitial) - Number(a.satisfiesAllInitial);
  });

  return candidates.slice(0, topK);
}

interface AxisRelaxation {
  patch: Partial<Pick<BuyerRequest, "budget_max" | "min_condition" | "location">>;
  cost: number;
  label: string;
}

function generateSingleAxisRelaxations(
  request: BuyerRequest,
): Record<string, AxisRelaxation[]> {
  const axisOptions: Record<string, AxisRelaxation[]> = {};

  if (
    request.budget_max !== null &&
    getConstraintFlag(request, "budget") === "soft"
  ) {
    const stepsVnd = [50_000, 100_000, 150_000, 250_000];
    const maxAllowedIncrease = Math.max(
      50_000,
      Math.round(request.budget_max * 0.5),
    );
    const opts: AxisRelaxation[] = [];
    stepsVnd.forEach((delta, idx) => {
      if (delta <= maxAllowedIncrease && request.budget_max !== null) {
        const newBudget = request.budget_max + delta;
        opts.push({
          patch: { budget_max: newBudget },
          cost: 0.2 * (idx + 1),
          label: `Tăng ngân sách lên ${formatMatchingVnd(newBudget)} (+${formatMatchingVnd(delta)})`,
        });
      }
    });
    if (opts.length > 0) axisOptions.budget = opts;
  }

  if (
    request.min_condition !== null &&
    getConstraintFlag(request, "condition") === "soft"
  ) {
    const condOpts: AxisRelaxation[] = [];
    if (request.min_condition === "new") {
      condOpts.push({
        patch: { min_condition: "like_new" },
        cost: 0.25,
        label: "Chấp nhận tình trạng Như mới (90%+)",
      });
      condOpts.push({
        patch: { min_condition: "used" },
        cost: 0.5,
        label: "Chấp nhận hàng Đã qua sử dụng",
      });
    } else if (request.min_condition === "like_new") {
      condOpts.push({
        patch: { min_condition: "used" },
        cost: 0.25,
        label: "Chấp nhận hàng Đã qua sử dụng",
      });
    }
    if (condOpts.length > 0) axisOptions.condition = condOpts;
  }

  if (
    request.location !== null &&
    getConstraintFlag(request, "location") === "soft"
  ) {
    const locOpts: AxisRelaxation[] = [];
    if (request.location === "ktx_a") {
      locOpts.push({
        patch: { location: "ktx_b" },
        cost: 0.2,
        label: "Mở rộng sang KTX Khu B",
      });
    } else if (request.location === "ktx_b") {
      locOpts.push({
        patch: { location: "ktx_a" },
        cost: 0.2,
        label: "Mở rộng sang KTX Khu A",
      });
    }
    locOpts.push({
      patch: { location: null },
      cost: 0.35,
      label: "Mở rộng ra tất cả khu vực (KTX & Ngoài KTX)",
    });
    axisOptions.location = locOpts;
  }

  return axisOptions;
}

export function generateCounterfactuals(
  request: BuyerRequest,
  offers: MarketplaceOffer[],
  semanticScores: Record<string, number>,
  minSemanticScore: number,
  maxSuggestions = 3,
): { suggestions: CounterfactualOption[]; hardBlockDiagnostic: string | null } {
  const axisOptions = generateSingleAxisRelaxations(request);
  const suggestions: CounterfactualOption[] = [];
  const seenOfferSets = new Set<string>();
  let idxCounter = 1;

  const hardPoolSems = offers
    .filter((o) => passesHardConstraints(request, o).ok)
    .map((o) => semanticScores[o.id] ?? 0);
  const bestHardSem =
    hardPoolSems.length > 0 ? Math.max(...hardPoolSems) : 0;
  const effectiveMinSem = Math.max(minSemanticScore, bestHardSem * 0.72);

  const evaluatePatch = (
    patch: Partial<Pick<BuyerRequest, "budget_max" | "min_condition" | "location">>,
    numChanged: number,
    cost: number,
    label: string,
  ): CounterfactualOption | null => {
    const modifiedReq: BuyerRequest = { ...request, ...patch };
    const strictAfter = rankOffersForRequest(
      modifiedReq,
      offers,
      semanticScores,
      effectiveMinSem,
      5,
      true,
    );
    const validUnlocked = strictAfter.filter(
      (item) => item.semanticScore >= effectiveMinSem,
    );
    if (validUnlocked.length === 0) return null;

    const key = validUnlocked
      .map((i) => i.offer.id)
      .sort()
      .join(",");
    if (seenOfferSets.has(key)) return null;
    seenOfferSets.add(key);

    const sug: CounterfactualOption = {
      suggestionId: `CF_${idxCounter++}`,
      changes: patch,
      numConditionsChanged: numChanged,
      stepCost: Number(cost.toFixed(4)),
      humanLabel: label,
      unlockedOfferIds: validUnlocked.map((i) => i.offer.id),
      topOffers: validUnlocked.slice(0, 3),
      bestScore: validUnlocked[0].totalScore,
    };
    return sug;
  };

  for (const opts of Object.values(axisOptions)) {
    for (const opt of opts) {
      const sug = evaluatePatch(opt.patch, 1, opt.cost, opt.label);
      if (sug) {
        suggestions.push(sug);
      }
    }
  }

  const unlockedBestHard = suggestions.some((s) =>
    s.unlockedOfferIds.some(
      (oid) => Math.abs((semanticScores[oid] ?? 0) - bestHardSem) < 1e-4,
    ),
  );
  const axes = Object.keys(axisOptions);
  if (!unlockedBestHard && axes.length >= 2) {
    for (let i = 0; i < axes.length; i += 1) {
      for (let j = i + 1; j < axes.length; j += 1) {
        const listA = axisOptions[axes[i]];
        const listB = axisOptions[axes[j]];
        for (const a of listA) {
          let foundPair = false;
          for (const b of listB) {
            const sug = evaluatePatch(
              { ...a.patch, ...b.patch },
              2,
              a.cost + b.cost,
              `${a.label} + ${b.label}`,
            );
            if (sug) {
              suggestions.push(sug);
              foundPair = true;
              break;
            }
          }
          if (foundPair) break;
        }
      }
    }
  }

  suggestions.sort((a, b) => {
    if (a.numConditionsChanged !== b.numConditionsChanged) {
      return a.numConditionsChanged - b.numConditionsChanged;
    }
    if (a.stepCost !== b.stepCost) return a.stepCost - b.stepCost;
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    return b.unlockedOfferIds.length - a.unlockedOfferIds.length;
  });

  let hardBlockDiagnostic: string | null = null;
  if (suggestions.length === 0) {
    const semRelevant = offers.filter(
      (o) => (semanticScores[o.id] ?? 0) >= minSemanticScore,
    );
    if (semRelevant.length === 0) {
      hardBlockDiagnostic =
        "Hiện chưa có sản phẩm đúng loại bạn tìm trên sàn. Bạn có thể bật nhận thông báo khi có sinh viên đăng bán món này.";
    } else {
      const blockerSet = new Set<string>();
      for (const rel of semRelevant) {
        const hardRes = passesHardConstraints(request, rel);
        if (!hardRes.ok) {
          for (const r of hardRes.reasons) blockerSet.add(r);
        }
      }
      if (blockerSet.size > 0) {
        const reasons = Array.from(blockerSet).slice(0, 2).join("; ");
        hardBlockDiagnostic = `Không có sản phẩm đạt điều kiện bắt buộc (${reasons}). Hệ thống giữ nguyên điều kiện bắt buộc và không tự ý thay đổi.`;
      } else {
        hardBlockDiagnostic =
          "Không tìm thấy phương án khả thi trong phạm vi các bậc nới điều kiện cho phép.";
      }
    }
  }

  return {
    suggestions: suggestions.slice(0, maxSuggestions),
    hardBlockDiagnostic,
  };
}

export function executeRequestMatching(
  request: BuyerRequest,
  offers: MarketplaceOffer[],
  semanticScores: Record<string, number>,
  modelId: EmbeddingModelId,
  latencyMs = 1.2,
  topK = 6,
): RequestMatchResult {
  const meta = MODEL_META[modelId];
  const rankedPool = rankOffersForRequest(
    request,
    offers,
    semanticScores,
    meta.minSemanticScore,
    topK,
    false,
  );
  const strictFloor = rankedPool.filter(
    (item) => item.semanticScore >= meta.minSemanticScore,
  );
  const bestReturnedSem =
    strictFloor.length > 0
      ? Math.max(...strictFloor.map((i) => i.semanticScore))
      : 0;
  const filteredRanked = strictFloor.filter(
    (item) => item.semanticScore >= bestReturnedSem * 0.74,
  );
  const strictMatches = rankedPool.filter((item) => item.satisfiesAllInitial);
  const softBlockedMatches = rankedPool.filter(
    (item) =>
      !item.satisfiesAllInitial && item.semanticScore >= meta.minSemanticScore,
  );
  const bestStrictSem = strictMatches[0]?.semanticScore ?? 0;
  const bestSoftSem =
    softBlockedMatches.length > 0
      ? Math.max(...softBlockedMatches.map((i) => i.semanticScore))
      : 0;
  const top1BlockedBySoft =
    rankedPool.length > 0 && !rankedPool[0].satisfiesAllInitial;
  const shouldTriggerCf =
    strictMatches.length === 0 ||
    top1BlockedBySoft ||
    bestSoftSem > bestStrictSem + 0.05;

  if (shouldTriggerCf) {
    const { suggestions, hardBlockDiagnostic } = generateCounterfactuals(
      request,
      offers,
      semanticScores,
      meta.minSemanticScore,
    );
    const strictIds = new Set(strictMatches.map((s) => s.offer.id));
    const novelSuggestions = suggestions.filter((cf) =>
      cf.unlockedOfferIds.some((id) => !strictIds.has(id)),
    );
    if (strictMatches.length === 0 || novelSuggestions.length > 0) {
      return {
        requestId: request.id,
        modelId,
        modelLabel: meta.label,
        modelVersion: meta.version,
        rankedOffers: filteredRanked,
        strictMatchCount: strictMatches.length,
        counterfactualTriggered: true,
        counterfactuals: novelSuggestions,
        hardBlockDiagnostic:
          strictMatches.length === 0 ? hardBlockDiagnostic : null,
        latencyMs,
      };
    }
  }

  return {
    requestId: request.id,
    modelId,
    modelLabel: meta.label,
    modelVersion: meta.version,
    rankedOffers: filteredRanked,
    strictMatchCount: strictMatches.length,
    counterfactualTriggered: false,
    counterfactuals: [],
    hardBlockDiagnostic: null,
    latencyMs,
  };
}
