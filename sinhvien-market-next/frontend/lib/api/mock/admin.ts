import { LOCK_DURATION_OPTIONS } from "@/lib/constants/admin";
import { ApiError } from "@/lib/api/types";
import type {
  AdminBanner,
  AdminCategory,
  AdminGiveaway,
  AdminProduct,
  AdminRating,
  AdminTransaction,
  AdminUserDetail,
  AdminUserRecord,
  AuditAction,
  AuditLogEntry,
  CategoryIconKey,
  DashboardStats,
  ExportType,
  LockDuration,
  ReportStatus,
  SystemReport,
  ViolationRecord,
} from "@/lib/types/admin";
import {
  buildCsvContent,
  calculateStrikeOutcome,
  computeLockedUntil,
  isWithinDateRange,
  makeCategorySlug,
  validateCategoryName,
} from "@/lib/validation/admin";

const STORAGE_KEY = "svm_mock_admin_db_v5";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface AdminMockDb {
  users: AdminUserRecord[];
  violations: ViolationRecord[];
  categories: AdminCategory[];
  products: AdminProduct[];
  transactions: AdminTransaction[];
  reports: SystemReport[];
  ratings: AdminRating[];
  banners: AdminBanner[];
  giveaways: AdminGiveaway[];
  auditLogs: AuditLogEntry[];
}

