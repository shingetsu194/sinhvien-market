import { USE_MOCK } from "@/lib/config";
import { apiRequest } from "./client";
import { readMockFinanceStore } from "./residence-finance";

export interface ResidenceBuilding {
  id: number;
  code: string;
  name: string;
  address: string | null;
  status: string;
}
export interface ResidenceFloor {
  id: number;
  buildingId: number;
  buildingCode: string;
  buildingName: string;
  floorNumber: number;
  name: string | null;
}
export interface ResidenceRoom {
  id: number;
  floorId: number;
  floorNumber: number;
  buildingCode: string;
  buildingName: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  status: string;
  bedCount: number;
}
export interface ResidenceBed {
  id: number;
  roomId: number;
  roomNumber: string;
  floorNumber: number;
  buildingCode: string;
  buildingName: string;
  bedNumber: string;
  status: string;
}
export interface BedAllocation {
  contractId: number;
  contractNumber: string;
  userId: number;
  allocationId: number | null;
  studentName: string;
  startDate: string;
  endDate: string;
  bedId: number | null;
  bedNumber: string | null;
  roomNumber: string | null;
  buildingCode: string | null;
  floorNumber: number | null;
}
export interface ServiceRequest {
  id: number;
  userId: number;
  requestType: "service" | "repair" | "feedback";
  title: string;
  description: string;
  roomId: number | null;
  roomNumber: string | null;
  status: "submitted" | "assigned" | "in_progress" | "resolved" | "closed";
  priority: string;
  assignedTo: number | null;
  assignedName: string | null;
  staffNote: string | null;
  requesterName: string;
  requesterEmail: string;
  aiCategory: string | null;
  aiConfidence: number | null;
  aiRecommendedPriority: string | null;
  aiReason: string | null;
  aiModelKey: string | null;
}
export interface DormRulesAnswer {
  answer: string;
  sources: Array<{ id: number; title: string }>;
  modelKey: string;
}
export interface ResidenceOperationsDashboard {
  activeBuildings: number;
  activeRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  openServiceRequests: number;
  pendingResidenceApplications: number;
  outstandingInvoices: number;
  pendingPaymentReviews: number;
}
export interface RentalSpace {
  id: number;
  spaceCode: string;
  name: string;
  location: string;
  areaSqm: number;
  monthlyPrice: number;
  description: string | null;
  status: string;
}
export interface RentalApplication {
  id: number;
  applicationNumber: string;
  spaceId: number;
  spaceCode: string;
  spaceName: string;
  applicantName: string;
  applicantEmail: string;
  startDate: string;
  endDate: string;
  businessName: string;
  note: string | null;
  status: string;
  decisionNote: string | null;
  contractNumber: string | null;
}
export interface RentalContract {
  id: number;
  contractNumber: string;
  spaceCode: string;
  spaceName: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  monthlyPrice: number;
  status: string;
}

export interface AccommodationHistoryItem {
  allocationId: number;
  startDate: string;
  endDate: string;
  allocationStatus: string;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  bedNumber: string;
  eventType: string | null;
  eventDate: string | null;
  eventNote: string | null;
}

interface MockOpsStore {
  buildings: ResidenceBuilding[];
  floors: ResidenceFloor[];
  rooms: ResidenceRoom[];
  beds: ResidenceBed[];
  allocations: BedAllocation[];
  history: AccommodationHistoryItem[];
  serviceRequests: ServiceRequest[];
  rentalSpaces: RentalSpace[];
  rentalApplications: RentalApplication[];
  rentalContracts: RentalContract[];
}

const OPS_STORAGE_KEY = "svm_mock_residence_ops_v1";

