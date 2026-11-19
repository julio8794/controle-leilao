const C="leilao-v2";
const CORE=["./","index.html","manifest.json","icon-192.png","icon-512.png","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>0)))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.hostname.endsWith("supabase.co")&&!u.pathname.includes("/storage/"))return;
  if(r.mode==="navigate"||u.pathname.endsWith("index.html")){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));return}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==="opaque"){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res})));
});
