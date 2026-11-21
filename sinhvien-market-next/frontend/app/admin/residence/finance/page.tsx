"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  FilePlus2,
  Receipt,
  Tags,
  XCircle,
} from "lucide-react";
import { AdminKtxHeader } from "@/components/admin/AdminKtxHeader";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { formatIsoDateVi } from "@/components/residence/KtxPageHeader";
import {
  createResidenceInvoice,
  getAdminFeeCategories,
  getAdminInvoices,
  getAdminResidencePayments,
  reviewResidencePayment,
  saveFeeCategory,
  voidResidenceInvoice,
  type FeeCategory,
  type ResidenceInvoice,
  type ResidencePayment,
} from "@/lib/api/residence-finance";
import { getBedAllocations, type BedAllocation } from "@/lib/api/residence-operations";

const money = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;

const INVOICE_STATUS_VI: Record<string, { label: string; cls: string }> = {
  open: {
    label: "Chưa thanh toán",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
  },
  partial: {
    label: "Đã đóng một phần",
    cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300",
  },
  paid: {
    label: "Đã tất toán",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  void: {
    label: "Đã hủy",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300",
  },
};

const fieldClass =
  "mt-1.5 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-normal text-fg outline-none transition focus:border-primary";

function FinanceAdminContent() {
  const { user } = useAdminShell();
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [invoices, setInvoices] = useState<ResidenceInvoice[]>([]);
  const [payments, setPayments] = useState<ResidencePayment[]>([]);
  // Students with a residence contract: the invoice form picks from them
  // instead of asking for a numeric account ID.
  const [residents, setResidents] = useState<BedAllocation[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage =
    user?.role === "admin" || user?.roles?.includes("dorm_manager") === true;

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void Promise.all([
      getAdminFeeCategories(),
      getAdminInvoices(),
      getAdminResidencePayments(),
      getBedAllocations(),
    ])
      .then(([feeCategories, nextInvoices, nextPayments, nextResidents]) => {
        if (!active) return;
        setCategories(feeCategories);
        setInvoices(nextInvoices);
        setPayments(nextPayments);
        setResidents(nextResidents);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được dữ liệu tài chính.",
          );
      });
    return () => {
      active = false;
    };
  }, [canManage]);

  async function reload() {
    const [feeCategories, nextInvoices, nextPayments] = await Promise.all([
      getAdminFeeCategories(),
      getAdminInvoices(),
      getAdminResidencePayments(),
    ]);
    setCategories(feeCategories);
    setInvoices(nextInvoices);
    setPayments(nextPayments);
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveFeeCategory({
        name: String(data.get("name")),
        description: String(data.get("description") ?? ""),
      });
      form.reset();
      setMessage("Đã tạo danh mục.");
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được danh mục.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const [userId, contractId] = String(data.get("resident")).split(":").map(Number);
      await createResidenceInvoice({
        userId,
        contractId: contractId || undefined,
        description: String(data.get("description")),
        issuedAt: String(data.get("issuedAt")),
        dueDate: String(data.get("dueDate")),
        lines: [
          {
            feeCategoryId: Number(data.get("feeCategoryId")),
            description: String(data.get("lineDescription")),
            quantity: Number(data.get("quantity")),
            unitPrice: Number(data.get("unitPrice")),
          },
        ],
      });
      form.reset();
      setMessage("Đã lập hóa đơn.");
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tạo được hóa đơn.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvoice(invoice: ResidenceInvoice) {
    if (!window.confirm(`Hủy hóa đơn ${invoice.invoiceNumber} của ${invoice.studentName}?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await voidResidenceInvoice(invoice.id);
      setMessage(`Đã hủy hóa đơn ${invoice.invoiceNumber}.`);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không hủy được hóa đơn.");
    } finally {
      setBusy(false);
    }
  }

  async function review(
    payment: ResidencePayment,
    decision: "confirmed" | "rejected",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await reviewResidencePayment(payment.id, decision);
      setMessage(
        decision === "confirmed"
          ? "Đã xác nhận thanh toán."
          : "Đã từ chối thanh toán.",
      );
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không đối soát được thanh toán.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-sm font-semibold text-fg">
        Bạn không có quyền quản lý tài chính.
      </div>
    );
  }

  const pendingPayments = payments.filter((item) => item.status === "pending");

  return (
    <div className="space-y-6">
      <AdminKtxHeader
        title="Quản lý Phí & Hóa đơn Nội trú KTX"
        description="Thiết lập danh mục phí, phát hành hóa đơn định kỳ cho sinh viên và đối soát các khoản thanh toán chuyển khoản."
      />

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"
        >
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form
          onSubmit={submitCategory}
          className="flex flex-col justify-between gap-4 rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-fg">
                  Danh mục phí nội trú
                </h3>
                <p className="text-xs text-muted">
                  Các khoản thu áp dụng khi lập hóa đơn KTX.
                </p>
              </div>
            </div>

            <label className="block text-xs font-bold text-fg">
              Tên danh mục phí *
              <input
                required
                name="name"
                maxLength={120}
                placeholder="VD: Phí gửi xe máy học kỳ"
                className={fieldClass}
              />
            </label>
            <label className="block text-xs font-bold text-fg">
              Mô tả chi tiết
              <input
                name="description"
                maxLength={500}
                placeholder="Ghi chú đơn giá hoặc đối tượng áp dụng"
                className={fieldClass}
              />
            </label>
            <button
              disabled={busy}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
            >
              Tạo danh mục
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-bold text-muted uppercase">
              Danh mục đang áp dụng ({categories.length})
            </p>
            <ul className="flex flex-wrap gap-1.5 text-xs">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-1 font-bold text-blue-700 dark:border-border dark:bg-surface-2 dark:text-sky-300"
                >
                  {category.name}
                </li>
              ))}
            </ul>
          </div>
        </form>

        <form
          onSubmit={submitInvoice}
          className="grid gap-3.5 rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs sm:grid-cols-2 dark:border-border"
        >
          <div className="flex items-center gap-2.5 sm:col-span-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-fg">
                Lập hóa đơn mới cho sinh viên
              </h3>
              <p className="text-xs text-muted">
                Phát hành hóa đơn phí phòng, điện nước hoặc dịch vụ KTX.
              </p>
            </div>
          </div>

          <label className="text-xs font-bold text-fg">
            Sinh viên (theo hợp đồng lưu trú) *
            <select required name="resident" defaultValue="" className={fieldClass}>
              <option value="">-- Chọn sinh viên --</option>
              {residents.map((r) => (
                <option key={r.contractId} value={`${r.userId}:${r.contractId}`}>
                  {r.studentName} · {r.contractNumber}
                  {r.roomNumber ? ` · ${r.buildingCode}/${r.roomNumber}` : " · chờ phân giường"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-fg">
            Mô tả kỳ hóa đơn *
            <input
              required
              name="description"
              maxLength={255}
              placeholder="VD: Hóa đơn lưu trú & điện nước tháng 12/2026"
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-bold text-fg">
            Danh mục phí *
            <select required name="feeCategoryId" className={fieldClass}>
              {categories
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-bold text-fg">
            Nội dung dòng phí *
            <input
              required
              name="lineDescription"
              maxLength={255}
              placeholder="VD: Tiền phòng tiêu chuẩn Tòa B"
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-bold text-fg">
            Số lượng *
            <input
              required
              name="quantity"
              type="number"
              min="1"
              defaultValue="1"
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-bold text-fg">
            Đơn giá (VNĐ) *
            <input
              required
              name="unitPrice"
              type="number"
              min="0"
              placeholder="450000"
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-bold text-fg">
            Ngày lập *
            <input
              required
              name="issuedAt"
              type="date"
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-bold text-fg">
            Hạn thanh toán *
            <input
              required
              name="dueDate"
              type="date"
              className={fieldClass}
            />
          </label>
          <button
            disabled={busy || categories.every((item) => !item.isActive)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50 sm:col-span-2"
          >
            <Receipt className="h-4 w-4" />
            Tạo hóa đơn
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-surface p-6 shadow-xs dark:border-border">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-fg">
                Thanh toán chờ đối soát ({pendingPayments.length})
              </h3>
              <p className="text-xs text-muted">
                Kiểm tra mã tham chiếu giao dịch trước khi xác nhận gạch nợ.
              </p>
            </div>
          </div>
          <Link
            href="/admin/residence"
            className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-border dark:bg-surface-2 dark:text-sky-300"
          >
            Quản lý lưu trú
          </Link>
        </div>

        {pendingPayments.length === 0 ? (
          <p className="rounded-xl bg-bg p-4 text-center text-xs text-muted">
            Hiện không có khoản thanh toán nào đang chờ đối soát.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-sm"
              >
                <div>
                  <p className="font-bold text-fg">
                    {payment.studentName} ·{" "}
                    <span className="font-mono text-primary">
                      {payment.invoiceNumber}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Phương thức: {payment.method} · Số tiền:{" "}
                    <strong className="text-fg">{money(payment.amount)}</strong>
                    {payment.reference
                      ? ` · Mã GD: ${payment.reference}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void review(payment, "confirmed")}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-primary-dark"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Xác nhận
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void review(payment, "rejected")}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-extrabold text-fg">
          Danh sách Hóa đơn đã phát hành ({invoices.length})
        </h3>
        {invoices.map((invoice) => {
          const st = INVOICE_STATUS_VI[invoice.status] ?? {
            label: invoice.status,
            cls: "bg-blue-50 text-blue-700 border-blue-200",
          };
          return (
            <article
              key={invoice.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-surface p-5 text-sm shadow-xs dark:border-border"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-extrabold text-blue-700 dark:bg-blue-500/15 dark:text-sky-300">
                    {invoice.invoiceNumber}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>
                <p className="mt-1.5 font-extrabold text-fg">
                  {invoice.studentName} · {invoice.description}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Ngày lập: {formatIsoDateVi(invoice.issuedAt)} · Hạn đóng:{" "}
                  {formatIsoDateVi(invoice.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-primary">
                  {money(invoice.totalAmount)}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-muted">
                  Còn phải thu:{" "}
                  <strong className="text-fg">
                    {money(invoice.outstandingAmount)}
                  </strong>
                </p>
                {invoice.status === "open" && invoice.paidAmount === 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancelInvoice(invoice)}
                    className="mt-2 cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    Hủy hóa đơn
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default function ResidenceFinanceAdminPage() {
  return (
    <AdminShell title="Phí & Hóa đơn KTX">
      <FinanceAdminContent />
    </AdminShell>
  );
}
