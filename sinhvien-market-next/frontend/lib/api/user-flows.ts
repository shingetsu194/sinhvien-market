import { USE_MOCK } from "@/lib/config";
import {
  getMarketplaceProducts,
  type MarketplaceProduct,
} from "@/lib/api/marketplace";
import { getAdminProducts, getAdminTransactions } from "@/lib/api/admin";
import type {
  AdminTransaction,
  ProductStatus,
  ProductType,
} from "@/lib/types/admin";
import { ApiError, type AuthUser } from "@/lib/api/types";
import { apiRequest } from "./client";

export interface UserListingInput {
  title: string;
  description: string;
  categoryId: number;
  type: ProductType;
  condition: "new" | "like_new" | "used";
  price: number | null;
  startPrice?: number;
  floorPrice?: number;
  decreaseAmount?: number;
  stepMinutes?: number;
  image?: File;
}

export interface UserListing extends MarketplaceProduct {
  description: string;
  rejectionReason: string | null;
}

export interface UserTransaction
  extends Omit<AdminTransaction, "orderStatus" | "paymentMethod"> {
  role: "buyer" | "seller";
  shippingAddress: string;
  orderStatus: UserTransactionStatus;
  paymentMethod: "cod" | "banking" | "zalopay" | "momo";
  paymentStatus?: "pending" | "paid" | "refunded";
  hasPaymentProof?: boolean;
  updatedAt?: string;
}

export interface TransactionPaymentInfo {
  id: number;
  amount: number;
  paymentMethod: UserTransaction["paymentMethod"];
  paymentStatus: "pending" | "paid" | "refunded";
  orderStatus: UserTransactionStatus;
  hasPaymentProof: boolean;
  bankAccount: {
    bankName: string;
    bankCode: string;
    accountNo: string;
    accountName: string;
    qrUrl: string;
  } | null;
}

export type UserTransactionStatus =
  | "pending"
  | "shipping"
  | "delivered"
  | "received"
  | "completed"
  | "cancelled";

export interface ConversationSummary {
  id: number;
  ownerId?: number;
  /** Viewer's side of the conversation (real API only). */
  myRole?: "buyer" | "seller";
  productId: number;
  productTitle: string;
  otherUserId: number;
  otherUserName: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  body: string;
  type: "text" | "offer";
  offerPrice: number | null;
  offerStatus: "pending" | "accepted" | "rejected" | null;
  createdAt: string;
  isMine: boolean;
}

