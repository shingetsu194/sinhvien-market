"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const adminInputClass =
  "w-full rounded-xl border-2 border-border bg-bg px-4 py-3 text-sm font-medium text-fg outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10";

export const adminLabelClass =
  "mb-2 block text-xs font-bold tracking-wider text-muted uppercase";

type Tone = "indigo" | "cyan" | "red" | "amber" | "emerald";

const toneStyles: Record<Tone, string> = {
  indigo:
    "from-blue-500 to-sky-500 shadow-[0_8px_24px_rgba(99,102,241,0.4)]",
  cyan: "from-cyan-500 to-blue-500 shadow-[0_8px_24px_rgba(6,182,212,0.4)]",
  red: "from-red-500 to-red-600 shadow-[0_8px_24px_rgba(239,68,68,0.4)]",
  amber: "from-amber-500 to-orange-500 shadow-[0_8px_24px_rgba(245,158,11,0.4)]",
  emerald:
    "from-emerald-500 to-green-600 shadow-[0_8px_24px_rgba(16,185,129,0.4)]",
};

export const toneButtonClass: Record<Tone, string> = {
  indigo: "bg-gradient-to-r from-blue-500 to-sky-500",
  cyan: "bg-gradient-to-r from-cyan-500 to-blue-500",
  red: "bg-gradient-to-r from-red-500 to-red-600",
  amber: "bg-gradient-to-r from-amber-500 to-orange-500",
  emerald: "bg-gradient-to-r from-emerald-500 to-green-600",
};

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  tone?: Tone;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  open,
  title,
  subtitle,
  icon,
  tone = "indigo",
  maxWidth = "max-w-[460px]",
  onClose,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop-enter fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "modal-enter my-auto w-full rounded-[22px] border border-border bg-surface p-7 shadow-2xl",
          maxWidth,
        )}
      >
        <div
          className={cn(
            "mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-gradient-to-br text-white",
            toneStyles[tone],
          )}
        >
          {icon}
        </div>
        <h3 className="mb-1 text-xl font-black text-fg">{title}</h3>
        {subtitle && (
          <p className="mb-6 text-sm font-medium text-muted">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-5" />}
        {children}
      </div>
    </div>
  );
}

interface ModalActionsProps {
  submitLabel: string;
  submitting?: boolean;
  tone?: Tone;
  onCancel: () => void;
  cancelLabel?: string;
  type?: "submit" | "button";
  onSubmit?: () => void;
}

export function ModalActions({
  submitLabel,
  submitting = false,
  tone = "indigo",
  onCancel,
  cancelLabel = "Hủy",
  type = "submit",
  onSubmit,
}: ModalActionsProps) {
  return (
    <div className="space-y-2">
      <button
        type={type}
        onClick={onSubmit}
        disabled={submitting}
        className={cn(
          "w-full cursor-pointer rounded-xl py-3.5 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-60",
          toneButtonClass[tone],
        )}
      >
        {submitting ? "Đang xử lý..." : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="w-full cursor-pointer rounded-xl bg-surface-2 py-3 text-sm font-bold text-muted transition-colors hover:text-fg disabled:opacity-60"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
