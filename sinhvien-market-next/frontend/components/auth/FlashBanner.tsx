"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import {
  clearFlash,
  getFlashSnapshot,
  parseFlash,
  subscribeFlash,
} from "@/lib/flash";

const getServerSnapshot = () => "";

export function FlashBanner() {
  const pathname = usePathname();
  const initialPathRef = useRef<string | null>(null);
  const raw = useSyncExternalStore(
    subscribeFlash,
    getFlashSnapshot,
    getServerSnapshot,
  );
  const flash = parseFlash(raw);

  useEffect(() => {
    if (!raw) {
      initialPathRef.current = null;
      return;
    }
    if (initialPathRef.current === null) {
      initialPathRef.current = pathname;
      return;
    }
    if (initialPathRef.current !== pathname) {
      clearFlash();
      initialPathRef.current = null;
    }
  }, [pathname, raw]);

  useEffect(() => {
    if (!flash || flash.action) return;
    const timer = window.setTimeout(() => {
      clearFlash();
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [flash, raw]);

  if (!flash) return null;

  return (
    <div className="relative mb-4">
      <Alert variant={flash.variant} className="pr-9">
        <p>{flash.message}</p>
        {flash.action && (
          <p className="mt-1.5">
            <Link
              href={flash.action.href}
              onClick={() => clearFlash()}
              className="font-bold underline underline-offset-2 hover:opacity-80"
            >
              {flash.action.label}
            </Link>
          </p>
        )}
      </Alert>
      <button
        type="button"
        onClick={() => clearFlash()}
        aria-label="Đóng thông báo"
        className="absolute top-2.5 right-2.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-current/70 transition-colors hover:text-current"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
