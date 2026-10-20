import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { chapters } from "../../src/rpg/content.mjs";
import { freshState, resolveNode } from "../../src/rpg/engine.mjs";
import { mkdir } from "node:fs/promises";
await mkdir("work", { recursive: true });
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
let server;
try {
  await fetch(baseURL, { signal: AbortSignal.timeout(1000) });
} catch {
  server = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "3000"],
    { stdio: "ignore" },
  );
  process.on("exit", () => server?.kill());
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(baseURL, { signal: AbortSignal.timeout(500) });
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!ready) throw Error("Local preview did not become ready.");
}

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const report = [];
async function run(name, fn) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(5000);
  try {
    await fn(page);
    assert.deepEqual(errors, []);
    report.push({ name, status: "PASS" });
    console.log("PASS", name);
  } catch (e) {
    await page.screenshot({
      path: `work/qa-failure-${report.length}.png`,
      fullPage: true,
    });
    report.push({ name, status: "FAIL", error: e.message });
    console.error("FAIL", name, e.message);
  } finally {
    await ctx.close();
  }
}
async function dialog(page) {
  for (let i = 0; i < 12; i++) {
    const b = page.getByRole("button", { name: /^继续$|^收起$|^记入旅记$/ });
    if (!(await b.count())) break;
    await b.first().click();
  }
}
async function seed(page, s) {
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("qa-seeded")) {
      localStorage.setItem("mist-lantern-save-v1", JSON.stringify(value));
      sessionStorage.setItem("qa-seeded", "1");
    }
  }, s);
}
await run(
  "title, investigation, puzzle, manual save and browser reload",
  async (p) => {
    await p.goto(baseURL);
    await p.screenshot({ path: "work/qa-title.png" });
    await p.getByRole("button", { name: "点灯启程" }).click();
    await dialog(p);
    await p
      .getByRole("button", { name: "许婆婆的门灯，交谈", exact: true })
      .click();
    await dialog(p);
    assert.ok(
      await p
        .getByRole("button", {
          name: "许婆婆的门灯，交谈，已完成",
          exact: true,
        })
        .isVisible(),
    );
    await p
      .getByRole("button", { name: "桥头灯台，机关", exact: true })
      .click();
    await p.getByRole("button", { name: "查看机关" }).click();
    for (const name of ["水", "风", "火"])
      await p.getByRole("button", { name, exact: true }).click();
    await dialog(p);
    await p.getByRole("button", { name: "存档", exact: true }).click();
    await p.getByRole("button", { name: "保存", exact: true }).first().click();
    assert.ok(await p.getByText("序章 · 青溪村", { exact: true }).isVisible());
    await p.getByRole("button", { name: "关闭面板" }).click();
    await p.screenshot({ path: "work/qa-scene.png" });
    await p.reload();
    await p.getByRole("button", { name: "继续旅途" }).click();
    assert.ok(
      await p
        .getByRole("button", { name: "桥头灯台，机关，已完成", exact: true })
        .isVisible(),
    );
    const images = await p.evaluate(() =>
      Promise.all(
        ["/art/chapter-0.webp", "/art/portraits.webp", "/art/enemies.webp"].map(
          (url) =>
            new Promise((resolve) => {
              const i = new Image();
              i.onload = () => resolve(i.naturalWidth > 0);
              i.onerror = () => resolve(false);
              i.src = url;
            }),
        ),
      ),
    );
    assert.ok(images.every(Boolean));
  },
);
await run(
  "physical map, direction control, auto-save and map resume",
  async (p) => {
    const s = resolveNode({ ...freshState(), started: true }, 0, "lamp");
    await seed(p, s);
    await p.goto(baseURL);
    await p.getByRole("button", { name: "继续旅途" }).click();
    await p
      .getByRole("button", { name: "青溪旧路，旧路探索", exact: true })
      .click();
    await dialog(p);
    assert.ok(await p.getByRole("heading", { name: "桥下旧渠" }).isVisible());
    await p.getByRole("button", { name: "向右移动" }).click();
    await p.screenshot({ path: "work/qa-expedition.png" });
    const stored = await p.evaluate(() =>
      JSON.parse(localStorage.getItem("mist-lantern-save-v1")),
    );
    assert.equal(stored.expedition.x, 2);
    await p.reload();
    await p.getByRole("button", { name: "继续旅途" }).click();
    await p
      .getByRole("button", { name: "青溪旧路，旧路探索", exact: true })
      .click();
    await dialog(p);
    assert.ok(await p.getByRole("heading", { name: "桥下旧渠" }).isVisible());
  },
);
await run(
  "combat intentions, action feedback, victory and non-repeatable rewards",
  async (p) => {
    await seed(p, { ...freshState(), started: true });
    await p.goto(baseURL);
    await p.getByRole("button", { name: "继续旅途" }).click();
    await p
      .getByRole("button", { name: "青石山径，遭遇", exact: true })
      .click();
    await dialog(p);
    await p.getByRole("button", { name: "举灯迎战" }).click();
    assert.ok(await p.getByRole("heading", { name: "迷途灰蛾" }).isVisible());
    await p.screenshot({ path: "work/qa-battle.png" });
    for (let i = 0; i < 15; i++) {
      if (await p.getByRole("heading", { name: "守住了这盏灯" }).isVisible())
        break;
      const burst = p.getByRole("button", { name: /破雾/ }),
        spell = p.getByRole("button", { name: /引灯术/ });
      if (await burst.isEnabled()) await burst.click();
      else if (await spell.isEnabled()) await spell.click();
      else await p.getByRole("button", { name: /短刃.*回复/ }).click();
    }
    assert.ok(
      await p.getByRole("heading", { name: "守住了这盏灯" }).isVisible(),
    );
    await p.getByRole("button", { name: "继续旅途" }).click();
    assert.ok(
      await p
        .getByRole("button", { name: "青石山径，遭遇，已完成", exact: true })
        .isVisible(),
    );
  },
);
await run(
  "390px mobile layout, touch targets and inventory / journal navigation",
  async (p) => {
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(baseURL);
    await p.getByRole("button", { name: "点灯启程" }).click();
    await dialog(p);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: "work/qa-mobile.png" });
    await p.getByRole("button", { name: "行囊", exact: true }).click();
    assert.ok(await p.getByRole("heading", { name: "灯与行囊" }).isVisible());
    await p.getByRole("button", { name: "关闭面板" }).click();
    await p.getByRole("button", { name: "旅记", exact: true }).click();
    assert.ok(await p.getByRole("heading", { name: "行旅手记" }).isVisible());
  },
);