function createDefaultOpsStore(): MockOpsStore {
  return {
    buildings: [
      {
        id: 1,
        code: "B2",
        name: "Tòa B2 — KTX Khu B ĐHQG",
        address: "Đường Tạ Quang Bửu, Khu Đô thị ĐHQG TP.HCM",
        status: "active",
      },
      {
        id: 2,
        code: "A1",
        name: "Tòa A1 — KTX Khu A ĐHQG",
        address: "Khu phố 6, Phường Linh Trung, TP. Thủ Đức",
        status: "active",
      },
    ],
    floors: [
      {
        id: 1,
        buildingId: 1,
        buildingCode: "B2",
        buildingName: "Tòa B2 — KTX Khu B ĐHQG",
        floorNumber: 3,
        name: "Tầng 3 (Nam/Nữ tiêu chuẩn)",
      },
      {
        id: 2,
        buildingId: 2,
        buildingCode: "A1",
        buildingName: "Tòa A1 — KTX Khu A ĐHQG",
        floorNumber: 2,
        name: "Tầng 2 (Khu học tập yên tĩnh)",
      },
    ],
    rooms: [
      {
        id: 304,
        floorId: 1,
        floorNumber: 3,
        buildingCode: "B2",
        buildingName: "Tòa B2 — KTX Khu B ĐHQG",
        roomNumber: "304",
        roomType: "standard",
        capacity: 4,
        status: "active",
        bedCount: 4,
      },
      {
        id: 201,
        floorId: 2,
        floorNumber: 2,
        buildingCode: "A1",
        buildingName: "Tòa A1 — KTX Khu A ĐHQG",
        roomNumber: "201",
        roomType: "standard",
        capacity: 4,
        status: "active",
        bedCount: 4,
      },
    ],
    beds: [
      {
        id: 1,
        roomId: 304,
        roomNumber: "304",
        floorNumber: 3,
        buildingCode: "B2",
        buildingName: "Tòa B2 — KTX Khu B ĐHQG",
        bedNumber: "G1",
        status: "occupied",
      },
      {
        id: 2,
        roomId: 304,
        roomNumber: "304",
        floorNumber: 3,
        buildingCode: "B2",
        buildingName: "Tòa B2 — KTX Khu B ĐHQG",
        bedNumber: "G2",
        status: "occupied",
      },
      {
        id: 3,
        roomId: 304,
        roomNumber: "304",
        floorNumber: 3,
        buildingCode: "B2",
        buildingName: "Tòa B2 — KTX Khu B ĐHQG",
        bedNumber: "G3",
        status: "available",
      },
      {
        id: 4,
        roomId: 201,
        roomNumber: "201",
        floorNumber: 2,
        buildingCode: "A1",
        buildingName: "Tòa A1 — KTX Khu A ĐHQG",
        bedNumber: "G1",
        status: "available",
      },
    ],
    allocations: [
      {
        contractId: 1,
        contractNumber: "HD-KTX-2026-001",
        userId: 2,
        allocationId: 10,
        studentName: "Nguyễn Minh Anh",
        startDate: "2026-09-01",
        endDate: "2027-06-30",
        bedId: 2,
        bedNumber: "G2",
        roomNumber: "304",
        buildingCode: "B2",
        floorNumber: 3,
      },
    ],
    history: [
      {
        allocationId: 10,
        startDate: "2026-09-01",
        endDate: "2027-06-30",
        allocationStatus: "active",
        buildingCode: "B2",
        floorNumber: 3,
        roomNumber: "304",
        bedNumber: "G2",
        eventType: "assigned",
        eventDate: "2026-08-29",
        eventNote: "Xếp giường đầu năm học 2026–2027 tại Tòa B2 Phòng 304",
      },
    ],
    serviceRequests: [
      {
        id: 701,
        userId: 2,
        requestType: "repair",
        title: "Đèn tuýp bàn học giường G2 phòng B2-304 bị nhấp nháy",
        description:
          "Bóng đèn LED ngay góc học tập giường G2 chập chờn khi bật buổi tối, mong kỹ thuật kiểm tra tắc-te hoặc thay bóng mới.",
        roomId: 304,
        roomNumber: "304",
        status: "in_progress",
        priority: "normal",
        assignedTo: 15,
        assignedName: "KTV. Trần Văn Hùng (Tổ Điện - Nước)",
        staffNote: "Đã tiếp nhận, dự kiến ghé phòng 15:00 chiều nay để thay bóng LED mới.",
        requesterName: "Nguyễn Minh Anh",
        requesterEmail: "student@demo.vn",
        aiCategory: "electrical",
        aiConfidence: 0.89,
        aiRecommendedPriority: "normal",
        aiReason: "Khớp nhóm từ khóa thiết bị chiếu sáng / điện phòng ở (đèn, nhấp nháy, bật).",
        aiModelKey: "local-repair-keyword-v1",
      },
      {
        id: 700,
        userId: 2,
        requestType: "service",
        title: "Đăng ký vệ sinh lưới lọc quạt thông gió & ban công phòng B2-304",
        description:
          "Nhờ bộ phận dịch vụ hỗ trợ kiểm tra quạt hút nhà vệ sinh hơi kêu và hướng dẫn nhận túi phân loại rác mới.",
        roomId: 304,
        roomNumber: "304",
        status: "resolved",
        priority: "low",
        assignedTo: 16,
        assignedName: "NV. Lê Thị Mai (Tổ Dịch vụ Nội khu)",
        staffNote: "Đã vệ sinh quạt hút và bàn giao bộ túi phân loại rác tại phòng.",
        requesterName: "Nguyễn Minh Anh",
        requesterEmail: "student@demo.vn",
        aiCategory: "hvac_cleaning",
        aiConfidence: 0.82,
        aiRecommendedPriority: "low",
        aiReason: "Khớp nhóm dịch vụ vệ sinh & thông gió định kỳ.",
        aiModelKey: "local-repair-keyword-v1",
      },
    ],
    rentalSpaces: [
      {
        id: 1,
        spaceCode: "KIOT-B2-01",
        name: "Quầy In ấn, Photocopy & Văn phòng phẩm Sảnh B2",
        location: "Tầng trệt Tòa B2 (cạnh sảnh sinh hoạt chung)",
        areaSqm: 18,
        monthlyPrice: 3500000,
        description:
          "Phù hợp dịch vụ in giáo trình, đóng bìa đồ án, cung cấp dụng cụ học tập cho sinh viên nội trú.",
        status: "available",
      },
      {
        id: 2,
        spaceCode: "KIOT-A1-02",
        name: "Gian hàng Nước ép, Cà phê mang đi & Đồ ăn nhẹ Tòa A1",
        location: "Khuôn viên sân trước Tòa A1",
        areaSqm: 22,
        monthlyPrice: 4200000,
        description:
          "Có sẵn đường cấp thoát nước sạch và đồng hồ điện riêng, ưu tiên mô hình phục vụ nhanh gọn, vệ sinh.",
        status: "available",
      },
      {
        id: 3,
        spaceCode: "KIOT-B2-03",
        name: "Góc Sửa chữa Laptop, Điện thoại & Phụ kiện Sinh viên",
        location: "Hành lang thương mại Tòa B2",
        areaSqm: 15,
        monthlyPrice: 2800000,
        description:
          "Không gian kín đáo, có sẵn hệ thống ổ cắm tiêu chuẩn và tủ trưng bày phụ kiện công nghệ.",
        status: "available",
      },
    ],
    rentalApplications: [
      {
        id: 801,
        applicationNumber: "RENT-2026-012",
        spaceId: 1,
        spaceCode: "KIOT-B2-01",
        spaceName: "Quầy In ấn, Photocopy & Văn phòng phẩm Sảnh B2",
        applicantName: "CLB Khởi nghiệp Sinh viên — Nguyễn Minh Anh",
        applicantEmail: "student@demo.vn",
        startDate: "2026-11-01",
        endDate: "2027-05-31",
        businessName: "Trạm In Nhanh & Đồ Dùng Học Tập SVStation",
        note: "Phục vụ in giáo trình giá ưu đãi cho sinh viên KTX Khu B từ 07:00 – 21:00.",
        status: "approved",
        decisionNote: "Hồ sơ hợp lệ, mô hình thiết thực cho sinh viên nội trú.",
        contractNumber: "HD-THUE-2026-005",
      },
    ],
    rentalContracts: [
      {
        id: 401,
        contractNumber: "HD-THUE-2026-005",
        spaceCode: "KIOT-B2-01",
        spaceName: "Quầy In ấn, Photocopy & Văn phòng phẩm Sảnh B2",
        tenantName: "Trạm In Nhanh & Đồ Dùng Học Tập SVStation",
        startDate: "2026-11-01",
        endDate: "2027-05-31",
        monthlyPrice: 3500000,
        status: "active",
      },
    ],
  };
}

