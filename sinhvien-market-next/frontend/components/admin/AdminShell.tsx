"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Gauge,
  Gift,
  Images,
  Info,
  LogOut,
  Menu,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  StarHalf,
  Tags,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { FlashBanner } from "@/components/auth/FlashBanner";
import { PortalAccessDialog } from "@/components/auth/PortalAccessDialog";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getCurrentUser, logout } from "@/lib/api/auth";
import { resetAdminMockData } from "@/lib/api/mock/admin";
import type { AuthUser } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { USE_MOCK } from "@/lib/config";
import { clearFlash, setFlash } from "@/lib/flash";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface AdminShellContextValue {
  user: AuthUser;
  showToast: (message: string, variant?: ToastVariant) => void;
}

const DEFAULT_ADMIN: AuthUser = {
  id: 2,
  name: "Quản trị viên",
  email: "admin@demo.vn",
  role: "admin",
};

const AdminShellContext = createContext<AdminShellContextValue>({
  user: DEFAULT_ADMIN,
  showToast: () => {},
});

export function useAdminShell(): AdminShellContextValue {
  return useContext(AdminShellContext);
}

interface NavGroup {
  section: string;
  items: {
    href: string;
    label: string;
    icon: typeof Gauge;
    matchPrefix?: string[];
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: "Tổng quan",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: Gauge,
      },
    ],
  },
  {
    section: "Quản lý",
    items: [
      {
        href: "/admin/users",
        label: "Người dùng",
        icon: Users,
        matchPrefix: ["/admin/users"],
      },
      {
        href: "/admin/products",
        label: "Kiểm duyệt bài",
        icon: ClipboardCheck,
        matchPrefix: ["/admin/products"],
      },
      {
        href: "/admin/categories",
        label: "Danh mục",
        icon: Tags,
        matchPrefix: ["/admin/categories"],
      },
      {
        href: "/admin/giveaways",
        label: "Sự kiện Giveaway",
        icon: Gift,
        matchPrefix: ["/admin/giveaways", "/admin/giveaway-spin", "/admin/giveaway_spin"],
      },
      {
        href: "/admin/banners",
        label: "Quản lý Banner",
        icon: Images,
        matchPrefix: ["/admin/banners"],
      },
    ],
  },
  {
    section: "Báo cáo & Vi Phạm",
    items: [
      {
        href: "/admin/reports",
        label: "Báo cáo giao dịch",
        icon: BarChart3,
        matchPrefix: ["/admin/reports"],
      },
      {
        href: "/admin/system-reports",
        label: "Tố cáo vi phạm",
        icon: ShieldAlert,
        matchPrefix: ["/admin/system-reports"],
      },
      {
        href: "/admin/ratings",
        label: "Kiểm duyệt Đánh giá",
        icon: StarHalf,
        matchPrefix: ["/admin/ratings"],
      },
      {
        href: "/admin/audit-log",
        label: "Nhật ký Admin",
        icon: FileText,
        matchPrefix: ["/admin/audit-log"],
      },
    ],
  },
];

function isNavItemActive(
  pathname: string,
  href: string,
  matchPrefix?: string[],
): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  if (matchPrefix) {
    return matchPrefix.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
  return pathname === href;
}

export interface AdminShellProps {
  title: string;
  children: ReactNode;
  onResetMock?: () => void;
}