export interface UserNotification {
  id: number;
  ownerId?: number;
  title: string;
  body: string;
  type: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface RewardsSummary {
  balance: number;
  checkinStreak: number;
  checkedInToday: boolean;
  nextCheckinReward: number;
}

export interface UserWishlistItem extends MarketplaceProduct {
  savedAt: string;
}

interface MockFlowStore {
  listings: UserListing[];
  conversations: ConversationSummary[];
  messages: ChatMessage[];
  notifications: UserNotification[];
  rewards: Record<number, RewardsSummary>;
  wishlist: Record<number, number[]>;
  transactionStatuses: Record<number, UserTransactionStatus>;
  transactions: UserTransaction[];
  listingStatuses: Record<number, ProductStatus>;
}

const STORAGE_KEY = "svm_mock_user_flows_v2";

function readStore(): MockFlowStore {
  if (typeof localStorage === "undefined") {
    throw new ApiError("UNKNOWN", "Trình duyệt chưa sẵn sàng.", {
      status: 500,
    });
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<MockFlowStore>) : {};
    return {
      listings: stored.listings ?? [],
      conversations:
        stored.conversations ??
        [
          {
            id: 501,
            ownerId: 1,
            productId: 106,
            productTitle: "Bàn học gấp gọn gỗ thông đặt giường tầng KTX",
            otherUserId: 6,
            otherUserName: "Đỗ Khánh Linh",
            lastMessage: "Tối nay 19h bạn ghé sảnh Tòa B2 lấy bàn học nha!",
            updatedAt: "2026-11-12T18:30:00+07:00",
            unreadCount: 1,
          },
          {
            id: 502,
            ownerId: 1,
            productId: 107,
            productTitle: "Đàn Guitar Acoustic Rosen G11 kèm bao da 3 lớp",
            otherUserId: 7,
            otherUserName: "Võ Tuấn Kiệt",
            lastMessage: "Đàn còn nguyên bao da 3 lớp và capo bạn nhé.",
            updatedAt: "2026-11-11T20:15:00+07:00",
            unreadCount: 0,
          },
        ],
      messages:
        stored.messages ??
        [
          {
            id: 601,
            conversationId: 501,
            senderId: 1,
            senderName: "Nguyễn Minh Anh",
            body: "Chào Linh, bàn học gấp gọn gỗ thông còn không bạn? Mình ở Tòa B2 muốn lấy luôn.",
            type: "text",
            offerPrice: null,
            offerStatus: null,
            createdAt: "2026-11-12T18:20:00+07:00",
            isMine: true,
          },
          {
            id: 602,
            conversationId: 501,
            senderId: 6,
            senderName: "Đỗ Khánh Linh",
            body: "Tối nay 19h bạn ghé sảnh Tòa B2 xem xe thử nha!",
            type: "text",
            offerPrice: null,
            offerStatus: null,
            createdAt: "2026-11-12T18:30:00+07:00",
            isMine: false,
          },
          {
            id: 603,
            conversationId: 502,
            senderId: 7,
            senderName: "Võ Tuấn Kiệt",
            body: "Đàn còn nguyên bao da 3 lớp và capo bạn nhé.",
            type: "text",
            offerPrice: null,
            offerStatus: null,
            createdAt: "2026-11-11T20:15:00+07:00",
            isMine: false,
          },
        ],
      notifications:
        stored.notifications ??
        [
          {
            id: 1,
            ownerId: 1,
            title: "Chào mừng đến SinhVienMarket",
            body: "Hoàn thiện hồ sơ sinh viên để người mua an tâm giao dịch.",
            type: "welcome",
            href: "/profile",
            isRead: false,
            createdAt: "2026-10-28T08:00:00+07:00",
          },
          {
            id: 2,
            ownerId: 1,
            title: "Tin đăng đang chờ duyệt",
            body: "Bạn có thể theo dõi trạng thái các tin đăng trong trang quản lý.",
            type: "product",
            href: "/my-listings",
            isRead: false,
            createdAt: "2026-10-28T08:05:00+07:00",
          },
        ],
      rewards: stored.rewards ?? {},
      wishlist: stored.wishlist ?? {},
      transactionStatuses: stored.transactionStatuses ?? {},
      transactions: stored.transactions ?? [],
      listingStatuses: stored.listingStatuses ?? {},
    };
  } catch {
    throw new ApiError("UNKNOWN", "Không đọc được dữ liệu xem thử.", {
      status: 500,
    });
  }
}

function writeStore(store: MockFlowStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    throw new ApiError("UNKNOWN", "Không đủ dung lượng để lưu dữ liệu.", {
      status: 507,
    });
  }
}

function requireMock(): void {
  if (!USE_MOCK) {
    throw new ApiError(
      "NOT_IMPLEMENTED",
      "API luồng người dùng chưa được tích hợp với PHP.",
      { status: 501 },
    );
  }
}

function requireUser(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new ApiError("NOT_AUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.", {
      status: 401,
    });
  }
  return user;
}

