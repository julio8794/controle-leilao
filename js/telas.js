/* ---------- telas: painel, lista, comparar ---------- */
let vmodo="lista";
function renderBg(){
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
  $("#fab").style.display=["avaliar","config","editais"].includes(tab)||!podeGerir()?"none":"";
  if(tab==="avaliar"){$("#main").innerHTML=avaliarHTML();bindAv();return}
  if(tab==="config"){renderConfig();return}
  if(tab==="editais"){$("#main").innerHTML=editaisHTML();bindEditais();return}
  $("#main").innerHTML=tab==="painel"?painel():(vmodo==="comparar"?comparar():lista());
  bindMain();
}
function vivos(){return vehicles}
// "minha" = já arrematada (arrematado, em preparação, à venda ou vendida). Em avaliação = ainda na vistoria.
const MINHA=v=>!["avaliacao","descartada"].includes(v.status||"avaliacao");
const minhas=()=>vivos().filter(MINHA),emVistoria=()=>vivos().filter(v=>(v.status||"avaliacao")==="avaliacao"),descartadas=()=>vivos().filter(v=>v.status==="descartada");
let verDesc=false;
function painelBody(){
  const cs=minhas().map(v=>({v,c:calc(v)}));
  const vend=cs.filter(x=>x.c.vendido),est=cs.filter(x=>!x.c.vendido);
  const empatado=est.reduce((a,{c})=>a+c.pagamento+c.real,0),aGastar=est.reduce((a,{c})=>a+c.previsto,0),retorno=est.reduce((a,{c})=>a+(c.venda||0),0);
  const lucroReal=vend.reduce((a,{c})=>a+c.lucro,0),custoVend=vend.reduce((a,{c})=>a+c.custo,0);
  const lucroProj=est.reduce((a,{c})=>a+(isFinite(c.lucro)?c.lucro:0),0);
  const diasV=vend.map(x=>x.c.dias).filter(d=>d!=null);const giro=diasV.length?Math.round(diasV.reduce((a,b)=>a+b,0)/diasV.length):null;
  // prazos
  const pzs=[];minhas().forEach(v=>prazosDe(v).filter(p=>!p.feito).forEach(p=>pzs.push({...p,v})));pzs.sort((a,b)=>a.d-b.d);
  // lucro por mês
  const mes={};vend.forEach(({v,c})=>{const k=(v.dataVenda||"").slice(0,7);if(k)mes[k]=(mes[k]||0)+c.lucro});
  const meses=Object.keys(mes).sort().slice(-6);const mx=Math.max(1,...meses.map(k=>Math.abs(mes[k])));
  // sócios
  const soc={};cs.forEach(({v,c})=>{const s=v.socios||[];const t=s.reduce((a,x)=>a+num(x.aporte),0);if(!t)return;s.forEach(x=>{const n=(x.nome||"—").trim();soc[n]=soc[n]||{ap:0,lu:0};soc[n].ap+=num(x.aporte);if(isFinite(c.lucro))soc[n].lu+=c.lucro*num(x.aporte)/t})});
  const STM=Object.keys(STATUS).filter(k=>!["avaliacao","descartada"].includes(k));const cnt={};STM.forEach(s=>cnt[s]=cs.filter(x=>x.v.status===s).length);
  const emAv=emVistoria().length;
  return `
  ${pzs.length?`<div class="sec-t">⏰ Próximos prazos</div><div class="card">${pzs.slice(0,6).map(p=>`<div class="pzl ${p.dias<0?"atr":p.dias<=3?"perto":""}" data-open="${p.v.id}"><b>${esc(p.t)}</b><span>${esc(p.v.modelo||"")}${p.v.lote?" · lote "+esc(p.v.lote):""}</span><em>${p.dias<0?`atrasado ${-p.dias}d`:p.dias===0?"hoje":`${p.d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})} · ${p.dias}d`}</em></div>`).join("")}</div>`:""}
  <div class="sec-t">🏍 Minhas motos · ${cs.length}</div>
  ${cs.length?`<div class="grid list minhas">${cs.sort((a,b)=>(a.v.status==="vendido")-(b.v.status==="vendido")||(b.v.criado||0)-(a.v.criado||0)).map(({v,c})=>minhaCard(v,c)).join("")}</div>`:`<div class="card empty"><p>Nenhuma moto arrematada ainda.${emAv?` Há ${emAv} em vistoria na aba Veículos.`:""}</p></div>`}
  <div class="fin">
  <div class="sec-t">💵 Caixa</div>
  <div class="grid kpis">
    <div class="card kpi"><span>Dinheiro empatado</span><b class="num">${brl(empatado)}</b><small>${est.length} moto(s) não vendida(s)</small></div>
    <div class="card kpi"><span>Ainda a gastar</span><b class="num">${brl(aGastar)}</b><small>orçamento pendente + documentação</small></div>
    <div class="card kpi"><span>Retorno previsto</span><b class="num">${brl(retorno)}</b><small>lucro previsto ${brl(lucroProj)}</small></div>
    <div class="card kpi"><span>Lucro realizado</span><b class="num ${lucroReal>=0?"pos":"neg"}">${brl(lucroReal)}</b><small>ROI ${pct(custoVend?lucroReal/custoVend:NaN)} · giro ${giro!=null?giro+"d":"—"}</small></div>
  </div>
  ${meses.length?`<div class="sec-t">📅 Lucro por mês</div><div class="card"><div class="bars">${meses.map(k=>`<div class="bar"><i class="${mes[k]<0?"neg":""}" style="height:${Math.abs(mes[k])/mx*100}%"></i><b>${brl(mes[k]).replace(",00","")}</b><span>${k.slice(5)}/${k.slice(2,4)}</span></div>`).join("")}</div></div>`:""}
  ${Object.keys(soc).length?`<div class="sec-t">🤝 Sócios</div><div class="card">${Object.entries(soc).map(([n,x])=>`<div class="rank"><span class="nm">${esc(n)}</span><span class="mini" style="margin:0">aportou ${brl(x.ap)}</span><b class="num ${x.lu>=0?"pos":"neg"}">${brl(x.lu)}</b></div>`).join("")}<div class="mini">Lucro previsto + realizado, dividido pelo aporte em cada moto.</div></div>`:""}
  <div class="sec-t">Status da frota</div>
  <div class="card"><div class="stack" style="height:18px">${STM.map(s=>cnt[s]?`<i style="width:${cnt[s]/Math.max(1,cs.length)*100}%;background:${STCOL[s]}"></i>`:"").join("")}</div>
  <div class="legend">${STM.map(s=>`<div><span class="dot" style="background:${STCOL[s]}"></span>${STATUS[s]}<span class="v">${cnt[s]}</span></div>`).join("")}</div></div>
  </div>`;
}
function minhaCard(v,c){const s=v.status;const pz=prazosDe(v).filter(p=>!p.feito).sort((a,b)=>a.d-b.d)[0];
  return `<div class="card vcard minha" data-open="${v.id}">
    <div class="vtop"><div><h3>${esc(v.modelo||"Sem nome")} ${v.ano?`<span style="color:var(--mut);font-weight:500">${esc(v.ano)}</span>`:""}</h3><div class="sub">${[v.placa,v.lote&&"Lote "+v.lote,v.retirado?"✓ comigo":(v.nota&&v.nota.patio?"📍 "+v.nota.patio:"")].filter(Boolean).map(esc).join(" · ")||"—"}</div></div><span class="chip st-${s}">${STATUS[s]}</span></div>
    ${(v.alertasDocs||[]).length?`<div class="mini neg">⚠ ${esc(v.alertasDocs[0].txt)}${v.alertasDocs.length>1?` (+${v.alertasDocs.length-1})`:""}</div>`:""}
    <div class="fin"><div style="margin-top:10px">${stackHTML(c.porCat,c.custo,8)}</div>
    <div class="vnums"><div><span>Custo total</span><b>${brl(c.custo)}</b></div><div><span>${c.vendido?"Vendido":"Venda alvo"}</span><b>${c.venda?brl(c.venda):"—"}</b></div><div><span>${c.vendido?"Lucro real":"Lucro previsto"}</span><b class="${c.lucro>=0?"pos":"neg"}">${isFinite(c.lucro)?brl(c.lucro):"—"}</b></div></div></div>
    <div class="mini">${c.dias!=null?`${c.dias} dias desde o leilão`:""}${pz?` · ⏰ ${esc(pz.t)} ${pz.dias<0?`<b class="neg">atrasado ${-pz.dias}d</b>`:pz.dias===0?"hoje":"em "+pz.dias+"d"}`:""}</div>
  </div>`}
