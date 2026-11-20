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
  if(!podeGerir()||!vehicles.some(v=>v.grupo==="Alagoinhas"))return "";
  return PACOTES.map(p=>{const pend=pacotePendente(p);if(!pend.length)return "";return `<div class="pkg"><div class="pkg-thumbs">${pend.slice(0,4).map(it=>`<img src="fotos/${it[0]}-1.jpg" alt="">`).join("")}</div>
   <div class="pkg-txt"><span class="pkg-k">📍 ${esc(p.grupo)} · ${fmtD(p.data)}</span><b>${esc(p.titulo)}: ${pend.length} moto(s) com fotos de referência</b><small>${esc(p.leilao)}</small></div>
   <button class="btn" data-pkg="${p.id}">Importar para o sistema</button></div>`}).join("");
}
function importarPacote(id){
  if(!canWrite){toast("Só o dono do app pode importar");return}
  const p=PACOTES.find(x=>x.id===id);if(!p)return;let n=0,m=0;
  const g=grupos.find(x=>norm(x.nome)===norm(p.grupo));if(!g){toast(`Crie antes o grupo “${p.grupo}” em 📁 Editais`);tab="editais";render();return}
  p.itens.forEach(([lote,modelo,ano,cor,lmin,obs,link])=>{
    const fotosRef=[1,2,3,4].map(i=>`fotos/${lote}-${i}.jpg`);
    const ex=vehicles.find(v=>v.id==="alag-"+lote||(v.link&&v.link===link));
    if(ex){Object.assign(ex,{grupo:g.nome,grupoId:g.id,dataVistoria:p.data,fotosRef,cor:ex.cor||cor,lanceMin:lmin,localPatio:p.local});ex.vistoria=ex.vistoria||{checks:{},nota:"",limite:"",obs:""};persist(ex);m++;return}
    const v={id:"alag-"+lote,modelo,ano,cor,placa:"",leiloeiro:"Nordeste Leilões / DETRAN-BA",lote,dataLeilao:"2026-11-25",status:"avaliacao",fipe:"",lance:String(lmin),lanceMin:lmin,taxaPatio:"",outrosArremate:"",despesas:[],vendaPretendida:"",vendaValor:"",dataVenda:"",margemAlvo:20,
      obs:"Leilão: "+obs,link,grupo:g.nome,grupoId:g.id,dataVistoria:p.data,localPatio:p.local,fotosRef,vistoria:{checks:{},nota:"",limite:"",obs:""},fipeHist:[],criado:Date.now()};
    vehicles.push(v);persist(v);n++;
  });
  const nov=vehicles.filter(x=>x.grupoId===g.id&&!x.conferencia);(async()=>{for(const x of nov){try{await completarDados(x)}catch(e){}}render()})();
  fgrupoId=g.id;tab="veiculos";render();toast(`${n} moto(s) importada(s)${m?` · ${m} atualizada(s)`:""} ✓`);
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
function inp(k,l,o={}){const v=editing[k];return `<label>${l}<input data-k="${k}" ${o.num?'inputmode="decimal" placeholder="0,00"':""} ${o.type?`type="${o.type}"`:""} ${o.ph?`placeholder="${o.ph}"`:""} value="${esc(o.num?fmtIn(v):v)}"></label>`}
function despSec(cat,title,icon){
  return `<fieldset><legend><span class="dot" style="background:${CATS[cat].c}"></span>${icon} ${title}</legend>
   <div id="dl-${cat}">${(editing.despesas||[]).filter(d=>d.cat===cat).map(dRow).join("")||`<div class="mini" data-none>Nenhum gasto lançado.</div>`}</div>
   <div class="chips">${PRESETS[cat].map(p=>`<button data-add="${cat}" data-desc="${esc(p)}">＋ ${esc(p)}</button>`).join("")}<button data-add="${cat}" data-desc="">＋ Outro</button></div>
   <div class="calc"><span>Subtotal ${title.toLowerCase()}</span><b id="sub-${cat}">—</b></div></fieldset>`;
}
function dRow(d){return `<div class="drow nf" data-did="${d.id}"><input data-dk="desc" list="dlPecas" value="${esc(d.desc)}" placeholder="Descrição"><input data-dk="valor" inputmode="decimal" placeholder="R$ 0,00" value="${esc(fmtIn(d.valor))}"><label class="nf-b" title="Foto da nota fiscal">📎<input type="file" accept="image/*" hidden data-nf="${d.id}"></label><button data-del="${d.id}" aria-label="Remover">✕</button></div>`}
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
let lbArr=[],lbI=0;
function openLB(arr,i){lbArr=arr;lbI=i;const el=$("#lb");el.classList.add("on");showLB()}
function showLB(){$("#lbImg").src=lbArr[lbI];$("#lbN").textContent=`${lbI+1} / ${lbArr.length}`}
document.addEventListener("click",e=>{const el=$("#lb");if(!el.classList.contains("on"))return;const b=e.target.closest("[data-lbn]");if(b){lbI=(lbI+ +b.dataset.lbn+lbArr.length)%lbArr.length;showLB();return}if(e.target.closest("#lbImg"))return;if(e.target.closest("#lb"))el.classList.remove("on")});
let lbX=null;document.addEventListener("touchstart",e=>{if($("#lb").classList.contains("on"))lbX=e.touches[0].clientX},{passive:true});
document.addEventListener("touchend",e=>{if(lbX==null)return;const dx=e.changedTouches[0].clientX-lbX;lbX=null;if(Math.abs(dx)>50){lbI=(lbI+(dx<0?1:-1)+lbArr.length)%lbArr.length;showLB()}});