export async function getMyListings(user: AuthUser): Promise<UserListing[]> {
  if (!USE_MOCK) {
    return apiRequest<UserListing[]>("/user/products");
  }
  const [products, stored] = await Promise.all([
    getAdminProducts("all"),
    Promise.resolve(readStore()),
  ]);
  const seeded = products
    .filter((product) => product.sellerId === user.id)
    .map(
      (product): UserListing => ({
        ...product,
        status: stored.listingStatuses[product.id] ?? product.status,
        imageUrl: null,
        sellerVerified: true,
        currentPrice: null,
        isAtFloor: null,
        description: "",
        rejectionReason: product.rejectionReason ?? null,
      }),
    );
  const ownStored = stored.listings.filter((item) => item.sellerId === user.id);
  return [...ownStored, ...seeded].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export async function createListing(
  user: AuthUser,
  input: UserListingInput,
): Promise<UserListing> {
  requireUser(user);
  if (!USE_MOCK) {
    const body = new FormData();
    body.append("title", input.title);
    body.append("description", input.description);
    body.append("category_id", String(input.categoryId));
    body.append("type", input.type);
    body.append("condition", input.condition);
    if (input.price !== null) body.append("price", String(input.price));
    if (input.startPrice !== undefined) {
      body.append("start_price", String(input.startPrice));
    }
    if (input.floorPrice !== undefined) {
      body.append("floor_price", String(input.floorPrice));
    }
    if (input.decreaseAmount !== undefined) {
      body.append("decrease_amount", String(input.decreaseAmount));
    }
    if (input.stepMinutes !== undefined) {
      body.append("step_minutes", String(input.stepMinutes));
    }
    if (input.image) body.append("image", input.image);
    return apiRequest<UserListing>("/user/products", {
      method: "POST",
      body,
    });
  }
  requireMock();
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 5 || description.length < 10 || input.categoryId < 1) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Kiểm tra tiêu đề, mô tả và danh mục sản phẩm.",
      { status: 422 },
    );
  }
  if (input.type !== "exchange" && (!input.price || input.price < 1000)) {
    throw new ApiError("VALIDATION_ERROR", "Giá bán không hợp lệ.", {
      status: 422,
    });
  }
  const categories = await (
    await import("@/lib/api/admin")
  ).getAdminCategories();
  const category = categories.find((item) => item.id === input.categoryId);
  if (!category) {
    throw new ApiError("VALIDATION_ERROR", "Danh mục không tồn tại.", {
      status: 422,
    });
  }
  const listing: UserListing = {
    id: Date.now(),
    title,
    categoryId: category.id,
    categoryName: category.name,
    sellerId: user.id,
    sellerName: user.name,
    type: input.type,
    price: input.type === "auction" ? input.startPrice ?? input.price : input.price,
    condition: input.condition,
    status: "pending",
    hasTransactions: false,
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    imageUrl: input.image ? await compressListingImage(input.image) : null,
    sellerVerified: user.role === "student",
    currentPrice: null,
    isAtFloor: null,
    description,
  };
  const store = readStore();
  store.listings.unshift(listing);
  writeStore(store);
  return listing;
}

async function compressListingImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ApiError("VALIDATION_ERROR", "Tệp tải lên phải là ảnh.", {
      status: 422,
    });
  }
  const image = new Image();
  const source = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không đọc được ảnh sản phẩm."));
      image.src = source;
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export async function deleteListing(
  user: AuthUser,
  productId: number,
): Promise<void> {
  requireUser(user);
  if (!USE_MOCK) {
    await apiRequest<{ message: string }>(
      `/user/products?id=${encodeURIComponent(productId)}`,
      { method: "DELETE" },
    );
    return;
  }
  requireMock();
  const store = readStore();
  const own = store.listings.find(
    (item) => item.id === productId && item.sellerId === user.id,
  );
  const seeded = own ?? (await getMyListings(user)).find(
    (item) => item.id === productId && item.sellerId === user.id,
  );
  if (seeded) {
    if (seeded.hasTransactions || seeded.status === "sold") {
      throw new ApiError("VALIDATION_ERROR", "Tin đã có giao dịch không thể gỡ.", {
        status: 422,
      });
    }
    if (own) own.status = "cancelled";
    else store.listingStatuses[productId] = "cancelled";
    writeStore(store);
    return;
  }
  throw new ApiError("NOT_FOUND", "Không tìm thấy tin đăng của bạn.", {
    status: 404,
  });
}

export async function getMyTransactions(
  user: AuthUser,
): Promise<UserTransaction[]> {
  if (!USE_MOCK) {
    return apiRequest<UserTransaction[]>("/user/transactions");
  }
  const transactions = await getAdminTransactions();
  const store = readStore();
  const statuses = store.transactionStatuses;
  const seeded = transactions
    .filter(
      (transaction) =>
        transaction.buyerId === user.id || transaction.sellerId === user.id,
    )
    .map((transaction): UserTransaction => ({
      ...transaction,
      orderStatus: statuses[transaction.id] ?? transaction.orderStatus,
      role: transaction.buyerId === user.id ? "buyer" : "seller",
      paymentMethod: transaction.paymentMethod,
      shippingAddress: "",
    }));
  return [...store.transactions.filter((item) => item.buyerId === user.id || item.sellerId === user.id), ...seeded]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getTransactionPaymentInfo(
  user: AuthUser,
  transactionId: number,
): Promise<TransactionPaymentInfo> {
  requireUser(user);
  if (!USE_MOCK) {
    return apiRequest<TransactionPaymentInfo>(
      `/user/transactions/payment?id=${transactionId}`,
    );
  }
  const transaction = (await getMyTransactions(user)).find(
    (item) => item.id === transactionId && item.role === "buyer",
  );
  if (!transaction) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy giao dịch cần thanh toán.", {
      status: 404,
    });
  }
  return {
    id: transaction.id,
    amount: transaction.amount,
    paymentMethod: transaction.paymentMethod,
    paymentStatus: transaction.paymentStatus ?? "pending",
    orderStatus: transaction.orderStatus,
    hasPaymentProof: transaction.hasPaymentProof ?? false,
    bankAccount: null,
  };
}

