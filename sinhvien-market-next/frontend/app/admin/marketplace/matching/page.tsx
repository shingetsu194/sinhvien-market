"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, Database, FlaskConical, LoaderCircle, Search } from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { adminInputClass, adminLabelClass } from "@/components/admin/Modal";
import {
  compareMatchingModels,
  getMatchingEvaluations,
  indexMarketplaceProducts,
  type MatchingEvaluation,
  type ModelComparison,
} from "@/lib/api/marketplace-matching";
import { FALLBACK_REASON_LABEL } from "@/lib/api/smart-search";
import { cn } from "@/lib/cn";

const CARD =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900";

const VARIANT_NOTE: Record<string, string> = {
  legacy: "Mô hình cũ của trang Ghép nối: băm từ khóa + cosine.",
  bm25: "Chỉ so khớp từ khóa tiếng Việt (bỏ dấu, bỏ từ dừng). Dùng khi Gemini không khả dụng.",
  gemini_text: "Chỉ dùng vector Gemini của tiêu đề + mô tả (ablation: bỏ BM25).",
  hybrid: "Cách sinh viên đang dùng ở trang Sản phẩm: Gemini + BM25 + kênh ảnh.",
};

function formatMetric(value: number | string) {
  return Number(value).toFixed(2);
}

function parseIds(raw: string): number[] | null {
  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  const ids = parts.map((part) => Number(part));
  return ids.every((id) => Number.isSafeInteger(id) && id > 0) ? Array.from(new Set(ids)) : null;
}

