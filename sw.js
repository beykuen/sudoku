// 離線快取：先給快取、背景更新（下次開啟就是新版）。
// 只處理同網域檔案；PeerJS 的配對連線不經過這裡。
const CACHE = 'sudoku-v1';
const FILES = [
  './', 'index.html', 'peerjs.min.js', 'qrcode.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ?room=12345 這類查詢字串不影響快取比對
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req)
      .then(res => { if (res && res.ok) cache.put(url.origin + url.pathname, res.clone()); return res; })
      .catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('離線中，尚未快取此檔案', { status: 503 });
  })());
});
