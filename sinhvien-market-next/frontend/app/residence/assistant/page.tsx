"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  MessageSquareMore,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { KtxPageHeader } from "@/components/residence/KtxPageHeader";
import {
  askDormRulesAssistant,
  type DormRulesAnswer,
} from "@/lib/api/residence-operations";

const SAMPLE_QUESTIONS = [
  "Giờ đóng mở cổng KTX và khung giờ yên tĩnh ban đêm là mấy giờ?",
  "Sinh viên được phép sử dụng những thiết bị điện nào trong phòng ở?",
  "Quy định tiếp khách, người thân và phân loại rác tại KTX như thế nào?",
];

function AssistantContent() {
  const { user, loadingUser } = useMainShell();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<DormRulesAnswer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function runAsk(qText: string) {
    if (!qText.trim()) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    try {
      setAnswer(await askDormRulesAssistant(qText));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tra cứu nội quy.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAsk(question);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <KtxPageHeader
        title="Trợ lý Tra cứu Nội quy Ký túc xá"
        description="Hỏi đáp nhanh các quy định về giờ giấc ra vào cổng, sử dụng thiết bị điện, tiếp khách và sinh hoạt nội trú dựa trên văn bản công bố chính thức."
      />

      {!user && !loadingUser && (
        <p className="mb-5 rounded-3xl border border-border bg-surface p-6 text-center text-sm font-semibold">
          Đăng nhập tài khoản sinh viên để sử dụng Trợ lý Nội quy KTX.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={submit}
          className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
              <MessageSquareMore className="h-5 w-5" />
            </div>
            <div>
              <label
                htmlFor="question"
                className="block text-base font-extrabold text-fg"
              >
                Đặt câu hỏi về Nội quy KTX
              </label>
              <p className="text-xs text-muted">
                Xử lý cục bộ an toàn, không lưu dữ liệu cá nhân hay gửi ra bên ngoài.
              </p>
            </div>
          </div>

          <textarea
            id="question"
            required
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Nhập câu hỏi của bạn (VD: KTX đóng cổng lúc mấy giờ? Có được dùng ấm siêu tốc không?)..."
            rows={4}
            className="mt-4 w-full rounded-2xl border border-border bg-bg p-3.5 text-sm font-medium text-fg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />

          <div className="mt-3">
            <span className="text-xs font-bold text-muted">
              Câu hỏi thường gặp (bấm để hỏi ngay):
            </span>
            <div className="mt-2 flex flex-col gap-2">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!user || busy}
                  onClick={() => {
                    setQuestion(q);
                    void runAsk(q);
                  }}
                  className="cursor-pointer rounded-xl border border-border bg-bg px-3.5 py-2 text-left text-xs font-semibold text-fg transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!user || busy}
            className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {busy ? "Đang tra cứu…" : "Tra cứu nội quy"}
          </button>
        </form>

        <div className="space-y-4">
          {answer ? (
            <section
              aria-live="polite"
              className="rounded-3xl border border-blue-500/30 bg-surface p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-base font-extrabold">
                  Trả lời dựa trên nội quy công bố
                </h2>
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-bg p-4 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                {answer.answer}
              </div>

              {answer.sources.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">
                    Văn bản nội quy trích dẫn ({answer.sources.length})
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {answer.sources.map((source) => (
                      <li
                        key={source.id}
                        className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-300"
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span>{source.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  Tra cứu từ khóa cục bộ · {answer.modelKey}. Liên hệ Ban quản lý KTX nếu cần giải đáp tình huống đặc biệt.
                </span>
              </p>
            </section>
          ) : (
            <section className="rounded-3xl border border-border bg-surface p-6">
              <h2 className="text-base font-extrabold text-fg">
                Tóm tắt nhanh Nội quy KTX ĐHQG
              </h2>
              <ul className="mt-3 space-y-3 text-xs leading-relaxed text-muted">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-fg">Giờ mở/đóng cổng:</strong> 05:00
                    sáng – 23:00 đêm. Giờ yên tĩnh tại phòng ở từ 22:30.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-fg">An toàn điện:</strong> Không dùng
                    bếp gas mini, bếp từ công suất lớn; báo ngay nếu ổ cắm phát tia lửa.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-fg">Tiếp khách:</strong> Đăng ký tại
                    sảnh trực từ 07:30 – 20:30, không lưu trú người lạ qua đêm.
                  </span>
                </li>
              </ul>
              <Link
                href="/residence/announcements"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline"
              >
                Xem toàn bộ văn bản Nội quy & Thông báo →
              </Link>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResidenceAssistantPage() {
  return (
    <MainShell>
      <AssistantContent />
    </MainShell>
  );
}