function makeBannerSvg(
  title: string,
  subtitle: string,
  fromColor: string,
  toColor: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${fromColor}"/>
        <stop offset="100%" stop-color="${toColor}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="300" rx="20" fill="url(#g)"/>
    <circle cx="700" cy="60" r="110" fill="rgba(255,255,255,0.12)"/>
    <circle cx="120" cy="250" r="90" fill="rgba(255,255,255,0.08)"/>
    <text x="56" y="135" fill="#ffffff" font-family="sans-serif" font-size="34" font-weight="800">${escapeXml(title)}</text>
    <text x="56" y="185" fill="rgba(255,255,255,0.85)" font-family="sans-serif" font-size="20" font-weight="600">${escapeXml(subtitle)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createInitialDb(): AdminMockDb {
  return {
    categories: [
      {
        id: 1,
        name: "Sách & Giáo trình",
        slug: "sach-giao-trinh",
        icon: "bi-book",
        createdAt: "2026-09-01T08:00:00+07:00",
      },
      {
        id: 2,
        name: "Đồ điện tử",
        slug: "do-dien-tu",
        icon: "bi-laptop",
        createdAt: "2026-09-01T08:05:00+07:00",
      },
      {
        id: 3,
        name: "Đồ gia dụng KTX",
        slug: "do-gia-dung-ktx",
        icon: "bi-house",
        createdAt: "2026-09-02T09:00:00+07:00",
      },
      {
        id: 4,
        name: "Thời trang & Phụ kiện",
        slug: "thoi-trang-phu-kien",
        icon: "bi-bag",
        createdAt: "2026-09-03T10:00:00+07:00",
      },
      {
        id: 5,
        name: "Đồ dùng học tập",
        slug: "do-dung-hoc-tap",
        icon: "bi-backpack",
        createdAt: "2026-09-05T14:20:00+07:00",
      },
      {
        id: 6,
        name: "Nhạc cụ & Giải trí",
        slug: "nhac-cu-giai-tri",
        icon: "bi-music-note",
        createdAt: "2026-09-10T11:30:00+07:00",
      },
    ],
    users: [
      {
        id: 1,
        name: "Nguyễn Minh Anh",
        email: "student@demo.vn",
        phone: "0901234567",
        role: "student",
        isLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedUntil: null,
        isVerified: true,
        lastVerifiedAt: "2026-10-01T09:15:00+07:00",
        securityQuestion: "Tên trường cấp 1 của bạn là gì?",
        strikeCount: 0,
        createdAt: "2026-09-15T08:30:00+07:00",
      },
      {
        id: 2,
        name: "Quản trị viên",
        email: "admin@demo.vn",
        phone: "0909999888",
        role: "admin",
        isLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedUntil: null,
        isVerified: true,
        lastVerifiedAt: "2026-09-01T08:00:00+07:00",
        securityQuestion: "Tên trường cấp 1 của bạn là gì?",
        strikeCount: 0,
        createdAt: "2026-09-01T08:00:00+07:00",
      },
      {
        id: 3,
        name: "Trần Quốc Bảo",
        email: "unverified@demo.vn",
        phone: "0918222333",
        role: "student",
        isLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedUntil: null,
        isVerified: false,
        lastVerifiedAt: null,
        securityQuestion: "Tên thú cưng đầu tiên của bạn?",
        strikeCount: 1,
        createdAt: "2026-10-05T10:20:00+07:00",
      },
      {
        id: 4,
        name: "Lê Thu Hà",
        email: "locked@demo.vn",
        phone: "0987654321",
        role: "student",
        isLocked: true,
        lockReason: "Khóa vĩnh viễn do nhận 3 gậy vi phạm. Lý do gần nhất: Đăng tin lừa đảo nhiều lần",
        lockedAt: "2026-10-15T09:30:00+07:00",
        lockedUntil: null,
        isVerified: true,
        lastVerifiedAt: "2026-09-20T11:00:00+07:00",
        securityQuestion: "Bạn thân thời thơ ấu của bạn tên gì?",
        strikeCount: 3,
        createdAt: "2026-09-18T14:10:00+07:00",
      },
      {
        id: 5,
        name: "Phạm Hoàng Nam",
        email: "nam.pham@student.edu.vn",
        phone: "0933445566",
        role: "student",
        isLocked: true,
        lockReason: "Tạm khóa 7 ngày do nhận 2 gậy vi phạm. Lý do gần nhất: Spam bài đăng trùng lặp",
        lockedAt: "2026-10-25T15:00:00+07:00",
        lockedUntil: "2026-11-01T15:00:00+07:00",
        isVerified: true,
        lastVerifiedAt: "2026-10-02T08:00:00+07:00",
        securityQuestion: "Tên trường cấp 1 của bạn là gì?",
        strikeCount: 2,
        createdAt: "2026-10-01T16:45:00+07:00",
      },
      {
        id: 6,
        name: "Đỗ Khánh Linh",
        email: "linh.do@student.edu.vn",
        phone: "0977889900",
        role: "student",
        isLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedUntil: null,
        isVerified: true,
        lastVerifiedAt: "2026-10-10T10:00:00+07:00",
        securityQuestion: "Tên thú cưng đầu tiên của bạn?",
        strikeCount: 0,
        createdAt: "2026-10-09T19:00:00+07:00",
      },
      {
        id: 7,
        name: "Võ Tuấn Kiệt",
        email: "kiet.vo@student.edu.vn",
        phone: "0966112233",
        role: "student",
        isLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedUntil: null,
        isVerified: true,
        lastVerifiedAt: "2026-10-12T09:30:00+07:00",
        securityQuestion: "Bạn thân thời thơ ấu của bạn tên gì?",
        strikeCount: 0,
        createdAt: "2026-10-11T13:15:00+07:00",
      },
    ],
    violations: [
      {
        id: 1,
        userId: 3,
        adminId: 2,
        adminName: "Quản trị viên",
        strikeNumber: 1,
        reason: "Đăng bài sai danh mục nhiều lần dù đã nhắc nhở.",
        evidenceUrl: "https://sinhvienmarket.vn/evidence/post-102",
        createdAt: "2026-10-18T10:15:00+07:00",
      },
      {
        id: 2,
        userId: 5,
        adminId: 2,
        adminName: "Quản trị viên",
        strikeNumber: 1,
        reason: "Sử dụng ngôn từ thiếu chuẩn mực trong phần bình luận.",
        evidenceUrl: null,
        createdAt: "2026-10-20T11:00:00+07:00",
      },
      {
        id: 3,
        userId: 5,
        adminId: 2,
        adminName: "Quản trị viên",
        strikeNumber: 2,
        reason: "Spam bài đăng trùng lặp liên tục trong 1 giờ.",
        evidenceUrl: "https://sinhvienmarket.vn/evidence/spam-log-55",
        createdAt: "2026-10-25T15:00:00+07:00",
      },
      {
        id: 4,
        userId: 4,
        adminId: 2,
        adminName: "Quản trị viên",
        strikeNumber: 1,
        reason: "Treo giá ảo gây hiểu nhẫn cho người mua.",
        evidenceUrl: null,
        createdAt: "2026-10-02T09:00:00+07:00",
      },
      {
        id: 5,
        userId: 4,
        adminId: 2,
        adminName: "Quản trị viên",
        strikeNumber: 2,
        reason: "Yêu cầu chuyển khoản đặt cọc ngoài hệ thống không giao hàng.",
        evidenceUrl: "https://sinhvienmarket.vn/evidence/report-19",
        createdAt: "2026-10-08T14:20:00+07:00",
      },
      {
        id: 6,
        userId: 4,
        adminId: 2,
        adminName: "Quản trị viên",
        strikeNumber: 3,
        reason: "Đăng tin lừa đảo nhiều lần, bị nhiều sinh viên tố cáo.",
        evidenceUrl: "https://sinhvienmarket.vn/evidence/report-28",
        createdAt: "2026-10-15T09:30:00+07:00",
      },
    ],
    products: [
      {
        id: 101,
        title: "Giáo trình Giải tích 1 & Đại số tuyến tính (Combo 2 cuốn)",
        categoryId: 1,
        categoryName: "Sách & Giáo trình",
        sellerId: 1,
        sellerName: "Nguyễn Minh Anh",
        sellerEmail: "student@demo.vn",
        type: "sale",
        price: 65000,
        condition: "like_new",
        status: "active",
        hasTransactions: false,
        createdAt: "2026-10-28T07:10:00+07:00",
      },
      {
        id: 102,
        title: "Bàn phím cơ không dây Keychron K6 Red Switch",
        categoryId: 2,
        categoryName: "Đồ điện tử",
        sellerId: 6,
        sellerName: "Đỗ Khánh Linh",
        sellerEmail: "linh.do@student.edu.vn",
        type: "auction",
        price: 850000,
        condition: "used",
        status: "active",
        hasTransactions: false,
        createdAt: "2026-10-28T06:45:00+07:00",
      },
      {
        id: 103,
        title: "Đèn bàn học chống cận Xiaomi Mi LED Desk Lamp",
        categoryId: 3,
        categoryName: "Đồ gia dụng KTX",
        sellerId: 7,
        sellerName: "Võ Tuấn Kiệt",
        sellerEmail: "kiet.vo@student.edu.vn",
        type: "sale",
        price: 220000,
        condition: "like_new",
        status: "active",
        hasTransactions: false,
        createdAt: "2026-10-27T21:30:00+07:00",
      },
      {
        id: 104,
        title: "Máy tính bỏ túi Casio fx-580VN X chính hãng Bitex",
        categoryId: 5,
        categoryName: "Đồ dùng học tập",
        sellerId: 1,
        sellerName: "Nguyễn Minh Anh",
        sellerEmail: "student@demo.vn",
        type: "sale",
        price: 380000,
        condition: "like_new",
        status: "active",
        hasTransactions: false,
        createdAt: "2026-10-27T19:15:00+07:00",
      },
      {
        id: 105,
        title: "Tai nghe Sony WH-CH520 Bluetooth Pin 50 giờ",
        categoryId: 2,
        categoryName: "Đồ điện tử",
        sellerId: 1,
        sellerName: "Nguyễn Minh Anh",
        sellerEmail: "student@demo.vn",
        type: "sale",
        price: 720000,
        condition: "like_new",
        status: "active",
        hasTransactions: true,
        createdAt: "2026-10-22T10:00:00+07:00",
      },
      {
        id: 106,
        title: "Bàn học gấp gọn gỗ thông đặt giường tầng KTX",
        categoryId: 3,
        categoryName: "Đồ gia dụng KTX",
        sellerId: 6,
        sellerName: "Đỗ Khánh Linh",
        sellerEmail: "linh.do@student.edu.vn",
        type: "sale",
        price: 180000,
        condition: "used",
        status: "active",
        hasTransactions: false,
        createdAt: "2026-10-20T15:30:00+07:00",
      },
      {
        id: 107,
        title: "Đàn Guitar Acoustic Rosen G11 kèm bao da 3 lớp",
        categoryId: 6,
        categoryName: "Nhạc cụ & Giải trí",
        sellerId: 7,
        sellerName: "Võ Tuấn Kiệt",
        sellerEmail: "kiet.vo@student.edu.vn",
        type: "auction",
        price: 950000,
        condition: "used",
        status: "active",
        hasTransactions: false,
        createdAt: "2026-10-19T09:20:00+07:00",
      },
      {
        id: 108,
        title: "Ấm siêu tốc Sunhouse 1.8L inox dùng ở KTX",
        categoryId: 3,
        categoryName: "Đồ gia dụng KTX",
        sellerId: 1,
        sellerName: "Nguyễn Minh Anh",
        sellerEmail: "student@demo.vn",
        type: "sale",
        price: 110000,
        condition: "used",
        status: "active",
        hasTransactions: true,
        createdAt: "2026-10-14T11:00:00+07:00",
      },
      {
        id: 109,
        title: "Bộ giáo trình Lập trình Hướng đối tượng C++ & Java",
        categoryId: 1,
        categoryName: "Sách & Giáo trình",
        sellerId: 6,
        sellerName: "Đỗ Khánh Linh",
        sellerEmail: "linh.do@student.edu.vn",
        type: "sale",
        price: 90000,
        condition: "like_new",
        status: "active",
        hasTransactions: true,
        createdAt: "2026-10-16T08:40:00+07:00",
      },
      {
        id: 110,
        title: "Tài khoản Netflix dùng chung giá rẻ",
        categoryId: 6,
        categoryName: "Nhạc cụ & Giải trí",
        sellerId: 4,
        sellerName: "Lê Thu Hà",
        sellerEmail: "locked@demo.vn",
        type: "sale",
        price: 45000,
        condition: "new",
        status: "cancelled",
        hasTransactions: false,
        rejectionReason: "Không cho phép kinh doanh tài khoản số dùng chung trái quy định.",
        createdAt: "2026-10-12T17:00:00+07:00",
      },
      {
        id: 111,
        title: "Giáo trình Giải tích 1 & Đại số tuyến tính (Bản in mới chờ duyệt)",
        categoryId: 1,
        categoryName: "Sách & Giáo trình",
        sellerId: 3,
        sellerName: "Trần Quốc Bảo",
        sellerEmail: "unverified@demo.vn",
        type: "sale",
        price: 55000,
        condition: "like_new",
        status: "pending",
        hasTransactions: false,
        createdAt: "2026-10-28T08:00:00+07:00",
      },
      {
        id: 112,
        title: "Giá đỡ Laptop nhôm 6 nấc chỉnh độ cao cho bàn học KTX",
        categoryId: 5,
        categoryName: "Đồ dùng học tập",
        sellerId: 7,
        sellerName: "Võ Tuấn Kiệt",
        sellerEmail: "kiet.vo@student.edu.vn",
        type: "exchange",
        price: null,
        condition: "new",
        status: "pending",
        hasTransactions: false,
        createdAt: "2026-10-28T07:50:00+07:00",
      },
      {
        id: 113,
        title: "Quạt mini kẹp bàn học KTX pin sạc 4000mAh",
        categoryId: 3,
        categoryName: "Đồ gia dụng KTX",
        sellerId: 1,
        sellerName: "Nguyễn Minh Anh",
        sellerEmail: "student@demo.vn",
        type: "sale",
        price: 95000,
        condition: "like_new",
        status: "sold",
        hasTransactions: true,
        createdAt: "2026-10-10T09:00:00+07:00",
      },
    ],
    transactions: [
      {
        id: 501,
        productId: 108,
        productTitle: "Ấm siêu tốc Sunhouse 1.8L inox dùng ở KTX",
        buyerId: 6,
        buyerName: "Đỗ Khánh Linh",
        sellerId: 1,
        sellerName: "Nguyễn Minh Anh",
        type: "sale",
        amount: 110000,
        paymentMethod: "banking",
        paymentStatus: "paid",
        orderStatus: "completed",
        createdAt: "2026-10-28T07:30:00+07:00",
      },
      {
        id: 502,
        productId: 109,
        productTitle: "Bộ giáo trình Lập trình Hướng đối tượng C++ & Java",
        buyerId: 7,
        buyerName: "Võ Tuấn Kiệt",
        sellerId: 6,
        sellerName: "Đỗ Khánh Linh",
        type: "sale",
        amount: 90000,
        paymentMethod: "cod",
        orderStatus: "delivered",
        createdAt: "2026-10-28T06:15:00+07:00",
      },
      {
        id: 503,
        productId: 105,
        productTitle: "Tai nghe Sony WH-CH520 Bluetooth Pin 50 giờ",
        buyerId: 7,
        buyerName: "Võ Tuấn Kiệt",
        sellerId: 1,
        sellerName: "Nguyễn Minh Anh",
        type: "sale",
        amount: 720000,
        paymentMethod: "zalopay",
        paymentStatus: "paid",
        orderStatus: "completed",
        createdAt: "2026-10-26T14:20:00+07:00",
      },
      {
        id: 504,
        productId: 107,
        productTitle: "Đàn Guitar Acoustic Rosen G11 kèm bao da 3 lớp",
        buyerId: 1,
        buyerName: "Nguyễn Minh Anh",
        sellerId: 7,
        sellerName: "Võ Tuấn Kiệt",
        type: "auction",
        amount: 950000,
        paymentMethod: "banking",
        paymentStatus: "paid",
        orderStatus: "received",
        createdAt: "2026-10-24T18:10:00+07:00",
      },
      {
        id: 505,
        productId: 106,
        productTitle: "Balo chống nước đựng vừa Laptop 15.6 inch",
        buyerId: 3,
        buyerName: "Trần Quốc Bảo",
        sellerId: 6,
        sellerName: "Đỗ Khánh Linh",
        type: "sale",
        amount: 210000,
        paymentMethod: "cod",
        orderStatus: "cancelled",
        createdAt: "2026-10-23T11:05:00+07:00",
      },
      {
        id: 506,
        productId: 105,
        productTitle: "Chuột không dây Logitech M331 Silent",
        buyerId: 6,
        buyerName: "Đỗ Khánh Linh",
        sellerId: 7,
        sellerName: "Võ Tuấn Kiệt",
        type: "sale",
        amount: 195000,
        paymentMethod: "banking",
        paymentStatus: "paid",
        orderStatus: "completed",
        createdAt: "2026-10-21T09:40:00+07:00",
      },
    ],
    reports: [
      {
        id: 1,
        reporterId: 1,
        reporterName: "Nguyễn Minh Anh",
        targetUserId: 5,
        targetName: "Phạm Hoàng Nam",
        productId: 104,
        productTitle: "Máy tính bỏ túi Casio fx-580VN X chính hãng Bitex",
        reason: "Nghi vấn hàng giả / hàng nhái",
        description:
          "Người bán gửi ảnh tem chống giả bị mờ, khi hỏi mã seri để kiểm tra bảo hành thì né tránh không trả lời.",
        status: "pending",
        adminNote: null,
        evidenceUrl: "https://sinhvienmarket.vn/evidence/casio-check.png",
        createdAt: "2026-10-27T20:10:00+07:00",
      },
      {
        id: 2,
        reporterId: 6,
        reporterName: "Đỗ Khánh Linh",
        targetUserId: 3,
        targetName: "Trần Quốc Bảo",
        productId: null,
        productTitle: null,
        reason: "Ngôn từ thiếu chuẩn mực khi thương lượng giá",
        description:
          "Trả giá thấp 1/3 giá đăng, khi mình từ chối lịch sự thì nhắn tin xúc phạm.",
        status: "pending",
        adminNote: null,
        evidenceUrl: null,
        createdAt: "2026-10-27T15:30:00+07:00",
      },
      {
        id: 3,
        reporterId: 7,
        reporterName: "Võ Tuấn Kiệt",
        targetUserId: 4,
        targetName: "Lê Thu Hà",
        productId: 110,
        productTitle: "Tài khoản Netflix dùng chung giá rẻ",
        reason: "Lừa đảo đặt cọc ngoài hệ thống",
        description:
          "Yêu cầu chuyển khoản trước 100% qua ví cá nhân rồi chặn liên lạc.",
        status: "resolved",
        adminNote: "Đã khóa vĩnh viễn tài khoản Lê Thu Hà (Gậy 3) và gỡ bài đăng vi phạm.",
        evidenceUrl: "https://sinhvienmarket.vn/evidence/scam-proof.png",
        createdAt: "2026-10-15T08:45:00+07:00",
      },
      {
        id: 4,
        reporterId: 3,
        reporterName: "Trần Quốc Bảo",
        targetUserId: 1,
        targetName: "Nguyễn Minh Anh",
        productId: 108,
        productTitle: "Ấm siêu tốc Sunhouse 1.8L inox dùng ở KTX",
        reason: "Báo cáo nhầm sản phẩm đã bán",
        description: "Mình bấm nhầm nút báo cáo khi đang xem lịch sử bài đăng.",
        status: "ignored",
        adminNote: "Người gửi xác nhận bấm nhầm.",
        evidenceUrl: null,
        createdAt: "2026-10-16T12:00:00+07:00",
      },
    ],
    ratings: [
      {
        id: 1,
        transactionId: 501,
        raterId: 6,
        raterName: "Đỗ Khánh Linh",
        raterEmail: "linh.do@student.edu.vn",
        rateeId: 1,
        rateeName: "Nguyễn Minh Anh",
        rateeEmail: "student@demo.vn",
        productId: 108,
        productTitle: "Ấm siêu tốc Sunhouse 1.8L inox dùng ở KTX",
        stars: 5,
        comment: "Ấm còn rất mới, đun nước nhanh, bạn bán nhiệt tình giao tận sảnh KTX Khu B!",
        status: "visible",
        createdAt: "2026-10-28T07:45:00+07:00",
      },
      {
        id: 2,
        transactionId: 502,
        raterId: 7,
        raterName: "Võ Tuấn Kiệt",
        raterEmail: "kiet.vo@student.edu.vn",
        rateeId: 6,
        rateeName: "Đỗ Khánh Linh",
        rateeEmail: "linh.do@student.edu.vn",
        productId: 109,
        productTitle: "Bộ giáo trình Lập trình Hướng đối tượng C++ & Java",
        stars: 5,
        comment: "Sách giữ kỹ, bọc bìa plastic sạch sẽ, còn tặng kèm tập đề cương ôn thi.",
        status: "visible",
        createdAt: "2026-10-28T06:40:00+07:00",
      },
      {
        id: 3,
        transactionId: 503,
        raterId: 7,
        raterName: "Võ Tuấn Kiệt",
        raterEmail: "kiet.vo@student.edu.vn",
        rateeId: 1,
        rateeName: "Nguyễn Minh Anh",
        rateeEmail: "student@demo.vn",
        productId: 105,
        productTitle: "Tai nghe Sony WH-CH520 Bluetooth Pin 50 giờ",
        stars: 4,
        comment: "Tai nghe nghe êm, pin trâu đúng mô tả, giao hàng hơi trễ 15 phút do mưa.",
        status: "visible",
        createdAt: "2026-10-26T16:00:00+07:00",
      },
      {
        id: 4,
        transactionId: 505,
        raterId: 3,
        raterName: "Trần Quốc Bảo",
        raterEmail: "unverified@demo.vn",
        rateeId: 6,
        rateeName: "Đỗ Khánh Linh",
        rateeEmail: "linh.do@student.edu.vn",
        productId: 106,
        productTitle: "Bàn học gấp gọn gỗ thông đặt giường tầng KTX",
        stars: 1,
        comment: "Bình luận chứa từ ngữ công kích cá nhân không phù hợp tiêu chuẩn cộng đồng.",
        status: "hidden",
        createdAt: "2026-10-23T12:00:00+07:00",
      },
    ],
    banners: [
      {
        id: 1,
        title: "Chào Tân Sinh Viên 2026 — Săn Giáo Trình Giá Hạt Dẻ",
        imageUrl: makeBannerSvg(
          "Chào Tân Sinh Viên 2026",
          "Săn giáo trình & đồ dùng KTX tiết kiệm đến 70%",
          "#1d4ed8",
          "#0284c7",
        ),
        link: "/products?category=sach-giao-trinh",
        isActive: true,
        displayOrder: 1,
        createdAt: "2026-10-01T08:00:00+07:00",
      },
      {
        id: 2,
        title: "Đấu Giá Đồ Công Nghệ Sinh Viên — Mỗi Tối Thứ Sáu",
        imageUrl: makeBannerSvg(
          "Đấu Giá Đồ Công Nghệ",
          "Laptop, bàn phím cơ, tai nghe chính hãng giá khởi điểm từ 50K",
          "#0369a1",
          "#2563eb",
        ),
        link: "/products?type=auction",
        isActive: true,
        displayOrder: 2,
        createdAt: "2026-10-05T09:00:00+07:00",
      },
      {
        id: 3,
        title: "Sự Kiện Giveaway Tháng 10 — Tặng Bàn Phím Cơ DareU",
        imageUrl: makeBannerSvg(
          "Giveaway Tháng 10",
          "Tham gia miễn phí dành cho mọi sinh viên đã xác thực email",
          "#1e40af",
          "#0ea5e9",
        ),
        link: "/giveaways",
        isActive: false,
        displayOrder: 3,
        createdAt: "2026-10-10T10:00:00+07:00",
      },
    ],
    giveaways: [
      {
        id: 1,
        title: "Giveaway Chào Kỳ Mới: Bàn phím cơ DareU EK87 Led Rainbow",
        description:
          "Phần quà dành tặng các bạn sinh viên tích cực trao đổi giáo trình trong tháng 10. Nhận giải tại văn phòng KTX Khu B.",
        imageUrl: makeBannerSvg(
          "DareU EK87 Mechanical",
          "Quà tặng Giveaway SinhVienMarket",
          "#1d4ed8",
          "#0284c7",
        ),
        endTime: "2026-11-10T20:00:00+07:00",
        status: "active",
        winnerId: null,
        winnerName: null,
        participants: [
          {
            id: 1,
            name: "Nguyễn Minh Anh",
            email: "student@demo.vn",
            joinedAt: "2026-10-20T09:00:00+07:00",
          },
          {
            id: 6,
            name: "Đỗ Khánh Linh",
            email: "linh.do@student.edu.vn",
            joinedAt: "2026-10-20T10:15:00+07:00",
          },
          {
            id: 7,
            name: "Võ Tuấn Kiệt",
            email: "kiet.vo@student.edu.vn",
            joinedAt: "2026-10-21T08:30:00+07:00",
          },
          {
            id: 11,
            name: "Hoàng Gia Huy",
            email: "huy.hoang@student.edu.vn",
            joinedAt: "2026-10-21T14:00:00+07:00",
          },
          {
            id: 12,
            name: "Bùi Phương Thảo",
            email: "thao.bui@student.edu.vn",
            joinedAt: "2026-10-22T11:20:00+07:00",
          },
          {
            id: 13,
            name: "Đặng Minh Quân",
            email: "quan.dang@student.edu.vn",
            joinedAt: "2026-10-23T16:45:00+07:00",
          },
        ],
        createdAt: "2026-10-18T08:00:00+07:00",
      },
      {
        id: 2,
        title: "Giveaway Cuối Tuần: Balo chống sốc Laptop 15.6 inch",
        description:
          "Sự kiện đã hết thời gian đăng ký, đang chờ Admin bấm quay số chọn người may mắn.",
        imageUrl: makeBannerSvg(
          "Balo Laptop 15.6 inch",
          "Chống thấm nước - Nhiều ngăn tiện lợi",
          "#059669",
          "#0284c7",
        ),
        endTime: "2026-10-25T20:00:00+07:00",
        status: "active",
        winnerId: null,
        winnerName: null,
        participants: [
          {
            id: 1,
            name: "Nguyễn Minh Anh",
            email: "student@demo.vn",
            joinedAt: "2026-10-22T09:00:00+07:00",
          },
          {
            id: 6,
            name: "Đỗ Khánh Linh",
            email: "linh.do@student.edu.vn",
            joinedAt: "2026-10-22T12:15:00+07:00",
          },
          {
            id: 7,
            name: "Võ Tuấn Kiệt",
            email: "kiet.vo@student.edu.vn",
            joinedAt: "2026-10-23T08:30:00+07:00",
          },
          {
            id: 14,
            name: "Lý Thanh Trúc",
            email: "truc.ly@student.edu.vn",
            joinedAt: "2026-10-24T17:10:00+07:00",
          },
        ],
        createdAt: "2026-10-19T09:00:00+07:00",
      },
      {
        id: 3,
        title: "Giveaway Tháng 9: Bình giữ nhiệt Lock&Lock 500ml",
        description: "Sự kiện tri ân thành viên đầu năm học.",
        imageUrl: makeBannerSvg(
          "Lock&Lock 500ml",
          "Giữ nhiệt nóng lạnh 12 giờ",
          "#d97706",
          "#dc2626",
        ),
        endTime: "2026-09-30T20:00:00+07:00",
        status: "ended",
        winnerId: 6,
        winnerName: "Đỗ Khánh Linh",
        participants: [
          {
            id: 1,
            name: "Nguyễn Minh Anh",
            email: "student@demo.vn",
            joinedAt: "2026-09-25T09:00:00+07:00",
          },
          {
            id: 6,
            name: "Đỗ Khánh Linh",
            email: "linh.do@student.edu.vn",
            joinedAt: "2026-09-26T10:15:00+07:00",
          },
        ],
        createdAt: "2026-09-20T08:00:00+07:00",
      },
    ],
    auditLogs: [
      {
        id: 1,
        adminId: 2,
        adminName: "Quản trị viên",
        adminEmail: "admin@demo.vn",
        action: "approve_product",
        targetType: "product",
        targetId: 105,
        note: "Duyệt: Tai nghe Sony WH-CH520 Bluetooth Pin 50 giờ",
        createdAt: "2026-10-22T10:15:00+07:00",
      },
      {
        id: 2,
        adminId: 2,
        adminName: "Quản trị viên",
        adminEmail: "admin@demo.vn",
        action: "strike_user",
        targetType: "user",
        targetId: 5,
        note: "Gậy thứ 2: Spam bài đăng trùng lặp liên tục trong 1 giờ.",
        createdAt: "2026-10-25T15:00:00+07:00",
      },
      {
        id: 3,
        adminId: 2,
        adminName: "Quản trị viên",
        adminEmail: "admin@demo.vn",
        action: "reject_product",
        targetType: "product",
        targetId: 110,
        note: "Từ chối: Tài khoản Netflix dùng chung giá rẻ",
        createdAt: "2026-10-12T17:30:00+07:00",
      },
      {
        id: 4,
        adminId: 2,
        adminName: "Quản trị viên",
        adminEmail: "admin@demo.vn",
        action: "lock_user",
        targetType: "user",
        targetId: 4,
        note: "Khóa User: Lê Thu Hà | Lý do: Đăng tin lừa đảo nhiều lần | Hạn: Vĩnh viễn",
        createdAt: "2026-10-15T09:30:00+07:00",
      },
      {
        id: 5,
        adminId: 2,
        adminName: "Quản trị viên",
        adminEmail: "admin@demo.vn",
        action: "create_category",
        targetType: "category",
        targetId: 6,
        note: "Tạo: Nhạc cụ & Giải trí",
        createdAt: "2026-09-10T11:30:00+07:00",
      },
    ],
  };
}

let memoryDb: AdminMockDb | null = null;

function loadDb(): AdminMockDb {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminMockDb;
        memoryDb = parsed;
        return parsed;
      }
    } catch {
      // ignore invalid storage
    }
  }
  if (!memoryDb) {
    memoryDb = createInitialDb();
    saveDb(memoryDb);
  }
  return memoryDb;
}