export async function startTransactionPayment(
  user: AuthUser,
  transactionId: number,
): Promise<string> {
  requireUser(user);
  if (!USE_MOCK) {
    const result = await apiRequest<{ redirectUrl: string }>(
      "/user/transactions/payment/start",
      { method: "POST", body: { id: transactionId } },
    );
    return result.redirectUrl;
  }
  throw new ApiError(
    "NOT_IMPLEMENTED",
    "Thanh toán trực tuyến chỉ hoạt động khi đã kết nối backend PHP.",
    { status: 501 },
  );
}

export async function uploadTransactionPaymentProof(
  user: AuthUser,
  transactionId: number,
  proof: File,
): Promise<void> {
  requireUser(user);
  if (!USE_MOCK) {
    const body = new FormData();
    body.set("id", String(transactionId));
    body.set("proof", proof);
    await apiRequest<{ hasPaymentProof: boolean }>(
      "/user/transactions/payment/proof",
      { method: "POST", body },
    );
    return;
  }
  throw new ApiError(
    "NOT_IMPLEMENTED",
    "Tải biên lai cần backend PHP đã kết nối.",
    { status: 501 },
  );
}

export async function confirmTransactionBankPayment(
  user: AuthUser,
  transactionId: number,
): Promise<void> {
  requireUser(user);
  if (!USE_MOCK) {
    await apiRequest<{ message: string }>(
      "/user/transactions/payment/confirm",
      { method: "POST", body: { id: transactionId } },
    );
    return;
  }
  throw new ApiError(
    "NOT_IMPLEMENTED",
    "Xác nhận chuyển khoản cần backend PHP đã kết nối.",
    { status: 501 },
  );
}

export async function updateTransactionStatus(
  user: AuthUser,
  transactionId: number,
  status: UserTransactionStatus,
): Promise<void> {
  requireUser(user);
  if (!USE_MOCK) {
    await apiRequest<{ message: string }>("/user/transactions/status", {
      method: "POST",
      body: { id: transactionId, status },
    });
    return;
  }
  requireMock();
  const store = readStore();
  const transactions = await getAdminTransactions();
  const transaction =
    store.transactions.find((item) => item.id === transactionId) ??
    transactions.find((item) => item.id === transactionId);
  if (
    !transaction ||
    (transaction.buyerId !== user.id && transaction.sellerId !== user.id)
  ) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy giao dịch.", {
      status: 404,
    });
  }
  const currentStatus =
    store.transactionStatuses[transactionId] ?? transaction.orderStatus;
  const isSeller = transaction.sellerId === user.id;
  const validTransition =
    (status === "shipping" && currentStatus === "pending" && isSeller) ||
    (status === "delivered" && currentStatus === "shipping" && isSeller) ||
    (status === "completed" &&
      ["shipping", "delivered"].includes(currentStatus) &&
      !isSeller) ||
    (status === "cancelled" &&
      ["pending", "shipping"].includes(currentStatus) &&
      isSeller);
  if (!validTransition) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Trạng thái giao dịch không thể chuyển theo bước này.",
      { status: 422 },
    );
  }
  store.transactionStatuses[transactionId] = status;
  writeStore(store);
}