function ModelComparisonContent() {
  const { showToast } = useAdminShell();
  const [query, setQuery] = useState("");
  const [relevantRaw, setRelevantRaw] = useState("");
  const [comparison, setComparison] = useState<ModelComparison | null>(null);
  const [evaluations, setEvaluations] = useState<MatchingEvaluation[]>([]);
  const [running, setRunning] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setEvaluations(await getMatchingEvaluations());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được lịch sử đánh giá.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMatchingEvaluations()
      .then((rows) => { if (active) setEvaluations(rows); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được lịch sử đánh giá.");
      });
    return () => { active = false; };
  }, []);

  async function runComparison(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const relevant = relevantRaw.trim() === "" ? [] : parseIds(relevantRaw);
    if (relevant === null) {
      setError("ID liên quan phải là các số nguyên dương, cách nhau bởi dấu phẩy.");
      return;
    }
    setRunning(true);
    setError("");
    try {
      setComparison(await compareMatchingModels(query.trim(), relevant));
      if (relevant.length > 0) {
        showToast("Đã tính và lưu chỉ số cho từng mô hình.", "success");
        await loadHistory();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "So sánh thất bại.");
    } finally {
      setRunning(false);
    }
  }

  async function reindex() {
    setIndexing(true);
    setError("");
    try {
      const result = await indexMarketplaceProducts();
      showToast(
        result.gemini.mode === "semantic"
          ? `Đã cập nhật vector Gemini: ${result.gemini.indexed} mới, ${result.gemini.missing} còn thiếu / ${result.gemini.candidates} tin.`
          : "Gemini chưa được cấu hình: chỉ cập nhật chỉ mục cục bộ.",
        result.gemini.mode === "semantic" ? "success" : "warning",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lập chỉ mục thất bại.");
    } finally {
      setIndexing(false);
    }
  }

  const relevantSet = new Set(comparison?.relevantProductIds ?? []);

  return (
    <div className="space-y-6">
      <div className={cn(CARD, "flex flex-wrap items-start justify-between gap-4")}>
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-lg font-black text-fg">
            <FlaskConical className="h-5 w-5 text-primary" />
            So sánh mô hình tìm kiếm
          </h2>
          <p className="mt-1 text-sm text-muted">
            Chạy cùng một truy vấn qua 4 mô hình trên dữ liệu thật để xem mô hình nào xếp hạng đúng hơn.
            Nhập thêm ID các sản phẩm thật sự phù hợp để tính P@5, Recall@5, MRR@5, NDCG@5 và lưu vào lịch sử.
            Sinh viên không thấy trang này; họ luôn dùng mô hình &quot;Gemini + BM25&quot;.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reindex()}
          disabled={indexing}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-bold text-fg transition hover:border-primary disabled:opacity-50"
        >
          {indexing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Cập nhật vector sản phẩm
        </button>
      </div>

      <form onSubmit={runComparison} className={cn(CARD, "grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end")}>
        <label className="block">
          <span className={adminLabelClass}>Truy vấn (như sinh viên gõ)</span>
          <input
            required
            minLength={2}
            maxLength={500}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="vd: nồi nấu cơm cho 1 người"
            className={adminInputClass}
          />
        </label>
        <label className="block">
          <span className={adminLabelClass}>ID sản phẩm phù hợp (không bắt buộc)</span>
          <input
            value={relevantRaw}
            onChange={(event) => setRelevantRaw(event.target.value)}
            placeholder="vd: 12, 27"
            className={adminInputClass}
          />
        </label>
        <button
          disabled={running}
          className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-white disabled:opacity-50"
        >
          {running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          So sánh
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {comparison && (
        <section aria-live="polite" className="space-y-3">
          {!comparison.semanticAvailable && (
            <p className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Gemini không khả dụng ({FALLBACK_REASON_LABEL[comparison.fallbackReason ?? ""] ?? comparison.fallbackReason}):
              chỉ hiển thị 2 mô hình cục bộ.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {comparison.variants.map((variant) => (
              <article
                key={variant.key}
                className={cn(CARD, "flex flex-col p-4", variant.key === "hybrid" && "ring-2 ring-primary/50")}
              >
                <h3 className="font-black text-fg">{variant.label}</h3>
                <p className="mt-1 text-xs text-muted">{VARIANT_NOTE[variant.key]}</p>
                <p className="mt-2 text-[11px] font-semibold text-muted">
                  {variant.modelKey} · {variant.latencyMs} ms
                </p>
                {variant.metrics && (
                  <dl className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-bg p-2 text-center text-xs">
                    {([
                      ["P@5", variant.metrics.precisionAt5],
                      ["R@5", variant.metrics.recallAt5],
                      ["MRR", variant.metrics.mrrAt5],
                      ["NDCG", variant.metrics.ndcgAt5],
                    ] as const).map(([name, value]) => (
                      <div key={name}>
                        <dt className="font-bold text-muted">{name}</dt>
                        <dd className="font-black text-fg">{formatMetric(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <ol className="mt-3 space-y-1.5 text-sm">
                  {variant.results.length === 0 && <li className="text-muted">Không có kết quả.</li>}
                  {variant.results.map((item, index) => (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-2 py-1",
                        relevantSet.has(item.id) && "bg-emerald-50 dark:bg-emerald-500/10",
                      )}
                    >
                      <span className="w-5 shrink-0 text-right font-bold text-muted">{index + 1}.</span>
                      <Link href={`/products/${item.id}`} target="_blank" className="min-w-0 flex-1 hover:text-primary">
                        <span className="font-semibold text-fg">{item.title}</span>
                        <span className="ml-1 text-xs text-muted">#{item.id}</span>
                      </Link>
                      <span className="shrink-0 font-mono text-xs text-muted">{item.score.toFixed(3)}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          {relevantSet.size > 0 && (
            <p className="text-xs text-muted">Dòng nền xanh là sản phẩm nằm trong danh sách ID phù hợp bạn nhập.</p>
          )}
        </section>
      )}

      <section className={cn(CARD, "overflow-x-auto p-0")}>
        <h2 className="px-5 pt-5 text-lg font-black text-fg">Lịch sử đánh giá</h2>
        <table className="mt-3 w-full min-w-[760px] text-left text-sm">
          <thead className="bg-bg text-xs uppercase tracking-wider text-muted">
            <tr>
              {["Truy vấn", "Mô hình", "P@5", "Recall@5", "MRR@5", "NDCG@5", "Người đánh giá"].map((heading) => (
                <th key={heading} className="px-5 py-3">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-6 text-center text-muted">Chưa có lần đánh giá nào.</td></tr>
            )}
            {evaluations.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-5 py-3 font-semibold text-fg">{item.query_text}</td>
                <td className="px-5 py-3 font-mono text-xs">{item.model_key}</td>
                <td className="px-5 py-3">{formatMetric(item.precision_at_5)}</td>
                <td className="px-5 py-3">{formatMetric(item.recall_at_5)}</td>
                <td className="px-5 py-3">{formatMetric(item.mrr_at_5)}</td>
                <td className="px-5 py-3">{formatMetric(item.ndcg_at_5)}</td>
                <td className="px-5 py-3 text-muted">{item.evaluator_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function ModelComparisonPage() {
  return (
    <AdminShell title="So sánh mô hình AI">
      <ModelComparisonContent />
    </AdminShell>
  );
}