function saveDb(db: AdminMockDb): void {
  memoryDb = db;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // ignore quota errors
    }
  }
}

export function resetAdminMockData(): void {
  const fresh = createInitialDb();
  saveDb(fresh);
}

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendAudit(
  db: AdminMockDb,
  action: AuditAction,
  targetType: string,
  targetId: number,
  note: string,
): void {
  const nextId =
    db.auditLogs.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  db.auditLogs.unshift({
    id: nextId,
    adminId: 2,
    adminName: "Quản trị viên",
    adminEmail: "admin@demo.vn",
    action,
    targetType,
    targetId,
    note,
    createdAt: new Date().toISOString(),
  });
}

export async function mockGetDashboardStats(): Promise<DashboardStats> {
  await delay(80);
  const db = loadDb();
  const totalUsers = db.users.filter((u) => u.role === "student").length;
  const activeProducts = db.products.filter((p) => p.status === "active").length;
  const pendingProducts = db.products.filter((p) => p.status === "pending");

  const todayPrefix = "2026-10-28";
  const txToday = db.transactions.filter(
    (t) =>
      t.createdAt.startsWith(todayPrefix) ||
      t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
  ).length;

  return {
    totalUsers,
    activeProducts,
    pendingCount: pendingProducts.length,
    txToday,
    recentTx: db.transactions.slice(0, 5),
    recentProducts: pendingProducts.slice(0, 5),
  };
}

