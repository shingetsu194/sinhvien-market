"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  MessageSquareMore,
  Send,
  Sparkles,
  UserCheck,
  Wrench,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  KtxPageHeader,
  formatIsoDateVi,
} from "@/components/residence/KtxPageHeader";
import {
  createServiceRequest,
  getAccommodationHistory,
  getServiceRequests,
  updateServiceRequest,
  type ServiceRequest,
} from "@/lib/api/residence-operations";
import { cn } from "@/lib/cn";

const REQUEST_TYPE_LABELS: Record<ServiceRequest["requestType"], string> = {
  service: "Dịch vụ sinh hoạt",
  repair: "Báo hỏng & Sửa chữa",
  feedback: "Góp ý & Phản ánh",
};

/** Groups returned by the local repair classifier (LocalRepairClassifier.php). */
const REPAIR_CATEGORY_VI: Record<string, string> = {
  plumbing: "Điện nước – cấp thoát nước",
  electrical: "Điện",
  furniture: "Nội thất",
  cleaning: "Vệ sinh",
  other: "Khác",
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low: {
    label: "Ưu tiên Thấp",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
  normal: {
    label: "Bình thường",
    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  high: {
    label: "Ưu tiên Cao",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  urgent: {
    label: "Khẩn cấp",
    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
};

const STATUS_META: Record<
  ServiceRequest["status"],
  { label: string; cls: string }
> = {
  submitted: {
    label: "Mới tiếp nhận",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  assigned: {
    label: "Đã phân công KTV",
    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  in_progress: {
    label: "Đang xử lý",
    cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  },
  resolved: {
    label: "Đã khắc phục",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  closed: {
    label: "Đã đóng phiếu",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
};

const QUICK_REPAIR_TEMPLATES = [
  {
    type: "repair" as const,
    priority: "normal",
    title: "Bóng đèn bàn học trong phòng bị nhấp nháy",
    desc: "Đèn LED bàn học chập chờn khi bật buổi tối, nhờ kỹ thuật kiểm tra giúp.",
  },
  {
    type: "repair" as const,
    priority: "urgent",
    title: "Ổ cắm tường có tia lửa khi cắm sạc",
    desc: "Ổ cắm điện cạnh giường G2 bị lỏng và phát tia lửa, phòng đã tạm ngắt nhánh điện.",
  },
  {
    type: "service" as const,
    priority: "low",
    title: "Đăng ký vệ sinh lưới lọc quạt thông gió",
    desc: "Nhờ bộ phận dịch vụ hỗ trợ vệ sinh định kỳ quạt hút phòng tắm.",
  },
];

function ServicesContent() {
  const { user, loadingUser } = useMainShell();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [history, setHistory] = useState<
    Awaited<ReturnType<typeof getAccommodationHistory>>
  >([]);
  const [form, setForm] = useState({
    requestType: "repair" as ServiceRequest["requestType"],
    title: "",
    description: "",
    priority: "normal",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [updates, setUpdates] = useState<
    Record<number, { status: ServiceRequest["status"]; note: string }>
  >({});

  const canManage =
    user?.role === "admin" ||
    user?.roles?.includes("service_staff") === true ||
    user?.roles?.includes("dorm_manager") === true;
  const canCreate =
    user?.role === "admin" ||
    user?.role === "student" ||
    user?.roles?.includes("tenant") === true;

  async function load() {
    const [nextRequests, nextHistory] = await Promise.all([
      getServiceRequests(),
      user?.role === "admin" || user?.roles?.includes("dorm_manager")
        ? getAccommodationHistory()
        : Promise.resolve([]),
    ]);
    setRequests(nextRequests);
    setHistory(nextHistory);
  }

  useEffect(() => {
    if (loadingUser || !user) return;
    let active = true;
    async function initialize() {
      try {
        const [nextRequests, nextHistory] = await Promise.all([
          getServiceRequests(),
          user?.role === "admin" || user?.roles?.includes("dorm_manager")
            ? getAccommodationHistory()
            : Promise.resolve([]),
        ]);
        if (active) {
          setRequests(nextRequests);
          setHistory(nextHistory);
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không tải được dữ liệu.",
          );
      }
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
      const result = await createServiceRequest(form);
      if (result.classification) {
        setNotice(
          `Đã gửi phiếu hỗ trợ! Hệ thống tự động phân nhóm "${REPAIR_CATEGORY_VI[result.classification.category] ?? result.classification.category}" · Gợi ý: ${PRIORITY_META[result.classification.recommendedPriority]?.label ?? result.classification.recommendedPriority} (độ tin cậy ${Math.round(result.classification.confidence * 100)}%).`,
        );
      } else {
        setNotice("Đã gửi phiếu yêu cầu đến bộ phận kỹ thuật & dịch vụ KTX.");
      }
      setForm({
        requestType: "repair",
        title: "",
        description: "",
        priority: "normal",
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không gửi được yêu cầu.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateRequest(request: ServiceRequest) {
    const update = updates[request.id];
    if (!update) return;
    setError("");
    try {
      await updateServiceRequest(request.id, {
        status: update.status,
        staffNote: update.note,
      });
      setNotice("Đã cập nhật tiến độ xử lý yêu cầu.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không cập nhật được yêu cầu.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <KtxPageHeader
        title="Yêu cầu Sửa chữa & Dịch vụ Hỗ trợ KTX"
        description="Báo hỏng điện nước, đăng ký dịch vụ phòng ở và theo dõi tiến độ kỹ thuật viên xử lý trực tiếp."
      />

      {!user && !loadingUser && (
        <p className="rounded-3xl border border-border bg-surface p-6 text-center text-sm font-semibold text-fg">
          Đăng nhập để gửi yêu cầu sửa chữa & dịch vụ KTX.
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
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}

      {user && (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {canCreate && (
            <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-fg">
                      Tạo phiếu yêu cầu mới
                    </h2>
                    <p className="text-xs text-muted">
                      Hệ thống tự động phân loại nhóm kỹ thuật và gợi ý mức độ ưu tiên.
                    </p>
                  </div>
                </div>
                <Link
                  href="/residence/assistant"
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-300"
                >
                  <MessageSquareMore className="h-3.5 w-3.5" />
                  Hỏi Nội quy
                </Link>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-bold text-muted">
                  Mẫu điền nhanh:
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_REPAIR_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() =>
                        setForm({
                          requestType: tpl.type,
                          priority: tpl.priority,
                          title: tpl.title,
                          description: tpl.desc,
                        })
                      }
                      className="cursor-pointer rounded-xl border border-border bg-bg px-2.5 py-1 text-left text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-fg"
                    >
                      + {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={submit} className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-muted">
                    Loại yêu cầu
                    <select
                      value={form.requestType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          requestType: e.target
                            .value as ServiceRequest["requestType"],
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
                    >
                      <option value="service">Dịch vụ</option>
                      <option value="repair">Sửa chữa</option>
                      <option value="feedback">Phản hồi</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Mức ưu tiên mong muốn
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm({ ...form, priority: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
                    >
                      <option value="low">Thấp</option>
                      <option value="normal">Bình thường</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-bold text-muted">
                  Tiêu đề phiếu hỗ trợ
                  <input
                    required
                    minLength={3}
                    maxLength={160}
                    placeholder="VD: Đèn tuýp bàn học phòng B2-304 bị nhấp nháy..."
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
                  />
                </label>

                <label className="block text-xs font-bold text-muted">
                  Mô tả chi tiết tình trạng & vị trí trong phòng
                  <textarea
                    required
                    minLength={3}
                    maxLength={2000}
                    rows={4}
                    placeholder="Mô tả rõ thiết bị, vị trí giường/góc phòng và khung giờ bạn có mặt tại phòng để KTV ghé kiểm tra..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
                  />
                </label>

                <button
                  disabled={busy}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {busy ? "Đang gửi phiếu..." : "Gửi yêu cầu"}
                </button>
              </form>
            </section>
          )}

          <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-fg">
                {canManage
                  ? `Danh sách yêu cầu dịch vụ (${requests.length})`
                  : `Phiếu hỗ trợ của bạn (${requests.length})`}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                <Clock className="h-3.5 w-3.5" />
                Cập nhật trực tiếp
              </span>
            </div>

            <div className="space-y-4">
              {requests.map((item) => {
                const sMeta = STATUS_META[item.status] ?? {
                  label: item.status,
                  cls: "bg-surface-2 text-muted",
                };
                const pMeta = PRIORITY_META[item.priority] ?? {
                  label: item.priority,
                  cls: "bg-surface-2 text-muted",
                };

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-border bg-bg p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg">
                          {REQUEST_TYPE_LABELS[item.requestType]}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            pMeta.cls,
                          )}
                        >
                          {pMeta.label}
                        </span>
                        {item.roomNumber && (
                          <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-500">
                            Phòng {item.roomNumber}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-0.5 text-xs font-extrabold",
                          sMeta.cls,
                        )}
                      >
                        {sMeta.label}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-base font-extrabold text-fg">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {item.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                        {item.assignedName
                          ? `Phụ trách: ${item.assignedName}`
                          : "Đang chờ phân công KTV"}
                      </span>
                    </div>

                    {item.aiCategory && (
                      <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
                        <div className="flex items-center gap-1.5 font-extrabold text-blue-600 dark:text-blue-300">
                          <Sparkles className="h-3.5 w-3.5" />
                          Phân loại tự động: {REPAIR_CATEGORY_VI[item.aiCategory] ?? item.aiCategory} · Gợi ý:{" "}
                          {PRIORITY_META[item.aiRecommendedPriority ?? ""]?.label ?? item.aiRecommendedPriority} (
                          {Math.round((item.aiConfidence ?? 0) * 100)}%)
                        </div>
                        <p className="mt-1 text-muted">{item.aiReason}</p>
                      </div>
                    )}

                    {item.staffNote && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <strong>Phản hồi bộ phận kỹ thuật:</strong>{" "}
                          {item.staffNote}
                        </span>
                      </div>
                    )}

                    {canManage && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                        <select
                          value={updates[item.id]?.status ?? item.status}
                          onChange={(e) =>
                            setUpdates({
                              ...updates,
                              [item.id]: {
                                status: e.target
                                  .value as ServiceRequest["status"],
                                note:
                                  updates[item.id]?.note ??
                                  item.staffNote ??
                                  "",
                              },
                            })
                          }
                          className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold"
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
                              {STATUS_META[status].label}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="Ghi chú phản hồi kỹ thuật..."
                          value={
                            updates[item.id]?.note ?? item.staffNote ?? ""
                          }
                          onChange={(e) =>
                            setUpdates({
                              ...updates,
                              [item.id]: {
                                status: updates[item.id]?.status ?? item.status,
                                note: e.target.value,
                              },
                            })
                          }
                          className="min-w-48 flex-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => void updateRequest(item)}
                          className="cursor-pointer rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Cập nhật xử lý
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}

              {requests.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">
                  Chưa có phiếu yêu cầu hỗ trợ nào.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {(user?.role === "admin" || user?.roles?.includes("dorm_manager")) && (
        <section className="mt-6 rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6">
          <h2 className="text-lg font-extrabold text-fg">
            Lịch sử xếp giường & chuyển phòng
          </h2>
          <div className="mt-3 divide-y divide-border">
            {history.map((item, index) => (
              <p
                key={`${item.allocationId}-${index}`}
                className="py-3 text-sm text-fg"
              >
                Tòa <strong>{item.buildingCode}</strong> · Tầng{" "}
                {item.floorNumber} · Phòng <strong>{item.roomNumber}</strong> ·
                Giường <strong>{item.bedNumber}</strong> ·{" "}
                {formatIsoDateVi(item.startDate)} –{" "}
                {formatIsoDateVi(item.endDate)} ·{" "}
                <span className="text-muted">
                  {item.eventNote ?? item.allocationStatus}
                </span>
              </p>
            ))}
            {history.length === 0 && (
              <p className="py-4 text-sm text-muted">
                Chưa có lịch sử phân phòng.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ResidenceServicesPage() {
  return (
    <MainShell>
      <ServicesContent />
    </MainShell>
  );
}
