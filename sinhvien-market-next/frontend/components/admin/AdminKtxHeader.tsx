"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Gauge,
  Megaphone,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ADMIN_KTX_NAV = [
  {
    href: "/admin/residence/dashboard",
    label: "Dashboard vận hành",
    icon: Gauge,
  },
  {
    href: "/admin/residence",
    label: "Xét duyệt lưu trú",
    icon: Building2,
  },
  {
    href: "/admin/residence/operations",
    label: "Cơ sở vật chất & Giường",
    icon: Wrench,
  },
  {
    href: "/admin/residence/finance",
    label: "Phí & Hóa đơn KTX",
    icon: CreditCard,
  },
  {
    href: "/admin/residence/notices",
    label: "Thông báo & Nội quy",
    icon: Megaphone,
  },
];

export function AdminKtxHeader({
  badge = "Ban quản lý Ký túc xá & Hệ thống",
  title,
  description,
}: {
  badge?: string;
  title: string;
  description: string;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-7 overflow-hidden rounded-3xl border border-blue-200/80 bg-linear-to-br from-blue-600 via-blue-700 to-sky-600 p-6 text-white shadow-lg sm:p-7 dark:border-blue-500/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-extrabold tracking-wider text-blue-50 uppercase">
            <Building2 className="h-3.5 w-3.5 text-sky-200" />
            {badge}
          </span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-blue-50/90">{description}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
        {ADMIN_KTX_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition",
                active
                  ? "bg-white text-blue-700 shadow-xs"
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
  );
}
