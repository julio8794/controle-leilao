/* ---------- views ---------- */
function render(){renderBg()}
function renderBg(){
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
  $("#fab").style.display=tab==="avaliar"||tab==="config"?"none":"";
  if(tab==="avaliar"){$("#main").innerHTML=avaliarHTML();bindAv();return}
  if(tab==="config"){renderConfig();return}
  $("#main").innerHTML=tab==="painel"?painel():lista();
  bindMain();
}
function painel(){
  if(!vehicles.length)return pacoteBanner()+emptyHTML();
  return pacoteBanner()+painelBody();
}
function painelBody(){
  const cs=vehicles.filter(v=>v.status!=="avaliacao").map(v=>({v,c:calc(v)}));
  const tot=cs.reduce((a,{c})=>a+c.custo,0);
  const vend=cs.filter(x=>x.c.vendido), est=cs.filter(x=>!x.c.vendido);
  const lucroReal=vend.reduce((a,{c})=>a+c.lucro,0), custoVend=vend.reduce((a,{c})=>a+c.custo,0);
  const lucroProj=est.reduce((a,{c})=>a+(c.venda?c.lucro:0),0);
  const capEst=est.reduce((a,{c})=>a+c.custo,0);
  const fat=vend.reduce((a,{c})=>a+c.venda,0);
  const porCat={};Object.keys(CATS).forEach(k=>porCat[k]=cs.reduce((a,{c})=>a+(c.porCat[k]||0),0));
  const cnt={};Object.keys(STATUS).forEach(s=>cnt[s]=vehicles.filter(v=>(v.status||"arrematado")===s).length);
  const maxBar=Math.max(...cs.map(({c})=>Math.max(c.custo,c.venda)),1);
  const diasV=vend.map(x=>x.c.dias).filter(d=>d!=null);
  const giro=diasV.length?Math.round(diasV.reduce((a,b)=>a+b,0)/diasV.length):null;
  const ranked=cs.filter(x=>isFinite(x.c.roi)).sort((a,b)=>b.c.roi-a.c.roi);
  return `
  <div class="grid kpis">
    <div class="card kpi"><span>Total investido</span><b class="num">${brl(tot)}</b><small>${vehicles.length} veículo(s)</small></div>
    <div class="card kpi"><span>Capital em estoque</span><b class="num">${brl(capEst)}</b><small>${est.length} não vendido(s)</small></div>
    <div class="card kpi"><span>Lucro realizado</span><b class="num ${lucroReal>=0?"pos":"neg"}">${brl(lucroReal)}</b><small>ROI ${pct(custoVend?lucroReal/custoVend:NaN)} · fat. ${brl(fat)}</small></div>
    <div class="card kpi"><span>Lucro projetado</span><b class="num ${lucroProj>=0?"pos":"neg"}">${brl(lucroProj)}</b><small>pelos preços-alvo do estoque</small></div>
    <div class="card kpi"><span>Giro médio</span><b class="num">${giro!=null?giro+" dias":"—"}</b><small>do leilão até a venda</small></div>
  </div>
  <div class="sec-t">Status da frota</div>
  <div class="card"><div class="stack" style="height:18px">${Object.keys(STATUS).map(s=>cnt[s]?`<i style="width:${cnt[s]/vehicles.length*100}%;background:${STCOL[s]}"></i>`:"").join("")}</div>
  <div class="legend">${Object.keys(STATUS).map(s=>`<div><span class="dot" style="background:${STCOL[s]}"></span>${STATUS[s]}<span class="v">${cnt[s]}</span></div>`).join("")}</div>
  ${cnt.avaliacao?`<div class="mini">Veículos "Em avaliação" não entram nos totais investidos.</div>`:""}</div>

  <div class="sec-t">Para onde foi o dinheiro</div>
  <div class="card">${stackHTML(porCat,tot,22)}
  <div class="legend">${Object.keys(CATS).map(k=>`<div><span class="dot" style="background:${CATS[k].c}"></span>${CATS[k].i} ${CATS[k].n}<span class="v">${brl(porCat[k])}</span><span class="p">${tot?Math.round(porCat[k]/tot*100):0}%</span></div>`).join("")}</div></div>

  <div class="grid two" style="margin-top:0">
   <div><div class="sec-t">Custo × venda por veículo</div>
   <div class="card">
    ${cs.map(({v,c})=>`<div class="vbar" data-open="${v.id}" style="cursor:pointer"><div><div class="name">${esc(v.modelo||"Sem nome")}</div><div class="lbl">${c.venda?`<span class="${c.lucro>=0?"pos":"neg"}">${c.lucro>=0?"+":""}${brl(c.lucro)}</span>`:"sem preço"}</div></div>
      <div class="track"><div style="width:${c.custo/maxBar*100}%">${stackHTML(c.porCat,c.custo)}</div>${c.venda?`<div class="sale ${c.lucro<0?"neg":""}" style="left:calc(${c.venda/maxBar*100}% - 2px)" title="Venda ${brl(c.venda)}"></div>`:""}</div></div>`).join("")}
    <div class="mini">Barras = custo total por categoria · traço verde = preço de venda (real ou alvo).</div>
   </div></div>
   <div><div class="sec-t">Ranking de ROI</div>
   <div class="card">${ranked.length?ranked.map((x,i)=>`<div class="rank" data-open="${x.v.id}" style="cursor:pointer"><span class="n">${i+1}</span><span class="nm">${esc(x.v.modelo||"Sem nome")}</span><b class="num ${x.c.roi>=0?"pos":"neg"}">${pct(x.c.roi)}</b></div>`).join(""):`<div class="mini">Informe o preço de venda para ver o ROI.</div>`}</div></div>
  </div>

  <div class="sec-t">Backup</div>
  <div class="card"><div class="toolbar" style="margin:0"><button class="btn ghost sm" id="bkCopy">📋 Copiar backup</button><button class="btn ghost sm" id="bkRest">♻️ Restaurar backup</button></div>
  <div id="bkArea" style="display:none;margin-top:10px"><textarea class="bk" id="bkTxt" placeholder="Cole aqui o backup copiado"></textarea><button class="btn sm" id="bkOk" style="margin-top:8px">Importar</button></div></div>`;
}
function emptyHTML(){
  return `<div class="empty card"><div class="big">🚗🔨</div><h3>Nenhum veículo ainda</h3><p>Cadastre seu primeiro arremate e acompanhe pagamento total, despesas estéticas, documentação e lucro.</p>
  <div class="toolbar" style="justify-content:center"><button class="btn" id="eNew">＋ Cadastrar veículo</button><button class="btn ghost" id="eDemo">Ver exemplo</button></div></div>`;
}
/* ---------- pacotes de vistoria ---------- */
const PACOTES=[{id:"alagoinhas-2026-11-19",grupo:"Alagoinhas",data:"2026-11-19",titulo:"Vistoria Alagoinhas",leilao:"DETRAN-BA · Leilão nº 23/2026 · Nordeste Leilões · encerra 25/11 às 9h",local:"Pátio DETRAN: Av. Padre Afonso Godinho, Santa Terezinha, Alagoinhas-BA",
 itens:[
  ["232-001","Honda CG 160 Fan","2022/2023","Preta",2000,"RETROVISORES AUSENTES, CARENAGENS DANIFICADAS, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/232-001-veiculo-conserva-dohondacg-160-fan-20222023"],
  ["231-003","Honda CG 160 Start","2021/2022","Preta",2000,"BANCO RASGADO, CARENAGENS COM DANOS, RETROVISOR ESQUERDO QUEBRADO, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/231-003-veiculo-conservado-hondacg-160-start-20212022"],
  ["230-004","Honda CG 125i Cargo","2016/2016","Branca",900,"BANCO RASGADO, CARENAGENS COM AVARIAS, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/230-004-veiculo-conservado-hondacg-125i-cargo-20162016"],
  ["230-005","Honda CG 150 Titan Mix EX","2010/2010","Cinza",900,"PLACA DESGASTADA, BANCO RASGADO, CARENAGENS DANIFICADAS, CARENAGEM TRASEIRA NA COR AZUL, RETROVISORES QUEBRADOS, FAROL, PAINEL E PISCAS AUSENTES, DANOS NA PARTE EXTERNA E AUSÊNCIA DE PEÇAS, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/230-005-veiculo-conservado-hondacg150-titan-mix-ex-20102010"],
  ["230-006","Honda CG 160 Titan EX","2016/2016","Branca",2000,"PLACA E PARA-LAMA DIANTEIRO COM DANOS, CARENAGEM LATERAL AUSENTE, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/230-006-veiculo-conservado-hondacg-160-titan-ex-20162016"],
  ["230-007","Honda CG 160 Start","2025/2025","Prata",2000,"VEÍCULO SEM 1º EMPLACAMENTO, TANQUE COM RISCOS, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/230-007-veiculo-conservado-hondacg-160-start-20252025"],
  ["230-011","Honda CG 160 Fan","2019/2020","Preta",2000,"BANCO RASGADO, RETROVISOR DIREITO AUSENTE, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/230-011-veiculo-conservado-hondacg-160-fan-20192020"],
  ["230-017","Honda CG 160 Fan","2023/2023","Vermelha",2000,"BANCO RASGADO, RETROVISORES AUSENTES, CARENAGENS COM DANOS, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/230-017-veiculo-conservado-hondacg-160-fan-20232023"],
  ["230-018","Honda CG 150 Titan EX","2011/2012","Preta",900,"PLACA DANIFICADA E LACRE AUSENTE, TANQUE ENVELOPADO, CARENAGENS COM DANOS, BANCO RASGADO, VEÍCULO COM DANOS NA PARTE EXTERNA, REGULARIZAÇÃO POR CONTA DO COMPRADOR","https://nordesteleiloes.com.br/lotes/230-018-veiculo-conservadohondacg-150-titan-ex-20112012"]
 ]}];
