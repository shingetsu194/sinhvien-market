"use client";

import { useState, type FormEvent } from "react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { askDormRulesAssistant, type DormRulesAnswer } from "@/lib/api/residence-operations";

function AssistantContent() {
  const { user, loadingUser } = useMainShell();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<DormRulesAnswer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setAnswer(null);
    try { setAnswer(await askDormRulesAssistant(question)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tra cứu nội quy."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <header>
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Trợ lý cục bộ</p>
      <h1 className="mt-2 text-3xl font-black text-fg">Hỏi nội quy ký túc xá</h1>
      <p className="mt-2 text-sm text-muted">Chỉ tra cứu quy định đang công bố. Câu hỏi được xử lý trong ứng dụng, không gửi sang dịch vụ AI bên ngoài.</p>
    </header>
    {!user && !loadingUser && <p className="rounded-xl border border-border p-5">Đăng nhập để sử dụng trợ lý nội quy.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <label htmlFor="question" className="block text-sm font-semibold">Câu hỏi (không nhập thông tin cá nhân hoặc tài chính)</label>
      <textarea id="question" required maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} rows={4} className="w-full rounded-lg border border-border bg-bg p-3" />
      <button disabled={!user || busy} className="rounded-xl bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Đang tra cứu…" : "Tra cứu nội quy"}</button>
    </form>
    {answer && <section aria-live="polite" className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-bold">Trả lời dựa trên nội quy công bố</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{answer.answer}</p>
      {answer.sources.length > 0 && <div className="mt-4"><h3 className="text-sm font-bold">Nguồn</h3><ul className="mt-1 list-inside list-disc text-sm">{answer.sources.map((source) => <li key={source.id}>{source.title}</li>)}</ul></div>}
      <p className="mt-4 text-xs text-muted">Tra cứu từ khóa cục bộ · {answer.modelKey}. Xác nhận với Ban quản lý nếu câu trả lời chưa rõ.</p>
    </section>}
  </div>;
}

export default function ResidenceAssistantPage() {
  return <MainShell><AssistantContent /></MainShell>;
}
