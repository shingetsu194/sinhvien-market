"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LogIn, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FlashBanner } from "@/components/auth/FlashBanner";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { RecentAccounts } from "@/components/auth/RecentAccounts";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { login } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/types";
import { clearFlash, setFlash } from "@/lib/flash";
import { applyApiFieldErrors } from "@/lib/forms";
import { addRecentAccount } from "@/lib/recent-accounts";
import { useGuestRedirect } from "@/lib/use-guest-redirect";
import { googleLoginErrorMessage } from "@/lib/constants/auth";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export default function LoginPage() {
  useGuestRedirect();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/products");
  }, [router]);

  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // The PHP Google callback redirects here with ?oauth_error=<code> on failure.
  useEffect(() => {
    const url = new URL(window.location.href);
    const message = googleLoginErrorMessage(url.searchParams.get("oauth_error"));
    if (!message) return;
    url.searchParams.delete("oauth_error");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    queueMicrotask(() => setGoogleError(message));
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function handleSelectRecentAccount(email: string) {
    setValue("email", email, { shouldValidate: true, shouldDirty: true });
    const pwInput = document.getElementById("password");
    pwInput?.focus();
  }

  async function onSubmit(values: LoginInput) {
    clearFlash();
    setGeneralError(null);
    setGoogleNotice(null);

    try {
      const res = await login({
        role: "student",
        email: values.email,
        password: values.password,
      });

      setRateLimitError(null);

      if (res.status === "ok") {
        addRecentAccount(res.user.name, res.user.email);
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
    <AuthShell
      subtitle="Chào mừng trở lại! Đăng nhập để tiếp tục."
      footer={
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-bold text-primary hover:text-primary-dark"
            >
              Đăng ký ngay
            </Link>
          </p>
          <div>
            <Link
              href="/login-role"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-fg"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Quay lại cổng chính
            </Link>
          </div>
        </div>
      }
    >
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

      {googleError && (
        <Alert variant="danger" className="mb-4">
          {googleError}
        </Alert>
      )}

      {googleNotice && (
        <Alert variant="info" className="mb-4">
          {googleNotice}
        </Alert>
      )}

      <RecentAccounts onSelect={handleSelectRecentAccount} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@student.edu.vn"
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
          error={errors.password?.message}
          labelAside={
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-primary hover:text-primary-dark"
            >
              Quên mật khẩu?
            </Link>
          }
          {...register("password")}
        />

        <div className="pt-1">
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingText="Đang đăng nhập..."
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Đăng nhập
          </Button>
        </div>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        <span>hoặc</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton
        label="Tiếp tục với Google"
        disabled={isSubmitting}
        onNotice={(msg) => setGoogleNotice(msg)}
      />
    </AuthShell>
  );
}
