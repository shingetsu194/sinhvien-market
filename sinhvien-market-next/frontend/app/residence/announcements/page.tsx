"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Archive,
  Bell,
  BookOpen,
  Calendar,
  Megaphone,
  MessageSquareMore,
  Search,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  KtxPageHeader,
  formatIsoDateVi,
} from "@/components/residence/KtxPageHeader";
import {
  archiveResidenceNotice,
  createResidenceNotice,
  getResidenceNotices,
  type ResidenceNotice,
} from "@/lib/api/residence-finance";
import { cn } from "@/lib/cn";

const NOTICE_TYPE_META: Record<
  ResidenceNotice["type"],
  { label: string; badgeCls: string; icon: typeof Bell }
> = {
  announcement: {
    label: "Thông báo Ban quản lý",
    badgeCls: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    icon: Megaphone,
  },
  event: {
    label: "Sự kiện nội khu",
    badgeCls: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    icon: Calendar,
  },
  rule: {
    label: "Nội quy KTX",
    badgeCls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    icon: BookOpen,
  },
};

function ResidenceAnnouncementsContent() {
  const { user, loadingUser } = useMainShell();
  const [items, setItems] = useState<ResidenceNotice[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | ResidenceNotice["type"]>(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isManager =
    user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  async function load() {
    try {
      setItems(await getResidenceNotices());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tải được thông báo.",
      );
    }
  }

  useEffect(() => {
    if (loadingUser || !user) return;
    let active = true;
    void getResidenceNotices()
      .then((nextItems) => {
        if (active) setItems(nextItems);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được thông báo.",
          );
      });
    return () => {
      active = false;
    };
  }, [loadingUser, user]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await createResidenceNotice({
        type: String(form.get("type")) as ResidenceNotice["type"],
        title: String(form.get("title")),
        body: String(form.get("body")),
        audience: String(form.get("audience")) as ResidenceNotice["audience"],
        startsAt: String(form.get("startsAt") ?? "") || undefined,
        endsAt: String(form.get("endsAt") ?? "") || undefined,
      });
      formElement.reset();
      setNotice("Đã đăng bản tin mới lên bảng thông báo KTX.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không đăng được nội dung.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: number) {
    try {
      await archiveResidenceNotice(id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu trữ được nội dung.",
      );
    }
  }

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("vi");
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!q) return true;
      return (
        item.title.toLocaleLowerCase("vi").includes(q) ||
        item.body.toLocaleLowerCase("vi").includes(q)
      );
    });
  }, [items, searchQuery, typeFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <KtxPageHeader
        title="Bảng tin, Sự kiện & Nội quy KTX"
        description="Cập nhật lịch kiểm tra định kỳ, hoạt động giao lưu sinh viên và quy định sinh hoạt chung tại các tòa nhà KTX."
      />

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: `Tất cả (${items.length})` },
              { key: "announcement", label: "Thông báo" },
              { key: "event", label: "Sự kiện" },
              { key: "rule", label: "Nội quy KTX" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              className={cn(
                "cursor-pointer rounded-xl px-3.5 py-2 text-xs font-extrabold transition",
                typeFilter === tab.key
                  ? "bg-primary text-white shadow-xs"
                  : "bg-bg text-muted hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thông báo, nội quy..."
              className="w-full rounded-xl border border-border bg-bg py-2 pr-3 pl-9 text-xs font-medium text-fg focus:border-primary focus:outline-none"
            />
          </div>
          <Link
            href="/residence/assistant"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-500/15 px-3.5 py-2 text-xs font-extrabold text-blue-600 transition hover:bg-blue-500/25 dark:text-blue-300"
          >
            <MessageSquareMore className="h-3.5 w-3.5" />
            Hỏi Trợ lý Nội quy
          </Link>
        </div>
      </div>

      {isManager && (
        <form
          onSubmit={publish}
          className="mb-7 grid gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6 md:grid-cols-2"
        >
          <h2 className="text-lg font-extrabold text-fg md:col-span-2">
            Đăng thông báo, sự kiện hoặc nội quy mới
          </h2>
          <label className="text-xs font-bold text-muted">
            Phân loại bản tin
            <select
              name="type"
              className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
            >
              <option value="announcement">Thông báo</option>
              <option value="event">Sự kiện</option>
              <option value="rule">Nội quy</option>
            </select>
          </label>
          <label className="text-xs font-bold text-muted">
            Đối tượng áp dụng
            <select
              name="audience"
              className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
            >
              <option value="all">Tất cả sinh viên</option>
              <option value="residents">Sinh viên đang lưu trú KTX</option>
            </select>
          </label>
          <label className="text-xs font-bold text-muted md:col-span-2">
            Tiêu đề bản tin
            <input
              required
              name="title"
              maxLength={180}
              className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
            />
          </label>
          <label className="text-xs font-bold text-muted md:col-span-2">
            Nội dung chi tiết
            <textarea
              required
              name="body"
              maxLength={10000}
              rows={4}
              className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
            />
          </label>
          <button
            disabled={busy}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50 md:col-span-2"
          >
            {busy ? "Đang đăng..." : "Đăng nội dung"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {filteredItems.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface p-10 text-center">
            <Bell className="mx-auto h-9 w-9 text-muted" />
            <p className="mt-3 text-sm font-bold text-fg">
              Chưa có thông báo nào khớp bộ lọc hiện tại.
            </p>
          </div>
        )}
        {filteredItems.map((item) => {
          const meta = NOTICE_TYPE_META[item.type];
          const Icon = meta.icon;
          return (
            <article
              key={item.id}
              className="rounded-3xl border border-border bg-surface p-5 shadow-xs transition hover:border-primary/30 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold",
                      meta.badgeCls,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                    {item.audience === "residents"
                      ? "Dành cho SV nội trú"
                      : "Toàn khu KTX"}
                  </span>
                </div>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => void archive(item.id)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-rose-500 hover:bg-rose-500/10"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Lưu trữ
                  </button>
                )}
              </div>

              <h2 className="mt-3 text-lg font-extrabold text-fg sm:text-xl">
                {item.title}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {item.body}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
                <span>
                  Đăng bởi <strong className="text-fg">{item.authorName}</strong>
                </span>
                <span>
                  Hiệu lực từ:{" "}
                  <strong className="text-fg">
                    {formatIsoDateVi(item.startsAt ?? item.createdAt)}
                  </strong>
                  {item.endsAt ? ` đến ${formatIsoDateVi(item.endsAt)}` : ""}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ResidenceAnnouncementsPage() {
  return (
    <MainShell>
      <ResidenceAnnouncementsContent />
    </MainShell>
  );
}
