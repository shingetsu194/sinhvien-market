"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Lock,
  ShieldCheck,
  Store,
} from "lucide-react";
import { FlashBanner } from "@/components/auth/FlashBanner";
import { useGuestRedirect } from "@/lib/use-guest-redirect";

export default function LoginRolePage() {
  useGuestRedirect();

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 via-white to-sky-100 px-4 py-10 text-slate-900 sm:px-6 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 dark:text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-[400px] w-[400px] rounded-full bg-blue-400/20 blur-[90px] animate-float-orb"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-36 h-[500px] w-[500px] rounded-full bg-sky-400/20 blur-[90px] animate-float-orb"
        style={{
          animationDirection: "alternate-reverse",
          animationDuration: "11s",
        }}
      />

      <main className="relative z-10 w-full max-w-[900px] animate-slide-up">
        <header className="mb-10 text-center sm:mb-12">
          <h1 className="inline-flex flex-wrap items-center justify-center gap-3 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-md">
              <Store className="h-6 w-6 shrink-0" aria-hidden="true" />
            </span>
            <span>
              SinhVien<span className="text-blue-600 dark:text-sky-400">Market</span>
            </span>
          </h1>
          <p className="mt-3 text-base font-medium text-slate-600 sm:text-lg dark:text-slate-300">
            Vui lòng chọn cổng đăng nhập phù hợp với tài khoản của bạn
          </p>
        </header>

        <div className="mx-auto mb-6 max-w-md">
          <FlashBanner />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <Link
            href="/login"
            className="group relative flex flex-col items-center overflow-hidden rounded-[28px] border border-blue-100 bg-white px-7 py-10 text-center shadow-[0_12px_36px_rgba(37,99,235,0.08)] transition-all duration-300 hover:-translate-y-2 hover:border-blue-400 hover:shadow-[0_24px_48px_rgba(37,99,235,0.16)] sm:px-9 sm:py-12 dark:border-slate-800 dark:bg-slate-900/90"
          >
            <div
              className="mb-6 flex h-[84px] w-[84px] items-center justify-center rounded-[24px] border border-blue-200 bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_10px_25px_rgba(37,99,235,0.35)] dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"
              aria-hidden="true"
            >
              <GraduationCap className="h-10 w-10" />
            </div>

            <h2 className="mb-3 text-2xl font-extrabold text-slate-900 dark:text-white">
              Tài khoản Sinh Viên
            </h2>
            <p className="mb-8 flex-grow text-sm leading-relaxed text-slate-600 sm:text-[15px] dark:text-slate-300">
              Dành cho sinh viên mua bán, trao đổi giáo trình, đồ dùng học tập
              và dịch vụ nội trú KTX.
            </p>

            <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-sky-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all duration-200 group-hover:shadow-[0_8px_22px_rgba(37,99,235,0.45)]">
              <span>Đăng nhập Sinh Viên</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>

          <Link
            href="/admin-login"
            className="group relative flex flex-col items-center overflow-hidden rounded-[28px] border border-blue-100 bg-white px-7 py-10 text-center shadow-[0_12px_36px_rgba(37,99,235,0.08)] transition-all duration-300 hover:-translate-y-2 hover:border-sky-400 hover:shadow-[0_24px_48px_rgba(2,132,199,0.16)] sm:px-9 sm:py-12 dark:border-slate-800 dark:bg-slate-900/90"
          >
            <div
              className="mb-6 flex h-[84px] w-[84px] items-center justify-center rounded-[24px] border border-sky-200 bg-sky-50 text-sky-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_10px_25px_rgba(2,132,199,0.35)] dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300"
              aria-hidden="true"
            >
              <ShieldCheck className="h-10 w-10" />
            </div>

            <h2 className="mb-3 text-2xl font-extrabold text-slate-900 dark:text-white">
              Ban Quản Trị
            </h2>
            <p className="mb-8 flex-grow text-sm leading-relaxed text-slate-600 sm:text-[15px] dark:text-slate-300">
              Cổng nội bộ dành riêng cho Admin và Kiểm duyệt viên quản lý hệ
              thống chợ sinh viên & KTX.
            </p>

            <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-slate-800 to-blue-800 px-6 py-3.5 text-base font-bold text-white shadow-[0_4px_14px_rgba(30,58,138,0.25)] transition-all duration-200 group-hover:shadow-[0_8px_22px_rgba(30,58,138,0.4)]">
              <span>Đăng nhập Quản Trị</span>
              <Lock
                className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-sky-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Trở về trang chủ</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
