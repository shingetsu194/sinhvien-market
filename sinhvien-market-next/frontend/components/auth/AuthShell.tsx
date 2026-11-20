import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";

export interface AuthShellProps {
  subtitle?: string;
  heading?: ReactNode;
  headerIcon?: ReactNode;
  maxWidth?: "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({
  subtitle,
  heading,
  headerIcon,
  maxWidth = "md",
  children,
  footer,
}: AuthShellProps) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 via-white to-sky-100 px-4 py-8 sm:px-6 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 -right-48 h-[680px] w-[680px] rounded-full animate-float-orb"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 62%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-36 h-[500px] w-[500px] rounded-full animate-float-orb"
        style={{
          background:
            "radial-gradient(circle, rgba(14,165,233,0.16) 0%, transparent 62%)",
          animationDirection: "alternate-reverse",
          animationDuration: "10s",
        }}
      />

      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle className="border-blue-200 bg-white/85 text-slate-700 shadow-xs backdrop-blur-md hover:border-blue-400 hover:bg-white hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white" />
      </div>

      <main
        className={cn(
          "relative z-10 w-full rounded-2xl border border-blue-100 bg-white/95 p-6 shadow-[0_20px_60px_rgba(37,99,235,0.12)] backdrop-blur-xl animate-slide-up sm:p-10 dark:border-slate-700/70 dark:bg-surface/92",
          maxWidth === "lg" ? "max-w-[520px]" : "max-w-[480px]",
        )}
      >
        <div className="mb-6 text-center">
          {headerIcon ? (
            <div className="mb-3 flex justify-center">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-md-p"
              >
                {headerIcon}
              </div>
            </div>
          ) : (
            <div className="mb-2 flex justify-center">
              <Logo href="/login-role" />
            </div>
          )}

          {heading && (
            <h1 className="text-2xl font-black tracking-tight text-fg">
              {heading}
            </h1>
          )}

          {subtitle && (
            <p className="mt-1 text-sm font-medium text-muted">{subtitle}</p>
          )}
        </div>

        {children}

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </main>
    </div>
  );
}
