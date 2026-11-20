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
function painelBody(){
  const all=vivos().map(v=>({v,c:calc(v)}));
  const cs=all.filter(x=>x.v.status!=="avaliacao");
  const vend=cs.filter(x=>x.c.vendido),est=cs.filter(x=>!x.c.vendido);
  const empatado=est.reduce((a,{c})=>a+c.pagamento+c.real,0),aGastar=est.reduce((a,{c})=>a+c.previsto,0),retorno=est.reduce((a,{c})=>a+(c.venda||0),0);
  const lucroReal=vend.reduce((a,{c})=>a+c.lucro,0),custoVend=vend.reduce((a,{c})=>a+c.custo,0);
  const lucroProj=est.reduce((a,{c})=>a+(isFinite(c.lucro)?c.lucro:0),0);
  const diasV=vend.map(x=>x.c.dias).filter(d=>d!=null);const giro=diasV.length?Math.round(diasV.reduce((a,b)=>a+b,0)/diasV.length):null;
  // prazos
  const pzs=[];vivos().forEach(v=>prazosDe(v).filter(p=>!p.feito).forEach(p=>pzs.push({...p,v})));pzs.sort((a,b)=>a.d-b.d);
  // lucro por mês
  const mes={};vend.forEach(({v,c})=>{const k=(v.dataVenda||"").slice(0,7);if(k)mes[k]=(mes[k]||0)+c.lucro});
  const meses=Object.keys(mes).sort().slice(-6);const mx=Math.max(1,...meses.map(k=>Math.abs(mes[k])));
  // vistorias por grupo
  const emAval=all.filter(x=>x.v.status==="avaliacao");
  const porG={};emAval.forEach(({v})=>{const k=v.grupoId||"";(porG[k]=porG[k]||[]).push(v)});
  // sócios
  const soc={};cs.forEach(({v,c})=>{const s=v.socios||[];const t=s.reduce((a,x)=>a+num(x.aporte),0);if(!t)return;s.forEach(x=>{const n=(x.nome||"—").trim();soc[n]=soc[n]||{ap:0,lu:0};soc[n].ap+=num(x.aporte);if(isFinite(c.lucro))soc[n].lu+=c.lucro*num(x.aporte)/t})});
  const cnt={};Object.keys(STATUS).forEach(s=>cnt[s]=vivos().filter(v=>(v.status||"arrematado")===s).length);
  return `
  ${pzs.length?`<div class="sec-t">⏰ Próximos prazos</div><div class="card">${pzs.slice(0,6).map(p=>`<div class="pzl ${p.dias<0?"atr":p.dias<=3?"perto":""}" data-open="${p.v.id}"><b>${esc(p.t)}</b><span>${esc(p.v.modelo||"")}${p.v.lote?" · lote "+esc(p.v.lote):""}</span><em>${p.dias<0?`atrasado ${-p.dias}d`:p.dias===0?"hoje":`${p.d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})} · ${p.dias}d`}</em></div>`).join("")}</div>`:""}
  ${Object.keys(porG).length?`<div class="sec-t">🔍 Vistorias em andamento</div><div class="grid kpis">${Object.entries(porG).map(([gid,vs])=>{const g=grupos.find(x=>x.id===gid);const ok=vs.filter(v=>vistProg(v).done>=CHECKS.length||(v.vistoria&&v.vistoria.status==="vistoriada")).length;
    return `<div class="card kpi" data-gver2="${gid}" style="cursor:pointer"><span>${esc(g?g.nome:"Sem grupo")}</span><b class="num">${ok}/${vs.length}</b><small>vistoriadas${g&&g.data_leilao?` · leilão ${fmtD(g.data_leilao)}`:""}</small><div class="vbar2" style="margin-top:8px"><i style="width:${vs.length?ok/vs.length*100:0}%"></i></div></div>`}).join("")}</div>`:""}
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
  <div class="card"><div class="stack" style="height:18px">${Object.keys(STATUS).map(s=>cnt[s]?`<i style="width:${cnt[s]/Math.max(1,vivos().length)*100}%;background:${STCOL[s]}"></i>`:"").join("")}</div>
  <div class="legend">${Object.keys(STATUS).map(s=>`<div><span class="dot" style="background:${STCOL[s]}"></span>${STATUS[s]}<span class="v">${cnt[s]}</span></div>`).join("")}</div></div>
  </div>`;
}
function painel(){if(!vivos().length)return pacoteBanner()+emptyHTML();return pacoteBanner()+painelBody()}
function filtrados(){const f=filtro.toLowerCase();
  return vivos().filter(v=>(!fstatus||(v.status||"arrematado")===fstatus)&&(!fgrupoId||v.grupoId===fgrupoId)&&(!f||[v.modelo,v.placa,v.leiloeiro,v.lote,v.grupo,v.cor,(v.vistoria||{}).resp].join(" ").toLowerCase().includes(f)))}
