import { USE_MOCK } from "@/lib/config";
import {
  getAdminBanners,
  getAdminCategories,
  getAdminGiveaways,
  getAdminProducts,
  getAdminRatings,
  getAdminUsers,
  getDashboardStats,
} from "./admin";
import { getCurrentUser } from "./auth";
import { apiRequest } from "./client";
import type {
  AdminBanner,
  AdminCategory,
  AdminGiveaway,
  AdminProduct,
  DashboardStats,
} from "@/lib/types/admin";

export type MarketplaceProduct = Omit<AdminProduct, "sellerEmail"> & {
  imageUrl: string | null;
  sellerVerified: boolean;
  currentPrice: number | null;
  isAtFloor: boolean | null;
  aiMatchScore?: number;
  aiMatchReasons?: string[];
};

export type MarketplaceBanner = Omit<AdminBanner, "imageUrl"> & {
  imageUrl: string | null;
};

export type MarketplaceGiveaway = Omit<AdminGiveaway, "participants"> & {
  participantCount: number;
  joinedByCurrentUser: boolean;
};

export interface MarketplaceHomeData {
  banners: MarketplaceBanner[];
  categories: AdminCategory[];
  featuredProducts: MarketplaceProduct[];
  auctionProducts: MarketplaceProduct[];
  giveaway: MarketplaceGiveaway | null;
  stats: Pick<DashboardStats, "activeProducts" | "totalUsers" | "txToday">;
}

export interface LeaderboardSeller {
  id: number;
  name: string;
  avatarUrl: string | null;
  isStudentVerified: boolean;
  productCount: number;
  soldCount: number;
  avgRating: number;
  ratingCount: number;
  score: number;
}

export interface LeaderboardData {
  topSellers: LeaderboardSeller[];
  myRank: number;
  myStats: LeaderboardSeller | null;
}

export interface MarketplaceProductFilters {
  keyword?: string;
  imageHint?: string;
  categoryId?: number;
  type?: AdminProduct["type"];
  condition?: AdminProduct["condition"];
  priceMin?: number;
  priceMax?: number;
}

export interface MarketplaceProductDetail extends MarketplaceProduct {
  description: string;
}

const MOCK_PRODUCT_IMAGES: Record<number, string> = {
  102: "/demo-matching/images/mech_keyboard_ref.jpg",
  103: "/demo-matching/images/desk_lamp_white.jpg",
  104: "/demo-matching/images/calc_casio.jpg",
  107: "/demo-matching/images/guitar_acoustic_ref.jpg",
  108: "/demo-matching/images/kettle_stainless.jpg",
};

const MOCK_PRODUCT_DESCRIPTIONS: Record<number, string> = {
  101: "Giáo trình Giải tích 1 & Đại số tuyến tính trọn bộ 2 cuốn, bìa cứng giữ kỹ, không rách trang, tặng kèm tập đề cương ôn thi cuối kỳ.",
  102: "Bàn phím cơ không dây Keychron K6 Red Switch gõ êm, kết nối Bluetooth 3 thiết bị, pin dùng 2 tuần, phù hợp gõ code ban đêm trong phòng KTX.",
  103: "Đèn bàn học chống cận Xiaomi Mi LED Desk Lamp ánh sáng dịu mắt, chỉnh được nhiệt độ màu, muốn giao lưu đổi lấy giá đỡ laptop hoặc sách chuyên ngành.",
  104: "Máy tính bỏ túi Casio fx-580VN X chính hãng Bitex còn nguyên tem chống giả, màn hình rõ nét, phím bấm nhạy.",
  105: "Tai nghe chụp tai Sony WH-CH520 Bluetooth 5.2 pin lên tới 50 giờ, đệm tai êm ái học tiếng Anh online, kèm cáp sạc USB-C.",
  106: "Bàn học gấp gọn gỗ thông tự nhiên đặt vừa giường tầng KTX, chân bàn có đệm cao su chống trượt và khe cắm iPad tiện lợi.",
  107: "Đàn Guitar Acoustic Rosen G11 mặt gỗ thông nguyên tấm âm vang ấm, đã hạ action bấm êm tay cho người mới tập, tặng kèm bao da 3 lớp và capo.",
  108: "Ấm đun siêu tốc Sunhouse 1.8L ruột inox 304 tự ngắt khi sôi, công suất chuẩn quy định an toàn KTX.",
  109: "Bộ giáo trình Lập trình Hướng đối tượng C++ & Java in màu rõ đẹp, có ghi chú các dạng bài tập thực hành trọng tâm.",
};