export async function mockGetProducts(
  tab: "pending" | "all",
): Promise<AdminProduct[]> {
  await delay(80);
  const db = loadDb();
  if (tab === "all") {
    return [...db.products];
  }
  return db.products.filter((p) => p.status === "pending");
}

export async function mockGetTransactions(): Promise<AdminTransaction[]> {
  await delay(80);
  return [...loadDb().transactions];
}

export async function mockApproveProduct(
  productId: number,
): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    throw new ApiError("VALIDATION_ERROR", "Sản phẩm không tồn tại.", {
      status: 404,
    });
  }
  product.status = "active";
  appendAudit(db, "approve_product", "product", productId, `Duyệt: ${product.title}`);
  saveDb(db);
  return { message: `Đã duyệt: ${product.title}` };
}

export async function mockRejectProduct(
  productId: number,
  reason: string,
): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    throw new ApiError("VALIDATION_ERROR", "Sản phẩm không tồn tại.", {
      status: 404,
    });
  }
  product.status = "cancelled";
  product.rejectionReason = reason.trim() || null;
  const note = reason.trim()
    ? `Từ chối: ${product.title} (Lý do: ${reason.trim()})`
    : `Từ chối: ${product.title}`;
  appendAudit(db, "reject_product", "product", productId, note);
  saveDb(db);
  return { message: `Đã từ chối: ${product.title}` };
}