export async function checkoutProduct(
  user: AuthUser,
  input: {
    productId: number;
    type: "sale" | "auction";
    paymentMethod: "cod" | "banking" | "zalopay" | "momo";
    shippingAddress: string;
  },
): Promise<UserTransaction> {
  requireUser(user);
  if (!USE_MOCK) {
    return apiRequest<UserTransaction>("/user/transactions/checkout", {
      method: "POST",
      body: input,
    });
  }
  requireMock();
  const products = await getMarketplaceProducts();
  const product = products.find((item) => item.id === input.productId);
  if (!product || product.status !== "active") {
    throw new ApiError("NOT_FOUND", "Sản phẩm không còn hoạt động.", {
      status: 404,
    });
  }
  if (product.sellerId === user.id) {
    throw new ApiError("VALIDATION_ERROR", "Bạn không thể mua sản phẩm của mình.", {
      status: 422,
    });
  }
  if (product.type === "exchange") {
    throw new ApiError(
      "NOT_IMPLEMENTED",
      "Chưa thể tạo đơn trao đổi; hãy thỏa thuận qua tin nhắn.",
      { status: 501 },
    );
  }
  if (input.type !== product.type) {
    throw new ApiError("VALIDATION_ERROR", "Loại giao dịch không khớp sản phẩm.", {
      status: 422,
    });
  }
  if (input.shippingAddress.trim().length < 8) {
    throw new ApiError("VALIDATION_ERROR", "Vui lòng nhập địa chỉ giao hàng.", {
      status: 422,
    });
  }
  const transaction: UserTransaction = {
    id: Date.now(),
    productId: product.id,
    productTitle: product.title,
    buyerId: user.id,
    buyerName: user.name,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    type: product.type,
    amount:
      product.type === "auction"
        ? (product.currentPrice ?? product.price ?? 0)
        : (product.price ?? 0),
    paymentMethod: input.paymentMethod,
    orderStatus: "pending",
    createdAt: new Date().toISOString(),
    role: "buyer",
    shippingAddress: input.shippingAddress.trim(),
  };
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) {
    throw new ApiError("VALIDATION_ERROR", "Sản phẩm chưa có giá giao dịch hợp lệ.", {
      status: 422,
    });
  }
  const store = readStore();
  store.transactions.unshift(transaction);
  writeStore(store);
  return transaction;
}

export async function getConversations(
  user: AuthUser,
): Promise<ConversationSummary[]> {
  if (!USE_MOCK) {
    return apiRequest<ConversationSummary[]>("/user/conversations");
  }
  return readStore()
    .conversations.filter(
      (conversation) => !conversation.ownerId || conversation.ownerId === user.id,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function startConversation(
  user: AuthUser,
  product: MarketplaceProduct,
): Promise<ConversationSummary> {
  requireUser(user);
  if (!USE_MOCK) {
    return apiRequest<ConversationSummary>("/user/conversations", {
      method: "POST",
      body: { productId: product.id },
    });
  }
  requireMock();
  if (product.sellerId === user.id) {
    throw new ApiError("VALIDATION_ERROR", "Bạn không thể nhắn tin cho chính mình.", {
      status: 422,
    });
  }
  const store = readStore();
  let conversation = store.conversations.find(
    (item) =>
      item.ownerId === user.id &&
      item.productId === product.id &&
      item.otherUserId === product.sellerId,
  );
  if (!conversation) {
    conversation = {
      id: Date.now(),
      ownerId: user.id,
      productId: product.id,
      productTitle: product.title,
      otherUserId: product.sellerId,
      otherUserName: product.sellerName,
      lastMessage: "Cuộc trò chuyện mới",
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
    };
    store.conversations.unshift(conversation);
    writeStore(store);
  }
  return conversation;
}

export async function getConversationMessages(
  conversationId: number,
): Promise<ChatMessage[]> {
  if (!USE_MOCK) {
    const response = await apiRequest<{
      messages: Array<{
        id: number;
        body: string;
        sender?: string;
        sender_id?: number;
        time: string;
        type?: string;
        offer_price?: number | null;
        offer_status?: "pending" | "accepted" | "rejected" | null;
        is_me: boolean;
      }>;
    }>(
      `/chat/poll?conv_id=${encodeURIComponent(conversationId)}&after_id=0`,
    );
    return response.messages.map((message) => ({
      id: message.id,
      conversationId,
      senderId: message.sender_id ?? 0,
      senderName: message.sender ?? "Thành viên",
      body: message.body,
      type: message.type === "offer" ? "offer" : "text",
      offerPrice: message.offer_price ?? null,
      offerStatus: message.offer_status ?? null,
      createdAt: message.time,
      isMine: message.is_me,
    }));
  }
  return readStore().messages.filter(
    (message) => message.conversationId === conversationId,
  );
}

export async function sendChatMessage(
  user: AuthUser,
  conversationId: number,
  body: string,
): Promise<ChatMessage> {
  requireUser(user);
  const text = body.trim();
  if (!text || text.length > 1000) {
    throw new ApiError("VALIDATION_ERROR", "Tin nhắn cần từ 1 đến 1000 ký tự.", {
      status: 422,
    });
  }
  if (!USE_MOCK) {
    const result = await apiRequest<{
      message_id: number;
      body: string;
      sender: string;
      time: string;
    }>("/chat/send", {
      method: "POST",
      body: { conversation_id: conversationId, body: text },
    });
    return {
      id: result.message_id,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      body: result.body,
      type: "text",
      offerPrice: null,
      offerStatus: null,
      createdAt: result.time,
      isMine: true,
    };
  }
  requireMock();
  const store = readStore();
  const conversation = store.conversations.find((item) => item.id === conversationId);
  if (!conversation) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy cuộc trò chuyện.", {
      status: 404,
    });
  }
  const message: ChatMessage = {
    id: Date.now(),
    conversationId,
    senderId: user.id,
    senderName: user.name,
    body: text,
    type: "text",
    offerPrice: null,
    offerStatus: null,
    createdAt: new Date().toISOString(),
    isMine: true,
  };
  store.messages.push(message);
  conversation.lastMessage = text;
  conversation.updatedAt = message.createdAt;
  writeStore(store);
  return message;
}

