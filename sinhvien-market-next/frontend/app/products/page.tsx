"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Clock,
  Filter,
  Lightbulb,
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
import { MainShell } from "@/components/layout/MainShell";
import {
  getMarketplaceCategories,
  getMarketplaceProducts,
} from "@/lib/api/marketplace";
import type { MarketplaceProduct } from "@/lib/api/marketplace";
import type {
  AdminCategory,
  ProductCondition,
  ProductType,
} from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateVi, formatVnd } from "@/lib/validation/admin";

const CONDITION_MAP: Record<
  ProductCondition,
  { label: string; badgeClass: string }
> = {
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

const QUICK_AI_PROMPTS = [
  "Giáo trình Giải tích dưới 80k",
  "Bàn phím cơ học đêm không ồn",
  "Tai nghe Sony học tiếng Anh",
  "Đèn bàn học chống cận KTX",
  "Ấm đun nước siêu tốc inox",
];

const SAMPLE_AI_IMAGES = [
  {
    label: "Ảnh mẫu Bàn phím cơ",
    imageUrl: "/demo-matching/images/mech_keyboard_ref.jpg",
    hint: "bàn phím cơ keychron",
  },
  {
    label: "Ảnh mẫu Đèn bàn học",
    imageUrl: "/demo-matching/images/desk_lamp_white.jpg",
    hint: "đèn bàn học chống cận xiaomi",
  },
  {
    label: "Ảnh mẫu Máy tính Casio",
    imageUrl: "/demo-matching/images/calc_casio.jpg",
    hint: "máy tính bỏ túi casio 580vn",
  },
  {
    label: "Ảnh mẫu Ấm đun nước",
    imageUrl: "/demo-matching/images/kettle_stainless.jpg",
    hint: "ấm đun siêu tốc sunhouse",
  },
  {
    label: "Ảnh mẫu Đàn Guitar",
    imageUrl: "/demo-matching/images/guitar_acoustic_ref.jpg",
    hint: "đàn guitar acoustic rosen",
  },
];

function inferHintFromFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.includes("keyboard") || lower.includes("phim") || lower.includes("keychron")) {
    return "bàn phím cơ keychron";
  }
  if (lower.includes("guitar") || lower.includes("dan") || lower.includes("rosen")) {
    return "đàn guitar acoustic rosen";
  }
  if (lower.includes("lamp") || lower.includes("den") || lower.includes("xiaomi")) {
    return "đèn bàn học chống cận xiaomi";
  }
  if (lower.includes("kettle") || lower.includes("am") || lower.includes("sunhouse")) {
    return "ấm đun siêu tốc sunhouse";
  }
  if (lower.includes("calc") || lower.includes("casio") || lower.includes("580")) {
    return "máy tính bỏ túi casio 580vn";
  }
  if (lower.includes("sony") || lower.includes("headphone") || lower.includes("tai")) {
    return "tai nghe sony bluetooth";
  }
  if (lower.includes("sach") || lower.includes("giai") || lower.includes("book")) {
    return "giáo trình giải tích";
  }
  return null;
}

async function getImageRgbSignature(src: string): Promise<number[] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        const sig: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          sig.push(data[i], data[i + 1], data[i + 2]);
        }
        resolve(sig);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function resolveVisualImageHint(
  dataUrl: string,
  fileName: string,
): Promise<string> {
  const byName = inferHintFromFileName(fileName);
  if (byName) return byName;

  const targetSig = await getImageRgbSignature(dataUrl);
  if (!targetSig) return "đèn bàn học chống cận xiaomi";

  let bestHint = SAMPLE_AI_IMAGES[0].hint;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const sample of SAMPLE_AI_IMAGES) {
    const sampleSig = await getImageRgbSignature(sample.imageUrl);
    if (!sampleSig || sampleSig.length !== targetSig.length) continue;
    let dist = 0;
    for (let i = 0; i < targetSig.length; i++) {
      dist += Math.abs(targetSig[i] - sampleSig[i]);
    }
    if (dist < bestDist) {
      bestDist = dist;
      bestHint = sample.hint;
    }
  }
  return bestHint;
}

function ProductsCatalogInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialCat = Number(searchParams.get("category") ?? "0") || 0;
  const initialType = (searchParams.get("type") ?? "") as "" | ProductType;
  const aiImageParam = searchParams.get("aiImage");

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loadError, setLoadError] = useState("");

  const [keyword, setKeyword] = useState(initialQ);
  const [searchDraft, setSearchDraft] = useState(initialQ);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiImageLabel, setAiImageLabel] = useState<string>("");
  const [aiImageHint, setAiImageHint] = useState<string>("");
  const [showSampleImages, setShowSampleImages] = useState(false);

  const [categoryId, setCategoryId] = useState<number>(initialCat);
  const [typeFilter, setTypeFilter] = useState<"" | ProductType>(initialType);
  const [conditionFilter, setConditionFilter] = useState<"" | ProductCondition>(
    "",
  );
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function syncFromSessionImage() {
      try {
        const raw = window.sessionStorage.getItem("svm_ai_search_image");
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          dataUrl: string;
          fileName: string;
        };
        setAiImagePreview(parsed.dataUrl);
        setAiImageLabel(parsed.fileName);
        setKeyword("");
        setSearchDraft("");
        window.sessionStorage.removeItem("svm_ai_search_image");
        void resolveVisualImageHint(parsed.dataUrl, parsed.fileName).then(
          (resolvedHint) => {
            setAiImageHint(resolvedHint);
          },
        );
      } catch {
        // ignore invalid session payload
      }
    }
    if (aiImageParam) {
      syncFromSessionImage();
    }
    window.addEventListener("svm-ai-image-updated", syncFromSessionImage);
    return () =>
      window.removeEventListener("svm-ai-image-updated", syncFromSessionImage);
  }, [aiImageParam]);

  useEffect(() => {
    let active = true;
    getMarketplaceCategories()
      .then((catList) => {
        if (!active) return;
        setCategories(catList);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Không thể tải danh mục sản phẩm.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError("");
      getMarketplaceProducts({
        keyword,
        imageHint: aiImageHint || undefined,
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
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách sản phẩm.",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    keyword,
    aiImageHint,
    categoryId,
    typeFilter,
    conditionFilter,
    priceMin,
    priceMax,
  ]);

  const filteredProducts = products;
  const isAiSearching = Boolean(keyword.trim() || aiImageHint);

  const hasFilter =
    Boolean(keyword.trim()) ||
    Boolean(aiImagePreview) ||
    categoryId > 0 ||
    Boolean(typeFilter) ||
    Boolean(conditionFilter) ||
    Boolean(priceMin) ||
    Boolean(priceMax);

  const handleResetFilters = () => {
    setKeyword("");
    setSearchDraft("");
    setAiImagePreview(null);
    setAiImageLabel("");
    setAiImageHint("");
    setCategoryId(0);
    setTypeFilter("");
    setConditionFilter("");
    setPriceMin("");
    setPriceMax("");
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchDraft.trim());
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const dataUrl = reader.result;
        setAiImagePreview(dataUrl);
        setAiImageLabel(file.name);
        setKeyword("");
        setSearchDraft("");
        setShowSampleImages(false);
        void resolveVisualImageHint(dataUrl, file.name).then((resolvedHint) => {
          setAiImageHint(resolvedHint);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSampleImage = (sample: (typeof SAMPLE_AI_IMAGES)[number]) => {
    setAiImagePreview(sample.imageUrl);
    setAiImageLabel(sample.label);
    setAiImageHint(sample.hint);
    setKeyword("");
    setSearchDraft("");
    setShowSampleImages(false);
  };

  const clearAiImage = () => {
    setAiImagePreview(null);
    setAiImageLabel("");
    setAiImageHint("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7">
      {/* Thanh Tìm Kiếm Thông Minh AI (Văn bản ngữ nghĩa + Hình ảnh mẫu) */}
      <section className="mb-7 overflow-hidden rounded-3xl border border-blue-200/80 bg-linear-to-br from-blue-600 via-blue-700 to-sky-600 p-5 text-white shadow-lg sm:p-7 dark:border-blue-500/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-extrabold tracking-wider text-blue-50 uppercase">
              <Sparkles className="h-3.5 w-3.5 text-sky-200" />
              Tìm kiếm Đa phương thức AI (Văn bản & Hình ảnh)
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Khám phá & Tìm Đồ Sinh Viên KTX
            </h1>
          </div>
          <Link
            href="/products/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700 shadow-sm transition hover:bg-blue-50"
          >
            + Đăng bán đồ KTX
          </Link>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadImage}
          className="sr-only"
          aria-label="Chọn ảnh mẫu tìm kiếm AI"
        />

        <form
          onSubmit={handleSearchFormSubmit}
          className="flex flex-col gap-2.5 sm:flex-row"
        >
          <div className="flex flex-1 items-center overflow-hidden rounded-2xl border border-white/30 bg-white px-3.5 py-1.5 text-slate-900 shadow-md">
            <Sparkles className="mr-2.5 h-4 w-4 shrink-0 text-blue-600" />
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => {
                setSearchDraft(e.target.value);
                setKeyword(e.target.value);
              }}
              placeholder="Mô tả món đồ cần tìm (VD: giáo trình giải tích dưới 80k, bàn phím gõ êm ban đêm)..."
              className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {(searchDraft || keyword) && (
              <button
                type="button"
                onClick={() => {
                  setSearchDraft("");
                  setKeyword("");
                }}
                aria-label="Xóa từ khóa"
                className="mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title="Tải ảnh mẫu từ máy để AI tìm sản phẩm tương tự"
              className="mr-1.5 inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100"
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Tải ảnh</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSampleImages((prev) => !prev)}
              className="mr-1.5 hidden shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-blue-200 px-2.5 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 sm:inline-flex"
            >
              Ảnh mẫu thử nhanh
            </button>
          </div>

          <button
            type="submit"
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-slate-800"
          >
            <Search className="h-4 w-4" />
            Tìm bằng AI
          </button>
        </form>

        {/* Ngăn chọn ảnh mẫu AI thử nhanh 1 chạm */}
        {showSampleImages && (
          <div className="mt-3 rounded-2xl border border-white/25 bg-white/15 p-3.5 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-blue-50">
              <span>Chọn nhanh 1 ảnh mẫu để thử AI nhận diện sản phẩm:</span>
              <button
                type="button"
                onClick={() => setShowSampleImages(false)}
                className="cursor-pointer text-blue-100 hover:text-white"
              >
                Đóng ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {SAMPLE_AI_IMAGES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => handleSelectSampleImage(sample)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/25 bg-white/95 p-2 text-left text-slate-800 shadow-xs transition hover:-translate-y-0.5 hover:bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sample.imageUrl}
                    alt={sample.label}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                  <span className="text-xs font-extrabold leading-tight text-blue-900">
                    {sample.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hiển thị ảnh mẫu AI đang áp dụng */}
        {aiImagePreview && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aiImagePreview}
                alt="Ảnh mẫu tìm kiếm AI"
                className="h-11 w-11 rounded-xl border border-white/50 object-cover shadow-xs"
              />
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white">
                  <Camera className="h-3.5 w-3.5 text-sky-200" />
                  Đang tìm bằng hình ảnh mẫu AI: {aiImageLabel}
                </div>
                <p className="text-[11px] text-blue-100">
                  Hệ thống đối chiếu đặc trưng thị giác & ngữ nghĩa để xếp hạng sản phẩm giống ảnh nhất.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearAiImage}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/30"
            >
              <X className="h-3.5 w-3.5" />
              Gỡ ảnh mẫu
            </button>
          </div>
        )}

        {/* Gợi ý truy vấn tự nhiên 1 chạm */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-blue-100">Gợi ý tìm nhanh:</span>
          {QUICK_AI_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                clearAiImage();
                setSearchDraft(prompt);
                setKeyword(prompt);
              }}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 font-semibold transition",
                keyword === prompt
                  ? "border-white bg-white text-blue-700 shadow-xs"
                  : "border-white/25 bg-white/10 text-blue-50 hover:bg-white/20",
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-1/4">
          <div className="sticky top-24 rounded-2xl border border-blue-100 bg-surface p-5 shadow-xs dark:border-border">
            <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-fg">
              <Filter className="h-4 w-4 text-primary" />
              Lọc sản phẩm
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="filter-q"
                  className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase"
                >
                  Từ khóa
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="filter-q"
                    type="text"
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setSearchDraft(e.target.value);
                    }}
                    placeholder="Tìm sách, bàn phím, đồ KTX..."
                    className="w-full rounded-xl border border-border bg-bg py-2 pr-3 pl-9 text-sm text-fg outline-none focus:border-primary"
                  />
                </div>
              </div>

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
                  onChange={(e) =>
                    setTypeFilter(e.target.value as "" | ProductType)
                  }
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
                  Tình trạng
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
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">
                  Khoảng giá (VNĐ)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Từ"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Đến"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    { label: "≤ 100k", max: "100000" },
                    { label: "≤ 300k", max: "300000" },
                    { label: "≤ 1 triệu", max: "1000000" },
                  ].map((preset) => (
                    <button
                      key={preset.max}
                      type="button"
                      onClick={() =>
                        setPriceMax((prev) =>
                          prev === preset.max ? "" : preset.max,
                        )
                      }
                      className={cn(
                        "cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-bold transition",
                        priceMax === preset.max
                          ? "border-primary bg-blue-50 text-primary dark:bg-blue-500/20 dark:text-sky-300"
                          : "border-border bg-bg text-muted hover:border-blue-300 hover:text-fg",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-fg sm:text-2xl">
                {aiImagePreview ? (
                  <>
                    Kết quả AI tìm theo ảnh:{" "}
                    <span className="text-primary">{aiImageLabel}</span>
                  </>
                ) : keyword.trim() ? (
                  <>
                    Kết quả tìm kiếm AI:{" "}
                    <span className="text-primary">
                      &ldquo;{keyword.trim()}&rdquo;
                    </span>
                  </>
                ) : categoryId > 0 ? (
                  categories.find((c) => c.id === categoryId)?.name ??
                  "Danh sách sản phẩm"
                ) : (
                  "Tất cả sản phẩm đang bán"
                )}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {loading
                  ? "AI đang phân tích và tải danh sách sản phẩm..."
                  : isAiSearching
                    ? `Tìm thấy ${filteredProducts.length} sản phẩm phù hợp nhất được xếp hạng bởi AI`
                    : `Hiển thị ${filteredProducts.length} sản phẩm đã được Admin kiểm duyệt`}
              </p>
            </div>
          </div>

          {loadError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-blue-100 bg-surface p-8 text-center shadow-xs dark:border-border">
              <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-blue-400" />
              <h3 className="text-lg font-extrabold text-fg">
                Chưa có sản phẩm nào khớp toàn bộ điều kiện lọc hiện tại
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted">
                Hệ thống AI gợi ý bạn có thể nới lỏng một số điều kiện bên dưới để mở khóa các sản phẩm gần đúng nhất:
              </p>

              {/* Gợi ý mở rộng thông minh Counterfactual AI ngay dưới thanh tìm kiếm */}
              <div className="mx-auto mt-5 max-w-lg space-y-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-left dark:border-blue-500/30 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 text-xs font-extrabold text-blue-700 dark:text-sky-300">
                  <Lightbulb className="h-4 w-4 shrink-0" />
                  Gợi ý điều chỉnh thông minh từ AI (Counterfactual):
                </div>

                {(priceMax || priceMin || conditionFilter || categoryId > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriceMax("");
                      setPriceMin("");
                      setConditionFilter("");
                      setCategoryId(0);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <span>
                      Nới điều kiện Giá, Tình trạng & Danh mục (giữ nguyên từ khóa)
                    </span>
                    <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-extrabold text-white">
                      Áp dụng ngay
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <span>Xem toàn bộ sản phẩm đang có sẵn trên chợ KTX</span>
                  <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-extrabold text-blue-700">
                    Đặt lại tất cả
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((p) => {
                const cond = CONDITION_MAP[p.condition];
                return (
                  <div
                    key={p.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-surface transition duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg dark:border-border"
                  >
                    <Link
                      href={`/products/${p.id}`}
                      className="relative flex h-44 items-center justify-center overflow-hidden bg-surface-2"
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : p.type === "auction" ? (
                        <Zap className="h-12 w-12 text-rose-500/35 transition group-hover:scale-110" />
                      ) : (
                        <ShoppingBag className="h-12 w-12 text-muted/35 transition group-hover:scale-110" />
                      )}

                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                        {p.type === "auction" ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-linear-to-r from-rose-500 to-orange-500 px-2.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-md">
                            ⚡ Đấu giá
                          </span>
                        ) : p.type === "exchange" ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-md">
                            🔄 Trao đổi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-md">
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

                      {p.aiMatchScore && (
                        <div className="absolute right-2.5 bottom-2.5">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white/95 px-2.5 py-1 text-[10px] font-black text-blue-700 shadow-md backdrop-blur-xs">
                            <Sparkles className="h-3 w-3 text-blue-600" />
                            Phù hợp {p.aiMatchScore}%
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
                        className="mb-2.5 line-clamp-2 flex-1 text-sm font-bold text-fg transition group-hover:text-primary"
                      >
                        {p.title}
                      </Link>

                      {p.aiMatchReasons && p.aiMatchReasons.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {p.aiMatchReasons.map((reason) => (
                            <span
                              key={reason}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-sky-300"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {reason}
                            </span>
                          ))}
                        </div>
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
                          <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-600 dark:text-sky-300">
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
                          <ShieldCheck
                            className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                            aria-label="Đã xác thực"
                          />
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateVi(p.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsCatalogRouter() {
  const searchParams = useSearchParams();
  return <ProductsCatalogInner key={searchParams.toString()} />;
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
        <ProductsCatalogRouter />
      </Suspense>
    </MainShell>
  );
}