function painel(){if(!vivos().length)return pacoteBanner()+emptyHTML();return pacoteBanner()+painelBody()}
function filtrados(){const f=filtro.toLowerCase();
  return (verDesc?descartadas():emVistoria()).filter(v=>(!fgrupoId||v.grupoId===fgrupoId)&&(!f||[v.modelo,v.placa,v.leiloeiro,v.lote,v.grupo,v.cor,(v.vistoria||{}).resp].join(" ").toLowerCase().includes(f)))}
function barraFiltro(){return `${pacoteBanner()}<div class="toolbar"><input id="busca" placeholder="Buscar modelo, lote, responsável…" value="${esc(filtro)}">
  <select id="fgr"><option value="">Todos os editais</option>${grupos.map(g=>`<option value="${g.id}" ${fgrupoId===g.id?"selected":""}>${esc(g.nome)}</option>`).join("")}</select>
  
  ${podeGerir()?`<div class="toolbar" style="margin:0;width:100%"><button class="btn ghost sm" id="impLink">🔗 Lote por link</button><button class="btn ghost sm" id="impPl">⬆ Planilha</button><button class="btn ghost sm" id="impAudio">🎤 Áudio de vistoria</button><button class="btn ghost sm fin" id="expPl">⬇ Exportar</button></div>`:""}<div class="seg2"><button data-vm="lista" class="${vmodo==="lista"?"on":""}">📋 Lista</button><button data-vm="comparar" class="${vmodo==="comparar"?"on":""} fin">🏁 Comparar</button></div></div>`}
