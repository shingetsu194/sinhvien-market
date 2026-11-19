"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  getResidenceInvoices,
  getResidencePayments,
  recordResidencePayment,
  type ResidenceInvoice,
  type ResidencePayment,
} from "@/lib/api/residence-finance";

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;

function ResidenceFinanceContent() {
  const { user, loadingUser } = useMainShell();
  const [invoices, setInvoices] = useState<ResidenceInvoice[]>([]);
  const [payments, setPayments] = useState<ResidencePayment[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [methods, setMethods] = useState<Record<number, ResidencePayment["method"]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const [nextInvoices, nextPayments] = await Promise.all([
        getResidenceInvoices(), getResidencePayments(),
      ]);
      setInvoices(nextInvoices);
      setPayments(nextPayments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu học phí.");
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
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu học phí.");
      });
    return () => { active = false; };
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
      });
      setNotice("Đã ghi nhận yêu cầu thanh toán; hóa đơn được cập nhật sau khi ban quản lý đối soát.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không ghi nhận được thanh toán.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Cổng sinh viên</p>
          <h1 className="text-3xl font-black text-fg">Hóa đơn và thanh toán lưu trú</h1>
        </div>
        <Link className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg" href="/residence">
          Hồ sơ lưu trú
        </Link>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      <section className="space-y-4">
        {invoices.length === 0 && <p className="rounded-2xl border border-border p-6 text-muted">Chưa có hóa đơn lưu trú.</p>}
        {invoices.map((invoice) => (
          <article key={invoice.id} className="rounded-2xl border border-border bg-bg p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-bold text-fg">{invoice.description}</h2>
                <p className="mt-1 text-sm text-muted">{invoice.invoiceNumber} · Hạn {invoice.dueDate} · {invoice.status}</p>
              </div>
              <div className="text-right text-sm">
                <p>Tổng: <strong>{money(invoice.totalAmount)}</strong></p>
                <p className="text-muted">Đã trả {money(invoice.paidAmount)} · Còn {money(invoice.outstandingAmount)}</p>
              </div>
            </div>
            <ul className="my-4 divide-y divide-border border-y border-border">
              {invoice.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 py-2 text-sm">
                  <span>{line.categoryName}: {line.description} × {line.quantity}</span>
                  <span className="whitespace-nowrap">{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {invoice.outstandingAmount > 0 && (
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">Số tiền
                  <input className="mt-1 block w-44 rounded-lg border border-border bg-bg px-3 py-2" type="number" min="1"
                    max={invoice.outstandingAmount} value={amounts[invoice.id] ?? invoice.outstandingAmount}
                    onChange={(event) => setAmounts((current) => ({ ...current, [invoice.id]: event.target.value }))} />
                </label>
                <label className="text-sm">Phương thức
                  <select className="mt-1 block rounded-lg border border-border bg-bg px-3 py-2"
                    value={methods[invoice.id] ?? "bank_transfer"}
                    onChange={(event) => setMethods((current) => ({
                      ...current, [invoice.id]: event.target.value as ResidencePayment["method"],
                    }))}>
                    <option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="other">Khác</option>
                  </select>
                </label>
                <button disabled={busy} onClick={() => void submitPayment(invoice)}
                  className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">
                  Ghi nhận thanh toán
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
      <section className="mt-8 rounded-2xl border border-border p-5">
        <h2 className="mb-3 text-xl font-bold text-fg">Lịch sử ghi nhận thanh toán</h2>
        {payments.length === 0 ? <p className="text-sm text-muted">Chưa có giao dịch.</p> : (
          <ul className="divide-y divide-border">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span>{payment.invoiceNumber} · {payment.method} · {payment.createdAt}</span>
                <span>{money(payment.amount)} · {payment.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ResidenceFinancePage() {
  return <MainShell><ResidenceFinanceContent /></MainShell>;
}
