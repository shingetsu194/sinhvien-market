"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  CircleAlert,
  Clock3,
  LoaderCircle,
  PackageOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  FlowAlert,
  UserFlowApp,
  UserFlowLayout,
} from "@/components/flows/FlowFrame";
import { useMainShell } from "@/components/layout/MainShell";
import {
  bumpListing,
  deleteListing,
  getMyListings,
  type UserListing,
} from "@/lib/api/user-flows";

const STATUS: Record<UserListing["status"], { label: string; className: string }> = {
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  active: {
    label: "Đang hiển thị",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  sold: {
    label: "Đã bán",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  cancelled: {
    label: "Đã gỡ",
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
};

function MyListingsContent() {
  const { user, loadingUser } = useMainShell();
  const [listings, setListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setListings(await getMyListings(user));
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tải được tin đăng.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (loadingUser || !user) return;
    void Promise.resolve().then(refresh);
  }, [loadingUser, refresh, user]);

  async function onDelete(listing: UserListing) {
    if (!user || !window.confirm(`Gỡ tin “${listing.title}” khỏi gian hàng?`)) {
      return;
    }
    setWorkingId(listing.id);
    setError("");
    setNotice("");
    try {
      await deleteListing(user, listing.id);
      setNotice("Đã gỡ tin đăng.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gỡ được tin.");
    } finally {
      setWorkingId(null);
    }
  }

  async function onBump(listing: UserListing) {
    if (!user) return;
    setWorkingId(listing.id);
    setError("");
    setNotice("");
    try {
      const rewards = await bumpListing(user, listing.id);
      setNotice(`Đã làm mới tin. Số dư còn ${rewards.balance} xu.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không làm mới được tin.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <UserFlowLayout
      title="Tin đăng của tôi"
      description="Theo dõi trạng thái duyệt và quản lý các sản phẩm bạn đang đăng."
    >
      <FlowAlert error={error} success={notice} />
      <div className="mb-5 flex justify-end">
        <Link
          href="/products/create"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Đăng sản phẩm
        </Link>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center text-muted">
          <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />
          Đang tải tin đăng...
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <PackageOpen className="mx-auto mb-3 h-10 w-10 text-muted/50" />
          <h2 className="font-bold text-fg">Bạn chưa đăng sản phẩm nào</h2>
          <p className="mt-1 text-sm text-muted">
            Đăng món đồ đầu tiên để kết nối với cộng đồng sinh viên.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => {
            const status = STATUS[listing.status];
            const busy = workingId === listing.id;
            return (
              <article
                key={listing.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-xs transition hover:border-blue-300 sm:flex-row sm:items-center"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-blue-50/60 text-primary dark:bg-surface-2">
                  {listing.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PackageOpen className="h-8 w-8" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/products/${listing.id}`}
                      className="font-extrabold text-fg transition hover:text-primary"
                    >
                      {listing.title}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {listing.categoryName} ·{" "}
                    {listing.type === "sale"
                      ? "Mua bán"
                      : listing.type === "exchange"
                        ? "Trao đổi"
                        : "Đấu giá ngược"}{" "}
                    ·{" "}
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                    }).format(new Date(listing.createdAt))}
                  </p>
                  {listing.rejectionReason && (
                    <p className="mt-2 inline-flex items-start gap-1 text-xs text-rose-600 dark:text-rose-300">
                      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {listing.rejectionReason}
                    </p>
                  )}
                  <p className="mt-2 font-black text-primary">
                    {listing.type === "exchange"
                      ? "Trao đổi"
                      : listing.price === null
                        ? "Liên hệ"
                        : new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                            maximumFractionDigits: 0,
                          }).format(listing.price)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  {listing.status === "active" && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void onBump(listing)}
                    >
                      <ArrowUp className="h-4 w-4" />
                      Làm mới · 50 xu
                    </Button>
                  )}
                  {listing.status !== "sold" &&
                    listing.status !== "cancelled" && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void onDelete(listing)}
                        aria-label={`Gỡ ${listing.title}`}
                      >
                        {busy ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Gỡ tin
                      </Button>
                    )}
                  {listing.status === "pending" && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock3 className="h-3.5 w-3.5" /> Đang chờ duyệt
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </UserFlowLayout>
  );
}

export default function MyListingsPage() {
  return (
    <UserFlowApp>
      <MyListingsContent />
    </UserFlowApp>
  );
}