// Lucro em R$ e última atualização em todo card da lista.
// Em avaliação estima o lucro se arrematar pelo lance atual do leilão (ou o lance mínimo).
function barraLances(){const ms=filtrados().filter(v=>(v.status||"avaliacao")==="avaliacao");if(!ms.length)return "";
  const ult=ms.map(v=>laInfo(v)&&laInfo(v).em).filter(Boolean).sort();const velho=ult.length?ult[0]:null;
  return `<div class="lances-bar fin"><button class="btn sm" id="listaLances">🔄 Puxar lances atuais${fgrupoId?" do edital":""}</button><span>${ms.length} moto(s) em avaliação · ${ult.length?`mais antigo lido ${haQuanto(velho)}`:"nenhum lance lido ainda"}</span></div>`}
// lance máximo usado nas contas: o "Meu limite" (se você fixou) ou o sugerido pela % da FIPE
function lanceMaxDe(v,c){c=c||calc(v);const lim=num((v.vistoria||{}).limite);return lim?{valor:lim,tipo:"limite"}:(c.lmax?{valor:c.lmax,tipo:c.lmaxBase}:null)}
const brlC=x=>(x<0?"−":"")+"R$ "+Math.round(Math.abs(x)).toLocaleString("pt-BR");
function heroLances(v,c){
  const la=laInfo(v);const lm=lanceMaxDe(v,c);const L=lm?calc({...v,lance:String(lm.valor)}):null;const LA=la?calc({...v,lance:String(la.valor)}):null;
  const ok=L&&isFinite(L.lucro);const acima=la&&lm&&la.valor+(la.inc||0)>lm.valor;
  return `<div class="hero-l fin">
    <div class="hl"><span>${la?"Lance atual":"Lance mínimo"}</span><b>${la?brlC(la.valor):v.lanceMin?brlC(num(v.lanceMin)):"—"}</b><small>${la?haQuanto(la.em):"sem leitura"}</small></div>
    <button class="hl hl-max ${acima?"estourou":""}" data-noopen="1" data-lmx="${v.id}"><span>Lance máx. ✎</span><b>${lm?brlC(lm.valor):"—"}</b><small>${!lm?"sem FIPE/venda":lm.tipo==="limite"?"seu limite":lm.tipo==="fipe"?`${c.pctF}% da FIPE`:"pela margem"}${acima?" · ⚠ passou":""}</small></button>
    <div class="hl ${ok?(L.lucro>=0?"pos":"neg"):""}"><span>Lucro líquido</span><b>${ok?(L.lucro>=0?"+":"")+brlC(L.lucro):"—"}</b><small>${LA&&isFinite(LA.lucro)?`no atual ${brlC(LA.lucro)}`:"no lance máx."}</small></div>
  </div>`}
