export type MatchingCategorySlug =
  | "sach"
  | "dien_tu"
  | "hoc_tap"
  | "gia_dung"
  | "thoi_trang"
  | "nhac_cu";

export type OfferType = "sale" | "exchange" | "auction";
export type ConditionLevel = "new" | "like_new" | "used";
export type LocationCode = "ktx_a" | "ktx_b" | "ngoai_ktx";
export type ConstraintRigidity = "hard" | "soft";
export type ConstraintKey = "category" | "budget" | "condition" | "location";

export type EmbeddingModelId =
  | "gemini-embedding-2-multimodal"
  | "jina-clip-v2-multimodal"
  | "gemini-embedding-2-text-only"
  | "jina-clip-v2-text-only"
  | "keyword-bm25-vi";

export interface MarketplaceOffer {
  id: string;
  title: string;
  description: string;
  category: MatchingCategorySlug;
  type: OfferType;
  price: number | null;
  condition: ConditionLevel;
  location: LocationCode;
  image: string | null;
  sellerName?: string;
  createdAt?: string;
}

export interface BuyerRequest {
  id: string;
  text: string;
  image: string | null;
  category: MatchingCategorySlug | null;
  budget_max: number | null;
  min_condition: ConditionLevel | null;
  location: LocationCode | null;
  allow_exchange: boolean;
  flags: Partial<Record<ConstraintKey, ConstraintRigidity>>;
  scenario?: string;
  deadline?: string | null;
  buyerName?: string;
  createdAt?: string;
}

export interface RankedOfferMatch {
  offer: MarketplaceOffer;
  totalScore: number;
  semanticScore: number;
  structuredScore: number;
  satisfiesAllInitial: boolean;
  matchedConditions: string[];
  unmatchedSoftConditions: string[];
  explanationSummary: string;
}

export interface CounterfactualOption {
  suggestionId: string;
  changes: Partial<
    Pick<BuyerRequest, "budget_max" | "min_condition" | "location">
  >;
  numConditionsChanged: number;
  stepCost: number;
  humanLabel: string;
  unlockedOfferIds: string[];
  topOffers: RankedOfferMatch[];
  bestScore: number;
}

export interface RequestMatchResult {
  requestId: string;
  modelId: EmbeddingModelId;
  modelLabel: string;
  modelVersion: string;
  rankedOffers: RankedOfferMatch[];
  strictMatchCount: number;
  counterfactualTriggered: boolean;
  counterfactuals: CounterfactualOption[];
  hardBlockDiagnostic: string | null;
  latencyMs: number;
}

export interface BenchmarkRunMetrics {
  retrieval_query_count: number;
  multimodal_query_count: number;
  precision_at_1: number;
  precision_at_3: number;
  precision_at_5: number;
  recall_at_5: number;
  mrr: number;
  multimodal_precision_at_1: number;
  multimodal_mrr: number;
  cf_query_count: number;
  cf_recovered_count: number;
  cf_recovery_rate: number;
  cf_avg_conditions_changed: number;
  cf_top1_accuracy: number;
  blocked_or_empty_count: number;
  false_cf_on_blocked: number;
  hard_constraint_violations: number;
}

export interface BenchmarkRunSummary {
  label: string;
  model_id: EmbeddingModelId;
  model_version: string;
  min_semantic_score: number;
  elapsed_ms: number;
  metrics: BenchmarkRunMetrics;
}
