"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarX2,
  Clock,
  Lock,
  LogOut,
  Mail,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { getLockInfo, logout } from "@/lib/api/auth";
import { ApiError, type LockInfo } from "@/lib/api/types";

function formatLockedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hh}:${mm}:${ss} ngày ${day}/${month}/${year}`;
}

export default function AccountLockedPage() {
  const router = useRouter();
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLockInfo()
      .then((info) => {
        if (cancelled) return;
        setLockInfo(info);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.code === "NOT_AUTHENTICATED") {
            router.replace("/login-role");
            return;
          }
          if (err.code === "NOT_LOCKED") {
            router.replace("/");
            return;
          }
        }
        router.replace("/login-role");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login-role");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 via-white to-sky-100 p-5 text-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950"
    >
      <main className="w-full max-w-[540px] rounded-[24px] border border-blue-200 bg-slate-900/95 px-6 py-10 text-center shadow-[0_25px_50px_-12px_rgba(37,99,235,0.2)] backdrop-blur-xl animate-slide-up sm:px-10 sm:py-12 dark:border-white/10">
        {loading || !lockInfo ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-300">
            <Spinner size="md" />
            <p className="text-sm">Đang kiểm tra trạng thái tài khoản...</p>
          </div>
        ) : (
          <>
            <div
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-500/15 text-red-500 shadow-[0_0_0_12px_rgba(239,68,68,0.08)]"
              aria-hidden="true"
            >
              <Lock className="h-11 w-11 animate-pulse" />
            </div>

            <h1 className="mb-3 text-[28px] font-extrabold tracking-tight text-white">
              Tài Khoản Đã Bị Khóa
            </h1>
            <p className="mb-8 text-base leading-relaxed text-slate-400">
              Xin chào{" "}
              <strong className="font-bold text-white">
                {lockInfo.name ?? "bạn"}
              </strong>
              , tài khoản của bạn hiện đang bị hạn chế truy cập.
            </p>

            <div className="mb-8 space-y-4 rounded-2xl border border-white/5 border-l-4 border-l-red-500 bg-slate-900/60 p-6 text-left">
              {lockInfo.lockedAt && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    <CalendarX2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Thời điểm bị khóa</span>
                  </div>
                  <div className="text-[15px] font-medium text-slate-100">
                    {formatLockedDate(lockInfo.lockedAt)}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lý do khóa</span>
                </div>
                <div className="text-[15px] font-medium text-slate-100">
                  {lockInfo.reason || "Vi phạm điều khoản sử dụng"}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Hệ thống sẽ mở lại vào</span>
                </div>
                <div className="text-[15px] font-semibold text-red-300">
                  {lockInfo.lockedUntil
                    ? formatLockedDate(lockInfo.lockedUntil)
                    : "Vĩnh viễn (liên hệ Admin để được hỗ trợ)"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 sm:flex-row sm:gap-4">
              <a
                href="mailto:admin@sinhvienmarket.vn?subject=Khi%E1%BA%BFu%20n%E1%BA%A1i%20kh%C3%B3a%20t%C3%A0i%20kho%E1%BA%A3n"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)]"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>Liên hệ Admin</span>
              </a>

              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-5 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-white/[0.15] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
