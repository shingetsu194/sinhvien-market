import { USE_MOCK } from "@/lib/config";
import { apiRequest } from "./client";

export interface FeeCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}
export interface InvoiceLine {
  id: number;
  feeCategoryId: number | null;
  categoryName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
export interface ResidenceInvoice {
  id: number;
  invoiceNumber: string;
  userId: number;
  studentName: string;
  contractId: number | null;
  description: string;
  issuedAt: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: "open" | "partial" | "paid" | "void";
  lines: InvoiceLine[];
}
export interface ResidencePayment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  studentName: string;
  amount: number;
  method: "cash" | "bank_transfer" | "other";
  reference: string | null;
  note: string | null;
  status: "pending" | "confirmed" | "rejected";
  createdAt: string;
}
export interface ResidenceNotice {
  id: number;
  type: "announcement" | "event" | "rule";
  title: string;
  body: string;
  audience: "all" | "residents";
  startsAt: string | null;
  endsAt: string | null;
  status: "published" | "archived";
  authorName: string;
  createdAt: string;
}

interface MockFinanceStore {
  categories: FeeCategory[];
  invoices: ResidenceInvoice[];
  payments: ResidencePayment[];
  notices: ResidenceNotice[];
}

const FINANCE_STORAGE_KEY = "svm_mock_residence_finance_v1";