function lmxEditor(v){const c=calc(v);const lim=num((v.vistoria||{}).limite);
  return `<div class="lmx-ed fin" data-noopen="1" id="lmx-${v.id}">
   ${c.fipe?`<div class="lmx-top"><b>Teto do investimento: <span data-lmxv="pct">${c.pctF}</span>% da FIPE</b><small>FIPE ${brl(c.fipe)}</small></div>
   <input type="range" min="30" max="100" step="1" value="${c.pctF}" data-lmxr="${v.id}">
   <div class="lmx-tab">
     <div><span>Teto (FIPE × %)</span><b data-lmxv="teto">${brl(c.teto)}</b></div>
     <div><span>− Custas do edital</span><b>${brl(c.cu.fixas+c.extras)}</b></div>
     <div><span>− Documentação / pendências${c.usaServ?" (serviços)":""}</span><b>${brl(c.docsPrev)}</b></div>
     <div><span>− Vistoria (orçado + ${c.cu.conting}% reserva)</span><b>${brl(c.orcTot*(1+c.cu.conting/100))}</b></div>
     <div><span>÷ comissão ${c.cu.comPct}%${c.cu.admPct?` + adm ${c.cu.admPct}%`:""}</span><b></b></div>
     <div class="tot"><span>= Lance máximo (só o lance)</span><b data-lmxv="lmax">${brl(c.lmax)}</b></div>
     <div><span>Lucro líquido nesse lance (venda ${brl(c.V)})</span><b data-lmxv="lucro">—</b></div>
   </div>`:`<div class="mini">Sem FIPE: informe a FIPE na aba Dados para calcular pela %. Hoje a conta usa venda alvo − margem.</div>`}
   <div class="toolbar" style="margin:8px 0 0">${c.fipe?`<button class="btn sm" data-lmxsave="${v.id}">Salvar %</button><button class="btn ghost sm" data-lmxpad="${v.id}">Padrão (${num(PCFG.pctFipe)||70}%)</button>`:""}
     <button class="btn ghost sm" data-lmxfix="${v.id}">${lim?"Trocar meu limite pelo sugerido":"Fixar como meu limite"}</button>${lim?`<button class="btn ghost sm" data-lmxclr="${v.id}">Limpar meu limite (${brl(lim)})</button>`:""}<button class="btn ghost sm" data-lmxx="1">Fechar</button></div>
  </div>`}