function escapeSvgText(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeProductThumbSvg(product: AdminProduct): string {
  const palettes: Record<number, [string, string, string]> = {
    1: ["#1e40af", "#2563eb", "📚 Sách & Giáo trình"],
    2: ["#1d4ed8", "#0284c7", "🎧 Đồ điện tử"],
    3: ["#0369a1", "#0ea5e9", "🏠 Đồ gia dụng KTX"],
    4: ["#0c4a6e", "#0284c7", "👕 Thời trang SV"],
    5: ["#1e3a8a", "#3b82f6", "📐 Đồ dùng học tập"],
    6: ["#075985", "#0284c7", "🎸 Nhạc cụ & Giải trí"],
  };
  const [fromColor, toColor, badge] = palettes[product.categoryId] ?? [
    "#1e40af",
    "#2563eb",
    "🛍️ SinhVienMarket",
  ];
  const shortTitle =
    product.title.length > 36
      ? `${product.title.slice(0, 36)}…`
      : product.title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${fromColor}"/>
        <stop offset="100%" stop-color="${toColor}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#pg)"/>
    <circle cx="510" cy="80" r="110" fill="rgba(255,255,255,0.1)"/>
    <circle cx="90" cy="340" r="95" fill="rgba(255,255,255,0.08)"/>
    <text x="36" y="175" fill="rgba(255,255,255,0.85)" font-family="sans-serif" font-size="16" font-weight="700">${escapeSvgText(badge)}</text>
    <text x="36" y="215" fill="#ffffff" font-family="sans-serif" font-size="25" font-weight="800">${escapeSvgText(shortTitle)}</text>
    <text x="36" y="255" fill="rgba(255,255,255,0.8)" font-family="sans-serif" font-size="16" font-weight="600">Người bán: ${escapeSvgText(product.sellerName)} • KTX ĐHQG</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function toMarketplaceProduct(product: AdminProduct): MarketplaceProduct {
  return {
    id: product.id,
    title: product.title,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    type: product.type,
    price: product.price,
    condition: product.condition,
    status: product.status,
    hasTransactions: product.hasTransactions,
    rejectionReason: product.rejectionReason,
    createdAt: product.createdAt,
    imageUrl: MOCK_PRODUCT_IMAGES[product.id] ?? makeProductThumbSvg(product),
    sellerVerified: product.sellerId !== 3,
    currentPrice:
      product.type === "auction" && product.status === "active"
        ? product.price
        : null,
    isAtFloor: null,
  };
}

export async function getMarketplaceHome(): Promise<MarketplaceHomeData> {
  if (USE_MOCK) {
    const [banners, categories, allProducts, giveaways, stats, user] =
      await Promise.all([
        getAdminBanners(),
        getAdminCategories(),
        getAdminProducts("all"),
        getAdminGiveaways(),
        getDashboardStats(),
        getCurrentUser(),
      ]);
    const activeProducts = allProducts.filter(
      (product) => product.status === "active",
    );
    const activeGiveaway =
      giveaways.find((giveaway) => giveaway.status === "active") ??
      giveaways[0] ??
      null;

    return {
      banners: banners
        .filter((banner) => banner.isActive)
        .map((banner) => ({ ...banner })),
      categories,
      featuredProducts: activeProducts.slice(0, 6).map(toMarketplaceProduct),
      auctionProducts: activeProducts
        .filter((product) => product.type === "auction")
        .slice(0, 3)
        .map(toMarketplaceProduct),
      giveaway: activeGiveaway
        ? {
            id: activeGiveaway.id,
            title: activeGiveaway.title,
            description: activeGiveaway.description,
            imageUrl: activeGiveaway.imageUrl,
            endTime: activeGiveaway.endTime,
            status: activeGiveaway.status,
            winnerId: activeGiveaway.winnerId,
            winnerName: activeGiveaway.winnerName,
            createdAt: activeGiveaway.createdAt,
            participantCount: activeGiveaway.participants.length,
            joinedByCurrentUser: Boolean(
              user &&
                activeGiveaway.participants.some(
                  (participant) =>
                    participant.email.toLowerCase() ===
                    user.email.toLowerCase(),
                ),
            ),
          }
        : null,
      stats,
    };
  }
  return apiRequest<MarketplaceHomeData>("/marketplace/home");
}

export async function getMarketplaceLeaderboard(): Promise<LeaderboardData> {
  if (!USE_MOCK) {
    return apiRequest<LeaderboardData>("/marketplace/leaderboard");
  }

  const [users, products, ratings, currentUser] = await Promise.all([
    getAdminUsers(),
    getAdminProducts("all"),
    getAdminRatings(),
    getCurrentUser(),
  ]);
  const sellers = users
    .filter((user) => user.role === "student" && !user.isLocked)
    .map((user): LeaderboardSeller => {
      const ownProducts = products.filter(
        (product) => product.sellerId === user.id,
      );
      const ownRatings = ratings.filter((rating) => rating.rateeId === user.id);
      const avgRating =
        ownRatings.length > 0
          ? ownRatings.reduce((sum, rating) => sum + rating.stars, 0) /
            ownRatings.length
          : 0;
      const soldCount = ownProducts.filter(
        (product) => product.status === "sold",
      ).length;
      const score = soldCount * 5 + avgRating * 10 + ownProducts.length;
      return {
        id: user.id,
        name: user.name,
        avatarUrl: null,
        isStudentVerified: user.isVerified,
        productCount: ownProducts.length,
        soldCount,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount: ownRatings.length,
        score,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.soldCount - a.soldCount ||
        b.avgRating - a.avgRating,
    );
  const myStats =
    sellers.find((seller) => seller.id === currentUser?.id) ?? null;
  const myRank =
    myStats === null
      ? 0
      : sellers.filter(
          (seller) =>
            seller.score > myStats.score ||
            (seller.score === myStats.score &&
              seller.soldCount > myStats.soldCount) ||
            (seller.score === myStats.score &&
              seller.soldCount === myStats.soldCount &&
              seller.avgRating > myStats.avgRating),
        ).length + 1;
  return { topSellers: sellers.slice(0, 10), myRank, myStats };
}

export async function getMarketplaceCategories(): Promise<AdminCategory[]> {
  if (USE_MOCK) return getAdminCategories();
  return apiRequest<AdminCategory[]>("/marketplace/categories");
}

function stripAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

const STOP_WORDS = new Set([
  "can",
  "tim",
  "mua",
  "mon",
  "do",
  "cho",
  "sinh",
  "vien",
  "ktx",
  "phong",
  "gia",
  "duoi",
  "tren",
  "khoang",
  "con",
  "moi",
  "cu",
  "tot",
  "re",
  "pass",
  "lai",
  "gap",
  "trong",
  "hinh",
  "anh",
  "giong",
  "hoc",
  "dung",
  "online",
  "dem",
  "khong",
  "tieng",
]);

interface ProductConceptRule {
  name: string;
  queryTriggers: string[];
  queryExcludes?: string[];
  productRequires: string[];
}

const PRODUCT_CONCEPT_RULES: ProductConceptRule[] = [
  {
    name: "lamp",
    queryTriggers: ["den ban", "den hoc", "chong can", "desk lamp", "den led", "den"],
    productRequires: ["den", "lamp"],
  },
  {
    name: "keyboard",
    queryTriggers: ["ban phim", "phim co", "keychron", "red switch", "keyboard"],
    productRequires: ["ban phim", "keychron", "switch"],
  },
  {
    name: "headphone",
    queryTriggers: ["tai nghe", "sony", "wh-ch520", "headphone"],
    productRequires: ["tai nghe", "sony"],
  },
  {
    name: "kettle",
    queryTriggers: ["am dun", "am sieu toc", "sieu toc", "sunhouse", "dun nuoc", "kettle"],
    productRequires: ["am ", "sieu toc", "sunhouse"],
  },
  {
    name: "calculator",
    queryTriggers: ["casio", "580vn", "580", "may tinh bo tui", "bo tui", "bitex"],
    productRequires: ["casio", "bo tui", "580"],
  },
  {
    name: "guitar",
    queryTriggers: ["guitar", "dan ", "acoustic", "rosen"],
    productRequires: ["guitar", "rosen"],
  },
  {
    name: "calculus_book",
    queryTriggers: ["giai tich", "dai so", "tuyen tinh"],
    productRequires: ["giai tich", "dai so"],
  },
  {
    name: "programming_book",
    queryTriggers: ["lap trinh", "c++", "java", "huong doi tuong"],
    productRequires: ["lap trinh", "c++", "java"],
  },
  {
    name: "folding_desk",
    queryTriggers: ["ban hoc gap", "ban gap", "go thong", "giuong tang"],
    queryExcludes: ["den", "ban phim"],
    productRequires: ["ban hoc gap", "go thong"],
  },
];

export async function getMarketplaceProducts(
  filters: MarketplaceProductFilters = {},
): Promise<MarketplaceProduct[]> {
  if (USE_MOCK) {
    const products = (await getAdminProducts("all")).filter(
      (product) => product.status === "active",
    );
    const rawKeyword = filters.keyword?.trim() ?? "";
    const rawImageHint = filters.imageHint?.trim() ?? "";
    const combinedQuery = `${rawKeyword} ${rawImageHint}`.trim();
    const normQuery = ` ${stripAccents(combinedQuery)} `;
    const normImageHint = rawImageHint ? ` ${stripAccents(rawImageHint)} ` : "";

    const queryTokens = normQuery
      .trim()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !/^\d+k$/.test(t));

    // Xác định các nhóm khái niệm sản phẩm (Concept Guard) từ câu truy vấn hoặc ảnh mẫu
    // Nếu có ảnh mẫu AI, ưu tiên tuyệt đối nhóm khái niệm của ảnh mẫu để tránh tìm nhầm
    const sourceForConcept = normImageHint || normQuery;
    const activeConcepts = PRODUCT_CONCEPT_RULES.filter(
      (rule) =>
        rule.queryTriggers.some((trig) => sourceForConcept.includes(trig)) &&
        !(rule.queryExcludes ?? []).some((ex) => sourceForConcept.includes(ex)),
    );

    // Tự động trích xuất ngân sách nếu người dùng gõ "dưới 80k", "dưới 500k" trong câu tự nhiên
    let inferredMaxPrice = filters.priceMax;
    if (inferredMaxPrice === undefined && normQuery.trim()) {
      const budgetMatch = /(?:duoi|toi da|<=?)\s*(\d+)\s*k\b/.exec(normQuery);
      if (budgetMatch) {
        inferredMaxPrice = Number(budgetMatch[1]) * 1000;
      }
    }

    const scored: MarketplaceProduct[] = [];

    for (const product of products) {
      if (filters.categoryId && product.categoryId !== filters.categoryId) {
        continue;
      }
      if (filters.type && product.type !== filters.type) continue;
      if (filters.condition && product.condition !== filters.condition) {
        continue;
      }
      if (
        filters.priceMin !== undefined &&
        (product.price ?? 0) < filters.priceMin
      ) {
        continue;
      }
      if (
        inferredMaxPrice !== undefined &&
        product.price !== null &&
        product.price > inferredMaxPrice
      ) {
        continue;
      }

      const base = toMarketplaceProduct(product);
      if (!combinedQuery) {
        scored.push(base);
        continue;
      }

      const desc = MOCK_PRODUCT_DESCRIPTIONS[product.id] ?? "";
      const haystack = ` ${stripAccents(
        `${product.title} ${product.categoryName} ${desc}`,
      )} `;
      const titleNorm = ` ${stripAccents(product.title)} `;
      const categoryNorm = ` ${stripAccents(product.categoryName)} `;

      // Nếu câu tìm kiếm hoặc ảnh mẫu xác định rõ loại vật phẩm (VD: đèn bàn, bàn phím, guitar, ấm đun, casio...),
      // bắt buộc sản phẩm phải thuộc đúng loại vật phẩm đó
      if (activeConcepts.length > 0) {
        const matchesConcept = activeConcepts.some((rule) =>
          rule.productRequires.some((req) => haystack.includes(req)),
        );
        if (!matchesConcept) {
          continue;
        }
      }

      const matchedTokens = queryTokens.filter((tok) => haystack.includes(tok));
      const titleOrCategoryHits = queryTokens.filter(
        (tok) => titleNorm.includes(tok) || categoryNorm.includes(tok),
      );

      if (activeConcepts.length === 0) {
        if (queryTokens.length > 0 && titleOrCategoryHits.length === 0) {
          continue;
        }
      }

      const ratio =
        queryTokens.length > 0
          ? matchedTokens.length / queryTokens.length
          : 0.9;
      const titleBonus =
        queryTokens.length > 0
          ? (titleOrCategoryHits.length / queryTokens.length) * 0.16
          : 0.12;
      const conceptBonus = activeConcepts.length > 0 ? 0.12 : 0;
      const rawScore = Math.min(
        99,
        Math.round((0.72 + ratio * 0.16 + titleBonus + conceptBonus) * 100),
      );

      const reasons: string[] = [];
      if (rawImageHint) {
        reasons.push("Khớp thị giác ảnh mẫu AI");
      }
      if (rawKeyword) {
        reasons.push("Khớp ngữ nghĩa & tên SP");
      }
      reasons.push(product.categoryName);
      if (inferredMaxPrice !== undefined && product.price !== null) {
        reasons.push(
          `Trong ngân sách ≤ ${inferredMaxPrice.toLocaleString("vi-VN")}đ`,
        );
      }

      scored.push({
        ...base,
        aiMatchScore: rawScore,
        aiMatchReasons: reasons,
      });
    }

    if (combinedQuery) {
      scored.sort((a, b) => (b.aiMatchScore ?? 0) - (a.aiMatchScore ?? 0));
    }
    return scored;
  }

  const search = new URLSearchParams();
  search.set("limit", "50");
  if (filters.keyword?.trim()) search.set("q", filters.keyword.trim());
  if (filters.categoryId) search.set("category", String(filters.categoryId));
  if (filters.type) search.set("type", filters.type);
  if (filters.condition) search.set("condition", filters.condition);
  if (filters.priceMin !== undefined) {
    search.set("priceMin", String(filters.priceMin));
  }
  if (filters.priceMax !== undefined) {
    search.set("priceMax", String(filters.priceMax));
  }

  const query = search.size > 0 ? `?${search.toString()}` : "";
  return apiRequest<MarketplaceProduct[]>(`/marketplace/products${query}`);
}

export async function getMarketplaceProduct(
  productId: number,
): Promise<MarketplaceProductDetail> {
  if (USE_MOCK) {
    const products = await getAdminProducts("all");
    const product = products.find((item) => item.id === productId);
    if (!product || product.status !== "active") {
      throw new Error("Sản phẩm không tồn tại hoặc đã ngừng bán.");
    }
    return {
      ...toMarketplaceProduct(product),
      description:
        MOCK_PRODUCT_DESCRIPTIONS[product.id] ??
        "Sản phẩm sinh viên KTX còn sử dụng tốt, xem và nhận hàng trực tiếp tại sảnh tòa nhà.",
    };
  }

  return apiRequest<MarketplaceProductDetail>(
    `/marketplace/product?id=${encodeURIComponent(productId)}`,
  );
}
