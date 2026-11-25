"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, CheckCircle2, LoaderCircle, Search, Sparkles, XCircle } from "lucide-react";
import { FlowAlert, UserFlowApp, UserFlowLayout } from "@/components/flows/FlowFrame";
import { useMainShell } from "@/components/layout/MainShell";
import {
  FALLBACK_REASON_LABEL,
  closeBuyerRequest,
  getBuyerRequestMatches,
  getMyBuyerRequests,
  type BuyerRequestSummary,
  type SmartSearchResponse,
} from "@/lib/api/smart-search";
import { USE_MOCK } from "@/lib/config";
import { cn } from "@/lib/cn";

const CONDITION_VI: Record<string, string> = {
  new: "Mới 100%",
  like_new: "Như mới",
  used: "Đã qua sử dụng",
  worn: "Cũ",
};
const money = (v: number) => `${new Intl.NumberFormat("vi-VN").format(v)} ₫`;
const dateVi = (v: string) => {
  const d = new Date(v.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("vi-VN");
};
const isExpired = (r: BuyerRequestSummary) => r.status === "open" && new Date(r.expiresAt.replace(" ", "T")) < new Date();

function RequestsContent() {
  const { user, loadingUser } = useMainShell();
  const [requests, setRequests] = useState<BuyerRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [matches, setMatches] = useState<Record<number, SmartSearchResponse | "loading">>({});

  useEffect(() => {
    if (loadingUser || !user || USE_MOCK) return;
    let active = true;
    getMyBuyerRequests()
      .then((rows) => { if (active) setRequests(rows); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được nhu cầu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadingUser, user]);

  async function showMatches(id: number) {
    setMatches((m) => ({ ...m, [id]: "loading" }));
    setError("");
    try {
      const result = await getBuyerRequestMatches(id);
      setMatches((m) => ({ ...m, [id]: result }));
    } catch (cause) {
      setMatches((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      setError(cause instanceof Error ? cause.message : "Không tìm được món phù hợp.");
    }
  }

  async function close(r: BuyerRequestSummary) {
    if (!window.confirm(`Đóng nhu cầu "${r.description}"? Bạn sẽ không nhận gợi ý cho nhu cầu này nữa.`)) return;
    setError("");
    try {
      await closeBuyerRequest(r.id);
      setRequests((rows) => rows.map((x) => (x.id === r.id ? { ...x, status: "closed" } : x)));
      setNotice("Đã đóng nhu cầu.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đóng được nhu cầu.");
    }
  }

  if (USE_MOCK) {
    return <FlowAlert error="Chế độ dữ liệu mẫu không có nhu cầu đã lưu (cần API thật)." />;
  }
  if (!loadingUser && !user) {
    return <FlowAlert error="Đăng nhập để xem nhu cầu đã lưu." />;
  }

  return (
    <div className="space-y-4">
      <FlowAlert error={error} success={notice} />
      {loading ? (
        <p className="py-10 text-center text-sm text-muted">
          <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải...
        </p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted/60" />
          <p className="mt-2 font-bold text-fg">Bạn chưa lưu nhu cầu nào.</p>
          <p className="mt-1 text-sm text-muted">
            Tìm món cần mua ở trang Sản phẩm rồi bấm <strong>“Lưu nhu cầu”</strong> để xem lại gợi ý sau.
          </p>
          <Link href="/products" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            <Search className="h-4 w-4" /> Tìm sản phẩm
          </Link>
        </div>
      ) : (
        requests.map((r) => {
          const expired = isExpired(r);
          const open = r.status === "open" && !expired;
          const m = matches[r.id];
          return (
            <article key={r.id} className={cn("rounded-2xl border border-border bg-surface p-5", !open && "opacity-70")}>
              <div className="flex flex-wrap items-start gap-4">
                {r.hasImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- owner-only API image
                  <img src={`/api/marketplace/requests/${r.id}/image`} alt="Ảnh tham khảo" className="h-16 w-16 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        open ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300",
                      )}
                    >
                      {open ? "Đang mở" : expired ? "Đã hết hạn" : "Đã đóng"}
                    </span>
                    <span className="text-xs text-muted">
                      Lưu ngày {dateVi(r.createdAt)} · hết hạn {dateVi(r.expiresAt)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-extrabold text-fg">{r.description}</h3>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    {r.categoryName && <span>Danh mục: {r.categoryName}</span>}
                    {r.budgetMax !== null && <span>Ngân sách ≤ {money(r.budgetMax)}</span>}
                    {r.minCondition && <span>Tình trạng từ: {CONDITION_VI[r.minCondition] ?? r.minCondition}</span>}
                    {r.buildingName && <span>Gần: {r.buildingName}</span>}
                    <span>{r.allowExchange ? "Nhận trao đổi" : "Chỉ mua"}</span>
                  </p>
                </div>
                {open && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={m === "loading"}
                      onClick={() => void showMatches(r.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {m === "loading" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Xem món phù hợp
                    </button>
                    <button
                      type="button"
                      onClick={() => void close(r)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted hover:text-fg"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Đóng
                    </button>
                  </div>
                )}
              </div>

              {m && m !== "loading" && (
                <div className="mt-4 border-t border-border pt-3">
                  {m.mode === "keyword_fallback" && (
                    <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Đang tìm theo từ khóa ({FALLBACK_REASON_LABEL[m.fallbackReason ?? ""] ?? m.fallbackReason}).
                    </p>
                  )}
                  {m.results.length === 0 ? (
                    <p className="text-sm text-muted">
                      Chưa có món nào phù hợp.{m.counterfactuals[0] ? ` Gợi ý: ${m.counterfactuals[0].label}.` : ""}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {m.results.slice(0, 5).map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                          <Link href={`/products/${p.id}`} className="min-w-0 flex-1 font-bold text-fg hover:text-primary">
                            {p.title}
                          </Link>
                          <span className="text-xs text-muted">
                            {p.sellerName}
                            {p.sellerBuildingName ? ` · ${p.sellerBuildingName}` : ""}
                          </span>
                          <span className="font-black text-primary">{p.price === null ? "Trao đổi" : money(p.price)}</span>
                          {p.fullyMatches && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Đủ điều kiện
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}

export default function MyRequestsPage() {
  return (
    <UserFlowApp>
      <UserFlowLayout
        title="Nhu cầu đã lưu"
        description="Những món bạn đang tìm mua. Bấm “Xem món phù hợp” để AI đối chiếu lại với các tin đang bán."
      >
        <RequestsContent />
      </UserFlowLayout>
    </UserFlowApp>
  );
}
