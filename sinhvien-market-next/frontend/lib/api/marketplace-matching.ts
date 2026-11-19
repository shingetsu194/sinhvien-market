import { apiRequest } from "./client";

/** Admin-only tools for comparing the marketplace retrieval models. */

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

export interface RankingMetrics {
  precisionAt5: number;
  recallAt5: number;
  mrrAt5: number;
  ndcgAt5: number;
}

export interface ComparisonVariant {
  key: "legacy" | "bm25" | "gemini_text" | "hybrid";
  label: string;
  modelKey: string;
  latencyMs: number;
  results: { id: number; title: string; score: number }[];
  metrics?: RankingMetrics;
}

export interface ModelComparison {
  query: string;
  semanticAvailable: boolean;
  fallbackReason: string | null;
  indexedDuringSearch: number;
  relevantProductIds: number[];
  variants: ComparisonVariant[];
}

export const indexMarketplaceProducts = () =>
  apiRequest<{
    indexedCandidates: number;
    modelKey: string;
    gemini: { mode: string; modelKey: string; candidates: number; indexed: number; missing: number };
  }>("/admin/marketplace/matching/index", { method: "POST" });

export const getMatchingEvaluations = () =>
  apiRequest<MatchingEvaluation[]>("/admin/marketplace/matching/evaluations");

export const compareMatchingModels = (queryText: string, relevantProductIds: number[]) =>
  apiRequest<ModelComparison>("/admin/marketplace/matching/compare", {
    method: "POST",
    body: { queryText, relevantProductIds },
  });
