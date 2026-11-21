import { apiRequest } from "./client";
import type { ProductCondition, ProductType } from "@/lib/types/admin";

/** "semantic" = Gemini + BM25; "keyword_fallback" = BM25 only because AI is unavailable. */
export type SmartSearchMode = "semantic" | "keyword_fallback";
export type ConstraintFlag = "hard" | "soft";

export interface SmartSearchProduct {
  id: number;
  title: string;
  type: ProductType;
  price: number | null;
  condition: ProductCondition;
  categoryId: number;
  categoryName: string;
  sellerId: number;
  sellerName: string;
  sellerVerified: boolean;
  sellerBuildingName: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

export interface SmartSearchResult extends SmartSearchProduct {
  semanticScore: number;
  structScore: number;
  totalScore: number;
  fullyMatches: boolean;
  matchedConditions: string[];
  unmatchedConditions: string[];
}

export interface SmartSearchSuggestion {
  label: string;
  changes: number;
  patch: { budgetMax?: number; minCondition?: ProductCondition; buildingId?: number | null };
  unlockedProductIds: number[];
  unlockedProducts: SmartSearchProduct[];
  bestScore: number;
}

export interface SmartSearchResponse {
  mode: SmartSearchMode;
  modelKey: string;
  fallbackReason: string | null;
  warnings: string[];
  latencyMs: number;
  relevantCount: number;
  hardBlockers: Partial<Record<"category" | "budget" | "condition" | "location" | "exchange", number>>;
  results: SmartSearchResult[];
  counterfactuals: SmartSearchSuggestion[];
}

export interface SmartSearchInput {
  description: string;
  imageDataUrl?: string | null;
  categoryId?: number | null;
  budgetMax?: number | null;
  minCondition?: ProductCondition | null;
  allowExchange?: boolean;
  /** Only sellers in the searcher's current dormitory building (resolved by the server). */
  nearMe?: boolean;
  flags?: Partial<Record<"category" | "budget" | "condition" | "location", ConstraintFlag>>;
  limit?: number;
}

export function smartSearch(input: SmartSearchInput): Promise<SmartSearchResponse> {
  return apiRequest<SmartSearchResponse>("/marketplace/smart-search", { method: "POST", body: input });
}

export interface SavedBuyerRequest {
  id: number;
  description: string;
  status: "open" | "closed" | "expired";
  expiresAt: string;
}

/** Save the current search as a buyer request (requires login). */
export function saveBuyerRequest(input: Omit<SmartSearchInput, "nearMe" | "limit">): Promise<SavedBuyerRequest> {
  return apiRequest<SavedBuyerRequest>("/marketplace/requests", { method: "POST", body: input });
}

export const FALLBACK_REASON_LABEL: Record<string, string> = {
  not_configured: "AI chưa được cấu hình",
  rate_limited: "AI đang quá tải",
  network: "không kết nối được tới dịch vụ AI",
  api_error: "dịch vụ AI đang báo lỗi",
};

export const WARNING_LABEL: Record<string, string> = {
  image_unavailable: "Không phân tích được ảnh lúc này — kết quả chỉ dựa trên mô tả chữ.",
  partial_index: "Một số tin mới đăng chưa được AI phân tích xong, có thể chưa xuất hiện.",
  not_in_dormitory: "Bạn chưa có chỗ ở trong KTX nên bộ lọc “Gần tôi” không được áp dụng.",
};

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** sessionStorage key: image picked from the header search box, read by /products. */
export const HEADER_IMAGE_KEY = "svm_ai_search_image";

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không đọc được ảnh."));
    reader.readAsDataURL(file);
  });
}
