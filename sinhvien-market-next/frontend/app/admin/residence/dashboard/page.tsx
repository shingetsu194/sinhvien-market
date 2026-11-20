"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardCheck,
  CreditCard,
  DoorOpen,
  FileCheck2,
  Wrench,
} from "lucide-react";
import { AdminKtxHeader } from "@/components/admin/AdminKtxHeader";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import {
  getResidenceOperationsDashboard,
  type ResidenceOperationsDashboard,
} from "@/lib/api/residence-operations";

const METRIC_CARDS: Array<{
  key: keyof ResidenceOperationsDashboard;
  label: string;
  desc: string;
  icon: typeof Building2;
  tone: string;
}> = [
  {
    key: "activeBuildings",
    label: "Tòa nhà đang hoạt động",
    desc: "Khu lưu trú KTX đang mở đón sinh viên",
    icon: Building2,
    tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300",
  },
  {
    key: "activeRooms",
    label: "Phòng đang hoạt động",
    desc: "Phòng tiêu chuẩn & dịch vụ đủ điều kiện ở",
    icon: DoorOpen,
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
  {
    key: "totalBeds",
    label: "Tổng số giường",
    desc: "Tổng công suất giường nội trú toàn khu",
    icon: BedDouble,
    tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300",
  },
  {
    key: "occupiedBeds",
    label: "Giường đang sử dụng",
    desc: "Đã phân bổ cho sinh viên có hợp đồng",
    icon: BedDouble,
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    key: "openServiceRequests",
    label: "Yêu cầu dịch vụ đang mở",
    desc: "Phiếu báo hỏng & dịch vụ chờ kỹ thuật xử lý",
    icon: Wrench,
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    key: "pendingResidenceApplications",
    label: "Hồ sơ lưu trú chờ xử lý",
    desc: "Đơn đăng ký phòng chờ Ban quản lý duyệt",
    icon: ClipboardCheck,
    tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300",
  },
  {
    key: "outstandingInvoices",
    label: "Hóa đơn còn phải thu",
    desc: "Hóa đơn phí nội trú chưa tất toán",
    icon: CreditCard,
    tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  },
  {
    key: "pendingPaymentReviews",
    label: "Thanh toán chờ đối soát",
    desc: "Khoản chuyển khoản chờ kế toán xác nhận",
    icon: FileCheck2,
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
];

function DashboardContent() {
  const { user } = useAdminShell();
  const [metrics, setMetrics] = useState<ResidenceOperationsDashboard | null>(
    null,
  );
  const [error, setError] = useState("");
  const authorizedRole =
    user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  useEffect(() => {
    if (!authorizedRole) return;
    let active = true;
    getResidenceOperationsDashboard()
      .then((result) => {
        if (active) setMetrics(result);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được dashboard.",
          );
      });
    return () => {
      active = false;
    };
  }, [authorizedRole]);

  const occupancyRate =
    metrics && metrics.totalBeds > 0
      ? Math.round((metrics.occupiedBeds / metrics.totalBeds) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <AdminKtxHeader
        title="Dashboard Vận hành Ký túc xá"
        description="Tổng hợp số liệu vận hành tòa nhà, công suất giường, hồ sơ lưu trú, sửa chữa và đối soát công nợ (bảo mật thông tin định danh cư dân)."
      />

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800"
        >
          {error}
        </p>
      )}

      {metrics && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRIC_CARDS.map(({ key, label, desc, icon: Icon, tone }) => (
              <article
                key={key}
                className="rounded-2xl border border-blue-100 bg-surface p-5 shadow-xs transition hover:border-blue-300 dark:border-border"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-3xl font-black text-fg">
                    {metrics[key].toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-extrabold text-fg">{label}</p>
                <p className="mt-0.5 text-xs text-muted">{desc}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-surface p-5 shadow-xs dark:border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-fg">
                  Tỷ lệ lấp đầy giường KTX
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-sky-300">
                  {occupancyRate}%
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-blue-50 dark:bg-surface-2">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-600 to-sky-500 transition-all"
                  style={{ width: `${Math.min(100, occupancyRate)}%` }}
                />
              </div>
              <p className="mt-2.5 text-xs text-muted">
                Đang sử dụng <strong>{metrics.occupiedBeds}</strong> /{" "}
                <strong>{metrics.totalBeds}</strong> giường trên{" "}
                <strong>{metrics.activeRooms}</strong> phòng hoạt động.
              </p>
            </div>

            <Link
              href="/admin/residence"
              className="group flex flex-col justify-between rounded-2xl border border-blue-100 bg-surface p-5 shadow-xs transition hover:border-blue-400 dark:border-border"
            >
              <div>
                <span className="text-xs font-bold tracking-wider text-blue-600 uppercase dark:text-sky-400">
                  Hồ sơ & Hợp đồng
                </span>
                <h3 className="mt-1 text-base font-extrabold text-fg group-hover:text-primary">
                  Xét duyệt đơn đăng ký lưu trú
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Hiện có {metrics.pendingResidenceApplications} hồ sơ đang chờ
                  duyệt hoặc tạo hợp đồng.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">
                Đi tới xét duyệt <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/admin/residence/finance"
              className="group flex flex-col justify-between rounded-2xl border border-blue-100 bg-surface p-5 shadow-xs transition hover:border-blue-400 dark:border-border"
            >
              <div>
                <span className="text-xs font-bold tracking-wider text-blue-600 uppercase dark:text-sky-400">
                  Tài chính & Công nợ
                </span>
                <h3 className="mt-1 text-base font-extrabold text-fg group-hover:text-primary">
                  Đối soát phí & hóa đơn nội trú
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Có {metrics.pendingPaymentReviews} khoản thanh toán chờ xác
                  nhận và {metrics.outstandingInvoices} hóa đơn còn dư nợ.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">
                Mở quản lý tài chính <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

export default function ResidenceDashboardPage() {
  return (
    <AdminShell title="Dashboard Ký túc xá">
      <DashboardContent />
    </AdminShell>
  );
}
