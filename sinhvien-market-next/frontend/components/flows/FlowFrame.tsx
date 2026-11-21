"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  Coins,
  Grid,
  Heart,
  LockKeyhole,
  MessageCircle,
  PackageOpen,
  PlusCircle,
  UserCheck,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { cn } from "@/lib/cn";

const PORTAL_NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: Grid },
  { href: "/my-listings", label: "Tin đã đăng", icon: PackageOpen },
  { href: "/products/create", label: "Đăng bán mới", icon: PlusCircle },
  { href: "/transactions", label: "Đơn mua & bán", icon: ClipboardList },
  { href: "/wishlist", label: "Yêu thích", icon: Heart },
  { href: "/chat", label: "Tin nhắn", icon: MessageCircle },
  { href: "/notifications", label: "Thông báo", icon: Bell },
  { href: "/rewards", label: "Xu thưởng", icon: Coins },
  { href: "/profile", label: "Hồ sơ", icon: UserCheck },
];

export function UserFlowApp({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted">
          Đang tải...
        </div>
      }
    >
      <MainShell>{children}</MainShell>
    </Suspense>
  );
}

export function FlowFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { user, loadingUser } = useMainShell();
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      {loadingUser ? (
        <div className="py-16 text-center text-sm text-muted">
          Đang kiểm tra phiên đăng nhập...
        </div>
      ) : !user ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-blue-100 bg-surface px-6 py-12 text-center shadow-sm dark:border-border">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-fg">
            Đăng nhập để tiếp tục
          </h1>
          <p className="mt-2 text-sm text-muted">
            Tính năng này dành cho tài khoản sinh viên trên hệ thống SinhVienMarket.
          </p>
          <Link
            href="/login-role"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Đến cổng đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <header className="relative mb-7 overflow-hidden rounded-3xl border border-blue-200/80 bg-linear-to-br from-blue-600 via-blue-700 to-sky-600 p-6 text-white shadow-lg sm:p-7 dark:border-blue-500/30">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-extrabold tracking-wider text-blue-50 uppercase">
                  Không gian Cá nhân Sinh viên
                </span>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-blue-50/90">{description}</p>
              </div>
              <div className="hidden items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2 backdrop-blur-xs sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-blue-700">
                  {user.name.trim().charAt(0).toUpperCase() || "S"}
                </span>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-white">{user.name}</p>
                  <p className="text-[11px] text-blue-100">{user.email}</p>
                </div>
              </div>
            </div>

            <nav
              aria-label="Điều hướng cổng sinh viên"
              className="relative mt-5 flex flex-wrap gap-1.5 border-t border-white/15 pt-4"
            >
              {PORTAL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/products/create" &&
                    pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition",
                      active
                        ? "bg-white text-blue-700 shadow-xs"
                        : "bg-white/15 text-blue-50 hover:bg-white/25 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        active ? "text-blue-600" : "text-sky-200",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          {children}
        </>
      )}
    </div>
  );
}

export function UserFlowLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <FlowFrame title={title} description={description}>
      {children}
    </FlowFrame>
  );
}

export function FlowAlert({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  const message = error || success;
  if (!message) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
        error
          ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
          : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
      }`}
    >
      {message}
    </div>
  );
}
