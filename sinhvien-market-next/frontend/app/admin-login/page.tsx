"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { FlashBanner } from "@/components/auth/FlashBanner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { login } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/types";
import { clearFlash, setFlash } from "@/lib/flash";
import { applyApiFieldErrors } from "@/lib/forms";
import { useGuestRedirect } from "@/lib/use-guest-redirect";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export default function AdminLoginPage() {
  useGuestRedirect();
  const router = useRouter();

  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    clearFlash();
    setGeneralError(null);

    try {
      const res = await login({
        role: "admin",
        email: values.email,
        password: values.password,
      });

      setRateLimitError(null);

      if (res.status === "ok") {
        setFlash({ variant: "success", message: res.message });
        router.push(res.redirectTo);
        return;
      }

      if (res.status === "verify_otp") {
        setFlash({ variant: "info", message: res.message });
        router.push("/verify-otp");
        return;
      }

      if (res.status === "locked") {
        router.push("/account-locked");
      }
    } catch (e) {
      if (isApiError(e)) {
        if (e.code === "VALIDATION_ERROR") {
          applyApiFieldErrors(e.fields, setError, ["email", "password"]);
          return;
        }
        if (e.code === "RATE_LIMITED") {
          setRateLimitError(e.message);
          return;
        }
        setGeneralError(e.message);
      } else {
        setGeneralError("Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 via-white to-sky-100 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 dark:text-slate-100"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 h-[460px] w-[460px] rounded-full bg-blue-400/15 blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-sky-400/15 blur-[90px]"
      />

      <main
        className="relative z-10 w-full max-w-md rounded-2xl border border-blue-100 bg-white/95 p-6 shadow-[0_24px_64px_rgba(37,99,235,0.12)] backdrop-blur-2xl animate-slide-up sm:p-8 dark:border-slate-800 dark:bg-slate-900/90"
      >
        <div className="mb-6 text-center">
          <div className="mb-1 flex items-center justify-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-field bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-md-p"
            >
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Admin<span className="text-blue-600 dark:text-sky-400">Panel</span>
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                SinhVienMarket
              </p>
            </div>
          </div>

          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-sky-300">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Yêu cầu xác thực
          </span>
        </div>

        <FlashBanner />

        {rateLimitError && (
          <Alert variant="danger" className="mb-4">
            {rateLimitError}
          </Alert>
        )}

        {generalError && (
          <Alert variant="danger" className="mb-4">
            {generalError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email quản trị"
            placeholder="admin@sinhvienmarket.vn"
            autoComplete="email"
            required
            disabled={isSubmitting}
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />

          <PasswordInput
            id="password"
            label="Mật khẩu"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            icon={<KeyRound className="h-4 w-4" />}
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isSubmitting}
              loadingText="Đang xác thực..."
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Xác thực &amp; Đăng nhập
            </Button>
          </div>
        </form>

        <div className="mt-5 flex items-center gap-2.5 rounded-field border border-blue-100 bg-blue-50/70 px-3.5 py-3 text-xs font-medium text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-sky-200">
          <Lock className="h-4 w-4 shrink-0 text-blue-600 dark:text-sky-400" aria-hidden="true" />
          <span>
            Hệ thống bảo mật theo dõi mọi lần đăng nhập. Tối đa 5 lần sai / 15
            phút.
          </span>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/login-role"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-sky-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Quay lại cổng chính
          </Link>
        </div>
      </main>
    </div>
  );
}