function barraFiltro(){return `${pacoteBanner()}<div class="toolbar"><input id="busca" placeholder="Buscar modelo, lote, responsável…" value="${esc(filtro)}">
  <select id="fgr"><option value="">Todos os editais</option>${grupos.map(g=>`<option value="${g.id}" ${fgrupoId===g.id?"selected":""}>${esc(g.nome)}</option>`).join("")}</select>
  <select id="fst"><option value="">Todos os status</option>${Object.entries(STATUS).map(([k,n])=>`<option value="${k}" ${fstatus===k?"selected":""}>${n}</option>`).join("")}</select>
  ${podeGerir()?`<div class="toolbar" style="margin:0;width:100%"><button class="btn ghost sm" id="impLink">🔗 Lote por link</button><button class="btn ghost sm" id="impPl">⬆ Planilha</button><button class="btn ghost sm" id="impAudio">🎤 Áudio de vistoria</button><button class="btn ghost sm fin" id="expPl">⬇ Exportar</button></div>`:""}<div class="seg2"><button data-vm="lista" class="${vmodo==="lista"?"on":""}">📋 Lista</button><button data-vm="comparar" class="${vmodo==="comparar"?"on":""} fin">🏁 Comparar</button></div></div>`}
// Lucro em R$ e última atualização em todo card da lista.
// Em avaliação estima o lucro se arrematar pelo lance atual do leilão (ou o lance mínimo).
// Lucro em R$ calculado no LANCE MÁXIMO (seu limite ou o lance máx. calculado); vendida = lucro real.
function lucroLinha(v,c,s){
  const la=laInfo(v);let k=c,base="venda realizada";
  if(!c.vendido){const li=limiteDe(v);if(li&&li.valor){k=calc({...v,lance:String(li.valor)});base=`no lance máx. ${brl(li.valor)} (${li.tipo==="seu limite"?"seu limite":"calculado"})`+(la?` · atual ${brl(la.valor)}${la.valor>li.valor?" ⚠ acima":""}`:"")}else k=null}
  const ok=k&&isFinite(k.lucro);
  const ts=la&&la.em||[v.atualizadoEm&&new Date(v.atualizadoEm).toISOString(),v.criado&&new Date(v.criado).toISOString()].filter(Boolean).sort().pop();
  return `<div class="lucro-row fin ${ok?(k.lucro>=0?"pos":"neg"):""}"><div><span>${c.vendido?"Lucro real":"Lucro no lance máx."}</span><b>${ok?(k.lucro>=0?"+":"")+brl(k.lucro):"—"}</b><small>${ok?base+(isFinite(k.roi)?" · ROI "+pct(k.roi):""):"falta venda alvo para calcular o lance máx."}</small></div><div class="upd"><span>${la?"Lance lido":"Atualizado"}</span><b>${ts?haQuanto(ts):"—"}</b></div></div>`;
}
function barraLances(){const ms=filtrados().filter(v=>(v.status||"avaliacao")==="avaliacao");if(!ms.length)return "";
  const ult=ms.map(v=>laInfo(v)&&laInfo(v).em).filter(Boolean).sort();const velho=ult.length?ult[0]:null;
  return `<div class="lances-bar fin"><button class="btn sm" id="listaLances">🔄 Puxar lances atuais${fgrupoId?" do edital":""}</button><span>${ms.length} moto(s) em avaliação · ${ult.length?`mais antigo lido ${haQuanto(velho)}`:"nenhum lance lido ainda"}</span></div>`}
