const BUILD='ghsafe-v2.1-20260827';
const CACHE='test-oposiciones-ghsafe-v2.1-20260827';
const q=p=>`${p}?build=${BUILD}`;
const LOCAL=['./',q('./index.html'),q('./styles.css'),q('./pdfjs-loader.mjs'),q('./seed-library.js'),q('./sync-core.js'),q('./db.js'),q('./parser-core.js'),q('./pdf-importer.js'),q('./report-core.js'),q('./app.js'),q('./private-mobile.js'),'./manifest.webmanifest',q('./autotest.html'),q('./autotest.js'),'./assets/icon-192.png','./assets/icon-512.png'];

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  for(const url of LOCAL){
    try{const r=await fetch(url,{cache:'reload'});if(r.ok)await c.put(url,r.clone());}catch{}
  }
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==self.location.origin)return;

  // Navegaciones: red primero. Evita que una versión antigua de la app quede
  // atrapada indefinidamente en la caché del service worker.
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const r=await fetch(event.request,{cache:'no-store'});
        if(r&&r.ok){
          const c=await caches.open(CACHE);
          c.put(q('./index.html'),r.clone()).catch(()=>{});
        }
        return r;
      }catch(e){
        return (await caches.match(q('./index.html'))) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const r=await fetch(event.request);
      if(r&&r.ok){const c=await caches.open(CACHE);c.put(event.request,r.clone()).catch(()=>{});}
      return r;
    }catch(e){throw e;}
  })());
});
