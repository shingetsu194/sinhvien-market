"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  CheckCircle2,
  FileText,
  Plus,
  Store,
  Wrench,
} from "lucide-react";
import { AdminKtxHeader } from "@/components/admin/AdminKtxHeader";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { formatIsoDateVi } from "@/components/residence/KtxPageHeader";
import {
  getAdminResidenceApplications,
  type ResidenceApplication,
} from "@/lib/api/residence";
import {
  assignResidenceBed,
  deleteInventoryResource,
  deleteRentalSpace,
  getAvailableBeds,
  getBedAllocations,
  getRentalApplicationsForReview,
  getRentalContracts,
  getRentalSpaces,
  getResidenceInventory,
  getServiceRequests,
  reviewRentalApplication,
  saveInventoryResource,
  saveRentalSpace,
  transferResidenceBed,
  updateServiceRequest,
  type BedAllocation,
  type RentalApplication,
  type RentalSpace,
  type ServiceRequest,
} from "@/lib/api/residence-operations";

type Resource = "buildings" | "floors" | "rooms" | "beds";
type Inventory = Awaited<ReturnType<typeof getResidenceInventory>>;

const RESOURCE_LABELS: Record<Resource, string> = {
  buildings: "Tòa nhà (buildings)",
  floors: "Tầng (floors)",
  rooms: "Phòng ở (rooms)",
  beds: "Giường (beds)",
};

const resourceFields: Record<Resource, Array<[string, string, string?]>> = {
  buildings: [
    ["code", "Mã tòa"],
    ["name", "Tên tòa"],
    ["address", "Địa chỉ"],
    ["status", "Trạng thái"],
  ],
  floors: [
    ["buildingId", "ID tòa", "number"],
    ["floorNumber", "Số tầng", "number"],
    ["name", "Tên tầng"],
  ],
  rooms: [
    ["floorId", "ID tầng", "number"],
    ["roomNumber", "Số phòng"],
    ["roomType", "Loại phòng"],
    ["capacity", "Sức chứa", "number"],
    ["status", "Trạng thái"],
  ],
  beds: [
    ["roomId", "ID phòng", "number"],
    ["bedNumber", "Mã giường"],
    ["status", "Trạng thái"],
  ],
};

const fieldClass =
  "mt-1 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none transition focus:border-primary";

