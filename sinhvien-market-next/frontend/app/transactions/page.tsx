"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleX,
  Clock3,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
import { useMainShell } from "@/components/layout/MainShell";
import {
  FlowAlert,
  UserFlowApp,
  UserFlowLayout,
} from "@/components/flows/FlowFrame";
import { Button } from "@/components/ui/Button";
import {
  getMyTransactions,
  confirmTransactionBankPayment,
  updateTransactionStatus,
  type UserTransaction,
  type UserTransactionStatus,
} from "@/lib/api/user-flows";

const STATUS: Record<
  UserTransactionStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  shipping: {
    label: "Đang chuẩn bị giao",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  delivered: {
    label: "Đã giao",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  received: {
    label: "Đã nhận",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: "Hoàn tất",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
};

function TransactionsContent() {
  const { user, loadingUser } = useMainShell();
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setTransactions(await getMyTransactions(user));
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tải được giao dịch.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (loadingUser || !user) return;
    void Promise.resolve().then(refresh);
  }, [loadingUser, refresh, user]);

  async function changeStatus(
    transaction: UserTransaction,
    status: UserTransactionStatus,
  ) {
    if (!user) return;
    setWorkingId(transaction.id);
    setError("");
    setNotice("");
    try {
      await updateTransactionStatus(user, transaction.id, status);
      setNotice("Đã cập nhật trạng thái giao dịch.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể cập nhật giao dịch.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function confirmBankPayment(transaction: UserTransaction) {
    if (!user) return;
    setWorkingId(transaction.id);
    setError("");
    setNotice("");
    try {
      await confirmTransactionBankPayment(user, transaction.id);
      setNotice("Đã xác nhận nhận tiền và chuyển đơn hàng sang trạng thái đang giao.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể xác nhận khoản chuyển.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <UserFlowLayout
      title="Giao dịch của tôi"
      description="Theo dõi đơn mua và đơn bán từ lúc xác nhận đến khi hoàn tất."
    >
      <FlowAlert error={error} success={notice} />
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center text-muted">
          <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />
          Đang tải giao dịch...
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted/50" />
          <h2 className="font-bold text-fg">Chưa có giao dịch</h2>
          <p className="mt-1 text-sm text-muted">
            Đơn mua và đơn bán sẽ được hiển thị tại đây.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const seller = transaction.role === "seller";
            const status = STATUS[transaction.orderStatus];
            const busy = workingId === transaction.id;
            return (
              <article
                key={transaction.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 rounded-xl p-2 ${
                        seller
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {seller ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/products/${transaction.productId}`}
                        className="font-extrabold text-fg hover:text-primary"
                      >
                        {transaction.productTitle}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {seller
                          ? `Người mua: ${transaction.buyerName}`
                          : `Người bán: ${transaction.sellerName}`}
                        {" · "}
                        {new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(transaction.createdAt))}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <p className="font-black text-primary">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      }).format(transaction.amount)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Thanh toán: {paymentLabel(transaction.paymentMethod)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Trạng thái thanh toán:{" "}
                      {transaction.paymentStatus === "paid"
                        ? "Đã thanh toán"
                        : transaction.paymentStatus === "refunded"
                          ? "Đã hoàn tiền"
                          : transaction.paymentMethod === "cod"
                            ? "Thanh toán khi nhận hàng"
                            : "Chờ thanh toán"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {seller &&
                      transaction.paymentMethod === "banking" &&
                      transaction.orderStatus === "pending" &&
                      transaction.paymentStatus !== "paid" &&
                      transaction.hasPaymentProof && (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => void confirmBankPayment(transaction)}
                        >
                          {busy ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          Xác nhận đã nhận tiền
                        </Button>
                      )}
                    {seller &&
                      transaction.paymentMethod === "banking" &&
                      transaction.hasPaymentProof && (
                        <a
                          href={`/transactions/proof?id=${transaction.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-fg hover:bg-surface-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Xem biên lai
                        </a>
                      )}
                    {seller &&
                      transaction.orderStatus === "pending" &&
                      transaction.paymentMethod === "banking" &&
                      !transaction.hasPaymentProof && (
                        <span className="self-center text-xs text-muted">
                          Chờ người mua gửi biên lai chuyển khoản
                        </span>
                      )}
                    {seller &&
                      transaction.orderStatus === "pending" &&
                      transaction.paymentMethod !== "banking" &&
                      (transaction.paymentMethod === "cod" ||
                        transaction.paymentStatus === "paid") && (
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void changeStatus(transaction, "shipping")
                        }
                      >
                        {busy ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <PackageCheck className="h-4 w-4" />
                        )}
                        Xác nhận & chuẩn bị giao
                      </Button>
                    )}
                    {seller &&
                      transaction.orderStatus === "pending" &&
                      transaction.paymentMethod !== "cod" &&
                      transaction.paymentMethod !== "banking" &&
                      transaction.paymentStatus !== "paid" && (
                        <span className="self-center text-xs text-muted">
                          Chờ người mua hoàn tất thanh toán trực tuyến
                        </span>
                      )}
                    {seller && transaction.orderStatus === "shipping" && (
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void changeStatus(transaction, "delivered")
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Đánh dấu đã giao
                      </Button>
                    )}
                    {!seller &&
                      ["shipping", "delivered"].includes(
                        transaction.orderStatus,
                      ) && (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void changeStatus(transaction, "completed")
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Xác nhận đã nhận
                        </Button>
                      )}
                      {!seller &&
                        transaction.orderStatus === "pending" &&
                        transaction.paymentMethod !== "cod" &&
                        transaction.paymentStatus !== "paid" && (
                          <Link
                            href={`/transactions/${transaction.id}/payment`}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary/90"
                          >
                            <CreditCard className="h-4 w-4" />
                            {transaction.paymentMethod === "banking" &&
                            transaction.hasPaymentProof
                              ? "Xem trạng thái chuyển khoản"
                              : "Tiếp tục thanh toán"}
                          </Link>
                        )}
                    {seller &&
                      transaction.paymentStatus !== "paid" &&
                      !transaction.hasPaymentProof &&
                      ["pending", "shipping"].includes(
                        transaction.orderStatus,
                      ) && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void changeStatus(transaction, "cancelled")
                        }
                      >
                        <CircleX className="h-4 w-4" />
                        Hủy đơn
                      </Button>
                    )}
                    {transaction.orderStatus === "completed" && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <Clock3 className="h-3.5 w-3.5" />
                        Giao dịch đã hoàn tất
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </UserFlowLayout>
  );
}

function paymentLabel(method: UserTransaction["paymentMethod"]) {
  const labels: Record<UserTransaction["paymentMethod"], string> = {
    cod: "Thanh toán khi nhận hàng",
    banking: "Chuyển khoản",
    zalopay: "ZaloPay",
    momo: "MoMo",
  };
  return labels[method];
}

export default function TransactionsPage() {
  return (
    <UserFlowApp>
      <TransactionsContent />
    </UserFlowApp>
  );
}