function readMockOpsStore(): MockOpsStore {
  if (typeof window === "undefined") return createDefaultOpsStore();
  try {
    const raw = window.localStorage.getItem(OPS_STORAGE_KEY);
    if (!raw) {
      const initial = createDefaultOpsStore();
      window.localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<MockOpsStore>;
    const defaults = createDefaultOpsStore();
    return {
      buildings: parsed.buildings?.length ? parsed.buildings : defaults.buildings,
      floors: parsed.floors?.length ? parsed.floors : defaults.floors,
      rooms: parsed.rooms?.length ? parsed.rooms : defaults.rooms,
      beds: parsed.beds?.length ? parsed.beds : defaults.beds,
      allocations: parsed.allocations?.length ? parsed.allocations : defaults.allocations,
      history: parsed.history?.length ? parsed.history : defaults.history,
      serviceRequests: parsed.serviceRequests?.length
        ? parsed.serviceRequests
        : defaults.serviceRequests,
      rentalSpaces: parsed.rentalSpaces?.length
        ? parsed.rentalSpaces
        : defaults.rentalSpaces,
      rentalApplications: parsed.rentalApplications?.length
        ? parsed.rentalApplications
        : defaults.rentalApplications,
      rentalContracts: parsed.rentalContracts?.length
        ? parsed.rentalContracts
        : defaults.rentalContracts,
    };
  } catch {
    return createDefaultOpsStore();
  }
}

function writeMockOpsStore(store: MockOpsStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

function classifyRepairTicketLocally(title: string, description: string) {
  const text = `${title} ${description}`.toLocaleLowerCase("vi");
  if (
    text.includes("tia lửa") ||
    text.includes("chập điện") ||
    text.includes("mùi khét") ||
    text.includes("rò điện") ||
    text.includes("vỡ ống nước")
  ) {
    return {
      category: "electrical_safety_urgent",
      confidence: 0.95,
      recommendedPriority: "urgent",
      reason:
        "Phát hiện dấu hiệu mất an toàn điện/nước khẩn cấp (tia lửa, chập điện, rò rỉ mạnh).",
      modelKey: "local-repair-keyword-v1",
    };
  }
  if (
    text.includes("đèn") ||
    text.includes("ổ cắm") ||
    text.includes("công tắc") ||
    text.includes("quạt") ||
    text.includes("điện")
  ) {
    return {
      category: "electrical",
      confidence: 0.88,
      recommendedPriority: "high",
      reason: "Khớp nhóm thiết bị điện & chiếu sáng trong phòng ở.",
      modelKey: "local-repair-keyword-v1",
    };
  }
  if (
    text.includes("nước") ||
    text.includes("vòi") ||
    text.includes("bồn cầu") ||
    text.includes("rỉ") ||
    text.includes("nghẹt")
  ) {
    return {
      category: "plumbing",
      confidence: 0.86,
      recommendedPriority: "high",
      reason: "Khớp nhóm cấp thoát nước & thiết bị vệ sinh phòng KTX.",
      modelKey: "local-repair-keyword-v1",
    };
  }
  return {
    category: "general_facility",
    confidence: 0.78,
    recommendedPriority: "normal",
    reason: "Phân loại vào nhóm cơ sở vật chất & hỗ trợ sinh hoạt chung.",
    modelKey: "local-repair-keyword-v1",
  };
}

export async function getResidenceInventory() {
  if (USE_MOCK) {
    const store = readMockOpsStore();
    return {
      buildings: store.buildings,
      floors: store.floors,
      rooms: store.rooms,
      beds: store.beds,
    };
  }
  return apiRequest<{
    buildings: ResidenceBuilding[];
    floors: ResidenceFloor[];
    rooms: ResidenceRoom[];
    beds: ResidenceBed[];
  }>("/admin/residence/inventory");
}

type InventoryResource = "buildings" | "floors" | "rooms" | "beds";
export async function saveInventoryResource(
  resource: InventoryResource,
  input: Record<string, unknown>,
  id?: number,
) {
  if (!USE_MOCK) {
    const path = `/admin/residence/${resource}${id ? `/${id}` : ""}`;
    return apiRequest<{ id: number }>(path, {
      method: id ? "PUT" : "POST",
      body: input,
    });
  }
  return { id: id ?? Date.now() };
}

export async function deleteInventoryResource(
  resource: InventoryResource,
  id: number,
) {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>(`/admin/residence/${resource}/${id}`, {
      method: "DELETE",
    });
  }
  return { id };
}

export async function getBedAllocations() {
  if (USE_MOCK) return readMockOpsStore().allocations;
  return apiRequest<BedAllocation[]>("/admin/residence/allocations");
}

export async function getAvailableBeds() {
  if (USE_MOCK) {
    return readMockOpsStore()
      .beds.filter((b) => b.status === "available")
      .map((b) => ({
        id: b.id,
        bedNumber: b.bedNumber,
        roomNumber: b.roomNumber,
        buildingCode: b.buildingCode,
        floorNumber: b.floorNumber,
      }));
  }
  return apiRequest<
    Array<{
      id: number;
      bedNumber: string;
      roomNumber: string;
      buildingCode: string;
      floorNumber: number;
    }>
  >("/admin/residence/available-beds");
}

export async function assignResidenceBed(
  contractId: number,
  bedId: number,
  note = "",
) {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>("/admin/residence/allocations", {
      method: "POST",
      body: { contractId, bedId, note },
    });
  }
  return { id: Date.now() };
}