export async function sendChatOffer(
  user: AuthUser,
  conversationId: number,
  offerPrice: number,
): Promise<void> {
  requireUser(user);
  if (!Number.isSafeInteger(offerPrice) || offerPrice <= 0) {
    throw new ApiError("VALIDATION_ERROR", "Giá đề nghị phải lớn hơn 0.", {
      status: 422,
    });
  }
  if (!USE_MOCK) {
    await apiRequest<unknown>("/chat/offer", {
      method: "POST",
      body: { conversation_id: conversationId, offer_price: offerPrice },
    });
    return;
  }
  requireMock();
  const store = readStore();
  const conversation = store.conversations.find(
    (item) => item.id === conversationId && item.ownerId === user.id,
  );
  if (!conversation) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy cuộc trò chuyện.", {
      status: 404,
    });
  }
  const createdAt = new Date().toISOString();
  store.messages.push({
    id: Date.now(),
    conversationId,
    senderId: user.id,
    senderName: user.name,
    body: "Đề nghị giá",
    type: "offer",
    offerPrice,
    offerStatus: "pending",
    createdAt,
    isMine: true,
  });
  conversation.lastMessage = `Đề nghị giá ${new Intl.NumberFormat("vi-VN").format(offerPrice)} ₫`;
  conversation.updatedAt = createdAt;
  writeStore(store);
}

export async function respondToChatOffer(
  user: AuthUser,
  conversationId: number,
  messageId: number,
  status: "accepted" | "rejected",
): Promise<void> {
  requireUser(user);
  if (!USE_MOCK) {
    await apiRequest<unknown>("/chat/offer/respond", {
      method: "POST",
      body: { conversation_id: conversationId, message_id: messageId, status },
    });
    return;
  }
  requireMock();
  const store = readStore();
  const message = store.messages.find(
    (item) =>
      item.id === messageId &&
      item.conversationId === conversationId &&
      item.type === "offer" &&
      !item.isMine &&
      item.offerStatus === "pending",
  );
  if (!message) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy đề nghị đang chờ.", {
      status: 404,
    });
  }
  message.offerStatus = status;
  const conversation = store.conversations.find(
    (item) => item.id === conversationId,
  );
  if (conversation) {
    conversation.lastMessage =
      status === "accepted" ? "Đã chấp nhận đề nghị giá" : "Đã từ chối đề nghị giá";
    conversation.updatedAt = new Date().toISOString();
  }
  writeStore(store);
}

