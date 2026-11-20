"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { MainShell } from "@/components/layout/MainShell";
import { getMarketplaceCategories } from "@/lib/api/marketplace";
import {
  searchMarketplaceMatching,
  type MatchingProduct,
  type MatchingResult,
} from "@/lib/api/marketplace-matching";
import type { AdminCategory } from "@/lib/types/admin";
import { cn } from "@/lib/cn";

const CONDITION_LABELS: Record<string, { label: string; cls: string }> = {
  new: {
    label: "Mới 100%",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  like_new: {
    label: "Như mới (90%+)",
    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  used: {
    label: "Đã qua sử dụng",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  worn: {
    label: "Cũ / Dùng tạm",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
};

const TYPE_LABELS: Record<string, string> = {
  sale: "Đăng bán",
  exchange: "Nhận đổi đồ",
  auction: "Đấu giá ngược",
};

const QUICK_SUGGESTIONS = [
  "Giáo trình Giải tích",
  "Bàn phím cơ Keychron",
  "Tai nghe Sony học online",
  "Đàn Guitar Acoustic",
  "Đèn bàn học chống cận",
];

function MarketplaceMatchingContent() {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [filters, setFilters] = useState({
    categoryId: "",
    priceMin: "",
    priceMax: "",
    condition: "",
    type: "",
  });
  const [result, setResult] = useState<MatchingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMarketplaceCategories()
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => {
        if (active) setCategories([]);
      });

    // Tải sẵn danh sách gợi ý mặc định để trang không bị trống khi mới mở
    searchMarketplaceMatching("giáo trình tai nghe guitar đèn bàn ấm đun")
      .then((res) => {
        if (active) setResult(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function runSearch(
    nextQuery: string,
    nextFilters = filters,
  ) {
    setLoading(true);
    setError("");
    try {
      const res = await searchMarketplaceMatching(nextQuery, {
        categoryId: nextFilters.categoryId
          ? Number(nextFilters.categoryId)
          : undefined,
        priceMin: nextFilters.priceMin
          ? Number(nextFilters.priceMin)
          : undefined,
        priceMax: nextFilters.priceMax
          ? Number(nextFilters.priceMax)
          : undefined,
        condition: nextFilters.condition || undefined,
        type: nextFilters.type || undefined,
      });
      setResult(res);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tìm được sản phẩm.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query, filters);
  }

  function handleReset() {
    const cleared = {
      categoryId: "",
      priceMin: "",
      priceMax: "",
      condition: "",
      type: "",
    };
    setQuery("");
    setFilters(cleared);
    void runSearch("giáo trình tai nghe guitar đèn bàn ấm đun", cleared);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="relative mb-7 overflow-hidden rounded-3xl border border-blue-200/80 bg-linear-to-br from-blue-600 via-blue-700 to-sky-600 p-6 text-white shadow-lg sm:p-8 dark:border-blue-500/30">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-extrabold tracking-wide text-blue-50 uppercase">
              <Search className="h-3.5 w-3.5 text-sky-200" />
              Tra cứu & Ghép nối nhanh trên sàn
            </div>
            <h1 className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl">
              Tìm sản phẩm phù hợp theo nhu cầu
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-blue-50/90">
              Nhập mô tả món đồ bạn đang tìm kèm ngân sách và tình trạng mong muốn để lọc nhanh các tin đang bán và chấm điểm độ khớp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/requests"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700 shadow-md transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              Sang Ghép nối AI Đa phương thức (Có ảnh mẫu)
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/25 bg-white/15 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/25"
            >
              Danh mục sản phẩm
            </Link>
          </div>
        </div>
      </div>

      <form
        onSubmit={search}
        className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              required
              minLength={2}
              maxLength={500}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mô tả món đồ bạn cần tìm (VD: giáo trình giải tích, tai nghe học online, đèn bàn học KTX)..."
              className="w-full rounded-2xl border border-border bg-bg py-3 pr-4 pl-11 text-sm font-medium text-fg transition focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {loading ? "Đang tìm..." : "Tìm sản phẩm"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted">Gợi ý tìm nhanh:</span>
          {QUICK_SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setQuery(item);
                void runSearch(item, filters);
              }}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition",
                query === item
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-bg text-muted hover:border-primary/40 hover:text-fg",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-xs font-bold text-muted">
            Danh mục sản phẩm
            <select
              aria-label="Danh mục"
              value={filters.categoryId}
              onChange={(event) =>
                setFilters({ ...filters, categoryId: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-medium text-fg focus:border-primary focus:outline-none"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-muted">
            Giá từ (VNĐ)
            <input
              aria-label="Giá thấp nhất"
              type="number"
              min="0"
              step="10000"
              placeholder="VD: 50.000"
              value={filters.priceMin}
              onChange={(event) =>
                setFilters({ ...filters, priceMin: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-medium text-fg focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-xs font-bold text-muted">
            Giá tối đa (VNĐ)
            <input
              aria-label="Giá cao nhất"
              type="number"
              min="0"
              step="10000"
              placeholder="VD: 500.000"
              value={filters.priceMax}
              onChange={(event) =>
                setFilters({ ...filters, priceMax: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-medium text-fg focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-xs font-bold text-muted">
            Tình trạng món đồ
            <select
              aria-label="Tình trạng"
              value={filters.condition}
              onChange={(event) =>
                setFilters({ ...filters, condition: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-medium text-fg focus:border-primary focus:outline-none"
            >
              <option value="">Mọi tình trạng</option>
              <option value="new">Mới 100%</option>
              <option value="like_new">Như mới (90%+)</option>
              <option value="used">Đã qua sử dụng</option>
              <option value="worn">Cũ / Dùng tạm</option>
            </select>
          </label>

          <label className="block text-xs font-bold text-muted">
            Hình thức giao dịch
            <select
              aria-label="Loại tin"
              value={filters.type}
              onChange={(event) =>
                setFilters({ ...filters, type: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-medium text-fg focus:border-primary focus:outline-none"
            >
              <option value="">Mọi hình thức</option>
              <option value="sale">Đăng bán</option>
              <option value="exchange">Trao đổi đồ</option>
              <option value="auction">Đấu giá ngược</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Hệ thống đối chiếu từ khóa mô tả kết hợp lọc danh mục, tình trạng và ngân sách.
          </span>
          {(query ||
            filters.categoryId ||
            filters.priceMin ||
            filters.priceMax ||
            filters.condition ||
            filters.type) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex cursor-pointer items-center gap-1 font-bold text-rose-500 hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {result && (
        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-fg">
               Sản phẩm gợi ý ({result.results.length})
            </h2>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
              Xếp hạng theo độ khớp tiêu chí
            </span>
          </div>

          {result.results.length === 0 ? (
            <div className="rounded-3xl border border-border bg-surface p-10 text-center">
              <Search className="mx-auto h-10 w-10 text-muted" />
              <h3 className="mt-3 text-base font-extrabold text-fg">
                Chưa có sản phẩm khớp bộ lọc hiện tại
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Hãy thử nới khoảng giá, bỏ bớt điều kiện lọc hoặc đăng tin tại mục Ghép nối AI để hệ thống tự báo khi có người bán.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="cursor-pointer rounded-xl border border-border px-4 py-2 text-xs font-bold text-fg hover:bg-surface-2"
                >
                  Xem lại toàn bộ gợi ý
                </button>
                <Link
                  href="/requests"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
                >
                  Đăng tin Cần mua (AI)
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.results.map((product: MatchingProduct) => {
                const cond = CONDITION_LABELS[product.condition] ?? {
                  label: product.condition,
                  cls: "bg-surface-2 text-muted",
                };
                return (
                  <article
                    key={product.id}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-300">
                          <Tag className="h-3 w-3" />
                          {product.categoryName}
                        </span>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-300">
                          Độ khớp {Math.round(product.matchScore * 100)}%
                        </span>
                      </div>

                      <h3 className="mt-3 line-clamp-2 text-base font-extrabold text-fg group-hover:text-primary">
                        {product.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                        {product.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[11px] font-bold",
                            cond.cls,
                          )}
                        >
                          {cond.label}
                        </span>
                        <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                          {TYPE_LABELS[product.type] ?? product.type}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-base font-black text-primary">
                            {product.price === null
                              ? "Trao đổi thỏa thuận"
                              : `${new Intl.NumberFormat("vi-VN").format(product.price)} ₫`}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                            <span>{product.sellerName}</span>
                            {product.sellerVerified && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-extrabold text-primary transition hover:bg-primary hover:text-white"
                        >
                          Xem chi tiết
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <p className="mt-2 rounded-lg bg-bg px-2.5 py-1.5 text-[11px] text-muted">
                        ✨ {product.matchReason}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default function MarketplaceMatchingPage() {
  return (
    <MainShell>
      <MarketplaceMatchingContent />
    </MainShell>
  );
}