export async function transferResidenceBed(
  allocationId: number,
  bedId: number,
  effectiveDate: string,
  note = "",
) {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>(
      `/admin/residence/allocations/${allocationId}/transfer`,
      {
        method: "POST",
        body: { bedId, effectiveDate, note },
      },
    );
  }
  return { id: allocationId };
}

export async function getAccommodationHistory(): Promise<
  AccommodationHistoryItem[]
> {
  if (USE_MOCK) return readMockOpsStore().history;
  return apiRequest<AccommodationHistoryItem[]>(
    "/residence/accommodation/history",
  );
}

export async function getServiceRequests(): Promise<ServiceRequest[]> {
  if (USE_MOCK) return readMockOpsStore().serviceRequests;
  return apiRequest<ServiceRequest[]>("/residence/service-requests");
}

export async function createServiceRequest(input: {
  requestType: ServiceRequest["requestType"];
  title: string;
  description: string;
  roomId?: number;
  priority?: string;
}) {
  if (!USE_MOCK) {
    return apiRequest<{
      id: number;
      classification: {
        category: string;
        confidence: number;
        recommendedPriority: string;
        reason: string;
        modelKey: string;
      } | null;
    }>("/residence/service-requests", { method: "POST", body: input });
  }
  const store = readMockOpsStore();
  const id = Date.now();
  const classification =
    input.requestType === "repair"
      ? classifyRepairTicketLocally(input.title, input.description)
      : null;

  const newTicket: ServiceRequest = {
    id,
    userId: 2,
    requestType: input.requestType,
    title: input.title.trim(),
    description: input.description.trim(),
    roomId: input.roomId ?? 304,
    roomNumber: "304",
    status: "submitted",
    priority: input.priority ?? classification?.recommendedPriority ?? "normal",
    assignedTo: null,
    assignedName: null,
    staffNote: null,
    requesterName: "Nguyễn Minh Anh",
    requesterEmail: "student@demo.vn",
    aiCategory: classification?.category ?? null,
    aiConfidence: classification?.confidence ?? null,
    aiRecommendedPriority: classification?.recommendedPriority ?? null,
    aiReason: classification?.reason ?? null,
    aiModelKey: classification?.modelKey ?? null,
  };
  store.serviceRequests = [newTicket, ...store.serviceRequests];
  writeMockOpsStore(store);
  return { id, classification };
}