const CHECKS=[["motor","Motor gira / sem barulho"],["chassi","Chassi confere"],["nmotor","Nº do motor confere"],["painel","Painel / km"],["eletrica","Elétrica / luzes"],["pneus","Pneus"],["freios","Freios"],["garfo","Garfo / suspensão / alinhamento"],["relacao","Corrente / relação"],["tanque","Tanque (pintura / ferrugem por dentro)"],["pecas","Peças ausentes conferidas"],["placa","Placa / lacre"]];
const fmtD=d=>d?d.split("-").reverse().join("/"):"";
function pacotePendente(p){return p.itens.filter(it=>!vehicles.some(v=>v.id==="alag-"+it[0]||(v.link&&v.link===it[6])))}
function pacoteBanner(){
  if(!canWrite||!vehicles.some(v=>v.grupo==="Alagoinhas"))return "";
  return PACOTES.map(p=>{const pend=pacotePendente(p);if(!pend.length)return "";return `<div class="pkg"><div class="pkg-thumbs">${pend.slice(0,4).map(it=>`<img src="fotos/${it[0]}-1.jpg" alt="">`).join("")}</div>
   <div class="pkg-txt"><span class="pkg-k">📍 ${esc(p.grupo)} · ${fmtD(p.data)}</span><b>${esc(p.titulo)}: ${pend.length} moto(s) com fotos de referência</b><small>${esc(p.leilao)}</small></div>
   <button class="btn" data-pkg="${p.id}">Importar para o sistema</button></div>`}).join("");
}
function importarPacote(id){
  if(!canWrite){toast("Só o dono do app pode importar");return}
  const p=PACOTES.find(x=>x.id===id);if(!p)return;let n=0,m=0;
  p.itens.forEach(([lote,modelo,ano,cor,lmin,obs,link])=>{
    const fotosRef=[1,2,3,4].map(i=>`fotos/${lote}-${i}.jpg`);
    const ex=vehicles.find(v=>v.id==="alag-"+lote||(v.link&&v.link===link));
    if(ex){Object.assign(ex,{grupo:p.grupo,dataVistoria:p.data,fotosRef,cor:ex.cor||cor,lanceMin:lmin,localPatio:p.local});ex.vistoria=ex.vistoria||{checks:{},nota:"",limite:"",obs:""};persist(ex);m++;return}
    const v={id:"alag-"+lote,modelo,ano,cor,placa:"",leiloeiro:"Nordeste Leilões / DETRAN-BA",lote,dataLeilao:"2026-11-25",status:"avaliacao",fipe:"",lance:String(lmin),lanceMin:lmin,comissaoPct:2,taxaPatio:"",taxaAdm:"",outrosArremate:"",despesas:[],vendaPretendida:"",vendaValor:"",dataVenda:"",margemAlvo:20,
      obs:"Leilão: "+obs,link,grupo:p.grupo,dataVistoria:p.data,localPatio:p.local,fotosRef,vistoria:{checks:{},nota:"",limite:"",obs:""},fipeHist:[],criado:Date.now()};
    vehicles.push(v);persist(v);n++;
  });
  fgrupo=p.grupo;tab="veiculos";render();toast(`${n} moto(s) importada(s)${m?` · ${m} atualizada(s)`:""} ✓`);
}
function vistProg(v){const c=(v.vistoria&&v.vistoria.checks)||{};const done=Object.keys(c).filter(k=>c[k]).length;const pb=Object.values(c).filter(x=>x==="pb").length;return {done,tot:CHECKS.length,pb}}
let fgrupo="";
function lista(){
  if(!vehicles.length)return pacoteBanner()+emptyHTML();
  const f=filtro.toLowerCase();
  const grupos=[...new Set(vehicles.map(v=>v.grupo).filter(Boolean))];
  const arr=vehicles.filter(v=>(!fstatus||(v.status||"arrematado")===fstatus)&&(!fgrupo||v.grupo===fgrupo)&&(!f||[v.modelo,v.placa,v.leiloeiro,v.lote,v.grupo,v.cor].join(" ").toLowerCase().includes(f)));
  return `${pacoteBanner()}<div class="toolbar"><input id="busca" placeholder="Buscar modelo, lote, cidade…" value="${esc(filtro)}"><select id="fst"><option value="">Todos os status</option>${Object.entries(STATUS).map(([k,n])=>`<option value="${k}" ${fstatus===k?"selected":""}>${n}</option>`).join("")}</select>${grupos.length?`<select id="fgr"><option value="">Todas as cidades</option>${grupos.map(g=>`<option ${fgrupo===g?"selected":""}>${esc(g)}</option>`).join("")}</select>`:""}</div>
  <div class="grid list">${arr.map(v=>{const c=calc(v);const s=v.status||"arrematado";const vp=vistProg(v);const vs=v.vistoria||{};return `
    <div class="card vcard ${v.fotosRef?"has-cover":""}" data-open="${v.id}">
      ${v.fotosRef?`<div class="cover"><img src="${esc(v.fotosRef[0])}" alt="" loading="lazy"><div class="cover-tags"><span>📍 ${esc(v.grupo||"")} · ${fmtD(v.dataVistoria)}</span>${v.lote?`<span>Lote ${esc(v.lote)}</span>`:""}</div><div class="cover-strip">${v.fotosRef.slice(1).map(u=>`<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div></div>`:""}
      <div class="vtop"><div><h3>${esc(v.modelo||"Sem nome")} ${v.ano?`<span style="color:var(--mut);font-weight:500">${esc(v.ano)}</span>`:""}</h3><div class="sub">${[v.placa,v.leiloeiro,v.lote&&"Lote "+v.lote].filter(Boolean).map(esc).join(" · ")||"—"}</div></div><span class="chip st-${s}">${STATUS[s]}</span></div>
      ${v.grupo?`<div class="vist-row"><div class="vbar2"><i style="width:${vp.done/vp.tot*100}%"></i></div><span>Vistoria ${vp.done}/${vp.tot}${(v.fotosVist||[]).length?` · 📷 ${v.fotosVist.length}`:""}${vp.pb?` · <b class="neg">${vp.pb} problema(s)</b>`:""}</span></div>
      <div class="vnums"><div><span>Lance mínimo</span><b>${v.lanceMin?brl(v.lanceMin):"—"}</b></div><div><span>Meu limite</span><b>${num(vs.limite)?brl(num(vs.limite)):"—"}</b></div><div><span>Nota</span><b>${vs.nota!==""&&vs.nota!=null?esc(vs.nota)+"/10":"—"}</b></div></div>`:""}
      ${v.grupo&&s==="avaliacao"?"":`<div style="margin-top:12px">${stackHTML(c.porCat,c.custo,10)}</div>
      <div class="vnums"><div><span>Custo total</span><b>${brl(c.custo)}</b></div><div><span>${c.vendido?"Vendido":"Venda alvo"}</span><b>${c.venda?brl(c.venda):"—"}</b></div><div><span>Lucro · ROI</span><b class="${c.lucro>=0?"pos":"neg"}">${c.venda?pct(c.roi):"—"}</b></div></div>
      ${c.fipe?`<div class="mini">Custo = ${pct(c.pctFipe)} da FIPE${c.dias!=null?` · ${c.dias} dias`:""}</div>`:c.dias!=null?`<div class="mini">${c.dias} dias desde o leilão</div>`:""}`}
    </div>`}).join("")||`<div class="empty">Nada encontrado.</div>`}</div>`;
}
function bindMain(){
  document.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>openEditor(el.dataset.open));
  const b=$("#busca");if(b)b.oninput=e=>{filtro=e.target.value;const p=b.selectionStart;renderBg();const nb=$("#busca");nb.focus();nb.setSelectionRange(p,p)};
  const fs=$("#fst");if(fs)fs.onchange=e=>{fstatus=e.target.value;renderBg()};
  const fg=$("#fgr");if(fg)fg.onchange=e=>{fgrupo=e.target.value;renderBg()};
  document.querySelectorAll("[data-pkg]").forEach(b=>b.onclick=()=>importarPacote(b.dataset.pkg));
  const en=$("#eNew");if(en)en.onclick=newV;
  const ed=$("#eDemo");if(ed)ed.onclick=demo;
  const bc=$("#bkCopy");if(bc)bc.onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(vehicles));toast("Backup copiado ✓ — cole no WhatsApp/Notas")}catch(e){$("#bkArea").style.display="block";$("#bkTxt").value=JSON.stringify(vehicles);$("#bkTxt").select();toast("Copie o texto selecionado")}};
  const br=$("#bkRest");if(br)br.onclick=()=>{$("#bkArea").style.display="block";$("#bkTxt").value=""};
  const bo=$("#bkOk");if(bo)bo.onclick=()=>{try{const arr=JSON.parse($("#bkTxt").value);if(!Array.isArray(arr))throw 0;arr.forEach(v=>{if(!v.id)v.id=uid();const i=vehicles.findIndex(x=>x.id===v.id);if(i>=0)vehicles[i]=v;else vehicles.push(v);persist(v)});render();toast(arr.length+" veículo(s) importado(s)")}catch(e){toast("Backup inválido")}};
}

/* ---------- editor ---------- */
function newV(){
  const v={id:uid(),modelo:"",ano:"",placa:"",leiloeiro:"",lote:"",dataLeilao:new Date().toISOString().slice(0,10),status:"arrematado",fipe:"",lance:"",comissaoPct:5,taxaPatio:"",taxaAdm:"",outrosArremate:"",despesas:[],vendaPretendida:"",vendaValor:"",dataVenda:"",margemAlvo:20,obs:"",criado:Date.now()};
  vehicles.unshift(v);openEditor(v.id,true);
}
function demo(){
  const d=new Date();const ago=n=>new Date(d-n*864e5).toISOString().slice(0,10);
  const v={id:uid(),modelo:"Fiat Palio Attractive 1.0",ano:"2012/2013",placa:"ABC1D23",leiloeiro:"Exemplo Leilões",lote:"118",dataLeilao:ago(35),status:"avenda",fipe:"24500",lance:"14200",comissaoPct:5,taxaPatio:"380",taxaAdm:"450",outrosArremate:"",margemAlvo:20,
   despesas:[["estetica","Polimento",350],["estetica","Higienização interna",220],["estetica","Martelinho de ouro",400],["documentacao","Vistoria/laudo cautelar",180],["documentacao","Transferência DETRAN",290],["documentacao","IPVA em atraso",610],["mecanica","Revisão/óleo e filtros",420],["mecanica","Bateria",380],["transporte","Guincho/remoção",250]].map(([cat,desc,valor])=>({id:uid(),cat,desc,valor})),
   vendaPretendida:"22900",vendaValor:"",dataVenda:"",obs:"Exemplo — pode apagar.",criado:Date.now()};
  vehicles.unshift(v);persist(v);render();openEditor(v.id);
}
function closeEditor(){
  if(editing&&canWrite){const v=vehicles.find(x=>x.id===editing.id);if(v&&!v.modelo&&!num(v.lance)&&!(v.despesas||[]).length){vehicles=vehicles.filter(x=>x!==v);if(dbCol)dbCol.doc(v.id).delete().catch(()=>{});lsSave()}}
  editing=null;$("#ov").classList.remove("on");document.body.style.overflow="";render();
}
function inp(k,l,o={}){const v=editing[k];return `<label>${l}<input data-k="${k}" ${o.num?'inputmode="decimal" placeholder="0,00"':""} ${o.type?`type="${o.type}"`:""} ${o.ph?`placeholder="${o.ph}"`:""} value="${esc(o.num?fmtIn(v):v)}"></label>`}
function despSec(cat,title,icon){
  return `<fieldset><legend><span class="dot" style="background:${CATS[cat].c}"></span>${icon} ${title}</legend>
   <div id="dl-${cat}">${(editing.despesas||[]).filter(d=>d.cat===cat).map(dRow).join("")||`<div class="mini" data-none>Nenhuma despesa lançada.</div>`}</div>
   <div class="chips">${PRESETS[cat].map(p=>`<button data-add="${cat}" data-desc="${esc(p)}">＋ ${esc(p)}</button>`).join("")}<button data-add="${cat}" data-desc="">＋ Outro</button></div>
   <div class="calc"><span>Subtotal ${title.toLowerCase()}</span><b id="sub-${cat}">—</b></div></fieldset>`;
}
function dRow(d){return `<div class="drow" data-did="${d.id}"><input data-dk="desc" value="${esc(d.desc)}" placeholder="Descrição"><input data-dk="valor" inputmode="decimal" placeholder="R$ 0,00" value="${esc(fmtIn(d.valor))}"><button data-del="${d.id}" aria-label="Remover">✕</button></div>`}
function openEditor(id,isNew){
  editing=vehicles.find(v=>v.id===id);if(!editing)return;
  const v=editing;
  $("#sheet").innerHTML=`
  <div class="shead"><div class="row"><button class="btn ghost sm" id="xClose">← Voltar</button><h2 id="eTitle">${esc(v.modelo||"Novo veículo")}</h2></div>
   <div class="summ"><div><span>Pagamento total</span><b id="sPag">—</b></div><div><span>Despesas</span><b id="sDesp">—</b></div><div><span>Custo total</span><b id="sCusto">—</b></div><div><span>Lucro · ROI</span><b id="sLucro">—</b></div></div>
   <div style="margin-top:8px" id="sStack"></div></div>
  <div class="sbody">
   ${v.fotosRef?`<div class="gal">${v.fotosRef.map((u,i)=>`<button class="gal-i" data-lb="${i}"><img src="${esc(u)}" alt="Foto ${i+1}"></button>`).join("")}</div>
   <div class="mini" style="margin-top:6px">📍 ${esc(v.grupo||"")} · vistoria ${fmtD(v.dataVistoria)}${v.localPatio?` · ${esc(v.localPatio)}`:""} · toque na foto para ampliar</div>`:""}
   ${vistoriaHTML(v)}
   <fieldset><legend>🚗 Veículo</legend>
    <div class="f2">${inp("modelo","Marca / modelo",{ph:"Ex.: Gol 1.6 Power"})}${inp("ano","Ano",{ph:"2015/2016"})}
    ${inp("placa","Placa")}<label>Status<select data-k="status">${Object.entries(STATUS).map(([k,n])=>`<option value="${k}" ${v.status===k?"selected":""}>${n}</option>`).join("")}</select></label>
    ${inp("leiloeiro","Leiloeiro / site")}${inp("lote","Lote")}
    ${inp("dataLeilao","Data do leilão",{type:"date"})}${inp("fipe","Tabela FIPE (R$)",{num:1})}</div>
    <div class="f3" style="margin-top:10px">${inp("grupo","Cidade / grupo",{ph:"Ex.: Alagoinhas"})}${inp("dataVistoria","Data da vistoria",{type:"date"})}${inp("cor","Cor")}</div>
    <div style="margin-top:10px">${inp("link","Link do lote",{ph:"https://…"})}</div>
    <div class="toolbar" style="margin:10px 0 0">${/^https?:\/\//.test(v.link||"")?`<a class="btn ghost sm" style="text-decoration:none" href="${esc(v.link)}" target="_blank" rel="noopener">🔗 Abrir lote</a>`:""}<button class="btn ghost sm" id="xAval">🤖 ${v.avaliacao?"Ver avaliação IA":"Avaliar com IA"}</button>${v.avaliacao?`<span class="mini" style="margin:0">Lance máx. realista: <b>${brl(v.avaliacao.lanceMax||0)}</b></span>`:""}</div>
   </fieldset>
   <fieldset><legend><span class="dot" style="background:var(--c-arremate)"></span>🔨 Arremate e pagamento total</legend>
    <div class="f3">${inp("lance","Valor do lance (R$)",{num:1})}${inp("comissaoPct","Comissão leiloeiro (%)",{num:1})}${inp("taxaAdm","Taxa administrativa (R$)",{num:1})}
    ${inp("taxaPatio","Pátio / diárias (R$)",{num:1})}${inp("outrosArremate","Outras taxas (R$)",{num:1})}</div>
    <div class="calc"><span>Comissão do leiloeiro</span><b id="cCom">—</b></div>
    <div class="calc big"><span>💰 Pagamento total do arremate</span><b id="cPag">—</b></div>
    <div class="mini" id="cFipe"></div>
   </fieldset>
   ${despSec("estetica","Despesas estéticas","✨")}
   ${despSec("documentacao","Documentação","📄")}
   ${despSec("mecanica","Mecânica","🔧")}
   ${despSec("transporte","Transporte / guincho","🚚")}
   ${despSec("outros","Outras despesas","➕")}
   <fieldset><legend>🏷️ Venda e resultado</legend>
    <div class="f2">${inp("vendaPretendida","Preço de venda alvo (R$)",{num:1})}${inp("margemAlvo","Margem desejada (%)",{num:1})}
    ${inp("vendaValor","Valor vendido (R$)",{num:1})}${inp("dataVenda","Data da venda",{type:"date"})}</div>
    <div class="calc"><span>Preço mínimo p/ margem desejada</span><b id="cMin">—</b></div>
    <div class="calc"><span>Ponto de equilíbrio (sem lucro)</span><b id="cEq">—</b></div>
    <div class="calc big"><span id="cResL">Lucro</span><b id="cRes">—</b></div>
    <div class="mini" id="cDias"></div>
   </fieldset>
   <fieldset><legend>📈 Controle FIPE × venda</legend>
    <div id="fipeBox"></div>
    <div class="toolbar" style="margin:10px 0 0"><button class="btn ghost sm" id="fAdd">＋ Registrar FIPE de hoje</button><a class="lk" style="font-size:13px" href="https://veiculos.fipe.org.br/" target="_blank" rel="noopener">Consultar FIPE oficial ↗</a></div>
    <div class="mini">Registre a FIPE todo mês para ver se o valor do carro está subindo ou caindo enquanto ele está com você.</div>
   </fieldset>
   <fieldset><legend>📝 Observações</legend><label><textarea data-k="obs" rows="3" placeholder="Avarias, pendências, contato do comprador…">${esc(v.obs)}</textarea></label></fieldset>
   <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="xOk">✓ Concluir</button><button class="btn danger" id="xDel">Excluir veículo</button></div>
   <div class="confirm" id="cfm">Excluir <b>${esc(v.modelo||"este veículo")}</b> e todas as despesas? <div style="margin-top:8px;display:flex;gap:8px"><button class="btn danger sm" id="cfmY">Sim, excluir</button><button class="btn ghost sm" id="cfmN">Cancelar</button></div></div>
  </div>`;
  $("#ov").classList.add("on");$("#ov").scrollTop=0;document.body.style.overflow="hidden";
  bindEditor();renderFipe();refresh();vistRefresh();renderVF();
  if(!canWrite)$("#sheet").querySelectorAll("input,select,textarea").forEach(e=>e.disabled=true);
  if(isNew)setTimeout(()=>$('[data-k="modelo"]').focus(),50);
}
function bindEditor(){
  const s=$("#sheet");
  s.oninput=e=>{
    const t=e.target;
    if(t.dataset.k){editing[t.dataset.k]=t.value;if(t.dataset.k==="modelo")$("#eTitle").textContent=t.value||"Novo veículo"}
    else if(t.dataset.dk){const d=editing.despesas.find(x=>x.id===t.closest(".drow").dataset.did);if(d)d[t.dataset.dk]=t.value}
    else if(t.dataset.fh!=null){const h=(editing.fipeHist||[])[+t.dataset.fh];if(h)h[t.dataset.ff]=t.value}
    else if(t.dataset.vk){editing.vistoria=editing.vistoria||{checks:{}};editing.vistoria[t.dataset.vk]=t.value;persist(editing);return}
    else return;
    if(t.dataset.k==="vendaValor"&&num(t.value)>0&&editing.status!=="vendido"){editing.status="vendido";s.querySelector('[data-k="status"]').value="vendido";if(!editing.dataVenda){editing.dataVenda=new Date().toISOString().slice(0,10);s.querySelector('[data-k="dataVenda"]').value=editing.dataVenda}toast("Status alterado para Vendido")}
    refresh();persist(editing);
  };
  s.onchange=e=>{if(e.target.id==='vfIn'){const fs=[...e.target.files];e.target.value='';enfileirarFotos(editing,fs);return}s.oninput(e)};
  s.onclick=e=>{
    const t=e.target.closest("button");if(!t)return;
    if(t.dataset.add){const cat=t.dataset.add;const d={id:uid(),cat,desc:t.dataset.desc,valor:""};editing.despesas=editing.despesas||[];editing.despesas.push(d);
      const box=$("#dl-"+cat);const n=box.querySelector("[data-none]");if(n)n.remove();box.insertAdjacentHTML("beforeend",dRow(d));
      const row=box.lastElementChild;row.querySelector(d.desc?'[data-dk="valor"]':'[data-dk="desc"]').focus();persist(editing);refresh()}
    else if(t.dataset.del){editing.despesas=editing.despesas.filter(x=>x.id!==t.dataset.del);t.closest(".drow").remove();persist(editing);refresh()}
    else if(t.dataset.cv){const k=t.closest(".seg").dataset.ck;editing.vistoria=editing.vistoria||{checks:{}};editing.vistoria.checks=editing.vistoria.checks||{};const cur=editing.vistoria.checks[k];editing.vistoria.checks[k]=cur===t.dataset.cv?"":t.dataset.cv;t.closest(".seg").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.cv===editing.vistoria.checks[k]));vistRefresh();persist(editing)}
    else if(t.dataset.lb!=null){openLB(editing.fotosRef,+t.dataset.lb)}
    else if(t.dataset.vfo!=null){openLB((editing.fotosVist||[]).map(f=>f.url),+t.dataset.vfo)}
    else if(t.dataset.vfx!=null){if(!canWrite)return;if(t.dataset.c!=="1"){t.dataset.c="1";t.textContent="?";setTimeout(()=>{t.dataset.c="";t.textContent="✕"},3000);return}removerFoto(editing,t.dataset.vfx)}
    else if(t.dataset.fhdel!=null){editing.fipeHist.splice(+t.dataset.fhdel,1);renderFipe();persist(editing)}
    else if(t.id==="fAdd"){editing.fipeHist=editing.fipeHist||[];editing.fipeHist.push({data:new Date().toISOString().slice(0,10),valor:editing.fipe||""});renderFipe();persist(editing);const r=$("#fhRows").lastElementChild;if(r)r.querySelectorAll("input")[1].focus()}
    else if(t.id==="xAval"){const v=editing;closeEditor();loadAvFromVehicle(v);tab="avaliar";render();window.scrollTo(0,0)}
    else if(t.id==="xClose"||t.id==="xOk")closeEditor();
    else if(t.id==="xDel")$("#cfm").classList.add("on");
    else if(t.id==="cfmN")$("#cfm").classList.remove("on");
    else if(t.id==="cfmY"){const id=editing.id;editing=null;$("#ov").classList.remove("on");document.body.style.overflow="";removeV(id);toast("Veículo excluído")}
  };
}
function vistoriaHTML(v){
  const vs=v.vistoria||{checks:{}};const ck=vs.checks||{};
  return `<fieldset class="vist"><legend>🔍 Vistoria presencial</legend>
   <div class="vist-row" style="margin:0 0 10px"><div class="vbar2"><i id="vProg"></i></div><span id="vProgT"></span></div>
   ${CHECKS.map(([k,l])=>`<div class="chk"><span>${l}</span><div class="seg" data-ck="${k}">${[["ok","✓ OK"],["at","⚠ Atenção"],["pb","✕ Problema"]].map(([val,t])=>`<button class="s-${val} ${ck[k]===val?"on":""}" data-cv="${val}">${t}</button>`).join("")}</div></div>`).join("")}
   <div class="f2" style="margin-top:12px"><label>Nota geral (0–10)<input data-vk="nota" inputmode="numeric" value="${esc(vs.nota??"")}" placeholder="Ex.: 7"></label><label>Meu lance limite (R$)<input data-vk="limite" inputmode="decimal" value="${esc(fmtIn(vs.limite))}" placeholder="Até quanto vou"></label></div>
   ${v.lanceMin?`<div class="mini">Lance mínimo do leilão: <b>${brl(v.lanceMin)}</b></div>`:""}
   <label style="margin-top:10px">Anotações da vistoria<textarea data-vk="obs" rows="3" placeholder="O que viu no pátio: barulho, peças faltando, ferrugem…">${esc(vs.obs||"")}</textarea></label>
   <div class="sec-t" style="margin:16px 0 8px">📷 Fotos da vistoria</div>
   <div class="vf" id="vfBox"></div>
   <label class="btn ghost sm vf-add"><input type="file" id="vfIn" accept="image/*" multiple hidden>📷 Tirar / adicionar fotos</label>
   <div class="mini" id="vfSt"></div>
  </fieldset>`;
}
async function renderVF(){const b=$("#vfBox");if(!b||!editing)return;const v=editing;const a=v.fotosVist||[];const pq=await fqPendentes(v.id);if(editing!==v)return;
  const pend=pq.map(r=>{fqUrls[r.id]=fqUrls[r.id]||URL.createObjectURL(r.blob);return `<div class="vf-i pend"><img src="${fqUrls[r.id]}" alt=""><span class="vf-q">⏳</span></div>`}).join("");
  b.innerHTML=(a.length||pq.length)?a.map((f,i)=>`<div class="vf-i"><button data-vfo="${i}"><img src="${esc(f.url)}" alt="" loading="lazy"></button>${f.item?`<span class="vf-tag">${esc((CHECKS.find(c=>c[0]===f.item)||[0,f.item])[1])}</span>`:""}<button class="vf-x" data-vfx="${esc(f.path||"")}" aria-label="Remover">✕</button></div>`).join("")+pend:`<div class="mini" style="margin:0">Nenhuma foto ainda. As fotos ficam salvas para toda a equipe (e esperam o sinal voltar, se faltar internet).</div>`}
function compress(file,max=1600,q=.78){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);c.toBlob(b=>b?res(b):rej(new Error("falha ao processar")),"image/jpeg",q)};img.onerror=()=>rej(new Error("imagem inválida"));img.src=URL.createObjectURL(file)})}
function vistRefresh(){const p=vistProg(editing);const b=$("#vProg");if(b){b.style.width=(p.done/p.tot*100)+"%";$("#vProgT").innerHTML=`${p.done}/${p.tot} itens${p.pb?` · <b class="neg">${p.pb} problema(s)</b>`:""}`}}
function renderFipe(){
  const h=editing.fipeHist||[];
  $("#fipeBox").innerHTML=`<div id="fhRows">${h.map((x,i)=>`<div class="drow" style="grid-template-columns:1fr 120px 34px"><input type="date" data-fh="${i}" data-ff="data" value="${esc(x.data)}"><input data-fh="${i}" data-ff="valor" inputmode="decimal" placeholder="R$ FIPE" value="${esc(fmtIn(x.valor))}"><button data-fhdel="${i}">✕</button></div>`).join("")||`<div class="mini">Nenhum registro de FIPE ainda.</div>`}</div><div id="fipeInfo"></div>`;
  fipeInfo();
}
function fipeInfo(){
  const el=$("#fipeInfo");if(!el)return;
  const c=calc(editing);
  const h=(editing.fipeHist||[]).filter(x=>num(x.valor)>0&&x.data).sort((a,b)=>a.data<b.data?-1:1);
  let out="";
  if(h.length>=2){
    const vs=h.map(x=>num(x.valor)),mn=Math.min(...vs),mx=Math.max(...vs),rg=mx-mn||1;
    const pts=vs.map((v,i)=>`${(i/(vs.length-1)*300).toFixed(1)},${(52-(v-mn)/rg*44).toFixed(1)}`).join(" ");
    const varp=(vs[vs.length-1]-vs[0])/vs[0];
    out+=`<svg class="spark" viewBox="-4 0 308 60" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${varp>=0?"#3fb950":"#f85149"}" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>
    <div class="calc"><span>Variação da FIPE (${h[0].data.split("-").reverse().join("/")} → hoje)</span><b class="${varp>=0?"pos":"neg"}">${varp>=0?"+":""}${pct(varp)}</b></div>`;
  }
  const fipe=c.fipe||(h.length?num(h[h.length-1].valor):0);
  if(fipe){
    if(num(editing.vendaPretendida))out+=`<div class="calc"><span>Venda alvo = % da FIPE</span><b>${pct(num(editing.vendaPretendida)/fipe)}</b></div>`;
    if(num(editing.vendaValor))out+=`<div class="calc"><span>Vendido por = % da FIPE</span><b>${pct(num(editing.vendaValor)/fipe)}</b></div>`;
    out+=`<div class="calc"><span>Faixa comum p/ carro de leilão (70–90% FIPE)</span><b>${brl(fipe*.7)} – ${brl(fipe*.9)}</b></div>`;
  }
  el.innerHTML=out;
}
function refresh(){
  fipeInfo();
  const c=calc(editing);
  $("#sPag").textContent=brl(c.pagamento);$("#sDesp").textContent=brl(c.despesas);$("#sCusto").textContent=brl(c.custo);
  const l=$("#sLucro");l.textContent=c.venda?`${pct(c.roi)}`:"—";l.className=c.venda?(c.lucro>=0?"pos":"neg"):"";
  $("#sStack").innerHTML=stackHTML(c.porCat,c.custo,8);
  $("#cCom").textContent=brl(c.comissao);$("#cPag").textContent=brl(c.pagamento);
  $("#cFipe").textContent=c.fipe?`Arremate = ${pct(c.pagamento/c.fipe)} da FIPE · custo total = ${pct(c.pctFipe)} da FIPE`:"Informe a FIPE para comparar.";
  ["estetica","documentacao","mecanica","transporte","outros"].forEach(k=>$("#sub-"+k).textContent=brl(c.porCat[k]));
  $("#cMin").textContent=brl(c.precoMin);$("#cEq").textContent=brl(c.custo);
  $("#cResL").textContent=c.vendido?"✅ Lucro realizado":"📈 Lucro projetado (preço alvo)";
  const r=$("#cRes");r.textContent=c.venda?`${brl(c.lucro)} · ${pct(c.roi)}`:"informe o preço";r.style.color=c.venda?(c.lucro>=0?"var(--good)":"var(--bad)"):"";
  $("#cDias").textContent=c.dias!=null?`${c.dias} dia(s) ${c.vendido?"do leilão até a venda":"desde o leilão"}${c.venda&&c.dias?` · lucro por dia: ${brl(c.lucro/Math.max(c.dias,1))}`:""}`:"";
}

/* ---------- lightbox ---------- */
let lbArr=[],lbI=0;
function openLB(arr,i){lbArr=arr;lbI=i;const el=$("#lb");el.classList.add("on");showLB()}
function showLB(){$("#lbImg").src=lbArr[lbI];$("#lbN").textContent=`${lbI+1} / ${lbArr.length}`}
document.addEventListener("click",e=>{const el=$("#lb");if(!el.classList.contains("on"))return;const b=e.target.closest("[data-lbn]");if(b){lbI=(lbI+ +b.dataset.lbn+lbArr.length)%lbArr.length;showLB();return}if(e.target.closest("#lbImg"))return;if(e.target.closest("#lb"))el.classList.remove("on")});
let lbX=null;document.addEventListener("touchstart",e=>{if($("#lb").classList.contains("on"))lbX=e.touches[0].clientX},{passive:true});
document.addEventListener("touchend",e=>{if(lbX==null)return;const dx=e.changedTouches[0].clientX-lbX;lbX=null;if(Math.abs(dx)>50){lbI=(lbI+(dx<0?1:-1)+lbArr.length)%lbArr.length;showLB()}});
