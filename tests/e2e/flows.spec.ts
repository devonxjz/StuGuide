import { test, expect, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
};

/** Đăng nhập thật bằng tài khoản seed (không còn cửa đăng nhập demo không mật khẩu). */
const ACCOUNTS = {
  "Giáo viên": { tab: null, username: "lan@hoamai.edu.vn", target: /\/teacher$/ },
  "Ban Giám hiệu": { tab: null, username: "minh@hoamai.edu.vn", target: /\/principal$/ },
  "Phụ huynh": { tab: "Phụ huynh", username: "0900000001", target: /\/family/ },
} as const;

async function enter(page: Page, role: keyof typeof ACCOUNTS) {
  const account = ACCOUNTS[role];
  await page.goto("/login");
  if (account.tab) await page.getByRole("tab", { name: account.tab }).click();
  await page.locator("#username").fill(account.username);
  await page.locator("#password").fill("stuguide");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(account.target, { timeout: 60_000 }); // chờ cookie phiên được ghi
}

test.describe.serial("Luồng 3 vai trò (acceptance #1-#7)", () => {
  test("màn hình đăng nhập: không còn lối vào demo một chạm", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Chào mừng đến với StuGuide/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Trải nghiệm vai/ })).toHaveCount(0);
    await shot(page, "01-login");
  });

  test("Đăng nhập bằng mật khẩu: ô trống sẵn, sai mật khẩu bị từ chối, đúng thì vào đúng cổng của từng vai trò", async ({ browser }) => {
    const login = async (tab: string | null, username: string, password: string) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto("/login");
      if (tab) await page.getByRole("tab", { name: tab }).click();
      await expect(page.locator("#username")).toHaveValue(""); // không điền sẵn
      await expect(page.locator("#password")).toHaveValue("");
      await expect(page.locator("#username")).not.toHaveAttribute("placeholder", /.+/);
      await page.locator("#username").fill(username);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      return { page, ctx };
    };

    const bad = await login(null, "lan@hoamai.edu.vn", "sai-mat-khau");
    await expect(bad.page.locator("p[role=alert]")).toContainText("chưa đúng", { timeout: 60_000 }); // lần gọi đầu còn biên dịch route + nạp dữ liệu mẫu
    await expect(bad.page).toHaveURL(/\/login/);
    await bad.ctx.close();

    const teacher = await login(null, "lan@hoamai.edu.vn", "stuguide");
    await expect(teacher.page).toHaveURL(/\/teacher$/, { timeout: 60_000 });
    await teacher.ctx.close();
    const principal = await login(null, "minh@hoamai.edu.vn", "stuguide");
    await expect(principal.page).toHaveURL(/\/principal$/, { timeout: 60_000 });
    await principal.ctx.close();
    const parent = await login("Phụ huynh", "0900000002", "stuguide");
    await expect(parent.page).toHaveURL(/\/family\/child\//, { timeout: 60_000 });
    await expect(parent.page.getByRole("heading", { name: "Nguyễn Minh Anh" })).toBeVisible();
    await expect(parent.page.getByText("Trần Gia Huy")).toHaveCount(0);
    await parent.ctx.close();
  });

  test("GV: chat soạn trò chơi → bản nháp AI có pháp lý + an toàn → phê duyệt → checklist", async ({ page }) => {
    await enter(page, "Giáo viên");
    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: /Chào cô Lan/ })).toBeVisible();
    await shot(page, "02-teacher-welcome");

    await page.getByRole("button", { name: /Tạo Kế hoạch & Trò chơi mới/ }).click();
    await expect(page.getByLabel("Căn cứ pháp lý")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByLabel("Cảnh báo an toàn")).toBeVisible();
    await expect(page.getByText("Bản nháp AI").first()).toBeVisible();
    await expect(page.getByText(/hộp sữa/i).first()).toBeVisible();
    await shot(page, "03-teacher-plan-card");

    await page.getByRole("button", { name: /Phê duyệt & Tạo checklist/ }).click();
    await expect(page.getByText("Đã duyệt").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ghi nhận quan sát/ }).first()).toBeVisible();
  });

  test("Bộ nhớ: hội thoại được lưu, tải lại vẫn còn thẻ giáo án; cuộc trò chuyện hiện trong danh sách; AI tự ghi nhớ và cô quản lý trí nhớ", async ({ page }) => {
    await enter(page, "Giáo viên");
    await page.goto("/teacher");
    // cuộc trò chuyện ở test trước đã được lưu và có tiêu đề
    await expect(page.getByRole("link", { name: /Soạn trò chơi cho lớp 4–5 tuổi/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /Soạn trò chơi cho lớp 4–5 tuổi/ }).first().click();
    await expect(page).toHaveURL(/\/teacher\?c=/);
    await expect(page.getByLabel("Căn cứ pháp lý").first()).toBeVisible(); // thẻ giáo án được khôi phục từ DB
    await expect(page.getByText("Đã duyệt").first()).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Căn cứ pháp lý").first()).toBeVisible();
    await shot(page, "03b-conversation-restored");

    // cô tự thêm một điều cần nhớ, sau đó xóa
    await page.getByLabel("Thêm điều cần nhớ").fill("Lớp thích trò chơi ngoài sân");
    await page.getByRole("button", { name: "Thêm", exact: true }).click();
    await expect(page.getByText("Lớp thích trò chơi ngoài sân")).toBeVisible();
    await shot(page, "03c-memory");

    // chat mới: nhờ AI ghi nhớ bằng lời → trí nhớ xuất hiện trong bảng
    await page.getByRole("button", { name: /Mới/ }).click();
    await page.getByRole("textbox", { name: /Nhắn cho StuGuide/ }).fill("Nhớ giúp mình: lớp mình chỉ có 6 rổ nhựa nhé.");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/6 rổ nhựa/i).last()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("button", { name: /^Quên:.*rổ/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^Quên:.*ngoài sân/ }).click();
    await expect(page.getByText("Lớp thích trò chơi ngoài sân")).toHaveCount(0);
  });

  test("GV: mở chi tiết giáo án, sửa tay và nhờ AI viết lại, có lịch sử phiên bản", async ({ page }) => {
    await enter(page, "Giáo viên");
    await page.goto("/teacher");
    // mở bài nháp hôm nay trong cột bên phải
    await page.getByRole("link", { name: /Khu vườn bí ẩn/ }).first().click();
    await page.waitForURL(/\/teacher\/plan\//);
    await expect(page.getByText("Bản nháp AI").first()).toBeVisible();
    await shot(page, "04-plan-detail");

    await page.getByRole("button", { name: /Sửa phần này/ }).nth(0).click();
    await page.getByLabel("Tên trò chơi").fill("Thám tử nhí và bản đồ lá");
    await page.getByRole("button", { name: /Lưu chỉnh sửa/ }).click();
    await expect(page.getByRole("heading", { name: "Thám tử nhí và bản đồ lá" })).toBeVisible();

    await page.getByRole("button", { name: /AI viết lại phần này/ }).nth(3).click();
    await page.getByRole("button", { name: /^Viết lại/ }).click();
    // AI thật + vòng chấm theo tiêu chí (sinh → chấm → có thể tự sửa) nên lâu hơn một lượt gọi đơn
    await expect(page.getByText(/Đã nhờ AI viết lại/)).toBeVisible({ timeout: 150_000 });
    await expect(page.getByText("Lịch sử chỉnh sửa")).toBeVisible();
    await expect(page.getByText("v2")).toBeVisible();
  });

  test("GV: checklist 30 giây → cảnh báo quan sát sâu cho Gia Huy → tạo thẻ phụ huynh", async ({ page }) => {
    await enter(page, "Giáo viên");
    await page.goto("/teacher/assess");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Đánh dấu tất cả/ }).click();
    const huy = page.getByRole("row", { name: /Trần Gia Huy/ });
    await huy.getByRole("button", { name: /Cần rèn thêm/ }).click();
    await shot(page, "05-assess");
    await page.getByRole("button", { name: /Lưu hồ sơ/ }).click();
    await expect(page.getByText(/Gợi ý quan sát sâu cho bé Trần Gia Huy/).first()).toBeVisible();
    await expect(page.getByText(/không phải chẩn đoán/i).first()).toBeVisible();
    await shot(page, "06-assess-alert");
  });

  test("GV: thẻ phụ huynh và realtime – phụ huynh chạm, % trên máy cô tự nhảy không F5", async ({ browser }) => {
    const teacherCtx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
    const teacher = await teacherCtx.newPage();
    await enter(teacher, "Giáo viên");
    await teacher.goto("/teacher/parent-cards");
    await expect(teacher.getByText(/Phản hồi phụ huynh/).first()).toBeVisible();
    await expect(teacher.getByText("Trực tiếp").first()).toBeVisible();
    const ring = teacher.getByTestId("ring-value").first();
    await expect(ring).toHaveText("63%");
    await shot(teacher, "07-parent-cards");

    const parentCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const parent = await parentCtx.newPage();
    await parent.goto("/parent/demo-token-1");
    await expect(parent.getByText(/Không cần cài đặt ứng dụng/)).toBeVisible();
    await shot(parent, "08-parent-mobile");
    await parent.getByRole("button", { name: /Bé đã hoàn thành/ }).click();
    await expect(parent.getByText(/Cảm ơn bố mẹ/)).toBeVisible();

    await expect(ring).toHaveText("75%", { timeout: 8_000 }); // 6/8 – không reload trang
    await shot(teacher, "09-parent-cards-realtime");
    await teacherCtx.close();
    await parentCtx.close();
  });

  test("Phụ huynh: mở hồ sơ bé khác qua URL bị từ chối và BGH thấy trong nhật ký an ninh", async ({ browser }) => {
    const parentCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const parent = await parentCtx.newPage();
    await enter(parent, "Phụ huynh");
    const res = await parent.goto("/family/child/demo-student-2");
    expect(res?.status()).toBe(404);
    await shot(parent, "10-parent-denied");
    await parent.goto("/parent/token-bia-dat");
    await expect(parent.getByText(/không hợp lệ hoặc đã hết hạn/)).toBeVisible();
    await parentCtx.close();

    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const principal = await ctx.newPage();
    await enter(principal, "Ban Giám hiệu");
    await expect(principal).toHaveURL(/\/principal$/);
    await expect(principal.getByText("Truy cập bị từ chối").first()).toBeVisible();
    await shot(principal, "11-principal");
    await ctx.close();
  });

  test("BGH: duyệt giáo án chờ rà soát và xem báo cáo kiểm định", async ({ page }) => {
    await enter(page, "Ban Giám hiệu");
    await expect(page.getByText(/Hàng đợi duyệt giáo án \(1\)/)).toBeVisible();
    await page.getByRole("button", { name: /^Phê duyệt/ }).click();
    await expect(page.getByText(/Không có giáo án nào đang chờ duyệt/)).toBeVisible();
    await page.getByRole("link", { name: /Xuất Báo cáo Kiểm định/ }).click();
    await expect(page.getByRole("heading", { name: /Báo cáo kiểm định chất lượng giáo dục/ })).toBeVisible();
    await shot(page, "12-report");
  });

  test("Đăng xuất thu hồi phiên: quay lại trang cũ bị chuyển về /login", async ({ page }) => {
    await enter(page, "Ban Giám hiệu");
    await page.getByRole("button", { name: /Đăng xuất/ }).first().click();
    await page.waitForURL(/\/login/);
    await page.goto("/principal");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Phụ huynh (iPad): xem con đang học gì, AI cá nhân hóa; bộ nhớ ngắn hạn ở RAM, đóng tab mới ghi DB và AI chắt lọc thành trí nhớ của bé", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
    const page = await ctx.newPage();
    await enter(page, "Phụ huynh");
    await expect(page.getByRole("heading", { name: "Trần Gia Huy" })).toBeVisible();
    await expect(page.getByText("Chuyến xe tình bạn").first()).toBeVisible(); // con đang học gì
    await expect(page.getByText("Con đang tiến bộ thế nào?")).toBeVisible();
    await expect(page.getByText(/xe cứu hỏa/)).toBeVisible(); // trí nhớ riêng của bé
    await expect(page.getByText(/Nguyễn Minh Anh/)).toHaveCount(0);
    await shot(page, "13-family-child");

    // AI cá nhân hóa theo hồ sơ của bé (AI thật)
    await page.getByRole("button", { name: /Gợi ý tối nay cho con/ }).click();
    await expect(page.getByText("Dành riêng cho bé")).toBeVisible({ timeout: 90_000 });
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Bé rất thích/ }).click();
    await page.getByLabel(/Bé phản ứng thế nào/).fill("Bé rất mê khủng long, cười suốt và đòi chơi lại");
    await page.getByRole("button", { name: /Lưu ghi chú/ }).click();
    await shot(page, "14-family-activity");

    // Bộ nhớ ngắn hạn mới chỉ ở RAM: tab khác của cùng phụ huynh chưa thấy gì mới trong trí nhớ dài hạn
    const other = await ctx.newPage();
    await other.goto("/family/child/demo-student-1");
    await expect(other.getByText("Mình ghi nhận")).toHaveCount(0);
    await other.close();

    // Đóng tab → pagehide → sendBeacon → DB → AI chắt lọc
    await page.close({ runBeforeUnload: true });
    const check = await ctx.newPage();
    await expect
      .poll(
        async () => {
          await check.goto("/family/child/demo-student-1");
          return check.getByText("Mình ghi nhận").count();
        },
        { timeout: 90_000, intervals: [3_000] },
      )
      .toBeGreaterThan(0);
    await expect(check.getByText(/khủng long/i).first()).toBeVisible();
    await shot(check, "15-family-memory");

    // BR-006: không xem được hồ sơ bé khác qua URL
    const res = await check.goto("/family/child/demo-student-2");
    expect(res?.status()).toBe(404);
    await ctx.close();
  });

  test("RBAC: chưa đăng nhập bị chuyển về /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/principal");
    await expect(page).toHaveURL(/\/login/);
  });
});
