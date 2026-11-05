import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
let server;
try {
  await fetch(baseURL);
} catch {
  server = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "3000"],
    { stdio: "ignore" },
  );
  process.on("exit", () => server?.kill());
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(baseURL);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("work", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(baseURL);
await page.getByRole("button", { name: "点灯启程", exact: true }).click();
await page.locator(".action-world canvas").waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: "work/action-desktop.png" });
await page.keyboard.press("e");
await page.waitForTimeout(150);
assert.match(await page.locator(".wild-message").innerText(), /休整/);
await page.keyboard.press("k");
await page.waitForTimeout(150);
assert.match(await page.locator(".spirit").innerText(), /4 \/ 6/);
await page.keyboard.press("e");
await page.waitForTimeout(150);
assert.match(await page.locator(".spirit").innerText(), /6 \/ 6/);
// Reach the west cache using actual movement, open it, and reload.
await page.keyboard.down("s");
await page.waitForTimeout(480);
await page.keyboard.up("s");
await page.keyboard.down("a");
await page.waitForTimeout(1100);
await page.keyboard.up("a");
await page.waitForTimeout(150);
await page.keyboard.press("e");
await page.waitForTimeout(250);
let saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("mist-lantern-save-v1")),
);
assert(saved.wilds.includes("0:chest0"), "cache should be persisted");
await page.reload();
await page.getByRole("button", { name: "继续旅途", exact: true }).click();
assert.match(await page.locator(".wild-heading").innerText(), /木箱 1 \/ 3/);
// Move east over bridge; combat with nearby enemies using melee and lantern.
await page.keyboard.down("d");
await page.waitForTimeout(1300);
await page.keyboard.up("d");
for (let i = 0; i < 8; i++) {
  await page.keyboard.press("j");
  if (i === 1) await page.keyboard.press("k");
  await page.waitForTimeout(400);
}
saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("mist-lantern-save-v1")),
);
assert(
  saved.wilds.some((x) => x.includes("enemy")),
  "combat kill should persist",
);
await page.getByRole("button", { name: "剧情地图", exact: true }).click();
await page
  .getByRole("button", { name: "许婆婆的门灯，交谈", exact: true })
  .click();
await page.getByRole("dialog").waitFor();
assert.deepEqual(errors, []);
console.log(
  "PASS desktop movement, camp, spell, cache save/reload, real combat, campaign interaction",
);
await page.close();
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto(baseURL);
await mobile.getByRole("button", { name: "点灯启程", exact: true }).click();
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: "work/action-mobile.png", fullPage: true });
assert.equal(
  await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  ),
  false,
);
await mobile.locator(".wild-actions button").first().tap();
assert.deepEqual(errors, []);
console.log("PASS mobile layout and touch attack");
await browser.close();