export async function mockDeleteProduct(
  productId: number,
): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const idx = db.products.findIndex((p) => p.id === productId);
  if (idx === -1) {
    throw new ApiError("VALIDATION_ERROR", "Sản phẩm không tồn tại.", {
      status: 404,
    });
  }
  const product = db.products[idx];
  const hasTx =
    product.hasTransactions ||
    db.transactions.some((tx) => tx.productId === productId);

  if (hasTx) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Không thể xóa "${product.title}": sản phẩm đã phát sinh giao dịch nên phải giữ lại lịch sử đơn hàng.`,
      { status: 409 },
    );
  }

  db.products.splice(idx, 1);
  appendAudit(
    db,
    "delete_product",
    "product",
    productId,
    `Xóa: ${product.title} — đăng bởi ${product.sellerName}`,
  );
  saveDb(db);
  return { message: `Đã xóa bài đăng: ${product.title}` };
}

export async function mockGetCategories(): Promise<AdminCategory[]> {
  await delay(80);
  const db = loadDb();
  return [...db.categories].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export async function mockCreateCategory(input: {
  name: string;
  icon: CategoryIconKey;
}): Promise<{ category: AdminCategory; message: string }> {
  await delay();
  const err = validateCategoryName(input.name);
  if (err) {
    throw new ApiError("VALIDATION_ERROR", err, { status: 422 });
  }
  const db = loadDb();
  const cleanName = input.name.trim();
  const slug = makeCategorySlug(cleanName);
  const nextId =
    db.categories.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const category: AdminCategory = {
    id: nextId,
    name: cleanName,
    slug,
    icon: input.icon || "bi-box-seam",
    createdAt: new Date().toISOString(),
  };
  db.categories.push(category);
  appendAudit(db, "create_category", "category", nextId, `Tạo: ${cleanName}`);
  saveDb(db);
  return { category, message: `Đã tạo danh mục: ${cleanName}` };
}

export async function mockUpdateCategory(input: {
  id: number;
  name: string;
  icon: CategoryIconKey;
}): Promise<{ category: AdminCategory; message: string }> {
  await delay();
  const err = validateCategoryName(input.name);
  if (err) {
    throw new ApiError("VALIDATION_ERROR", err, { status: 422 });
  }
  const db = loadDb();
  const cat = db.categories.find((c) => c.id === input.id);
  if (!cat) {
    throw new ApiError("VALIDATION_ERROR", "Danh mục không tồn tại.", {
      status: 404,
    });
  }
  const cleanName = input.name.trim();
  cat.name = cleanName;
  cat.slug = makeCategorySlug(cleanName);
  cat.icon = input.icon;
  for (const p of db.products) {
    if (p.categoryId === cat.id) {
      p.categoryName = cleanName;
    }
  }
  appendAudit(db, "update_category", "category", cat.id, `Sửa: ${cleanName}`);
  saveDb(db);
  return { category: { ...cat }, message: `Đã cập nhật danh mục: ${cleanName}` };
}

export async function mockDeleteCategory(
  categoryId: number,
): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const idx = db.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) {
    throw new ApiError("VALIDATION_ERROR", "Danh mục không tồn tại.", {
      status: 404,
    });
  }
  const cat = db.categories[idx];
  const hasProducts = db.products.some((p) => p.categoryId === categoryId);
  if (hasProducts) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Không thể xóa danh mục đang có sản phẩm.",
      { status: 409 },
    );
  }
  db.categories.splice(idx, 1);
  appendAudit(db, "delete_category", "category", categoryId, `Xóa: ${cat.name}`);
  saveDb(db);
  return { message: `Đã xóa danh mục: ${cat.name}` };
}

export async function mockGetUsers(): Promise<AdminUserRecord[]> {
  await delay(80);
  const db = loadDb();
  return [...db.users];
}

export async function mockGetUserDetail(userId: number): Promise<AdminUserDetail> {
  await delay(80);
  const db = loadDb();
  const profile = db.users.find((u) => u.id === userId);
  if (!profile) {
    throw new ApiError("VALIDATION_ERROR", "Người dùng không tồn tại.", {
      status: 404,
    });
  }
  const products = db.products.filter((p) => p.sellerId === userId);
  const transactions = db.transactions.filter(
    (tx) => tx.buyerId === userId || tx.sellerId === userId,
  );
  const reports = db.reports.filter((r) => r.targetUserId === userId);
  const userRatings = db.ratings.filter((r) => r.rateeId === userId);
  const avg =
    userRatings.length > 0
      ? Math.round(
          (userRatings.reduce((sum, r) => sum + r.stars, 0) / userRatings.length) *
            10,
        ) / 10
      : 0;

  return {
    profile: { ...profile },
    products,
    transactions,
    reports,
    ratingStats: {
      avg,
      count: userRatings.length,
    },
  };
}

export async function mockGetUserViolations(userId: number): Promise<{
  user: AdminUserRecord;
  violations: ViolationRecord[];
}> {
  await delay(80);
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw new ApiError("VALIDATION_ERROR", "Không tìm thấy người dùng.", {
      status: 404,
    });
  }
  const violations = db.violations
    .filter((v) => v.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    user: { ...user },
    violations,
  };
}

export async function mockToggleUserLock(input: {
  userId: number;
  reason?: string;
  duration?: LockDuration;
}): Promise<{ user: AdminUserRecord; message: string }> {
  await delay();
  const db = loadDb();
  const user = db.users.find((u) => u.id === input.userId);
  if (!user) {
    throw new ApiError("VALIDATION_ERROR", "Không tìm thấy người dùng này.", {
      status: 404,
    });
  }
  if (user.role === "admin") {
    throw new ApiError("VALIDATION_ERROR", "Không thể khóa tài khoản Admin.", {
      status: 403,
    });
  }

  if (!user.isLocked) {
    const reason = (input.reason ?? "").trim();
    if (!reason) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Vui lòng nhập lý do khóa tài khoản.",
        { status: 422 },
      );
    }
    const duration: LockDuration = input.duration ?? "1week";
    const opt = LOCK_DURATION_OPTIONS.find((d) => d.value === duration);
    if (!opt) {
      throw new ApiError("VALIDATION_ERROR", "Thời hạn khóa không hợp lệ.", {
        status: 422,
      });
    }
    const lockedUntil = computeLockedUntil(duration);
    user.isLocked = true;
    user.lockReason = reason;
    user.lockedAt = new Date().toISOString();
    user.lockedUntil = lockedUntil;

    const note = `Khóa User: ${user.name} | Lý do: ${reason} | Hạn: ${
      opt.shortLabel
    }`;
    appendAudit(db, "lock_user", "user", user.id, note);
    saveDb(db);
    return {
      user: { ...user },
      message: `Đã khóa tài khoản ${user.name} trong ${opt.shortLabel}.`,
    };
  } else {
    user.isLocked = false;
    user.lockReason = null;
    user.lockedAt = null;
    user.lockedUntil = null;

    appendAudit(
      db,
      "unlock_user",
      "user",
      user.id,
      `Mở khóa User: ${user.name} (${user.email})`,
    );
    saveDb(db);
    return {
      user: { ...user },
      message: `Đã mở khóa tài khoản ${user.name}.`,
    };
  }
}

export async function mockStrikeUser(input: {
  userId: number;
  reason: string;
  evidenceUrl?: string;
}): Promise<{
  user: AdminUserRecord;
  action: "warning" | "suspend_7_days" | "ban_permanent";
  message: string;
}> {
  await delay();
  const reason = input.reason.trim();
  if (!reason) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Dữ liệu không hợp lệ. Vui lòng nhập lý do.",
      { status: 422 },
    );
  }
  const db = loadDb();
  const user = db.users.find((u) => u.id === input.userId);
  if (!user) {
    throw new ApiError("VALIDATION_ERROR", "Người dùng không tồn tại.", {
      status: 404,
    });
  }
  if (user.role === "admin") {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Không thể cảnh cáo quản trị viên khác.",
      { status: 403 },
    );
  }

  const outcome = calculateStrikeOutcome(user.strikeCount, reason, user.name);
  user.strikeCount = outcome.nextStrike;
  if (outcome.isLocked) {
    user.isLocked = true;
    user.lockedAt = new Date().toISOString();
    user.lockedUntil = outcome.lockedUntil;
    user.lockReason = outcome.lockReason;
  }

  const nextViolationId =
    db.violations.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  db.violations.unshift({
    id: nextViolationId,
    userId: user.id,
    adminId: 2,
    adminName: "Quản trị viên",
    strikeNumber: outcome.nextStrike,
    reason,
    evidenceUrl: input.evidenceUrl?.trim() ? input.evidenceUrl.trim() : null,
    createdAt: new Date().toISOString(),
  });

  appendAudit(
    db,
    "strike_user",
    "user",
    user.id,
    `Gậy thứ ${outcome.nextStrike}: ${reason}`,
  );
  saveDb(db);

  return {
    user: { ...user },
    action: outcome.action,
    message: outcome.message,
  };
}

export async function mockGetTransactionReports(
  fromDate: string,
  toDate: string,
): Promise<{
  transactions: AdminTransaction[];
  totalAmount: number;
  totalCount: number;
  avgAmount: number;
  byDay: { day: string; amount: number }[];
}> {
  await delay(80);
  const db = loadDb();
  const completedStatuses = new Set(["delivered", "received", "completed"]);

  const filtered = db.transactions.filter(
    (tx) =>
      completedStatuses.has(tx.orderStatus) &&
      isWithinDateRange(tx.createdAt, fromDate, toDate),
  );

  const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);
  const totalCount = filtered.length;
  const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

  const dayMap = new Map<string, number>();
  for (const tx of [...filtered].reverse()) {
    const d = new Date(tx.createdAt);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${dd}/${mm}`;
    dayMap.set(key, (dayMap.get(key) ?? 0) + tx.amount);
  }

  const byDay = Array.from(dayMap.entries()).map(([day, amount]) => ({
    day,
    amount,
  }));

  return {
    transactions: filtered,
    totalAmount,
    totalCount,
    avgAmount,
    byDay,
  };
}

