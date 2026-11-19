"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MainShell } from "@/components/layout/MainShell";
import { searchMarketplaceMatching, type MatchingResult } from "@/lib/api/marketplace-matching";

function MarketplaceMatchingContent() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    categoryId: "", priceMin: "", priceMax: "", condition: "", type: "",
  });
  const [result, setResult] = useState<MatchingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      setResult(await searchMarketplaceMatching(query, {
        categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
        priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
        priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
        condition: filters.condition || undefined,
        type: filters.type || undefined,
      }));
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tìm được sản phẩm."); }
    finally { setLoading(false); }
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-3"><div><p className="text-sm text-muted">Marketplace</p><h1 className="text-3xl font-black text-fg">Tìm sản phẩm phù hợp</h1></div><Link href="/products" className="text-sm font-semibold text-primary">Tìm kiếm thông thường</Link></div>
      <form onSubmit={search} className="grid gap-3 rounded-2xl border border-border p-5 sm:grid-cols-[1fr_auto]">
        <input required minLength={2} maxLength={500} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mô tả mặt hàng bạn cần..." className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-4 py-3 text-fg" />
        <button disabled={loading} className="rounded-xl bg-primary px-6 py-3 font-bold text-white disabled:opacity-50">{loading ? "Đang tìm..." : "Tìm sản phẩm"}</button>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-5">
          <input aria-label="ID danh mục" type="number" min="1" placeholder="ID danh mục" value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <input aria-label="Giá thấp nhất" type="number" min="0" placeholder="Giá từ" value={filters.priceMin} onChange={(event) => setFilters({ ...filters, priceMin: event.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <input aria-label="Giá cao nhất" type="number" min="0" placeholder="Giá đến" value={filters.priceMax} onChange={(event) => setFilters({ ...filters, priceMax: event.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <select aria-label="Tình trạng" value={filters.condition} onChange={(event) => setFilters({ ...filters, condition: event.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm">
            <option value="">Mọi tình trạng</option><option value="new">Mới</option><option value="like_new">Như mới</option><option value="used">Đã dùng</option><option value="worn">Cũ</option>
          </select>
          <select aria-label="Loại tin" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm">
            <option value="">Mọi loại tin</option><option value="sale">Bán</option><option value="exchange">Trao đổi</option><option value="auction">Đấu giá</option>
          </select>
        </div>
      </form>
      <p className="mt-3 text-xs text-muted">Kết quả hiện dùng baseline từ khóa cục bộ (feature hashing + cosine), chưa phải mô hình ngữ nghĩa được huấn luyện.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {result && <section className="mt-6">
        <p className="mb-3 text-sm text-muted">{result.results.length} kết quả · {result.modelKey}</p>
        {result.results.length === 0 && <p className="rounded-xl border border-border p-5">Chưa có sản phẩm phù hợp.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.results.map((product) => <article key={product.id} className="flex flex-col rounded-2xl border border-border p-5">
            <div className="flex justify-between gap-3"><span className="text-xs text-muted">{product.categoryName} · {product.condition}</span><span className="text-xs font-bold text-primary">{Math.round(product.matchScore * 100)}%</span></div>
            <h2 className="mt-3 font-bold text-fg">{product.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-muted">{product.description}</p>
            <p className="mt-3 text-sm">{product.price === null ? product.type : `${new Intl.NumberFormat("vi-VN").format(product.price)} ₫`}</p>
            <p className="mt-1 text-xs text-muted">{product.matchReason}</p>
            <Link href={`/products/${product.id}`} className="mt-4 inline-flex justify-center rounded-lg border border-border px-3 py-2 text-sm font-semibold">Xem sản phẩm</Link>
          </article>)}
        </div>
      </section>}
    </div>
  );
}
export default function MarketplaceMatchingPage() {
  return <MainShell><MarketplaceMatchingContent /></MainShell>;
}
