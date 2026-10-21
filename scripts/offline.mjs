import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
// Produce a single local HTML file. This is packaging, not a second implementation.
const dist = "dist",
  files = await readdir(path.join(dist, "assets"));
const js = files.find((f) => f.endsWith(".js")),
  css = files.find((f) => f.endsWith(".css"));
if (!js || !css) throw Error("Run npm run build before packaging.");
let code = await readFile(path.join(dist, "assets", js), "utf8");
let styles = await readFile(path.join(dist, "assets", css), "utf8");
const art = await readdir(path.join(dist, "art"));
for (const file of art.filter((f) => /\.(webp|png)$/.test(f))) {
  const mime = file.endsWith(".webp") ? "image/webp" : "image/png";
  const uri = `data:${mime};base64,${(await readFile(path.join(dist, "art", file))).toString("base64")}`;
  for (const ref of [`../art/${file}`, `./art/${file}`, `/art/${file}`]) {
    styles = styles.split(ref).join(uri);
    code = code.split(JSON.stringify(ref)).join(JSON.stringify(uri));
  }
  // Dynamic chapter paths share a compact inlined lookup table.
  if (file.startsWith("chapter-") && file.endsWith(".webp")) {
    code = code.replace(
      /url\("\/art\/chapter-\$\{([a-zA-Z_$][\w$]*)\}\.webp"\)/g,
      `url("\${__mistArt[$1]}")`,
    );
  }
}
const chapterData = {};
for (const file of art.filter((f) => /^chapter-\d\.webp$/.test(f))) {
  chapterData[Number(file.match(/\d/)[0])] =
    `data:image/webp;base64,${(await readFile(path.join(dist, "art", file))).toString("base64")}`;
}
// The bundler can rename the parameter, but leaves this literal prefix/suffix intact.
code = code.replace(
  /url\("\/art\/chapter-\$\{([^}]+)\}\.webp"\)/g,
  'url("${__mistArt[$1]}")',
);
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101d24"><title>雾灯归途 · 离线版</title><style>${styles}</style></head><body><div id="root"></div><script type="module">const __mistArt=${JSON.stringify(chapterData)};\n${code.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
const out = process.argv[2] || "dist/雾灯归途-离线版.html";
await writeFile(out, html);
console.log(
  `Offline game: ${out} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB)`,
);
