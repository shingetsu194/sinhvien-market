import type {
  AuditAction,
  CategoryIconKey,
  LockDuration,
  ProductStatus,
  ProductType,
} from "@/lib/types/admin";

export const CATEGORY_ICONS: {
  value: CategoryIconKey;
  label: string;
}[] = [
  { value: "bi-book", label: "📖 Sách / Giáo trình" },
  { value: "bi-laptop", label: "💻 Điện tử" },
  { value: "bi-backpack", label: "🎒 Đồ dùng học tập" },
  { value: "bi-house", label: "🏠 Đồ gia dụng" },
  { value: "bi-music-note", label: "🎵 Nhạc cụ" },
  { value: "bi-brush", label: "🎨 Dụng cụ nghệ thuật" },
  { value: "bi-controller", label: "🎮 Giải trí" },
  { value: "bi-bag", label: "👜 Thời trang" },
  { value: "bi-box-seam", label: "📦 Khác" },
];

export const LOCK_DURATION_OPTIONS: {
  value: LockDuration;
  label: string;
  shortLabel: string;
  days: number | null;
}[] = [
  {
    value: "3days",
    label: "📅 3 ngày (nhắc nhở nhẹ)",
    shortLabel: "3 ngày",
    days: 3,
  },
  {
    value: "1week",
    label: "📅 1 tuần (vi phạm nhẹ)",
    shortLabel: "1 tuần",
    days: 7,
  },
  {
    value: "2weeks",
    label: "📅 2 tuần (vi phạm vừa)",
    shortLabel: "2 tuần",
    days: 14,
  },
  {
    value: "1month",
    label: "📅 1 tháng (vi phạm nặng)",
    shortLabel: "1 tháng",
    days: 30,
  },
  {
    value: "3months",
    label: "📅 3 tháng (vi phạm nghiêm trọng)",
    shortLabel: "3 tháng",
    days: 90,
  },
  {
    value: "6months",
    label: "📅 6 tháng (tái phạm nhiều lần)",
    shortLabel: "6 tháng",
    days: 180,
  },
  {
    value: "forever",
    label: "🔒 Vĩnh viễn (trường hợp đặc biệt)",
    shortLabel: "Vĩnh viễn",
    days: null,
  },
];

export const PRODUCT_STATUS_MAP: Record<
  ProductStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "Chờ duyệt",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  active: {
    label: "Đang bán",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  },
  sold: {
    label: "Đã bán",
    badgeClass: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  },
  cancelled: {
    label: "Đã từ chối",
    badgeClass: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
  },
};

export const PRODUCT_TYPE_MAP: Record<
  ProductType,
  { label: string; badgeClass: string }
> = {
  sale: {
    label: "💰 Bán",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  exchange: {
    label: "🔄 Trao đổi",
    badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  },
  auction: {
    label: "⚡ Đấu giá",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
};

export const AUDIT_ACTION_LABELS: Record<
  AuditAction,
  { label: string; badgeClass: string }
> = {
  approve_product: {
    label: "✅ Duyệt SP",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  },
  reject_product: {
    label: "❌ Từ chối SP",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  delete_product: {
    label: "🗑️ Xóa SP",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
  lock_user: {
    label: "🔒 Khóa user",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
  unlock_user: {
    label: "🔓 Mở khóa user",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  },
  strike_user: {
    label: "🔨 Phạt gậy",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
  create_category: {
    label: "➕ Tạo danh mục",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  update_category: {
    label: "✏️ Sửa danh mục",
    badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  },
  delete_category: {
    label: "🗑️ Xóa danh mục",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
  resolve_report: {
    label: "🛡️ Xử lý tố cáo",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  ignore_report: {
    label: "⏭️ Bỏ qua tố cáo",
    badgeClass: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  },
  toggle_rating: {
    label: "⭐ Ẩn/Hiện đánh giá",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  create_banner: {
    label: "🖼️ Thêm banner",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  update_banner: {
    label: "✏️ Sửa banner",
    badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  },
  toggle_banner: {
    label: "👁️ Ẩn/Hiện banner",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  delete_banner: {
    label: "🗑️ Xóa banner",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
  create_giveaway: {
    label: "🎁 Tạo Giveaway",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  spin_giveaway: {
    label: "🎰 Quay số Giveaway",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  delete_giveaway: {
    label: "🗑️ Xóa Giveaway",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
};
