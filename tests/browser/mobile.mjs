import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { freshState } from "../../src/rpg/engine.mjs";
import { LAYOUT_VERSION } from "../../src/rpg/wilds.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
let server;
try {
  await fetch(base, { signal: AbortSignal.timeout(1000) });
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
      await fetch(base, { signal: AbortSignal.timeout(500) });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}
await mkdir("work", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
async function open(viewport, seed) {
  const p = await browser.newPage({ viewport, isMobile: true, hasTouch: true });
  p.on("pageerror", (e) => errors.push(e.message));
  if (seed)
    await p.addInitScript((value) => {
      if (!sessionStorage.getItem("mobile-seed")) {
        localStorage.setItem("mist-lantern-save-v1", JSON.stringify(value));
        sessionStorage.setItem("mobile-seed", "1");
      }
    }, seed);
  await p.goto(base);
  await p
    .getByRole("button", { name: seed ? "继续旅途" : "点灯启程", exact: true })
    .click();
  await p.locator('canvas[data-art-ready="true"]').waitFor({ timeout: 20000 });
  await p.waitForTimeout(1800);
  return p;
}
async function save(p) {
  return p.evaluate(() =>
    JSON.parse(localStorage.getItem("mist-lantern-save-v1")),
  );
}
async function center(locator) {
  const r = await locator.boundingBox();
  assert(r);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
function touch(id, p) {
  return { id, x: p.x, y: p.y, radiusX: 5, radiusY: 5, force: 1 };
}
async function send(cdp, type, points) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}
try {
  const p = await open({ width: 844, height: 390 });
  const canvas = await p.locator(".action-world canvas").boundingBox();
  assert(canvas.x === 0 && canvas.y === 0);
  assert(Math.abs(canvas.width - 844) < 2 && Math.abs(canvas.height - 390) < 2);
  assert.equal(
    await p.evaluate(
      () => document.documentElement.scrollHeight > innerHeight + 1,
    ),
    false,
  );
  await p.screenshot({ path: "work/mobile-landscape.png" });
  const session = await p.context().newCDPSession(p);
  const stick = await center(p.getByRole("group", { name: "自由方向摇杆" }));
  const attack = await center(
    p.getByRole("button", { name: "普攻", exact: true }),
  );
  const magic = await center(
    p.getByRole("button", { name: "灯术", exact: true }),
  );
  const moving = { x: stick.x - 25, y: stick.y + 25 };
  await send(session, "touchStart", [touch(1, moving)]);
  await send(session, "touchStart", [touch(1, moving), touch(2, attack)]);
  await p.waitForTimeout(120);
  await send(session, "touchStart", [
    touch(1, moving),
    touch(2, attack),
    touch(3, magic),
  ]);
  await p.waitForTimeout(45);
  await send(session, "touchEnd", [touch(3, magic)]);
  assert.equal((await save(p)).mp, 4);
  await p.waitForTimeout(1350);
  const combos = [];
  for (let i = 0; i < 5; i++) {
    combos.push(await p.locator(".combo-count").allTextContents());
    await p.waitForTimeout(140);
  }
  assert(
    combos.some((values) => values.length),
    "releasing the skill finger must not stop a held attack",
  );
  await send(session, "touchEnd", []);
  await p.getByRole("button", { name: "暂停", exact: true }).click();
  const paused = await save(p);
  await p.waitForTimeout(450);
  assert.deepEqual((await save(p)).wildPosition, paused.wildPosition);
  await p.getByRole("button", { name: "继续游玩", exact: true }).click();
  await p.close();
  console.log(
    "PASS 844x390 full-viewport battle, three-finger move/attack/skill chord and paused checkpoint",
  );
  const roll = await open({ width: 844, height: 390 });
  const cdp = await roll.context().newCDPSession(roll),
    origin = await save(roll),
    joystick = await center(roll.getByRole("group", { name: "自由方向摇杆" })),
    sword = await center(
      roll.getByRole("button", { name: "普攻", exact: true }),
    ),
    dash = await center(
      roll.getByRole("button", { name: "闪避", exact: true }),
    ),
    left = { x: joystick.x - 28, y: joystick.y };
  await send(cdp, "touchStart", [touch(1, left), touch(2, sword)]);
  await roll.waitForTimeout(40);
  await send(cdp, "touchStart", [
    touch(1, left),
    touch(2, sword),
    touch(3, dash),
  ]);
  await roll.waitForTimeout(30);
  await send(cdp, "touchEnd", [touch(3, dash)]);
  await roll.waitForTimeout(210);
  await send(cdp, "touchEnd", []);
  await roll.keyboard.press(" ");
  const immediate = await roll.evaluate(() => {
    dispatchEvent(new Event("pagehide"));
    return JSON.parse(localStorage.getItem("mist-lantern-save-v1"));
  });
  assert(
    immediate.wildPosition.x < origin.wildPosition.x - 70,
    "pagehide must synchronously store the current position",
  );
  await roll.getByRole("button", { name: "暂停", exact: true }).click();
  const end = await save(roll);
  assert(end.wildPosition.x < origin.wildPosition.x - 70);
  assert(
    end.wildPosition.x > origin.wildPosition.x - 180,
    "cooldown must block a second immediate roll",
  );
  assert(Math.abs(end.wildPosition.y - origin.wildPosition.y) < 20);
  await roll.getByRole("button", { name: "继续游玩", exact: true }).click();
  await roll.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await roll.getByRole("heading", { name: "旅途暂停", exact: true }).waitFor();
  await roll.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert(
    await roll
      .getByRole("button", { name: "继续游玩", exact: true })
      .isVisible(),
  );
  await roll.close();
  console.log(
    "PASS held-attack roll direction, independent roll cooldown and background auto-pause",
  );
  const heal = await open(
    { width: 667, height: 375 },
    { ...freshState(), started: true, hp: 10 },
  );
  await heal.getByRole("button", { name: "药草", exact: true }).tap();
  await heal.keyboard.press("h");
  await heal.waitForTimeout(150);
  const healed = await save(heal);
  assert.equal(healed.herbs, 4);
  assert.equal(healed.hp, 65);
  assert(await heal.locator(".skill-heal .skill-timer").isVisible());
  await heal.screenshot({ path: "work/mobile-small.png" });
  await heal.close();
  console.log(
    "PASS small-landscape HUD and healing cooldown across touch and keyboard",
  );
  const story = await open(
    { width: 844, height: 390 },
    {
      ...freshState(),
      started: true,
      wildPosition: {
        chapter: 0,
        x: 1040,
        y: 650,
        layoutVersion: LAYOUT_VERSION,
      },
      wilds: [
        "0:enemy0",
        "0:enemy1",
        "0:enemy2",
        "0:enemy3",
        "0:enemy4",
        "0:chest0",
        "0:chest1",
        "0:chest2",
      ],
    },
  );
  await story.getByRole("button", { name: /青石山径/ }).tap();
  if (
    await story
      .getByRole("button", { name: "略过对白", exact: true })
      .isVisible()
  )
    await story.getByRole("button", { name: "略过对白", exact: true }).tap();
  else await story.getByRole("button", { name: "举灯迎战", exact: true }).tap();
  await story
    .getByRole("dialog", { name: "回合制战斗", exact: true })
    .waitFor();
  const attackButton = story.locator(".battle-actions>button").first(),
    battleBox = await attackButton.boundingBox();
  assert(battleBox.y >= 0 && battleBox.y + battleBox.height <= 390);
  const beforeLog = await story.locator(".battle-log").innerText();
  await attackButton.tap();
  assert.notEqual(await story.locator(".battle-log").innerText(), beforeLog);
  await story.close();
  console.log(
    "PASS story interaction and original encounter controls inside the landscape game viewport",
  );
  const portrait = await open({ width: 390, height: 844 });
  await portrait
    .getByRole("button", { name: "继续竖屏游玩", exact: true })
    .tap();
  assert.equal(
    await portrait.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await portrait.screenshot({ path: "work/mobile-portrait.png" });
  await portrait.getByRole("button", { name: "暂停", exact: true }).tap();
  await portrait
    .getByRole("dialog")
    .getByRole("button", { name: "行囊", exact: true })
    .tap();
  await portrait
    .getByRole("heading", { name: "灯与行囊", exact: true })
    .waitFor();
  await portrait.getByRole("button", { name: "关闭面板", exact: true }).tap();
  await portrait.setViewportSize({ width: 390, height: 740 });
  await portrait.waitForTimeout(350);
  await portrait.screenshot({ path: "work/mobile-portrait-short.png" });
  assert.equal(
    await portrait.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await portrait.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS portrait fallback and touch-accessible bag/pause menus without page errors",
  );
} finally {
  await browser.close();
  server?.kill();
}