let lmxAberto=null;
function lista(){
  if(!vivos().length)return barraFiltro()+emptyHTML();
  const nd=descartadas().length;
  const tg=nd||verDesc?`<div class="seg-desc"><button data-vdesc="0" class="${verDesc?"":"on"}">🔍 Em vistoria · ${emVistoria().length}</button><button data-vdesc="1" class="${verDesc?"on":""}">🚫 Sem interesse · ${nd}</button></div>`:"";
  if(!verDesc&&!emVistoria().length)return barraFiltro()+tg+`<div class="card empty"><div class="big">🔍</div><h3>Nenhuma moto em vistoria</h3><p>As motos já arrematadas ficam na aba 📊 Painel, em "Minhas motos". Importe um edital ou um lote por link para avaliar novas motos.</p></div>`;
  const arr=filtrados();
  return barraFiltro()+tg+(verDesc?"":barraLances())+`<div class="grid list">${arr.map(v=>{const c=calc(v);const s=v.status||"avaliacao";const vp=vistProg(v);const vs=v.vistoria||{};const g=grupoDe(v);const nt=notaFinal(v);const desc=s==="descartada";
    return `<div class="card vcard ${v.fotosRef?"has-cover":""} ${desc?"desc":""}" data-open="${v.id}">
      ${v.fotosRef?`<div class="cover"><img src="${esc(v.fotosRef[0])}" alt="" loading="lazy"><div class="cover-tags">${g?`<span>📁 ${esc(g.nome)}</span>`:""}${v.lote?`<span>Lote ${esc(v.lote)}</span>`:""}</div>
        ${canWrite&&podeGerir()?(desc?`<button class="cover-x" data-noopen="1" data-desfaz="${v.id}" title="Voltar para a vistoria">↩</button>`:`<button class="cover-x" data-noopen="1" data-descarta="${v.id}" title="Sem interesse">✕</button>`):""}
        ${desc?"":heroLances(v,c)}</div>`:""}
      <div class="vtop"><div><h3>${esc(v.modelo||"Sem nome")} ${v.ano?`<span style="color:var(--mut);font-weight:500">${esc(v.ano)}</span>`:""}</h3><div class="sub">${[!v.fotosRef&&g?g.nome:"",!v.fotosRef&&v.lote?"Lote "+v.lote:"",v.cor,vs.resp?"👤 "+vs.resp:""].filter(Boolean).map(esc).join(" · ")||"—"}</div></div>
        ${!v.fotosRef&&canWrite&&podeGerir()?(desc?`<button class="btn ghost sm" data-noopen="1" data-desfaz="${v.id}">↩ Voltar</button>`:`<button class="btn ghost sm" data-noopen="1" data-descarta="${v.id}" title="Sem interesse">✕</button>`):`<span class="chip st-${s}">${STATUS[s]}</span>`}</div>
      ${!v.fotosRef&&!desc?heroLances(v,c):""}
      ${lmxAberto===v.id?lmxEditor(v):""}
      <div class="vist-row"><div class="vbar2"><i style="width:${vp.done/vp.tot*100}%"></i></div><span>Vistoria ${vp.done}/${vp.tot}${vp.pb?` · <b class="neg">${vp.pb} ✕</b>`:""}${(v.fotosVist||[]).length?` · 📷 ${v.fotosVist.length}`:""}${nt!=null?` · <b>${nt.toLocaleString("pt-BR")}/10</b>`:""}${(()=>{const r=resumoConf(v);return r?(r.div?` · <b class="neg">⚠ ${r.div} a conferir</b>`:` · <span class="pos">🧩 conferido</span>`):""})()}</span></div>
      ${!c.fipe&&!desc?`<div class="mini">Sem FIPE: o lance máximo usa venda alvo − margem.</div>`:""}
      ${desc&&v.descMotivo?`<div class="mini">Motivo: ${esc(v.descMotivo)}</div>`:""}
    </div>`}).join("")||`<div class="empty">Nada encontrado.</div>`}</div>`;
}
function lmxAtualizar(v,pctNovo){const c=calc({...v,pctFipe:pctNovo});const box=$("#lmx-"+v.id);if(!box)return;
  const set=(k,t)=>{const e=box.querySelector(`[data-lmxv="${k}"]`);if(e)e.textContent=t};
  const L=c.lmax?calc({...v,pctFipe:pctNovo,lance:String(c.lmax)}):null;
  set("pct",pctNovo);set("teto",brl(c.teto));set("lmax",brl(c.lmax));set("lucro",L&&isFinite(L.lucro)?brl(L.lucro):"—");
  const lu=box.querySelector('[data-lmxv="lucro"]');if(lu&&L)lu.className=L.lucro>=0?"pos":"neg"}
