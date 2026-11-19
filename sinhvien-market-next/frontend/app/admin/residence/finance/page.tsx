"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  createResidenceInvoice,
  getAdminFeeCategories,
  getAdminInvoices,
  getAdminResidencePayments,
  reviewResidencePayment,
  saveFeeCategory,
  type FeeCategory,
  type ResidenceInvoice,
  type ResidencePayment,
} from "@/lib/api/residence-finance";

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;

function FinanceAdminContent() {
  const { user, loadingUser } = useMainShell();
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [invoices, setInvoices] = useState<ResidenceInvoice[]>([]);
  const [payments, setPayments] = useState<ResidencePayment[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  useEffect(() => {
    if (loadingUser || !canManage) return;
    let active = true;
    void Promise.all([getAdminFeeCategories(), getAdminInvoices(), getAdminResidencePayments()])
      .then(([feeCategories, nextInvoices, nextPayments]) => {
        if (!active) return;
        setCategories(feeCategories); setInvoices(nextInvoices); setPayments(nextPayments);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu tài chính.");
      });
    return () => { active = false; };
  }, [loadingUser, canManage]);

  async function reload() {
    const [feeCategories, nextInvoices, nextPayments] = await Promise.all([
      getAdminFeeCategories(), getAdminInvoices(), getAdminResidencePayments(),
    ]);
    setCategories(feeCategories); setInvoices(nextInvoices); setPayments(nextPayments);
  }
  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(""); setMessage("");
    try {
      await saveFeeCategory({ name: String(data.get("name")), description: String(data.get("description") ?? "") });
      form.reset(); setMessage("Đã tạo danh mục."); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được danh mục."); }
    finally { setBusy(false); }
  }
  async function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(""); setMessage("");
    try {
      await createResidenceInvoice({
        userId: Number(data.get("userId")),
        description: String(data.get("description")),
        issuedAt: String(data.get("issuedAt")),
        dueDate: String(data.get("dueDate")),
        lines: [{
          feeCategoryId: Number(data.get("feeCategoryId")),
          description: String(data.get("lineDescription")),
          quantity: Number(data.get("quantity")),
          unitPrice: Number(data.get("unitPrice")),
        }],
      });
      form.reset(); setMessage("Đã lập hóa đơn."); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tạo được hóa đơn."); }
    finally { setBusy(false); }
  }
  async function review(payment: ResidencePayment, decision: "confirmed" | "rejected") {
    setBusy(true); setError(""); setMessage("");
    try {
      await reviewResidencePayment(payment.id, decision);
      setMessage(decision === "confirmed" ? "Đã xác nhận thanh toán." : "Đã từ chối thanh toán.");
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không đối soát được thanh toán."); }
    finally { setBusy(false); }
  }
  if (!loadingUser && !canManage) return <div className="p-8">Bạn không có quyền quản lý tài chính.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted">Quản trị khu lưu trú</p><h1 className="text-3xl font-black text-fg">Phí và hóa đơn</h1></div>
        <Link href="/admin/residence" className="rounded-xl border border-border px-4 py-2 font-semibold">Quản lý lưu trú</Link>
      </header>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submitCategory} className="grid gap-3 rounded-2xl border border-border p-5">
          <h2 className="text-xl font-bold">Danh mục phí</h2>
          <label className="text-sm">Tên<input required name="name" maxLength={120} className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Mô tả<input name="description" maxLength={500} className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">Tạo danh mục</button>
          <ul className="text-sm text-muted">{categories.map((category) => <li key={category.id}>{category.name}</li>)}</ul>
        </form>
        <form onSubmit={submitInvoice} className="grid gap-3 rounded-2xl border border-border p-5 sm:grid-cols-2">
          <h2 className="text-xl font-bold sm:col-span-2">Lập hóa đơn (một dòng phí)</h2>
          <label className="text-sm">ID tài khoản<input required name="userId" type="number" min="1" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Mô tả<input required name="description" maxLength={255} className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Danh mục<select required name="feeCategoryId" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2">{categories.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm">Nội dung phí<input required name="lineDescription" maxLength={255} className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Số lượng<input required name="quantity" type="number" min="1" defaultValue="1" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Đơn giá (VND)<input required name="unitPrice" type="number" min="0" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Ngày lập<input required name="issuedAt" type="date" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <label className="text-sm">Hạn thanh toán<input required name="dueDate" type="date" className="mt-1 block w-full rounded-lg border border-border bg-bg p-2" /></label>
          <button disabled={busy || categories.every((item) => !item.isActive)} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50 sm:col-span-2">Tạo hóa đơn</button>
        </form>
      </div>
      <section className="mt-7 rounded-2xl border border-border p-5">
        <h2 className="mb-3 text-xl font-bold">Thanh toán chờ đối soát</h2>
        {payments.filter((item) => item.status === "pending").map((payment) => (
          <div key={payment.id} className="flex flex-wrap justify-between gap-3 border-t border-border py-3 text-sm">
            <span>{payment.studentName} · {payment.invoiceNumber} · {payment.method} · {money(payment.amount)}</span>
            <span className="flex gap-2"><button disabled={busy} onClick={() => void review(payment, "confirmed")} className="rounded bg-green-700 px-3 py-1 text-white">Xác nhận</button><button disabled={busy} onClick={() => void review(payment, "rejected")} className="rounded border border-red-300 px-3 py-1 text-red-700">Từ chối</button></span>
          </div>
        ))}
      </section>
      <section className="mt-7 space-y-3">
        <h2 className="text-xl font-bold">Hóa đơn</h2>
        {invoices.map((invoice) => <article key={invoice.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-border p-4 text-sm">
          <span>{invoice.invoiceNumber} · {invoice.studentName} · {invoice.description}</span>
          <strong>{money(invoice.totalAmount)} · Còn {money(invoice.outstandingAmount)} · {invoice.status}</strong>
        </article>)}
      </section>
    </div>
  );
}

export default function ResidenceFinanceAdminPage() {
  return <MainShell><FinanceAdminContent /></MainShell>;
}
