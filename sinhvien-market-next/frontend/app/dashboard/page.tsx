"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { UserFlowApp, UserFlowLayout, FlowAlert } from "@/components/flows/FlowFrame";
import { useMainShell } from "@/components/layout/MainShell";
import {
  getMyListings,
  getMyTransactions,
  type UserListing,
  type UserTransaction,
} from "@/lib/api/user-flows";
import { formatDateTimeVi, formatVnd } from "@/lib/validation/admin";

const LISTING_STATUS: Record<UserListing["status"], string> = {
  pending: "Chờ duyệt",
  active: "Đang hiển thị",
  sold: "Đã bán",
  cancelled: "Đã gỡ",
};

function DashboardContent() {
  const { user, loadingUser } = useMainShell();
  const router = useRouter();
  const [listings, setListings] = useState<UserListing[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loadingUser) return;
    if (user?.role === "admin") {
      router.replace("/admin");
      return;
    }
    if (!user) return;

    let active = true;
    Promise.all([getMyListings(user), getMyTransactions(user)])
      .then(([ownListings, ownTransactions]) => {
        if (!active) return;
        setListings(ownListings);
        setTransactions(ownTransactions);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được dữ liệu bảng điều khiển.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadingUser, router, user]);

  const completedTransactions = transactions.filter((transaction) =>
    ["delivered", "received", "completed"].includes(transaction.orderStatus),
  );
  const soldAmount = completedTransactions
    .filter((transaction) => transaction.role === "seller")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const boughtAmount = completedTransactions
    .filter((transaction) => transaction.role === "buyer")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <UserFlowLayout
      title="Bảng điều khiển"
      description="Tổng quan tin đăng và hoạt động giao dịch của bạn."
    >
      <FlowAlert error={error} />
      {loadingUser || (user?.role === "admin") ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center text-sm text-muted">
          Đang kiểm tra phiên đăng nhập...
        </div>
      ) : !user ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="text-lg font-bold text-fg">Đăng nhập để xem tổng quan</h2>
          <p className="mt-1 text-sm text-muted">
            Bảng điều khiển tổng hợp tin đăng và giao dịch của tài khoản bạn.
          </p>
          <Link
            href="/login-role"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Đến cổng đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-blue-600 via-sky-600 to-sky-500 p-6 text-white shadow-lg shadow-blue-500/20 sm:p-8">
            <div>
              <p className="text-sm font-medium text-white/75">Xin chào,</p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                {user.name}
              </h2>
              <p className="mt-1 text-sm text-white/75">{user.email}</p>
            </div>
            <Link
              href="/products/create"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Đăng bán mới
            </Link>
          </div>

          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Bài đăng",
                value: loading ? "…" : String(listings.length),
                icon: Package,
                tone: "text-blue-500",
              },
              {
                label: "Đã bán",
                value: loading ? "…" : formatVnd(soldAmount),
                icon: Wallet,
                tone: "text-emerald-500",
              },
              {
                label: "Đã mua",
                value: loading ? "…" : formatVnd(boughtAmount),
                icon: ShoppingBag,
                tone: "text-rose-500",
              },
              {
                label: "Giao dịch",
                value: loading ? "…" : String(transactions.length),
                icon: Clock3,
                tone: "text-cyan-500",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
                >
                  <Icon className={`mb-3 h-5 w-5 ${stat.tone}`} />
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-1 truncate text-xl font-black text-fg sm:text-2xl">
                    {stat.value}
                  </p>
                </article>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              <CircleAlert className="mr-2 inline h-4 w-4" />
              Có lỗi khi tải một số dữ liệu. Hãy thử tải lại trang.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-border bg-surface">
                <header className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h3 className="font-extrabold text-fg">Tin đăng gần đây</h3>
                  <Link
                    href="/my-listings"
                    className="inline-flex items-center gap-1 text-sm font-bold text-primary"
                  >
                    Xem tất cả <ArrowRight className="h-4 w-4" />
                  </Link>
                </header>
                {loading ? (
                  <p className="px-5 py-10 text-center text-sm text-muted">
                    Đang tải tin đăng...
                  </p>
                ) : listings.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-muted">Bạn chưa có tin đăng nào.</p>
                    <Link
                      href="/products/create"
                      className="mt-3 inline-flex text-sm font-bold text-primary"
                    >
                      Đăng tin đầu tiên
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {listings.slice(0, 5).map((listing) => (
                      <li
                        key={listing.id}
                        className="flex items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/products/${listing.id}`}
                            className="block truncate text-sm font-bold text-fg hover:text-primary"
                          >
                            {listing.title}
                          </Link>
                          <p className="mt-1 text-xs text-muted">
                            {formatDateTimeVi(listing.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted">
                          {LISTING_STATUS[listing.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-border bg-surface">
                <header className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h3 className="font-extrabold text-fg">Giao dịch gần đây</h3>
                  <Link
                    href="/transactions"
                    className="inline-flex items-center gap-1 text-sm font-bold text-primary"
                  >
                    Xem tất cả <ArrowRight className="h-4 w-4" />
                  </Link>
                </header>
                {loading ? (
                  <p className="px-5 py-10 text-center text-sm text-muted">
                    Đang tải giao dịch...
                  </p>
                ) : transactions.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-muted">
                    Giao dịch mua và bán sẽ hiển thị tại đây.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {transactions.slice(0, 5).map((transaction) => (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-fg">
                            {transaction.productTitle}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {transaction.role === "seller" ? "Đơn bán" : "Đơn mua"}
                            {" · "}
                            {formatDateTimeVi(transaction.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold text-primary">
                          {formatVnd(transaction.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </UserFlowLayout>
  );
}

export default function DashboardPage() {
  return (
    <UserFlowApp>
      <DashboardContent />
    </UserFlowApp>
  );
}
