import { USE_MOCK } from "@/lib/config";
import { getAdminProducts } from "./admin";
import { apiRequest } from "./client";

export interface MatchingProduct {
  id: number;
  title: string;
  description: string;
  image: string | null;
  type: "sale" | "exchange" | "auction";
  price: number | null;
  condition: string;
  categoryId: number;
  categoryName: string;
  sellerName: string;
  sellerVerified: boolean;
  matchScore: number;
  matchReason: string;
}
export interface MatchingResult {
  modelKey: string;
  method: string;
  limit: number;
  results: MatchingProduct[];
}
export interface MatchingEvaluation {
  id: number;
  query_text: string;
  relevant_product_ids: number[];
  result_product_ids: number[];
  precision_at_5: string;
  recall_at_5: string;
  mrr_at_5: string;
  ndcg_at_5: string;
  model_key: string;
  evaluator_name: string;
  created_at: string;
}

const PRODUCT_DESCRIPTIONS: Record<number, string> = {
  101: "Giáo trình Giải tích 1 & 2 trọn bộ dành cho sinh viên năm nhất khối Kỹ thuật – CNTT, giấy trắng sạch đẹp.",
  102: "Tai nghe chụp tai Sony WH-CH520 pin 50 giờ, kết nối đa điểm học online không đau tai.",
  103: "Ấm đun siêu tốc Sunhouse 1.8L inox 304 tự ngắt an toàn chuẩn nội quy KTX.",
  104: "Máy tính bỏ túi Casio fx-580VN X chính hãng dùng thi học kỳ kỹ thuật, màn hình rõ nét.",
  105: "Bàn phím cơ không dây Keychron K6 Red Switch gõ êm không ồn phòng KTX ban đêm.",
  106: "Bàn học gấp gọn gỗ thông đặt giường tầng KTX chắc chắn, mặt gỗ chống thấm nước.",
  107: "Bộ giáo trình Lập trình Hướng đối tượng C++ & Java có ghi chú trọng tâm ôn thi.",
  108: "Đèn bàn học LED chống cận Xiaomi Mi Lite 3 chế độ sáng cảm ứng.",
};

function stripViAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export async function searchMarketplaceMatching(
  query: string,
  filters: {
    categoryId?: number;
    priceMin?: number;
    priceMax?: number;
    condition?: string;
    type?: string;
  } = {},
): Promise<MatchingResult> {
  if (!USE_MOCK) {
    const params = new URLSearchParams({ q: query });
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    return apiRequest<MatchingResult>(
      `/marketplace/matching/search?${params.toString()}`,
    );
  }

  const allProducts = (await getAdminProducts("all")).filter(
    (p) => p.status === "active",
  );
  const qNorm = stripViAccents(query.trim());
  const qTokens = qNorm.split(/\s+/).filter((t) => t.length >= 2);

  const scored: MatchingProduct[] = [];
  for (const p of allProducts) {
    if (filters.categoryId && p.categoryId !== Number(filters.categoryId)) {
      continue;
    }
    if (filters.condition && p.condition !== filters.condition) {
      continue;
    }
    if (filters.type && p.type !== filters.type) {
      continue;
    }
    if (
      filters.priceMin !== undefined &&
      (p.price ?? 0) < Number(filters.priceMin)
    ) {
      continue;
    }
    if (
      filters.priceMax !== undefined &&
      (p.price ?? 0) > Number(filters.priceMax)
    ) {
      continue;
    }

    const desc =
      PRODUCT_DESCRIPTIONS[p.id] ??
      `${p.title} — danh mục ${p.categoryName}, giao dịch trực tiếp tại KTX.`;
    const hay = stripViAccents(`${p.title} ${p.categoryName} ${desc}`);
    const matchedTokens = qTokens.filter((tok) => hay.includes(tok));
    if (qTokens.length > 0 && matchedTokens.length === 0) {
      continue;
    }

    const tokenRatio =
      qTokens.length > 0 ? matchedTokens.length / qTokens.length : 0.75;
    const exactBonus = qNorm && hay.includes(qNorm) ? 0.18 : 0;
    const matchScore = Math.min(
      0.98,
      Math.round((0.52 + tokenRatio * 0.35 + exactBonus) * 1000) / 1000,
    );

    const reasons: string[] = [];
    if (matchedTokens.length > 0) {
      reasons.push(`Khớp từ khóa "${query.trim()}"`);
    }
    reasons.push(`Danh mục ${p.categoryName}`);
    if (filters.priceMax && p.price !== null) {
      reasons.push(`Trong ngân sách <= ${filters.priceMax.toLocaleString("vi-VN")}đ`);
    }

    scored.push({
      id: p.id,
      title: p.title,
      description: desc,
      image: null,
      type: p.type,
      price: p.price,
      condition: p.condition,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      sellerName: p.sellerName,
      sellerVerified: true,
      matchScore,
      matchReason: reasons.join(" • "),
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return {
    modelKey: "local-feature-hash-v1-256",
    method: "cosine_feature_hash",
    limit: 10,
    results: scored.slice(0, 10),
  };
}

export const indexMarketplaceProducts = async () => {
  if (USE_MOCK) {
    const allProducts = (await getAdminProducts("all")).filter(
      (p) => p.status === "active",
    );
    return {
      indexedCandidates: allProducts.length,
      modelKey: "local-feature-hash-v1-256",
    };
  }
  return apiRequest<{ indexedCandidates: number; modelKey: string }>(
    "/admin/marketplace/matching/index",
    { method: "POST" },
  );
};

const MOCK_EVAL_KEY = "svm_mock_matching_evals_v1";

const DEFAULT_EVALUATIONS: MatchingEvaluation[] = [
  {
    id: 1,
    query_text: "sách giải tích giáo trình năm nhất",
    relevant_product_ids: [101, 107],
    result_product_ids: [101, 107],
    precision_at_5: "1.0000",
    recall_at_5: "1.0000",
    mrr_at_5: "1.0000",
    ndcg_at_5: "1.0000",
    model_key: "local-feature-hash-v1-256",
    evaluator_name: "Quản trị viên KTX",
    created_at: "2026-11-12 10:00:00",
  },
  {
    id: 2,
    query_text: "bàn phím cơ học code phòng KTX",
    relevant_product_ids: [102, 105],
    result_product_ids: [102, 105],
    precision_at_5: "1.0000",
    recall_at_5: "1.0000",
    mrr_at_5: "1.0000",
    ndcg_at_5: "1.0000",
    model_key: "local-feature-hash-v1-256",
    evaluator_name: "Quản trị viên KTX",
    created_at: "2026-11-13 14:30:00",
  },
];

function readMockEvaluations(): MatchingEvaluation[] {
  if (typeof window === "undefined") return DEFAULT_EVALUATIONS;
  try {
    const raw = window.localStorage.getItem(MOCK_EVAL_KEY);
    if (!raw) return DEFAULT_EVALUATIONS;
    return JSON.parse(raw) as MatchingEvaluation[];
  } catch {
    return DEFAULT_EVALUATIONS;
  }
}

export const getMatchingEvaluations = async (): Promise<
  MatchingEvaluation[]
> => {
  if (USE_MOCK) {
    return readMockEvaluations();
  }
  return apiRequest<MatchingEvaluation[]>(
    "/admin/marketplace/matching/evaluations",
  );
};

export const saveMatchingEvaluation = async (
  queryText: string,
  relevantProductIds: number[],
) => {
  if (USE_MOCK) {
    const res = await searchMarketplaceMatching(queryText);
    const resultProductIds = res.results.slice(0, 5).map((r) => r.id);
    const hits = resultProductIds.filter((id) =>
      relevantProductIds.includes(id),
    ).length;
    const p5 =
      resultProductIds.length > 0 ? hits / Math.min(5, resultProductIds.length) : 0;
    const r5 =
      relevantProductIds.length > 0 ? hits / relevantProductIds.length : 0;
    const mrr = hits > 0 ? 1 : 0;
    const nextId = Date.now();
    const current = readMockEvaluations();
    const entry: MatchingEvaluation = {
      id: nextId,
      query_text: queryText,
      relevant_product_ids: relevantProductIds,
      result_product_ids: resultProductIds,
      precision_at_5: p5.toFixed(4),
      recall_at_5: r5.toFixed(4),
      mrr_at_5: mrr.toFixed(4),
      ndcg_at_5: p5.toFixed(4),
      model_key: "local-feature-hash-v1-256",
      evaluator_name: "Quản trị viên KTX",
      created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          MOCK_EVAL_KEY,
          JSON.stringify([entry, ...current]),
        );
      } catch {
        // ignore quota errors
      }
    }
    return {
      id: nextId,
      metrics: {
        precisionAt5: p5,
        recallAt5: r5,
        mrrAt5: mrr,
        ndcgAt5: p5,
      },
      resultProductIds,
    };
  }
  return apiRequest<{
    id: number;
    metrics: {
      precisionAt5: number;
      recallAt5: number;
      mrrAt5: number;
      ndcgAt5: number;
    };
    resultProductIds: number[];
  }>("/admin/marketplace/matching/evaluations", {
    method: "POST",
    body: { queryText, relevantProductIds },
  });
};
