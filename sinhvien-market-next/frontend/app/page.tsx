"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Dices,
  Gift,
  Grid,
  LogIn,
  PlusCircle,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { CategoryIcon } from "@/components/admin/CategoryIcon";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { getMarketplaceHome } from "@/lib/api/marketplace";
import type {
  MarketplaceBanner,
  MarketplaceGiveaway,
  MarketplaceProduct,
} from "@/lib/api/marketplace";
import type {
  AdminCategory,
} from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateTimeVi, formatVnd } from "@/lib/validation/admin";

const CATEGORY_GRADIENTS = [
  "from-blue-600 to-sky-500 shadow-blue-500/25",
  "from-sky-500 to-cyan-500 shadow-sky-500/25",
  "from-blue-500 to-blue-600 shadow-blue-500/25",
  "from-cyan-600 to-blue-600 shadow-cyan-500/25",
  "from-blue-700 to-blue-500 shadow-blue-600/25",
  "from-sky-600 to-blue-500 shadow-sky-500/25",
];

function HomeContent() {
  const { user } = useMainShell();
  const [banners, setBanners] = useState<MarketplaceBanner[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [auctionProducts, setAuctionProducts] = useState<MarketplaceProduct[]>(
    [],
  );
  const [giveaway, setGiveaway] = useState<MarketplaceGiveaway | null>(null);
  const [stats, setStats] = useState<{
    activeProducts: number;
    totalUsers: number;
    txToday: number;
  } | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [joinedGiveaway, setJoinedGiveaway] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    getMarketplaceHome()
      .then((home) => {
        if (!active) return;
        setBanners(home.banners);
        setCategories(home.categories);
        setProducts(home.featuredProducts);
        setAuctionProducts(home.auctionProducts);
        setGiveaway(home.giveaway);
        setStats(home.stats);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Không thể tải dữ liệu trang chủ.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const featuredProducts = useMemo(() => products.slice(0, 6), [products]);

  const hasJoined = useMemo(() => {
    if (joinedGiveaway) return true;
    return giveaway?.joinedByCurrentUser ?? false;
  }, [joinedGiveaway, giveaway]);

  return (
    <div>
      {loadError && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-7xl rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {loadError}
        </div>
      )}
      {banners.length > 0 && (
        <section className="bg-bg pt-5 pb-2">
          <div className="mx-auto max-w-7xl px-4">
            <div className="group relative overflow-hidden rounded-2xl border border-border shadow-xl">
              <div
                style={{ transform: `translateX(-${slideIndex * 100}%)` }}
                className="flex transition-transform duration-700 ease-in-out"
              >
                {banners.map((b) => (
                  <div key={b.id} className="relative min-w-full">
                    <Link
                      href={b.link || "/products"}
                      className="block relative h-44 sm:h-60 md:h-72 w-full overflow-hidden bg-linear-to-r from-blue-700 via-blue-600 to-sky-600"
                    >
                      {b.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.imageUrl}
                          alt={b.title}
                          className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-[1.02]"
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-blue-950/80 via-blue-950/25 to-transparent" />
                      <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4 text-white">
                        <div>
                          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase backdrop-blur-md">
                            Nổi bật trên SinhVienMarket
                          </span>
                          <h2 className="mt-2 text-lg font-black sm:text-2xl">
                            {b.title}
                          </h2>
                        </div>
                        <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-blue-700 shadow-md sm:inline-flex">
                          Khám phá ngay
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>

              {banners.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Banner trước"
                    onClick={() =>
                      setSlideIndex(
                        (prev) => (prev - 1 + banners.length) % banners.length,
                      )
                    }
                    className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/65"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Banner tiếp theo"
                    onClick={() =>
                      setSlideIndex((prev) => (prev + 1) % banners.length)
                    }
                    className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/65"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                    {banners.map((b, i) => (
                      <button
                        key={b.id}
                        type="button"
                        aria-label={`Chuyển tới banner ${i + 1}`}
                        onClick={() => setSlideIndex(i)}
                        className={cn(
                          "h-2 cursor-pointer rounded-full transition-all",
                          i === slideIndex
                            ? "w-6 bg-white"
                            : "w-2 bg-white/50 hover:bg-white/80",
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden border-b border-blue-100 bg-linear-to-br from-blue-50 via-white to-sky-100/70 py-14 lg:py-20 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
        <div className="pointer-events-none absolute -top-40 -left-32 h-[460px] w-[460px] rounded-full bg-blue-400/15 blur-[95px]" />
        <div className="pointer-events-none absolute -right-24 -bottom-40 h-[400px] w-[400px] rounded-full bg-sky-400/15 blur-[95px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center gap-12 lg:flex-row">
            <div className="text-center lg:w-1/2 lg:text-left">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold tracking-wider text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-sky-300">
                <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400" />
                Đấu giá ngược · Mua bán · Trao đổi · Ký túc xá
              </div>

              <h1 className="text-4xl leading-tight font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
                Chợ Sinh Viên
                <br />
                <span className="bg-linear-to-r from-blue-700 via-blue-600 to-sky-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-sky-300">
                  KTX Đại học Quốc gia
                </span>
              </h1>

              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 lg:mx-0 lg:text-lg dark:text-slate-300">
                Mua bán sách giáo trình, đồ điện tử, đồ dùng KTX với giá sinh viên hợp lý nhất. Tham gia đấu giá ngược —{" "}
                <strong className="text-blue-700 dark:text-sky-300">giá tự giảm theo thời gian</strong>, chốt đơn ngay khi ưng ý!
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3.5 lg:justify-start">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-sky-600 px-7 py-3.5 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Mua sắm ngay
                </Link>

                {user ? (
                  user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-7 py-3.5 text-base font-extrabold text-blue-700 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300"
                    >
                      <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-sky-400" />
                      Vào Admin Panel
                    </Link>
                  ) : (
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-7 py-3.5 text-base font-bold text-blue-700 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <PlusCircle className="h-5 w-5" />
                      Khám phá sản phẩm
                    </Link>
                  )
                ) : (
                  <>
                    <Link
                      href="/login-role"
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-6 py-3.5 text-base font-bold text-slate-700 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <LogIn className="h-5 w-5" />
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-6 py-3.5 text-base font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-sky-200"
                    >
                      <UserPlus className="h-5 w-5" />
                      Đăng ký miễn phí
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-10 inline-flex items-center rounded-2xl border border-blue-100 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="px-4 text-center">
                  <span className="block text-2xl font-black text-blue-600 dark:text-sky-400">
                    {stats?.activeProducts ?? products.length}+
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    Sản phẩm đang bán
                  </span>
                </div>
                <div className="h-9 w-px bg-blue-100 dark:bg-slate-800" />
                <div className="px-4 text-center">
                  <span className="block text-2xl font-black text-blue-600 dark:text-sky-400">
                    {stats?.totalUsers ?? 7}+
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    Thành viên KTX
                  </span>
                </div>
                <div className="h-9 w-px bg-blue-100 dark:bg-slate-800" />
                <div className="px-4 text-center">
                  <span className="block text-2xl font-black text-blue-600 dark:text-sky-400">
                    {stats?.txToday ?? 2}+
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    GD hôm nay
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden justify-center lg:flex lg:w-1/2">
              <div className="w-full max-w-[390px] rounded-3xl border border-blue-100 bg-white p-7 shadow-[0_20px_50px_rgba(37,99,235,0.1)] dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-4 border-b border-slate-100 py-4 dark:border-slate-800">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-sm">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Đấu giá ngược thông minh
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Giá giảm dần tự động — mua ngay khi thấy hợp lý
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-b border-slate-100 py-4 dark:border-slate-800">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                    <Gift className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Sự kiện Giveaway hàng tuần
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Quay số trúng thưởng công khai dành cho sinh viên
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-b border-slate-100 py-4 dark:border-slate-800">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 text-white shadow-sm">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Thanh toán tiện lợi
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Hỗ trợ ZaloPay, chuyển khoản ngân hàng và COD tại KTX
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-700 to-blue-500 text-white shadow-sm">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Kiểm duyệt & Bảo mật 2 lớp
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Xác thực OTP sinh viên & hệ thống kiểm duyệt Admin 24/7
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {giveaway && (
        <section
          id="giveaway"
          className="relative overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-sky-700 py-14 text-white"
        >
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-col items-center justify-center gap-8 rounded-3xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur-md md:flex-row md:text-left">
              <div className="relative shrink-0">
                {giveaway.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={giveaway.imageUrl}
                    alt={giveaway.title}
                    className="h-40 w-40 rounded-2xl border-2 border-white/50 object-cover shadow-2xl"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/15 text-white shadow-2xl">
                    <Gift className="h-16 w-16" />
                  </div>
                )}
                <span className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-lg">
                  🎁
                </span>
              </div>

              <div className="flex-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-xs font-extrabold tracking-wider text-blue-50 uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sự kiện Giveaway đặc biệt
                </span>
                <h2 className="mt-2.5 text-2xl font-black text-white sm:text-3xl">
                  {giveaway.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50/90 sm:text-base">
                  {giveaway.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-blue-100 md:justify-start">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-sky-200" />
                    Hạn đăng ký:{" "}
                    <strong className="text-white">
                      {formatDateTimeVi(giveaway.endTime)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Đã có{" "}
                    <strong className="text-white">
                      {giveaway.participantCount + (joinedGiveaway ? 1 : 0)}
                    </strong>{" "}
                    sinh viên tham gia
                  </span>
                </div>

                <div className="mt-6">
                  {!user ? (
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-extrabold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
                    >
                      <LogIn className="h-4 w-4" />
                      Đăng nhập để tham gia miễn phí
                    </Link>
                  ) : user.role === "admin" ? (
                    <Link
                      href={`/admin/giveaway-spin?id=${giveaway.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-black text-blue-700 shadow-lg transition hover:-translate-y-0.5"
                    >
                      <Dices className="h-4 w-4" />
                      Mở bàn quay số Admin
                    </Link>
                  ) : hasJoined ? (
                    <span className="inline-flex items-center gap-2 rounded-xl border-2 border-white/40 bg-white/15 px-7 py-3 text-sm font-extrabold text-white">
                      <CheckCircle2 className="h-4 w-4" />
                      Đã đăng ký tham gia vòng quay ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setJoinedGiveaway(true)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-extrabold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
                    >
                      <Dices className="h-4 w-4" />
                      Tham gia vòng quay ngay!
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {auctionProducts.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-3.5 py-1 text-xs font-extrabold tracking-wider text-rose-500 uppercase">
                  <Zap className="h-3.5 w-3.5" />
                  Đang diễn ra
                </span>
                <h2 className="mt-2 text-2xl font-black text-fg sm:text-3xl">
                  Đấu giá ngược đang HOT 🔥
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Giá tự giảm theo thời gian · Chốt đơn ngay trước khi sinh viên khác mua mất!
                </p>
              </div>

              <Link
                href="/products?type=auction"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition hover:gap-2.5"
              >
                Xem tất cả đấu giá
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {auctionProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface transition duration-300 hover:-translate-y-1.5 hover:border-rose-400/60 hover:shadow-xl"
                >
                  <div className="relative flex h-44 items-center justify-center overflow-hidden bg-linear-to-br from-rose-500/10 via-orange-500/10 to-blue-500/10">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Zap className="h-14 w-14 text-rose-500/35 transition duration-300 group-hover:scale-110" />
                    )}
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-rose-600 to-orange-500 px-3 py-1 text-[11px] font-extrabold text-white shadow-md">
                      <Zap className="h-3 w-3" />
                      Đấu giá ngược
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-[11px] font-bold tracking-wider text-muted uppercase">
                      {p.categoryName}
                    </span>
                    <h3 className="mt-1 line-clamp-2 flex-1 text-base font-bold text-fg transition group-hover:text-primary">
                      {p.title}
                    </h3>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <div>
                        <span className="font-mono text-xl font-black text-rose-500">
                          {formatVnd(p.price)}
                        </span>
                        <span className="block text-[11px] text-muted">
                          Người bán: {p.sellerName}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-500">
                        <ArrowDownCircle className="h-4 w-4" />
                        Đang giảm
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-border bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-extrabold tracking-wider text-primary uppercase">
              <Grid className="h-3.5 w-3.5" />
              Danh mục sản phẩm
            </span>
            <h2 className="mt-2 text-2xl font-black text-fg sm:text-3xl">
              Mua sắm theo danh mục
            </h2>
            <p className="mt-1 text-sm text-muted">
              Đồng bộ trực tiếp với danh mục quản trị trên hệ thống
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((cat, idx) => {
              const grad = CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length];
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="group rounded-2xl border-2 border-border bg-bg p-5 text-center transition duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-lg"
                >
                  <div
                    className={cn(
                      "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg",
                      grad,
                    )}
                  >
                    <CategoryIcon icon={cat.icon} className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-fg transition group-hover:text-primary">
                    {cat.name}
                  </p>
                </Link>
              );
            })}

            <Link
              href="/products"
              className="group rounded-2xl border-2 border-border bg-bg p-5 text-center transition duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-lg"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-muted transition group-hover:text-primary">
                <Grid className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-muted transition group-hover:text-fg">
                Tất cả sản phẩm
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-extrabold tracking-wider text-primary uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Mới lên kệ
              </span>
              <h2 className="mt-2 text-2xl font-black text-fg sm:text-3xl">
                Sản phẩm mới nhất
              </h2>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition hover:gap-2.5"
            >
              Xem toàn bộ kho hàng
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {featuredProducts.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface transition duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="relative flex h-36 items-center justify-center overflow-hidden bg-surface-2">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <ShoppingBag className="h-10 w-10 text-muted/40 transition group-hover:scale-110" />
                  )}
                  {p.type === "auction" && (
                    <span className="absolute top-2 left-2 rounded-full bg-linear-to-r from-rose-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                      ⚡ Đấu giá
                    </span>
                  )}
                  {p.type === "exchange" && (
                    <span className="absolute top-2 left-2 rounded-full bg-linear-to-r from-cyan-500 to-blue-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                      🔄 Trao đổi
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-3.5">
                  <span className="text-[10px] font-bold tracking-wider text-muted uppercase">
                    {p.categoryName}
                  </span>
                  <h3 className="mt-1 line-clamp-2 flex-1 text-xs font-bold text-fg transition group-hover:text-primary">
                    {p.title}
                  </h3>
                  <div className="mt-3 border-t border-border pt-2 font-mono text-sm font-black text-primary">
                    {p.type === "exchange" ? (
                      <span className="font-sans text-xs text-cyan-500">
                        Trao đổi đồ
                      </span>
                    ) : (
                      formatVnd(p.price)
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!user && (
        <section className="relative overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-sky-600 py-16 text-center text-white">
          <div className="relative z-10 mx-auto max-w-3xl px-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-4 py-1 text-xs font-extrabold tracking-wider uppercase">
              <Rocket className="h-3.5 w-3.5" />
              Bắt đầu miễn phí
            </span>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              Sẵn sàng mua sắm & thanh lý đồ KTX thông minh?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-blue-50/90">
              Đăng ký miễn phí bằng email sinh viên, đăng bài trong 2 phút, tiết kiệm hàng trăm nghìn mỗi học kỳ.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-blue-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <UserPlus className="h-4 w-4" />
                Tạo tài khoản ngay
              </Link>
              <Link
                href="/login-role"
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/35 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập tài khoản
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <MainShell>
      <HomeContent />
    </MainShell>
  );
}
