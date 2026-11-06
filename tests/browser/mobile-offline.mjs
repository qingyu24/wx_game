import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const root = path.resolve("dist"),
  prefix = "/phone-game/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith(prefix)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const file = path.resolve(
    root,
    decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  const manifest = await (
    await context.request.get(base + "manifest.webmanifest")
  ).json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "landscape");
  assert.equal(manifest.start_url, "./");
  await page.goto(base);
  await page.getByRole("button", { name: "点灯启程", exact: true }).click();
  await page
    .locator('canvas[data-art-ready="true"]')
    .waitFor({ timeout: 20000 });
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    null,
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page
    .getByText("本机离线素材已就绪", { exact: false })
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "继续游玩", exact: true }).click();
  const cacheState = await page.evaluate(async () => {
    const keys = await caches.keys(),
      owned = keys.filter((k) => k.startsWith("mist-lantern-mobile-"));
    const c = await caches.open(owned[0]);
    return (await c.keys()).map((r) => new URL(r.url).pathname);
  });
  assert(
    cacheState.every((p) => p.startsWith(prefix)),
    "cache must stay inside the game project path",
  );
  assert(cacheState.some((p) => p.endsWith("/art/rework/hero-walk.webp")));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "继续旅途", exact: true }).click();
  await page
    .locator('canvas[data-art-ready="true"]')
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "普攻", exact: true }).tap();
  await page.getByRole("button", { name: "暂停", exact: true }).tap();
  await page.getByRole("heading", { name: "旅途暂停", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS install manifest, scoped mobile asset cache and cold reload/play while offline",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
