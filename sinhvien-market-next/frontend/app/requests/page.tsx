"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowRight,
  Backpack,
  Bell,
  BellRing,
  BookOpen,
  Calculator,
  Camera,
  CheckCircle2,
  Clock,
  CookingPot,
  Cpu,
  Eye,
  Fan,
  GraduationCap,
  Guitar,
  Headphones,
  Heart,
  ImagePlus,
  Keyboard,
  LampDesk,
  Laptop,
  Layers,
  Lightbulb,
  MapPin,
  MessageCircle,
  Monitor,
  Mouse,
  Music,
  Package,
  PenTool,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Upload,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { MainShell } from "@/components/layout/MainShell";
import {
  clearCustomBuyerRequests,
  getAllBuyerRequests,
  getMarketplaceOffers,
  matchBuyerRequest,
  saveCustomBuyerRequest,
} from "@/lib/api/matching";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  formatMatchingVnd,
  getConstraintFlag,
  LOCATION_LABELS,
  stripViDiacritics,
} from "@/lib/matching/engine";
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
  OfferType,
  RankedOfferMatch,
  RequestMatchResult,
} from "@/lib/types/matching";
import { cn } from "@/lib/cn";

type FeedQuickTab = "all" | "mine" | "with_image" | "exchange";

const CATEGORY_CHIPS: Array<{
  slug: "all" | MatchingCategorySlug;
  label: string;
  icon: LucideIcon;
}> = [
  { slug: "all", label: "Tất cả", icon: Layers },
  { slug: "sach", label: "Sách & Giáo trình", icon: BookOpen },
  { slug: "dien_tu", label: "Đồ điện tử", icon: Laptop },
  { slug: "gia_dung", label: "Đồ gia dụng KTX", icon: LampDesk },
  { slug: "hoc_tap", label: "Dụng cụ học tập", icon: Calculator },
  { slug: "thoi_trang", label: "Thời trang", icon: Shirt },
  { slug: "nhac_cu", label: "Nhạc cụ", icon: Music },
];

const OFFER_TYPE_BADGE: Record<
  OfferType,
  { label: string; className: string }
