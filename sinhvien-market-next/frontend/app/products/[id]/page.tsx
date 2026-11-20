"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  User,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { Button } from "@/components/ui/Button";
import {
  getMarketplaceProduct,
  type MarketplaceProductDetail,
} from "@/lib/api/marketplace";
import { formatVnd } from "@/lib/validation/admin";
import {
  checkoutProduct,
  getWishlist,
  startConversation,
  toggleWishlist,
} from "@/lib/api/user-flows";

function ProductDetailContent() {
  const { user, loadingUser } = useMainShell();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);
  const validProductId = Number.isSafeInteger(productId) && productId > 0;
  const [product, setProduct] = useState<MarketplaceProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "banking" | "zalopay" | "momo"
  >("cod");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!validProductId) return;

    getMarketplaceProduct(productId)
      .then((result) => {
        if (active) setProduct(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải thông tin sản phẩm.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, validProductId]);

  useEffect(() => {
    if (!user || !product) return;
    let active = true;
    getWishlist(user)
      .then((items) => {
        if (active) setWishlisted(items.some((item) => item.id === product.id));
      })
      .catch((cause: unknown) => {
        if (active) {
          setActionError(
            cause instanceof Error ? cause.message : "Không tải được yêu thích.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [product, user]);

  async function onChat() {
    if (!user) {
      router.push("/login-role");
      return;
    }
    if (!product) return;
    setChatBusy(true);
    setActionError("");
    try {
      const conversation = await startConversation(user, product);
      router.push(`/chat/${conversation.id}`);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không mở được cuộc trò chuyện.",
      );
    } finally {
      setChatBusy(false);
    }
  }

  async function onWishlist() {
    if (!user) {
      router.push("/login-role");
      return;
    }
    if (!product) return;
    setWishlistBusy(true);
    setActionError("");
    try {
      setWishlisted(await toggleWishlist(user, product.id));
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không cập nhật được yêu thích.",
      );
    } finally {
      setWishlistBusy(false);
    }
  }

  async function onCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !product) {
      router.push("/login-role");
      return;
    }
    setCheckoutBusy(true);
    setActionError("");
    try {
      const transaction = await checkoutProduct(user, {
        productId: product.id,
        type: product.type === "auction" ? "auction" : "sale",
        paymentMethod,
        shippingAddress: address,
      });
      router.push(
        transaction.paymentMethod === "cod"
          ? "/transactions"
          : `/transactions/${transaction.id}/payment`,
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể tạo giao dịch.",
      );
    } finally {
      setCheckoutBusy(false);
    }
  }

  if (!validProductId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p role="alert" className="mb-5 text-sm font-medium text-rose-600">
          Mã sản phẩm không hợp lệ.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p role="alert" className="mb-5 text-sm font-medium text-rose-600">
          {error || "Không tìm thấy sản phẩm."}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Tất cả sản phẩm
      </Link>

      <article className="grid gap-8 rounded-3xl border border-border bg-surface p-5 shadow-sm md:grid-cols-2 md:p-8">
        <div className="flex min-h-72 items-center justify-center rounded-2xl bg-surface-2">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.title}
              className="max-h-[28rem] w-full rounded-2xl object-contain"
            />
          ) : (
            <ShoppingBag className="h-20 w-20 text-muted/40" />
          )}
        </div>

        <div className="flex flex-col">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Tag className="h-4 w-4" />
            {product.categoryName}
          </p>
          <h1 className="mt-3 text-2xl font-black text-fg sm:text-3xl">
            {product.title}
          </h1>

          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted">
            {product.description || "Người bán chưa thêm mô tả."}
          </p>

          <div className="mt-6 border-y border-border py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {product.type === "auction"
                ? product.currentPrice === null
                  ? "Giá khởi điểm"
                  : "Giá đấu hiện tại"
                : product.type === "exchange"
                  ? "Hình thức"
                  : "Giá bán"}
            </p>
            <p className="mt-1 font-mono text-3xl font-black text-primary">
              {product.type === "exchange"
                ? "Trao đổi"
                : formatVnd(
                    product.type === "auction"
                      ? (product.currentPrice ?? product.price)
                      : product.price,
                  )}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </span>
            <div>
              <Link
                href={`/users/${product.sellerId}`}
                className="font-bold text-fg transition hover:text-primary"
              >
                {product.sellerName}
              </Link>
              {product.sellerVerified && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Sinh viên đã xác thực
                </p>
              )}
            </div>
          </div>

          {actionError && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {actionError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {product.sellerId === user?.id && (
              <div className="w-full rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-xs">
                <p className="font-extrabold text-blue-600 dark:text-blue-300">
                  ✨ Đây là tin đăng của bạn
                </p>
                <p className="mt-1 text-muted">
                  Bạn có thể theo dõi trạng thái kiểm duyệt, chỉnh sửa hoặc làm mới tin trong trang quản lý cá nhân.
                </p>
                <Link
                  href="/my-listings"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white"
                >
                  Quản lý trong Tin đăng của tôi
                </Link>
              </div>
            )}
            {product.sellerId !== user?.id && (
              <Button
                type="button"
                variant="secondary"
                disabled={chatBusy}
                onClick={() => void onChat()}
              >
                {chatBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Nhắn người bán
              </Button>
            )}
            {product.sellerId !== user?.id && (
              <Button
                type="button"
                variant="ghost"
                disabled={wishlistBusy}
                onClick={() => void onWishlist()}
              >
                {wishlistBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart
                    className={`h-4 w-4 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`}
                  />
                )}
                {wishlisted ? "Đã yêu thích" : "Yêu thích"}
              </Button>
            )}
          </div>

          {(product.type === "sale" ||
            (product.type === "auction" && product.currentPrice !== null)) &&
            product.sellerId !== user?.id && (
            <form
              onSubmit={onCheckout}
              className="mt-5 space-y-3 rounded-2xl border border-border bg-surface-2 p-4"
            >
              <h2 className="font-extrabold text-fg">
                {product.type === "auction"
                  ? "Mua theo giá đấu hiện tại"
                  : "Đặt mua sản phẩm"}
              </h2>
              {product.type === "auction" && (
                <p className="text-xs leading-5 text-muted">
                  Giá cuối cùng được máy chủ xác nhận khi tạo giao dịch.
                </p>
              )}
              <label className="block text-xs font-bold text-fg">
                Địa chỉ giao nhận *
                <input
                  required
                  minLength={8}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-normal outline-none focus:border-primary"
                  placeholder="Tòa nhà, phòng, khu vực..."
                />
              </label>
              <label className="block text-xs font-bold text-fg">
                Phương thức thanh toán
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value as
                        | "cod"
                        | "banking"
                        | "zalopay"
                        | "momo",
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-normal outline-none focus:border-primary"
                >
                  <option value="cod">Thanh toán khi nhận hàng</option>
                  <option value="banking">Chuyển khoản ngân hàng</option>
                  <option value="zalopay">ZaloPay</option>
                  <option value="momo">MoMo</option>
                </select>
              </label>
              <Button
                type="submit"
                disabled={checkoutBusy || loadingUser}
                fullWidth
              >
                {checkoutBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {product.type === "auction"
                  ? "Xác nhận mua đấu giá"
                  : "Xác nhận mua"}
              </Button>
            </form>
          )}

          {product.type === "auction" && product.currentPrice === null && (
            <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Phiên đấu giá chưa có giá hiện tại nên chưa thể chốt mua.
            </p>
          )}

          {product.type === "exchange" && (
            <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Giao dịch trao đổi hiện được thỏa thuận qua tin nhắn; chưa có cơ
              chế tạo đơn trao đổi riêng.
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-96 animate-pulse rounded-2xl bg-surface" />
        </div>
      }
    >
      <MainShell>
        <ProductDetailContent />
      </MainShell>
    </Suspense>
  );
}