function createDefaultFinanceStore(): MockFinanceStore {
  return {
    categories: [
      {
        id: 1,
        name: "Phí lưu trú phòng tiêu chuẩn 4 người",
        description: "Mức phí nội trú cơ bản theo học kỳ dành cho sinh viên KTX Khu B",
        isActive: true,
      },
      {
        id: 2,
        name: "Phí điện sinh hoạt (vượt định mức)",
        description: "Tính theo chỉ số công tơ phòng chia đều đầu người (3.000đ/kWh)",
        isActive: true,
      },
      {
        id: 3,
        name: "Phí nước sạch & Vệ sinh nội khu",
        description: "Cấp nước sinh hoạt và thu gom rác hành lang hàng tháng",
        isActive: true,
      },
      {
        id: 4,
        name: "Phí Internet cáp quang KTX",
        description: "Gói mạng tốc độ cao học tập tại phòng ở",
        isActive: true,
      },
    ],
    invoices: [
      {
        id: 501,
        invoiceNumber: "INV-KTX-202611",
        userId: 2,
        studentName: "Nguyễn Minh Anh",
        contractId: 1,
        description: "Phí lưu trú & điện nước tháng 11/2026 — Tòa B2 Phòng 304",
        issuedAt: "2026-11-01",
        dueDate: "2026-11-25",
        totalAmount: 585000,
        paidAmount: 200000,
        outstandingAmount: 385000,
        status: "partial",
        lines: [
          {
            id: 1,
            feeCategoryId: 1,
            categoryName: "Phí lưu trú phòng tiêu chuẩn 4 người",
            description: "Tiền phòng tháng 11/2026 (Giường G2 - B2.304)",
            quantity: 1,
            unitPrice: 450000,
            lineTotal: 450000,
          },
          {
            id: 2,
            feeCategoryId: 2,
            categoryName: "Phí điện sinh hoạt (vượt định mức)",
            description: "25 kWh vượt định mức miễn phí",
            quantity: 25,
            unitPrice: 3000,
            lineTotal: 75000,
          },
          {
            id: 3,
            feeCategoryId: 3,
            categoryName: "Phí nước sạch & Vệ sinh nội khu",
            description: "Định mức nước sinh hoạt & vệ sinh tháng 11",
            quantity: 1,
            unitPrice: 60000,
            lineTotal: 60000,
          },
        ],
      },
      {
        id: 500,
        invoiceNumber: "INV-KTX-202610",
        userId: 2,
        studentName: "Nguyễn Minh Anh",
        contractId: 1,
        description: "Phí lưu trú & điện nước tháng 10/2026 — Tòa B2 Phòng 304",
        issuedAt: "2026-10-01",
        dueDate: "2026-10-25",
        totalAmount: 560000,
        paidAmount: 560000,
        outstandingAmount: 0,
        status: "paid",
        lines: [
          {
            id: 4,
            feeCategoryId: 1,
            categoryName: "Phí lưu trú phòng tiêu chuẩn 4 người",
            description: "Tiền phòng tháng 10/2026 (Giường G2 - B2.304)",
            quantity: 1,
            unitPrice: 450000,
            lineTotal: 450000,
          },
          {
            id: 5,
            feeCategoryId: 3,
            categoryName: "Phí nước sạch & Vệ sinh nội khu",
            description: "Định mức nước sinh hoạt & vệ sinh tháng 10",
            quantity: 1,
            unitPrice: 60000,
            lineTotal: 60000,
          },
          {
            id: 6,
            feeCategoryId: 4,
            categoryName: "Phí Internet cáp quang KTX",
            description: "Cáp quang học tập tháng 10/2026",
            quantity: 1,
            unitPrice: 50000,
            lineTotal: 50000,
          },
        ],
      },
    ],
    payments: [
      {
        id: 901,
        invoiceId: 501,
        invoiceNumber: "INV-KTX-202611",
        studentName: "Nguyễn Minh Anh",
        amount: 200000,
        method: "bank_transfer",
        reference: "MB88291042",
        note: "Tạm ứng đợt 1 phí tháng 11",
        status: "confirmed",
        createdAt: "2026-11-05 14:20:00",
      },
      {
        id: 900,
        invoiceId: 500,
        invoiceNumber: "INV-KTX-202610",
        studentName: "Nguyễn Minh Anh",
        amount: 560000,
        method: "bank_transfer",
        reference: "VCB77192834",
        note: "Thanh toán đủ hóa đơn tháng 10",
        status: "confirmed",
        createdAt: "2026-10-18 09:15:00",
      },
    ],
    notices: [
      {
        id: 301,
        type: "announcement",
        title: "Lịch kiểm tra an toàn điện & PCCC định kỳ học kỳ I (Tòa A1 & B2)",
        body: "Ban Quản lý KTX phối hợp cùng đội Kỹ thuật tiến hành kiểm tra hệ thống ổ cắm, aptomat và thiết bị báo khói tại các phòng từ 08:30 – 16:30 thứ Bảy tuần này. Đề nghị sinh viên sắp xếp gọn gàng khu vực bàn học và không tự ý câu nối dây điện ngoài quy chuẩn.",
        audience: "residents",
        startsAt: "2026-11-10",
        endsAt: "2026-11-30",
        status: "published",
        authorName: "Ban Quản lý KTX Khu B",
        createdAt: "2026-11-10 08:30:00",
      },
      {
        id: 302,
        type: "event",
        title: "Ngày hội Đổi giáo trình cũ lấy cây xanh & Chợ phiên SinhVienMarket",
        body: "Sự kiện giao lưu trao đổi giáo trình đại cương, đồ gia dụng KTX và nhận sen đá miễn phí tại Sảnh chính Tòa B2. Sinh viên có thể đăng trước nhu cầu trên mục Ghép nối AI để tìm bạn cùng trường trao tay trực tiếp.",
        audience: "all",
        startsAt: "2026-11-15",
        endsAt: "2026-11-22",
        status: "published",
        authorName: "Đoàn Thanh niên & CLB Tự quản KTX",
        createdAt: "2026-11-11 10:00:00",
      },
      {
        id: 303,
        type: "rule",
        title: "Nội quy giờ giấc ra vào cổng KTX (05:00 – 23:00) và giờ yên tĩnh ban đêm",
        body: "Cổng chính KTX mở cửa từ 05:00 sáng và đóng lúc 23:00 đêm hàng ngày. Khung giờ yên tĩnh bắt buộc tại các tầng phòng ở là từ 22:30 đến 05:30 sáng hôm sau; sinh viên không bật loa ngoài, đàn hát hoặc gây tiếng ồn ảnh hưởng phòng bên cạnh. Trường hợp đi học/đi làm về trễ sau 23:00 cần xuất trình thẻ sinh viên và ghi sổ trực tại chốt bảo vệ.",
        audience: "all",
        startsAt: "2026-09-01",
        endsAt: null,
        status: "published",
        authorName: "Ban Quản lý KTX",
        createdAt: "2026-09-01 08:00:00",
      },
      {
        id: 304,
        type: "rule",
        title: "Quy định sử dụng thiết bị điện, nấu ăn và phòng chống cháy nổ trong phòng ở",
        body: "Sinh viên được phép sử dụng máy tính cá nhân, đèn bàn học, quạt cá nhân và ấm đun nước tự ngắt dưới 1.500W. Nghiêm cấm sử dụng bếp gas mini, bếp từ công suất lớn, bàn ủi không tự ngắt hoặc tự ý tháo gỡ thiết bị điện trong phòng. Khi phát hiện ổ cắm có tia lửa hoặc mùi khét, hãy ngắt aptomat phòng và gửi ngay Yêu cầu sửa chữa trên hệ thống.",
        audience: "all",
        startsAt: "2026-09-01",
        endsAt: null,
        status: "published",
        authorName: "Ban Quản lý KTX",
        createdAt: "2026-09-01 08:15:00",
      },
      {
        id: 305,
        type: "rule",
        title: "Quy định tiếp khách, người thân và giữ gìn vệ sinh chung tại KTX",
        body: "Khách đến thăm sinh viên cần đăng ký giấy tờ tùy thân tại quầy trực sảnh và chỉ gặp gỡ tại khu vực sảnh sinh hoạt chung từ 07:30 đến 20:30; không tự ý đưa người lạ lên tầng phòng ở hoặc lưu trú qua đêm. Rác sinh hoạt cần phân loại và bỏ đúng nơi quy định trước 21:00 mỗi ngày.",
        audience: "all",
        startsAt: "2026-09-01",
        endsAt: null,
        status: "published",
        authorName: "Ban Quản lý KTX",
        createdAt: "2026-09-01 08:30:00",
      },
    ],
  };
}

