"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Link2,
  Search,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
  UserX,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import {
  Modal,
  ModalActions,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/Modal";
import { getSystemReports, resolveSystemReport } from "@/lib/api/admin";
import type { ReportStatus, SystemReport } from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateTimeVi } from "@/lib/validation/admin";

type FilterTab = "all" | ReportStatus;

const STATUS_BADGE_MAP: Record<
  ReportStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "⏳ Chờ xử lý",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  resolved: {
    label: "✅ Đã xử lý",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  ignored: {
    label: "⏭️ Đã bỏ qua",
    badgeClass:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
};

const NOTE_PRESETS = [
  "Đã xác minh bằng chứng, gỡ bài đăng vi phạm và ghi nhận gậy cảnh cáo.",
  "Đã liên hệ hai bên để đối chất và hỗ trợ hoàn tiền đơn hàng.",
  "Nội dung tố cáo chính xác, đã khóa tạm thời tài khoản vi phạm.",
];

function validateOptionalUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/\S+$/i.test(trimmed)) return null;
  return "Link bằng chứng phải bắt đầu bằng http:// hoặc https://";
}

function SystemReportsContent() {
  const { showToast } = useAdminShell();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<SystemReport[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [resolveTarget, setResolveTarget] = useState<SystemReport | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [ignoreTarget, setIgnoreTarget] = useState<SystemReport | null>(null);
  const [ignoreNote, setIgnoreNote] = useState("");

  const reloadReports = () => {
    getSystemReports("")
      .then((res) => {
        setReports(res.reports);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Không thể tải danh sách tố cáo.";
        showToast(msg, "error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    getSystemReports("")
      .then((res) => {
        if (!active) return;
        setReports(res.reports);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error ? err.message : "Không thể tải danh sách tố cáo.";
        showToast(msg, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const counts = useMemo(() => {
    return {
      all: reports.length,
      pending: reports.filter((r) => r.status === "pending").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      ignored: reports.filter((r) => r.status === "ignored").length,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((item) => {
      if (activeTab !== "all" && item.status !== activeTab) return false;
      if (!q) return true;
      return (
        String(item.id).includes(q) ||
        item.reporterName.toLowerCase().includes(q) ||
        (item.targetName && item.targetName.toLowerCase().includes(q)) ||
        (item.productTitle && item.productTitle.toLowerCase().includes(q)) ||
        item.reason.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [reports, activeTab, searchQuery]);

  const openResolveModal = (report: SystemReport) => {
    setResolveTarget(report);
    setEvidenceUrl(report.evidenceUrl ?? "");
    setAdminNote(report.adminNote ?? "");
    setFormError(null);
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;

    const urlErr = validateOptionalUrl(evidenceUrl);
    if (urlErr) {
      setFormError(urlErr);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await resolveSystemReport({
        id: resolveTarget.id,
        status: "resolved",
        evidenceUrl: evidenceUrl.trim() || undefined,
        adminNote: adminNote.trim() || undefined,
      });
      showToast(res.message, "success");
      setResolveTarget(null);
      reloadReports();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể xử lý báo cáo.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmIgnore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ignoreTarget) return;

    setSubmitting(true);
    try {
      const res = await resolveSystemReport({
        id: ignoreTarget.id,
        status: "ignored",
        adminNote: ignoreNote.trim() || "Báo cáo không đủ căn cứ xử lý.",
      });
      showToast(res.message, "info");
      setIgnoreTarget(null);
      setIgnoreNote("");
      reloadReports();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể bỏ qua báo cáo.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "pending", label: "Chờ xử lý", count: counts.pending },
    { key: "resolved", label: "Đã xử lý", count: counts.resolved },
    { key: "ignored", label: "Bỏ qua", count: counts.ignored },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Đang chờ xử lý
            </span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {counts.pending}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Phiếu tố cáo cần Admin kiểm tra
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Đã xác minh & xử lý
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {counts.resolved}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Đã lưu bằng chứng và hướng giải quyết
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Đã bỏ qua
            </span>
            <SkipForward className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-700 dark:text-slate-200">
            {counts.ignored}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Báo cáo nhầm lẫn hoặc thiếu bằng chứng
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition",
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px]",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm người tố cáo, đối tượng, lý do..."
              className={cn(adminInputClass, "pl-9")}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Không có báo cáo vi phạm nào trong mục này
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Mọi phiếu tố cáo của sinh viên đều đã được kiểm duyệt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">#ID</th>
                  <th className="px-4 py-3.5">Người báo cáo</th>
                  <th className="px-4 py-3.5">Đối tượng bị tố cáo</th>
                  <th className="px-4 py-3.5">Lý do & Nội dung chi tiết</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Ngày gửi</th>
                  <th className="px-4 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredReports.map((rp) => {
                  const statusBadge = STATUS_BADGE_MAP[rp.status];
                  return (
                    <tr
                      key={rp.id}
                      className="align-top transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        #{rp.id}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/users/detail?id=${rp.reporterId}`}
                          className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {rp.reporterName}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          ID: #{rp.reporterId}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {rp.targetUserId && rp.targetName ? (
                          <div>
                            <Link
                              href={`/admin/users/detail?id=${rp.targetUserId}`}
                              className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline dark:text-rose-400"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              {rp.targetName}
                            </Link>
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <Link
                                href={`/admin/users/violations?id=${rp.targetUserId}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                Xem lịch sử gậy
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                        {rp.productTitle && (
                          <p className="mt-1 line-clamp-1 max-w-[220px] rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            📦 SP #{rp.productId}: {rp.productTitle}
                          </p>
                        )}
                      </td>

                      <td className="max-w-md px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {rp.reason}
                        </span>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {rp.description}
                        </p>
                        {rp.evidenceUrl && (
                          <a
                            href={rp.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Xem bằng chứng đính kèm
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {rp.adminNote && (
                          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Ghi chú Admin:{" "}
                            </span>
                            {rp.adminNote}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                            statusBadge.badgeClass,
                          )}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateTimeVi(rp.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        {rp.status === "pending" ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openResolveModal(rp)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              Xử lý
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIgnoreTarget(rp);
                                setIgnoreNote("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                            Đã hoàn tất
                          </span>
                        )}
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
        open={Boolean(resolveTarget)}
        onClose={() => {
          if (!submitting) setResolveTarget(null);
        }}
        title={
          resolveTarget
            ? `Xử lý tố cáo #${resolveTarget.id}`
            : "Xử lý tố cáo vi phạm"
        }
        subtitle={
          resolveTarget
            ? `Tố cáo từ ${resolveTarget.reporterName} đối với ${resolveTarget.targetName ?? "bài đăng"}`
            : undefined
        }
        icon={<FileCheck2 className="h-6 w-6" />}
        tone="emerald"
      >
        <form onSubmit={handleConfirmResolve} className="space-y-4">
          {resolveTarget && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-bold">Lý do: {resolveTarget.reason}</p>
              <p className="mt-1 opacity-90">{resolveTarget.description}</p>
            </div>
          )}

          <div>
            <label htmlFor="resolve-evidence" className={adminLabelClass}>
              Link bằng chứng xử lý (URL ảnh / biên bản, không bắt buộc)
            </label>
            <input
              id="resolve-evidence"
              type="text"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://sinhvienmarket.vn/evidence/..."
              className={adminInputClass}
            />
          </div>

          <div>
            <label htmlFor="resolve-note" className={adminLabelClass}>
              Ghi chú kết quả xử lý của Admin
            </label>
            <textarea
              id="resolve-note"
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Nhập kết luận xác minh và biện pháp đã áp dụng..."
              className={adminInputClass}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {NOTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAdminNote(preset)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300">
              {formError}
            </p>
          )}

          <ModalActions
            onCancel={() => setResolveTarget(null)}
            submitLabel="Xác nhận Đã xử lý"
            tone="emerald"
            submitting={submitting}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(ignoreTarget)}
        onClose={() => {
          if (!submitting) setIgnoreTarget(null);
        }}
        title={
          ignoreTarget
            ? `Bỏ qua phiếu tố cáo #${ignoreTarget.id}?`
            : "Bỏ qua phiếu tố cáo"
        }
        subtitle="Đánh dấu phiếu tố cáo này là không đủ căn cứ hoặc báo cáo nhầm lẫn."
        icon={<SkipForward className="h-6 w-6" />}
        tone="amber"
      >
        <form onSubmit={handleConfirmIgnore} className="space-y-4">
          <div>
            <label htmlFor="ignore-note" className={adminLabelClass}>
              Ghi chú lý do bỏ qua (không bắt buộc)
            </label>
            <textarea
              id="ignore-note"
              rows={2}
              value={ignoreNote}
              onChange={(e) => setIgnoreNote(e.target.value)}
              placeholder="Ví dụ: Không đủ bằng chứng xác thực vi phạm..."
              className={adminInputClass}
            />
          </div>

          <ModalActions
            onCancel={() => setIgnoreTarget(null)}
            submitLabel="Xác nhận Bỏ qua"
            tone="amber"
            submitting={submitting}
          />
        </form>
      </Modal>
    </div>
  );
}

export default function AdminSystemReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Tố cáo vi phạm"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <SystemReportsContent key={refreshKey} />
    </AdminShell>
  );
}
