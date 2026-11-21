import { describe, expect, it } from "vitest";
import {
  computeKeywordBm25Scores,
  executeRequestMatching,
  getConstraintFlag,
  passesHardConstraints,
} from "@/lib/matching/engine";
import {
  getAllBuyerRequests,
  getBenchmarkRuns,
  getMarketplaceOffers,
} from "@/lib/api/matching";
import type { BuyerRequest, MarketplaceOffer } from "@/lib/types/matching";

describe("AI Request-Offer Matching & Counterfactual Engine", () => {
  const offers = getMarketplaceOffers();
  const requests = getAllBuyerRequests();

  it("loads all 44 offers, 31 requests, and 5 validated benchmark runs", () => {
    expect(offers).toHaveLength(44);
    expect(requests).toHaveLength(31);
    const runs = getBenchmarkRuns();
    expect(runs.length).toBeGreaterThanOrEqual(5);
    for (const run of runs) {
      expect(run.metrics.hard_constraint_violations).toBe(0);
    }
  });

  it("defaults omitted constraint flags to 'hard' (bắt buộc) per Section 4.4", () => {
    const req: BuyerRequest = {
      id: "R_TEST_DEFAULT",
      text: "Tìm sách giải tích",
      image: null,
      category: "sach",
      budget_max: 50000,
      min_condition: "like_new",
      location: "ktx_a",
      allow_exchange: false,
      flags: {},
    };
    expect(getConstraintFlag(req, "category")).toBe("hard");
    expect(getConstraintFlag(req, "budget")).toBe("hard");
    expect(getConstraintFlag(req, "condition")).toBe("hard");
    expect(getConstraintFlag(req, "location")).toBe("hard");

    const expensiveOffer: MarketplaceOffer = {
      id: "O_EXP",
      title: "Giáo trình Giải tích",
      description: "Mới đẹp",
      category: "sach",
      type: "sale",
      price: 80000,
      condition: "like_new",
      location: "ktx_a",
      image: null,
    };
    expect(passesHardConstraints(req, expensiveOffer).ok).toBe(false);
  });

  it("excludes exchange listings (price = null) when allow_exchange is false", () => {
    const reqR16 = requests.find((r) => r.id === "R16")!;
    const exchangeKettle = offers.find((o) => o.id === "O16")!;
    expect(exchangeKettle.type).toBe("exchange");
    expect(exchangeKettle.price).toBeNull();
    expect(passesHardConstraints(reqR16, exchangeKettle).ok).toBe(false);

    const reqR17 = requests.find((r) => r.id === "R17")!;
    const exchangeBook = offers.find((o) => o.id === "O05")!;
    expect(passesHardConstraints(reqR17, exchangeBook).ok).toBe(true);
  });

  it("never violates hard constraints during ranking or counterfactual generation (R06 & R21)", async () => {
    const { matchBuyerRequest } = await import("@/lib/api/matching");

    const reqHardBudget = requests.find((r) => r.id === "R06")!;
    const resR06 = await matchBuyerRequest(
      reqHardBudget,
      "jina-clip-v2-multimodal",
      offers,
    );
    // O10 (2.900.000đ > 2.500.000đ hard) tuyệt đối không được lọt vào kết quả hay gợi ý
    expect(resR06.rankedOffers.some((i) => i.offer.id === "O10")).toBe(false);
    expect(resR06.counterfactuals).toHaveLength(0);

    const reqHardLocation = requests.find((r) => r.id === "R21")!;
    const resR21 = await matchBuyerRequest(
      reqHardLocation,
      "jina-clip-v2-multimodal",
      offers,
    );
    // O13 ở ktx_b trong khi R21 khóa cứng location = ktx_a
    expect(resR21.rankedOffers.some((i) => i.offer.id === "O13")).toBe(false);
    expect(resR21.counterfactuals).toHaveLength(0);

    // Trường hợp kho chỉ có đúng ứng viên bị chặn bởi điều kiện hard -> trả về chẩn đoán minh bạch
    const onlyLaptopOffers = offers.filter((o) => o.id === "O10");
    const scoresAll = computeKeywordBm25Scores(reqHardBudget.text, offers);
    const strictBlocked = executeRequestMatching(
      reqHardBudget,
      onlyLaptopOffers,
      scoresAll,
      "keyword-bm25-vi",
    );
    expect(strictBlocked.strictMatchCount).toBe(0);
    expect(strictBlocked.counterfactuals).toHaveLength(0);
    expect(strictBlocked.hardBlockDiagnostic).toContain("điều kiện bắt buộc");
  });

  it("generates verified minimal soft relaxations on single & multi-axis counterfactuals (R20 & R31)", () => {
    const reqR20 = requests.find((r) => r.id === "R20")!;
    const scoresR20 = computeKeywordBm25Scores(reqR20.text, offers);
    const resR20 = executeRequestMatching(
      reqR20,
      offers,
      scoresR20,
      "keyword-bm25-vi",
    );
    expect(resR20.counterfactualTriggered).toBe(true);
    expect(resR20.counterfactuals.length).toBeGreaterThan(0);
    expect(resR20.counterfactuals[0].unlockedOfferIds).toContain("O18");

    const reqR31 = requests.find((r) => r.id === "R31")!;
    const scoresR31 = computeKeywordBm25Scores(reqR31.text, offers);
    const resR31 = executeRequestMatching(
      reqR31,
      offers,
      scoresR31,
      "keyword-bm25-vi",
    );
    expect(resR31.counterfactualTriggered).toBe(true);
    expect(
      resR31.counterfactuals.some((c) => c.unlockedOfferIds.includes("O15")),
    ).toBe(true);
  });

  it("filters out irrelevant same-category items like TOEIC book on R01 Calculus query and returns empty on R08 no-supply", async () => {
    const { matchBuyerRequest } = await import("@/lib/api/matching");
    const reqR01 = requests.find((r) => r.id === "R01")!;

    for (const model of [
      "jina-clip-v2-multimodal",
      "gemini-embedding-2-multimodal",
    ] as const) {
      const resR01 = await matchBuyerRequest(reqR01, model, offers);
      expect(resR01.rankedOffers.map((x) => x.offer.id)).toEqual(["O01"]);
      expect(resR01.rankedOffers.some((x) => x.offer.id === "O04")).toBe(false);
    }

    const reqR08 = requests.find((r) => r.id === "R08")!;
    const resR08 = await matchBuyerRequest(
      reqR08,
      "jina-clip-v2-multimodal",
      offers,
    );
    expect(resR08.rankedOffers).toHaveLength(0);
  });
});