export function readMockFinanceStore(): MockFinanceStore {
  if (typeof window === "undefined") return createDefaultFinanceStore();
  try {
    const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY);
    if (!raw) {
      const initial = createDefaultFinanceStore();
      window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<MockFinanceStore>;
    const defaults = createDefaultFinanceStore();
    return {
      categories: parsed.categories?.length ? parsed.categories : defaults.categories,
      invoices: parsed.invoices?.length ? parsed.invoices : defaults.invoices,
      payments: parsed.payments?.length ? parsed.payments : defaults.payments,
      notices: parsed.notices?.length ? parsed.notices : defaults.notices,
    };
  } catch {
    return createDefaultFinanceStore();
  }
}

function writeMockFinanceStore(store: MockFinanceStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota errors in mock mode
  }
}

export const getFeeCategories = async (): Promise<FeeCategory[]> => {
  if (USE_MOCK) return readMockFinanceStore().categories;
  return apiRequest<FeeCategory[]>("/residence/fee-categories");
};

export const getResidenceInvoices = async (): Promise<ResidenceInvoice[]> => {
  if (USE_MOCK) return readMockFinanceStore().invoices;
  return apiRequest<ResidenceInvoice[]>("/residence/invoices");
};

export const getResidencePayments = async (): Promise<ResidencePayment[]> => {
  if (USE_MOCK) return readMockFinanceStore().payments;
  return apiRequest<ResidencePayment[]>("/residence/payments");
};

export const recordResidencePayment = async (input: {
  invoiceId: number;
  amount: number;
  method: ResidencePayment["method"];
  reference?: string;
  note?: string;
}): Promise<{ id: number }> => {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>("/residence/payments", {
      method: "POST",
      body: input,
    });
  }
  const store = readMockFinanceStore();
  const inv = store.invoices.find((item) => item.id === input.invoiceId);
  if (!inv) {
    throw new Error("Không tìm thấy hóa đơn cần thanh toán.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Số tiền thanh toán phải lớn hơn 0.");
  }
  if (input.amount > inv.outstandingAmount) {
    throw new Error("Số tiền vượt quá dư nợ còn lại của hóa đơn.");
  }
  const id = Date.now();
  const payment: ResidencePayment = {
    id,
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    studentName: inv.studentName,
    amount: input.amount,
    method: input.method,
    reference: input.reference?.trim() || null,
    note: input.note?.trim() || null,
    status: "pending",
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  };
  store.payments = [payment, ...store.payments];
  writeMockFinanceStore(store);
  return { id };
};

export const getResidenceNotices = async (): Promise<ResidenceNotice[]> => {
  if (USE_MOCK) {
    return readMockFinanceStore().notices.filter(
      (n) => n.status === "published",
    );
  }
  return apiRequest<ResidenceNotice[]>("/residence/notices");
};

