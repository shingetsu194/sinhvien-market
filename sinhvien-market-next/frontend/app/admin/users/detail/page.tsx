"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Lock,
  Paperclip,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Star,
  Package,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminUserDetail } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { PRODUCT_STATUS_MAP, PRODUCT_TYPE_MAP } from "@/lib/constants/admin";
import type { AdminUserDetail, ReportStatus } from "@/lib/types/admin";
import {
  formatDateTimeVi,
  formatDateVi,
  formatVnd,
} from "@/lib/validation/admin";

const PAYMENT_LABELS: Record<string, string> = {
  cod: "COD",
  banking: "Chuyển khoản",
  zalopay: "ZaloPay",
  momo: "MoMo",
};

const REPORT_STATUS: Record<ReportStatus, { label: string; cls: string }> = {
  pending: {
    label: "Chờ xử lý",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  resolved: {
    label: "Đã xử lý",
    cls: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  },
  ignored: {
    label: "Bỏ qua",
    cls: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  },
};

function InfoRow({
  label,
  children,
  danger = false,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 border-b pb-3 text-sm last:border-0 last:pb-0",
        danger ? "border-red-100 dark:border-red-500/10" : "border-border/60",
      )}
    >
      <div
        className={cn(
          "min-w-[110px] font-bold whitespace-nowrap",
          danger ? "text-red-500/80" : "text-muted",
        )}
      >
        {label}
      </div>
      <div className="text-right font-medium break-words text-fg">{children}</div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  count,
  tone = "default",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[20px] border shadow-xs",
        tone === "danger"
          ? "border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5"
          : "border-border bg-surface",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between border-b px-5 py-4 text-sm font-extrabold",
          tone === "danger"
            ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            : "border-border bg-surface-2/50 text-fg",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 text-white">
            {icon}
          </div>
          {title}
        </div>
        {count !== undefined && (
          <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted">
            {count}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-10 text-center text-sm font-medium text-muted">
      {children}
    </div>
  );
}

function DetailContent() {
  const params = useSearchParams();
  const id = Number(params.get("id"));
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!Number.isInteger(id) || id <= 0) {
      Promise.resolve().then(() => {
        if (alive) setError("Người dùng không tồn tại.");
      });
      return () => {
        alive = false;
      };
    }
    getAdminUserDetail(id)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch((e) => {
        if (alive) {
          setError(isApiError(e) ? e.message : "Không thể tải dữ liệu người dùng.");
        }
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-16 text-center">
        <p className="mb-4 text-sm font-semibold text-muted">{error}</p>
        <Link
          href="/admin/users"
          className="text-sm font-bold text-primary no-underline hover:underline"
        >
          Quay lại danh sách người dùng
        </Link>
      </div>
    );
  }

  if (!detail) {
    return <div className="p-16 text-center text-sm text-muted">Đang tải...</div>;
  }

  const { profile: p, products, transactions, reports, ratingStats } = detail;

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 text-primary no-underline hover:underline"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          Người dùng
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="font-extrabold text-fg">{p.name}</span>
      </nav>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[320px]">
          <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-blue-600 to-sky-600 p-6 text-center text-white shadow-[0_12px_32px_rgba(99,102,241,0.25)]">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/40 bg-white/20 text-3xl font-black shadow-lg">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="relative z-10">
              <div className="mb-0.5 text-xl font-extrabold">{p.name}</div>
              <div className="text-sm font-medium text-white/80">{p.email}</div>
            </div>
            {ratingStats.count > 0 && (
              <div className="relative z-10 mt-1 flex flex-col items-center">
                <div
                  className="flex items-center gap-0.5 text-amber-300"
                  aria-label={`${ratingStats.avg} trên 5 sao`}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i <= Math.round(ratingStats.avg) && "fill-current",
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="mt-1 text-xs font-semibold text-white/80">
                  {ratingStats.avg}/5 ({ratingStats.count} đánh giá)
                </span>
              </div>
            )}
          </div>

          <SectionCard icon={<ShieldCheck className="h-4 w-4" />} title="Thông tin tài khoản">
            <div className="flex flex-col gap-3 p-5">
              <InfoRow label="ID">
                <span className="font-mono font-black">#{p.id}</span>
              </InfoRow>
              <InfoRow label="Vai trò">
                {p.role === "admin" ? (
                  <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    Admin
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    Sinh viên
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Trạng thái">
                {p.isLocked ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-300">
                    Bị khóa
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-500/20 dark:text-green-300">
                    Hoạt động
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Số gậy">{p.strikeCount}/3</InfoRow>
              <InfoRow label="Xác thực email">
                {p.isVerified ? (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    Đã xác thực
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    Chưa xác thực
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Ngày đăng ký">{formatDateTimeVi(p.createdAt)}</InfoRow>
              {p.lastVerifiedAt && (
                <InfoRow label="Xác thực lần cuối">
                  {formatDateTimeVi(p.lastVerifiedAt)}
                </InfoRow>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={<Users className="h-4 w-4" />} title="Thông tin cá nhân">
            <div className="flex flex-col gap-3 p-5">
              <InfoRow label="Họ tên">{p.name}</InfoRow>
              <InfoRow label="Email">{p.email}</InfoRow>
              <InfoRow label="Số điện thoại">{p.phone || "—"}</InfoRow>
              <InfoRow label="Câu hỏi bảo mật">{p.securityQuestion || "—"}</InfoRow>
            </div>
          </SectionCard>

          {p.isLocked && (
            <SectionCard
              icon={<Lock className="h-4 w-4" />}
              title="Chi tiết khóa tài khoản"
              tone="danger"
            >
              <div className="flex flex-col gap-3 p-5">
                <InfoRow label="Lý do" danger>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {p.lockReason || "—"}
                  </span>
                </InfoRow>
                <InfoRow label="Khóa lúc" danger>
                  {formatDateTimeVi(p.lockedAt)}
                </InfoRow>
                <InfoRow label="Hết hạn khóa" danger>
                  {p.lockedUntil ? (
                    formatDateVi(p.lockedUntil)
                  ) : (
                    <span className="font-black text-red-600">Vĩnh viễn</span>
                  )}
                </InfoRow>
              </div>
            </SectionCard>
          )}

          {p.role !== "admin" && (
            <Link
              href={`/admin/users/violations?id=${p.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-surface px-4 py-3 text-sm font-bold text-fg no-underline transition-colors hover:border-primary hover:text-primary"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Xem lịch sử nhận gậy
            </Link>
          )}
        </div>

        <div className="flex w-full flex-1 flex-col gap-6">
          <SectionCard
            icon={<Package className="h-4 w-4" />}
            title="Sản phẩm đã đăng"
            count={products.length}
          >
            {products.length === 0 ? (
              <EmptyNote>Chưa có sản phẩm nào</EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wider text-muted uppercase">
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-4 py-3">Loại</th>
                      <th className="px-4 py-3">Giá</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-surface-2/50">
                        <td className="max-w-[240px] truncate px-4 py-3 font-bold text-fg">
                          {prod.title}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              PRODUCT_TYPE_MAP[prod.type].badgeClass,
                            )}
                          >
                            {PRODUCT_TYPE_MAP[prod.type].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black whitespace-nowrap text-blue-600 dark:text-blue-300">
                          {formatVnd(prod.price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              PRODUCT_STATUS_MAP[prod.status].badgeClass,
                            )}
                          >
                            {PRODUCT_STATUS_MAP[prod.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap text-muted">
                          {formatDateVi(prod.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<Receipt className="h-4 w-4" />}
            title="Lịch sử giao dịch"
            count={transactions.length}
          >
            {transactions.length === 0 ? (
              <EmptyNote>Chưa có giao dịch nào</EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wider text-muted uppercase">
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-4 py-3">Vai trò</th>
                      <th className="px-4 py-3">Số tiền</th>
                      <th className="px-4 py-3">Thanh toán</th>
                      <th className="px-4 py-3">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface-2/50">
                        <td className="max-w-[240px] truncate px-4 py-3 font-bold text-fg">
                          {tx.productTitle}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.buyerId === p.id ? (
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                              🛍️ Người mua
                            </span>
                          ) : (
                            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                              🏷️ Người bán
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 font-black whitespace-nowrap",
                            tx.orderStatus === "cancelled"
                              ? "text-muted line-through"
                              : "text-emerald-600",
                          )}
                        >
                          {formatVnd(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium whitespace-nowrap text-muted">
                          {PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod}
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap text-muted">
                          {formatDateVi(tx.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<ShieldAlert className="h-4 w-4" />}
            title="Nhật ký bị tố cáo"
            count={reports.length}
            tone="danger"
          >
            {reports.length === 0 ? (
              <EmptyNote>Người dùng này chưa từng bị tố cáo.</EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-red-200 text-[11px] font-bold tracking-wider text-red-800/60 uppercase dark:border-red-500/20 dark:text-red-400/80">
                      <th className="px-4 py-3">Người tố cáo</th>
                      <th className="px-4 py-3">Lý do</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-500/10">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-red-50 dark:hover:bg-red-500/10">
                        <td className="px-4 py-3 font-bold whitespace-nowrap text-fg">
                          {r.reporterName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="mb-0.5 text-[12px] font-bold text-red-600">
                            {r.reason}
                          </div>
                          <div className="line-clamp-2 text-[11px] leading-relaxed text-muted">
                            {r.description}
                          </div>
                          {r.evidenceUrl && (
                            <a
                              href={r.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted no-underline hover:text-fg"
                            >
                              <Paperclip className="h-3 w-3" aria-hidden="true" />
                              Bằng chứng
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              REPORT_STATUS[r.status].cls,
                            )}
                          >
                            {REPORT_STATUS[r.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap text-muted">
                          {formatDateVi(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Chi tiết người dùng"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <Suspense
        fallback={<div className="p-16 text-center text-sm text-muted">Đang tải...</div>}
      >
        <DetailContent key={refreshKey} />
      </Suspense>
    </AdminShell>
  );
}
