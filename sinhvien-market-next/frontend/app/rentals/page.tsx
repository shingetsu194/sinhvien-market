"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileCheck2,
  MapPin,
  Maximize2,
  Send,
  Store,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  DateFieldVi,
  KtxPageHeader,
  formatIsoDateVi,
} from "@/components/residence/KtxPageHeader";
import {
  getRentalApplications,
  getRentalContracts,
  getRentalSpaces,
  submitRentalApplication,
  type RentalApplication,
  type RentalContract,
  type RentalSpace,
} from "@/lib/api/residence-operations";
import { ApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/**
 * Load the three rental lists independently. A student may browse spaces but
 * has no rental contracts (rental.contract.read is a tenant permission), so a
 * 403 on applications/contracts means "nothing to show", not a page failure.
 */
async function fetchRentalData(): Promise<{
  spaces: RentalSpace[];
  applications: RentalApplication[];
  contracts: RentalContract[];
  error: string;
}> {
  const [spaces, applications, contracts] = await Promise.allSettled([
    getRentalSpaces(),
    getRentalApplications(),
    getRentalContracts(),
  ]);
  const errors: string[] = [];
  function value<T>(result: PromiseSettledResult<T[]>, fallback: string): T[] {
    if (result.status === "fulfilled") return result.value;
    const reason: unknown = result.reason;
    if (reason instanceof ApiError && reason.status === 403) return [];
    errors.push(reason instanceof Error ? reason.message : fallback);
    return [];
  }
  return {
    spaces: value(spaces, "Không tải được mặt bằng."),
    applications: value(applications, "Không tải được đề nghị thuê."),
    contracts: value(contracts, "Không tải được hợp đồng thuê."),
    error: [...new Set(errors)].join(" "),
  };
}

const SPACE_STATUS_META: Record<string, { label: string; cls: string }> = {
  available: {
    label: "Đang trống — Nhận hồ sơ",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  occupied: {
    label: "Đã cho thuê",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  maintenance: {
    label: "Đang bảo trì",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
};

const APP_STATUS_META: Record<string, { label: string; cls: string }> = {
  submitted: {
    label: "Chờ xét duyệt",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  under_review: {
    label: "Đang thẩm định",
    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  approved: {
    label: "Đã duyệt cấp hợp đồng",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  rejected: {
    label: "Từ chối",
    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
};

function RentalsContent() {
  const { user, loadingUser } = useMainShell();
  const [spaces, setSpaces] = useState<RentalSpace[]>([]);
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [form, setForm] = useState({
    spaceId: "",
    startDate: "",
    endDate: "",
    businessName: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetchRentalData();
    setSpaces(data.spaces);
    setApplications(data.applications);
    setContracts(data.contracts);
    if (data.error) setError(data.error);
  }

  useEffect(() => {
    if (loadingUser || !user) return;
    let active = true;
    async function initialize() {
      const data = await fetchRentalData();
      if (!active) return;
      setSpaces(data.spaces);
      setApplications(data.applications);
      setContracts(data.contracts);
      if (data.error) setError(data.error);
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [loadingUser, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await submitRentalApplication({ ...form, spaceId: Number(form.spaceId) });
      setForm({
        spaceId: "",
        startDate: "",
        endDate: "",
        businessName: "",
        note: "",
      });
      setNotice("Đã gửi đề nghị thuê mặt bằng để Ban quản lý KTX xét duyệt.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không gửi được đề nghị thuê.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6">
      <KtxPageHeader
        title="Mặt bằng Dịch vụ & Ki-ốt Sinh viên KTX"
        description="Danh sách các quầy dịch vụ tiện ích (in ấn, văn phòng phẩm, đồ uống, sửa chữa laptop) trong khuôn viên KTX dành cho CLB khởi nghiệp và đối tác."
      />

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}
      {!user && !loadingUser && (
        <p className="rounded-3xl border border-border bg-surface p-6 text-center text-sm font-semibold">
          Đăng nhập với tài khoản sinh viên / đối tác để xem và gửi đề nghị thuê mặt bằng.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {spaces.map((space) => {
          const sMeta = SPACE_STATUS_META[space.status] ?? {
            label: space.status,
            cls: "bg-surface-2 text-muted",
          };
          const selected = String(space.id) === form.spaceId;
          return (
            <article
              key={space.id}
              className={cn(
                "flex flex-col justify-between rounded-3xl border bg-surface p-5 shadow-xs transition",
                selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 font-mono text-xs font-extrabold text-blue-600 dark:text-blue-300">
                    {space.spaceCode}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                      sMeta.cls,
                    )}
                  >
                    {sMeta.label}
                  </span>
                </div>

                <h2 className="mt-3 text-base font-extrabold text-fg">
                  {space.name}
                </h2>

                <div className="mt-2.5 space-y-1 text-xs text-muted">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <span>{space.location}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <span>Diện tích: {space.areaSqm} m²</span>
                  </p>
                </div>

                {space.description && (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {space.description}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
                <div>
                  <span className="text-base font-black text-primary">
                    {Number(space.monthlyPrice).toLocaleString("vi-VN")} ₫
                  </span>
                  <span className="text-xs text-muted"> / tháng</span>
                </div>
                {space.status === "available" && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        spaceId: String(space.id),
                      }))
                    }
                    className={cn(
                      "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold transition",
                      selected
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-primary hover:bg-primary hover:text-white",
                    )}
                  >
                    {selected ? "Đã chọn" : "Chọn mặt bằng"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {spaces.length === 0 && (
          <p className="text-sm text-muted">Hiện chưa có mặt bằng được đăng.</p>
        )}
      </section>

      {user && (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form
            onSubmit={submit}
            className="grid gap-4 rounded-3xl border border-border bg-surface p-5 shadow-xs sm:grid-cols-2 sm:p-6"
          >
            <div className="flex items-center gap-2.5 sm:col-span-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-fg">
                  Gửi đề nghị thuê mặt bằng
                </h2>
                <p className="text-xs text-muted">
                  Điền phương án kinh doanh phục vụ sinh viên để Ban quản lý xét duyệt.
                </p>
              </div>
            </div>

            <label className="text-xs font-bold text-muted sm:col-span-2">
              Mặt bằng đăng ký thuê
              <select
                required
                aria-label="Mặt bằng"
                value={form.spaceId}
                onChange={(e) => setForm({ ...form, spaceId: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
              >
                <option value="">Chọn mặt bằng còn trống</option>
                {spaces
                  .filter((space) => space.status === "available")
                  .map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.spaceCode} · {space.name} (
                      {Number(space.monthlyPrice).toLocaleString("vi-VN")} ₫/tháng)
                    </option>
                  ))}
              </select>
            </label>

            <DateFieldVi
              label="Ngày bắt đầu"
              required
              value={form.startDate}
              onChange={(val) => setForm({ ...form, startDate: val })}
            />
            <DateFieldVi
              label="Ngày kết thúc"
              required
              value={form.endDate}
              onChange={(val) => setForm({ ...form, endDate: val })}
            />

            <label className="text-xs font-bold text-muted sm:col-span-2">
              Tên đơn vị kinh doanh / CLB Sinh viên
              <input
                required
                maxLength={150}
                placeholder="VD: Trạm In Nhanh & Văn Phòng Phẩm SVStation..."
                value={form.businessName}
                onChange={(e) =>
                  setForm({ ...form, businessName: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
              />
            </label>

            <label className="text-xs font-bold text-muted sm:col-span-2">
              Ghi chú mặt hàng & khung giờ phục vụ
              <input
                maxLength={1000}
                placeholder="VD: Cam kết niêm yết giá sinh viên, hoạt động từ 07:00 – 21:00..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                disabled={busy}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {busy ? "Đang gửi..." : "Gửi đề nghị thuê"}
              </button>
            </div>
          </form>

          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="text-lg font-extrabold text-fg">
                Đề nghị của tôi ({applications.length})
              </h2>
              <div className="mt-3 space-y-3">
                {applications.map((app) => {
                  const aMeta = APP_STATUS_META[app.status] ?? {
                    label: app.status,
                    cls: "bg-surface-2 text-muted",
                  };
                  return (
                    <div
                      key={app.id}
                      className="rounded-2xl border border-border bg-bg p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-extrabold text-primary">
                          {app.applicationNumber}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 font-bold",
                            aMeta.cls,
                          )}
                        >
                          {aMeta.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-fg">
                        {app.businessName} — {app.spaceName}
                      </p>
                      <p className="mt-1 text-muted">
                        Thời hạn: {formatIsoDateVi(app.startDate)} –{" "}
                        {formatIsoDateVi(app.endDate)}
                      </p>
                      {app.contractNumber && (
                        <p className="mt-1.5 inline-flex items-center gap-1 font-bold text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mã hợp đồng: {app.contractNumber}
                        </p>
                      )}
                    </div>
                  );
                })}
                {applications.length === 0 && (
                  <p className="text-sm text-muted">
                    Chưa có đề nghị thuê mặt bằng nào.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="text-lg font-extrabold text-fg">
                Hợp đồng thuê mặt bằng ({contracts.length})
              </h2>
              <div className="mt-3 space-y-3">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-fg">
                        <FileCheck2 className="h-4 w-4 text-blue-500" />
                        {contract.contractNumber}
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-300">
                        Đang hiệu lực
                      </span>
                    </div>
                    <p className="mt-1.5 font-bold text-fg">
                      {contract.spaceName} ({contract.spaceCode})
                    </p>
                    <p className="mt-1 text-muted">
                      Hiệu lực: {formatIsoDateVi(contract.startDate)} –{" "}
                      {formatIsoDateVi(contract.endDate)} ·{" "}
                      <strong className="text-primary">
                        {Number(contract.monthlyPrice).toLocaleString("vi-VN")}{" "}
                        ₫/tháng
                      </strong>
                    </p>
                  </div>
                ))}
                {contracts.length === 0 && (
                  <p className="text-sm text-muted">
                    Chưa có hợp đồng thuê mặt bằng.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RentalsPage() {
  return (
    <MainShell>
      <RentalsContent />
    </MainShell>
  );
}
