"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Eye,
  EyeOff,
  MessageSquareText,
  Search,
  Star,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { adminInputClass } from "@/components/admin/Modal";
import { getAdminRatings, toggleRatingVisibility } from "@/lib/api/admin";
import type { AdminRating } from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateTimeVi } from "@/lib/validation/admin";

type VisibilityFilter = "all" | "visible" | "hidden";

function StarBadge({ stars }: { stars: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((index) => (
          <Star
            key={index}
            className={cn(
              "h-3.5 w-3.5",
              index <= stars
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300 dark:text-slate-600",
            )}
          />
        ))}
      </div>
      <span className="ml-0.5">{stars}/5</span>
    </div>
  );
}

function RatingsContent() {
  const { showToast } = useAdminShell();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getAdminRatings()
      .then((res) => {
        if (!active) return;
        setRatings(res);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đánh giá.";
        showToast(msg, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const stats = useMemo(() => {
    const total = ratings.length;
    const visible = ratings.filter((r) => r.status === "visible").length;
    const hidden = total - visible;
    const avg =
      total > 0
        ? Math.round(
            (ratings.reduce((sum, r) => sum + r.stars, 0) / total) * 10,
          ) / 10
        : 0;
    return { total, visible, hidden, avg };
  }, [ratings]);

  const filteredRatings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ratings.filter((item) => {
      if (visibilityFilter !== "all" && item.status !== visibilityFilter) {
        return false;
      }
      if (starFilter !== "all" && item.stars !== starFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(item.id).includes(q) ||
        item.raterName.toLowerCase().includes(q) ||
        item.rateeName.toLowerCase().includes(q) ||
        item.productTitle.toLowerCase().includes(q) ||
        (item.comment && item.comment.toLowerCase().includes(q))
      );
    });
  }, [ratings, visibilityFilter, starFilter, searchQuery]);

  const handleToggle = async (ratingId: number) => {
    setTogglingId(ratingId);
    try {
      const res = await toggleRatingVisibility(ratingId);
      setRatings((prev) =>
        prev.map((item) => (item.id === ratingId ? res.rating : item)),
      );
      showToast(res.message, "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái hiển thị.";
      showToast(msg, "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Tổng lượt đánh giá
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Điểm trung bình sàn
          </span>
          <p className="mt-2 flex items-center gap-1.5 text-2xl font-extrabold text-amber-500">
            {stats.avg.toFixed(1)}
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Đang hiển thị công khai
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.visible}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Đã ẩn do vi phạm
          </span>
          <p className="mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats.hidden}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "all", label: `Tất cả (${stats.total})` },
                { key: "visible", label: `Hiển thị (${stats.visible})` },
                { key: "hidden", label: `Đã ẩn (${stats.hidden})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setVisibilityFilter(tab.key)}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-xs font-bold transition",
                  visibilityFilter === tab.key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                {tab.label}
              </button>
            ))}

            <select
              aria-label="Lọc theo số sao"
              value={starFilter}
              onChange={(e) =>
                setStarFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Tất cả mức sao</option>
              <option value={5}>⭐⭐⭐⭐⭐ (5 sao)</option>
              <option value={4}>⭐⭐⭐⭐ (4 sao)</option>
              <option value={3}>⭐⭐⭐ (3 sao)</option>
              <option value={2}>⭐⭐ (2 sao)</option>
              <option value={1}>⭐ (1 sao)</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm người đánh giá, bình luận, sản phẩm..."
              className={cn(adminInputClass, "pl-9")}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquareText className="mx-auto mb-2 h-10 w-10 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Không có đánh giá nào khớp với bộ lọc
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hãy thử chọn lại mức sao hoặc xóa từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">#ID</th>
                  <th className="px-4 py-3.5">Người đánh giá</th>
                  <th className="px-4 py-3.5">Người được đánh giá</th>
                  <th className="px-4 py-3.5">Điểm</th>
                  <th className="px-4 py-3.5">Nhận xét & Sản phẩm</th>
                  <th className="px-4 py-3.5">Ngày tạo</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredRatings.map((rt) => {
                  const isHidden = rt.status === "hidden";
                  const busy = togglingId === rt.id;
                  return (
                    <tr
                      key={rt.id}
                      className={cn(
                        "align-top transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                        isHidden && "bg-slate-50/50 opacity-75 dark:bg-slate-900/40",
                      )}
                    >
                      <td className="px-4 py-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        #{rt.id}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/users/detail?id=${rt.raterId}`}
                          className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {rt.raterName}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {rt.raterEmail}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/users/detail?id=${rt.rateeId}`}
                          className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {rt.rateeName}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {rt.rateeEmail}
                        </p>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <StarBadge stars={rt.stars} />
                      </td>

                      <td className="max-w-md px-4 py-4">
                        <p
                          className={cn(
                            "text-sm leading-relaxed text-slate-700 dark:text-slate-200",
                            isHidden && "line-through opacity-75",
                          )}
                        >
                          {rt.comment || (
                            <span className="italic text-slate-400">
                              Không để lại bình luận
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          📦 Giao dịch #{rt.transactionId} • {rt.productTitle}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateTimeVi(rt.createdAt)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {isHidden ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                            <EyeOff className="h-3 w-3" />
                            Đã ẩn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <Eye className="h-3 w-3" />
                            Hiển thị
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggle(rt.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50",
                            isHidden
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
                          )}
                        >
                          {isHidden ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Hiện lại
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              Ẩn đánh giá
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminRatingsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Kiểm duyệt Đánh giá"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <RatingsContent key={refreshKey} />
    </AdminShell>
  );
}
