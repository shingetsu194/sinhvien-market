"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Database, SearchCheck, Sparkles } from "lucide-react";
import { AdminKtxHeader } from "@/components/admin/AdminKtxHeader";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import {
  getMatchingEvaluations,
  indexMarketplaceProducts,
  saveMatchingEvaluation,
  type MatchingEvaluation,
} from "@/lib/api/marketplace-matching";

function MatchingEvaluationContent() {
  const { user } = useAdminShell();
  const [evaluations, setEvaluations] = useState<MatchingEvaluation[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage =
    user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  async function load() {
    try {
      setEvaluations(await getMatchingEvaluations());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không tải được kết quả đánh giá.",
      );
    }
  }

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void getMatchingEvaluations()
      .then((nextEvaluations) => {
        if (active) setEvaluations(nextEvaluations);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được kết quả đánh giá.",
          );
      });
    return () => {
      active = false;
    };
  }, [canManage]);

  async function indexProducts() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await indexMarketplaceProducts();
      setNotice(
        `Đã lập chỉ mục ${result.indexedCandidates} sản phẩm (${result.modelKey}).`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Lập chỉ mục thất bại.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const ids = String(data.get("relevantIds"))
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isSafeInteger);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await saveMatchingEvaluation(
        String(data.get("queryText")),
        ids,
      );
      setNotice(
        `Đánh giá đã lưu · P@5 ${result.metrics.precisionAt5.toFixed(2)} · Recall@5 ${result.metrics.recallAt5.toFixed(2)} · MRR@5 ${result.metrics.mrrAt5.toFixed(2)} · NDCG@5 ${result.metrics.ndcgAt5.toFixed(2)}`,
      );
      form.reset();
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được đánh giá.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-sm font-semibold text-fg">
        Bạn không có quyền xem đánh giá matching.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminKtxHeader
        badge="Đánh giá Chất lượng Tìm kiếm & Ghép nối"
        title="Đánh giá Tìm kiếm Marketplace (IR Metrics)"
        description="Đo lường thực nghiệm Precision@5, Recall@5, MRR@5 và NDCG@5 trên tập truy vấn – sản phẩm liên quan do quản trị viên gán nhãn."
      />

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-fg">
              Đồng bộ & Lập chỉ mục Kho sản phẩm
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Cập nhật vector đặc trưng cho toàn bộ sản phẩm đang hoạt động
              (`status = active`) trước khi chạy đo kiểm các chỉ số truy hồi
              thông tin.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void indexProducts()}
            className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-500/15 dark:text-sky-300"
          >
            <Sparkles className="h-4 w-4" />
            Lập chỉ mục sản phẩm hiện hoạt
          </button>
        </section>

        <form
          onSubmit={evaluate}
          className="grid gap-4 rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
              <SearchCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-fg">
                Ghi nhận truy vấn–sản phẩm đánh giá
              </h3>
              <p className="text-xs text-muted">
                Nhập câu truy vấn thử nghiệm và danh sách ID sản phẩm chuẩn
                (Ground Truth).
              </p>
            </div>
          </div>

          <label className="text-xs font-bold text-fg">
            Truy vấn tìm kiếm *
            <input
              required
              minLength={2}
              name="queryText"
              maxLength={1000}
              placeholder="VD: sách giải tích giáo trình năm nhất"
              className="mt-1.5 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none focus:border-primary"
            />
          </label>
          <label className="text-xs font-bold text-fg">
            ID sản phẩm liên quan, phân cách bằng dấu phẩy *
            <input
              required
              name="relevantIds"
              placeholder="VD: 101, 107"
              className="mt-1.5 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none focus:border-primary"
            />
          </label>
          <button
            disabled={busy}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Tính và lưu P@5, Recall@5, MRR@5, NDCG@5
          </button>
        </form>
      </div>

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-surface shadow-xs dark:border-border">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-extrabold text-fg">
            Lịch sử Thực nghiệm Đánh giá ({evaluations.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-blue-50/60 text-xs font-extrabold text-slate-600 uppercase dark:bg-surface-2 dark:text-slate-300">
              <tr>
                {[
                  "Truy vấn",
                  "P@5",
                  "Recall@5",
                  "MRR@5",
                  "NDCG@5",
                  "Mô hình / người đánh giá",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {evaluations.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-surface-2">
                  <td className="px-4 py-3.5 font-bold text-fg">
                    {item.query_text}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-sky-400">
                    {Number(item.precision_at_5).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-sky-400">
                    {Number(item.recall_at_5).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-sky-400">
                    {Number(item.mrr_at_5).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-sky-400">
                    {Number(item.ndcg_at_5).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-sky-300">
                      {item.model_key}
                    </span>{" "}
                    · {item.evaluator_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function MatchingEvaluationPage() {
  return (
    <AdminShell title="Đánh giá Tìm kiếm Marketplace">
      <MatchingEvaluationContent />
    </AdminShell>
  );
}
