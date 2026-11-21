import rawOffers from "@/lib/data/offers.json";
import rawRequests from "@/lib/data/requests.json";
import rawSnapshot from "@/lib/data/ai-benchmark-snapshot.json";
import {
  computeKeywordBm25Scores,
  executeRequestMatching,
} from "@/lib/matching/engine";
import type {
  BenchmarkRunSummary,
  BuyerRequest,
  EmbeddingModelId,
  MarketplaceOffer,
  RequestMatchResult,
} from "@/lib/types/matching";

const CUSTOM_REQUESTS_KEY = "svm_custom_buyer_requests_v1";

function normalizeDemoImage(img: string | null | undefined): string | null {
  if (!img) return null;
  if (img.startsWith("data:") || img.startsWith("http") || img.startsWith("/")) {
    return img;
  }
  return `/demo-matching/${img}`;
}

const SEED_OFFERS: MarketplaceOffer[] = (rawOffers as MarketplaceOffer[]).map(
  (o, idx) => ({
    ...o,
    image: normalizeDemoImage(o.image),
    sellerName: [
      "Trần Quốc Bảo",
      "Lê Thảo Vy",
      "Nguyễn Hoàng Nam",
      "Phạm Minh Thư",
      "Đặng Gia Huy",
      "Võ Ngọc Ánh",
    ][idx % 6],
    createdAt: [
      "18 phút trước",
      "45 phút trước",
      "1 giờ trước",
      "2 giờ trước",
      "4 giờ trước",
      "Hôm qua",
    ][idx % 6],
  }),
);

const SEED_REQUESTS: BuyerRequest[] = (rawRequests as BuyerRequest[]).map(
  (r, idx) => ({
    ...r,
    image: normalizeDemoImage(r.image),
    buyerName: [
      "Nguyễn Minh Anh",
      "Hoàng Tuấn Kiệt",
      "Phan Thanh Trúc",
      "Lý Gia Khiêm",
      "Bùi Khánh Linh",
    ][idx % 5],
    createdAt: [
      "Vừa xong",
      "15 phút trước",
      "40 phút trước",
      "1 giờ trước",
      "3 giờ trước",
      "Hôm qua",
    ][idx % 6],
  }),
);

const SNAPSHOT_MATRICES = (
  rawSnapshot as {
    runs: BenchmarkRunSummary[];
    similarity_matrices: Record<string, Record<string, Record<string, number>>>;
  }
).similarity_matrices;

const SNAPSHOT_RUNS = (
  rawSnapshot as {
    runs: BenchmarkRunSummary[];
  }
).runs;

export function getBenchmarkRuns(): BenchmarkRunSummary[] {
  return SNAPSHOT_RUNS;
}

export function getMarketplaceOffers(): MarketplaceOffer[] {
  return SEED_OFFERS;
}

export function getCustomBuyerRequests(): BuyerRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BuyerRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAllBuyerRequests(): BuyerRequest[] {
  return [...getCustomBuyerRequests(), ...SEED_REQUESTS];
}

export function saveCustomBuyerRequest(
  input: Omit<BuyerRequest, "id" | "createdAt">,
): BuyerRequest {
  const existing = getCustomBuyerRequests();
  const nextId = `R_USER_${Date.now().toString().slice(-5)}`;
  const created: BuyerRequest = {
    ...input,
    id: nextId,
    scenario: input.image ? "custom_multimodal" : "custom_user",
    buyerName: input.buyerName ?? "Bạn (Sinh viên)",
    createdAt: "Vừa đăng xong",
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      CUSTOM_REQUESTS_KEY,
      JSON.stringify([created, ...existing]),
    );
  }
  return created;
}

export function clearCustomBuyerRequests(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CUSTOM_REQUESTS_KEY);
  }
}

export async function matchBuyerRequest(
  request: BuyerRequest,
  modelId: EmbeddingModelId,
  offers: MarketplaceOffer[] = SEED_OFFERS,
): Promise<RequestMatchResult & { isLiveApi: boolean }> {
  const precomputed = SNAPSHOT_MATRICES[modelId]?.[request.id];
  if (precomputed) {
    const runMeta = SNAPSHOT_RUNS.find((r) => r.model_id === modelId);
    const perQueryMs = runMeta
      ? Number((runMeta.elapsed_ms / 31).toFixed(1))
      : 1.5;
    const res = executeRequestMatching(
      request,
      offers,
      precomputed,
      modelId,
      perQueryMs,
      6,
    );
    return { ...res, isLiveApi: false };
  }

  if (modelId !== "keyword-bm25-vi") {
    try {
      const resp = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: request.text,
          imageDataUrl: request.image,
          modelId,
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          live?: boolean;
          latencyMs?: number;
          scores?: Record<string, number> | null;
        };
        if (data.live && data.scores) {
          const res = executeRequestMatching(
            request,
            offers,
            data.scores,
            modelId,
            data.latencyMs ?? 180,
            6,
          );
          return { ...res, isLiveApi: true };
        }
      }
    } catch {
      // Fallback sang BM25 nội bộ khi không có kết nối mạng
    }
  }

  const t0 = performance.now();
  const kwScores = computeKeywordBm25Scores(request.text, offers);
  const res = executeRequestMatching(
    request,
    offers,
    kwScores,
    modelId,
    Number((performance.now() - t0).toFixed(1)),
    6,
  );
  return { ...res, isLiveApi: false };
}
