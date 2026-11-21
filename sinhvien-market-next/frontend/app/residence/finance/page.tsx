"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  Wallet,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  KtxPageHeader,
  formatIsoDateVi,
} from "@/components/residence/KtxPageHeader";
import {
  getResidenceInvoices,
  getResidencePayments,
  recordResidencePayment,
  type ResidenceInvoice,
  type ResidencePayment,
} from "@/lib/api/residence-finance";
import { cn } from "@/lib/cn";

const money = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;

const INVOICE_STATUS_META: Record<
  ResidenceInvoice["status"],
  { label: string; cls: string }
> = {
  open: {
    label: "Chưa thanh toán",
    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
  partial: {
    label: "Đã đóng một phần",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  paid: {
    label: "Đã hoàn tất",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  void: {
    label: "Đã hủy",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
};

const PAYMENT_STATUS_META: Record<
  ResidencePayment["status"],
  { label: string; cls: string }
> = {
  pending: {
    label: "Chờ Ban quản lý đối soát",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  confirmed: {
    label: "Đã xác nhận",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  rejected: {
    label: "Từ chối đối soát",
    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
};

const METHOD_LABELS: Record<ResidencePayment["method"], string> = {
  bank_transfer: "Chuyển khoản ngân hàng",
  cash: "Tiền mặt tại quầy KTX",
  other: "Phương thức khác",
};

function ResidenceFinanceContent() {
  const { user, loadingUser } = useMainShell();
  const [invoices, setInvoices] = useState<ResidenceInvoice[]>([]);
  const [payments, setPayments] = useState<ResidencePayment[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [methods, setMethods] = useState<
    Record<number, ResidencePayment["method"]>
  >({});
  const [references, setReferences] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const [nextInvoices, nextPayments] = await Promise.all([
        getResidenceInvoices(),
        getResidencePayments(),
      ]);
      setInvoices(nextInvoices);
      setPayments(nextPayments);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không tải được dữ liệu hóa đơn KTX.",
      );
    }
  }

  useEffect(() => {
    if (loadingUser || !user) return;
    let active = true;
    void Promise.all([getResidenceInvoices(), getResidencePayments()])
      .then(([nextInvoices, nextPayments]) => {
        if (!active) return;
        setInvoices(nextInvoices);
        setPayments(nextPayments);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được dữ liệu hóa đơn KTX.",
          );
      });
    return () => {
      active = false;
    };
  }, [loadingUser, user]);

  async function submitPayment(invoice: ResidenceInvoice) {
    const amount = Number(amounts[invoice.id] ?? invoice.outstandingAmount);
    if (!Number.isSafeInteger(amount) || amount < 1) {
      setError("Số tiền thanh toán phải là số nguyên dương.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await recordResidencePayment({
        invoiceId: invoice.id,
        amount,
        method: methods[invoice.id] ?? "bank_transfer",
        reference: references[invoice.id] ?? "",
      });
      setNotice(
        "Đã ghi nhận thông tin nộp phí! Hóa đơn sẽ tự động khấu trừ sau khi Ban quản lý đối soát biên lai.",
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không ghi nhận được thanh toán.",
      );
    } finally {
      setBusy(false);
    }
  }

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        if (inv.status !== "void") {
          acc.total += inv.totalAmount;
          acc.paid += inv.paidAmount;
          acc.outstanding += inv.outstandingAmount;
        }
        return acc;
      },
      { total: 0, paid: 0, outstanding: 0 },
    );
  }, [invoices]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <KtxPageHeader
        title="Hóa đơn & Phí lưu trú KTX"
        description="Tra cứu chi tiết tiền phòng, điện nước định kỳ và gửi xác nhận chuyển khoản nộp phí nội trú trực tuyến."
      />

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted">Tổng phí phát sinh</p>
              <p className="text-lg font-black text-fg">{money(totals.total)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted">Đã thanh toán</p>
              <p className="text-lg font-black text-emerald-500">
                {money(totals.paid)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted">Dư nợ cần đóng</p>
              <p className="text-lg font-black text-amber-500">
                {money(totals.outstanding)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-5">
        {invoices.length === 0 && (
          <p className="rounded-3xl border border-border bg-surface p-8 text-center text-sm text-muted">
            Chưa có hóa đơn lưu trú nào.
          </p>
        )}
        {invoices.map((invoice) => {
          const meta = INVOICE_STATUS_META[invoice.status];
          const progress =
            invoice.totalAmount > 0
              ? Math.round((invoice.paidAmount / invoice.totalAmount) * 100)
              : 100;

          return (
            <article
              key={invoice.id}
              className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 font-mono text-xs font-extrabold text-blue-600 dark:text-blue-300">
                      {invoice.invoiceNumber}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-extrabold",
                        meta.cls,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <h2 className="mt-2.5 text-lg font-extrabold text-fg">
                    {invoice.description}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Ngày phát hành: {formatIsoDateVi(invoice.issuedAt)} · Hạn đóng:{" "}
                    <strong className="text-fg">
                      {formatIsoDateVi(invoice.dueDate)}
                    </strong>
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-right">
                  <p className="text-xs font-semibold text-muted">
                    Tổng cộng:{" "}
                    <strong className="text-sm text-fg">
                      {money(invoice.totalAmount)}
                    </strong>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Đã trả:{" "}
                    <span className="font-bold text-emerald-500">
                      {money(invoice.paidAmount)}
                    </span>{" "}
                    · Còn lại:{" "}
                    <span className="font-extrabold text-amber-500">
                      {money(invoice.outstandingAmount)}
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-surface-2">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full rounded-full bg-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="my-4 overflow-hidden rounded-2xl border border-border bg-bg">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-border bg-surface-2/60 text-xs font-bold text-muted">
                    <tr>
                      <th className="px-4 py-2.5">Khoản mục phí</th>
                      <th className="px-4 py-2.5">Diễn giải</th>
                      <th className="px-4 py-2.5 text-right">SL × Đơn giá</th>
                      <th className="px-4 py-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2.5 font-bold text-fg">
                          {line.categoryName}
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {line.description}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap text-muted">
                          {line.quantity} × {money(line.unitPrice)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-extrabold whitespace-nowrap text-fg">
                          {money(line.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invoice.outstandingAmount > 0 && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <p className="mb-3 text-xs font-extrabold text-blue-600 uppercase dark:text-blue-300">
                    Gửi xác nhận thanh toán cho hóa đơn này
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <label className="text-xs font-bold text-muted">
                      Số tiền nộp (VNĐ)
                      <input
                        className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-bold text-fg"
                        type="number"
                        min="1"
                        max={invoice.outstandingAmount}
                        value={
                          amounts[invoice.id] ?? invoice.outstandingAmount
                        }
                        onChange={(event) =>
                          setAmounts((current) => ({
                            ...current,
                            [invoice.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="text-xs font-bold text-muted">
                      Phương thức nộp
                      <select
                        className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
                        value={methods[invoice.id] ?? "bank_transfer"}
                        onChange={(event) =>
                          setMethods((current) => ({
                            ...current,
                            [invoice.id]: event.target
                              .value as ResidencePayment["method"],
                          }))
                        }
                      >
                        <option value="bank_transfer">
                          Chuyển khoản ngân hàng
                        </option>
                        <option value="cash">Tiền mặt tại quầy</option>
                        <option value="other">Phương thức khác</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-muted">
                      Mã giao dịch / Nội dung CK
                      <input
                        type="text"
                        placeholder="VD: VCB9928172..."
                        value={references[invoice.id] ?? ""}
                        onChange={(event) =>
                          setReferences((current) => ({
                            ...current,
                            [invoice.id]: event.target.value,
                          }))
                        }
                        className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg"
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void submitPayment(invoice)}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4" />
                        Ghi nhận thanh toán
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold text-fg">
            Lịch sử ghi nhận thanh toán ({payments.length})
          </h2>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-muted">Chưa có giao dịch thanh toán nào.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((payment) => {
              const pMeta = PAYMENT_STATUS_META[payment.status];
              return (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-sm"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {payment.invoiceNumber}
                      </span>
                      <span className="font-semibold text-fg">
                        {METHOD_LABELS[payment.method]}
                      </span>
                      {payment.reference && (
                        <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
                          Mã GD: {payment.reference}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Thời gian: {payment.createdAt}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-fg">
                      {money(payment.amount)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-extrabold",
                        pMeta.cls,
                      )}
                    >
                      {pMeta.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ResidenceFinancePage() {
  return (
    <MainShell>
      <ResidenceFinanceContent />
    </MainShell>
  );
}
