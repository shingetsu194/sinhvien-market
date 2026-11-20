"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  ChevronDown,
  Coins,
  Gift,
  Grid,
  Heart,
  Home,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  ClipboardList,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { FlashBanner } from "@/components/auth/FlashBanner";
import { PortalAccessDialog } from "@/components/auth/PortalAccessDialog";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getCurrentUser, logout } from "@/lib/api/auth";
import type { AuthUser } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { setFlash } from "@/lib/flash";

interface MainShellContextValue {
  user: AuthUser | null;
  loadingUser: boolean;
  refreshUser: () => void;
}

const MainShellContext = createContext<MainShellContextValue>({
  user: null,
  loadingUser: true,
  refreshUser: () => {},
});

export function useMainShell() {
  return useContext(MainShellContext);
}

interface MainShellProps {
  children: ReactNode;
  initialSearch?: string;
}

interface QuickAccessTarget {
  href: string;
}

interface PortalNotice extends QuickAccessTarget {
  title: string;
  description: string;
  confirmLabel: string;
  intent: "close" | "switch-account" | "open-admin";
}

export function MainShell({ children, initialSearch = "" }: MainShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchText, setSearchText] = useState(initialSearch);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ktxMenuOpen, setKtxMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [portalNotice, setPortalNotice] = useState<PortalNotice | null>(null);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);
  const ktxMenuRef = useRef<HTMLDivElement | null>(null);
  const navImageInputRef = useRef<HTMLInputElement | null>(null);

  const loadUser = useCallback(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoadingUser(false);
      });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
      if (
        ktxMenuRef.current &&
        !ktxMenuRef.current.contains(e.target as Node)
      ) {
        setKtxMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchText.trim();
    setMobileOpen(false);
    if (q) {
      router.push(`/products?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/products");
    }
  };

  const handleNavImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        try {
          window.sessionStorage.setItem(
            "svm_ai_search_image",
            JSON.stringify({
              dataUrl: reader.result,
              fileName: file.name,
            }),
          );
          window.dispatchEvent(new Event("svm-ai-image-updated"));
        } catch {
          // ignore storage quota
        }
        setMobileOpen(false);
        router.push(`/products?aiImage=${Date.now()}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setUserMenuOpen(false);
    setMobileOpen(false);
    try {
      await logout();
      setUser(null);
      setFlash({ variant: "success", message: "Đã đăng xuất thành công." });
      router.push("/login-role");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleQuickAccessClick = async ({ href }: QuickAccessTarget) => {
    let activeUser = user;
    if (loadingUser) {
      try {
        activeUser = await getCurrentUser();
        setUser(activeUser);
      } catch {
        setFlash({
          variant: "danger",
          message: "Chưa thể xác minh phiên đăng nhập. Vui lòng thử lại.",
        });
        return;
      }
    }

    if (!activeUser) {
      router.push(href);
      return;
    }

    if (href === "/admin-login") {
      if (activeUser.role === "admin") {
        setPortalNotice({
          href: "/admin",
          title: "Bạn đã đăng nhập với tài khoản Quản trị viên",
          description:
            "Phiên quản trị của bạn đang hoạt động. Bạn có thể vào thẳng trang quản trị mà không cần đăng nhập lại.",
          confirmLabel: "Vào trang quản trị",
          intent: "open-admin",
        });
      } else {
        setPortalNotice({
          href,
          title: "Không thể truy cập cổng quản trị",
          description:
            "Cổng này chỉ dành cho tài khoản Quản trị viên được cấp quyền. Tài khoản Sinh viên hiện tại không thể truy cập hoặc thực hiện thao tác quản trị.",
          confirmLabel: "Đã hiểu",
          intent: "close",
        });
      }
      return;
    }

    const accountType =
      activeUser.role === "admin" ? "Quản trị viên" : "Sinh viên";
    setPortalNotice({
      href,
      title: "Bạn đã đăng nhập rồi",
      description: `Bạn đang đăng nhập với tài khoản ${accountType}. Nếu muốn chuyển sang cổng đăng nhập này, hãy đăng xuất tài khoản hiện tại trước.`,
      confirmLabel: "Đăng xuất và tiếp tục",
      intent: "switch-account",
    });
  };

  const handlePortalNoticeConfirm = async () => {
    if (!portalNotice) return;
    if (portalNotice.intent === "close") {
      setPortalNotice(null);
      return;
    }
    if (portalNotice.intent === "open-admin") {
      const { href } = portalNotice;
      setPortalNotice(null);
      router.push(href);
      return;
    }

    setLoggingOut(true);
    try {
      await logout();
      const { href } = portalNotice;
      setUser(null);
      setPortalNotice(null);
      setFlash({
        variant: "success",
        message: "Đã đăng xuất. Bạn có thể tiếp tục sang cổng đã chọn.",
      });
      router.push(href);
    } catch {
      setPortalNotice(null);
      setFlash({
        variant: "danger",
        message: "Chưa thể đăng xuất. Vui lòng thử lại sau.",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const avatarLetter = user?.name ? user.name.trim()[0].toUpperCase() : "U";

  return (
    <MainShellContext.Provider
      value={{ user, loadingUser, refreshUser: loadUser }}
    >
      <div className="flex min-h-screen flex-col overflow-x-clip bg-bg text-fg">
        <nav className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 text-slate-800 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-white">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex h-16 items-center justify-between gap-2.5">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 text-slate-900 no-underline dark:text-white"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="text-lg font-black tracking-tight whitespace-nowrap sm:text-xl">
                  SinhVien<span className="text-blue-600 dark:text-sky-400">Market</span>
                </span>
              </Link>

              <input
                ref={navImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleNavImageChange}
                className="sr-only"
                aria-label="Tải ảnh tìm kiếm AI"
              />

              <form
                onSubmit={handleSearchSubmit}
                className="hidden w-64 shrink-0 xl:flex 2xl:w-80"
              >
                <div className="flex w-full items-center overflow-hidden rounded-full border border-blue-200/90 bg-white transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800">
                  <Sparkles className="ml-3 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-sky-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Tìm sách, đồ dùng KTX..."
                    className="min-w-0 flex-1 border-0 bg-transparent px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-0 focus:outline-none 2xl:text-sm dark:text-white dark:placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => navImageInputRef.current?.click()}
                    title="Tìm sản phẩm bằng hình ảnh mẫu AI"
                    aria-label="Tìm bằng hình ảnh AI"
                    className="mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-blue-600 transition hover:bg-blue-50 dark:text-sky-300 dark:hover:bg-slate-700"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="submit"
                    aria-label="Tìm kiếm"
                    className="flex h-8 shrink-0 cursor-pointer items-center justify-center bg-blue-600 px-3.5 text-white transition hover:bg-blue-700"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>

              <div className="hidden items-center gap-0.5 xl:flex 2xl:gap-1">
                <Link
                  href="/"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[13px] font-semibold whitespace-nowrap transition 2xl:gap-1.5 2xl:px-2.5 2xl:py-2 2xl:text-sm",
                    pathname === "/"
                      ? "bg-blue-50 font-bold text-blue-600 dark:bg-blue-500/15 dark:text-sky-300"
                      : "text-slate-600 hover:bg-blue-50/70 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                  )}
                >
                  <Home className="h-3.5 w-3.5 shrink-0 2xl:h-4 2xl:w-4" />
                  Trang chủ
                </Link>

                <Link
                  href="/products"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[13px] font-semibold whitespace-nowrap transition 2xl:gap-1.5 2xl:px-2.5 2xl:py-2 2xl:text-sm",
                    pathname.startsWith("/products") &&
                      pathname !== "/products/create"
                      ? "bg-blue-50 font-bold text-blue-600 dark:bg-blue-500/15 dark:text-sky-300"
                      : "text-slate-600 hover:bg-blue-50/70 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                  )}
                >
                  <Grid className="h-3.5 w-3.5 shrink-0 2xl:h-4 2xl:w-4" />
                  Sản phẩm
                </Link>

                <div ref={ktxMenuRef} className="relative shrink-0">
                  <button
                    type="button"
                    data-testid="nav-ktx-trigger"
                    onClick={() => {
                      setKtxMenuOpen((prev) => !prev);
                    }}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-xl px-2 py-1.5 text-[13px] font-semibold whitespace-nowrap transition 2xl:gap-1.5 2xl:px-2.5 2xl:py-2 2xl:text-sm",
                      pathname.startsWith("/residence") ||
                        pathname.startsWith("/rentals")
                        ? "bg-blue-50 font-bold text-blue-600 dark:bg-blue-500/15 dark:text-sky-300"
                        : "text-slate-600 hover:bg-blue-50/70 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                    )}
                  >
                    <ClipboardList className="h-3.5 w-3.5 shrink-0 text-blue-600 2xl:h-4 2xl:w-4 dark:text-sky-400" />
                    Ký túc xá
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 shrink-0 opacity-75 transition-transform",
                        ktxMenuOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {ktxMenuOpen && (
                    <div className="absolute left-0 mt-2 w-72 overflow-hidden rounded-2xl border border-blue-100 bg-surface p-2 text-fg shadow-2xl dark:border-border">
                      <div className="px-3 py-1.5 text-[11px] font-extrabold tracking-wider text-muted uppercase">
                        Dịch vụ nội trú KTX
                      </div>
                      {[
                        {
                          href: "/residence",
                          label: "Hồ sơ & Hợp đồng lưu trú",
                          desc: "Đăng ký phòng KTX & theo dõi hợp đồng",
                        },
                        {
                          href: "/residence/announcements",
                          label: "Thông báo & Nội quy",
                          desc: "Bản tin, sự kiện và quy định KTX",
                        },
                        {
                          href: "/residence/finance",
                          label: "Hóa đơn & Phí lưu trú",
                          desc: "Tra cứu công nợ và gửi xác nhận đóng phí",
                        },
                        {
                          href: "/residence/services",
                          label: "Yêu cầu sửa chữa & Hỗ trợ",
                          desc: "Báo hỏng điện nước, dịch vụ phòng ở",
                        },
                        {
                          href: "/residence/assistant",
                          label: "Trợ lý Nội quy KTX",
                          desc: "Hỏi đáp nhanh quy định giờ giấc, sinh hoạt",
                        },
                        {
                          href: "/rentals",
                          label: "Mặt bằng cho thuê KTX",
                          desc: "Ki-ốt dịch vụ sinh viên trong khuôn viên",
                        },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setKtxMenuOpen(false)}
                          className={cn(
                            "block rounded-xl px-3 py-2 transition hover:bg-blue-50/60 dark:hover:bg-surface-2",
                            pathname === item.href &&
                              "bg-blue-50 font-bold text-primary dark:bg-blue-500/10",
                          )}
                        >
                          <div className="text-sm font-bold text-fg">
                            {item.label}
                          </div>
                          <div className="text-xs text-muted">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/#giveaway"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[13px] font-semibold whitespace-nowrap text-blue-600 transition hover:bg-blue-50 2xl:gap-1.5 2xl:px-2.5 2xl:py-2 2xl:text-sm dark:text-sky-300 dark:hover:bg-slate-800"
                >
                  <Gift className="h-3.5 w-3.5 shrink-0 2xl:h-4 2xl:w-4" />
                  Giveaway
                </Link>

                {user ? (
                  <>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        className="ml-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap text-blue-700 shadow-xs transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-sky-200"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-sky-300" />
                        Admin Panel
                      </Link>
                    ) : (
                      <Link
                        href="/products/create"
                        aria-label="Đăng sản phẩm"
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white shadow-xs transition hover:bg-blue-700 2xl:gap-1.5 2xl:px-3 2xl:py-2 2xl:text-sm"
                      >
                        <PlusCircle className="h-3.5 w-3.5 shrink-0 2xl:h-4 2xl:w-4" />
                        Đăng bán
                      </Link>
                    )}

                    <div ref={notifMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setNotifOpen((prev) => !prev)}
                        aria-label="Thông báo"
                        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600" />
                      </button>

                      {notifOpen && (
                        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface text-fg shadow-2xl">
                          <div className="border-b border-border px-4 py-2.5 text-xs font-extrabold tracking-wider text-muted uppercase">
                            Thông báo hệ thống
                          </div>
                          <div className="divide-y divide-border text-xs">
                            <div className="px-4 py-3">
                              <p className="font-bold text-fg">
                                🎉 Chào mừng đến với SinhVienMarket!
                              </p>
                              <p className="mt-0.5 text-muted">
                                Hệ thống chợ sinh viên KTX đã liên kết đồng bộ cả cổng Sinh Viên và Admin Panel.
                              </p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="font-bold text-fg">
                                🎁 Sự kiện Giveaway đang mở
                              </p>
                              <p className="mt-0.5 text-muted">
                                Tham gia bốc thăm trúng thưởng miễn phí ngay tại trang chủ.
                              </p>
                            </div>
                          </div>
                          <Link
                            href="/notifications"
                            onClick={() => setNotifOpen(false)}
                            className="block border-t border-border px-4 py-3 text-center text-xs font-bold text-primary hover:bg-surface-2"
                          >
                            Xem tất cả thông báo
                          </Link>
                        </div>
                      )}
                    </div>

                    <ThemeToggle />

                    <div ref={userMenuRef} className="relative ml-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setUserMenuOpen((prev) => !prev)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/70 px-2 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-800 transition hover:bg-blue-100/70 2xl:gap-2 2xl:px-2.5 2xl:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-sky-500 text-xs font-extrabold text-white 2xl:h-7 2xl:w-7">
                          {avatarLetter}
                        </span>
                        <span className="max-w-[110px] truncate 2xl:max-w-[160px]">
                          {user.name}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-75" />
                      </button>

                      {userMenuOpen && (
                        <div className="absolute right-0 mt-2 max-h-[calc(100vh-5rem)] w-60 overflow-y-auto rounded-2xl border border-blue-100 bg-surface py-2 text-fg shadow-2xl dark:border-border">
                          <div className="border-b border-border px-4 py-2.5">
                            <p className="truncate text-sm font-extrabold text-fg">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {user.email}
                            </p>
                            <span
                              className={cn(
                                "mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                                isAdmin
                                  ? "bg-blue-500/15 text-blue-700 dark:text-sky-300"
                                  : "bg-blue-500/15 text-blue-600 dark:text-sky-300",
                              )}
                            >
                              {isAdmin ? (
                                <>
                                  <ShieldCheck className="h-3 w-3" />
                                  Quản trị viên
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  Sinh viên đã xác thực
                                </>
                              )}
                            </span>
                          </div>

                          <div className="py-1">
                            {isAdmin ? (
                              <>
                                <Link
                                  href="/admin"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50/60 dark:text-sky-400 dark:hover:bg-surface-2"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Vào trang Quản trị (/admin)
                                </Link>
                                <Link
                                  href="/admin/residence"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <ClipboardList className="h-4 w-4 text-blue-600" />
                                  Xét duyệt KTX
                                </Link>
                              </>
                            ) : (
                              <>
                                <Link
                                  href="/residence"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <Home className="h-4 w-4 text-blue-600" />
                                  Hồ sơ lưu trú
                                </Link>
                                {user.roles?.includes("dorm_manager") && (
                                  <Link
                                    href="/admin/residence"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                  >
                                    <ClipboardList className="h-4 w-4 text-blue-600" />
                                    Xét duyệt KTX
                                  </Link>
                                )}
                                {user.roles?.includes("service_staff") && (
                                  <Link
                                    href="/residence/services"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                  >
                                    <ClipboardList className="h-4 w-4 text-blue-600" />
                                    Xử lý yêu cầu KTX
                                  </Link>
                                )}
                                <Link
                                  href="/dashboard"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <Grid className="h-4 w-4 text-blue-600" />
                                  Bảng điều khiển
                                </Link>
                                <Link
                                  href="/profile"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <UserCheck className="h-4 w-4 text-blue-600" />
                                  Hồ sơ cá nhân
                                </Link>
                                <Link
                                  href="/my-listings"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <PlusCircle className="h-4 w-4 text-blue-600" />
                                  Tin đăng của tôi
                                </Link>
                                <Link
                                  href="/transactions"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <ClipboardList className="h-4 w-4 text-blue-600" />
                                  Giao dịch
                                </Link>
                                <Link
                                  href="/wishlist"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <Heart className="h-4 w-4 text-blue-600" />
                                  Yêu thích
                                </Link>
                                <Link
                                  href="/chat"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <MessageCircle className="h-4 w-4 text-blue-600" />
                                  Tin nhắn
                                </Link>
                                <Link
                                  href="/notifications"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <Bell className="h-4 w-4 text-blue-600" />
                                  Thông báo
                                </Link>
                                <Link
                                  href="/rewards"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <Coins className="h-4 w-4 text-blue-600" />
                                  Xu & điểm thưởng
                                </Link>
                                <Link
                                  href="/products/create"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <PlusCircle className="h-4 w-4 text-blue-600" />
                                  Đăng bán
                                </Link>
                                <Link
                                  href="/products"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                                >
                                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                                  Khám phá sản phẩm
                                </Link>
                                <Link
                                  href="/#giveaway"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50/60 dark:text-sky-400 dark:hover:bg-surface-2"
                                >
                                  <Gift className="h-4 w-4" />
                                  Sự kiện Giveaway
                                </Link>
                              </>
                            )}

                            <Link
                              href="/login-role"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-blue-50/60 dark:hover:bg-surface-2"
                            >
                              <Sparkles className="h-4 w-4 text-blue-600" />
                              Chuyển cổng đăng nhập
                            </Link>
                          </div>

                          <div className="border-t border-border pt-1">
                            <button
                              type="button"
                              disabled={loggingOut}
                              onClick={handleLogout}
                              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                            >
                              <LogOut className="h-4 w-4" />
                              {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <ThemeToggle />

                    <Link
                      href="/login-role"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <LogIn className="h-4 w-4 shrink-0" />
                      Đăng nhập
                    </Link>

                    <Link
                      href="/register"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-linear-to-r from-blue-600 to-sky-600 px-3.5 py-2 text-sm font-bold whitespace-nowrap text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition hover:-translate-y-0.5 hover:brightness-105"
                    >
                      <UserPlus className="h-4 w-4 shrink-0" />
                      Đăng ký
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 xl:hidden">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  aria-label="Mở menu"
                  className="rounded-xl p-2 text-slate-700 hover:bg-blue-50 dark:text-white dark:hover:bg-slate-800"
                >
                  {mobileOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            {mobileOpen && (
              <div className="space-y-3 border-t border-blue-100 pt-3 pb-4 xl:hidden dark:border-slate-800">
                <form onSubmit={handleSearchSubmit}>
                  <div className="flex items-center overflow-hidden rounded-full border border-blue-200 bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800">
                    <Sparkles className="ml-3.5 h-4 w-4 shrink-0 text-blue-600" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Tìm bằng AI: sách, đồ KTX, ảnh mẫu..."
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => navImageInputRef.current?.click()}
                      aria-label="Tìm bằng hình ảnh AI"
                      className="px-2.5 text-blue-600"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 px-4 py-2 text-white"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </form>

                <div className="flex flex-col gap-1">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Home className="h-4 w-4" />
                    Trang chủ
                  </Link>
                  <Link
                    href="/products"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Grid className="h-4 w-4" />
                    Sản phẩm
                  </Link>
                  <Link
                    href="/#giveaway"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:text-sky-300 dark:hover:bg-slate-800"
                  >
                    <Gift className="h-4 w-4" />
                    Sự kiện Giveaway
                  </Link>

                  {user ? (
                    <>
                      {isAdmin && (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-sky-200"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Vào Admin Panel (/admin)
                          </Link>
                          <Link
                            href="/admin/residence"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <ClipboardList className="h-4 w-4" />
                            Xét duyệt KTX
                          </Link>
                        </>
                      )}
                      {!isAdmin && (
                        <>
                          <Link
                            href="/residence"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Home className="h-4 w-4" />
                            Hồ sơ lưu trú
                          </Link>
                          {user.roles?.includes("dorm_manager") && (
                            <Link
                              href="/admin/residence"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <ClipboardList className="h-4 w-4" />
                              Xét duyệt KTX
                            </Link>
                          )}
                          {user.roles?.includes("service_staff") && (
                            <Link
                              href="/residence/services"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <ClipboardList className="h-4 w-4" />
                              Xử lý yêu cầu KTX
                            </Link>
                          )}
                          <Link
                            href="/dashboard"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Grid className="h-4 w-4" />
                            Bảng điều khiển
                          </Link>
                          <Link
                            href="/profile"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <UserCheck className="h-4 w-4" />
                            Hồ sơ cá nhân
                          </Link>
                          <Link
                            href="/my-listings"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Tin đăng của tôi
                          </Link>
                          <Link
                            href="/transactions"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <ClipboardList className="h-4 w-4" />
                            Giao dịch
                          </Link>
                          <Link
                            href="/wishlist"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Heart className="h-4 w-4" />
                            Yêu thích
                          </Link>
                          <Link
                            href="/chat"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Tin nhắn
                          </Link>
                          <Link
                            href="/notifications"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Bell className="h-4 w-4" />
                            Thông báo
                          </Link>
                          <Link
                            href="/rewards"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Coins className="h-4 w-4" />
                            Xu & điểm thưởng
                          </Link>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-slate-800"
                      >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất ({user.name})
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login-role"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <LogIn className="h-4 w-4" />
                        Đăng nhập (Sinh viên / Admin)
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white"
                      >
                        <UserPlus className="h-4 w-4" />
                        Đăng ký tài khoản
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="mx-auto w-full max-w-7xl px-4 pt-3">
          <FlashBanner />
        </div>

        <main className="flex-1">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>

        <footer className="mt-16 border-t border-blue-100 bg-white py-12 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  SinhVien<span className="text-blue-600 dark:text-sky-400">Market</span>
                </div>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Nền tảng mua bán, trao đổi & đấu giá ngược dành riêng cho sinh viên{" "}
                  <strong className="text-slate-800 dark:text-white">KTX Đại học Quốc gia</strong>.
                  Tiết kiệm chi phí, kết nối cộng đồng sinh viên.
                </p>
              </div>

              <div className="md:col-span-3">
                <h3 className="mb-3 text-xs font-extrabold tracking-wider text-slate-900 uppercase dark:text-white">
                  Khám phá
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="/products"
                      className="text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                    >
                      Tất cả sản phẩm
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/products?type=auction"
                      className="text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                    >
                      Đấu giá ngược
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/products?type=exchange"
                      className="text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                    >
                      Trao đổi đồ dùng
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/leaderboard"
                      className="text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                    >
                      Bảng xếp hạng người bán
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-4">
                <h3 className="mb-3 text-xs font-extrabold tracking-wider text-slate-900 uppercase dark:text-white">
                  Cổng truy cập nhanh
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="/login-role"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleQuickAccessClick({ href: "/login-role" });
                      }}
                      className="text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                    >
                      Chọn cổng đăng nhập (Sinh viên / Quản trị)
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleQuickAccessClick({ href: "/login" });
                      }}
                      className="text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                    >
                      Đăng nhập Sinh viên
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin-login"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleQuickAccessClick({ href: "/admin-login" });
                      }}
                      className="font-bold text-blue-600 transition hover:text-blue-700 dark:text-sky-400"
                    >
                      🛡️ Cổng Quản trị viên (Admin Panel)
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-blue-100 pt-6 text-center text-xs text-slate-400 dark:border-slate-800">
              © 2026 SinhVienMarket — Hệ thống Thương mại Điện tử Sinh viên (Next.js 16 + React 19 + Tailwind CSS 4)
            </div>
          </div>
        </footer>
      </div>
      {portalNotice && (
        <PortalAccessDialog
          title={portalNotice.title}
          description={portalNotice.description}
          confirmLabel={portalNotice.confirmLabel}
          busy={loggingOut}
          onClose={() => setPortalNotice(null)}
          onConfirm={
            portalNotice.intent === "switch-account" ||
            portalNotice.intent === "open-admin"
              ? handlePortalNoticeConfirm
              : undefined
          }
        />
      )}
    </MainShellContext.Provider>
  );
}
