"use client";

import { useEffect, useState } from "react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { getResidenceOperationsDashboard, type ResidenceOperationsDashboard } from "@/lib/api/residence-operations";

const cards: Array<[keyof ResidenceOperationsDashboard, string]> = [
  ["activeBuildings", "Tòa nhà đang hoạt động"],
  ["activeRooms", "Phòng đang hoạt động"],
  ["totalBeds", "Tổng số giường"],
  ["occupiedBeds", "Giường đang sử dụng"],
  ["openServiceRequests", "Yêu cầu dịch vụ đang mở"],
  ["pendingResidenceApplications", "Hồ sơ lưu trú chờ xử lý"],
  ["outstandingInvoices", "Hóa đơn còn phải thu"],
  ["pendingPaymentReviews", "Thanh toán chờ đối soát"],
];

function DashboardContent() {
  const { user, loadingUser } = useMainShell();
  const [metrics, setMetrics] = useState<ResidenceOperationsDashboard | null>(null);
  const [error, setError] = useState("");
  const authorizedRole = user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  useEffect(() => {
    if (loadingUser || !authorizedRole) return;
    let active = true;
    getResidenceOperationsDashboard()
      .then((result) => { if (active) setMetrics(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được dashboard."); });
    return () => { active = false; };
  }, [authorizedRole, loadingUser]);

  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <header><p className="text-sm font-bold uppercase tracking-widest text-primary">Ban quản lý KTX</p><h1 className="mt-2 text-3xl font-black text-fg">Dashboard vận hành</h1><p className="mt-2 text-sm text-muted">Chỉ hiển thị số liệu tổng hợp, không có tên, email, ghi chú hay mã định danh cư dân.</p></header>
    {!user && !loadingUser && <p className="rounded-xl border border-border p-5">Đăng nhập bằng tài khoản quản lý để xem dashboard.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {metrics && <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([key, label]) => <article key={key} className="rounded-2xl border border-border bg-surface p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-black text-fg">{metrics[key].toLocaleString("vi-VN")}</p></article>)}</section>}
  </div>;
}

export default function ResidenceDashboardPage() {
  return <MainShell><DashboardContent /></MainShell>;
}
