document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
$("#fab").onclick=newV;
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&editing)closeEditor()});
initStore();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