document.addEventListener("input",e=>{const r=e.target.closest&&e.target.closest("[data-lmxr]");if(!r)return;const v=vehicles.find(x=>x.id===r.dataset.lmxr);if(v)lmxAtualizar(v,+r.value)});
document.addEventListener("click",e=>{const t=e.target.closest("[data-lmx],[data-lmxsave],[data-lmxpad],[data-lmxfix],[data-lmxclr],[data-lmxx],[data-descarta],[data-desfaz],[data-vdesc]");if(!t)return;
  e.stopPropagation();const id=t.dataset.lmx||t.dataset.lmxsave||t.dataset.lmxpad||t.dataset.lmxfix||t.dataset.lmxclr||t.dataset.descarta||t.dataset.desfaz;const v=vehicles.find(x=>x.id===id);
  if(t.dataset.vdesc!=null){verDesc=t.dataset.vdesc==="1";lmxAberto=null;renderBg();return}
  if(t.dataset.lmxx){lmxAberto=null;renderBg();return}
  if(!v)return;
  if(t.dataset.lmx){lmxAberto=lmxAberto===id?null:id;renderBg();if(lmxAberto)setTimeout(()=>{lmxAtualizar(v,pctFipeDe(v));const b=$("#lmx-"+id);if(b)b.scrollIntoView({block:"nearest",behavior:"smooth"})},30);return}
  if(!canWrite)return toast("Somente visualização");
  if(t.dataset.lmxsave){const r=document.querySelector(`[data-lmxr="${id}"]`);v.pctFipe=r?String(r.value):v.pctFipe;persist(v);toast(`Lance máx. em ${v.pctFipe}% da FIPE ✓`);renderBg();setTimeout(()=>lmxAtualizar(v,pctFipeDe(v)),30);return}
  if(t.dataset.lmxpad){delete v.pctFipe;persist(v);renderBg();setTimeout(()=>lmxAtualizar(v,pctFipeDe(v)),30);return}
  if(t.dataset.lmxfix){const r=document.querySelector(`[data-lmxr="${id}"]`);const c=calc(r?{...v,pctFipe:r.value}:v);if(!c.lmax)return toast("Sem FIPE ou venda alvo para calcular");if(r)v.pctFipe=String(r.value);v.vistoria=v.vistoria||{checks:{}};v.vistoria.limite=String(Math.floor(c.lmax/50)*50);persist(v);toast(`Meu limite: ${brl(num(v.vistoria.limite))} ✓`);renderBg();return}
  if(t.dataset.lmxclr){v.vistoria.limite="";persist(v);renderBg();return}
  if(t.dataset.descarta){if(t.dataset.conf!=="1"){t.dataset.conf="1";t.classList.add("conf");t.textContent="Sem interesse?";setTimeout(()=>{if(t.isConnected){t.dataset.conf="";t.classList.remove("conf");t.textContent="✕"}},3000);return}
    v.statusAntes=v.status;v.status="descartada";v.descEm=new Date().toISOString();persist(v);if(lmxAberto===id)lmxAberto=null;renderBg();toast(`${v.modelo||"Moto"} saiu da vistoria (veja em "Sem interesse")`);return}
  if(t.dataset.desfaz){v.status="avaliacao";delete v.descEm;persist(v);renderBg();toast("Voltou para a vistoria ✓");return}
},true);
function comparar(){
  const arr=filtrados().filter(v=>!["vendido"].includes(v.status));
  const tk="leilaoTeto_"+(fgrupoId||"todos");let teto=0;try{teto=num(localStorage.getItem(tk))}catch(e){}
  const rows=arr.map(v=>{const c=calc(v);const lim=num((v.vistoria||{}).limite)||c.lmax;const c2=calc({...v,lance:String(lim)});return {v,c,lim,lucro:lim?c2.lucro:NaN,roi:lim?c2.roi:NaN,nota:notaFinal(v)}})
    .sort((a,b)=>(isFinite(b.lucro)?b.lucro:-1e12)-(isFinite(a.lucro)?a.lucro:-1e12));
  let soma=0;const cabe=new Set();if(teto){[...rows].filter(r=>r.v.status==="avaliacao"&&r.lim&&isFinite(r.roi)&&r.roi>0).sort((a,b)=>b.roi-a.roi).forEach(r=>{const custo=r.lim*(1+(r.c.cu.comPct+r.c.cu.admPct)/100);if(soma+custo<=teto){soma+=custo;cabe.add(r.v.id)}})}
  const arrem={};vivos().forEach(v=>{const L=v.leilao||{};if(num(L.valorFinal)){const f=familia(v.modelo);(arrem[f]=arrem[f]||[]).push(num(L.valorFinal))}});
  return barraFiltro()+`<div class="toolbar" style="margin:0 0 10px"><button class="btn ghost sm" id="cmpLances">🔄 Atualizar lances${fgrupoId?" do edital":""}</button><span class="mini" style="margin:0">Lê o maior lance de cada lote no site do leiloeiro (sem custo).</span></div><div class="card"><div class="f2"><label>💰 Teto do dia (quanto posso gastar em lances)<input id="teto" inputmode="decimal" value="${esc(fmtIn(teto||""))}" placeholder="Ex.: 15000"></label>
     <div class="mini" style="align-self:end">${teto?`Cabem ${cabe.size} moto(s): ${brl(soma)} com comissão/taxas, priorizando o melhor retorno.`:"Informe o teto para o app escolher as motos que cabem."}</div></div></div>
  <div class="card cmpw"><table class="tcmp big"><tr><th>Moto</th><th>Nota</th><th>Orçado</th><th>Lance mín.</th><th>Lance atual</th><th>Limite</th><th>Lucro no limite</th><th>ROI</th>${teto?"<th>Teto</th>":""}</tr>
   ${rows.map(r=>`<tr data-open="${r.v.id}"><td><b>${esc(r.v.modelo||"—")}</b><small>${[r.v.lote?"lote "+r.v.lote:"",r.v.ano].filter(Boolean).map(esc).join(" · ")}</small></td>
     <td>${r.nota!=null?r.nota.toLocaleString("pt-BR"):"—"}</td><td>${brl(r.c.orcTot+r.c.docsPrev)}</td><td>${r.v.lanceMin?brl(num(r.v.lanceMin)):"—"}</td><td>${(()=>{const la=laInfo(r.v);if(!la)return "—";const prox=la.valor+(la.inc||0);return `<b>${brl(la.valor)}</b>${r.lim&&prox>r.lim?" 🔴":r.lim?" 🟢":""}<small>${haQuanto(la.em)}${la.qtd?` · ${la.qtd} lances`:""}</small>`})()}</td>
     <td>${r.lim?brl(r.lim):"—"}${num((r.v.vistoria||{}).limite)?"":`<small>calculado</small>`}</td><td class="${r.lucro>=0?"pos":"neg"}">${isFinite(r.lucro)?brl(r.lucro):"—"}</td><td>${isFinite(r.roi)?pct(r.roi):"—"}</td>${teto?`<td>${cabe.has(r.v.id)?"✅":"—"}</td>`:""}</tr>`).join("")||`<tr><td colspan="8">Nenhuma moto.</td></tr>`}</table></div>
  <div class="mini">Limite = o seu lance limite ou, se vazio, o lance máximo calculado. Lucro no limite = venda alvo − custo previsto, arrematando pelo limite.</div>
  ${Object.keys(arrem).length?`<div class="sec-t">📊 Arremates registrados (base real)</div><div class="card">${Object.entries(arrem).map(([f,vs])=>`<div class="rank"><span class="nm">${esc(f||"—")}</span><span class="mini" style="margin:0">${vs.length} leilão(ões)</span><b class="num">${brl(mediana(vs))}</b></div>`).join("")}<div class="mini">Mediana do valor final de arremate por modelo.</div></div>`:""}`;
}
function bindMain(){
  document.querySelectorAll("[data-open]").forEach(el=>el.onclick=e=>{if(e.target.closest("[data-noopen],.lmx-ed"))return;openEditor(el.dataset.open)});
  document.querySelectorAll("[data-gver2]").forEach(el=>el.onclick=()=>{fgrupoId=el.dataset.gver2;vmodo="lista";tab="veiculos";render()});
  const b=$("#busca");if(b)b.oninput=e=>{filtro=e.target.value;const p=b.selectionStart;renderBg();const nb=$("#busca");nb.focus();nb.setSelectionRange(p,p)};
  const fs=$("#fst");if(fs)fs.onchange=e=>{fstatus=e.target.value;renderBg()};
  const fg=$("#fgr");if(fg)fg.onchange=e=>{fgrupoId=e.target.value;renderBg()};
  document.querySelectorAll("[data-vm]").forEach(x=>x.onclick=()=>{vmodo=x.dataset.vm;renderBg()});
  const te=$("#teto");if(te)te.onchange=()=>{try{localStorage.setItem("leilaoTeto_"+(fgrupoId||"todos"),String(num(te.value)))}catch(e){}renderBg()};
  document.querySelectorAll("[data-pkg]").forEach(x=>x.onclick=()=>importarPacote(x.dataset.pkg));
  const en=$("#eNew");if(en)en.onclick=abrirNovo;
  const il=$("#impLink");if(il)il.onclick=abrirImportLink;const ip=$("#impPl");if(ip)ip.onclick=abrirImportPlanilha;const ep=$("#expPl");if(ep)ep.onclick=exportarPlanilha;
  const ed=$("#eDemo");if(ed)ed.style.display="none";
}
function newV(){
  if(!podeGerir())return;
  const g=grupos.find(x=>x.id===fgrupoId);
  const v={id:uid(),modelo:"",ano:"",placa:"",cor:"",status:"avaliacao",grupoId:g?g.id:"",grupo:g?g.nome:"",leiloeiro:g?g.leiloeiro||"":"",dataLeilao:g?g.data_leilao||"":"",lote:"",fipe:"",lance:"",despesas:[],orcado:[],vistoria:{checks:{}},vendaPretendida:"",vendaValor:"",dataVenda:"",obs:"",criado:Date.now()};
  vehicles.unshift(v);openEditor(v.id,true);
}
