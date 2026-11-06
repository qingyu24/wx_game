import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const prefix = "/wx_game/";
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith(prefix)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const relative =
    decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html";
  const filename = path.resolve("dist", relative);
  if (!filename.startsWith(path.resolve("dist") + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const data = await readFile(filename);
    res.writeHead(200, {
      "Content-Type":
        {
          ".js": "text/javascript",
          ".css": "text/css",
          ".webp": "image/webp",
          ".html": "text/html",
        }[path.extname(filename)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const errors = [];
  const failed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
  await page.getByRole("button", { name: "点灯启程", exact: true }).click();
  await page
    .locator('canvas[data-art-ready="true"]')
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "剧情地图", exact: true }).click();
  const scene = await page
    .locator(".legacy-scene>.scene-art")
    .evaluate(async (el) => {
      const url = getComputedStyle(el).backgroundImage.match(
        /url\(["']?(.*?)["']?\)/,
      )?.[1];
      if (!url) return false;
      const image = new Image();
      image.src = url;
      await image.decode();
      return image.naturalWidth > 0;
    });
  assert(scene, "chapter art must load below /wx_game/");
  assert(
    await page
      .locator(".traveler img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  console.log(
    "PASS built game, chapter art and traveler on /wx_game/ without root assets",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
