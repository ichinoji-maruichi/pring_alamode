// ぷるぷる物理 Service Worker
// 単一HTMLコアをキャッシュしてオフラインでも動かす。
// AI機能のCDN（MediaPipe）はキャッシュ対象外 — オンライン時のみ動けばよい。
// リリースごとに必ず bump すること（静的アセットはキャッシュファーストのため、bumpしないと更新が届かない）
const CACHE = "purupuru-v3.0.2";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // 同一オリジンのみ扱う。外部CDN（MediaPipe等）は素通し。
  if(url.origin !== location.origin) return;
  // HTML（ナビゲーション）はネットワーク優先: 更新がすぐ届き、オフライン時だけキャッシュ
  if(e.request.mode === "navigate"){
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }
  // その他はキャッシュファースト
  e.respondWith(
    caches.match(e.request).then(hit => {
      if(hit) return hit;
      return fetch(e.request).then(res => {
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
