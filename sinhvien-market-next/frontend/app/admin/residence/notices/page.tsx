"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Archive, BookOpenCheck, CalendarDays, Megaphone, Send } from "lucide-react";
import { AdminKtxHeader } from "@/components/admin/AdminKtxHeader";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import {
  archiveResidenceNotice,
  createResidenceNotice,
  getResidenceNotices,
  type ResidenceNotice,
} from "@/lib/api/residence-finance";
import { cn } from "@/lib/cn";

const TYPE_META: Record<ResidenceNotice["type"], { label: string; cls: string; icon: typeof Megaphone }> = {
  announcement: {
    label: "Thông báo",
    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-sky-300",
    icon: Megaphone,
  },
  event: {
    label: "Sự kiện",
    cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300",
    icon: CalendarDays,
  },
  rule: {
    label: "Nội quy",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
    icon: BookOpenCheck,
  },
};

const fieldClass =
  "mt-1.5 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none transition focus:border-primary";

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function NoticesAdminContent() {
  const { user } = useAdminShell();
  const [notices, setNotices] = useState<ResidenceNotice[]>([]);
  const [typeFilter, setTypeFilter] = useState<"" | ResidenceNotice["type"]>("");
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    getResidenceNotices()
      .then((rows) => {
        if (active) setNotices(rows);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được thông báo.");
      });
    return () => {
      active = false;
    };
  }, [canManage]);

  async function reload() {
    setNotices(await getResidenceNotices());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createResidenceNotice({
        type: String(data.get("type")) as ResidenceNotice["type"],
        title: String(data.get("title")).trim(),
        body: String(data.get("body")).trim(),
        audience: String(data.get("audience")) as ResidenceNotice["audience"],
        startsAt: String(data.get("startsAt") ?? "") || undefined,
        endsAt: String(data.get("endsAt") ?? "") || undefined,
      });
      form.reset();
      setMessage("Đã đăng. Sinh viên thấy ngay ở trang Thông báo & Nội quy.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đăng được thông báo.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(notice: ResidenceNotice) {
    if (!window.confirm(`Gỡ "${notice.title}" khỏi bảng tin? Bản ghi vẫn được lưu trữ.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await archiveResidenceNotice(notice.id);
      setMessage(`Đã gỡ "${notice.title}".`);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gỡ được thông báo.");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-sm font-semibold text-fg">
        Bạn không có quyền quản lý thông báo KTX.
      </div>
    );
  }

  const visible = notices.filter(
    (n) => (showArchived || n.status === "published") && (typeFilter === "" || n.type === typeFilter),
  );
  const publishedRules = notices.filter((n) => n.type === "rule" && n.status === "published").length;

  return (
    <div className="space-y-6">
      <AdminKtxHeader
        title="Thông báo, Sự kiện & Nội quy KTX"
        description="Đăng bản tin cho sinh viên và quản lý nội quy. Các nội quy đang đăng cũng là nguồn trả lời của Trợ lý nội quy KTX."
      />

      {error && (
        <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={submit}
          className="space-y-3 self-start rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border"
        >
          <h3 className="flex items-center gap-2 text-base font-extrabold text-fg">
            <Send className="h-4 w-4 text-primary" /> Đăng mới
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-fg">
              Loại *
              <select name="type" required defaultValue="announcement" className={fieldClass}>
                <option value="announcement">Thông báo</option>
                <option value="event">Sự kiện</option>
                <option value="rule">Nội quy</option>
              </select>
            </label>
            <label className="text-xs font-bold text-fg">
              Đối tượng *
              <select name="audience" required defaultValue="all" className={fieldClass}>
                <option value="all">Tất cả sinh viên</option>
                <option value="residents">Chỉ sinh viên đang ở KTX</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-bold text-fg">
            Tiêu đề *
            <input name="title" required minLength={3} maxLength={180} className={fieldClass} placeholder="VD: Lịch cắt nước tòa A ngày 25/11" />
          </label>
          <label className="block text-xs font-bold text-fg">
            Nội dung *
            <textarea name="body" required minLength={3} maxLength={10000} rows={6} className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-fg">
              Hiển thị từ
              <input name="startsAt" type="datetime-local" className={fieldClass} />
            </label>
            <label className="text-xs font-bold text-fg">
              Đến
              <input name="endsAt" type="datetime-local" className={fieldClass} />
            </label>
          </div>
          <p className="text-xs text-muted">Để trống thời gian nếu muốn đăng ngay và không hết hạn.</p>
          <button
            disabled={busy}
            className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
          >
            Đăng
          </button>
        </form>

        <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-fg">
              Bảng tin ({visible.length}) · {publishedRules} nội quy đang áp dụng
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {([["", "Tất cả"], ["announcement", "Thông báo"], ["event", "Sự kiện"], ["rule", "Nội quy"]] as const).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    className={cn(
                      "cursor-pointer rounded-xl px-3 py-1.5 transition",
                      typeFilter === value ? "bg-primary text-white" : "border border-border bg-bg text-muted hover:text-fg",
                    )}
                  >
                    {label}
                  </button>
                ),
              )}
              <label className="ml-1 inline-flex items-center gap-1.5 text-muted">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Hiện bản đã gỡ
              </label>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border">
            {visible.length === 0 && <p className="py-6 text-center text-sm text-muted">Chưa có mục nào.</p>}
            {visible.map((notice) => {
              const meta = TYPE_META[notice.type];
              const Icon = meta.icon;
              const shownWindow = [formatDateTime(notice.startsAt), formatDateTime(notice.endsAt)].filter(Boolean).join(" → ");
              return (
                <article key={notice.id} className={cn("py-4", notice.status === "archived" && "opacity-60")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold", meta.cls)}>
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                        {notice.audience === "residents" && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted">
                            Chỉ người đang ở KTX
                          </span>
                        )}
                        {notice.status === "archived" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
                            Đã gỡ
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1.5 font-extrabold text-fg">{notice.title}</h4>
                      <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-muted">{notice.body}</p>
                      <p className="mt-1.5 text-[11px] text-muted">
                        {notice.authorName} · {formatDateTime(notice.createdAt)}
                        {shownWindow && ` · hiển thị ${shownWindow}`}
                      </p>
                    </div>
                    {notice.status === "published" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void archive(notice)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Archive className="h-3.5 w-3.5" /> Gỡ
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ResidenceNoticesAdminPage() {
  return (
    <AdminShell title="Thông báo & Nội quy KTX">
      <NoticesAdminContent />
    </AdminShell>
  );
}
