"use client";

import { useEffect, useState } from "react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { getAdminResidenceApplications, type ResidenceApplication } from "@/lib/api/residence";
import {
  assignResidenceBed, deleteInventoryResource, deleteRentalSpace,
  getAvailableBeds, getBedAllocations,
  getRentalApplicationsForReview, getRentalContracts, getRentalSpaces, getResidenceInventory,
  getServiceRequests, reviewRentalApplication, saveInventoryResource,
  saveRentalSpace, transferResidenceBed, updateServiceRequest,
  type BedAllocation, type RentalApplication, type RentalSpace, type ServiceRequest,
} from "@/lib/api/residence-operations";

type Resource = "buildings" | "floors" | "rooms" | "beds";
type Inventory = Awaited<ReturnType<typeof getResidenceInventory>>;
const resourceFields: Record<Resource, Array<[string, string, string?]>> = {
  buildings: [["code", "Mã tòa"], ["name", "Tên tòa"], ["address", "Địa chỉ"], ["status", "Trạng thái"]],
  floors: [["buildingId", "ID tòa", "number"], ["floorNumber", "Số tầng", "number"], ["name", "Tên tầng"]],
  rooms: [["floorId", "ID tầng", "number"], ["roomNumber", "Số phòng"], ["roomType", "Loại phòng"], ["capacity", "Sức chứa", "number"], ["status", "Trạng thái"]],
  beds: [["roomId", "ID phòng", "number"], ["bedNumber", "Mã giường"], ["status", "Trạng thái"]],
};

