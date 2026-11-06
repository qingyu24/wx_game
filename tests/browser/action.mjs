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
  server.unref();
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
import { freshState } from "../../src/rpg/engine.mjs";
import {
  camp,
  caches,
  nodePoint,
  LAYOUT_VERSION,
} from "../../src/rpg/wilds.mjs";
import { mkdir } from "node:fs/promises";
await mkdir("work", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});

const errors = [];
async function ready(page) {
  await page
    .locator('canvas[data-art-ready="true"]')
    .waitFor({ timeout: 20000 });
}
async function saved(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("mist-lantern-save-v1")),
  );
}
async function waitRecord(page, id) {
  await page.waitForFunction(
    (id) =>
      JSON.parse(localStorage.getItem("mist-lantern-save-v1"))?.wilds.includes(
        id,
      ),
    id,
    { timeout: 20000 },
  );
}
async function campInteract(page) {
  await page.getByRole("button", { name: "返回营火", exact: true }).click();
  await page.waitForFunction(
    () =>
      /营火/.test(document.querySelector(".wild-interact")?.textContent || ""),
    null,
    { timeout: 20000 },
  );
  await page.keyboard.press("e");
}
async function clickWorld(page, point) {
  const current = (await saved(page)).wildPosition || {
    x: camp.x + 42,
    y: camp.y + 28,
  };
  await page.waitForTimeout(600);
  const box = await page.locator(".action-world canvas").boundingBox();
  const scale = Math.max(0.65, Math.min(1.1, box.width / 850));
  const cx = Math.max(
      0,
      Math.min(1440 - box.width / scale, current.x - box.width / scale / 2),
    ),
    cy = Math.max(
      0,
      Math.min(1000 - box.height / scale, current.y - box.height / scale / 2),
    );
  await page
    .locator(".action-world canvas")
    .click({
      position: { x: (point.x - cx) * scale, y: (point.y - cy) * scale },
    });
}
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(baseURL);
await page.getByRole("button", { name: "点灯启程", exact: true }).click();
await ready(page);
await page.waitForTimeout(1800);
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
await clickWorld(page, caches[0]);
await waitRecord(page, "0:chest0");
const checkpoint = await saved(page);
assert.equal(checkpoint.wildPosition.layoutVersion, LAYOUT_VERSION);
await page.reload();
await page.getByRole("button", { name: "继续旅途", exact: true }).click();
await ready(page);
assert.match(await page.locator(".wild-heading").innerText(), /木箱 1 \/ 3/);
await campInteract(page);
await page.getByRole("button", { name: "锁定近敌", exact: true }).click();
await page.waitForFunction(
  () =>
    JSON.parse(localStorage.getItem("mist-lantern-save-v1")).wilds.some((id) =>
      id.includes("enemy"),
    ),
  null,
  { timeout: 20000 },
);
await clickWorld(page, nodePoint({ id: "porch" }));
await page.getByRole("dialog").waitFor({ timeout: 20000 });
await page.getByRole("button", { name: "略过对白", exact: true }).click();
assert((await saved(page)).completed.includes("0:porch"));
assert.deepEqual(errors, []);
console.log(
  "PASS painted assets, mouse-to-chest interaction, target combat, mouse-to-NPC interaction and checkpoint reload",
);
await page.close();
const mission = await browser.newPage({
  viewport: { width: 1440, height: 960 },
});
mission.on("pageerror", (e) => errors.push(e.message));
await mission.addInitScript(
  (value) => {
    if (!sessionStorage.getItem("mission-seeded")) {
      localStorage.setItem("mist-lantern-save-v1", JSON.stringify(value));
      sessionStorage.setItem("mission-seeded", "1");
    }
  },
  {
    ...freshState(),
    started: true,
    wilds: [
      "0:enemy1",
      "0:enemy2",
      "0:enemy3",
      "0:enemy4",
      "0:chest1",
      "0:chest2",
    ],
  },
);
await mission.goto(baseURL);
await mission.getByRole("button", { name: "继续旅途", exact: true }).click();
await ready(mission);
await mission.getByRole("button", { name: "锁定近敌", exact: true }).click();
await mission.keyboard.down("j");
await waitRecord(mission, "0:enemy0");
await mission.keyboard.up("j");
await mission.getByRole("button", { name: "追踪探索", exact: true }).click();
await mission.waitForFunction(
  () =>
    /旧木箱/.test(document.querySelector(".wild-interact")?.textContent || ""),
  null,
  { timeout: 20000 },
);
await mission.keyboard.press("e");
await waitRecord(mission, "0:chest0");
await campInteract(mission);
await waitRecord(mission, "0:bounty");
const complete = await saved(mission);
await mission.keyboard.press("e");
await mission.waitForTimeout(150);
assert.equal((await saved(mission)).coins, complete.coins);
await mission.getByRole("button", { name: "操作 ?", exact: true }).click();
await mission.getByRole("button", { name: "开始探索", exact: true }).click();
const before = (await saved(mission)).wildPosition;
await mission.keyboard.press(" ");
await mission.waitForTimeout(1900);
const after = (await saved(mission)).wildPosition;
assert(
  Math.hypot(after.x - before.x, after.y - before.y) > 45,
  "stationary dodge must displace the player",
);
await mission.reload();
await mission.getByRole("button", { name: "继续旅途", exact: true }).click();
await ready(mission);
assert.match(await mission.locator(".wild-objective").innerText(), /已完成/);
assert.deepEqual(errors, []);
console.log(
  "PASS ranged-enemy combat, hold combo, painted-map mission, one-time bounty and actual dodge movement",
);
await mission.close();
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto(baseURL);
await mobile.getByRole("button", { name: "点灯启程", exact: true }).click();
await ready(mobile);
await mobile.waitForTimeout(1800);
const beforeStick = (await saved(mobile)).wildPosition;
const stickBox = await mobile
  .getByRole("group", { name: "自由方向摇杆" })
  .boundingBox();
await mobile.mouse.move(
  stickBox.x + stickBox.width / 2,
  stickBox.y + stickBox.height / 2,
);
await mobile.mouse.down();
await mobile.mouse.move(
  stickBox.x + stickBox.width / 2 + 22,
  stickBox.y + stickBox.height / 2 + 22,
);
await mobile.waitForTimeout(350);
await mobile.mouse.up();
await mobile.waitForTimeout(1700);
const afterStick = (await saved(mobile)).wildPosition;
assert(
  afterStick.x > beforeStick.x + 15 && afterStick.y > beforeStick.y + 15,
  "joystick must allow diagonal movement",
);
await mobile.screenshot({ path: "work/action-mobile.png", fullPage: true });
assert.equal(
  await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  ),
  false,
);
await mobile.locator(".wild-actions button").first().tap();
assert.deepEqual(errors, []);
console.log(
  "PASS touch joystick diagonal movement, mobile attack and no horizontal overflow",
);
await browser.close();
server?.kill();
