"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Dices,
  ExternalLink,
  Gift,
  ImagePlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import {
  Modal,
  ModalActions,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/Modal";
import {
  createGiveaway,
  deleteGiveaway,
  getAdminGiveaways,
} from "@/lib/api/admin";
import type { AdminGiveaway } from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateTimeVi } from "@/lib/validation/admin";

const MAX_IMAGE_SIZE = 1024 * 1024;
const DEFAULT_END_TIME = "2026-11-15T20:00";

type StatusTab = "all" | "active" | "ended";

function GiveawaysContent() {
  const { showToast } = useAdminShell();
  const [loading, setLoading] = useState(true);
  const [giveaways, setGiveaways] = useState<AdminGiveaway[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminGiveaway | null>(null);

  const reloadGiveaways = () => {
    getAdminGiveaways()
      .then((res) => {
        setGiveaways(res);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách Giveaway.";
        showToast(msg, "error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminGiveaways()
      .then((res) => {
        if (!active) return;
        setGiveaways(res);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách Giveaway.";
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
    const total = giveaways.length;
    const active = giveaways.filter((g) => g.status === "active").length;
    const ended = total - active;
    const totalParticipants = giveaways.reduce(
      (sum, g) => sum + g.participants.length,
      0,
    );
    return { total, active, ended, totalParticipants };
  }, [giveaways]);

  const filteredGiveaways = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return giveaways.filter((gw) => {
      if (statusTab !== "all" && gw.status !== statusTab) return false;
      if (!q) return true;
      return (
        String(gw.id).includes(q) ||
        gw.title.toLowerCase().includes(q) ||
        gw.description.toLowerCase().includes(q) ||
        (gw.winnerName && gw.winnerName.toLowerCase().includes(q))
      );
    });
  }, [giveaways, statusTab, searchQuery]);

  const openCreateModal = () => {
    setTitle("");
    setDescription("");
    setEndTime(DEFAULT_END_TIME);
    setImagePreview("");
    setFormError(null);
    setCreateOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setFormError("Chỉ hỗ trợ ảnh JPEG, PNG, GIF hoặc WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFormError("Ảnh phần thưởng không được vượt quá 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      setFormError("Tên phần thưởng / sự kiện phải có ít nhất 3 ký tự.");
      return;
    }
    if (!endTime) {
      setFormError("Vui lòng chọn thời gian kết thúc sự kiện.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await createGiveaway({
        title: title.trim(),
        description: description.trim(),
        endTime: new Date(endTime).toISOString(),
        imageUrl: imagePreview.trim() || undefined,
      });
      showToast(res.message, "success");
      setCreateOpen(false);
      reloadGiveaways();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể tạo sự kiện Giveaway.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await deleteGiveaway(deleteTarget.id);
      showToast(res.message, "success");
      setDeleteTarget(null);
      reloadGiveaways();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể xóa sự kiện Giveaway.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Tổng sự kiện
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Đang mở đăng ký
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Đã quay thưởng
          </span>
          <p className="mt-2 text-2xl font-extrabold text-amber-500">
            {stats.ended}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Tổng lượt tham gia
          </span>
          <p className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {stats.totalParticipants}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "all", label: `Tất cả (${stats.total})` },
                { key: "active", label: `Đang mở (${stats.active})` },
                { key: "ended", label: `Đã kết thúc (${stats.ended})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-xs font-bold transition",
                  statusTab === tab.key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên sự kiện, người trúng..."
                className={cn(adminInputClass, "pl-9")}
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Tạo Giveaway mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : filteredGiveaways.length === 0 ? (
          <div className="p-12 text-center">
            <Gift className="mx-auto mb-2 h-10 w-10 text-sky-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Chưa có sự kiện Giveaway nào phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nhấn nút &ldquo;Tạo Giveaway mới&rdquo; để khởi tạo chương trình quà tặng cho sinh viên.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">#ID</th>
                  <th className="px-4 py-3.5">Phần thưởng / Sự kiện</th>
                  <th className="px-4 py-3.5">Thời gian kết thúc</th>
                  <th className="px-4 py-3.5">Tham gia</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Người trúng giải</th>
                  <th className="px-4 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredGiveaways.map((gw) => {
                  const isActive = gw.status === "active";
                  return (
                    <tr
                      key={gw.id}
                      className="align-middle transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        #{gw.id}
                      </td>

                      <td className="max-w-md px-4 py-4">
                        <div className="flex items-start gap-3">
                          {gw.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={gw.imageUrl}
                              alt={gw.title}
                              className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-500/15 to-blue-500/15 text-sky-600 dark:text-sky-400">
                              <Gift className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {gw.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {gw.description || "Không có mô tả chi tiết"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTimeVi(gw.endTime)}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                          <Users className="h-3.5 w-3.5" />
                          {gw.participants.length} sinh viên
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <Sparkles className="h-3 w-3" />
                            Đang mở
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Đã kết thúc
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {gw.winnerName ? (
                          <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                            {gw.winnerId ? (
                              <Link
                                href={`/admin/users/detail?id=${gw.winnerId}`}
                                className="inline-flex items-center gap-1 hover:underline"
                              >
                                {gw.winnerName}
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                            ) : (
                              <span>{gw.winnerName}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">
                            Chưa quay số
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/admin/giveaway-spin?id=${gw.id}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                              isActive
                                ? "bg-linear-to-r from-blue-600 to-sky-600 text-white shadow-xs hover:from-blue-500 hover:to-sky-500"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
                            )}
                          >
                            <Dices className="h-3.5 w-3.5" />
                            {isActive ? "Quay thưởng" : "Xem bàn quay"}
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(gw)}
                            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                            title="Xóa sự kiện"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!submitting) setCreateOpen(false);
        }}
        title="Tạo sự kiện Giveaway mới"
        subtitle="Khởi tạo chương trình bốc thăm trúng thưởng miễn phí dành cho sinh viên trên sàn"
        icon={<Gift className="h-6 w-6" />}
        tone="indigo"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label htmlFor="gw-title" className={adminLabelClass}>
              Tên phần thưởng / Sự kiện <span className="text-rose-500">*</span>
            </label>
            <input
              id="gw-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Tặng Chuột Không Dây Logitech M331 Mùa Thi..."
              className={adminInputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="gw-desc" className={adminLabelClass}>
              Mô tả thể lệ & phần thưởng
            </label>
            <textarea
              id="gw-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết quà tặng và cách nhận giải..."
              className={adminInputClass}
            />
          </div>

          <div>
            <label htmlFor="gw-endtime" className={adminLabelClass}>
              Thời gian kết thúc đăng ký <span className="text-rose-500">*</span>
            </label>
            <input
              id="gw-endtime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={adminInputClass}
              required
            />
          </div>

          <div>
            <label className={adminLabelClass}>
              Ảnh minh họa phần thưởng (Tối đa 1MB hoặc nhập URL)
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <ImagePlus className="h-4 w-4 text-blue-500" />
                Chọn file ảnh
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={imagePreview.startsWith("data:") ? "" : imagePreview}
                onChange={(e) => setImagePreview(e.target.value)}
                placeholder="Hoặc dán link ảnh https://..."
                className={cn(adminInputClass, "flex-1")}
              />
            </div>

            {imagePreview && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Xem trước phần thưởng"
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Đã chọn ảnh minh họa
                  </p>
                  <button
                    type="button"
                    onClick={() => setImagePreview("")}
                    className="mt-1 text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Xóa ảnh này
                  </button>
                </div>
              </div>
            )}
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300">
              {formError}
            </p>
          )}

          <ModalActions
            onCancel={() => setCreateOpen(false)}
            submitLabel="Tạo sự kiện Giveaway"
            tone="indigo"
            submitting={submitting}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!submitting) setDeleteTarget(null);
        }}
        title="Xóa sự kiện Giveaway?"
        subtitle={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa sự kiện "${deleteTarget.title}" cùng danh sách ${deleteTarget.participants.length} sinh viên đã đăng ký?`
            : undefined
        }
        icon={<Trash2 className="h-6 w-6" />}
        tone="red"
      >
        <ModalActions
          type="button"
          onCancel={() => setDeleteTarget(null)}
          onSubmit={handleConfirmDelete}
          submitLabel="Xóa sự kiện"
          tone="red"
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}

export default function AdminGiveawaysPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Quản lý Giveaways"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <GiveawaysContent key={refreshKey} />
    </AdminShell>
  );
}
