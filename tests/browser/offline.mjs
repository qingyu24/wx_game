import { storyMap } from "./ui.mjs";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const html = await readFile("dist/雾灯归途-离线版.html");
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: "reduce",
  });
  const p = await ctx.newPage(),
    errors = [],
    external = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("request", (r) => {
    if (
      !r.url().startsWith(`http://127.0.0.1:${server.address().port}`) &&
      !r.url().startsWith("data:")
    )
      external.push(r.url().slice(0, 100));
  });
  await p.goto(`http://127.0.0.1:${server.address().port}/`);
  await ctx.setOffline(true);
  await p.getByRole("button", { name: "点灯启程" }).click();
  await p.locator('canvas[data-art-ready="true"]').waitFor({ timeout: 20000 });
  await storyMap(p);
  await p
    .getByRole("button", { name: "许婆婆的门灯，交谈", exact: true })
    .click();
  for (let i = 0; i < 4; i++) {
    const next = p.getByRole("button", { name: /^继续$|^记入旅记$/ });
    await next.click();
  }
  await mkdir("work", { recursive: true });
  await p.screenshot({ path: "work/qa-offline.png" });
  const bg = await p
    .locator(".legacy-scene>.scene-art")
    .evaluate((e) => getComputedStyle(e).backgroundImage);
  const portrait = await p
    .locator(".player-bar>.portrait")
    .evaluate((e) => getComputedStyle(e).backgroundImage);
  assert.ok(bg.startsWith('url("data:image/webp;base64,'));
  assert.ok(portrait.startsWith('url("data:image/webp;base64,'));
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.ok(
    await p
      .getByRole("button", { name: "许婆婆的门灯，交谈，已完成", exact: true })
      .isVisible(),
  );
  console.log(
    "PASS standalone HTML: inlined backgrounds and portraits, no external requests, investigation and save while offline",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
