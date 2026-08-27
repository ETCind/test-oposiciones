const BUILD='ghsafe-v3-audited-20260827';
const CACHE='test-oposiciones-'+BUILD;
const q=p=>`${p}?build=${BUILD}`;
const LOCAL=[
  './',q('./index.html'),q('./styles.css'),q('./pdfjs-loader.mjs'),q('./seed-library.js'),
  q('./sync-core.js'),q('./db.js'),q('./parser-core.js'),q('./pdf-importer.js'),
  q('./report-core.js'),q('./app.js'),q('./private-mobile.js'),'./manifest.webmanifest',
  q('./autotest.html'),q('./autotest.js'),'./assets/icon-192.png','./assets/icon-512.png',
  q('./assets/import-selftest.pdf')
];

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
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{return await fetch(event.request,{cache:'no-store'});}catch{
        return (await caches.match(q('./index.html'))) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);if(cached)return cached;
    try{const r=await fetch(event.request,{cache:'no-store'});if(r&&r.ok){const c=await caches.open(CACHE);c.put(event.request,r.clone()).catch(()=>{});}return r;}catch(e){throw e;}
  })());
});
