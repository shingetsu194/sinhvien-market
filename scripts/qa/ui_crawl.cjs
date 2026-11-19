// Duyệt mọi trang Next.js với 3 vai trò trên dữ liệu thật (không mock).
// Ghi lại: lỗi JS (pageerror), console.error, request /api lỗi (>=400 hoặc fail), URL cuối.
// node ui_crawl.cjs <frontend_dir> <base_url> <seed_output>
const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");
const req = createRequire(path.join(process.argv[2], "package.json"));
const { chromium } = req("@playwright/test");
const BASE = process.argv[3];
const creds = {};
for (const l of fs.readFileSync(process.argv[4], "utf8").split(/\r?\n/)) {
  const m = l.trim().match(/^(\S+@example\.test)\s+([0-9a-f]+)$/);
  if (m) creds[m[1]] = m[2];
}

const PUBLIC = ["/", "/login-role", "/login", "/admin-login", "/register", "/forgot-password", "/reset-password", "/verify-otp", "/account-locked", "/products", "/leaderboard"];
const STUDENT = ["/dashboard", "/profile", "/products", "/products/create", "/my-listings", "/wishlist", "/notifications", "/chat", "/transactions", "/rewards", "/users/1",
  "/residence", "/residence/announcements", "/residence/assistant", "/residence/finance", "/residence/services", "/rentals", "/marketplace/matching", "/products/999999"];
const MANAGER = ["/admin/residence", "/admin/residence/dashboard", "/admin/residence/finance", "/admin/residence/operations", "/admin/marketplace/matching", "/residence/services"];
const ADMIN = ["/admin", "/admin/products", "/admin/categories", "/admin/banners", "/admin/users", "/admin/users/detail?id=1", "/admin/users/violations?id=1",
  "/admin/reports", "/admin/system-reports", "/admin/ratings", "/admin/giveaways", "/admin/giveaway-spin", "/admin/audit-log",
  "/admin/residence", "/admin/residence/operations", "/admin/residence/finance", "/admin/residence/dashboard", "/admin/marketplace/matching"];

async function login(ctx, email, role) {
  const r = ctx.request;
  const c = await (await r.get(BASE + "/api/auth/csrf")).json();
  const res = await r.post(BASE + "/api/auth/login", {
    data: { email, password: creds[email], role },
    headers: { "X-CSRF-Token": c.data.token, "Content-Type": "application/json" },
  });
  return res.status();
}

async function crawl(label, ctx, routes) {
  const out = [];
  for (const route of routes) {
    const page = await ctx.newPage();
    const issues = [];
    page.on("pageerror", (e) => issues.push("JS: " + String(e.message).slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") issues.push("console: " + m.text().slice(0, 160)); });
    page.on("response", (r) => { const u = r.url(); if (u.includes("/api/") && r.status() >= 400) issues.push(`api ${r.status()}: ${r.request().method()} ${u.replace(BASE, "").slice(0, 90)}`); });
    page.on("requestfailed", (r) => { if (r.url().includes("/api/")) issues.push("api FAILED: " + r.url().replace(BASE, "")); });
    let status = "?";
    try {
      const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 90000 });
      status = resp ? resp.status() : "?";
      await page.waitForTimeout(800);
    } catch (e) { issues.push("NAV: " + String(e.message).split("\n")[0].slice(0, 120)); }
    const finalPath = page.url().replace(BASE, "");
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 4000);
    if (/Unhandled Runtime Error|Application error|This page could not be found|Đã xảy ra lỗi/i.test(body)) issues.push("UI hiển thị lỗi: " + (body.match(/Unhandled Runtime Error|Application error|This page could not be found|Đã xảy ra lỗi[^\n]*/i) || [""])[0]);
    const uniq = [...new Set(issues)];
    out.push({ label, route, status, finalPath, issues: uniq });
    console.log(`${uniq.length ? "WARN" : " OK "} [${label}] ${route} -> ${status} ${finalPath !== route ? "(=> " + finalPath + ")" : ""}`);
    for (const i of uniq.slice(0, 6)) console.log("        - " + i);
    await page.close();
  }
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  const anon = await browser.newContext();
  all.push(...await crawl("khách", anon, PUBLIC.concat(["/residence", "/admin"])));
  const stu = await browser.newContext();
  console.log("login SV:", await login(stu, "demo-student@example.test", "student"));
  all.push(...await crawl("SV", stu, STUDENT));
  const mgr = await browser.newContext();
  console.log("login QL:", await login(mgr, "demo-manager@example.test", "student"));
  all.push(...await crawl("QL KTX", mgr, MANAGER));
  const adm = await browser.newContext();
  console.log("login Admin:", await login(adm, "demo-admin@example.test", "admin"));
  all.push(...await crawl("Admin", adm, ADMIN));
  await browser.close();
  fs.writeFileSync(path.join(process.cwd(), "ui_crawl_result.json"), JSON.stringify(all, null, 2));
  const bad = all.filter((r) => r.issues.length);
  console.log(`\nTỔNG: ${all.length} lượt trang, ${all.length - bad.length} sạch, ${bad.length} có vấn đề`);
})();