function OperationsContent() {
  const { user, loadingUser } = useMainShell();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [contracts, setContracts] = useState<ResidenceApplication[]>([]);
  const [allocations, setAllocations] = useState<BedAllocation[]>([]);
  const [beds, setBeds] = useState<Awaited<ReturnType<typeof getAvailableBeds>>>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [rentalSpaces, setRentalSpaces] = useState<RentalSpace[]>([]);
  const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>([]);
  const [rentalContracts, setRentalContracts] = useState<Awaited<ReturnType<typeof getRentalContracts>>>([]);
  const [resource, setResource] = useState<Resource>("buildings");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [assign, setAssign] = useState({ contractId: "", bedId: "" });
  const [transfer, setTransfer] = useState<Record<number, { bedId: string; date: string }>>({});
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [spaceDraft, setSpaceDraft] = useState({
    spaceCode: "", name: "", location: "", areaSqm: "1", monthlyPrice: "0",
    description: "", status: "available",
  });
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [requestEdits, setRequestEdits] = useState<Record<number, {
    status: ServiceRequest["status"]; staffNote: string;
  }>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = user?.role === "admin" || user?.roles?.includes("dorm_manager");

  async function load() {
    const [nextInventory, nextApps, nextAllocations, nextBeds, nextRequests, nextSpaces, nextRentalApps, nextRentalContracts] =
      await Promise.all([
        getResidenceInventory(), getAdminResidenceApplications(), getBedAllocations(),
        getAvailableBeds(), getServiceRequests(), getRentalSpaces(),
        getRentalApplicationsForReview(), getRentalContracts(),
      ]);
    setInventory(nextInventory); setContracts(nextApps); setAllocations(nextAllocations);
    setBeds(nextBeds); setRequests(nextRequests); setRentalSpaces(nextSpaces);
    setRentalApplications(nextRentalApps); setRentalContracts(nextRentalContracts);
  }

  useEffect(() => {
    if (loadingUser || !canManage) return;
    let active = true;
    async function initialize() {
      try {
        const [nextInventory, nextApps, nextAllocations, nextBeds, nextRequests, nextSpaces, nextRentalApps, nextRentalContracts] =
          await Promise.all([
            getResidenceInventory(), getAdminResidenceApplications(), getBedAllocations(),
            getAvailableBeds(), getServiceRequests(), getRentalSpaces(),
            getRentalApplicationsForReview(), getRentalContracts(),
          ]);
        if (!active) return;
        setInventory(nextInventory); setContracts(nextApps); setAllocations(nextAllocations);
        setBeds(nextBeds); setRequests(nextRequests); setRentalSpaces(nextSpaces);
        setRentalApplications(nextRentalApps); setRentalContracts(nextRentalContracts);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu quản lý.");
      }
    }
    void initialize();
    return () => { active = false; };
  }, [loadingUser, canManage]);

  function startCreate() {
    setEditingId(null);
    setValues(Object.fromEntries(resourceFields[resource].map(([key]) =>
      [key, key === "status" ? (resource === "beds" ? "available" : "active") : ""])));
  }
  function startEdit(row: Record<string, unknown>) {
    setEditingId(Number(row.id));
    setValues(Object.fromEntries(resourceFields[resource].map(([key]) => [key, String(row[key] ?? "")])));
  }
  async function saveResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, , type] of resourceFields[resource]) {
        payload[key] = type === "number" ? Number(values[key]) : values[key];
      }
      await saveInventoryResource(resource, payload, editingId ?? undefined);
      setNotice("Đã lưu dữ liệu tòa nhà.");
      startCreate(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được dữ liệu."); }
    finally { setBusy(false); }
  }
  async function removeResource(id: number) {
    if (!window.confirm("Xóa dữ liệu này? Các dữ liệu đang được sử dụng sẽ được bảo vệ.")) return;
    setError(""); setNotice("");
    try { await deleteInventoryResource(resource, id); setNotice("Đã xóa dữ liệu."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xóa dữ liệu."); }
  }
  async function assignBed(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await assignResidenceBed(Number(assign.contractId), Number(assign.bedId));
      setAssign({ contractId: "", bedId: "" }); setNotice("Đã phân giường."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không phân được giường."); }
    finally { setBusy(false); }
  }
  async function moveBed(allocation: BedAllocation) {
    const allocationId = allocation.allocationId;
    if (!allocationId) return;
    const input = transfer[allocationId];
    if (!input?.bedId || !input.date) { setError("Chọn giường mới và ngày chuyển."); return; }
    setError("");
    try {
      await transferResidenceBed(allocationId, Number(input.bedId), input.date);
      setNotice("Đã chuyển giường và ghi lịch sử."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không chuyển được giường."); }
  }
  async function saveSpace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await saveRentalSpace(
        { ...spaceDraft, areaSqm: Number(spaceDraft.areaSqm), monthlyPrice: Number(spaceDraft.monthlyPrice) },
        editingSpaceId ?? undefined,
      );
      setEditingSpaceId(null);
      setSpaceDraft({ spaceCode: "", name: "", location: "", areaSqm: "1", monthlyPrice: "0", description: "", status: "available" });
      setNotice("Đã tạo mặt bằng."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được mặt bằng."); }
    finally { setBusy(false); }
  }
  async function reviewRental(app: RentalApplication, decision: "under_review" | "approve" | "reject") {
    const note = window.prompt("Ghi chú xét duyệt (bắt buộc khi từ chối):", "") ?? "";
    if (decision === "reject" && !note.trim()) return;
    try { await reviewRentalApplication(app.id, decision, note.trim()); setNotice("Đã cập nhật đề nghị thuê."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không xét duyệt được."); }
  }
  async function updateRequest(request: ServiceRequest) {
    const input = assignments[request.id] ?? "";
    try {
      const edit = requestEdits[request.id];
      await updateServiceRequest(request.id, {
        ...(input ? { assignedTo: Number(input) } : {}),
        status: edit?.status ?? (request.status === "submitted" ? "assigned" : request.status),
        ...(edit?.staffNote !== undefined ? { staffNote: edit.staffNote } : {}),
      });
      setNotice("Đã cập nhật yêu cầu."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không cập nhật được yêu cầu."); }
  }

  if (loadingUser) return <div className="p-8">Đang tải…</div>;
  if (!canManage) return <div className="mx-auto max-w-4xl p-8">Bạn không có quyền quản lý ký túc xá.</div>;
  const rows = inventory?.[resource] as unknown as Array<Record<string, unknown>> | undefined;
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Ban quản lý KTX</p>
        <h1 className="mt-2 text-3xl font-black text-fg">Cơ sở vật chất & vận hành</h1>
        <p className="mt-2 text-sm text-muted">Tòa nhà, tầng, phòng, giường, phân phòng, yêu cầu dịch vụ và mặt bằng.</p>
        <a href="/admin/residence/dashboard" className="mt-3 inline-block font-bold text-primary underline">Mở dashboard vận hành</a>
      </header>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-bold text-fg">Quản lý cơ sở vật chất</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["buildings", "floors", "rooms", "beds"] as Resource[]).map((item) =>
            <button key={item} onClick={() => { setResource(item); setEditingId(null); setValues({}); }}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${resource === item ? "bg-primary text-white" : "border border-border text-fg"}`}>{item}</button>)}
          <button onClick={startCreate} className="ml-auto rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary">Thêm mới</button>
        </div>
        <form onSubmit={saveResource} className="mt-4 grid gap-3 rounded-xl bg-bg p-4 sm:grid-cols-3">
          {resourceFields[resource].map(([key, label, type]) =>
            <label key={key} className="text-sm font-semibold text-fg">{label}
              <input required type={type ?? "text"} value={values[key] ?? ""}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" />
            </label>)}
          <button disabled={busy} className="self-end rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50">
            {editingId ? "Cập nhật" : "Tạo mới"}
          </button>
        </form>
        <div className="mt-4 divide-y divide-border">
          {(rows ?? []).map((row) => <div key={String(row.id)} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><strong className="text-fg">#{String(row.id)} · {String(row.name ?? row.roomNumber ?? row.bedNumber ?? row.floorNumber ?? row.code)}</strong>
              <p className="text-xs text-muted">{JSON.stringify(row)}</p></div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(row)} className="rounded border border-border px-3 py-1.5 text-sm">Sửa</button>
              <button onClick={() => void removeResource(Number(row.id))} className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700">Xóa</button>
            </div>
          </div>)}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-bold text-fg">Hợp đồng mặt bằng</h2>
        <div className="mt-3 divide-y divide-border">{rentalContracts.map((contract) =>
          <p key={contract.id} className="py-3 text-sm">{contract.contractNumber} · {contract.spaceCode} – {contract.spaceName} · {contract.tenantName} · {contract.startDate} – {contract.endDate} · {Number(contract.monthlyPrice).toLocaleString("vi-VN")}/tháng · {contract.status}</p>)}
          {rentalContracts.length === 0 && <p className="py-3 text-sm text-muted">Chưa có hợp đồng thuê mặt bằng.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-bold text-fg">Phân giường & chuyển phòng</h2>
        <form onSubmit={assignBed} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select required value={assign.contractId} onChange={(e) => setAssign({ ...assign, contractId: e.target.value })} className="rounded-lg border border-border bg-bg p-3">
            <option value="">Chọn hợp đồng chờ phân</option>
            {contracts.filter((c) => c.contractStatus === "pending_assignment" && c.contractId).map((c) => <option key={c.contractId ?? c.id} value={c.contractId ?? ""}>{c.contractNumber} · {c.studentName}</option>)}
          </select>
          <select required value={assign.bedId} onChange={(e) => setAssign({ ...assign, bedId: e.target.value })} className="rounded-lg border border-border bg-bg p-3">
            <option value="">Chọn giường trống</option>
            {beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.buildingCode} · tầng {bed.floorNumber} · phòng {bed.roomNumber} · giường {bed.bedNumber}</option>)}
          </select>
          <button disabled={busy} className="rounded-lg bg-primary px-4 py-3 font-bold text-white">Phân giường</button>
        </form>
        <div className="mt-4 divide-y divide-border">
          {allocations.filter((row) => row.bedId && row.allocationId).map((row) => <div key={row.allocationId} className="grid gap-2 py-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
            <p className="text-sm font-semibold">{row.studentName} · {row.contractNumber}</p>
            <p className="text-sm text-muted">{row.buildingCode} / {row.roomNumber} / {row.bedNumber}</p>
            <input type="date" value={transfer[row.allocationId!]?.date ?? ""} onChange={(e) => setTransfer({ ...transfer, [row.allocationId!]: { ...transfer[row.allocationId!], date: e.target.value, bedId: transfer[row.allocationId!]?.bedId ?? "" } })} className="rounded border border-border bg-bg p-2" />
            <div className="flex gap-2">
              <select value={transfer[row.allocationId!]?.bedId ?? ""} onChange={(e) => setTransfer({ ...transfer, [row.allocationId!]: { ...transfer[row.allocationId!], bedId: e.target.value, date: transfer[row.allocationId!]?.date ?? "" } })} className="max-w-40 rounded border border-border bg-bg p-2">
                <option value="">Giường mới</option>{beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.buildingCode}/{bed.roomNumber}/{bed.bedNumber}</option>)}
              </select>
              <button onClick={() => void moveBed(row)} className="rounded border border-primary px-3 py-2 text-sm font-bold text-primary">Chuyển</button>
            </div>
          </div>)}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-bold text-fg">Yêu cầu dịch vụ, sửa chữa & phản hồi</h2>
        <div className="mt-3 divide-y divide-border">
          {requests.map((request) => <article key={request.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_1fr_auto]">
            <div><strong>{request.title}</strong><p className="text-sm text-muted">{request.requesterName} · {request.requestType} · {request.priority}</p><p className="text-sm">{request.description}</p></div>
            <div><p className="text-sm">Trạng thái: {request.status} · Nhân viên: {request.assignedName ?? "Chưa phân"}</p><input placeholder="ID nhân viên dịch vụ" value={assignments[request.id] ?? ""} onChange={(e) => setAssignments({ ...assignments, [request.id]: e.target.value })} className="mt-2 rounded border border-border bg-bg p-2" />
              <select value={requestEdits[request.id]?.status ?? request.status} onChange={(e) => setRequestEdits({ ...requestEdits, [request.id]: { status: e.target.value as ServiceRequest["status"], staffNote: requestEdits[request.id]?.staffNote ?? request.staffNote ?? "" } })} className="mt-2 rounded border border-border bg-bg p-2">
                {(["submitted", "assigned", "in_progress", "resolved", "closed"] as const).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input placeholder="Ghi chú xử lý" value={requestEdits[request.id]?.staffNote ?? request.staffNote ?? ""} onChange={(e) => setRequestEdits({ ...requestEdits, [request.id]: { status: requestEdits[request.id]?.status ?? request.status, staffNote: e.target.value } })} className="mt-2 rounded border border-border bg-bg p-2" />
            </div>
            <button onClick={() => void updateRequest(request)} className="self-center rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary">Phân công / tiếp nhận</button>
          </article>)}
          {requests.length === 0 && <p className="py-4 text-sm text-muted">Chưa có yêu cầu.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-bold text-fg">Mặt bằng cho thuê</h2>
        <form onSubmit={saveSpace} className="mt-4 grid gap-3 sm:grid-cols-3">
          {([["spaceCode", "Mã"], ["name", "Tên"], ["location", "Vị trí"], ["areaSqm", "Diện tích (m²)"], ["monthlyPrice", "Giá tháng"], ["description", "Mô tả"]] as const).map(([key, label]) =>
            <label key={key} className="text-sm font-semibold">{label}<input required={key !== "description"} value={spaceDraft[key]} onChange={(e) => setSpaceDraft({ ...spaceDraft, [key]: e.target.value })} className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>)}
          <label className="text-sm font-semibold">Trạng thái<select value={spaceDraft.status} onChange={(e) => setSpaceDraft({ ...spaceDraft, status: e.target.value })} className="mt-1 w-full rounded border border-border bg-bg p-2"><option value="available">available</option><option value="inactive">inactive</option><option value="reserved">reserved</option><option value="occupied">occupied</option></select></label>
          <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 font-bold text-white">{editingSpaceId ? "Cập nhật mặt bằng" : "Tạo mặt bằng"}</button>
          {editingSpaceId && <button type="button" onClick={() => { setEditingSpaceId(null); setSpaceDraft({ spaceCode: "", name: "", location: "", areaSqm: "1", monthlyPrice: "0", description: "", status: "available" }); }} className="rounded-lg border border-border px-4 py-2">Hủy sửa</button>}
        </form>
        <div className="mt-3 divide-y divide-border">{rentalSpaces.map((space) => <div key={space.id} className="flex items-center justify-between py-3">
          <p><strong>{space.spaceCode} · {space.name}</strong> · {space.location} · {space.monthlyPrice}/tháng · {space.status}</p>
          <div className="flex gap-3"><button onClick={() => { setEditingSpaceId(space.id); setSpaceDraft({ spaceCode: space.spaceCode, name: space.name, location: space.location, areaSqm: String(space.areaSqm), monthlyPrice: String(space.monthlyPrice), description: space.description ?? "", status: space.status }); }} className="text-sm text-primary">Sửa</button>
          <button onClick={() => void deleteRentalSpace(space.id).then(load).catch((e) => setError(e.message))} className="text-sm text-red-700">Xóa</button></div>
        </div>)}</div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-bold text-fg">Xét duyệt đề nghị thuê mặt bằng</h2>
        <div className="mt-3 space-y-3">{rentalApplications.map((app) => <article key={app.id} className="rounded-xl border border-border p-4">
          <p className="font-bold">{app.applicationNumber} · {app.applicantName} · {app.spaceName} · {app.status}</p>
          <p className="text-sm text-muted">{app.businessName} · {app.startDate} – {app.endDate} {app.contractNumber && `· Hợp đồng ${app.contractNumber}`}</p>
          {["submitted", "under_review"].includes(app.status) && <div className="mt-3 flex gap-2">
            <button onClick={() => void reviewRental(app, "under_review")} className="rounded border px-3 py-1.5">Tiếp nhận</button>
            <button onClick={() => void reviewRental(app, "approve")} className="rounded bg-emerald-600 px-3 py-1.5 text-white">Duyệt & tạo hợp đồng</button>
            <button onClick={() => void reviewRental(app, "reject")} className="rounded bg-red-600 px-3 py-1.5 text-white">Từ chối</button>
          </div>}
        </article>)}</div>
      </section>
    </div>
  );
}

export default function ResidenceOperationsPage() {
  return <MainShell><OperationsContent /></MainShell>;
}
