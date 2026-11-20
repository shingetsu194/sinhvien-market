"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ExternalLink,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { adminInputClass } from "@/components/admin/Modal";
import { getAuditLogs } from "@/lib/api/admin";
import { AUDIT_ACTION_LABELS } from "@/lib/constants/admin";
import type { AuditAction, AuditLogEntry } from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateTimeVi } from "@/lib/validation/admin";

type ActionGroup =
  | "all"
  | "product"
  | "user"
  | "catalog"
  | "moderation"
  | "giveaway";

const GROUP_ACTIONS: Record<Exclude<ActionGroup, "all">, AuditAction[]> = {
  product: ["approve_product", "reject_product", "delete_product"],
  user: ["lock_user", "unlock_user", "strike_user"],
  catalog: [
    "create_category",
    "update_category",
    "delete_category",
    "create_banner",
    "update_banner",
    "toggle_banner",
    "delete_banner",
  ],
  moderation: ["resolve_report", "ignore_report", "toggle_rating"],
  giveaway: ["create_giveaway", "spin_giveaway", "delete_giveaway"],
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  product: "Sản phẩm",
  user: "Người dùng",
  category: "Danh mục",
  report: "Phiếu tố cáo",
  rating: "Đánh giá",
  banner: "Banner",
  giveaway: "Giveaway",
};

function AuditLogContent() {
  const { showToast } = useAdminShell();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [groupFilter, setGroupFilter] = useState<ActionGroup>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    getAuditLogs()
      .then((res) => {
        if (!active) return;
        setLogs(res);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải nhật ký hành động Admin.";
        showToast(msg, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((entry) => {
      if (groupFilter !== "all") {
        const allowed = GROUP_ACTIONS[groupFilter];
        if (!allowed.includes(entry.action)) return false;
      }
      if (!q) return true;
      const actionInfo = AUDIT_ACTION_LABELS[entry.action];
      return (
        String(entry.id).includes(q) ||
        String(entry.targetId).includes(q) ||
        entry.adminName.toLowerCase().includes(q) ||
        entry.adminEmail.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        (actionInfo && actionInfo.label.toLowerCase().includes(q)) ||
        (entry.note && entry.note.toLowerCase().includes(q))
      );
    });
  }, [logs, groupFilter, searchQuery]);

  const groups: { key: ActionGroup; label: string }[] = [
    { key: "all", label: `Tất cả (${logs.length})` },
    { key: "product", label: "Sản phẩm" },
    { key: "user", label: "Người dùng & Gậy" },
    { key: "catalog", label: "Danh mục & Banner" },
    { key: "moderation", label: "Tố cáo & Đánh giá" },
    { key: "giveaway", label: "Giveaway" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhật ký bảo mật tự động (Chỉ đọc — Read-only Audit Trail)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Mọi thao tác quản trị trên hệ thống đều được tự động ghi nhận kèm mã định danh Admin và thời gian thực.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-extrabold text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400">
          <Activity className="h-3.5 w-3.5" />
          Tổng cộng {logs.length} bản ghi
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {groups.map((grp) => (
              <button
                key={grp.key}
                type="button"
                onClick={() => setGroupFilter(grp.key)}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-xs font-bold transition",
                  groupFilter === grp.key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                {grp.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hành động, mã đối tượng, ghi chú..."
              className={cn(adminInputClass, "pl-9")}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-2 h-10 w-10 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Không tìm thấy bản ghi nhật ký nào phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thử chọn lại nhóm hành động hoặc thay đổi từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">#ID</th>
                  <th className="px-4 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Admin thực hiện</th>
                  <th className="px-4 py-3.5">Hành động</th>
                  <th className="px-4 py-3.5">Đối tượng tác động</th>
                  <th className="px-4 py-3.5">Chi tiết / Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const actionMeta = AUDIT_ACTION_LABELS[log.action] ?? {
                    label: log.action,
                    badgeClass:
                      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                  };
                  const targetLabel =
                    TARGET_TYPE_LABELS[log.targetType] ?? log.targetType;

                  return (
                    <tr
                      key={log.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        #{log.id}
                      </td>

                      <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateTimeVi(log.createdAt)}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {log.adminName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {log.adminEmail}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
                            actionMeta.badgeClass,
                          )}
                        >
                          {actionMeta.label}
                        </span>
                        <span className="ml-2 font-mono text-[11px] text-slate-400">
                          ({log.action})
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {log.targetType === "user" ? (
                          <Link
                            href={`/admin/users/detail?id=${log.targetId}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-400"
                          >
                            {targetLabel} #{log.targetId}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {targetLabel} #{log.targetId}
                          </span>
                        )}
                      </td>

                      <td className="max-w-md px-4 py-3.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {log.note || (
                          <span className="italic text-slate-400">
                            Không có ghi chú bổ sung
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
    </div>
  );
}

export default function AdminAuditLogPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Nhật ký hành động Admin"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <AuditLogContent key={refreshKey} />
    </AdminShell>
  );
}
