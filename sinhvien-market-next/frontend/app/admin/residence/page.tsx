"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  assignResidenceRole,
  getAssignableResidenceRoles,
  getAdminResidenceApplications,
  reviewResidenceApplication,
  type AssignableResidenceRole,
  type ResidenceApplication,
} from "@/lib/api/residence";

function ResidenceReviewContent() {
  const { user, loadingUser } = useMainShell();
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
    if (loadingUser || !canReview) return;
    let active = true;
    async function loadReviewData() {
      try {
        const [nextApplications, nextRoles] = await Promise.all([
          getAdminResidenceApplications(),
          user?.role === "admin" ? getAssignableResidenceRoles() : Promise.resolve([]),
        ]);
        if (!active) return;
        setApplications(nextApplications);
        setRoles(nextRoles);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReviewData();
    return () => {
      active = false;
    };
  }, [canReview, loadingUser, reloadKey, user]);

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
      setError(cause instanceof Error ? cause.message : "Không cập nhật được hồ sơ.");
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
      setNotice("Đã cấp vai trò cho tài khoản. Quyền có hiệu lực ở các request tiếp theo.");
      setRoleUserId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cấp được vai trò.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Ban quản lý KTX
        </p>
        <h1 className="mt-2 text-3xl font-black text-fg">Xét duyệt lưu trú</h1>
        <p className="mt-2 text-sm text-muted">
          Mỗi quyết định được ghi nhận vào lịch sử. Hồ sơ được duyệt sẽ sinh một
          hợp đồng ở trạng thái chờ phân phòng.
        </p>
        <Link href="/admin/residence/operations" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
          Quản lý cơ sở vật chất & dịch vụ
        </Link>
      </header>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {user?.role === "admin" && roles.length > 0 && (
        <form onSubmit={assignRole} className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-semibold text-fg">
            ID tài khoản
            <input required inputMode="numeric" value={roleUserId} onChange={(event) => setRoleUserId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg" />
          </label>
          <label className="text-sm font-semibold text-fg">
            Vai trò cần cấp
            <select value={roleKey} onChange={(event) => setRoleKey(event.target.value as AssignableResidenceRole["key"])} className="mt-1.5 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg">
              {roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
            </select>
          </label>
          <button disabled={busyId === -1} className="rounded-xl border border-primary px-4 py-3 text-sm font-bold text-primary disabled:opacity-50">
            {busyId === -1 ? "Đang cấp…" : "Cấp vai trò"}
          </button>
        </form>
      )}
      {loadingUser || (canReview && loading) ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-sm text-muted">Đang tải hồ sơ…</div>
      ) : !canReview ? (
        <div className="rounded-2xl border border-border bg-surface p-8">
          <p className="font-bold text-fg">Bạn không có quyền xét duyệt hồ sơ lưu trú.</p>
          <p className="mt-2 text-sm text-muted">Cần được cấp vai trò Ban quản lý KTX hoặc Quản trị viên.</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-sm text-muted">Chưa có hồ sơ đăng ký lưu trú.</div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const actionable = ["submitted", "under_review"].includes(application.status);
            return (
              <article key={application.id} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">{application.applicationNumber}</p>
                    <h2 className="mt-1 text-lg font-extrabold text-fg">{application.studentName || application.studentEmail}</h2>
                    <p className="mt-1 text-sm text-muted">{application.studentNumber} · {application.university}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">{application.status}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
                  <p>Thời gian: {application.startDate} – {application.endDate}</p>
                  <p>Loại phòng: {application.preferredRoomType}</p>
                  {application.note && <p className="sm:col-span-2">Ghi chú sinh viên: {application.note}</p>}
                  {application.decisionNote && <p className="sm:col-span-2">Ghi chú quyết định: {application.decisionNote}</p>}
                  {application.contractNumber && <p className="font-semibold text-fg sm:col-span-2">Hợp đồng: {application.contractNumber} ({application.contractStatus})</p>}
                </div>
                {actionable && (
                  <div className="mt-5 border-t border-border pt-4">
                    <label className="block text-sm font-semibold text-fg">
                      Ghi chú xét duyệt
                      <textarea
                        rows={2}
                        maxLength={1000}
                        className="mt-1.5 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg outline-none focus:border-primary"
                        value={notes[application.id] ?? ""}
                        onChange={(event) => setNotes({ ...notes, [application.id]: event.target.value })}
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.status === "submitted" && (
                        <button disabled={busyId === application.id} onClick={() => void decide(application, "under_review")} className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-fg disabled:opacity-50">Tiếp nhận</button>
                      )}
                      <button disabled={busyId === application.id} onClick={() => void decide(application, "approve")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Duyệt và tạo hợp đồng</button>
                      <button disabled={busyId === application.id} onClick={() => void decide(application, "reject")} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Từ chối</button>
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
    <MainShell>
      <ResidenceReviewContent />
    </MainShell>
  );
}
