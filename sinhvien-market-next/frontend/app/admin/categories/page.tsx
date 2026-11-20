"use client";

import { useEffect, useState } from "react";
import { Pencil, PlusCircle, Tags, Trash2 } from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { CategoryIcon } from "@/components/admin/CategoryIcon";
import {
  adminInputClass,
  adminLabelClass,
  Modal,
  ModalActions,
} from "@/components/admin/Modal";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
} from "@/lib/api/admin";
import { isApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { CATEGORY_ICONS } from "@/lib/constants/admin";
import type { AdminCategory, CategoryIconKey } from "@/lib/types/admin";
import {
  formatDateVi,
  makeCategorySlug,
  validateCategoryName,
} from "@/lib/validation/admin";

interface FormState {
  id: number | null;
  name: string;
  icon: CategoryIconKey;
}

const EMPTY_FORM: FormState = { id: null, name: "", icon: "bi-box-seam" };

function CategoriesContent() {
  const { showToast } = useAdminShell();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  useEffect(() => {
    let alive = true;
    getAdminCategories().then((data) => {
      if (alive) setCategories(data);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  function openCreate() {
    setFormError(null);
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(cat: AdminCategory) {
    setFormError(null);
    setForm({ id: cat.id, name: cat.name, icon: cat.icon });
  }

  function reportError(e: unknown) {
    showToast(
      isApiError(e) ? e.message : "Đã có lỗi xảy ra. Vui lòng thử lại.",
      "error",
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const err = validateCategoryName(form.name);
    if (err) {
      setFormError(err);
      return;
    }
    setSubmitting(true);
    try {
      const res =
        form.id === null
          ? await createCategory({ name: form.name, icon: form.icon })
          : await updateCategory({
              id: form.id,
              name: form.name,
              icon: form.icon,
            });
      showToast(res.message, "success");
      setForm(null);
      setVersion((v) => v + 1);
    } catch (e2) {
      if (isApiError(e2) && e2.code === "VALIDATION_ERROR") {
        setFormError(e2.message);
      } else {
        reportError(e2);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setSubmitting(true);
    try {
      const res = await deleteCategory(target.id);
      showToast(res.message, "success");
      setVersion((v) => v + 1);
    } catch (e) {
      reportError(e);
    } finally {
      setSubmitting(false);
      setDeleting(null);
    }
  }

  const isEdit = form?.id !== null && form !== null;
  const slugPreview = form ? makeCategorySlug(form.name) : "";

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="m-0 flex items-center gap-2 text-xl font-extrabold text-fg">
          <Tags className="h-5 w-5 text-cyan-500" aria-hidden="true" />
          Quản lý danh mục
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:-translate-y-0.5 hover:brightness-110"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Thêm danh mục
        </button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-xs">
        {categories === null ? (
          <div className="p-16 text-center text-sm text-muted">Đang tải...</div>
        ) : categories.length === 0 ? (
          <div className="p-16 text-center text-sm font-semibold text-muted">
            Chưa có danh mục nào. Bấm &quot;Thêm danh mục&quot; để tạo mới.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-bold tracking-wider text-muted uppercase">
                  <th className="px-5 py-3.5">#</th>
                  <th className="px-5 py-3.5">Icon</th>
                  <th className="px-5 py-3.5">Tên danh mục</th>
                  <th className="px-5 py-3.5">Slug</th>
                  <th className="px-5 py-3.5">Ngày tạo</th>
                  <th className="w-[140px] px-5 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {categories.map((cat, i) => (
                  <tr
                    key={cat.id}
                    className="transition-colors hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-4 text-xs font-bold text-muted">
                      {i + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                        <CategoryIcon icon={cat.icon} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-fg">
                      {cat.name}
                    </td>
                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-surface-2 px-2.5 py-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-300">
                        {cat.slug}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium whitespace-nowrap text-muted">
                      {formatDateVi(cat.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          title="Sửa"
                          aria-label={`Sửa danh mục ${cat.name}`}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-blue-300 bg-transparent text-blue-500 transition-all hover:border-blue-500 hover:bg-blue-500 hover:text-white dark:border-blue-800"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(cat)}
                          title="Xóa"
                          aria-label={`Xóa danh mục ${cat.name}`}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-300 bg-transparent text-red-400 transition-all hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-800"
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
        icon={
          isEdit ? (
            <Pencil className="h-7 w-7" aria-hidden="true" />
          ) : (
            <PlusCircle className="h-7 w-7" aria-hidden="true" />
          )
        }
        title={isEdit ? "Sửa danh mục" : "Thêm danh mục mới"}
        subtitle={
          isEdit ? undefined : "Tạo danh mục sản phẩm cho marketplace"
        }
      >
        {form && (
          <form onSubmit={handleSubmit} noValidate>
            {formError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {formError}
              </div>
            )}
            <div className="mb-5">
              <label htmlFor="cat-name" className={adminLabelClass}>
                Tên danh mục <span className="text-red-500">*</span>
              </label>
              <input
                id="cat-name"
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setFormError(null);
                }}
                placeholder="VD: Giáo trình"
                className={adminInputClass}
                autoFocus
              />
              <p className="mt-1.5 text-xs text-muted">
                Slug:{" "}
                <code className="font-mono font-bold">
                  {slugPreview || "—"}
                </code>
              </p>
            </div>
            <div className="mb-6">
              <label htmlFor="cat-icon" className={adminLabelClass}>
                Icon
              </label>
              <select
                id="cat-icon"
                value={form.icon}
                onChange={(e) =>
                  setForm({
                    ...form,
                    icon: e.target.value as CategoryIconKey,
                  })
                }
                className={cn(adminInputClass, "cursor-pointer")}
              >
                {CATEGORY_ICONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <ModalActions
              tone={isEdit ? "cyan" : "indigo"}
              submitLabel={isEdit ? "Lưu thay đổi" : "Tạo danh mục"}
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
        title="Xóa danh mục?"
        subtitle="Danh mục đang có sản phẩm sẽ không xóa được."
      >
        <p className="mb-6 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-fg">
          {deleting?.name}
        </p>
        <ModalActions
          type="button"
          tone="red"
          submitLabel="Xóa danh mục"
          submitting={submitting}
          onSubmit={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      </Modal>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Quản lý danh mục"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <CategoriesContent key={refreshKey} />
    </AdminShell>
  );
}