export async function mockGetSystemReports(
  status: "" | ReportStatus = "",
): Promise<{ reports: SystemReport[]; pendingCount: number }> {
  await delay(80);
  const db = loadDb();
  const pendingCount = db.reports.filter((r) => r.status === "pending").length;
  const reports =
    status === ""
      ? [...db.reports]
      : db.reports.filter((r) => r.status === status);
  return { reports, pendingCount };
}

export async function mockResolveSystemReport(input: {
  id: number;
  status: "resolved" | "ignored";
  adminNote?: string;
  evidenceUrl?: string;
}): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const report = db.reports.find((r) => r.id === input.id);
  if (!report) {
    throw new ApiError("VALIDATION_ERROR", "Báo cáo không tồn tại.", {
      status: 404,
    });
  }
  report.status = input.status;
  if (input.adminNote !== undefined && input.adminNote.trim() !== "") {
    report.adminNote = input.adminNote.trim();
  }
  if (input.evidenceUrl !== undefined && input.evidenceUrl.trim() !== "") {
    report.evidenceUrl = input.evidenceUrl.trim();
  }
  appendAudit(
    db,
    input.status === "resolved" ? "resolve_report" : "ignore_report",
    "report",
    report.id,
    `${input.status === "resolved" ? "Đã xử lý" : "Bỏ qua"} tố cáo #${report.id}: ${report.reason}`,
  );
  saveDb(db);
  return { message: "Đã lưu kết quả xử lý báo cáo vi phạm." };
}