export async function askDormRulesAssistant(
  question: string,
): Promise<DormRulesAnswer> {
  if (!USE_MOCK) {
    return apiRequest<DormRulesAnswer>("/residence/assistant/rules", {
      method: "POST",
      body: { question },
    });
  }
  const q = question.trim().toLocaleLowerCase("vi");
  const rules = readMockFinanceStore().notices.filter(
    (n) => n.type === "rule" && n.status === "published",
  );
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/[.,?!;:()]/g, ""))
    .filter((t) => t.length >= 2);

  const scored = rules
    .map((rule) => {
      const hay = `${rule.title} ${rule.body}`.toLocaleLowerCase("vi");
      const hits = tokens.filter((tok) => hay.includes(tok)).length;
      return { rule, hits };
    })
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  if (scored.length === 0) {
    return {
      answer:
        "Hiện chưa tìm thấy điều khoản nội quy khớp trực tiếp với câu hỏi này. Bạn có thể thử hỏi về: giờ đóng/mở cổng (05:00 – 23:00), giờ yên tĩnh (22:30 – 05:30), thiết bị điện được phép dùng, hoặc quy định tiếp khách tại sảnh.",
      sources: rules.slice(0, 2).map((r) => ({ id: r.id, title: r.title })),
      modelKey: "local-rules-keyword-v1",
    };
  }

  const best = scored.slice(0, 2).map((s) => s.rule);
  return {
    answer: best.map((r) => `• ${r.title}: ${r.body}`).join("\n\n"),
    sources: best.map((r) => ({ id: r.id, title: r.title })),
    modelKey: "local-rules-keyword-v1",
  };
}

