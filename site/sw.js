// CSA service worker: pushmeldingen en een offline-kopie van de app
const CACHE = 'csa-v2';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest', './icon-192.png'])).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// netwerk eerst voor de app-pagina, zodat updates direct zichtbaar zijn; offline valt hij terug op de kopie
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./', c)); return r; }).catch(() => caches.match('./')));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'CSA', body: e.data && e.data.text() }; }
  const imp = !!d.important || d.cat === 'alert' || d.cat === 'order' || (d.score || 0) >= 80;
  const pre = d.cat === 'alert' ? '🔔 ' : d.cat === 'order' ? '✅ ' : imp ? '⚡ ' : '';
  const opts = { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag, data: { url: d.url || '/' }, renotify: !!d.tag, timestamp: Date.now(),
    requireInteraction: imp, vibrate: imp ? [220, 90, 220, 90, 320] : [120], silent: false,
    actions: [{ action: 'open', title: d.cat === 'order' ? 'Bekijk order' : 'Bekijken' }, { action: 'dismiss', title: 'Sluiten' }] };
  e.waitUntil(Promise.all([
    self.registration.showNotification(pre + (d.title || 'Crypto Signal AI'), opts),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.forEach(c => c.postMessage({ type: 'push', d }))),
  ]));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); if (e.action === 'dismiss') return; const url = e.notification.data && e.notification.data.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { for (const c of list) { if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } } return self.clients.openWindow(url); }));
});