export function AdminShell({ title, children, onResetMock }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4000);
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    getCurrentUser()
      .then((u) => {
        if (!alive) return;
        if (!u) {
          router.replace("/admin-login");
          return;
        }
        if (u.role !== "admin") {
          setAccessDenied(true);
          return;
        }
        setUser(u);
      })
      .catch(() => {
        if (alive) router.replace("/admin-login");
      });
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 300);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    clearFlash();
    try {
      await logout();
      setFlash({ variant: "success", message: "Đã đăng xuất khỏi trang quản trị." });
      router.push("/admin-login");
    } catch {
      showToast("Chưa thể đăng xuất. Vui lòng thử lại.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  function handleResetDemoData() {
    resetAdminMockData();
    onResetMock?.();
    showToast("Đã khôi phục dữ liệu mẫu Admin về ban đầu.", "success");
  }

  const activeUser = user ?? DEFAULT_ADMIN;
  const userInitial = activeUser.name.trim().charAt(0).toUpperCase() || "A";

  if (accessDenied) {
    return (
      <PortalAccessDialog
        title="Không thể truy cập cổng quản trị"
        description="Khu vực này chỉ dành cho tài khoản Quản trị viên được cấp quyền. Tài khoản Sinh viên không thể truy cập hoặc thực hiện thao tác quản trị."
        confirmLabel="Quay về mua sắm"
        onClose={() => router.replace("/products")}
      />
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-sm font-semibold text-muted">
        Đang xác thực phiên quản trị...
      </div>
    );
  }

  const renderSidebarNav = (isMobile = false) => (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.section}>
          <div className="px-3 pt-3 pb-1 text-[11px] font-bold tracking-widest text-white/35 uppercase">
            {group.section}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href, item.matchPrefix);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile) setSidebarOpen(false);
                }}
                className={cn(
                  "mb-0.5 flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13.5px] font-semibold no-underline transition-all",
                  active
                    ? "border border-indigo-500/35 bg-gradient-to-br from-indigo-500/35 to-purple-500/25 text-indigo-200 shadow-[0_2px_12px_rgba(99,102,241,0.2)]"
                    : "text-white/60 hover:translate-x-0.5 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-indigo-300" : "text-white/55",
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <AdminShellContext.Provider value={{ user: activeUser, showToast }}>
      <div className="flex min-h-screen bg-bg text-fg">
        <aside
          className="fixed top-0 bottom-0 left-0 z-40 hidden w-64 flex-col overflow-x-hidden overflow-y-auto lg:flex"
          style={{
            background: "linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
          }}
        >
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 py-5 no-underline"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-white"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 4px 12px rgba(99,102,241,0.5)",
              }}
            >
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-base font-black text-white">
                Admin<span className="text-indigo-300">Panel</span>
              </div>
              <div className="text-[11px] font-bold tracking-wider text-white/40 uppercase">
                SinhVienMarket
              </div>
            </div>
          </Link>

          {renderSidebarNav(false)}

          <div className="shrink-0 space-y-1 border-t border-white/[0.06] px-3 py-3">
            {USE_MOCK && (
              <button
                type="button"
                onClick={handleResetDemoData}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-white/45 transition-all hover:bg-white/[0.07] hover:text-white/85"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Khôi phục dữ liệu mẫu
              </button>
            )}
            <Link
              href="/products"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white/45 no-underline transition-all hover:bg-white/[0.07] hover:text-white/85"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Xem trang web
            </Link>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col overflow-y-auto transition-transform duration-300 lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          style={{
            background: "linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)",
          }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 no-underline"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="text-sm font-black text-white">
                Admin<span className="text-indigo-300">Panel</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Đóng menu"
              className="cursor-pointer border-0 bg-transparent text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {renderSidebarNav(true)}
        </aside>

        <div className="flex flex-1 flex-col lg:ml-64">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-5 py-3 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Mở menu quản trị"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted transition-colors hover:bg-surface-2 lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <h1 className="m-0 flex items-center gap-2 text-lg font-extrabold text-fg">
                <span className="inline-block h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <ThemeToggle className="h-9 w-9 rounded-full" />

              <div className="flex items-center gap-2 border-l border-border pl-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #ec4899)",
                    boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                  }}
                >
                  {userInitial}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm leading-tight font-bold text-fg">
                    {activeUser.name}
                  </div>
                  <div className="text-xs text-muted">Administrator</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {loggingOut ? "Đang thoát..." : "Thoát"}
                </span>
              </button>
            </div>
          </header>

          <div className="px-5 pt-4 md:px-7">
            <FlashBanner />
          </div>

          <main className="flex-1 p-5 md:p-7">
            <div key={pathname} className="page-enter">
              {children}
            </div>
          </main>
        </div>

        <div
          aria-live="polite"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-[350px] flex-col gap-2.5"
        >
          {toasts.map((toast) => {
            const colorMap: Record<ToastVariant, string> = {
              success:
                "border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/40 dark:text-green-200",
              error:
                "border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200",
              warning:
                "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
              info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
            };
            return (
              <div
                key={toast.id}
                role="status"
                className={cn(
                  "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-sm",
                  colorMap[toast.variant],
                )}
              >
                {toast.variant === "success" && (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                )}
                {toast.variant === "error" && (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                )}
                {toast.variant === "warning" && (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                )}
                {toast.variant === "info" && (
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                )}
                <span className="flex-1 text-sm leading-relaxed font-semibold">
                  {toast.message}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setToasts((prev) => prev.filter((item) => item.id !== toast.id))
                  }
                  className="cursor-pointer border-0 bg-transparent text-current opacity-60 hover:opacity-100"
                  aria-label="Đóng thông báo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Cuộn lên đầu trang"
            className="fixed right-6 bottom-6 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-muted shadow-lg transition-all hover:border-primary hover:bg-primary hover:text-white"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </AdminShellContext.Provider>
  );
}
