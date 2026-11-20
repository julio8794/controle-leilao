/* ---------- grupos / editais ---------- */
let gEdit=null,fgrupoId="";
const podeGerir=()=>canWrite&&papel!=="vistoriador";
function diasAte(d){if(!d)return null;return Math.ceil((new Date(d+"T12:00:00")-new Date())/864e5)}
function custasResumo(c){c=c||{};const p=[];
  if(num(c.comissaoPct))p.push(`comissão ${num(c.comissaoPct)}%`);if(num(c.taxaAdmPct))p.push(`taxa adm. ${num(c.taxaAdmPct)}%`);
  const fx=(c.taxasFixas||[]).reduce((a,t)=>a+num(t.valor),0);if(fx)p.push(`taxas fixas ${brl(fx)}`);
  const dc=(c.docs||[]).reduce((a,t)=>a+num(t.valor),0);if(dc)p.push(`documentação ~${brl(dc)}`);
  return p.length?p:["custas não preenchidas"]}
function editaisHTML(){
  const lista=[...grupos].sort((a,b)=>(b.data_leilao||"").localeCompare(a.data_leilao||""));
  return `<div class="sec-t" style="margin-top:4px">📁 Grupos / editais <span style="font-weight:500;text-transform:none">· cada leilão com suas custas</span></div>
  ${podeGerir()?`<button class="btn" id="gNovo" style="margin-bottom:12px">＋ Novo grupo / edital</button>`:""}
  <div class="grid list">${lista.map(g=>{const ms=vehicles.filter(v=>v.grupoId===g.id);const vist=ms.filter(v=>vistProg(v).done>=CHECKS.length||v.statusVist==="vistoriada").length;const d=diasAte(g.data_leilao);
   const lim=ms.reduce((a,v)=>a+(num(v.vistoria&&v.vistoria.limite)||0),0);
   return `<div class="card gcard"><div class="vtop"><div><h3>${esc(g.nome)}</h3><div class="sub">${[g.cidade,g.leiloeiro,g.comitente].filter(Boolean).map(esc).join(" · ")||"—"}</div></div>
     ${g.data_leilao?`<span class="chip ${d!=null&&d<0?"st-vendido":"st-avenda"}">${fmtD(g.data_leilao)}${d!=null&&d>=0?` · ${d===0?"hoje":d+"d"}`:""}</span>`:""}</div>
     <div class="gchips">${custasResumo(g.custas).map(t=>`<span>${esc(t)}</span>`).join("")}</div>
     <div class="vnums"><div><span>Motos</span><b>${ms.length}</b></div><div><span>Vistoriadas</span><b>${vist}/${ms.length}</b></div><div class="fin"><span>Soma dos limites</span><b>${lim?brl(lim):"—"}</b></div></div>
     <div class="toolbar" style="margin:12px 0 0"><button class="btn ghost sm" data-gver="${g.id}">🚗 Ver motos</button><button class="btn ghost sm" data-gcmp="${g.id}">🏁 Comparar</button>${podeGerir()?`<button class="btn ghost sm" data-gedit="${g.id}">✎ Custas do edital</button>`:`<button class="btn ghost sm" data-gedit="${g.id}">📄 Ver edital</button>`}</div></div>`}).join("")||`<div class="empty card">Nenhum grupo ainda. Crie um para cada leilão/edital (ex.: Alagoinhas 25/11, Feira de Santana, Simões Filho).</div>`}</div>`;
}
function bindEditais(){
  const m=$("#main");
  const n=$("#gNovo");if(n)n.onclick=()=>abrirGrupo(null);
  m.querySelectorAll("[data-gedit]").forEach(b=>b.onclick=()=>abrirGrupo(b.dataset.gedit));
  m.querySelectorAll("[data-gver]").forEach(b=>b.onclick=()=>{fgrupoId=b.dataset.gver;vmodo="lista";tab="veiculos";render()});
  m.querySelectorAll("[data-gcmp]").forEach(b=>b.onclick=()=>{fgrupoId=b.dataset.gcmp;vmodo="comparar";tab="veiculos";render()});
}
const CUSTAS_NUM=[["comissaoPct","Comissão do leiloeiro (%)"],["taxaAdmPct","Taxa administrativa (%)"],["prazoPagamentoH","Prazo de pagamento (horas)"],["liberacaoDias","Retirada liberada após (dias do leilão)"],["prazoTransferenciaDias","Prazo de transferência (dias)"],["diasCarencia","Dias sem cobrar estadia"],["estadiaDia","Estadia por dia (R$)"],["margemPct","Margem desejada (%)"],["contingPct","Reserva p/ imprevistos (%)"]];
function abrirGrupo(id){
  const g=id?JSON.parse(JSON.stringify(grupos.find(x=>x.id===id)||{})):{id:(crypto.randomUUID?crypto.randomUUID():uid()),nome:"",custas:{taxasFixas:[],docs:[],margemPct:20,contingPct:10},_novo:true};
  g.custas=g.custas||{};g.custas.taxasFixas=g.custas.taxasFixas||[];g.custas.docs=g.custas.docs||[];gEdit=g;renderGrupo();
}
function renderGrupo(){
  const g=gEdit,sc=$("#ov").classList.contains("on")?$("#ov").scrollTop:0;
  const ro=!podeGerir();const c=g.custas;
  const lst=(k,t)=>`<div class="sec-t" style="margin:14px 0 6px">${t}</div><div id="gl-${k}">${c[k].map((x,i)=>`<div class="drow"><input data-gl="${k}" data-gi="${i}" data-gf="nome" value="${esc(x.nome)}" placeholder="Descrição"><input data-gl="${k}" data-gi="${i}" data-gf="valor" inputmode="decimal" value="${esc(fmtIn(x.valor))}" placeholder="R$"><button data-gldel="${k}" data-gi="${i}" aria-label="Remover">✕</button></div>`).join("")||`<div class="mini">Nenhum.</div>`}</div>${ro?"":`<div class="chips"><button data-gladd="${k}">＋ Adicionar</button></div>`}`;
  $("#sheet").innerHTML=`<div class="shead"><div class="row"><button class="btn ghost sm" id="gX">← Voltar</button><h2>${g._novo?"Novo grupo / edital":esc(g.nome)}</h2></div></div>
  <div class="sbody">
   <fieldset><legend>📁 Grupo</legend><div class="f2">
    <label>Nome do grupo<input data-g="nome" value="${esc(g.nome)}" placeholder="Ex.: Alagoinhas 25/11"></label><label>Cidade<input data-g="cidade" value="${esc(g.cidade||"")}"></label>
    <label>Leiloeiro<input data-g="leiloeiro" value="${esc(g.leiloeiro||"")}"></label><label>Comitente<input data-g="comitente" value="${esc(g.comitente||"")}" placeholder="Ex.: DETRAN-BA"></label>
    <label>Data do leilão<input type="date" data-g="data_leilao" value="${esc(g.data_leilao||"")}"></label><label>Link do edital (PDF)<input data-g="edital_url" value="${esc(g.edital_url||"")}" placeholder="https://…"></label></div>
    ${g.edital_url?`<div class="toolbar" style="margin:10px 0 0"><a class="btn ghost sm" style="text-decoration:none" href="${esc(g.edital_url)}" target="_blank" rel="noopener">📄 Abrir edital</a>${ro?"":`<button class="btn ghost sm" id="gIA">🤖 Ler edital com IA</button>`}</div><div class="mini" id="gIASt"></div>`:""}
   </fieldset>
   <fieldset class="fin"><legend>💰 Custas do edital <span class="mini" style="margin:0">— usadas na calculadora de todas as motos do grupo</span></legend>
    <div class="f2">${CUSTAS_NUM.map(([k,l])=>`<label>${l}<input data-gc="${k}" inputmode="decimal" value="${esc(fmtIn(c[k]))}"></label>`).join("")}</div>
    ${lst("taxasFixas","Taxas fixas por veículo (ex.: empilhadeira, remoção, laudo)")}
    ${lst("docs","Documentação típica por veículo (entra como previsto quando a moto não tem gasto de documentação)")}
    <label style="margin-top:12px">Débitos — quem paga o quê<textarea data-gc="debitos" rows="3">${esc(c.debitos||"")}</textarea></label>
    <label style="margin-top:10px">Regras importantes (retirada, circulação, transferência)<textarea data-gc="regras" rows="3">${esc(c.regras||"")}</textarea></label>
    ${c.fonte?`<div class="mini">Fonte: ${esc(c.fonte)}</div>`:""}
    ${c.evidencias?`<details class="evid"><summary>Trechos do edital usados pela IA</summary>${Object.entries(c.evidencias).map(([k,t])=>`<p><b>${esc(k)}</b>: “${esc(t)}”</p>`).join("")}</details>`:""}
   </fieldset>
   <fieldset><legend>📝 Notas</legend><label><textarea data-g="notas" rows="3">${esc(g.notas||"")}</textarea></label></fieldset>
   ${ro?"":`<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="gSalvar">💾 Salvar edital</button>${g._novo?"":`<button class="btn danger" id="gDel">Excluir grupo</button>`}</div><div class="mini" id="gMsg"></div>`}
  </div>`;
  $("#ov").classList.add("on");$("#ov").scrollTop=sc;document.body.style.overflow="hidden";
  if(ro)$("#sheet").querySelectorAll("input,textarea").forEach(e=>e.disabled=true);
  const s=$("#sheet");
  s.oninput=e=>{const t=e.target;
    if(t.dataset.g)g[t.dataset.g]=t.value;
    else if(t.dataset.gc)c[t.dataset.gc]=["debitos","regras"].includes(t.dataset.gc)?t.value:(t.value===""?null:num(t.value));
    else if(t.dataset.gl){const x=c[t.dataset.gl][+t.dataset.gi];if(x)x[t.dataset.gf]=t.dataset.gf==="valor"?num(t.value):t.value}};
  s.onclick=async e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="gX"){fecharGrupo();return}
    if(b.dataset.gladd){c[b.dataset.gladd].push({nome:"",valor:0});renderGrupo();return}
    if(b.dataset.gldel){c[b.dataset.gldel].splice(+b.dataset.gi,1);renderGrupo();return}
    if(b.id==="gIA"){lerEditalIA(g);return}
    if(b.id==="gSalvar"){if(!String(g.nome||"").trim()){$("#gMsg").textContent="Dê um nome ao grupo.";return}
      delete g._novo;const row={id:g.id,painel_id:painelId,nome:g.nome.trim(),cidade:g.cidade||null,leiloeiro:g.leiloeiro||null,comitente:g.comitente||null,data_leilao:g.data_leilao||null,edital_url:g.edital_url||null,custas:c,notas:g.notas||null,atualizado_em:new Date().toISOString()};
      const {error}=await sb.from("grupos").upsert(row);if(error){$("#gMsg").textContent="Erro: "+error.message;return}
      const i=grupos.findIndex(x=>x.id===g.id);if(i>=0)grupos[i]=row;else grupos.push(row);toast("Edital salvo ✓");fecharGrupo();return}
    if(b.id==="gDel"){const n=vehicles.filter(v=>v.grupoId===g.id).length;if(n){$("#gMsg").textContent=`Mova as ${n} moto(s) para outro grupo antes de excluir.`;return}
      if(b.dataset.c!=="1"){b.dataset.c="1";b.textContent="Confirmar exclusão";return}
      const {error}=await sb.from("grupos").delete().eq("id",g.id);if(error){$("#gMsg").textContent="Erro: "+error.message;return}grupos=grupos.filter(x=>x.id!==g.id);fecharGrupo()}
  };
}
function fecharGrupo(){gEdit=null;$("#ov").classList.remove("on");document.body.style.overflow="";render()}
function grupoSelect(v,attr){return `<select ${attr}><option value="">— sem grupo —</option>${grupos.map(g=>`<option value="${g.id}" ${v.grupoId===g.id?"selected":""}>${esc(g.nome)}${g.data_leilao?" · "+fmtD(g.data_leilao):""}</option>`).join("")}</select>`}
