import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = (await readdir("dist/assets"))
  .filter((name) => /\.(js|css)$/.test(name))
  .map((name) => `./assets/${name}`);
const art = (await readdir("dist/art", { recursive: true }))
  .filter((name) => /\.(webp|png)$/.test(name))
  .map((name) => `./art/${name}`);
const files = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./art-review.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  ...assets,
  ...art,
];
const hash = createHash("sha256");
for (const name of files.filter((name) => name !== "./"))
  hash.update(await readFile(`dist/${name.slice(2)}`));
const version = hash.digest("hex").slice(0, 12);
const code = `const CACHE='mist-lantern-mobile-${version}';
const FILES=${JSON.stringify(files)};
const scope=new URL(self.registration.scope);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(new URL(path,scope).href,{cache:'reload'})))));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mist-lantern-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(async()=>await caches.match(request)||await caches.match(new URL('./index.html',scope).href)));
 }else{
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
 }
});
`;
await writeFile("dist/sw.js", code);
console.log(`Mobile package: ${files.length} cached files, version ${version}`);