function lista(){
  if(!vivos().length)return barraFiltro()+emptyHTML();
  const arr=filtrados();
  return barraFiltro()+barraLances()+`<div class="grid list">${arr.map(v=>{const c=calc(v);const s=v.status||"arrematado";const vp=vistProg(v);const vs=v.vistoria||{};const g=grupoDe(v);const nt=notaFinal(v);
    return `<div class="card vcard ${v.fotosRef?"has-cover":""}" data-open="${v.id}">
      ${v.fotosRef?`<div class="cover"><img src="${esc(v.fotosRef[0])}" alt="" loading="lazy"><div class="cover-tags">${g?`<span>📁 ${esc(g.nome)}</span>`:""}${v.lote?`<span>Lote ${esc(v.lote)}</span>`:""}</div><div class="cover-strip">${v.fotosRef.slice(1).map(u=>`<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div></div>`:""}
      <div class="vtop"><div><h3>${esc(v.modelo||"Sem nome")} ${v.ano?`<span style="color:var(--mut);font-weight:500">${esc(v.ano)}</span>`:""}</h3><div class="sub">${[!v.fotosRef&&g?g.nome:"",!v.fotosRef&&v.lote?"Lote "+v.lote:"",v.cor,vs.resp?"👤 "+vs.resp:""].filter(Boolean).map(esc).join(" · ")||"—"}</div></div><span class="chip st-${s}">${STATUS[s]}</span></div>
      <div class="vist-row"><div class="vbar2"><i style="width:${vp.done/vp.tot*100}%"></i></div><span>Vistoria ${vp.done}/${vp.tot}${vp.pb?` · <b class="neg">${vp.pb} ✕</b>`:""}${(v.fotosVist||[]).length?` · 📷 ${v.fotosVist.length}`:""}${nt!=null?` · <b>${nt.toLocaleString("pt-BR")}/10</b>`:""}${(()=>{const r=resumoConf(v);return r?(r.div?` · <b class="neg">⚠ ${r.div} a conferir</b>`:` · <span class="pos">🧩 conferido</span>`):""})()}</span></div>
      <div class="vnums fin">${s==="avaliacao"?`<div><span>${laInfo(v)?"Lance atual":"Lance mínimo"}</span><b>${laInfo(v)?brl(laInfo(v).valor):v.lanceMin?brl(num(v.lanceMin)):"—"}</b>${laInfo(v)?`<small>${haQuanto(laInfo(v).em)}</small>`:""}</div><div><span>Meu limite</span><b>${num(vs.limite)?brl(num(vs.limite)):"—"}</b></div><div><span>Lance máx. calc.</span><b>${c.lmax?brl(c.lmax):"—"}</b></div>`
        :`<div><span>Custo previsto</span><b>${brl(c.custo)}</b></div><div><span>${c.vendido?"Vendido":"Venda alvo"}</span><b>${c.venda?brl(c.venda):"—"}</b></div><div><span>ROI</span><b class="${c.lucro>=0?"pos":"neg"}">${isFinite(c.roi)?pct(c.roi):"—"}</b></div>`}</div>
      ${lucroLinha(v,c,s)}
    </div>`}).join("")||`<div class="empty">Nada encontrado.</div>`}</div>`;
}
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
  document.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>openEditor(el.dataset.open));
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
