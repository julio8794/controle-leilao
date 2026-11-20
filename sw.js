const C="leilao-v19";
const CORE=["./","index.html","manifest.json","icon-192.png","icon-512.png","css/app.css","js/base.js","js/fotosq.js","js/config.js","js/views.js","js/precos.js","js/grupos.js","js/moto.js","js/telas.js","js/ia.js","js/dados.js","js/avaliar2.js","js/custos.js","js/audio.js","js/lances.js","js/consultas.js","js/avaliador.js","js/boot.js","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>0)))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.hostname.endsWith("supabase.co")&&!u.pathname.includes("/storage/"))return;
  if(r.mode==="navigate"||u.pathname.endsWith("index.html")||(u.origin===location.origin&&/\.(js|css)$/.test(u.pathname))){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));return}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==="opaque"){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res})));
});