export async function mockGetRatings(): Promise<AdminRating[]> {
  await delay(80);
  const db = loadDb();
  return [...db.ratings];
}

export async function mockToggleRating(
  ratingId: number,
): Promise<{ rating: AdminRating; message: string }> {
  await delay();
  const db = loadDb();
  const rating = db.ratings.find((r) => r.id === ratingId);
  if (!rating) {
    throw new ApiError("VALIDATION_ERROR", "Đánh giá không tồn tại.", {
      status: 404,
    });
  }
  rating.status = rating.status === "visible" ? "hidden" : "visible";
  appendAudit(
    db,
    "toggle_rating",
    "rating",
    rating.id,
    `${rating.status === "hidden" ? "Ẩn" : "Hiện lại"} bình luận đánh giá #${rating.id} của ${rating.raterName}`,
  );
  saveDb(db);
  return {
    rating: { ...rating },
    message:
      rating.status === "hidden"
        ? "Đã ẩn bình luận và gửi email cảnh cáo tiêu chuẩn cộng đồng."
        : "Đã hiển thị lại bình luận đánh giá.",
  };
}

export async function mockGetBanners(): Promise<AdminBanner[]> {
  await delay(80);
  const db = loadDb();
  return [...db.banners].sort(
    (a, b) =>
      a.displayOrder - b.displayOrder ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export async function mockCreateBanner(input: {
  title: string;
  link: string;
  displayOrder: number;
  isActive: boolean;
  imageUrl?: string;
}): Promise<{ banner: AdminBanner; message: string }> {
  await delay();
  const db = loadDb();
  const nextId =
    db.banners.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const cleanTitle = input.title.trim() || `Banner #${nextId}`;
  const banner: AdminBanner = {
    id: nextId,
    title: cleanTitle,
    link: input.link.trim(),
    displayOrder: Number.isFinite(input.displayOrder) ? input.displayOrder : 0,
    isActive: input.isActive,
    imageUrl:
      input.imageUrl ||
      makeBannerSvg(
        cleanTitle,
        input.link.trim() || "SinhVienMarket",
        "#2563eb",
        "#0284c7",
      ),
    createdAt: new Date().toISOString(),
  };
  db.banners.push(banner);
  appendAudit(db, "create_banner", "banner", nextId, `Thêm Banner: ${cleanTitle}`);
  saveDb(db);
  return { banner, message: "Đã thêm Banner mới." };
}

export async function mockUpdateBanner(input: {
  id: number;
  title: string;
  link: string;
  displayOrder: number;
}): Promise<{ banner: AdminBanner; message: string }> {
  await delay();
  const db = loadDb();
  const banner = db.banners.find((b) => b.id === input.id);
  if (!banner) {
    throw new ApiError("VALIDATION_ERROR", "Banner không tồn tại.", {
      status: 404,
    });
  }
  banner.title = input.title.trim() || "Không tên";
  banner.link = input.link.trim();
  banner.displayOrder = Number.isFinite(input.displayOrder)
    ? input.displayOrder
    : 0;
  appendAudit(
    db,
    "update_banner",
    "banner",
    banner.id,
    `Cập nhật Banner: ${banner.title}`,
  );
  saveDb(db);
  return { banner: { ...banner }, message: "Đã cập nhật Banner." };
}

export async function mockToggleBanner(
  bannerId: number,
): Promise<{ banner: AdminBanner; message: string }> {
  await delay();
  const db = loadDb();
  const banner = db.banners.find((b) => b.id === bannerId);
  if (!banner) {
    throw new ApiError("VALIDATION_ERROR", "Banner không tồn tại.", {
      status: 404,
    });
  }
  banner.isActive = !banner.isActive;
  appendAudit(
    db,
    "toggle_banner",
    "banner",
    banner.id,
    `${banner.isActive ? "Hiển thị" : "Tạm ẩn"} Banner: ${banner.title}`,
  );
  saveDb(db);
  return {
    banner: { ...banner },
    message: "Đã thay đổi trạng thái Banner.",
  };
}

export async function mockDeleteBanner(
  bannerId: number,
): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const idx = db.banners.findIndex((b) => b.id === bannerId);
  if (idx === -1) {
    throw new ApiError("VALIDATION_ERROR", "Banner không tồn tại.", {
      status: 404,
    });
  }
  const removed = db.banners[idx];
  db.banners.splice(idx, 1);
  appendAudit(
    db,
    "delete_banner",
    "banner",
    bannerId,
    `Xóa Banner: ${removed.title}`,
  );
  saveDb(db);
  return { message: "Đã xóa Banner vĩnh viễn." };
}

export async function mockGetGiveaways(): Promise<AdminGiveaway[]> {
  await delay(80);
  const db = loadDb();
  return [...db.giveaways];
}

export async function mockGetGiveawayById(id: number): Promise<AdminGiveaway> {
  await delay(80);
  const db = loadDb();
  const ga = db.giveaways.find((g) => g.id === id);
  if (!ga || ga.status === "ended") {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Sự kiện không tồn tại hoặc đã kết thúc!",
      { status: 404 },
    );
  }
  return { ...ga, participants: [...ga.participants] };
}

