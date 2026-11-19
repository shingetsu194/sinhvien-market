"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  createServiceRequest, getAccommodationHistory, getServiceRequests,
  updateServiceRequest, type ServiceRequest,
} from "@/lib/api/residence-operations";

function ServicesContent() {
  const { user, loadingUser } = useMainShell();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getAccommodationHistory>>>([]);
  const [form, setForm] = useState({ requestType: "service" as ServiceRequest["requestType"], title: "", description: "", priority: "normal" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [updates, setUpdates] = useState<Record<number, { status: ServiceRequest["status"]; note: string }>>({});
  const canManage = user?.role === "admin" || user?.roles?.includes("service_staff") === true
    || user?.roles?.includes("dorm_manager") === true;
  const canCreate = user?.role === "admin" || user?.role === "student"
    || user?.roles?.includes("tenant") === true;

  async function load() {
    const [nextRequests, nextHistory] = await Promise.all([
      getServiceRequests(),
      user?.role === "admin" || user?.roles?.includes("dorm_manager")
        ? getAccommodationHistory() : Promise.resolve([]),
    ]);
    setRequests(nextRequests); setHistory(nextHistory);
  }
  useEffect(() => {
    if (loadingUser || !user) return;
    let active = true;
    async function initialize() {
      try {
        const [nextRequests, nextHistory] = await Promise.all([
          getServiceRequests(),
          user?.role === "admin" || user?.roles?.includes("dorm_manager")
            ? getAccommodationHistory() : Promise.resolve([]),
        ]);
        if (active) { setRequests(nextRequests); setHistory(nextHistory); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu.");
      }
    }
    void initialize();
    return () => { active = false; };
  }, [loadingUser, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await createServiceRequest(form);
      if (result.classification) {
        setNotice(`Đã gửi yêu cầu. Phân loại gợi ý: ${result.classification.category} · ưu tiên ${result.classification.recommendedPriority}. Nhân viên sẽ xác nhận.`);
      }
      setForm({ requestType: "service", title: "", description: "", priority: "normal" });
      if (!result.classification) setNotice("Đã gửi yêu cầu đến bộ phận phụ trách.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không gửi được yêu cầu."); }
    finally { setBusy(false); }
  }
  async function updateRequest(request: ServiceRequest) {
    const update = updates[request.id];
    if (!update) return;
    setError("");
    try {
      await updateServiceRequest(request.id, { status: update.status, staffNote: update.note });
      setNotice("Đã cập nhật trạng thái yêu cầu."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không cập nhật được yêu cầu."); }
  }

  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <header><p className="text-sm font-bold uppercase tracking-widest text-primary">Dịch vụ ký túc xá</p><h1 className="mt-2 text-3xl font-black text-fg">Yêu cầu hỗ trợ</h1><p className="mt-2 text-sm text-muted">Gửi yêu cầu dịch vụ, báo sửa chữa hoặc phản hồi; theo dõi tiếp nhận và xử lý.</p><a className="mt-3 inline-block font-bold text-primary underline" href="/residence/assistant">Hỏi trợ lý nội quy KTX</a></header>
    {!user && !loadingUser && <p className="rounded-xl border border-border p-5">Đăng nhập để sử dụng dịch vụ KTX.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    {user && canCreate && <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Loại yêu cầu<select value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value as ServiceRequest["requestType"] })} className="mt-1 w-full rounded-lg border border-border bg-bg p-3"><option value="service">Dịch vụ</option><option value="repair">Sửa chữa</option><option value="feedback">Phản hồi</option></select></label>
      <label className="text-sm font-semibold">Mức ưu tiên<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg p-3"><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option></select></label>
      <label className="text-sm font-semibold sm:col-span-2">Tiêu đề<input required minLength={3} maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg p-3" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Mô tả<textarea required minLength={3} maxLength={2000} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg p-3" /></label>
      <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">Gửi yêu cầu</button>
    </form>}
    <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="text-xl font-bold">{canManage ? "Danh sách yêu cầu dịch vụ" : "Yêu cầu đã gửi"}</h2><div className="mt-3 divide-y divide-border">{requests.map((item) => <article key={item.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong>{item.title}</strong><span className="text-sm font-semibold">{item.status}</span></div><p className="mt-1 text-sm text-muted">{item.requesterName} · {item.requestType} · Ưu tiên {item.priority} · {item.assignedName ? `Phụ trách: ${item.assignedName}` : "Chưa phân công"}</p><p className="mt-2 text-sm">{item.description}</p>{item.aiCategory && <p className="mt-2 rounded-lg bg-primary/10 p-3 text-sm">Phân loại cục bộ: <strong>{item.aiCategory}</strong> · ưu tiên gợi ý {item.aiRecommendedPriority} ({Math.round((item.aiConfidence ?? 0) * 100)}%). {item.aiReason} Nhân viên xác nhận quyết định cuối cùng.</p>}{item.staffNote && <p className="mt-2 text-sm text-primary">Phản hồi: {item.staffNote}</p>}
      {canManage && <div className="mt-3 flex flex-wrap gap-2"><select value={updates[item.id]?.status ?? item.status} onChange={(e) => setUpdates({ ...updates, [item.id]: { status: e.target.value as ServiceRequest["status"], note: updates[item.id]?.note ?? item.staffNote ?? "" } })} className="rounded border border-border bg-bg p-2">{(["submitted", "assigned", "in_progress", "resolved", "closed"] as const).map((status) => <option key={status} value={status}>{status}</option>)}</select><input placeholder="Ghi chú phản hồi" value={updates[item.id]?.note ?? item.staffNote ?? ""} onChange={(e) => setUpdates({ ...updates, [item.id]: { status: updates[item.id]?.status ?? item.status, note: e.target.value } })} className="min-w-56 rounded border border-border bg-bg p-2" /><button onClick={() => void updateRequest(item)} className="rounded border border-primary px-3 py-2 text-sm font-bold text-primary">Cập nhật xử lý</button></div>}</article>)}{requests.length === 0 && <p className="py-4 text-sm text-muted">Chưa có yêu cầu hỗ trợ.</p>}</div></section>
    {(user?.role === "admin" || user?.roles?.includes("dorm_manager")) && <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="text-xl font-bold">Lịch sử lưu trú / chuyển phòng</h2><div className="mt-3 divide-y divide-border">{history.map((item, index) => <p key={`${item.allocationId}-${index}`} className="py-3 text-sm">{item.buildingCode} · tầng {item.floorNumber} · phòng {item.roomNumber} · giường {item.bedNumber} · {item.startDate} – {item.endDate} · {item.eventType ?? item.allocationStatus}{item.eventDate ? ` (${item.eventDate})` : ""}</p>)}{history.length === 0 && <p className="py-4 text-sm text-muted">Chưa có lịch sử phân phòng.</p>}</div></section>}
  </div>;
}
export default function ResidenceServicesPage() { return <MainShell><ServicesContent /></MainShell>; }
