"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Gavel,
  Lock,
  LockOpen,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { ExportModal } from "@/components/admin/ExportModal";
import {
  adminInputClass,
  adminLabelClass,
  Modal,
  ModalActions,
} from "@/components/admin/Modal";
import { getAdminUsers, strikeUser, toggleUserLock } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { LOCK_DURATION_OPTIONS } from "@/lib/constants/admin";
import type { AdminUserRecord, LockDuration } from "@/lib/types/admin";
import { formatDateVi } from "@/lib/validation/admin";

type StatusFilter = "all" | "active" | "locked";

function strikeHint(current: number): string {
  const next = current + 1;
  if (next === 1) return "Gậy 1: người dùng nhận email cảnh cáo.";
  if (next === 2) return "Gậy 2: người dùng bị khóa 7 ngày.";
  return `Gậy ${next}: người dùng bị khóa vĩnh viễn.`;
}

function UsersContent() {
  const { user: me, showToast } = useAdminShell();
  const [users, setUsers] = useState<AdminUserRecord[] | null>(null);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [exportOpen, setExportOpen] = useState(false);

  const [striking, setStriking] = useState<AdminUserRecord | null>(null);
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeEvidence, setStrikeEvidence] = useState("");
  const [strikeError, setStrikeError] = useState<string | null>(null);

  const [locking, setLocking] = useState<AdminUserRecord | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [lockDuration, setLockDuration] = useState<LockDuration>("1week");
  const [lockError, setLockError] = useState<string | null>(null);

  const [unlocking, setUnlocking] = useState<AdminUserRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    getAdminUsers().then((data) => {
      if (alive) setUsers(data);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  const visible = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && u.isLocked) return false;
      if (filter === "locked" && !u.isLocked) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q)
      );
    });
  }, [users, query, filter]);

  function openStrike(u: AdminUserRecord) {
    setStrikeReason("");
    setStrikeEvidence("");
    setStrikeError(null);
    setStriking(u);
  }

  function openLock(u: AdminUserRecord) {
    setLockReason("");
    setLockDuration("1week");
    setLockError(null);
    setLocking(u);
  }

  function reportError(e: unknown) {
    showToast(
      isApiError(e) ? e.message : "Đã có lỗi xảy ra. Vui lòng thử lại.",
      "error",
    );
  }

  async function submitStrike(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!striking) return;
    if (!strikeReason.trim()) {
      setStrikeError("Vui lòng nhập lý do vi phạm.");
      return;
    }
    const evidence = strikeEvidence.trim();
    if (evidence && !/^https?:\/\/\S+$/i.test(evidence)) {
      setStrikeError("Link bằng chứng phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setSubmitting(true);
    try {
      const res = await strikeUser({
        userId: striking.id,
        reason: strikeReason,
        evidenceUrl: evidence || undefined,
      });
      showToast(res.message, res.action === "warning" ? "warning" : "error");
      setStriking(null);
      setVersion((v) => v + 1);
    } catch (err) {
      reportError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitLock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!locking) return;
    if (!lockReason.trim()) {
      setLockError("Vui lòng nhập lý do khóa tài khoản.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await toggleUserLock({
        userId: locking.id,
        reason: lockReason,
        duration: lockDuration,
      });
      showToast(res.message, "success");
      setLocking(null);
      setVersion((v) => v + 1);
    } catch (err) {
      reportError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmUnlock() {
    if (!unlocking) return;
    const target = unlocking;
    setSubmitting(true);
    try {
      const res = await toggleUserLock({ userId: target.id });
      showToast(res.message, "success");
      setVersion((v) => v + 1);
    } catch (err) {
      reportError(err);
    } finally {
      setSubmitting(false);
      setUnlocking(null);
    }
  }

  return (
    <div>
      <div className="relative mb-8 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 p-6 shadow-[0_16px_44px_rgba(37,99,235,0.22)] md:flex-row md:p-8">
        <div className="pointer-events-none absolute -top-[100px] right-[50px] h-[350px] w-[350px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_65%)]" />
        <div className="relative z-10 flex w-full items-center gap-4 md:w-auto">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-sky-400 text-white shadow-md">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-white/60 uppercase">
              Quản lý
            </div>
            <h2 className="my-1 text-2xl font-extrabold text-white">
              Danh sách người dùng
            </h2>
            <div className="text-xs font-medium text-white/55">
              Phạt gậy, khóa / mở khóa tài khoản sinh viên
            </div>
          </div>
        </div>
        <div className="relative z-10 flex w-full items-center gap-3 md:w-auto">
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-bold text-green-600 shadow-xs transition-colors hover:bg-white md:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Xuất Excel (CSV)
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold whitespace-nowrap text-white lg:flex">
            <Users className="h-4 w-4" aria-hidden="true" />
            {users?.length ?? 0} tài khoản
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" className="flex w-fit gap-1 rounded-xl bg-surface-2 p-1">
          {(
            [
              ["all", "Tất cả"],
              ["active", "Hoạt động"],
              ["locked", "Bị khóa"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition-all",
                filter === value
                  ? "bg-surface text-fg shadow-xs"
                  : "text-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT..."
            aria-label="Tìm người dùng"
            className={cn(adminInputClass, "py-2.5 pl-10")}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-xs">
        {users === null ? (
          <div className="p-16 text-center text-sm text-muted">Đang tải...</div>
        ) : visible.length === 0 ? (
          <div className="p-16 text-center text-sm font-semibold text-muted">
            Không tìm thấy người dùng phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-bold tracking-wider text-muted uppercase">
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Người dùng</th>
                  <th className="px-6 py-3">SĐT</th>
                  <th className="px-6 py-3">Vai trò</th>
                  <th className="px-6 py-3">Trạng thái &amp; Gậy</th>
                  <th className="px-6 py-3">Ngày tạo</th>
                  <th className="px-6 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((u, i) => {
                  const manageable = u.role !== "admin" && u.id !== me.id;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-surface-2/50"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-muted">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 text-sm font-extrabold text-white">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm leading-tight font-bold text-fg">
                              {u.name}
                            </div>
                            <div className="mt-0.5 text-xs text-muted">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium whitespace-nowrap text-muted">
                        {u.phone ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.role === "admin" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 px-3 py-1 text-[11px] font-bold text-white">
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                            Sinh viên
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.isLocked ? (
                          <div className="mb-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-300">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Bị khóa
                            </span>
                            <div
                              className={cn(
                                "mt-1 text-[11px] font-semibold",
                                u.lockedUntil ? "text-muted" : "text-red-500",
                              )}
                            >
                              {u.lockedUntil
                                ? `đến ${formatDateVi(u.lockedUntil)}`
                                : "Vĩnh viễn"}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-700 dark:bg-green-500/20 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Hoạt động
                            </span>
                          </div>
                        )}
                        {u.strikeCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-black text-white">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {u.strikeCount}/3 Gậy
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium whitespace-nowrap text-muted">
                        {formatDateVi(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/users/detail?id=${u.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 px-3 py-1.5 text-xs font-bold text-white no-underline transition-all hover:-translate-y-0.5"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Chi tiết
                          </Link>
                          {manageable && (
                            <>
                              <Link
                                href={`/admin/users/violations?id=${u.id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white no-underline transition-all hover:-translate-y-0.5"
                              >
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                Gậy ({u.strikeCount})
                              </Link>
                              <button
                                type="button"
                                onClick={() => openStrike(u)}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-red-600 to-red-700 px-3 py-1.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5"
                              >
                                <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                                Phạt gậy
                              </button>
                              {u.isLocked ? (
                                <button
                                  type="button"
                                  onClick={() => setUnlocking(u)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5"
                                >
                                  <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                  Mở khóa
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openLock(u)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-300 bg-transparent px-3 py-1.5 text-xs font-bold text-red-500 transition-all hover:bg-red-500 hover:text-white dark:border-red-800"
                                >
                                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                  Khóa
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={striking !== null}
        onClose={() => setStriking(null)}
        tone="red"
        maxWidth="max-w-[500px]"
        icon={<Gavel className="h-7 w-7" aria-hidden="true" />}
        title="Tặng gậy cảnh cáo"
        subtitle={striking ? `Xử phạt: ${striking.name}` : undefined}
      >
        {striking && (
          <form onSubmit={submitStrike} noValidate>
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{strikeHint(striking.strikeCount)}</span>
            </div>
            {strikeError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {strikeError}
              </div>
            )}
            <div className="mb-5">
              <label htmlFor="strike-reason" className={adminLabelClass}>
                Lý do vi phạm (gửi email) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="strike-reason"
                rows={4}
                value={strikeReason}
                onChange={(e) => {
                  setStrikeReason(e.target.value);
                  setStrikeError(null);
                }}
                placeholder="Ví dụ: Đăng bán hàng giả, lừa đảo, dùng ngôn từ thô tục..."
                className={cn(adminInputClass, "resize-y")}
              />
            </div>
            <div className="mb-6">
              <label htmlFor="strike-evidence" className={adminLabelClass}>
                Link bằng chứng (tùy chọn)
              </label>
              <input
                id="strike-evidence"
                type="url"
                value={strikeEvidence}
                onChange={(e) => {
                  setStrikeEvidence(e.target.value);
                  setStrikeError(null);
                }}
                placeholder="https://..."
                className={adminInputClass}
              />
            </div>
            <ModalActions
              tone="red"
              submitLabel="Xác nhận tặng gậy"
              submitting={submitting}
              onCancel={() => setStriking(null)}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={locking !== null}
        onClose={() => setLocking(null)}
        tone="amber"
        icon={<Lock className="h-7 w-7" aria-hidden="true" />}
        title="Khóa tài khoản"
        subtitle={locking ? `Khóa thủ công: ${locking.name}` : undefined}
      >
        {locking && (
          <form onSubmit={submitLock} noValidate>
            {lockError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {lockError}
              </div>
            )}
            <div className="mb-5">
              <label htmlFor="lock-duration" className={adminLabelClass}>
                Thời hạn khóa
              </label>
              <select
                id="lock-duration"
                value={lockDuration}
                onChange={(e) => setLockDuration(e.target.value as LockDuration)}
                className={cn(adminInputClass, "cursor-pointer")}
              >
                {LOCK_DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label htmlFor="lock-reason" className={adminLabelClass}>
                Lý do khóa <span className="text-red-500">*</span>
              </label>
              <textarea
                id="lock-reason"
                rows={3}
                value={lockReason}
                onChange={(e) => {
                  setLockReason(e.target.value);
                  setLockError(null);
                }}
                placeholder="Nhập lý do hiển thị cho người dùng..."
                className={cn(adminInputClass, "resize-y")}
              />
            </div>
            <ModalActions
              tone="amber"
              submitLabel="Xác nhận khóa"
              submitting={submitting}
              onCancel={() => setLocking(null)}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={unlocking !== null}
        onClose={() => setUnlocking(null)}
        tone="emerald"
        icon={<LockOpen className="h-7 w-7" aria-hidden="true" />}
        title="Mở khóa tài khoản?"
        subtitle="Thông tin khóa hiện tại sẽ bị xóa."
      >
        <p className="mb-6 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-fg">
          {unlocking?.name} ({unlocking?.email})
        </p>
        <ModalActions
          type="button"
          tone="emerald"
          submitLabel="Mở khóa"
          submitting={submitting}
          onSubmit={() => void confirmUnlock()}
          onCancel={() => setUnlocking(null)}
        />
      </Modal>

      <ExportModal
        key={exportOpen ? "open" : "closed"}
        open={exportOpen}
        type="users"
        onClose={() => setExportOpen(false)}
        onSuccess={(msg) => showToast(msg, "success")}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Quản lý người dùng"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <UsersContent key={refreshKey} />
    </AdminShell>
  );
}
