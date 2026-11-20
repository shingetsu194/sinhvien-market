"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  ImageIcon,
  Images,
  Link2,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import {
  adminInputClass,
  adminLabelClass,
  Modal,
  ModalActions,
} from "@/components/admin/Modal";
import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  toggleBanner,
  updateBanner,
} from "@/lib/api/admin";
import { isApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import type { AdminBanner } from "@/lib/types/admin";
import { validateBannerLink } from "@/lib/validation/admin";

const MAX_IMAGE_BYTES = 1_000_000;

interface BannerForm {
  id: number | null;
  title: string;
  link: string;
  displayOrder: string;
  isActive: boolean;
  imageUrl: string;
}

const EMPTY_FORM: BannerForm = {
  id: null,
  title: "",
  link: "",
  displayOrder: "0",
  isActive: true,
  imageUrl: "",
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function BannersContent() {
  const { showToast } = useAdminShell();
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<BannerForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);

  useEffect(() => {
    let alive = true;
    getAdminBanners().then((data) => {
      if (alive) setBanners(data);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  function reportError(e: unknown) {
    showToast(
      isApiError(e) ? e.message : "Đã có lỗi xảy ra. Vui lòng thử lại.",
      "error",
    );
  }

  function openCreate() {
    setErrors({});
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(b: AdminBanner) {
    setErrors({});
    setForm({
      id: b.id,
      title: b.title,
      link: b.link,
      displayOrder: String(b.displayOrder),
      isActive: b.isActive,
      imageUrl: b.imageUrl,
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!form || !file) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: "Chỉ hỗ trợ ảnh JPEG, PNG, GIF hoặc WebP.",
      }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        image: "Ảnh tối đa 1MB để lưu được trong bản demo.",
      }));
      return;
    }
    const url = await readFileAsDataUrl(file);
    setForm({ ...form, imageUrl: url });
    setErrors((prev) => ({ ...prev, image: "" }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const isEdit = form.id !== null;
    const next: Record<string, string> = {};
    if (!isEdit && !form.imageUrl) next.image = "Vui lòng chọn ảnh Banner hợp lệ.";
    const linkErr = validateBannerLink(form.link);
    if (linkErr) next.link = linkErr;
    const order = Number(form.displayOrder);
    if (!Number.isInteger(order) || order < 0) {
      next.displayOrder = "Thứ tự phải là số nguyên không âm.";
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const res = isEdit
        ? await updateBanner({
            id: form.id as number,
            title: form.title,
            link: form.link,
            displayOrder: order,
          })
        : await createBanner({
            title: form.title,
            link: form.link,
            displayOrder: order,
            isActive: form.isActive,
            imageUrl: form.imageUrl,
          });
      showToast(res.message, "success");
      setForm(null);
      setVersion((v) => v + 1);
    } catch (err) {
      reportError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(b: AdminBanner) {
    setBusyId(b.id);
    try {
      const res = await toggleBanner(b.id);
      showToast(res.message, "success");
      setVersion((v) => v + 1);
    } catch (err) {
      reportError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setSubmitting(true);
    try {
      const res = await deleteBanner(target.id);
      showToast(res.message, "success");
      setVersion((v) => v + 1);
    } catch (err) {
      reportError(err);
    } finally {
      setSubmitting(false);
      setDeleting(null);
    }
  }

  const isEdit = form !== null && form.id !== null;

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="m-0 mb-1 flex items-center gap-2 text-2xl font-extrabold text-fg">
            <Images className="h-6 w-6 text-primary" aria-hidden="true" />
            Quản lý Banner
          </h2>
          <p className="m-0 text-sm text-muted">
            Tùy chỉnh slider hiển thị ở đầu trang chủ.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold whitespace-nowrap text-white shadow-xs transition-all hover:-translate-y-0.5 hover:brightness-110"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Thêm Banner mới
        </button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-xs">
        <div className="border-b border-border bg-surface-2/50 px-6 py-4 text-sm font-extrabold text-fg">
          Danh sách Banner
        </div>

        {banners === null ? (
          <div className="p-16 text-center text-sm text-muted">Đang tải...</div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <ImageIcon className="h-12 w-12 text-muted/40" aria-hidden="true" />
            <p className="m-0 text-sm font-medium text-muted">
              Chưa có banner nào. Hãy thêm một banner mới để trang chủ sinh động hơn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-[11px] font-bold tracking-wider text-muted uppercase">
                  <th className="w-20 px-5 py-3.5 text-center">Thứ tự</th>
                  <th className="w-[220px] px-5 py-3.5">Hình ảnh</th>
                  <th className="px-5 py-3.5">Thông tin</th>
                  <th className="w-[130px] px-5 py-3.5">Trạng thái</th>
                  <th className="w-[130px] px-5 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {banners.map((b) => (
                  <tr
                    key={b.id}
                    className="transition-colors hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-base font-black text-fg">
                        {b.displayOrder}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.imageUrl}
                        alt={b.title}
                        className="h-[68px] w-[180px] rounded-xl bg-surface-2 object-cover shadow-xs"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="mb-1 text-sm font-bold text-fg">
                        {b.title || "Không tên"}
                      </div>
                      {b.link ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-500">
                          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {b.link}
                        </span>
                      ) : (
                        <span className="text-xs text-muted italic">
                          Không có link đính kèm
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => void handleToggle(b)}
                        aria-pressed={b.isActive}
                        className={cn(
                          "inline-flex w-[104px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:cursor-wait disabled:opacity-60",
                          b.isActive
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "border border-border bg-surface-2 text-muted hover:text-fg",
                        )}
                      >
                        {b.isActive ? (
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {b.isActive ? "Hiển thị" : "Đang ẩn"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          title="Sửa"
                          aria-label={`Sửa banner ${b.title}`}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-blue-300 bg-transparent text-blue-500 transition-all hover:border-blue-500 hover:bg-blue-500 hover:text-white dark:border-blue-800"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(b)}
                          title="Xóa"
                          aria-label={`Xóa banner ${b.title}`}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-red-300 bg-transparent text-red-400 transition-all hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-800"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        tone={isEdit ? "cyan" : "indigo"}
        maxWidth="max-w-[500px]"
        icon={
          isEdit ? (
            <Pencil className="h-7 w-7" aria-hidden="true" />
          ) : (
            <PlusCircle className="h-7 w-7" aria-hidden="true" />
          )
        }
        title={isEdit ? "Chỉnh sửa thông tin Banner" : "Thêm Banner mới"}
        subtitle={isEdit ? undefined : "Upload hình ảnh slider trang chủ"}
      >
        {form && (
          <form onSubmit={handleSubmit} noValidate>
            {!isEdit && (
              <div className="mb-4">
                <label htmlFor="banner-image" className={adminLabelClass}>
                  Hình ảnh (tỉ lệ khuyên dùng 2:1){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="banner-image"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFile}
                  className="w-full cursor-pointer text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100"
                />
                {errors.image && (
                  <p role="alert" className="mt-1.5 text-xs font-semibold text-red-500">
                    {errors.image}
                  </p>
                )}
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt="Xem trước banner"
                    className="mt-3 h-24 w-full rounded-xl object-cover"
                  />
                )}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="banner-title" className={adminLabelClass}>
                Tiêu đề nội bộ
              </label>
              <input
                id="banner-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ví dụ: Sự kiện giảm giá Mùa Hè"
                className={adminInputClass}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="banner-link" className={adminLabelClass}>
                Link đích (khi click vào banner)
              </label>
              <input
                id="banner-link"
                type="text"
                value={form.link}
                onChange={(e) => {
                  setForm({ ...form, link: e.target.value });
                  setErrors((prev) => ({ ...prev, link: "" }));
                }}
                placeholder="https://... hoặc /products"
                className={adminInputClass}
              />
              {errors.link && (
                <p role="alert" className="mt-1.5 text-xs font-semibold text-red-500">
                  {errors.link}
                </p>
              )}
            </div>

            <div className={cn("mb-6 grid gap-4", !isEdit && "grid-cols-2")}>
              <div>
                <label htmlFor="banner-order" className={adminLabelClass}>
                  Thứ tự (số nhỏ xếp trước)
                </label>
                <input
                  id="banner-order"
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(e) => {
                    setForm({ ...form, displayOrder: e.target.value });
                    setErrors((prev) => ({ ...prev, displayOrder: "" }));
                  }}
                  className={adminInputClass}
                />
                {errors.displayOrder && (
                  <p role="alert" className="mt-1.5 text-xs font-semibold text-red-500">
                    {errors.displayOrder}
                  </p>
                )}
              </div>
              {!isEdit && (
                <div>
                  <label htmlFor="banner-active" className={adminLabelClass}>
                    Trạng thái
                  </label>
                  <select
                    id="banner-active"
                    value={form.isActive ? "1" : "0"}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.value === "1" })
                    }
                    className={cn(adminInputClass, "cursor-pointer")}
                  >
                    <option value="1">Hiển thị ngay</option>
                    <option value="0">Tạm ẩn</option>
                  </select>
                </div>
              )}
            </div>

            <ModalActions
              tone={isEdit ? "cyan" : "indigo"}
              submitLabel={isEdit ? "Lưu thay đổi" : "Tải lên"}
              submitting={submitting}
              onCancel={() => setForm(null)}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        tone="red"
        icon={<Trash2 className="h-7 w-7" aria-hidden="true" />}
        title="Xóa Banner?"
        subtitle="Banner sẽ bị xóa vĩnh viễn, không thể hoàn tác."
      >
        <p className="mb-6 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-fg">
          {deleting?.title || "Không tên"}
        </p>
        <ModalActions
          type="button"
          tone="red"
          submitLabel="Xóa Banner"
          submitting={submitting}
          onSubmit={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      </Modal>
    </div>
  );
}

export default function AdminBannersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Quản lý Banner"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <BannersContent key={refreshKey} />
    </AdminShell>
  );
}