await run(
  "mobile chapter transition, all three endings and export/import protection",
  async (p) => {
    let s = { ...freshState(), started: true };
    let afterFirst;
    for (const ch of chapters) {
      s = { ...s, chapter: ch.id };
      for (const n of ch.nodes) {
        if (n.kind === "dungeon")
          s = {
            ...s,
            routes: [...s.routes, `${ch.id}.0`, `${ch.id}.1`, `${ch.id}.2`],
          };
        s = resolveNode(s, ch.id, n.id, n.kind === "choice" ? 0 : null);
      }
      if (ch.id === 0) afterFirst = structuredClone(s);
    }
    await seed(p, afterFirst);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(baseURL);
    await p.getByRole("button", { name: "继续旅途" }).click();
    await p.getByRole("button", { name: "前往 雾泊渡" }).click();
    await p.getByRole("dialog").waitFor();
    await dialog(p);
    assert.ok(
      await p.getByRole("heading", { name: "雾泊渡", exact: true }).isVisible(),
    );
    await p.evaluate(
      (value) =>
        localStorage.setItem("mist-lantern-save-v1", JSON.stringify(value)),
      s,
    );
    await p.reload();
    await p.getByRole("button", { name: "继续旅途" }).click();
    await p.getByRole("button", { name: "决定天亮以后的事" }).click();
    await p.getByRole("button", { name: /^破晓/ }).click();
    assert.ok(
      await p.getByRole("heading", { name: "破晓", exact: true }).isVisible(),
    );
    await p.screenshot({ path: "work/qa-ending.png", fullPage: true });
    for (const title of ["远行", "归灯"]) {
      await p.getByRole("button", { name: "回到黎明之前" }).click();
      await p.getByRole("button", { name: "决定天亮以后的事" }).click();
      await p.getByRole("button", { name: new RegExp("^" + title) }).click();
      assert.ok(
        await p.getByRole("heading", { name: title, exact: true }).isVisible(),
      );
    }
    await p.getByRole("button", { name: "回到黎明之前" }).click();
    await p.getByRole("button", { name: "存档", exact: true }).click();
    const download = p.waitForEvent("download");
    await p.getByRole("button", { name: "导出存档" }).click();
    const file = await download;
    assert.ok(file.suggestedFilename().endsWith(".json"));
    const before = await p.evaluate(() =>
      localStorage.getItem("mist-lantern-save-v1"),
    );
    await p.locator("input[type=file]").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
    await p.getByRole("status").filter({ hasText: "格式不正确" }).waitFor();
    assert.equal(
      await p.evaluate(() => localStorage.getItem("mist-lantern-save-v1")),
      before,
    );
  },
);
await browser.close();
server?.kill();
console.log(JSON.stringify(report, null, 2));
if (report.some((r) => r.status === "FAIL")) process.exitCode = 1;
