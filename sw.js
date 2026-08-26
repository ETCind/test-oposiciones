const BUILD='ghsafe-v1-20260826';
const CACHE='test-oposiciones-ghsafe-v1-20260826';
const q=p=>`${p}?build=${BUILD}`;
const LOCAL=['./',q('./'),q('./index.html'),q('./styles.css'),q('./seed-library.js'),q('./sync-core.js'),q('./db.js'),q('./parser-core.js'),q('./pdf-importer.js'),q('./report-core.js'),q('./app.js'),q('./private-mobile.js'),'./manifest.webmanifest',q('./autotest.html'),q('./autotest.js'),'./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);for(const url of LOCAL){try{const r=await fetch(url);if(r.ok)await c.put(url,r.clone());}catch{}}self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const u=new URL(event.request.url);if(u.origin!==self.location.origin)return;event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;try{const r=await fetch(event.request);if(r&&r.ok){const c=await caches.open(CACHE);c.put(event.request,r.clone()).catch(()=>{});}return r;}catch(e){if(event.request.mode==='navigate')return caches.match(q('./index.html'))||caches.match('./');throw e;}})());});