export async function getNotifications(
  user: AuthUser,
): Promise<UserNotification[]> {
  if (!USE_MOCK) {
    return apiRequest<UserNotification[]>("/user/notifications");
  }
  return readStore()
    .notifications.filter((notification) => !notification.ownerId || notification.ownerId === user.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  if (!USE_MOCK) {
    await apiRequest<{ message: string }>("/user/notifications/mark-read", {
      method: "POST",
      body: { id: notificationId },
    });
    return;
  }
  const store = readStore();
  const notification = store.notifications.find(
    (item) => item.id === notificationId,
  );
  if (notification) {
    notification.isRead = true;
    writeStore(store);
  }
}

export async function getRewards(user: AuthUser): Promise<RewardsSummary> {
  if (!USE_MOCK) {
    return apiRequest<RewardsSummary>("/user/rewards");
  }
  const stored = readStore().rewards[user.id];
  return (
    stored ?? {
      balance: user.id === 1 ? 150 : 0,
      checkinStreak: 3,
      checkedInToday: false,
      nextCheckinReward: 10,
    }
  );
}

export async function checkIn(user: AuthUser): Promise<RewardsSummary> {
  requireUser(user);
  if (!USE_MOCK) {
    return apiRequest<RewardsSummary>("/user/rewards/checkin", {
      method: "POST",
      body: {},
    });
  }
  requireMock();
  const store = readStore();
  const current =
    store.rewards[user.id] ??
    ({
      balance: user.id === 1 ? 150 : 0,
      checkinStreak: 3,
      checkedInToday: false,
      nextCheckinReward: 10,
    } satisfies RewardsSummary);
  if (current.checkedInToday) {
    throw new ApiError("VALIDATION_ERROR", "Bạn đã điểm danh hôm nay.", {
      status: 422,
    });
  }
  const checkinStreak = current.checkinStreak + 1;
  const reward = checkinStreak % 7 === 0 ? 50 : 10;
  const next = {
    balance: current.balance + reward,
    checkinStreak,
    checkedInToday: true,
    nextCheckinReward: checkinStreak % 6 === 0 ? 50 : 10,
  };
  store.rewards[user.id] = next;
  writeStore(store);
  return next;
}

export async function bumpListing(
  user: AuthUser,
  productId: number,
): Promise<RewardsSummary> {
  requireUser(user);
  if (!USE_MOCK) {
    return apiRequest<RewardsSummary>("/user/rewards/bump", {
      method: "POST",
      body: { productId },
    });
  }
  requireMock();
  const store = readStore();
  const current =
    store.rewards[user.id] ??
    ({
      balance: user.id === 1 ? 150 : 0,
      checkinStreak: 3,
      checkedInToday: false,
      nextCheckinReward: 10,
    } satisfies RewardsSummary);
  if (current.balance < 50) {
    throw new ApiError("VALIDATION_ERROR", "Bạn cần ít nhất 50 xu để làm mới tin.", {
      status: 422,
    });
  }
  const listings = await getMyListings(user);
  const listing = listings.find(
    (item) => item.id === productId && item.status === "active",
  );
  if (!listing) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy tin đang hoạt động.", {
      status: 404,
    });
  }
  const next = { ...current, balance: current.balance - 50 };
  store.rewards[user.id] = next;
  writeStore(store);
  return next;
}

export async function getWishlist(user: AuthUser): Promise<UserWishlistItem[]> {
  if (!USE_MOCK) {
    return apiRequest<UserWishlistItem[]>("/user/wishlist");
  }
  const ids = readStore().wishlist[user.id] ?? [];
  const products = await getMarketplaceProducts();
  return products
    .filter((product) => ids.includes(product.id))
    .map((product) => ({
      ...product,
      savedAt: new Date().toISOString(),
    }));
}

export async function toggleWishlist(
  user: AuthUser,
  productId: number,
): Promise<boolean> {
  requireUser(user);
  if (!USE_MOCK) {
    const result = await apiRequest<{ action: "added" | "removed" }>(
      "/user/wishlist/toggle",
      { method: "POST", body: { productId } },
    );
    return result.action === "added";
  }
  requireMock();
  const products = await getMarketplaceProducts();
  if (!products.some((product) => product.id === productId)) {
    throw new ApiError("NOT_FOUND", "Sản phẩm không còn hoạt động.", {
      status: 404,
    });
  }
  const store = readStore();
  const ids = store.wishlist[user.id] ?? [];
  const index = ids.indexOf(productId);
  if (index >= 0) ids.splice(index, 1);
  else ids.unshift(productId);
  store.wishlist[user.id] = ids;
  writeStore(store);
  return index < 0;
}
