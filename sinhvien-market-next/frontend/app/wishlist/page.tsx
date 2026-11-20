"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, LoaderCircle, PackageOpen, Trash2 } from "lucide-react";
import { useMainShell } from "@/components/layout/MainShell";
import {
  FlowAlert,
  UserFlowApp,
  UserFlowLayout,
} from "@/components/flows/FlowFrame";
import { toggleWishlist, getWishlist, type UserWishlistItem } from "@/lib/api/user-flows";
import { Button } from "@/components/ui/Button";

function WishlistContent() {
  const { user, loadingUser } = useMainShell();
  const [items, setItems] = useState<UserWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await getWishlist(user));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được yêu thích.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (loadingUser || !user) return;
    void Promise.resolve().then(refresh);
  }, [loadingUser, refresh, user]);

  async function remove(productId: number) {
    if (!user) return;
    setBusyId(productId);
    setError("");
    try {
      await toggleWishlist(user, productId);
      setItems((current) => current.filter((item) => item.id !== productId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật danh sách.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <UserFlowLayout
      title="Sản phẩm yêu thích"
      description="Lưu lại những món đồ bạn muốn xem hoặc mua sau."
    >
      <FlowAlert error={error} />
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center text-muted">
          <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />
          Đang tải danh sách...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-rose-400" />
          <h2 className="font-bold text-fg">Danh sách đang trống</h2>
          <p className="mt-1 text-sm text-muted">
            Khi thấy sản phẩm phù hợp, hãy lưu vào đây để xem lại.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <Link
                href={`/products/${item.id}`}
                className="flex h-40 items-center justify-center overflow-hidden bg-blue-50/60 text-primary dark:bg-surface-2"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PackageOpen className="h-10 w-10" />
                )}
              </Link>
              <div className="p-4">
                <p className="text-xs font-semibold text-muted">
                  {item.categoryName}
                </p>
                <Link
                  href={`/products/${item.id}`}
                  className="mt-1 block font-extrabold text-fg hover:text-primary"
                >
                  {item.title}
                </Link>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="font-black text-primary">
                    {item.type === "exchange"
                      ? "Trao đổi"
                      : item.price === null
                        ? "Liên hệ"
                        : new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                            maximumFractionDigits: 0,
                          }).format(item.price)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busyId === item.id}
                    onClick={() => void remove(item.id)}
                    aria-label={`Bỏ yêu thích ${item.title}`}
                  >
                    {busyId === item.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Bỏ lưu
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </UserFlowLayout>
  );
}

export default function WishlistPage() {
  return (
    <UserFlowApp>
      <WishlistContent />
    </UserFlowApp>
  );
}