export const getAdminFeeCategories = () => getFeeCategories();
export const getAdminInvoices = () => getResidenceInvoices();
export const getAdminResidencePayments = () => getResidencePayments();

export const saveFeeCategory = async (
  input: {
    name: string;
    description?: string;
    isActive?: boolean;
  },
  id?: number,
): Promise<{ id: number }> => {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>(
      `/admin/residence/fee-categories${id ? `/${id}` : ""}`,
      { method: id ? "PUT" : "POST", body: input },
    );
  }
  const store = readMockFinanceStore();
  const nextId = id ?? Date.now();
  const record: FeeCategory = {
    id: nextId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    isActive: input.isActive ?? true,
  };
  store.categories = id
    ? store.categories.map((c) => (c.id === id ? record : c))
    : [record, ...store.categories];
  writeMockFinanceStore(store);
  return { id: nextId };
};

export const createResidenceInvoice = async (input: {
  userId: number;
  contractId?: number;
  description: string;
  issuedAt: string;
  dueDate: string;
  lines: Array<{
    feeCategoryId: number;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}): Promise<{ id: number }> => {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>("/admin/residence/invoices", {
      method: "POST",
      body: input,
    });
  }
  const store = readMockFinanceStore();
  const id = Date.now();
  const lines: InvoiceLine[] = input.lines.map((line, idx) => {
    const cat = store.categories.find((c) => c.id === line.feeCategoryId);
    const lineTotal = line.quantity * line.unitPrice;
    return {
      id: idx + 1,
      feeCategoryId: line.feeCategoryId,
      categoryName: cat?.name ?? "Khoản phí KTX",
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal,
    };
  });
  const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const inv: ResidenceInvoice = {
    id,
    invoiceNumber: `INV-KTX-${String(id).slice(-6)}`,
    userId: input.userId,
    studentName: "Nguyễn Minh Anh",
    contractId: input.contractId ?? null,
    description: input.description,
    issuedAt: input.issuedAt,
    dueDate: input.dueDate,
    totalAmount,
    paidAmount: 0,
    outstandingAmount: totalAmount,
    status: "open",
    lines,
  };
  store.invoices = [inv, ...store.invoices];
  writeMockFinanceStore(store);
  return { id };
};

export const reviewResidencePayment = async (
  id: number,
  decision: "confirmed" | "rejected",
): Promise<null> => {
  if (!USE_MOCK) {
    return apiRequest<null>(`/admin/residence/payments/${id}/review`, {
      method: "POST",
      body: { decision },
    });
  }
  const store = readMockFinanceStore();
  const payment = store.payments.find((p) => p.id === id);
  if (payment) {
    payment.status = decision;
    if (decision === "confirmed") {
      const inv = store.invoices.find((i) => i.id === payment.invoiceId);
      if (inv) {
        inv.paidAmount = Math.min(inv.totalAmount, inv.paidAmount + payment.amount);
        inv.outstandingAmount = Math.max(0, inv.totalAmount - inv.paidAmount);
        inv.status = inv.outstandingAmount === 0 ? "paid" : "partial";
      }
    }
    writeMockFinanceStore(store);
  }
  return null;
};

export const createResidenceNotice = async (input: {
  type: ResidenceNotice["type"];
  title: string;
  body: string;
  audience: ResidenceNotice["audience"];
  startsAt?: string;
  endsAt?: string;
}): Promise<{ id: number }> => {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>("/admin/residence/notices", {
      method: "POST",
      body: input,
    });
  }
  const store = readMockFinanceStore();
  const id = Date.now();
  const notice: ResidenceNotice = {
    id,
    type: input.type,
    title: input.title.trim(),
    body: input.body.trim(),
    audience: input.audience,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
    status: "published",
    authorName: "Ban Quản lý KTX",
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  };
  store.notices = [notice, ...store.notices];
  writeMockFinanceStore(store);
  return { id };
};

export const archiveResidenceNotice = async (
  id: number,
): Promise<{ id: number }> => {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>(`/admin/residence/notices/${id}/archive`, {
      method: "POST",
    });
  }
  const store = readMockFinanceStore();
  store.notices = store.notices.map((n) =>
    n.id === id ? { ...n, status: "archived" } : n,
  );
  writeMockFinanceStore(store);
  return { id };
};
