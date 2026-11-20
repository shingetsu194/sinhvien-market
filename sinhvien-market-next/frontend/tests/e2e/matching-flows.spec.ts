import { expect, test } from "@playwright/test";

test.describe("AI Request-Offer Matching & Clean Marketplace UX Flows", () => {
  test("loads clean student request page from navbar and eliminates wrong tail items on R01", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("nav-matching-trigger").click();
    const navLink = page.getByRole("link", { name: /Ghép nối AI/i }).first();
    await expect(navLink).toBeVisible();

    const t0 = Date.now();
    await navLink.click();
    await expect(page).toHaveURL(/\/requests/);
    await expect(
      page.getByRole("heading", {
        name: /Góc Cần Mua & Tìm Đồ Sinh Viên/i,
      }),
    ).toBeVisible();
    const loadMs = Date.now() - t0;
    expect(loadMs).toBeLessThanOrEqual(2000);

    // Mặc định chọn R01 (sách giải tích năm nhất): chỉ hiện đúng O01, KHÔNG hiện nhầm O04 (TOEIC)
    await expect(page.getByTestId("ranked-offer-O01")).toBeVisible();
    await expect(page.getByTestId("ranked-offer-O04")).toHaveCount(0);

    // Chọn R28 (ảnh bàn phím cơ tìm tin chỉ có chữ O06): tìm đúng O06
    await page.getByTestId("request-item-R28").click();
    await expect(page.getByTestId("ranked-offer-O06")).toBeVisible();
  });

  test("triggers friendly Counterfactual suggestion on R20 and unlocks O18 upon user consent", async ({
    page,
  }) => {
    await page.goto("/requests");
    await page.getByTestId("request-item-R20").click();

    const cfPanel = page.getByTestId("counterfactual-panel");
    await expect(cfPanel).toBeVisible();
    await expect(cfPanel).toContainText("Mở rộng ra tất cả khu vực");

    await page.getByTestId("apply-cf-0").click();
    await expect(
      page.getByText(/Đã áp dụng theo lựa chọn của bạn/i),
    ).toBeVisible();
    await expect(page.getByTestId("ranked-offer-O18")).toBeVisible();
  });

  test("defaults constraints to Hard in Create Request modal and posts a new live request", async ({
    page,
  }) => {
    await page.goto("/requests");
    await page.getByTestId("open-create-request-btn").click();

    const hardButtons = page.locator("form button", { hasText: "Bắt buộc" });
    await expect(hardButtons).toHaveCount(4);

    await page
      .getByPlaceholder(/Ví dụ: Cần tìm ấm đun nước/i)
      .fill("Cần tìm giáo trình giải tích 1 năm nhất còn mới");
    await page.getByTestId("submit-create-request-btn").click();

    await expect(page.getByTestId("ranked-offer-O01")).toBeVisible();
    await expect(page.getByTestId("ranked-offer-O04")).toHaveCount(0);
  });

  test("toggles filter pills off on second click and supports Enter/button search", async ({
    page,
  }) => {
    await page.goto("/requests");
    await expect(
      page.getByText(/Sinh viên đang cần tìm \(31\)/i),
    ).toBeVisible();

    // Bấm lần 1 vào 'Tìm bằng ảnh mẫu' -> lọc còn 2 tin; bấm lại lần 2 -> tự bỏ lọc về 31 tin
    const imgTab = page.getByTestId("quick-tab-with_image");
    await imgTab.click();
    await expect(page.getByText(/Sinh viên đang cần tìm \(2\)/i)).toBeVisible();
    await imgTab.click();
    await expect(
      page.getByText(/Sinh viên đang cần tìm \(31\)/i),
    ).toBeVisible();

    // Bấm lần 1 vào danh mục 'Đồ điện tử' -> lọc; bấm lại lần 2 -> tự bỏ chọn về 31 tin
    const elecChip = page.getByTestId("cat-chip-dien_tu");
    await elecChip.click();
    await expect(elecChip).toHaveAttribute("aria-pressed", "true");
    await elecChip.click();
    await expect(elecChip).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByText(/Sinh viên đang cần tìm \(31\)/i),
    ).toBeVisible();

    // Nhập từ khóa vào ô tìm kiếm rồi nhấn Enter -> lọc và hiển thị ngay sản phẩm tương ứng
    const searchInput = page.getByTestId("request-search-input");
    await searchInput.fill("vợt cầu lông");
    await searchInput.press("Enter");
    await expect(page.getByText(/Sinh viên đang cần tìm \(1\)/i)).toBeVisible();
    await expect(page.getByTestId("ranked-offer-O44")).toBeVisible();

    // Bấm nút Tìm kiếm trực tiếp cũng hoạt động mượt mà (kể cả gõ không dấu)
    await searchInput.fill("giai tich");
    await page.getByTestId("request-search-submit-btn").click();
    await expect(page.getByTestId("ranked-offer-O01")).toBeVisible();

    // Khi tìm "bàn" rồi bấm sang danh mục không khớp "Nhạc cụ", cả cột trái lẫn cột sản phẩm bên phải đều về 0 (không giữ kết quả cũ)
    await searchInput.fill("bàn");
    await searchInput.press("Enter");
    await expect(page.getByTestId("ranked-offer-O13")).toBeVisible();
    await page.getByTestId("cat-chip-nhac_cu").click();
    await expect(page.getByText(/Sinh viên đang cần tìm \(0\)/i)).toBeVisible();
    await expect(
      page.getByText(/Sản phẩm gợi ý cho nhu cầu này \(0\)/i),
    ).toBeVisible();
    await expect(page.getByTestId("ranked-offer-O13")).toHaveCount(0);
  });
});