> = {
  sale: {
    label: "Đăng bán",
    className:
      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  },
  exchange: {
    label: "Nhận đổi đồ",
    className:
      "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
  },
  auction: {
    label: "Đấu giá ngược",
    className:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
};

const AVATAR_GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-sky-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function resolveOfferVisual(offer: MarketplaceOffer): {
  icon: LucideIcon;
  gradient: string;
  accentText: string;
  shortTag: string;
} {
  const t = offer.title.toLowerCase();
  if (t.includes("bàn phím")) {
    return {
      icon: Keyboard,
      gradient: "from-blue-500/20 via-blue-500/15 to-sky-500/20",
      accentText: "text-blue-600 dark:text-blue-300",
      shortTag: "Phụ kiện PC",
    };
  }
  if (t.includes("tai nghe") || t.includes("loa")) {
    return {
      icon: Headphones,
      gradient: "from-sky-500/20 via-blue-500/15 to-blue-500/20",
      accentText: "text-sky-600 dark:text-sky-300",
      shortTag: "Âm thanh",
    };
  }
  if (t.includes("chuột")) {
    return {
      icon: Mouse,
      gradient: "from-cyan-500/20 via-sky-500/15 to-blue-500/20",
      accentText: "text-cyan-600 dark:text-cyan-300",
      shortTag: "Phụ kiện",
    };
  }
  if (t.includes("laptop")) {
    return {
      icon: Laptop,
      gradient: "from-slate-500/20 via-blue-500/15 to-blue-500/20",
      accentText: "text-blue-600 dark:text-blue-300",
      shortTag: "Laptop SV",
    };
  }
  if (t.includes("màn hình")) {
    return {
      icon: Monitor,
      gradient: "from-blue-500/20 via-blue-500/15 to-blue-500/20",
      accentText: "text-blue-600 dark:text-blue-300",
      shortTag: "Màn hình",
    };
  }
  if (t.includes("casio") || t.includes("máy tính bỏ túi")) {
    return {
      icon: Calculator,
      gradient: "from-emerald-500/20 via-teal-500/15 to-cyan-500/20",
      accentText: "text-emerald-600 dark:text-emerald-300",
      shortTag: "Máy tính thi",
    };
  }
  if (t.includes("đèn")) {
    return {
      icon: LampDesk,
      gradient: "from-amber-400/25 via-orange-400/15 to-yellow-500/20",
      accentText: "text-amber-600 dark:text-amber-300",
      shortTag: "Góc học tập",
    };
  }
  if (t.includes("quạt")) {
    return {
      icon: Fan,
      gradient: "from-teal-400/20 via-cyan-400/15 to-sky-500/20",
      accentText: "text-teal-600 dark:text-teal-300",
      shortTag: "Đồ phòng KTX",
    };
  }
  if (t.includes("nồi") || t.includes("ấm")) {
    return {
      icon: CookingPot,
      gradient: "from-orange-500/20 via-rose-500/15 to-amber-500/20",
      accentText: "text-orange-600 dark:text-orange-300",
      shortTag: "Bếp sinh viên",
    };
  }
  if (t.includes("balo")) {
    return {
      icon: Backpack,
      gradient: "from-blue-500/20 via-blue-500/15 to-teal-500/20",
      accentText: "text-blue-600 dark:text-blue-300",
      shortTag: "Balo đi học",
    };
  }
  if (t.includes("bút") || t.includes("thước") || t.includes("wacom") || t.includes("vẽ")) {
    return {
      icon: PenTool,
      gradient: "from-sky-500/20 via-sky-500/15 to-blue-500/20",
      accentText: "text-sky-600 dark:text-sky-300",
      shortTag: "Dụng cụ vẽ",
    };
  }
  if (offer.category === "sach") {
    return {
      icon: BookOpen,
      gradient: "from-blue-500/20 via-blue-500/15 to-sky-500/20",
      accentText: "text-blue-600 dark:text-blue-300",
      shortTag: "Giáo trình",
    };
  }
  if (offer.category === "thoi_trang") {
    return {
      icon: Shirt,
      gradient: "from-sky-500/20 via-rose-500/15 to-sky-500/20",
      accentText: "text-rose-600 dark:text-rose-300",
      shortTag: "Thời trang SV",
    };
  }
  if (offer.category === "nhac_cu") {
    return {
      icon: Guitar,
      gradient: "from-amber-500/20 via-orange-500/15 to-rose-500/20",
      accentText: "text-amber-600 dark:text-amber-300",
      shortTag: "Nhạc cụ",
    };
  }
  if (offer.category === "dien_tu") {
    return {
      icon: Cpu,
      gradient: "from-blue-500/20 via-sky-500/15 to-blue-500/20",
      accentText: "text-blue-600 dark:text-blue-300",
      shortTag: "Thiết bị số",
    };
  }
  return {
    icon: Package,
    gradient: "from-teal-500/20 via-emerald-500/15 to-sky-500/20",
    accentText: "text-teal-600 dark:text-teal-300",
    shortTag: CATEGORY_LABELS[offer.category],
  };
}

function humanizeMatchReason(raw: string): string {
  return raw
    .replace("<=", "≤")
    .replace(">=", "≥")
    .replace("Đúng danh mục ", "")
    .trim();
}

function matchesRequestKeyword(req: BuyerRequest, rawKeyword: string): boolean {
  const q = stripViDiacritics(rawKeyword.trim().toLowerCase());
  if (!q) return true;
  const catName = req.category ? CATEGORY_LABELS[req.category] : "";
  const locName = req.location ? LOCATION_LABELS[req.location] : "";
  const buyer = req.buyerName ?? "";
  const haystack = stripViDiacritics(
    `${req.text} ${catName} ${locName} ${buyer}`.toLowerCase(),
  );
  return haystack.includes(q);
}

export default function AIRequestOfferPage() {
  const offers = useMemo(() => getMarketplaceOffers(), []);

  const [requests, setRequests] = useState<BuyerRequest[]>(() =>
    getAllBuyerRequests(),
  );
  const [selectedReqId, setSelectedReqId] = useState<string>("R01");
  const modelId: EmbeddingModelId = "jina-clip-v2-multimodal";

  // Bộ lọc thân thiện cho sinh viên (bấm lại để bỏ chọn + nhấn Enter/nút Tìm kiếm)
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | MatchingCategorySlug
  >("all");
  const [quickTab, setQuickTab] = useState<FeedQuickTab>("all");

  // Modal trạng thái
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [activeOfferModal, setActiveOfferModal] = useState<{
    match: RankedOfferMatch;
    initialTab: "details" | "chat";
  } | null>(null);
  const [savedOfferIds, setSavedOfferIds] = useState<string[]>([]);
  const [subscribedReqIds, setSubscribedReqIds] = useState<string[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessagesByOffer, setChatMessagesByOffer] = useState<
    Record<string, Array<{ sender: "me" | "seller"; text: string; time: string }>>
  >({});

  // Override tạm thời khi người dùng bấm áp dụng gợi ý mở rộng
  const [appliedPatch, setAppliedPatch] = useState<
    Partial<Pick<BuyerRequest, "budget_max" | "min_condition" | "location">> | null
  >(null);
  const [appliedLabel, setAppliedLabel] = useState<string | null>(null);

  const [matchState, setMatchState] = useState<{
    key: string;
    result: RequestMatchResult & { isLiveApi: boolean };
  } | null>(null);

  // Form tạo tin cần mua mới
  const [newText, setNewText] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<"" | MatchingCategorySlug>("");
  const [newBudget, setNewBudget] = useState("");
  const [newCondition, setNewCondition] = useState<"" | ConditionLevel>("");
  const [newLocation, setNewLocation] = useState<"" | LocationCode>("");
  const [newAllowExchange, setNewAllowExchange] = useState(false);
  const [newFlags, setNewFlags] = useState<
    Record<ConstraintKey, ConstraintRigidity>
  >({
    category: "hard",
    budget: "hard",
    condition: "hard",
    location: "hard",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const reloadRequests = useCallback(() => {
    setRequests(getAllBuyerRequests());
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) {
        return false;
      }
      if (quickTab === "mine" && !r.id.startsWith("R_USER_")) {
        return false;
      }
      if (quickTab === "with_image" && !r.image) {
        return false;
      }
      if (quickTab === "exchange" && !r.allow_exchange) {
        return false;
      }
      return matchesRequestKeyword(r, appliedSearch);
    });
  }, [requests, categoryFilter, quickTab, appliedSearch]);

  const baseSelectedRequest = useMemo(() => {
    if (filteredRequests.length === 0) return null;
    return (
      filteredRequests.find((r) => r.id === selectedReqId) ??
      filteredRequests[0]
    );
  }, [selectedReqId, filteredRequests]);

  const effectiveRequest = useMemo(() => {
    if (!baseSelectedRequest) return null;
    if (!appliedPatch) return baseSelectedRequest;
    return { ...baseSelectedRequest, ...appliedPatch };
  }, [baseSelectedRequest, appliedPatch]);

  const currentMatchKey = useMemo(() => {
    if (!effectiveRequest) return "";
    return `${effectiveRequest.id}::${modelId}::${JSON.stringify(appliedPatch)}`;
  }, [effectiveRequest, modelId, appliedPatch]);

  const matchResult =
    effectiveRequest && matchState?.key === currentMatchKey
      ? matchState.result
      : null;
  const matchingLoading = Boolean(
    effectiveRequest && matchState?.key !== currentMatchKey,
  );

  useEffect(() => {
    if (!effectiveRequest) return;
    let active = true;
    const reqKey = `${effectiveRequest.id}::${modelId}::${JSON.stringify(appliedPatch)}`;
    matchBuyerRequest(effectiveRequest, modelId, offers).then((res) => {
      if (active) setMatchState({ key: reqKey, result: res });
    });
    return () => {
      active = false;
    };
  }, [effectiveRequest, modelId, offers, appliedPatch]);

  const handleSelectRequest = (id: string) => {
    setSelectedReqId(id);
    setAppliedPatch(null);
    setAppliedLabel(null);
  };

  const hasActiveFilter =
    Boolean(appliedSearch) || categoryFilter !== "all" || quickTab !== "all";

  const handleResetAllFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setCategoryFilter("all");
    setQuickTab("all");
    setAppliedPatch(null);
    setAppliedLabel(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setAppliedSearch(trimmed);
    setAppliedPatch(null);
    setAppliedLabel(null);

    if (!trimmed) return;

    const inCurrentFilters = requests.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) {
        return false;
      }
      if (quickTab === "mine" && !r.id.startsWith("R_USER_")) return false;
      if (quickTab === "with_image" && !r.image) return false;
      if (quickTab === "exchange" && !r.allow_exchange) return false;
      return matchesRequestKeyword(r, trimmed);
    });

    if (inCurrentFilters.length > 0) {
      setSelectedReqId(inCurrentFilters[0].id);
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setAppliedPatch(null);
    setAppliedLabel(null);
  };

  const handleToggleQuickTab = (tabKey: FeedQuickTab) => {
    setQuickTab((prev) =>
      tabKey === "all" ? "all" : prev === tabKey ? "all" : tabKey,
    );
    setAppliedPatch(null);
    setAppliedLabel(null);
  };

  const handleToggleCategory = (slug: "all" | MatchingCategorySlug) => {
    setCategoryFilter((prev) =>
      slug === "all" ? "all" : prev === slug ? "all" : slug,
    );
    setAppliedPatch(null);
    setAppliedLabel(null);
  };

  const handleApplyCounterfactual = (cf: CounterfactualOption) => {
    setAppliedPatch(cf.changes);
    setAppliedLabel(cf.humanLabel);
  };

  const handleResetPatch = () => {
    setAppliedPatch(null);
    setAppliedLabel(null);
  };

  const toggleSaveOffer = (offerId: string) => {
    setSavedOfferIds((prev) =>
      prev.includes(offerId)
        ? prev.filter((id) => id !== offerId)
        : [...prev, offerId],
    );
  };

  const toggleSubscribeAlert = (reqId: string) => {
    setSubscribedReqIds((prev) =>
      prev.includes(reqId)
        ? prev.filter((id) => id !== reqId)
        : [...prev, reqId],
    );
  };

  const openOfferInteraction = (
    match: RankedOfferMatch,
    initialTab: "details" | "chat",
  ) => {
    setActiveOfferModal({ match, initialTab });
    setChatDraft("");
  };

  const handleSendQuickMessage = (offer: MarketplaceOffer, customText?: string) => {
    const content = (customText ?? chatDraft).trim();
    if (!content) return;
    setChatMessagesByOffer((prev) => {
      const current = prev[offer.id] ?? [];
      return {
        ...prev,
        [offer.id]: [
          ...current,
          { sender: "me", text: content, time: "Vừa xong" },
          {
            sender: "seller",
            text: `Chào bạn! Món "${offer.title}" mình vẫn còn nhé, bạn có thể ghé ${LOCATION_LABELS[offer.location]} xem trực tiếp nha.`,
            time: "Tự động phản hồi",
          },
        ],
      };
    });
    if (!customText) setChatDraft("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleFlag = (key: ConstraintKey) => {
    setNewFlags((prev) => ({
      ...prev,
      [key]: prev[key] === "hard" ? "soft" : "hard",
    }));
  };

  const handleCreateRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (trimmed.length < 5) {
      setFormError("Vui lòng mô tả món đồ bạn cần tìm ít nhất 5 ký tự.");
      return;
    }
    const parsedBudget = newBudget.trim() ? Number(newBudget.trim()) : null;
    if (
      parsedBudget !== null &&
      (Number.isNaN(parsedBudget) || parsedBudget <= 0)
    ) {
      setFormError("Ngân sách dự kiến phải là số tiền hợp lệ.");
      return;
    }

    const flagsOut: Partial<Record<ConstraintKey, ConstraintRigidity>> = {};
    if (newCategory) flagsOut.category = newFlags.category;
    if (parsedBudget !== null) flagsOut.budget = newFlags.budget;
    if (newCondition) flagsOut.condition = newFlags.condition;
    if (newLocation) flagsOut.location = newFlags.location;

    const created = saveCustomBuyerRequest({
      text: trimmed,
      image: newImage,
      category: newCategory || null,
      budget_max: parsedBudget,
      min_condition: newCondition || null,
      location: newLocation || null,
      allow_exchange: newAllowExchange,
      flags: flagsOut,
    });

    reloadRequests();
    setCategoryFilter("all");
    setQuickTab("all");
    setSearchInput("");
    setAppliedSearch("");
    setSelectedReqId(created.id);
    setAppliedPatch(null);
    setAppliedLabel(null);
    setCreateOpen(false);
    setNewText("");
    setNewImage(null);
    setNewCategory("");
    setNewBudget("");
    setNewCondition("");
    setNewLocation("");
    setNewAllowExchange(false);
    setNewFlags({
      category: "hard",
      budget: "hard",
      condition: "hard",
      location: "hard",
    });
    setFormError(null);
  };

  const handleClearCustom = () => {
    clearCustomBuyerRequests();
    reloadRequests();
    setSelectedReqId("R01");
  };

  const customCount = useMemo(
    () => requests.filter((r) => r.id.startsWith("R_USER_")).length,
    [requests],
  );

  return (
    <MainShell>
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* Clean Student-First Marketplace Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-linear-to-br from-blue-600 via-blue-700 to-sky-600 p-6 text-white shadow-lg md:p-8 dark:border-blue-500/30">
          <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1 text-xs font-bold text-blue-50 backdrop-blur-xs">
                <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                Trợ lý Tìm Đồ Thông Minh cho Sinh Viên
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                Góc Cần Mua & Tìm Đồ Sinh Viên
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-blue-50/90">
                Đăng món đồ bạn đang cần tìm hoặc tải lên một tấm ảnh mẫu — hệ thống sẽ
                tự động đối chiếu và chọn ra những tin bán đúng ý, đúng túi tiền nhất quanh KTX.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-blue-50">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-200" />
                  Hiểu cả mô tả tự nhiên & ảnh chụp
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-200" />
                  Đúng ngân sách & khu vực bạn chọn
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                data-testid="open-create-request-btn"
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Đăng tin cần mua
              </button>
            </div>
          </div>
        </section>

        {/* Search & Category Filter Bar */}
        <section className="mt-5 rounded-3xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-1 items-center overflow-hidden rounded-2xl border border-border bg-bg transition focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-500/15"
            >
              <button
                type="submit"
                aria-label="Tìm kiếm nhu cầu"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-muted transition hover:text-blue-600 focus-visible:outline-none"
              >
                <Search className="h-4 w-4" />
              </button>

              <input
                type="text"
                data-testid="request-search-input"
                value={searchInput}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setSearchInput(nextVal);
                  if (!nextVal.trim() && appliedSearch) {
                    setAppliedSearch("");
                  }
                }}
                placeholder="Nhập tên sách, đồ dùng KTX, khu vực rồi nhấn Enter..."
                className="min-w-0 flex-1 bg-transparent py-2.5 pr-2 text-sm text-fg placeholder:text-muted focus:outline-none focus-visible:outline-none"
              />

              {(searchInput || appliedSearch) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Xóa từ khóa"
                  className="mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-muted/20 hover:text-fg focus-visible:outline-none"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="submit"
                data-testid="request-search-submit-btn"
                className="m-1 inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-blue-500 focus-visible:outline-none"
              >
                Tìm kiếm
              </button>
            </form>

            {/* Quick Feed Tabs (click lại lần nữa để bỏ chọn) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["all", `Tất cả (${requests.length})`],
                  ...(customCount > 0
                    ? ([["mine", `Tin của tôi (${customCount})`]] as Array<
                        [FeedQuickTab, string]
                      >)
                    : []),
                  ["with_image", "Tìm bằng ảnh mẫu"],
                  ["exchange", "Nhận đổi đồ"],
                ] as Array<[FeedQuickTab, string]>
              ).map(([tabKey, tabLabel]) => {
                const active = quickTab === tabKey;
                const isRemovable = active && tabKey !== "all";
                return (
                  <button
                    key={tabKey}
                    type="button"
                    data-testid={`quick-tab-${tabKey}`}
                    aria-pressed={active}
                    title={
                      isRemovable ? "Nhấn lần nữa để bỏ chọn bộ lọc này" : undefined
                    }
                    onClick={() => handleToggleQuickTab(tabKey)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
                      active
                        ? "bg-blue-600 text-white shadow-2xs hover:bg-blue-500"
                        : "bg-bg text-muted hover:text-fg",
                    )}
                  >
                    {tabLabel}
                    {isRemovable && <X className="h-3 w-3 opacity-85" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Horizontal Pills (click lại lần nữa để bỏ chọn) */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {CATEGORY_CHIPS.map(({ slug, label, icon: Icon }) => {
                const active = categoryFilter === slug;
                const isRemovable = active && slug !== "all";
                return (
                  <button
                    key={slug}
                    type="button"
                    data-testid={`cat-chip-${slug}`}
                    aria-pressed={active}
                    title={
                      isRemovable ? "Nhấn lần nữa để bỏ chọn danh mục này" : undefined
                    }
                    onClick={() => handleToggleCategory(slug)}
                    className={cn(
                      "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
                      active
                        ? "border-blue-600 bg-blue-600/12 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-200"
                        : "border-border bg-bg/70 text-muted hover:border-blue-400/50 hover:text-fg",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {isRemovable && <X className="h-3 w-3 opacity-80" />}
                  </button>
                );
              })}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                data-testid="reset-all-filters-btn"
                onClick={handleResetAllFilters}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-300"
              >
                <RotateCcw className="h-3 w-3" />
                Bỏ lọc
              </button>
            )}
          </div>

          {appliedSearch && (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-muted">
              <span>
                Kết quả tìm kiếm cho:{" "}
                <strong className="text-fg">“{appliedSearch}”</strong> (
                {filteredRequests.length} tin)
              </span>
            </div>
          )}
        </section>

        {/* Main 2-Column Marketplace Workspace */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Community Buyer Request Feed */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 px-1">
                <div>
                  <h2 className="text-sm font-extrabold text-fg">
                    Sinh viên đang cần tìm ({filteredRequests.length})
                  </h2>
                  <p className="text-[11px] text-muted">
                    Chọn một tin cần mua để xem sản phẩm phù hợp nhất
                  </p>
                </div>
                {customCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCustom}
                    className="cursor-pointer text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Xóa tin đã tạo
                  </button>
                )}
              </div>

              {filteredRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-fg">
                    Chưa có tin cần mua nào khớp bộ lọc này
                  </p>
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="mt-2 cursor-pointer text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              ) : (
                <div className="mt-3.5 max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {filteredRequests.map((req) => {
                    const selected = effectiveRequest?.id === req.id;
                    const buyerName = req.buyerName ?? "Sinh viên HUTECH";
                    const isMine = req.id.startsWith("R_USER_");
                    return (
                      <button
                        key={req.id}
                        type="button"
                        data-testid={`request-item-${req.id}`}
                        onClick={() => handleSelectRequest(req.id)}
                        className={cn(
                          "group w-full cursor-pointer rounded-2xl border p-4 text-left transition-all",
                          selected
                            ? "border-blue-500 bg-blue-500/8 shadow-sm ring-1 ring-blue-500/35"
                            : "border-border bg-bg/50 hover:border-blue-400/50 hover:bg-surface",
                        )}
                      >
                        {/* Student Author Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-black text-white shadow-2xs",
                                getAvatarGradient(buyerName),
                              )}
                            >
                              {getInitials(buyerName)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-fg">
                                  {buyerName}
                                </span>
                                {isMine && (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                                    Của bạn
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {req.createdAt ?? "Hôm nay"}
                                </span>
                                {req.location && (
                                  <span className="inline-flex items-center gap-0.5">
                                    • <MapPin className="h-3 w-3" />
                                    {LOCATION_LABELS[req.location]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {req.category && (
                            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">
                              {CATEGORY_LABELS[req.category]}
                            </span>
                          )}
                        </div>

                        {/* Request Content + Optional Reference Image */}
                        <div className="mt-3 flex items-start gap-3">
                          {req.image && (
                            <div className="relative shrink-0">
                              <Image
                                src={req.image}
                                alt="Ảnh mẫu cần tìm"
                                width={60}
                                height={60}
                                unoptimized
                                className="h-15 w-15 rounded-xl border border-border object-cover"
                              />
                              <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white shadow-2xs">
                                <Camera className="h-2.5 w-2.5" />
                              </span>
                            </div>
                          )}
                          <p className="line-clamp-2 text-sm leading-snug font-bold text-fg">
                            {req.text}
                          </p>
                        </div>

                        {/* Clean User-Friendly Tags */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {req.budget_max !== null ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/12 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                                <Wallet className="h-3 w-3" />
                                Tối đa {formatMatchingVnd(req.budget_max)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-muted/15 px-2 py-0.5 font-semibold text-muted">
                                Giá thương lượng
                              </span>
                            )}

                            {req.min_condition && (
                              <span className="rounded-lg bg-sky-500/12 px-2 py-0.5 font-semibold text-sky-700 dark:text-sky-300">
                                {CONDITION_LABELS[req.min_condition]}
                              </span>
                            )}

                            {req.allow_exchange && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/12 px-2 py-0.5 font-bold text-sky-700 dark:text-sky-300">
                                <Repeat className="h-3 w-3" />
                                Nhận đổi đồ
                              </span>
                            )}
                          </div>

                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-bold transition",
                              selected
                                ? "text-blue-600 dark:text-blue-300"
                                : "text-muted opacity-0 group-hover:opacity-100",
                            )}
                          >
                            Xem gợi ý
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Request + Smart Suggestions + Matched Products */}
          <div className="space-y-5 lg:col-span-7">
            {/* Active Buyer Request Summary Card */}
            {effectiveRequest && (
              <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-black text-white shadow-xs",
                        getAvatarGradient(effectiveRequest.buyerName ?? "SV"),
                      )}
                    >
                      {getInitials(effectiveRequest.buyerName ?? "SV")}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-fg">
                          {effectiveRequest.buyerName ?? "Sinh viên"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/12 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">
                          <GraduationCap className="h-3 w-3" />
                          Đang tìm mua
                        </span>
                        <span className="text-xs text-muted">
                          • {effectiveRequest.createdAt ?? "Hôm nay"}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        Hệ thống tự động chọn lọc các tin bán sát nhu cầu nhất bên dưới
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="mt-3.5 text-lg leading-snug font-black text-fg md:text-xl">
                  {effectiveRequest.text}
                </h2>

                {effectiveRequest.image && (
                  <div className="mt-3.5 flex items-center gap-3.5 rounded-2xl border border-sky-500/25 bg-sky-500/6 p-3">
                    <Image
                      src={effectiveRequest.image}
                      alt="Ảnh mẫu người mua đính kèm"
                      width={76}
                      height={76}
                      unoptimized
                      className="h-19 w-19 rounded-xl border border-border object-cover"
                    />
                    <div className="text-xs">
                      <span className="inline-flex items-center gap-1.5 font-extrabold text-sky-700 dark:text-sky-300">
                        <Camera className="h-3.5 w-3.5" />
                        Tìm kiếm bằng hình ảnh mẫu
                      </span>
                      <p className="mt-1 leading-relaxed text-muted">
                        AI nhận diện kiểu dáng và loại sản phẩm trực tiếp từ ảnh chụp để tìm đúng món đồ tương tự đang bán trên chợ.
                      </p>
                    </div>
                  </div>
                )}

                {/* Clean Requirement Summary Chips */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3.5 text-xs">
                  <span className="font-semibold text-muted">Tiêu chí:</span>
                  {effectiveRequest.category && (
                    <RequirementChip
                      label={CATEGORY_LABELS[effectiveRequest.category]}
                      rigidity={getConstraintFlag(effectiveRequest, "category")}
                    />
                  )}
                  {effectiveRequest.budget_max !== null && (
                    <RequirementChip
                      label={`Ngân sách ≤ ${formatMatchingVnd(effectiveRequest.budget_max)}`}
                      rigidity={getConstraintFlag(effectiveRequest, "budget")}
                    />
                  )}
                  {effectiveRequest.min_condition && (
                    <RequirementChip
                      label={CONDITION_LABELS[effectiveRequest.min_condition]}
                      rigidity={getConstraintFlag(effectiveRequest, "condition")}
                    />
                  )}
                  {effectiveRequest.location && (
                    <RequirementChip
                      label={LOCATION_LABELS[effectiveRequest.location]}
                      rigidity={getConstraintFlag(effectiveRequest, "location")}
                    />
                  )}
                  {effectiveRequest.allow_exchange && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/12 px-3 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                      <Repeat className="h-3 w-3" />
                      Có nhận trao đổi đồ
                    </span>
                  )}
                  {!effectiveRequest.category &&
                    effectiveRequest.budget_max === null &&
                    !effectiveRequest.min_condition &&
                    !effectiveRequest.location && (
                      <span className="text-xs text-muted">
                        Tìm linh hoạt theo mô tả món đồ
                      </span>
                    )}
                </div>

                {/* Banner khi đã áp dụng gợi ý mở rộng */}
                {appliedLabel && (
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      Đã áp dụng theo lựa chọn của bạn: {appliedLabel}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetPatch}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-surface px-3 py-1.5 font-bold text-fg shadow-2xs hover:bg-muted/20"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Quay lại yêu cầu ban đầu
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Friendly Smart Relaxation Banner (Counterfactual) */}
            {matchResult?.counterfactualTriggered &&
              matchResult.counterfactuals.length > 0 && (
                <div
                  data-testid="counterfactual-panel"
                  className="rounded-3xl border border-amber-500/35 bg-linear-to-br from-amber-500/10 via-orange-500/6 to-transparent p-5 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-extrabold text-fg md:text-base">
                        Gợi ý nhỏ để bạn có thêm lựa chọn tốt hơn
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">
                        {matchResult.strictMatchCount === 0
                          ? "Hiện chưa có tin đăng khớp trọn vẹn mọi ưu tiên ban đầu, nhưng chỉ cần linh hoạt nhẹ ở tiêu chí bạn cho phép là có ngay món đúng ý:"
                          : "Ngoài kết quả hiện tại, nếu linh hoạt nhẹ tiêu chí ưu tiên bạn sẽ mở khóa thêm món rất sát nhu cầu:"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-2.5">
                    {matchResult.counterfactuals.map((cf, idx) => (
                      <div
                        key={cf.suggestionId}
                        className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-500/25 bg-surface p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              Có thêm {cf.unlockedOfferIds.length} sản phẩm phù hợp
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-extrabold text-fg">
                            {cf.humanLabel}
                          </p>
                          {cf.topOffers[0] && (
                            <p className="mt-0.5 truncate text-xs text-muted">
                              Nổi bật:{" "}
                              <strong className="text-fg">
                                {cf.topOffers[0].offer.title}
                              </strong>{" "}
                              • {formatMatchingVnd(cf.topOffers[0].offer.price)}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          data-testid={`apply-cf-${idx}`}
                          onClick={() => handleApplyCounterfactual(cf)}
                          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-2xs transition hover:bg-amber-400"
                        >
                          Xem ngay
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Matched Marketplace Products Section */}
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3.5">
                <div>
                  <h3 className="text-base font-extrabold text-fg">
                    Sản phẩm gợi ý cho nhu cầu này (
                    {matchResult?.rankedOffers.length ?? 0})
                  </h3>
                  <p className="text-xs text-muted">
                    Chỉ hiển thị những món thực sự đúng loại đồ bạn tìm và tuân thủ tiêu chí bắt buộc
                  </p>
                </div>
              </div>

              {matchingLoading ? (
                <div className="space-y-3 py-8">
                  {[1, 2].map((sk) => (
                    <div
                      key={sk}
                      className="h-32 animate-pulse rounded-2xl border border-border bg-muted/10"
                    />
                  ))}
                </div>
              ) : !effectiveRequest ? (
                <div
                  data-testid="no-filtered-request-state"
                  className="mx-auto max-w-md py-10 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/15 text-muted">
                    <Search className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 text-base font-extrabold text-fg">
                    Không có sản phẩm nào khớp bộ lọc hiện tại
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    Không có nhu cầu hay sản phẩm nào khớp đồng thời từ khóa tìm kiếm và danh mục bạn đang chọn.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-blue-500"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Bỏ lọc để xem lại
                  </button>
                </div>
              ) : !matchResult || matchResult.rankedOffers.length === 0 ? (
                <div
                  data-testid="empty-match-state"
                  className="mx-auto max-w-md py-10 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-600 dark:text-blue-300">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 text-base font-extrabold text-fg">
                    Chưa có tin bán phù hợp trên chợ lúc này
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {matchResult?.hardBlockDiagnostic ??
                      "Hiện chưa có sinh viên nào đăng bán đúng món đồ với mức giá và khu vực bạn yêu cầu. Hệ thống không hiển thị sản phẩm khác loại để tránh làm loãng thông tin."}
                  </p>

                  {effectiveRequest && (
                    <button
                      type="button"
                      onClick={() => toggleSubscribeAlert(effectiveRequest.id)}
                      className={cn(
                        "mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition",
                        subscribedReqIds.includes(effectiveRequest.id)
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-blue-600 text-white hover:bg-blue-500",
                      )}
                    >
                      {subscribedReqIds.includes(effectiveRequest.id) ? (
                        <>
                          <BellRing className="h-4 w-4" />
                          Đã bật báo tin khi có hàng mới
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4" />
                          Báo cho tôi ngay khi có người đăng bán
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {matchResult.rankedOffers.map((item, rankIdx) => {
                    const { offer } = item;
                    const typeInfo = OFFER_TYPE_BADGE[offer.type];
                    const isSaved = savedOfferIds.includes(offer.id);
                    const matchPct = Math.min(
                      99,
                      Math.max(72, Math.round(item.totalScore * 100 + 12)),
                    );

                    return (
                      <article
                        key={offer.id}
                        data-testid={`ranked-offer-${offer.id}`}
                        className={cn(
                          "group rounded-2xl border p-4 transition-all hover:shadow-md",
                          item.satisfiesAllInitial
                            ? "border-border bg-bg/40 hover:border-blue-400/60"
                            : "border-amber-500/35 bg-amber-500/4 hover:border-amber-500/60",
                        )}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row">
                          {/* Rich Product Thumbnail (Real Photo OR Bespoke Item Illustration) */}
                          <OfferVisualThumb
                            offer={offer}
                            isTopMatch={rankIdx === 0}
                            onClick={() => openOfferInteraction(item, "details")}
                          />

                          <div className="min-w-0 flex-1">
                            {/* Top Meta + Price */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
                                    item.satisfiesAllInitial
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                                  )}
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Độ phù hợp {matchPct}%
                                </span>

                                <span
                                  className={cn(
                                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                                    typeInfo.className,
                                  )}
                                >
                                  {typeInfo.label}
                                </span>

                                <span className="rounded-full bg-muted/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                                  {CONDITION_LABELS[offer.condition]}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-lg font-black text-blue-600 dark:text-blue-300">
                                  {formatMatchingVnd(offer.price)}
                                </span>
                              </div>
                            </div>

                            {/* Title & Description */}
                            <button
                              type="button"
                              onClick={() => openOfferInteraction(item, "details")}
                              className="mt-1.5 cursor-pointer text-left"
                            >
                              <h4 className="text-base font-extrabold text-fg transition group-hover:text-blue-600 dark:group-hover:text-blue-300">
                                {offer.title}
                              </h4>
                            </button>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                              {offer.description}
                            </p>

                            {/* Concise Human-Readable Reasons (Max 3) */}
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {item.matchedConditions.slice(0, 2).map((mc) => (
                                <span
                                  key={mc}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                                >
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  {humanizeMatchReason(mc)}
                                </span>
                              ))}
                              {item.unmatchedSoftConditions.map((uc) => (
                                <span
                                  key={uc}
                                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                                >
                                  {humanizeMatchReason(uc)}
                                </span>
                              ))}
                            </div>

                            {/* Seller Info + Interactive Marketplace Actions */}
                            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <div
                                  className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br text-[10px] font-black text-white",
                                    getAvatarGradient(offer.sellerName ?? offer.id),
                                  )}
                                >
                                  {getInitials(offer.sellerName ?? "SV")}
                                </div>
                                <span className="font-bold text-fg">
                                  {offer.sellerName ?? "Sinh viên"}
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {LOCATION_LABELS[offer.location]}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleSaveOffer(offer.id)}
                                  aria-label="Lưu tin"
                                  className={cn(
                                    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border transition",
                                    isSaved
                                      ? "border-rose-500/40 bg-rose-500/12 text-rose-500"
                                      : "border-border bg-surface text-muted hover:text-rose-500",
                                  )}
                                >
                                  <Heart
                                    className={cn(
                                      "h-4 w-4",
                                      isSaved && "fill-current",
                                    )}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openOfferInteraction(item, "details")}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-fg transition hover:border-blue-400"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Chi tiết
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openOfferInteraction(item, "chat")}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-blue-500"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  Nhắn người bán
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Xem chi tiết sản phẩm & Nhắn nhanh người bán */}
      {activeOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-surface p-6 text-fg shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3.5">
              <div>
                <span className="rounded-full bg-blue-500/12 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">
                  {CATEGORY_LABELS[activeOfferModal.match.offer.category]}
                </span>
                <h3 className="mt-1.5 text-lg font-black">
                  {activeOfferModal.match.offer.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveOfferModal(null)}
                aria-label="Đóng"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-muted/20 hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <OfferVisualThumb
                offer={activeOfferModal.match.offer}
                isTopMatch={false}
              />
              <div className="flex-1 space-y-2 text-xs">
                <div className="text-xl font-black text-blue-600 dark:text-blue-300">
                  {formatMatchingVnd(activeOfferModal.match.offer.price)}
                </div>
                <p className="leading-relaxed text-muted">
                  {activeOfferModal.match.offer.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted/15 px-2.5 py-1 font-semibold">
                    <Tag className="h-3 w-3" />
                    {CONDITION_LABELS[activeOfferModal.match.offer.condition]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted/15 px-2.5 py-1 font-semibold">
                    <MapPin className="h-3 w-3" />
                    {LOCATION_LABELS[activeOfferModal.match.offer.location]}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Chat Box */}
            <div className="mt-5 rounded-2xl border border-border bg-bg/60 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-fg">
                  Trao đổi với {activeOfferModal.match.offer.sellerName ?? "Người bán"}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ● Đang hoạt động
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  "Món này còn không bạn ơi?",
                  "Hẹn xem đồ ở sảnh KTX được không ạ?",
                  "Bạn có bớt nhẹ cho sinh viên không?",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      handleSendQuickMessage(activeOfferModal.match.offer, preset)
                    }
                    className="cursor-pointer rounded-full border border-blue-500/25 bg-blue-500/8 px-3 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-500/15 dark:text-blue-300"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {(chatMessagesByOffer[activeOfferModal.match.offer.id]?.length ??
                0) > 0 && (
                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl bg-surface p-3 text-xs">
                  {chatMessagesByOffer[activeOfferModal.match.offer.id].map(
                    (msg, i) => (
                      <div
                        key={`${msg.time}-${i}`}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2",
                          msg.sender === "me"
                            ? "ml-auto bg-blue-600 text-white"
                            : "bg-muted/15 text-fg",
                        )}
                      >
                        <p>{msg.text}</p>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendQuickMessage(activeOfferModal.match.offer);
                    }
                  }}
                  placeholder="Nhập tin nhắn gửi người bán..."
                  className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleSendQuickMessage(activeOfferModal.match.offer)
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-500"
                >
                  <Send className="h-3.5 w-3.5" />
                  Gửi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Đăng tin cần mua mới */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-surface p-6 text-fg shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div>
                <h2 className="text-lg font-black">
                  Đăng tin cần mua / tìm đồ sinh viên
                </h2>
                <p className="text-xs text-muted">
                  Mặc định các tiêu chí bạn chọn là <strong>Bắt buộc</strong>. Bấm vào nhãn bên cạnh nếu bạn muốn để chế độ <strong>Linh hoạt</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Đóng"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-muted/20 hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequestSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold">
                  Món đồ bạn đang tìm *
                </label>
                <textarea
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Ví dụ: Cần tìm ấm đun nước siêu tốc nấu mì trong phòng trọ, hoặc giáo trình Giải tích 1..."
                  className="mt-1.5 w-full rounded-2xl border border-border bg-bg px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Ảnh tham khảo */}
              <div>
                <span className="block text-xs font-extrabold">
                  Đính kèm ảnh mẫu (Tùy chọn)
                </span>
                <div className="mt-1.5 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-blue-400/60 bg-blue-500/8 px-4 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-500/15 dark:text-blue-300">
                    <ImagePlus className="h-4 w-4" />
                    <Upload className="h-3.5 w-3.5" />
                    Tải ảnh món đồ mẫu
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {newImage && (
                    <div className="flex items-center gap-2">
                      <Image
                        src={newImage}
                        alt="Xem trước ảnh mẫu"
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-xl border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewImage(null)}
                        className="cursor-pointer text-xs font-bold text-rose-500 hover:underline"
                      >
                        Gỡ ảnh
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Tiêu chí */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-bg/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold">Danh mục</label>
                    <RigiditySwitch
                      rigidity={newFlags.category}
                      onToggle={() => toggleFlag("category")}
                    />
                  </div>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as "" | MatchingCategorySlug)
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">Tất cả danh mục</option>
                    {Object.entries(CATEGORY_LABELS).map(([slug, name]) => (
                      <option key={slug} value={slug}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-border bg-bg/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold">
                      Ngân sách tối đa (VNĐ)
                    </label>
                    <RigiditySwitch
                      rigidity={newFlags.budget}
                      onToggle={() => toggleFlag("budget")}
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="VD: 150000"
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-bg/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold">Tình trạng mong muốn</label>
                    <RigiditySwitch
                      rigidity={newFlags.condition}
                      onToggle={() => toggleFlag("condition")}
                    />
                  </div>
                  <select
                    value={newCondition}
                    onChange={(e) =>
                      setNewCondition(e.target.value as "" | ConditionLevel)
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">Mọi tình trạng</option>
                    <option value="new">Mới 100%</option>
                    <option value="like_new">Như mới (90%+)</option>
                    <option value="used">Đã qua sử dụng</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-border bg-bg/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold">Khu vực nhận đồ</label>
                    <RigiditySwitch
                      rigidity={newFlags.location}
                      onToggle={() => toggleFlag("location")}
                    />
                  </div>
                  <select
                    value={newLocation}
                    onChange={(e) =>
                      setNewLocation(e.target.value as "" | LocationCode)
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">Mọi khu vực</option>
                    {Object.entries(LOCATION_LABELS).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={newAllowExchange}
                  onChange={(e) => setNewAllowExchange(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-blue-600"
                />
                Mình sẵn sàng trao đổi đồ trực tiếp với sinh viên khác
              </label>

              <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="cursor-pointer rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted hover:text-fg"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  data-testid="submit-create-request-btn"
                  className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-blue-500"
                >
                  Đăng tin & Tìm sản phẩm ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainShell>
  );
}

function OfferVisualThumb({
  offer,
  isTopMatch,
  onClick,
}: {
  offer: MarketplaceOffer;
  isTopMatch: boolean;
  onClick?: () => void;
}) {
  const visual = resolveOfferVisual(offer);
  const Icon = visual.icon;

  if (offer.image) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "relative h-32 w-full shrink-0 overflow-hidden rounded-2xl border border-border sm:w-32",
          onClick && "cursor-pointer",
        )}
      >
        <Image
          src={offer.image}
          alt={offer.title}
          width={140}
          height={140}
          unoptimized
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
          Ảnh chụp thật
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex h-32 w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-linear-to-br p-3 text-center sm:w-32",
        visual.gradient,
        onClick && "cursor-pointer",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface/90 shadow-xs">
        <Icon className={cn("h-6 w-6", visual.accentText)} />
      </div>
      <span className="mt-2 text-[11px] font-bold text-fg/85">
        {visual.shortTag}
      </span>
      {isTopMatch && (
        <span className="mt-0.5 text-[10px] font-semibold text-muted">
          Gợi ý hàng đầu
        </span>
      )}
    </div>
  );
}

function RequirementChip({
  label,
  rigidity,
}: {
  label: string;
  rigidity: ConstraintRigidity;
}) {
  const isHard = rigidity === "hard";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold",
        isHard
          ? "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isHard ? "bg-blue-500" : "bg-amber-500",
        )}
      />
      {label}
      <span className="font-normal opacity-80">
        ({isHard ? "Cố định" : "Linh hoạt"})
      </span>
    </span>
  );
}

function RigiditySwitch({
  rigidity,
  onToggle,
}: {
  rigidity: ConstraintRigidity;
  onToggle: () => void;
}) {
  const isHard = rigidity === "hard";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold transition",
        isHard
          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
          : "bg-amber-500/20 text-amber-700 dark:text-amber-300",
      )}
    >
      <SlidersHorizontal className="h-3 w-3" />
      {isHard ? "Bắt buộc" : "Linh hoạt"}
    </button>
  );
}
