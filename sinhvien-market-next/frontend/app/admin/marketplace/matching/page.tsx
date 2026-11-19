"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  getMatchingEvaluations,
  indexMarketplaceProducts,
  saveMatchingEvaluation,
  type MatchingEvaluation,
} from "@/lib/api/marketplace-matching";

function MatchingEvaluationContent() {
  const { user, loadingUser } = useMainShell();
  const [evaluations, setEvaluations] = useState<MatchingEvaluation[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;
  async function load() {
    try { setEvaluations(await getMatchingEvaluations()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được kết quả đánh giá."); }
  }
  useEffect(() => {
    if (loadingUser || !canManage) return;
    let active = true;
    void getMatchingEvaluations()
      .then((nextEvaluations) => { if (active) setEvaluations(nextEvaluations); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được kết quả đánh giá.");
      });
    return () => { active = false; };
  }, [loadingUser, canManage]);
  async function indexProducts() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await indexMarketplaceProducts();
      setNotice(`Đã lập chỉ mục ${result.indexedCandidates} sản phẩm (${result.modelKey}).`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lập chỉ mục thất bại."); }
    finally { setBusy(false); }
  }
  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ids = String(data.get("relevantIds")).split(",").map((value) => Number(value.trim())).filter(Number.isSafeInteger);
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await saveMatchingEvaluation(String(data.get("queryText")), ids);
      setNotice(`Đánh giá đã lưu · P@5 ${result.metrics.precisionAt5.toFixed(2)} · Recall@5 ${result.metrics.recallAt5.toFixed(2)} · MRR@5 ${result.metrics.mrrAt5.toFixed(2)} · NDCG@5 ${result.metrics.ndcgAt5.toFixed(2)}`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được đánh giá."); }
    finally { setBusy(false); }
  }
  if (!loadingUser && !canManage) return <div className="p-8">Bạn không có quyền xem đánh giá matching.</div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-black text-fg">Đánh giá tìm kiếm marketplace</h1>
      <p className="mt-2 text-sm text-muted">Dữ liệu gán nhãn là danh sách ID sản phẩm liên quan do người đánh giá cung cấp; metric đo baseline hiện tại, không khẳng định chất lượng ngữ nghĩa.</p>
      <p className="mt-1 text-sm text-muted">Truy vấn là đầu vào test dạng REQUEST; hiện hệ thống chưa có thực thể REQUEST riêng.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      <button disabled={busy} onClick={() => void indexProducts()} className="mt-5 rounded-xl border border-border px-4 py-2 font-semibold">Lập chỉ mục sản phẩm hiện hoạt</button>
      <form onSubmit={evaluate} className="mt-5 grid gap-3 rounded-2xl border border-border p-5">
        <h2 className="text-xl font-bold">Ghi nhận truy vấn–sản phẩm đánh giá</h2>
        <label className="text-sm">Truy vấn<input required minLength={2} name="queryText" maxLength={1000} className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
        <label className="text-sm">ID sản phẩm liên quan, phân cách bằng dấu phẩy<input required name="relevantIds" placeholder="12, 27" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
        <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">Tính và lưu P@5, Recall@5, MRR@5, NDCG@5</button>
      </form>
      <section className="mt-7 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-bg"><tr>{["Truy vấn", "P@5", "Recall@5", "MRR@5", "NDCG@5", "Mô hình / người đánh giá"].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>{evaluations.map((item) => <tr key={item.id} className="border-t border-border"><td className="p-3">{item.query_text}</td><td className="p-3">{Number(item.precision_at_5).toFixed(2)}</td><td className="p-3">{Number(item.recall_at_5).toFixed(2)}</td><td className="p-3">{Number(item.mrr_at_5).toFixed(2)}</td><td className="p-3">{Number(item.ndcg_at_5).toFixed(2)}</td><td className="p-3">{item.model_key} · {item.evaluator_name}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
export default function MatchingEvaluationPage() {
  return <MainShell><MatchingEvaluationContent /></MainShell>;
}
