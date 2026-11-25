"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  FileText,
  UserPlus,
  Wrench,
  XCircle,
} from "lucide-react";
import { AdminKtxHeader } from "@/components/admin/AdminKtxHeader";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { formatIsoDateVi } from "@/components/residence/KtxPageHeader";
import {
  assignResidenceRole,
  getAssignableResidenceRoles,
  getAdminResidenceApplications,
  reviewResidenceApplication,
  type AssignableResidenceRole,
  type ResidenceApplication,
} from "@/lib/api/residence";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  submitted: {
    label: "Mới gửi",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
  },
  under_review: {
    label: "Đang thẩm định",
    cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300",
  },
  approved: {
    label: "Đã duyệt",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  rejected: {
    label: "Từ chối",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

const CONTRACT_STATUS_VI: Record<string, string> = {
  pending_assignment: "chờ phân giường",
  active: "đang hiệu lực",
  expired: "đã hết hạn",
  terminated: "đã chấm dứt",
};

const ROOM_TYPE_VI: Record<string, string> = {
  standard: "Phòng tiêu chuẩn (4–6 giường)",
  service: "Phòng dịch vụ có máy lạnh (2–4 giường)",
};

function ResidenceReviewContent() {
  const { user } = useAdminShell();
  const [applications, setApplications] = useState<ResidenceApplication[]>([]);
  const [roles, setRoles] = useState<AssignableResidenceRole[]>([]);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleKey, setRoleKey] =
    useState<AssignableResidenceRole["key"]>("dorm_manager");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canReview =
    user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  useEffect(() => {
    if (!canReview) return;
    let active = true;
    async function loadReviewData() {
      try {
        const [nextApplications, nextRoles] = await Promise.all([
          getAdminResidenceApplications(),
          user?.role === "admin"
            ? getAssignableResidenceRoles()
            : Promise.resolve([]),
        ]);
        if (!active) return;
        setApplications(nextApplications);
        setRoles(nextRoles);
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : "Không tải được hồ sơ.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReviewData();
    return () => {
      active = false;
    };
  }, [canReview, reloadKey, user]);

  async function decide(
    application: ResidenceApplication,
    decision: "under_review" | "approve" | "reject",
  ) {
    const note = notes[application.id] ?? "";
    if (decision === "reject" && !note.trim()) {
      setError("Nhập lý do trước khi từ chối hồ sơ.");
      return;
    }
    setBusyId(application.id);
    setError("");
    setNotice("");
    try {
      await reviewResidenceApplication(application.id, decision, note.trim());
      setNotice(
        decision === "approve"
          ? "Đã duyệt và tạo hợp đồng chờ phân phòng."
          : decision === "reject"
            ? "Đã từ chối hồ sơ."
            : "Đã tiếp nhận hồ sơ.",
      );
      setReloadKey((current) => current + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không cập nhật được hồ sơ.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = Number(roleUserId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      setError("Nhập ID tài khoản hợp lệ.");
      return;
    }
    setBusyId(-1);
    setError("");
    setNotice("");
    try {
      await assignResidenceRole(userId, roleKey);
      setNotice(
        "Đã cấp vai trò cho tài khoản. Quyền có hiệu lực ở các request tiếp theo.",
      );
      setRoleUserId("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không cấp được vai trò.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminKtxHeader
        title="Xét duyệt Hồ sơ Lưu trú KTX"
        description="Mỗi quyết định được ghi nhận vào lịch sử. Hồ sơ được duyệt sẽ tự động sinh hợp đồng ở trạng thái chờ phân giường."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-xl border border-blue-100 bg-surface px-3.5 py-2 text-fg">
            Tổng hồ sơ: <strong className="text-primary">{applications.length}</strong>
          </span>
          <span className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
            Chờ xử lý:{" "}
            <strong>
              {
                applications.filter((a) =>
                  ["submitted", "under_review"].includes(a.status),
                ).length
              }
            </strong>
          </span>
        </div>

        <Link
          href="/admin/residence/operations"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-primary-dark"
        >
          <Wrench className="h-4 w-4" />
          Quản lý cơ sở vật chất & dịch vụ
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
        >
          {notice}
        </div>
      )}

      {user?.role === "admin" && roles.length > 0 && (
        <form
          onSubmit={assignRole}
          className="mb-6 grid gap-3 rounded-2xl border border-blue-100 bg-surface p-5 shadow-xs sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:border-border"
        >
          <label className="text-xs font-bold text-fg">
            ID tài khoản cần phân quyền KTX
            <input
              required
              inputMode="numeric"
              placeholder="VD: 1"
              value={roleUserId}
              onChange={(event) => setRoleUserId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none focus:border-primary"
            />
          </label>
          <label className="text-xs font-bold text-fg">
            Vai trò vận hành KTX
            <select
              value={roleKey}
              onChange={(event) =>
                setRoleKey(
                  event.target.value as AssignableResidenceRole["key"],
                )
              }
              className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none focus:border-primary"
            >
              {roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busyId === -1}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-500/15 dark:text-sky-300"
          >
            <UserPlus className="h-4 w-4" />
            {busyId === -1 ? "Đang cấp…" : "Cấp vai trò"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
          Đang tải hồ sơ lưu trú…
        </div>
      ) : !canReview ? (
        <div className="rounded-2xl border border-border bg-surface p-8">
          <p className="font-bold text-fg">
            Bạn không có quyền xét duyệt hồ sơ lưu trú.
          </p>
          <p className="mt-2 text-sm text-muted">
            Cần được cấp vai trò Ban quản lý KTX hoặc Quản trị viên.
          </p>
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Chưa có hồ sơ đăng ký lưu trú.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const actionable = ["submitted", "under_review"].includes(
              application.status,
            );
            const badge = STATUS_BADGE[application.status] ?? {
              label: application.status,
              cls: "bg-blue-50 text-blue-700 border-blue-200",
            };
            return (
              <article
                key={application.id}
                className="rounded-2xl border border-blue-100 bg-surface p-5 shadow-xs sm:p-6 dark:border-border"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-extrabold text-blue-700 dark:bg-blue-500/15 dark:text-sky-300">
                        {application.applicationNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-extrabold text-fg">
                      {application.studentName || application.studentEmail}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-muted">
                      MSSV: <strong>{application.studentNumber || "—"}</strong>{" "}
                      · {application.university || "Đại học Quốc gia"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-xl bg-bg p-4 text-sm sm:grid-cols-2">
                  <p className="text-muted">
                    Thời gian đăng ký:{" "}
                    <strong className="text-fg">
                      {formatIsoDateVi(application.startDate)} –{" "}
                      {formatIsoDateVi(application.endDate)}
                    </strong>
                  </p>
                  <p className="text-muted">
                    Loại phòng:{" "}
                    <strong className="text-fg">
                      {ROOM_TYPE_VI[application.preferredRoomType] ??
                        application.preferredRoomType}
                    </strong>
                  </p>
                  {application.note && (
                    <p className="text-muted sm:col-span-2">
                      Ghi chú sinh viên:{" "}
                      <strong className="text-fg">{application.note}</strong>
                    </p>
                  )}
                  {application.decisionNote && (
                    <p className="text-muted sm:col-span-2">
                      Ghi chú xét duyệt:{" "}
                      <strong className="text-fg">
                        {application.decisionNote}
                      </strong>
                    </p>
                  )}
                  {application.contractNumber && (
                    <p className="inline-flex items-center gap-1.5 font-bold text-blue-700 sm:col-span-2 dark:text-sky-300">
                      <FileText className="h-4 w-4" />
                      Hợp đồng: {application.contractNumber} (
                      {CONTRACT_STATUS_VI[application.contractStatus ?? ""] ?? application.contractStatus})
                    </p>
                  )}
                </div>

                {actionable && (
                  <div className="mt-5 border-t border-border pt-4">
                    <label className="block text-xs font-bold text-fg">
                      Ghi chú xét duyệt (bắt buộc nếu từ chối)
                      <textarea
                        rows={2}
                        maxLength={1000}
                        placeholder="Nhập ghi chú phản hồi cho sinh viên..."
                        className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none focus:border-primary"
                        value={notes[application.id] ?? ""}
                        onChange={(event) =>
                          setNotes({
                            ...notes,
                            [application.id]: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {application.status === "submitted" && (
                        <button
                          type="button"
                          disabled={busyId === application.id}
                          onClick={() =>
                            void decide(application, "under_review")
                          }
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-sky-300"
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          Tiếp nhận
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === application.id}
                        onClick={() => void decide(application, "approve")}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Duyệt và tạo hợp đồng
                      </button>
                      <button
                        type="button"
                        disabled={busyId === application.id}
                        onClick={() => void decide(application, "reject")}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Từ chối
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminResidencePage() {
  return (
    <AdminShell title="Xét duyệt Lưu trú KTX">
      <ResidenceReviewContent />
    </AdminShell>
  );
}
