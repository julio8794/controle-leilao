/* ---------- lances ao vivo (página pública do lote; leitura por código, sem custo) ---------- */
const laInfo=v=>{const L=v.leilao||{};return num(L.lanceAtual)?{valor:num(L.lanceAtual),em:L.lanceAtualEm,inc:num(L.incremento),qtd:L.lancesQtd}:null};
const haQuanto=iso=>{if(!iso)return "";const m=Math.round((Date.now()-new Date(iso))/6e4);return m<1?"agora":m<60?`há ${m} min`:m<1440?`há ${Math.round(m/60)} h`:new Date(iso).toLocaleDateString("pt-BR")};
function limiteDe(v){const l=num((v.vistoria||{}).limite);if(l)return {valor:l,tipo:"seu limite"};const c=calc(v);return c.lmax?{valor:c.lmax,tipo:"lance máx. calculado"}:null}
function alertaLance(v){const la=laInfo(v),li=limiteDe(v);if(!la||!li)return "";const prox=la.valor+(la.inc||0);
  return prox>li.valor?`<b class="neg">🔴 próximo lance ${brl(prox)} passa do ${li.tipo} (${brl(li.valor)})</b>`:`<span class="pos">🟢 cabe: próximo lance ${brl(prox)} ≤ ${li.tipo} ${brl(li.valor)}</span>`}
async function atualizarLances(ms,aviso){
  const alvo=ms.filter(v=>/^https?:\/\//.test(v.link||""));let n=0,mud=0,err=0;const fila=[...alvo];
  const trab=async()=>{while(fila.length){const v=fila.shift();try{const r=await chamarIA("importar_lote",{url:v.link,refazer:true});const la=r.lance_atual&&r.lance_atual.valor;
      v.leilao=v.leilao||{};const ant=num(v.leilao.lanceAtual);const agora=new Date().toISOString();
      if(la!=null){v.leilao.lanceAtual=la;if(la!==ant){mud++;v.leilao.historico=(v.leilao.historico||[]).concat([{em:agora,valor:la}]).slice(-30)}}
      v.leilao.lanceAtualEm=agora;if(r.incremento&&r.incremento.valor)v.leilao.incremento=r.incremento.valor;if(r.lances_qtd&&r.lances_qtd.valor!=null)v.leilao.lancesQtd=r.lances_qtd.valor;
      if(la!=null&&(v.status||"avaliacao")==="avaliacao")v.lance=String(la);
      persist(v)}catch(e){err++}n++;if(aviso)aviso(`🔄 ${n}/${alvo.length}…`)}};
  await Promise.all([trab(),trab(),trab()]);
  return {n:alvo.length,mud,err,sem:ms.length-alvo.length};
}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-glances],#cmpLances,#listaLances");if(!b)return;
  const gid=b.dataset.glances||fgrupoId;const ms=(b.id==="listaLances"&&typeof filtrados==="function"?filtrados():vehicles.filter(v=>!gid||v.grupoId===gid)).filter(v=>(v.status||"avaliacao")==="avaliacao");
  b.disabled=true;const txt=b.textContent;const r=await atualizarLances(ms,t=>b.textContent=t);
  toast(`Lances atualizados: ${r.n} moto(s)${r.mud?` · ${r.mud} mudaram`:""}${r.err?` · ${r.err} com erro`:""}${r.sem?` · ${r.sem} sem link`:""}`);b.textContent=txt;b.disabled=false;render()});
document.addEventListener("click",async e=>{const b=e.target.closest("#laUm");if(!b||!editing)return;b.disabled=true;b.textContent="🔄 Lendo o site…";await atualizarLances([editing]);keepScroll(renderETab)});