export async function getResidenceOperationsDashboard(): Promise<ResidenceOperationsDashboard> {
  if (USE_MOCK) {
    const store = readMockOpsStore();
    const fin = readMockFinanceStore();
    return {
      activeBuildings: store.buildings.length,
      activeRooms: store.rooms.length,
      totalBeds: store.beds.length,
      occupiedBeds: store.beds.filter((b) => b.status === "occupied").length,
      openServiceRequests: store.serviceRequests.filter(
        (r) => r.status !== "resolved" && r.status !== "closed",
      ).length,
      pendingResidenceApplications: 1,
      outstandingInvoices: fin.invoices.filter((i) => i.outstandingAmount > 0)
        .length,
      pendingPaymentReviews: fin.payments.filter((p) => p.status === "pending")
        .length,
    };
  }
  return apiRequest<ResidenceOperationsDashboard>(
    "/admin/residence/dashboard",
  );
}

export async function updateServiceRequest(
  id: number,
  input: {
    assignedTo?: number;
    status?: ServiceRequest["status"];
    staffNote?: string;
  },
) {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>(`/admin/residence/service-requests/${id}`, {
      method: "PUT",
      body: input,
    });
  }
  const store = readMockOpsStore();
  store.serviceRequests = store.serviceRequests.map((req) =>
    req.id === id
      ? {
          ...req,
          status: input.status ?? req.status,
          staffNote: input.staffNote ?? req.staffNote,
        }
      : req,
  );
  writeMockOpsStore(store);
  return { id };
}

export async function getRentalSpaces(): Promise<RentalSpace[]> {
  if (USE_MOCK) return readMockOpsStore().rentalSpaces;
  return apiRequest<RentalSpace[]>("/rental/spaces");
}