export async function mockCreateGiveaway(input: {
  title: string;
  description: string;
  endTime: string;
  imageUrl?: string;
}): Promise<{ giveaway: AdminGiveaway; message: string }> {
  await delay();
  const cleanTitle = input.title.trim();
  if (!cleanTitle || !input.endTime) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Vui lòng nhập đầy đủ tiêu đề và thời gian kết thúc.",
      { status: 422 },
    );
  }
  const db = loadDb();
  const nextId =
    db.giveaways.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  const giveaway: AdminGiveaway = {
    id: nextId,
    title: cleanTitle,
    description: input.description.trim(),
    endTime: new Date(input.endTime).toISOString(),
    imageUrl:
      input.imageUrl ||
      makeBannerSvg(cleanTitle, "Giveaway SinhVienMarket", "#2563eb", "#0ea5e9"),
    status: "active",
    winnerId: null,
    winnerName: null,
    participants: [
      {
        id: 1,
        name: "Nguyễn Minh Anh",
        email: "student@demo.vn",
        joinedAt: new Date().toISOString(),
      },
      {
        id: 6,
        name: "Đỗ Khánh Linh",
        email: "linh.do@student.edu.vn",
        joinedAt: new Date().toISOString(),
      },
      {
        id: 7,
        name: "Võ Tuấn Kiệt",
        email: "kiet.vo@student.edu.vn",
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };

  db.giveaways.unshift(giveaway);
  appendAudit(
    db,
    "create_giveaway",
    "giveaway",
    nextId,
    `Tạo sự kiện: ${cleanTitle}`,
  );
  saveDb(db);
  return { giveaway, message: "Tạo Giveaway thành công!" };
}

export async function mockDeleteGiveaway(
  giveawayId: number,
): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const idx = db.giveaways.findIndex((g) => g.id === giveawayId);
  if (idx === -1) {
    throw new ApiError("VALIDATION_ERROR", "Sự kiện không tồn tại.", {
      status: 404,
    });
  }
  const removed = db.giveaways[idx];
  db.giveaways.splice(idx, 1);
  appendAudit(
    db,
    "delete_giveaway",
    "giveaway",
    giveawayId,
    `Xóa sự kiện: ${removed.title}`,
  );
  saveDb(db);
  return { message: "Đã xóa sự kiện giveaway." };
}

export async function mockSaveGiveawayWinner(input: {
  id: number;
  winnerId: number;
}): Promise<{ message: string }> {
  await delay();
  const db = loadDb();
  const ga = db.giveaways.find((g) => g.id === input.id);
  if (!ga) {
    throw new ApiError("VALIDATION_ERROR", "Sự kiện không tồn tại.", {
      status: 404,
    });
  }
  const participant = ga.participants.find((p) => p.id === input.winnerId);
  if (!participant) {
    throw new ApiError("VALIDATION_ERROR", "Người trúng giải không hợp lệ.", {
      status: 422,
    });
  }
  ga.winnerId = participant.id;
  ga.winnerName = participant.name;
  ga.status = "ended";

  appendAudit(
    db,
    "spin_giveaway",
    "giveaway",
    ga.id,
    `Quay số "${ga.title}" — Người trúng: ${participant.name} (${participant.email})`,
  );
  saveDb(db);
  return { message: "Đã lưu người trúng giải thành công!" };
}

export async function mockGetAuditLogs(): Promise<AuditLogEntry[]> {
  await delay(80);
  const db = loadDb();
  return [...db.auditLogs];
}

export async function mockExportCsv(input: {
  type: ExportType;
  fromDate?: string;
  toDate?: string;
}): Promise<{ filename: string; content: string }> {
  await delay(80);
  const db = loadDb();
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const filename = `export_${input.type}_${stamp}.csv`;

  if (input.type === "users") {
    const filtered = db.users.filter((u) =>
      isWithinDateRange(u.createdAt, input.fromDate, input.toDate),
    );
    const studentCount = filtered.filter((u) => u.role === "student").length;
    const content = buildCsvContent({
      headers: [
        "ID",
        "Họ tên",
        "Email",
        "Vai trò",
        "Trạng thái khóa",
        "Xác thực",
        "Số gậy (Strikes)",
        "Ngày đăng ký",
      ],
      rows: filtered.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role === "admin" ? "Admin" : "Sinh viên",
        u.isLocked ? "Bị khóa" : "Hoạt động",
        u.isVerified ? "Đã xác thực" : "Chưa",
        u.strikeCount,
        u.createdAt,
      ]),
      summaryRows: [
        ["Tổng số tài khoản:", filtered.length],
        ["Số lượng sinh viên:", studentCount],
      ],
      fromDate: input.fromDate,
      toDate: input.toDate,
    });
    return { filename, content };
  }

  if (input.type === "products") {
    const filtered = db.products.filter((p) =>
      isWithinDateRange(p.createdAt, input.fromDate, input.toDate),
    );
    const soldCount = filtered.filter((p) => p.status === "sold").length;
    const content = buildCsvContent({
      headers: [
        "ID",
        "Tên Sản Phẩm",
        "Danh Mục",
        "Người Bán",
        "Loại",
        "Giá (VNĐ)",
        "Tình Trạng",
        "Trạng Thái",
        "Ngày Đăng",
      ],
      rows: filtered.map((p) => [
        p.id,
        p.title,
        p.categoryName,
        p.sellerName,
        p.type,
        p.price ?? 0,
        p.condition,
        p.status,
        p.createdAt,
      ]),
      summaryRows: [
        ["Tổng số bài đăng:", filtered.length],
        ["Số bài đã bán:", soldCount],
      ],
      fromDate: input.fromDate,
      toDate: input.toDate,
    });
    return { filename, content };
  }

  const filtered = db.transactions.filter((tx) =>
    isWithinDateRange(tx.createdAt, input.fromDate, input.toDate),
  );
  const completedStatuses = new Set(["delivered", "received", "completed"]);
  let successCount = 0;
  let totalAmount = 0;
  for (const tx of filtered) {
    if (completedStatuses.has(tx.orderStatus)) {
      successCount++;
      totalAmount += tx.amount;
    }
  }
  const content = buildCsvContent({
    headers: [
      "ID Giao Dịch",
      "Tên Sản Phẩm",
      "Người Mua",
      "Người Bán",
      "Giá Trị",
      "Phương Thức",
      "Trạng Thái",
      "Ngày Giao Dịch",
    ],
    rows: filtered.map((tx) => [
      tx.id,
      tx.productTitle,
      tx.buyerName,
      tx.sellerName,
      tx.amount,
      tx.paymentMethod,
      tx.orderStatus,
      tx.createdAt,
    ]),
    summaryRows: [
      ["Tổng số giao dịch:", filtered.length],
      ["Số giao dịch thành công:", successCount],
      ["Tổng doanh thu (VNĐ):", totalAmount],
    ],
    fromDate: input.fromDate,
    toDate: input.toDate,
  });
  return { filename, content };
}
