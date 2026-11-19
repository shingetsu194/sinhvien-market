"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  archiveResidenceNotice,
  createResidenceNotice,
  getResidenceNotices,
  type ResidenceNotice,
} from "@/lib/api/residence-finance";

function ResidenceAnnouncementsContent() {
  const { user, loadingUser } = useMainShell();
  const [items, setItems] = useState<ResidenceNotice[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isManager = user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  async function load() {
    try { setItems(await getResidenceNotices()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được thông báo."); }
  }
  useEffect(() => {
    if (loadingUser || !user) return;
    let active = true;
    void getResidenceNotices()
      .then((nextItems) => { if (active) setItems(nextItems); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được thông báo.");
      });
    return () => { active = false; };
  }, [loadingUser, user]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true); setError(""); setNotice("");
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
      setNotice("Đã đăng nội dung."); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đăng được nội dung.");
    } finally { setBusy(false); }
  }
  async function archive(id: number) {
    try { await archiveResidenceNotice(id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu trữ được nội dung."); }
  }
  const labels = { announcement: "Thông báo", event: "Sự kiện", rule: "Nội quy" };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted">Cổng sinh viên</p><h1 className="text-3xl font-black text-fg">Thông tin khu lưu trú</h1></div>
        <Link href="/residence" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Hồ sơ lưu trú</Link>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      {isManager && (
        <form onSubmit={publish} className="mb-7 grid gap-3 rounded-2xl border border-border p-5 md:grid-cols-2">
          <h2 className="text-xl font-bold md:col-span-2">Đăng thông báo, sự kiện hoặc nội quy</h2>
          <label className="text-sm">Loại<select name="type" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2"><option value="announcement">Thông báo</option><option value="event">Sự kiện</option><option value="rule">Nội quy</option></select></label>
          <label className="text-sm">Đối tượng<select name="audience" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2"><option value="all">Tất cả</option><option value="residents">Sinh viên đang lưu trú</option></select></label>
          <label className="text-sm md:col-span-2">Tiêu đề<input required name="title" maxLength={180} className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm md:col-span-2">Nội dung<textarea required name="body" maxLength={10000} rows={4} className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Bắt đầu (không bắt buộc)<input name="startsAt" type="datetime-local" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Kết thúc (không bắt buộc)<input name="endsAt" type="datetime-local" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-2">Đăng nội dung</button>
        </form>
      )}
      <div className="space-y-4">
        {items.length === 0 && <p className="rounded-xl border border-border p-5 text-muted">Chưa có thông báo đang hiệu lực.</p>}
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{labels[item.type]}</span>
              {isManager && <button onClick={() => void archive(item.id)} className="text-sm text-red-700">Lưu trữ</button>}
            </div>
            <h2 className="mt-3 text-xl font-bold text-fg">{item.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{item.body}</p>
            <p className="mt-3 text-xs text-muted">Đăng bởi {item.authorName} · {item.startsAt ?? item.createdAt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function ResidenceAnnouncementsPage() {
  return <MainShell><ResidenceAnnouncementsContent /></MainShell>;
}