export async function saveRentalSpace(
  input: Omit<RentalSpace, "id">,
  id?: number,
) {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>(
      `/admin/rental/spaces${id ? `/${id}` : ""}`,
      {
        method: id ? "PUT" : "POST",
        body: input,
      },
    );
  }
  const store = readMockOpsStore();
  const nextId = id ?? Date.now();
  const record: RentalSpace = { ...input, id: nextId };
  store.rentalSpaces = id
    ? store.rentalSpaces.map((s) => (s.id === id ? record : s))
    : [record, ...store.rentalSpaces];
  writeMockOpsStore(store);
  return { id: nextId };
}

export async function deleteRentalSpace(id: number) {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>(`/admin/rental/spaces/${id}`, {
      method: "DELETE",
    });
  }
  const store = readMockOpsStore();
  store.rentalSpaces = store.rentalSpaces.filter((s) => s.id !== id);
  writeMockOpsStore(store);
  return { id };
}

export async function getRentalApplications(): Promise<RentalApplication[]> {
  if (USE_MOCK) return readMockOpsStore().rentalApplications;
  return apiRequest<RentalApplication[]>("/rental/applications");
}

export async function submitRentalApplication(input: {
  spaceId: number;
  startDate: string;
  endDate: string;
  businessName: string;
  note?: string;
}) {
  if (!USE_MOCK) {
    return apiRequest<{ id: number }>("/rental/applications", {
      method: "POST",
      body: input,
    });
  }
  const store = readMockOpsStore();
  const space = store.rentalSpaces.find((s) => s.id === input.spaceId);
  if (!space) {
    throw new Error("Vui lòng chọn một mặt bằng hợp lệ.");
  }
  const id = Date.now();
  const app: RentalApplication = {
    id,
    applicationNumber: `RENT-2026-${String(id).slice(-4)}`,
    spaceId: space.id,
    spaceCode: space.spaceCode,
    spaceName: space.name,
    applicantName: "Nguyễn Minh Anh",
    applicantEmail: "student@demo.vn",
    startDate: input.startDate,
    endDate: input.endDate,
    businessName: input.businessName.trim(),
    note: input.note?.trim() || null,
    status: "submitted",
    decisionNote: null,
    contractNumber: null,
  };
  store.rentalApplications = [app, ...store.rentalApplications];
  writeMockOpsStore(store);
  return { id };
}

export async function getRentalApplicationsForReview(): Promise<
  RentalApplication[]
> {
  if (USE_MOCK) return readMockOpsStore().rentalApplications;
  return apiRequest<RentalApplication[]>("/admin/rental/applications");
}

export async function reviewRentalApplication(
  id: number,
  decision: "under_review" | "approve" | "reject",
  note: string,
): Promise<RentalApplication> {
  if (!USE_MOCK) {
    return apiRequest<RentalApplication>(
      `/admin/rental/applications/${id}/review`,
      {
        method: "POST",
        body: { decision, note },
      },
    );
  }
  const store = readMockOpsStore();
  const statusMap = {
    under_review: "under_review",
    approve: "approved",
    reject: "rejected",
  } as const;
  let updated: RentalApplication | undefined;
  store.rentalApplications = store.rentalApplications.map((a) => {
    if (a.id !== id) return a;
    updated = {
      ...a,
      status: statusMap[decision],
      decisionNote: note || null,
      contractNumber:
        decision === "approve"
          ? a.contractNumber ?? `HD-THUE-${String(Date.now()).slice(-4)}`
          : a.contractNumber,
    };
    return updated;
  });
  writeMockOpsStore(store);
  if (!updated) throw new Error("Không tìm thấy hồ sơ thuê mặt bằng.");
  return updated;
}

export async function getRentalContracts(): Promise<RentalContract[]> {
  if (USE_MOCK) return readMockOpsStore().rentalContracts;
  return apiRequest<RentalContract[]>("/rental/contracts");
}
