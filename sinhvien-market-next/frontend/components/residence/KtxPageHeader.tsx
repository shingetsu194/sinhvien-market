"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  MessageSquareMore,
  Store,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";

export function formatIsoDateVi(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface DateFieldViProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  required?: boolean;
  hint?: string;
}

export function DateFieldVi({
  label,
  value,
  onChange,
  required,
  hint,
}: DateFieldViProps) {
  return (
    <div className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">
          <Calendar className="h-3 w-3" />
          {value ? formatIsoDateVi(value) : "Ngày/Tháng/Năm"}
        </span>
      </div>
      <input
        type="date"
        aria-label={label}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg transition focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

const KTX_NAV_ITEMS = [
  {
    href: "/residence",
    label: "Hồ sơ lưu trú",
    icon: FileText,
  },
  {
    href: "/residence/announcements",
    label: "Thông báo & Nội quy",
    icon: Bell,
  },
  {
    href: "/residence/finance",
    label: "Hóa đơn & Phí",
    icon: CreditCard,
  },
  {
    href: "/residence/services",
    label: "Yêu cầu hỗ trợ",
    icon: Wrench,
  },
  {
    href: "/residence/assistant",
    label: "Trợ lý Nội quy",
    icon: MessageSquareMore,
  },
  {
    href: "/rentals",
    label: "Mặt bằng cho thuê",
    icon: Store,
  },
];

interface KtxPageHeaderProps {
  badge?: string;
  title: string;
  description: string;
}

export function KtxPageHeader({
  badge = "Dịch vụ Ký túc xá SinhVienMarket",
  title,
  description,
}: KtxPageHeaderProps) {
  const pathname = usePathname();

  return (
    <div className="mb-7 space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-linear-to-br from-blue-600 via-blue-700 to-sky-600 p-6 text-white shadow-lg sm:p-7 dark:border-blue-500/30">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-extrabold tracking-wide text-blue-50 uppercase">
              <Building2 className="h-3.5 w-3.5 text-sky-200" />
              {badge}
            </div>
            <h1 className="mt-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-blue-50/90">
              {description}
            </p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          {KTX_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition",
                  active
                    ? "bg-white text-blue-700 shadow-sm"
                    : "bg-white/15 text-blue-50 hover:bg-white/25 hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    active ? "text-blue-600" : "text-sky-200",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
