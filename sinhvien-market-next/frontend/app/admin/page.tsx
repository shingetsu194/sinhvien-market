"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gift,
  Hourglass,
  Inbox,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { getDashboardStats } from "@/lib/api/admin";
import type { DashboardStats } from "@/lib/types/admin";
import { formatShortDateTimeVi, formatVnd } from "@/lib/validation/admin";

function formatTodayVi(): string {
  const days = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const now = new Date();
  const dayName = days[now.getDay()];
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

function DashboardContent() {
  const { user } = useAdminShell();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    let alive = true;
    getDashboardStats()
      .then((data) => {
        if (alive) {
          setStats(data);
          setTodayLabel(formatTodayVi());
        }
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Không tải được dữ liệu quản trị.",
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const adminInitial = user.name.trim().charAt(0).toUpperCase() || "A";
  const pendingCount = stats?.pendingCount ?? 0;

  const statsCards = [
    {
      label: "Tổng người dùng",
      value: (stats?.totalUsers ?? 0).toLocaleString("vi-VN"),
      icon: Users,
      bg: "from-blue-500 to-sky-500",
      shadow: "shadow-blue-500/40",
      badge: "Tài khoản",
      trend: "+12%",
    },
    {
      label: "Sản phẩm đang bán",
      value: (stats?.activeProducts ?? 0).toLocaleString("vi-VN"),
      icon: ShoppingBag,
      bg: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/40",
      badge: "Đang live",
      trend: "+5%",
    },
    {
      label: "Chờ duyệt",
      value: pendingCount.toLocaleString("vi-VN"),
      icon: Hourglass,
      bg: "from-amber-500 to-red-500",
      shadow: "shadow-amber-500/40",
      badge: "Cần xử lý",
      trend: "",
    },
    {
      label: "Giao dịch hôm nay",
      value: (stats?.txToday ?? 0).toLocaleString("vi-VN"),
      icon: Receipt,
      bg: "from-cyan-500 to-blue-500",
      shadow: "shadow-cyan-500/40",
      badge: "Hôm nay",
      trend: "+8%",
    },
  ];

  const quickActions = [
    {
      href: "/admin/users",
      icon: Users,
      bg: "from-blue-500 to-sky-500",
      shadow: "shadow-blue-500/40",
      title: "Người dùng",
      desc: "Xem & khóa TK",
    },
    {
      href: "/admin/products",
      icon: ClipboardCheck,
      bg: "from-amber-500 to-red-500",
      shadow: "shadow-amber-500/40",
      title: "Kiểm duyệt",
      desc: "Duyệt & xóa",
    },
    {
      href: "/admin/categories",
      icon: Tags,
      bg: "from-cyan-500 to-blue-500",
      shadow: "shadow-cyan-500/40",
      title: "Danh mục",
      desc: "CRUD danh mục",
    },
    {
      href: "/admin/reports",
      icon: BarChart3,
      bg: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/40",
      title: "Báo cáo",
      desc: "Thống kê doanh thu",
    },
    {
      href: "/admin/giveaways",
      icon: Gift,
      bg: "from-sky-500 to-orange-500",
      shadow: "shadow-sky-500/40",
      title: "Giveaway",
      desc: "Tổ chức & quay số",
    },
    {
      href: "/admin/audit-log",
      icon: FileText,
      bg: "from-slate-500 to-slate-600",
      shadow: "shadow-slate-500/40",
      title: "Nhật ký",
      desc: "Lịch sử admin",
    },
  ];

  return (
    <div>
      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {loadError}
        </div>
      )}
      <div className="relative mb-8 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 p-8 shadow-[0_16px_44px_rgba(37,99,235,0.22)] md:flex-row md:p-10">
        <div className="pointer-events-none absolute -top-[100px] right-[50px] h-[350px] w-[350px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-[80px] left-[20%] h-[250px] w-[250px] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.25)_0%,transparent_65%)]" />

        <div className="relative z-10 flex w-full items-center gap-6 md:w-auto">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-sky-400 to-sky-400 text-2xl font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            {adminInitial}
          </div>
          <div>
            <div className="text-sm font-medium text-white/65">
              Xin chào trở lại, 👋
            </div>
            <h2 className="my-1 text-2xl font-extrabold text-white md:text-3xl">
              {user.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {todayLabel || "Hôm nay"}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Administrator
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border-[1.5px] border-amber-500/35 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-300 shadow-xs">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {pendingCount} bài chờ duyệt
            </div>
          )}
          <Link
            href="/admin/products"
            className="flex items-center gap-1.5 rounded-full border-[1.5px] border-white/30 bg-white/15 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-xs transition-colors hover:bg-white/25"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Duyệt ngay
          </Link>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group relative flex items-center gap-5 overflow-hidden rounded-[20px] border-[1.5px] border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]"
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br text-white shadow-lg ${card.bg} ${card.shadow}`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="z-10">
                <div className="text-[12.5px] font-bold tracking-wider text-muted uppercase">
                  {card.label}
                </div>
                <div className="my-1 text-3xl leading-none font-black text-fg">
                  {loading ? "…" : card.value}
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-muted">
                    {card.badge}
                  </span>
                  {card.trend && (
                    <span className="flex items-center text-xs font-bold text-emerald-500">
                      <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
                      {card.trend}
                    </span>
                  )}
                </div>
              </div>
              <div className="pointer-events-none absolute -right-2 -bottom-2 text-black/[0.04] transition-transform group-hover:scale-110 dark:text-white/[0.04]">
                <Icon className="h-20 w-20" aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[20px] border-[1.5px] border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between border-b-[1.5px] border-border bg-surface-2/40 px-6 py-5">
            <div className="flex items-center gap-3 text-base font-extrabold text-fg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-500 text-white">
                <Hourglass className="h-4 w-4" aria-hidden="true" />
              </div>
              Bài đăng chờ duyệt
            </div>
            <Link
              href="/admin/products"
              className="flex items-center gap-1.5 text-sm font-bold text-blue-500 no-underline transition-all hover:gap-2.5"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="p-2">
            {!stats || stats.recentProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-sm text-muted">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/60" />
                <span>Không có bài nào chờ duyệt</span>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {stats.recentProducts.map((p) => {
                  const typeStyle =
                    p.type === "auction"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      : p.type === "exchange"
                        ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
                  const typeText =
                    p.type === "auction"
                      ? "⚡ Đấu giá"
                      : p.type === "exchange"
                        ? "🔄 Trao đổi"
                        : "🏷️ Bán";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-500 text-sm font-extrabold text-white">
                        {p.sellerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-fg">
                          {p.title}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          bởi {p.sellerName} · {formatShortDateTimeVi(p.createdAt)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${typeStyle}`}
                      >
                        {typeText}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] border-[1.5px] border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between border-b-[1.5px] border-border bg-surface-2/40 px-6 py-5">
            <div className="flex items-center gap-3 text-base font-extrabold text-fg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                <Receipt className="h-4 w-4" aria-hidden="true" />
              </div>
              Giao dịch mới nhất
            </div>
            <Link
              href="/admin/reports"
              className="flex items-center gap-1.5 text-sm font-bold text-blue-500 no-underline transition-all hover:gap-2.5"
            >
              Báo cáo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="p-2">
            {!stats || stats.recentTx.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-sm text-muted">
                <Inbox className="h-10 w-10 text-muted/50" />
                <span>Chưa có giao dịch nào</span>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {stats.recentTx.map((t) => {
                  const isCancelled = t.orderStatus === "cancelled";
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-sm font-extrabold text-white">
                        {t.buyerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-fg">
                          {t.productTitle}
                          {isCancelled && (
                            <span className="ml-1.5 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Đã hủy
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          {t.buyerName} mua từ {t.sellerName}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-black whitespace-nowrap ${
                          isCancelled
                            ? "text-muted line-through"
                            : "text-emerald-500"
                        }`}
                      >
                        +{formatVnd(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-6">
          <h3 className="m-0 text-xl font-extrabold text-fg">Truy cập nhanh</h3>
          <p className="mt-1 text-sm text-muted">
            Điều hướng nhanh đến các tính năng quản trị
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group block rounded-[18px] border-[1.5px] border-border bg-surface p-5 text-center no-underline transition-all duration-300 hover:-translate-y-2 hover:border-transparent hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]"
              >
                <div
                  className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${action.bg} ${action.shadow}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="mb-1 truncate text-[15px] font-extrabold text-fg">
                  {action.title}
                </div>
                <div className="truncate text-[12px] text-muted">
                  {action.desc}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <AdminShell
      title="Dashboard"
      onResetMock={() => setRefreshSignal((prev) => prev + 1)}
    >
      <DashboardContent key={refreshSignal} />
    </AdminShell>
  );
}
