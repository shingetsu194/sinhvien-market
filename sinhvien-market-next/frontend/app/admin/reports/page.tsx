"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Download,
  ExternalLink,
  Filter,
  RotateCcw,
  Search,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { ExportModal } from "@/components/admin/ExportModal";
import { adminInputClass, adminLabelClass } from "@/components/admin/Modal";
import { getTransactionReports } from "@/lib/api/admin";
import type { AdminTransaction, OrderStatus, PaymentMethod } from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import {
  formatDateTimeVi,
  formatDateVi,
  formatVnd,
  validateDateRange,
} from "@/lib/validation/admin";

const DEFAULT_FROM = "2026-10-01";
const DEFAULT_TO = "2026-10-31";

const PAYMENT_METHOD_LABELS: Record<
  PaymentMethod,
  { label: string; badgeClass: string }
> = {
  cod: {
    label: "💵 COD",
    badgeClass:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  banking: {
    label: "🏦 Chuyển khoản",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  zalopay: {
    label: "⚡ ZaloPay",
    badgeClass:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  },
  momo: {
    label: "💳 MoMo",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
};

const ORDER_STATUS_LABELS: Record<
  OrderStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "Chờ xử lý",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  delivered: {
    label: "Đang giao",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  shipping: {
    label: "Đang vận chuyển",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  received: {
    label: "Đã nhận hàng",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  completed: {
    label: "Hoàn thành",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  cancelled: {
    label: "Đã hủy",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
};

interface ReportsContentProps {
  fromDate: string;
  toDate: string;
}

function ReportsContent({ fromDate, toDate }: ReportsContentProps) {
  const { showToast } = useAdminShell();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [avgAmount, setAvgAmount] = useState(0);
  const [byDay, setByDay] = useState<{ day: string; amount: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    getTransactionReports(fromDate, toDate)
      .then((res) => {
        if (!active) return;
        setTransactions(res.transactions);
        setTotalAmount(res.totalAmount);
        setTotalCount(res.totalCount);
        setAvgAmount(res.avgAmount);
        setByDay(res.byDay);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error ? err.message : "Không thể tải báo cáo giao dịch.";
        showToast(msg, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fromDate, toDate, showToast]);

  const maxDayAmount = useMemo(() => {
    return byDay.reduce((max, item) => Math.max(max, item.amount), 0);
  }, [byDay]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        String(tx.id).includes(q) ||
        tx.productTitle.toLowerCase().includes(q) ||
        tx.buyerName.toLowerCase().includes(q) ||
        tx.sellerName.toLowerCase().includes(q),
    );
  }, [transactions, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Tổng giá trị giao dịch
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatVnd(totalAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Khoảng ngày: {formatDateVi(fromDate)} – {formatDateVi(toDate)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Tổng số đơn phát sinh
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalCount.toLocaleString("vi-VN")} đơn
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Bao gồm giao dịch mua bán trực tiếp & đấu giá
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Giá trị trung bình / đơn
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {formatVnd(avgAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Trung bình trên {totalCount} đơn hàng trong kỳ
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Biểu đồ doanh số theo ngày
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thống kê giá trị giao dịch phát sinh theo từng ngày trong khoảng đã chọn
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
            {byDay.length} ngày có phát sinh
          </span>
        </div>

        {byDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <BarChart3 className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Không có dữ liệu biểu đồ trong khoảng thời gian này
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hãy thử mở rộng khoảng lọc &ldquo;Từ ngày – Đến ngày&rdquo; ở phía trên.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-5">
            {byDay.map((item) => {
              const heightPct =
                maxDayAmount > 0
                  ? Math.max(14, Math.round((item.amount / maxDayAmount) * 100))
                  : 14;
              return (
                <div
                  key={item.day}
                  className="group flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-blue-500/40"
                >
                  <span className="mb-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formatVnd(item.amount)}
                  </span>
                  <div className="flex h-36 w-full items-end justify-center rounded-lg bg-slate-200/50 px-4 py-2 dark:bg-slate-900/60">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[44px] rounded-t-lg bg-linear-to-t from-blue-600 to-blue-400 shadow-sm transition-all duration-300 group-hover:from-blue-500 group-hover:to-cyan-400"
                    />
                  </div>
                  <span className="mt-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {formatDateVi(item.day)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Danh sách giao dịch chi tiết ({filteredTransactions.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tra cứu thông tin người mua, người bán, phương thức thanh toán và trạng thái đơn
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, sản phẩm, người mua/bán..."
              className={cn(adminInputClass, "pl-9")}
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="mx-auto mb-2 h-9 w-9 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Không tìm thấy giao dịch nào phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc ngày.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Mã GD</th>
                  <th className="px-4 py-3.5">Sản phẩm</th>
                  <th className="px-4 py-3.5">Người mua</th>
                  <th className="px-4 py-3.5">Người bán</th>
                  <th className="px-4 py-3.5">Thanh toán</th>
                  <th className="px-4 py-3.5">Số tiền</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const payInfo = PAYMENT_METHOD_LABELS[tx.paymentMethod];
                  const statusInfo = ORDER_STATUS_LABELS[tx.orderStatus];
                  return (
                    <tr
                      key={tx.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        #{tx.id}
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="line-clamp-1 font-semibold text-slate-900 dark:text-white">
                          {tx.productTitle}
                        </p>
                        <span className="mt-0.5 inline-block text-xs text-slate-500 dark:text-slate-400">
                          {tx.type === "auction" ? "⚡ Đấu giá" : "💰 Mua bán"} • SP #{tx.productId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/users/detail?id=${tx.buyerId}`}
                          className="inline-flex items-center gap-1 font-medium text-slate-800 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
                        >
                          {tx.buyerName}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/users/detail?id=${tx.sellerId}`}
                          className="inline-flex items-center gap-1 font-medium text-slate-800 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
                        >
                          {tx.sellerName}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            payInfo.badgeClass,
                          )}
                        >
                          {payInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVnd(tx.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            statusInfo.badgeClass,
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateTimeVi(tx.createdAt)}
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

function ReportsPageInner() {
  const { showToast } = useAdminShell();
  const [draftFrom, setDraftFrom] = useState(DEFAULT_FROM);
  const [draftTo, setDraftTo] = useState(DEFAULT_TO);
  const [appliedRange, setAppliedRange] = useState({
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  });
  const [exportOpen, setExportOpen] = useState(false);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateDateRange(draftFrom, draftTo);
    if (err) {
      showToast(err, "error");
      return;
    }
    setAppliedRange({ from: draftFrom, to: draftTo });
  };

  const handleReset = () => {
    setDraftFrom(DEFAULT_FROM);
    setDraftTo(DEFAULT_TO);
    setAppliedRange({ from: DEFAULT_FROM, to: DEFAULT_TO });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <form
          onSubmit={handleApplyFilter}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="report-from" className={adminLabelClass}>
                <Calendar className="mr-1 inline h-3.5 w-3.5 text-blue-500" />
                Từ ngày
              </label>
              <input
                id="report-from"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className={cn(adminInputClass, "w-44")}
              />
            </div>

            <div>
              <label htmlFor="report-to" className={adminLabelClass}>
                <Calendar className="mr-1 inline h-3.5 w-3.5 text-blue-500" />
                Đến ngày
              </label>
              <input
                id="report-to"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className={cn(adminInputClass, "w-44")}
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-500"
            >
              <Filter className="h-4 w-4" />
              Lọc báo cáo
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4" />
              Mặc định
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Xuất báo cáo CSV
          </button>
        </form>
      </div>

      <ReportsContent
        key={`${appliedRange.from}_${appliedRange.to}`}
        fromDate={appliedRange.from}
        toDate={appliedRange.to}
      />

      <ExportModal
        open={exportOpen}
        type="transactions"
        initialFromDate={appliedRange.from}
        initialToDate={appliedRange.to}
        onClose={() => setExportOpen(false)}
        onSuccess={(msg) => showToast(msg, "success")}
      />
    </div>
  );
}

export default function AdminReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Báo cáo giao dịch"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <ReportsPageInner key={refreshKey} />
    </AdminShell>
  );
}