function OperationsContent() {
  const { user } = useAdminShell();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [contracts, setContracts] = useState<ResidenceApplication[]>([]);
  const [allocations, setAllocations] = useState<BedAllocation[]>([]);
  const [beds, setBeds] = useState<
    Awaited<ReturnType<typeof getAvailableBeds>>
  >([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [rentalSpaces, setRentalSpaces] = useState<RentalSpace[]>([]);
  const [rentalApplications, setRentalApplications] = useState<
    RentalApplication[]
  >([]);
  const [rentalContracts, setRentalContracts] = useState<
    Awaited<ReturnType<typeof getRentalContracts>>
  >([]);
  const [resource, setResource] = useState<Resource>("buildings");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [assign, setAssign] = useState({ contractId: "", bedId: "" });
  const [transfer, setTransfer] = useState<
    Record<number, { bedId: string; date: string }>
  >({});
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [spaceDraft, setSpaceDraft] = useState({
    spaceCode: "",
    name: "",
    location: "",
    areaSqm: "1",
    monthlyPrice: "0",
    description: "",
    status: "available",
  });
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [requestEdits, setRequestEdits] = useState<
    Record<
      number,
      {
        status: ServiceRequest["status"];
        staffNote: string;
      }
    >
  >({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage =
    user?.role === "admin" || user?.roles?.includes("dorm_manager");

  async function load() {
    const [
      nextInventory,
      nextApps,
      nextAllocations,
      nextBeds,
      nextRequests,
      nextSpaces,
      nextRentalApps,
      nextRentalContracts,
    ] = await Promise.all([
      getResidenceInventory(),
      getAdminResidenceApplications(),
      getBedAllocations(),
      getAvailableBeds(),
      getServiceRequests(),
      getRentalSpaces(),
      getRentalApplicationsForReview(),
      getRentalContracts(),
    ]);
    setInventory(nextInventory);
    setContracts(nextApps);
    setAllocations(nextAllocations);
    setBeds(nextBeds);
    setRequests(nextRequests);
    setRentalSpaces(nextSpaces);
    setRentalApplications(nextRentalApps);
    setRentalContracts(nextRentalContracts);
  }

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    async function initialize() {
      try {
        const [
          nextInventory,
          nextApps,
          nextAllocations,
          nextBeds,
          nextRequests,
          nextSpaces,
          nextRentalApps,
          nextRentalContracts,
        ] = await Promise.all([
          getResidenceInventory(),
          getAdminResidenceApplications(),
          getBedAllocations(),
          getAvailableBeds(),
          getServiceRequests(),
          getRentalSpaces(),
          getRentalApplicationsForReview(),
          getRentalContracts(),
        ]);
        if (!active) return;
        setInventory(nextInventory);
        setContracts(nextApps);
        setAllocations(nextAllocations);
        setBeds(nextBeds);
        setRequests(nextRequests);
        setRentalSpaces(nextSpaces);
        setRentalApplications(nextRentalApps);
        setRentalContracts(nextRentalContracts);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được dữ liệu quản lý.",
          );
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [canManage]);

  function startCreate() {
    setEditingId(null);
    setValues(
      Object.fromEntries(
        resourceFields[resource].map(([key]) => [
          key,
          key === "status"
            ? resource === "beds"
              ? "available"
              : "active"
            : "",
        ]),
      ),
    );
  }

  function startEdit(row: Record<string, unknown>) {
    setEditingId(Number(row.id));
    setValues(
      Object.fromEntries(
        resourceFields[resource].map(([key]) => [
          key,
          String(row[key] ?? ""),
        ]),
      ),
    );
  }

  async function saveResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, , type] of resourceFields[resource]) {
        payload[key] = type === "number" ? Number(values[key]) : values[key];
      }
      await saveInventoryResource(resource, payload, editingId ?? undefined);
      setNotice("Đã lưu dữ liệu tòa nhà.");
      startCreate();
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được dữ liệu.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeResource(id: number) {
    if (
      !window.confirm(
        "Xóa dữ liệu này? Các dữ liệu đang được sử dụng sẽ được bảo vệ.",
      )
    )
      return;
    setError("");
    setNotice("");
    try {
      await deleteInventoryResource(resource, id);
      setNotice("Đã xóa dữ liệu.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa dữ liệu.",
      );
    }
  }

  async function assignBed(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await assignResidenceBed(Number(assign.contractId), Number(assign.bedId));
      setAssign({ contractId: "", bedId: "" });
      setNotice("Đã phân giường.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không phân được giường.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function moveBed(allocation: BedAllocation) {
    const allocationId = allocation.allocationId;
    if (!allocationId) return;
    const input = transfer[allocationId];
    if (!input?.bedId || !input.date) {
      setError("Chọn giường mới và ngày chuyển.");
      return;
    }
    setError("");
    try {
      await transferResidenceBed(allocationId, Number(input.bedId), input.date);
      setNotice("Đã chuyển giường và ghi lịch sử.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không chuyển được giường.",
      );
    }
  }

  async function saveSpace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveRentalSpace(
        {
          ...spaceDraft,
          areaSqm: Number(spaceDraft.areaSqm),
          monthlyPrice: Number(spaceDraft.monthlyPrice),
        },
        editingSpaceId ?? undefined,
      );
      setEditingSpaceId(null);
      setSpaceDraft({
        spaceCode: "",
        name: "",
        location: "",
        areaSqm: "1",
        monthlyPrice: "0",
        description: "",
        status: "available",
      });
      setNotice("Đã tạo mặt bằng.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được mặt bằng.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reviewRental(
    app: RentalApplication,
    decision: "under_review" | "approve" | "reject",
  ) {
    const note =
      window.prompt("Ghi chú xét duyệt (bắt buộc khi từ chối):", "") ?? "";
    if (decision === "reject" && !note.trim()) return;
    try {
      await reviewRentalApplication(app.id, decision, note.trim());
      setNotice("Đã cập nhật đề nghị thuê.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không xét duyệt được.",
      );
    }
  }

  async function updateRequest(request: ServiceRequest) {
    const input = assignments[request.id] ?? "";
    try {
      const edit = requestEdits[request.id];
      await updateServiceRequest(request.id, {
        ...(input ? { assignedTo: Number(input) } : {}),
        status:
          edit?.status ??
          (request.status === "submitted" ? "assigned" : request.status),
        ...(edit?.staffNote !== undefined ? { staffNote: edit.staffNote } : {}),
      });
      setNotice("Đã cập nhật yêu cầu.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không cập nhật được yêu cầu.",
      );
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-sm font-semibold text-fg">
        Bạn không có quyền quản lý ký túc xá.
      </div>
    );
  }

  const rows = inventory?.[resource] as unknown as
    | Array<Record<string, unknown>>
    | undefined;

  return (
    <div className="space-y-7">
      <AdminKtxHeader
        title="Cơ sở Vật chất, Phân giường & Dịch vụ KTX"
        description="Quản lý sơ đồ Tòa nhà – Tầng – Phòng – Giường, điều phối chỗ ở, xử lý phiếu sửa chữa và hợp đồng thuê mặt bằng."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-xl border border-blue-100 bg-surface px-3.5 py-2 text-fg">
            Giường trống:{" "}
            <strong className="text-primary">{beds.length}</strong>
          </span>
          <span className="rounded-xl border border-blue-100 bg-surface px-3.5 py-2 text-fg">
            Phiếu sửa chữa:{" "}
            <strong className="text-primary">{requests.length}</strong>
          </span>
          <span className="rounded-xl border border-blue-100 bg-surface px-3.5 py-2 text-fg">
            Mặt bằng dịch vụ:{" "}
            <strong className="text-primary">{rentalSpaces.length}</strong>
          </span>
        </div>
        <Link
          href="/admin/residence/dashboard"
          className="text-xs font-extrabold text-primary hover:underline"
        >
          Mở dashboard vận hành →
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
        >
          {notice}
        </p>
      )}

      <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-fg">
                Quản lý cơ sở vật chất KTX
              </h3>
              <p className="text-xs text-muted">
                Cấu trúc phân cấp: Tòa nhà → Tầng → Phòng → Giường nội trú.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startCreate}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100 dark:border-border dark:bg-surface-2 dark:text-sky-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm mới
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["buildings", "floors", "rooms", "beds"] as Resource[]).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setResource(item);
                  setEditingId(null);
                  setValues({});
                }}
                className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                  resource === item
                    ? "bg-primary text-white shadow-xs"
                    : "border border-border bg-bg text-muted hover:border-blue-300 hover:text-fg"
                }`}
              >
                {RESOURCE_LABELS[item]}
              </button>
            ),
          )}
        </div>

        <form
          onSubmit={saveResource}
          className="mt-4 grid gap-3 rounded-2xl border border-border bg-bg/60 p-4 sm:grid-cols-3"
        >
          {resourceFields[resource].map(([key, label, type]) => (
            <label key={key} className="text-xs font-bold text-fg">
              {label}
              <input
                required
                type={type ?? "text"}
                value={values[key] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal text-fg outline-none focus:border-primary"
              />
            </label>
          ))}
          <button
            disabled={busy}
            className="self-end rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
          >
            {editingId ? "Cập nhật" : "Tạo mới"}
          </button>
        </form>

        <div className="mt-4 divide-y divide-border">
          {(rows ?? []).map((row) => (
            <div
              key={String(row.id)}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <strong className="text-sm font-extrabold text-fg">
                  #{String(row.id)} ·{" "}
                  {String(
                    row.name ??
                      row.roomNumber ??
                      row.bedNumber ??
                      row.floorNumber ??
                      row.code,
                  )}
                </strong>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {JSON.stringify(row)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(row)}
                  className="cursor-pointer rounded-xl border border-border bg-bg px-3 py-1.5 text-xs font-bold text-fg transition hover:border-blue-300 hover:text-primary"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => void removeResource(Number(row.id))}
                  className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-fg">
              Phân giường & chuyển phòng sinh viên
            </h3>
            <p className="text-xs text-muted">
              Gán giường trống cho hợp đồng đã duyệt hoặc điều chuyển sang giường mới.
            </p>
          </div>
        </div>

        <form
          onSubmit={assignBed}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <select
            required
            value={assign.contractId}
            onChange={(e) =>
              setAssign({ ...assign, contractId: e.target.value })
            }
            className="rounded-xl border border-border bg-bg p-3 text-sm text-fg outline-none focus:border-primary"
          >
            <option value="">Chọn hợp đồng chờ phân</option>
            {contracts
              .filter(
                (c) =>
                  c.contractStatus === "pending_assignment" && c.contractId,
              )
              .map((c) => (
                <option key={c.contractId ?? c.id} value={c.contractId ?? ""}>
                  {c.contractNumber} · {c.studentName}
                </option>
              ))}
          </select>
          <select
            required
            value={assign.bedId}
            onChange={(e) => setAssign({ ...assign, bedId: e.target.value })}
            className="rounded-xl border border-border bg-bg p-3 text-sm text-fg outline-none focus:border-primary"
          >
            <option value="">Chọn giường trống ({beds.length})</option>
            {beds.map((bed) => (
              <option key={bed.id} value={bed.id}>
                {bed.buildingCode} · tầng {bed.floorNumber} · phòng{" "}
                {bed.roomNumber} · giường {bed.bedNumber}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            className="cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark"
          >
            Phân giường
          </button>
        </form>

        <div className="mt-4 divide-y divide-border">
          {allocations
            .filter((row) => row.bedId && row.allocationId)
            .map((row) => (
              <div
                key={row.allocationId}
                className="grid gap-3 py-3.5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
              >
                <p className="text-sm font-bold text-fg">
                  {row.studentName} ·{" "}
                  <span className="font-mono text-xs text-primary">
                    {row.contractNumber}
                  </span>
                </p>
                <p className="text-xs font-semibold text-muted">
                  Vị trí hiện tại:{" "}
                  <strong className="text-fg">
                    {row.buildingCode} / Phòng {row.roomNumber} / Giường{" "}
                    {row.bedNumber}
                  </strong>
                </p>
                <input
                  type="date"
                  value={transfer[row.allocationId!]?.date ?? ""}
                  onChange={(e) =>
                    setTransfer({
                      ...transfer,
                      [row.allocationId!]: {
                        ...transfer[row.allocationId!],
                        date: e.target.value,
                        bedId: transfer[row.allocationId!]?.bedId ?? "",
                      },
                    })
                  }
                  className="rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
                />
                <div className="flex gap-2">
                  <select
                    value={transfer[row.allocationId!]?.bedId ?? ""}
                    onChange={(e) =>
                      setTransfer({
                        ...transfer,
                        [row.allocationId!]: {
                          ...transfer[row.allocationId!],
                          bedId: e.target.value,
                          date: transfer[row.allocationId!]?.date ?? "",
                        },
                      })
                    }
                    className="max-w-44 rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
                  >
                    <option value="">Giường mới</option>
                    {beds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        {bed.buildingCode}/{bed.roomNumber}/{bed.bedNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void moveBed(row)}
                    className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100"
                  >
                    Chuyển
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-fg">
              Yêu cầu dịch vụ, sửa chữa & phản hồi ({requests.length})
            </h3>
            <p className="text-xs text-muted">
              Phân công kỹ thuật viên và cập nhật tiến độ xử lý cho sinh viên.
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-border">
          {requests.map((request) => (
            <article
              key={request.id}
              className="grid gap-3 py-4 sm:grid-cols-[1fr_1.1fr_auto] sm:items-center"
            >
              <div>
                <strong className="text-sm font-extrabold text-fg">
                  {request.title}
                </strong>
                <p className="mt-0.5 text-xs text-muted">
                  Người gửi: <strong>{request.requesterName}</strong> · Loại:{" "}
                  {request.requestType} · Ưu tiên:{" "}
                  <span className="font-bold text-primary">
                    {request.priority}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {request.description}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  Trạng thái: <strong className="text-fg">{request.status}</strong>{" "}
                  · KTV: <strong>{request.assignedName ?? "Chưa phân"}</strong>
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="ID nhân viên dịch vụ"
                    value={assignments[request.id] ?? ""}
                    onChange={(e) =>
                      setAssignments({
                        ...assignments,
                        [request.id]: e.target.value,
                      })
                    }
                    className="rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
                  />
                  <select
                    value={requestEdits[request.id]?.status ?? request.status}
                    onChange={(e) =>
                      setRequestEdits({
                        ...requestEdits,
                        [request.id]: {
                          status: e.target.value as ServiceRequest["status"],
                          staffNote:
                            requestEdits[request.id]?.staffNote ??
                            request.staffNote ??
                            "",
                        },
                      })
                    }
                    className="rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
                  >
                    {(
                      [
                        "submitted",
                        "assigned",
                        "in_progress",
                        "resolved",
                        "closed",
                      ] as const
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  placeholder="Ghi chú xử lý kỹ thuật..."
                  value={
                    requestEdits[request.id]?.staffNote ??
                    request.staffNote ??
                    ""
                  }
                  onChange={(e) =>
                    setRequestEdits({
                      ...requestEdits,
                      [request.id]: {
                        status:
                          requestEdits[request.id]?.status ?? request.status,
                        staffNote: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
                />
              </div>
              <button
                type="button"
                onClick={() => void updateRequest(request)}
                className="cursor-pointer self-center rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-primary-dark"
              >
                Phân công / tiếp nhận
              </button>
            </article>
          ))}
          {requests.length === 0 && (
            <p className="py-4 text-sm text-muted">Chưa có yêu cầu.</p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-fg">
                Quản lý Mặt bằng Cho thuê KTX
              </h3>
              <p className="text-xs text-muted">
                Ki-ốt dịch vụ sinh viên trong khuôn viên ký túc xá.
              </p>
            </div>
          </div>

          <form
            onSubmit={saveSpace}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            {(
              [
                ["spaceCode", "Mã mặt bằng"],
                ["name", "Tên mặt bằng"],
                ["location", "Vị trí"],
                ["areaSqm", "Diện tích (m²)"],
                ["monthlyPrice", "Giá tháng (VNĐ)"],
                ["description", "Mô tả"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs font-bold text-fg">
                {label}
                <input
                  required={key !== "description"}
                  value={spaceDraft[key]}
                  onChange={(e) =>
                    setSpaceDraft({ ...spaceDraft, [key]: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
            <label className="text-xs font-bold text-fg">
              Trạng thái
              <select
                value={spaceDraft.status}
                onChange={(e) =>
                  setSpaceDraft({ ...spaceDraft, status: e.target.value })
                }
                className={fieldClass}
              >
                <option value="available">available</option>
                <option value="inactive">inactive</option>
                <option value="reserved">reserved</option>
                <option value="occupied">occupied</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                disabled={busy}
                className="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark"
              >
                {editingSpaceId ? "Cập nhật mặt bằng" : "Tạo mặt bằng"}
              </button>
              {editingSpaceId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSpaceId(null);
                    setSpaceDraft({
                      spaceCode: "",
                      name: "",
                      location: "",
                      areaSqm: "1",
                      monthlyPrice: "0",
                      description: "",
                      status: "available",
                    });
                  }}
                  className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-bold"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 divide-y divide-border text-sm">
            {rentalSpaces.map((space) => (
              <div
                key={space.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-bold text-fg">
                    {space.spaceCode} · {space.name}
                  </p>
                  <p className="text-xs text-muted">
                    {space.location} ·{" "}
                    {Number(space.monthlyPrice).toLocaleString("vi-VN")} ₫/tháng
                    · {space.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSpaceId(space.id);
                      setSpaceDraft({
                        spaceCode: space.spaceCode,
                        name: space.name,
                        location: space.location,
                        areaSqm: String(space.areaSqm),
                        monthlyPrice: String(space.monthlyPrice),
                        description: space.description ?? "",
                        status: space.status,
                      });
                    }}
                    className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-primary"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void deleteRentalSpace(space.id)
                        .then(load)
                        .catch((e) => setError(e.message))
                    }
                    className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-fg">
                  Xét duyệt đề nghị thuê mặt bằng ({rentalApplications.length})
                </h3>
                <p className="text-xs text-muted">
                  Duyệt phương án kinh doanh và tự động khởi tạo hợp đồng thuê.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {rentalApplications.map((app) => (
                <article
                  key={app.id}
                  className="rounded-xl border border-border bg-bg/50 p-4 text-sm"
                >
                  <p className="font-extrabold text-fg">
                    {app.applicationNumber} · {app.applicantName} ·{" "}
                    {app.spaceName} ·{" "}
                    <span className="font-mono text-xs text-primary">
                      {app.status}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Mô hình: <strong>{app.businessName}</strong> ·{" "}
                    {formatIsoDateVi(app.startDate)} –{" "}
                    {formatIsoDateVi(app.endDate)}{" "}
                    {app.contractNumber && `· Hợp đồng ${app.contractNumber}`}
                  </p>
                  {["submitted", "under_review"].includes(app.status) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void reviewRental(app, "under_review")}
                        className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700"
                      >
                        Tiếp nhận
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewRental(app, "approve")}
                        className="cursor-pointer rounded-xl bg-primary px-3 py-1.5 text-xs font-extrabold text-white"
                      >
                        Duyệt & tạo hợp đồng
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewRental(app, "reject")}
                        className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-700"
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-fg">
                  Hợp đồng mặt bằng đang hiệu lực ({rentalContracts.length})
                </h3>
                <p className="text-xs text-muted">
                  Các ki-ốt đã ký hợp đồng khai thác dịch vụ sinh viên.
                </p>
              </div>
            </div>

            <div className="mt-3 divide-y divide-border text-sm">
              {rentalContracts.map((contract) => (
                <div key={contract.id} className="py-3">
                  <p className="font-bold text-fg">
                    {contract.contractNumber} · {contract.spaceCode} –{" "}
                    {contract.spaceName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Người thuê: <strong>{contract.tenantName}</strong> ·{" "}
                    {formatIsoDateVi(contract.startDate)} –{" "}
                    {formatIsoDateVi(contract.endDate)} ·{" "}
                    <strong className="text-primary">
                      {Number(contract.monthlyPrice).toLocaleString("vi-VN")}{" "}
                      ₫/tháng
                    </strong>{" "}
                    · {contract.status}
                  </p>
                </div>
              ))}
              {rentalContracts.length === 0 && (
                <p className="py-3 text-xs text-muted">
                  Chưa có hợp đồng thuê mặt bằng.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ResidenceOperationsPage() {
  return (
    <AdminShell title="Vận hành & Cơ sở vật chất KTX">
      <OperationsContent />
    </AdminShell>
  );
}
