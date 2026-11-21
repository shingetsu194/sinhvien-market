"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bookmark,
  Camera,
  CheckCircle2,
  Clock,
  Filter,
  Lightbulb,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  X,
  Zap,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  getMarketplaceCategories,
  getMarketplaceProducts,
} from "@/lib/api/marketplace";
import type { MarketplaceProduct } from "@/lib/api/marketplace";
import {
  FALLBACK_REASON_LABEL,
  HEADER_IMAGE_KEY,
  MAX_IMAGE_BYTES,
  WARNING_LABEL,
  fileToDataUrl,
  saveBuyerRequest,
  smartSearch,
  type SmartSearchInput,
  type SmartSearchResponse,
  type SmartSearchSuggestion,
} from "@/lib/api/smart-search";
import { USE_MOCK } from "@/lib/config";
import type {
  AdminCategory,
  ProductCondition,
  ProductType,
} from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateVi, formatVnd } from "@/lib/validation/admin";

const CONDITION_MAP: Record<string, { label: string; badgeClass: string }> = {
  new: {
    label: "🟢 Mới 100%",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  like_new: {
    label: "🔵 Như mới (90%+)",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  used: {
    label: "🟡 Đã qua sử dụng",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
};

/** Fields shared by the list API and smart search results. */
type CardProduct = Pick<
  MarketplaceProduct,
  | "id"
  | "title"
  | "type"
  | "price"
  | "condition"
  | "categoryName"
  | "sellerId"
  | "sellerName"
  | "sellerVerified"
  | "imageUrl"
> & { createdAt: string | null };

function ProductCard({
  p,
  reasons,
  warnings,
}: {
  p: CardProduct;
  reasons?: string[];
  warnings?: string[];
}) {
  const cond = CONDITION_MAP[p.condition];
  return (
    <div
      data-testid={`product-card-${p.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <Link
        href={`/products/${p.id}`}
        className="relative flex h-44 items-center justify-center overflow-hidden bg-surface-2"
        aria-label={`Xem chi tiết ${p.title}`}
      >
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by the PHP backend through a rewrite
          <img
            src={p.imageUrl}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : p.type === "auction" ? (
          <Zap className="h-12 w-12 text-rose-500/35 transition group-hover:scale-110" />
        ) : (
          <ShoppingBag className="h-12 w-12 text-muted/35 transition group-hover:scale-110" />
        )}

        <div className="absolute top-2.5 left-2.5">
          {p.type === "auction" ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-linear-to-r from-rose-500 to-orange-500 px-2.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-md">
              ⚡ Đấu giá
            </span>
          ) : p.type === "exchange" ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-2.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-md">
              🔄 Trao đổi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-md">
              💰 Mua bán
            </span>
          )}
        </div>

        {cond && (
          <div className="absolute top-2.5 right-2.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs",
                cond.badgeClass,
              )}
            >
              {cond.label}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1.5 flex items-center gap-1 text-xs text-muted">
          <Tag className="h-3 w-3 text-primary" />
          {p.categoryName}
        </p>

        <Link
          href={`/products/${p.id}`}
          className="mb-3 line-clamp-2 flex-1 text-sm font-bold text-fg transition group-hover:text-primary"
        >
          {p.title}
        </Link>

        {reasons && reasons.length > 0 && (
          <ul className="mb-2 space-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
            {reasons.slice(0, 2).map((r) => (
              <li key={r} className="flex items-start gap-1">
                <CheckCircle2 className="mt-px h-3 w-3 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
        {warnings && warnings.length > 0 && (
          <ul className="mb-2 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300">
            {warnings.slice(0, 2).map((w) => (
              <li key={w} className="flex items-start gap-1">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mb-3 flex items-end justify-between">
          {p.type === "auction" ? (
            <div>
              <span className="font-mono text-lg font-black text-rose-500">
                {formatVnd(p.price)}
              </span>
              <span className="block text-[10px] text-rose-500">
                ↓ Giá đang giảm dần
              </span>
            </div>
          ) : p.type === "sale" ? (
            <span className="font-mono text-lg font-extrabold text-primary">
              {formatVnd(p.price)}
            </span>
          ) : (
            <span className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-300">
              Nhận trao đổi đồ
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 truncate pr-2">
            <User className="h-3.5 w-3.5 shrink-0" />
            <Link
              href={`/users/${p.sellerId}`}
              className="truncate font-medium text-fg transition hover:text-primary"
            >
              {p.sellerName}
            </Link>
            {p.sellerVerified && (
              <ShieldCheck
                className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                aria-label="Sinh viên đã xác thực"
              />
            )}
          </span>
          {p.createdAt && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateVi(p.createdAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsCatalogInner() {
  const { user, loadingUser } = useMainShell();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialCat = Number(searchParams.get("category") ?? "0") || 0;
  const initialType = (searchParams.get("type") ?? "") as "" | ProductType;
  // Mock mode has no backend AI: keep the classic keyword filter there.
  const smartEnabled = !USE_MOCK;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loadError, setLoadError] = useState("");

  const [keyword, setKeyword] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(smartEnabled ? initialQ.trim() : "");
  const [categoryId, setCategoryId] = useState<number>(initialCat);
  const [typeFilter, setTypeFilter] = useState<"" | ProductType>(initialType);
  const [conditionFilter, setConditionFilter] = useState<"" | ProductCondition>("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Smart search
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [flexible, setFlexible] = useState(true);
  const [nearMe, setNearMe] = useState(false);
  const [smart, setSmart] = useState<SmartSearchResponse | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const smartActive = smartEnabled && (activeQuery.length >= 2 || imageDataUrl !== null);

  useEffect(() => {
    let active = true;
    getMarketplaceCategories()
      .then((catList) => {
        if (active) setCategories(catList);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "Không thể tải danh mục sản phẩm.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  function currentInput(): SmartSearchInput {
    const flag = flexible ? "soft" : "hard";
    return {
      description: activeQuery.length >= 2 ? activeQuery : "Tìm món đồ giống ảnh mẫu",
      imageDataUrl,
      categoryId: categoryId || null,
      budgetMax: priceMax ? Number(priceMax) : null,
      minCondition: conditionFilter || null,
      allowExchange: typeFilter === "" || typeFilter === "exchange",
      nearMe,
      flags: { budget: flag, condition: flag, location: flag },
    };
  }

  // Smart search: explicit submit (Enter / button / image) or filter change while active.
  useEffect(() => {
    if (!smartActive) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError("");
      smartSearch(currentInput())
        .then((res) => {
          if (active) setSmart(res);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setSmart(null);
          setLoadError(error instanceof Error ? error.message : "Không thể tìm kiếm lúc này.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // currentInput() reads exactly these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartActive, activeQuery, imageDataUrl, categoryId, conditionFilter, priceMax, typeFilter, flexible, nearMe]);

  // Classic browsing (no query): the moderated product list.
  useEffect(() => {
    if (smartActive) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError("");
      getMarketplaceProducts({
        keyword: smartEnabled ? "" : keyword,
        categoryId: categoryId || undefined,
        type: typeFilter || undefined,
        condition: conditionFilter || undefined,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
      })
        .then((productList) => {
          if (active) setProducts(productList);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setLoadError(
            error instanceof Error ? error.message : "Không thể tải danh sách sản phẩm.",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [smartActive, smartEnabled, keyword, categoryId, typeFilter, conditionFilter, priceMin, priceMax]);

  // The header search box (MainShell) navigates here with ?q= or ?aiImage=<ts>
  // (image kept in sessionStorage). Follow it even when already on /products,
  // and run the real smart search with the same checks as the camera button.
  const qParam = searchParams.get("q");
  const aiImageParam = searchParams.get("aiImage");
  const handledHeaderImage = useRef<string | null>(null);
  // New ?q= while mounted: adjust state during render (no effect needed).
  const [seenQParam, setSeenQParam] = useState(qParam);
  if (qParam !== seenQParam) {
    setSeenQParam(qParam);
    if (qParam !== null) {
      setKeyword(qParam);
      if (smartEnabled) setActiveQuery(qParam.trim());
    }
  }
  useEffect(() => {
    if (!aiImageParam || loadingUser || !smartEnabled) return;
    // Applied asynchronously like the other effects here; the ref and storage are
    // only consumed when the timer fires, so a StrictMode re-run does not lose it.
    const timer = window.setTimeout(() => {
      if (handledHeaderImage.current === aiImageParam) return;
      handledHeaderImage.current = aiImageParam;
      let dataUrl: string | null = null;
      try {
        const stored = JSON.parse(window.sessionStorage.getItem(HEADER_IMAGE_KEY) ?? "null") as
          | { dataUrl?: unknown }
          | null;
        window.sessionStorage.removeItem(HEADER_IMAGE_KEY);
        dataUrl = typeof stored?.dataUrl === "string" ? stored.dataUrl : null;
      } catch {
        dataUrl = null;
      }
      if (!dataUrl) return;
      if (!user) setNotice("Đăng nhập để tìm kiếm bằng ảnh.");
      else if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) setNotice("Ảnh phải là JPG, PNG hoặc WEBP.");
      else if (((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4 > MAX_IMAGE_BYTES) setNotice("Ảnh tối đa 2MB.");
      else {
        setNotice("");
        setImageDataUrl(dataUrl);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [aiImageParam, loadingUser, user, smartEnabled]);

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    setNotice("");
    setActiveQuery(keyword.trim());
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    if (!user) {
      setNotice("Đăng nhập để tìm kiếm bằng ảnh.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice("Ảnh phải là JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setNotice("Ảnh tối đa 2MB.");
      return;
    }
    setNotice("");
    setImageDataUrl(await fileToDataUrl(file));
    setActiveQuery(keyword.trim());
  }

  function clearSearch() {
    setKeyword("");
    setActiveQuery("");
    setImageDataUrl(null);
    setSmart(null);
    setNotice("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function applySuggestion(s: SmartSearchSuggestion) {
    if (s.patch.budgetMax !== undefined) setPriceMax(String(s.patch.budgetMax));
    if (s.patch.minCondition !== undefined) setConditionFilter(s.patch.minCondition);
    if ("buildingId" in s.patch && s.patch.buildingId === null) setNearMe(false);
    setNotice(`Đã áp dụng: ${s.label}.`);
  }

  async function saveNeed() {
    setSaving(true);
    setNotice("");
    try {
      const input = currentInput();
      await saveBuyerRequest({
        description: input.description,
        imageDataUrl: input.imageDataUrl,
        categoryId: input.categoryId,
        budgetMax: input.budgetMax,
        minCondition: input.minCondition,
        allowExchange: input.allowExchange,
        flags: input.flags,
      });
      setNotice("Đã lưu nhu cầu. Bạn có thể xem lại khi có người đăng món phù hợp.");
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "Không lưu được nhu cầu.");
    } finally {
      setSaving(false);
    }
  }

  const smartResults = (smart?.results ?? []).filter(
    (r) =>
      (!typeFilter || r.type === typeFilter) &&
      (!priceMin || r.price === null || r.price >= Number(priceMin)),
  );
  const shownCount = smartActive ? smartResults.length : products.length;
  const blockers = smart?.hardBlockers ?? {};
  const blockedCount = Object.values(blockers).reduce((a, b) => a + (b ?? 0), 0);

  const hasFilter =
    Boolean(keyword.trim()) ||
    imageDataUrl !== null ||
    categoryId > 0 ||
    Boolean(typeFilter) ||
    Boolean(conditionFilter) ||
    Boolean(priceMin) ||
    Boolean(priceMax) ||
    nearMe;

  const handleResetFilters = () => {
    clearSearch();
    setCategoryId(0);
    setTypeFilter("");
    setConditionFilter("");
    setPriceMin("");
    setPriceMax("");
    setNearMe(false);
    setFlexible(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* One search box: meaning-based search, optional reference photo. */}
      <form onSubmit={submitSearch} className="mb-6" role="search">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="filter-q"
              data-testid="smart-search-input"
              type="search"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (!smartEnabled) setActiveQuery("");
              }}
              placeholder="Bạn cần gì? Ví dụ: nồi cơm nhỏ cho phòng 2 người, dưới 300k"
              aria-label="Tìm sản phẩm"
              className="w-full rounded-2xl border-2 border-border bg-surface py-3 pr-3 pl-10 text-sm text-fg outline-none focus:border-primary"
            />
          </div>
          {smartEnabled && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                data-testid="smart-search-image-input"
                onChange={(e) => void pickImage(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => (user ? fileRef.current?.click() : setNotice("Đăng nhập để tìm kiếm bằng ảnh."))}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border-2 border-border bg-surface px-3.5 text-sm font-bold text-fg transition hover:border-primary/50"
                aria-label="Tìm bằng ảnh"
                title="Tìm bằng ảnh"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Ảnh</span>
              </button>
            </>
          )}
          <button
            type="submit"
            data-testid="smart-search-submit"
            className="shrink-0 cursor-pointer rounded-2xl bg-primary px-5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Tìm
          </button>
        </div>

        {imageDataUrl && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            <img src={imageDataUrl} alt="Ảnh mẫu" className="h-12 w-12 rounded-lg object-cover" />
            <span className="text-xs text-muted">Đang tìm món giống ảnh này</span>
            <button
              type="button"
              onClick={() => {
                setImageDataUrl(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="cursor-pointer text-muted hover:text-fg"
              aria-label="Bỏ ảnh mẫu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="mt-2 text-sm font-medium text-primary">
            {notice}{" "}
            {!user && notice.includes("Đăng nhập") && (
              <Link href="/login" className="underline">
                Đăng nhập
              </Link>
            )}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-1/4">
          <div className="sticky top-24 rounded-2xl border-2 border-border bg-surface p-5 shadow-xs">
            <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-fg">
              <Filter className="h-4 w-4 text-primary" />
              Lọc sản phẩm
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="filter-cat"
                  className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase"
                >
                  Danh mục
                </label>
                <select
                  id="filter-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                >
                  <option value={0}>-- Tất cả danh mục --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-type"
                  className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase"
                >
                  Hình thức giao dịch
                </label>
                <select
                  id="filter-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as "" | ProductType)}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                >
                  <option value="">Tất cả hình thức</option>
                  <option value="sale">💰 Mua bán trực tiếp</option>
                  <option value="auction">⚡ Đấu giá ngược</option>
                  <option value="exchange">🔄 Trao đổi đồ</option>
                </select>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">
                  {smartActive ? "Tình trạng tối thiểu" : "Tình trạng"}
                </span>
                <div className="space-y-1.5 text-sm">
                  {(
                    [
                      { value: "", label: "⚪ Tất cả" },
                      { value: "new", label: "🟢 Mới 100%" },
                      { value: "like_new", label: "🔵 Như mới (90%+)" },
                      { value: "used", label: "🟡 Đã qua sử dụng" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value || "all"}
                      className="flex cursor-pointer items-center gap-2 text-fg hover:text-primary"
                    >
                      <input
                        type="radio"
                        name="condition"
                        checked={conditionFilter === opt.value}
                        onChange={() => setConditionFilter(opt.value)}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">
                  {smartActive ? "Giá (VNĐ) — tối đa là ngân sách" : "Khoảng giá (VNĐ)"}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Từ"
                    aria-label="Giá từ"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Đến"
                    aria-label="Giá đến"
                    data-testid="filter-price-max"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  />
                </div>
              </div>

              {smartEnabled && (
                <div className="space-y-2 border-t border-border pt-4 text-sm">
                  {user && (
                    <label className="flex cursor-pointer items-start gap-2 text-fg">
                      <input
                        type="checkbox"
                        checked={nearMe}
                        onChange={(e) => setNearMe(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-indigo-600"
                        data-testid="filter-near-me"
                      />
                      <span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> Gần tôi
                        </span>
                        <span className="block text-xs text-muted">Người bán ở cùng tòa KTX với bạn</span>
                      </span>
                    </label>
                  )}
                  <label className="flex cursor-pointer items-start gap-2 text-fg">
                    <input
                      type="checkbox"
                      checked={flexible}
                      onChange={(e) => setFlexible(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-indigo-600"
                      data-testid="filter-flexible"
                    />
                    <span>
                      <span className="font-semibold">Linh hoạt điều kiện</span>
                      <span className="block text-xs text-muted">
                        Vẫn hiện món hơi vượt giá / khác tòa và gợi ý nới điều kiện. Tắt để chỉ xem món đáp ứng đúng.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {hasFilter && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-border py-2 text-xs font-bold text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="lg:w-3/4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-fg sm:text-2xl">
                {smartActive ? (
                  activeQuery ? (
                    <>
                      Kết quả cho:{" "}
                      <span className="text-primary">&ldquo;{activeQuery}&rdquo;</span>
                    </>
                  ) : (
                    "Kết quả tìm theo ảnh mẫu"
                  )
                ) : categoryId > 0 ? (
                  categories.find((c) => c.id === categoryId)?.name ?? "Danh sách sản phẩm"
                ) : (
                  "Tất cả sản phẩm đang bán"
                )}
              </h1>
              <p className="mt-0.5 text-xs text-muted">
                {smartActive
                  ? `${shownCount} sản phẩm phù hợp, sắp xếp theo mức độ khớp với nhu cầu`
                  : `Hiển thị ${shownCount} sản phẩm đã được Admin kiểm duyệt`}
              </p>
            </div>
            {smartActive && (
              <div className="flex items-center gap-2">
                {user ? (
                  <button
                    type="button"
                    onClick={() => void saveNeed()}
                    disabled={saving}
                    data-testid="save-need-btn"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-primary/40 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {saving ? "Đang lưu..." : "Lưu nhu cầu"}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border px-3 py-2 text-xs font-bold text-muted hover:text-fg"
                  >
                    <Bookmark className="h-3.5 w-3.5" /> Đăng nhập để lưu nhu cầu
                  </Link>
                )}
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold text-muted hover:text-fg"
                >
                  <X className="h-3.5 w-3.5" /> Bỏ tìm kiếm
                </button>
              </div>
            )}
          </div>

          {smartActive && smart && !loading && (
            <div className="mb-4 space-y-2" data-testid="smart-search-status">
              {smart.mode === "semantic" ? (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Tìm theo ý nghĩa mô tả{imageDataUrl ? " và ảnh" : ""}
                </p>
              ) : (
                <p
                  role="alert"
                  data-testid="smart-search-fallback"
                  className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
                  <span>
                    Tìm kiếm thông minh tạm thời không khả dụng (
                    {FALLBACK_REASON_LABEL[smart.fallbackReason ?? ""] ?? "lỗi không xác định"}). Đang hiển thị kết
                    quả theo <strong>từ khóa</strong> — có thể bỏ sót món diễn đạt khác.
                  </span>
                </p>
              )}
              {smart.warnings.map((w) => (
                <p key={w} className="text-xs text-muted">
                  ⓘ {WARNING_LABEL[w] ?? w}
                </p>
              ))}
            </div>
          )}

          {loadError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {loadError}
            </div>
          )}

          {smartActive && !loading && smart && smart.counterfactuals.length > 0 && (
            <div
              data-testid="smart-suggestions"
              className="mb-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4"
            >
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-fg">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Chưa có món đáp ứng đủ mọi điều kiện. Bạn có thể thử:
              </p>
              <ul className="space-y-2">
                {smart.counterfactuals.map((s, i) => (
                  <li key={s.label} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-fg">
                      <strong>{s.label}</strong>
                      <span className="text-muted">
                        {" "}
                        → có ngay {s.unlockedProductIds.length} món, ví dụ “{s.unlockedProducts[0]?.title}”
                      </span>
                    </span>
                    <button
                      type="button"
                      data-testid={`apply-suggestion-${i}`}
                      onClick={() => applySuggestion(s)}
                      className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                    >
                      Áp dụng
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-surface" />
              ))}
            </div>
          ) : shownCount === 0 ? (
            <div className="rounded-2xl border border-border bg-surface py-16 text-center" data-testid="empty-state">
              <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-muted/40" />
              <h3 className="text-base font-bold text-fg">Không tìm thấy sản phẩm nào phù hợp</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted">
                {smartActive && blockedCount > 0
                  ? `Có ${blockedCount} món liên quan nhưng không đáp ứng điều kiện bạn đặt${
                      flexible ? "" : " — bật “Linh hoạt điều kiện” để xem gợi ý"
                    }.`
                  : smartActive
                    ? "Hiện chưa có ai đăng món này. Hãy lưu nhu cầu để không bỏ lỡ khi có người đăng."
                    : "Hãy thử thay đổi bộ lọc hoặc nhấn nút Xóa bộ lọc ở cột bên trái."}
              </p>
            </div>
          ) : smartActive ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="smart-results">
              {smartResults.map((r) => (
                <ProductCard key={r.id} p={r} reasons={r.matchedConditions} warnings={r.unmatchedConditions} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <MainShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="h-96 animate-pulse rounded-2xl bg-surface" />
          </div>
        }
      >
        <ProductsCatalogInner />
      </Suspense>
    </MainShell>
  );
}
