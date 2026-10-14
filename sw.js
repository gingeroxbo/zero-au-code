// De zéro au code : utilisable hors connexion.
// La page et la liste des contenus (contenu.json) passent par le réseau d'abord, pour que les nouveautés arrivent dès qu'il y a du réseau.
// Tout le reste (polices, icônes, moteur Python) vient du cache du téléphone.
const CACHE = "zac-v2";
const SHELL = ["./", "index.html", "contenu.json", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png",
  "fonts/bricolage-grotesque-latin-400-normal.woff2", "fonts/bricolage-grotesque-latin-600-normal.woff2",
  "fonts/bricolage-grotesque-latin-700-normal.woff2", "fonts/bricolage-grotesque-latin-800-normal.woff2",
  "fonts/literata-latin-400-normal.woff2", "fonts/literata-latin-600-normal.woff2", "fonts/literata-latin-400-italic.woff2",
  "fonts/jetbrains-mono-latin-400-normal.woff2", "fonts/jetbrains-mono-latin-600-normal.woff2"];
// Le moteur Python (environ 14 Mo) : téléchargé à l'installation, et complété plus tard si le réseau a coupé.
const PYTHON = ["py/pyodide.js", "py/pyodide.asm.js", "py/pyodide.asm.wasm", "py/pyodide-lock.json", "py/python_stdlib.b64.txt"];

async function sync() {
  const c = await caches.open(CACHE);
  for (const u of PYTHON) {
    if (await c.match(u)) continue;
    try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (_) {}
  }
}

self.addEventListener("install", e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(SHELL)).then(sync).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("message", e => { if (e.data === "sync") e.waitUntil(sync()); });

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const path = u.pathname.split("/").pop();
  const networkFirst = e.request.mode === "navigate" || path === "" || path === "index.html" || path === "contenu.json";
  if (networkFirst) {
    const key = (e.request.mode === "navigate" || path === "") ? "index.html" : path;
    e.respondWith(fetch(e.request, {cache: "no-cache"}).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(CACHE).then(c => c.put(key, k)); }
      return r;
    }).catch(() => caches.match(key, {ignoreSearch: true}).then(r => r || caches.match("index.html"))));
  } else {
    e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); }
      return r;
    })));
  }
});
