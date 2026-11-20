/* ---------- ficha da moto (abas) ---------- */
let etab="vistoria";
const CHECK_PESO={motor:3,chassi:3,nmotor:2,painel:1,eletrica:1,pneus:1,freios:2,garfo:2,relacao:1,tanque:1,pecas:1,placa:1};
const CHECK_CAT={motor:"mecanica",chassi:"documentacao",nmotor:"documentacao",painel:"estetica",eletrica:"mecanica",pneus:"mecanica",freios:"mecanica",garfo:"mecanica",relacao:"mecanica",tanque:"estetica",pecas:"estetica",placa:"documentacao"};
const CHECK_SUG={motor:["Revisão do motor","Limpeza de carburador/injeção","Junta / vazamento de óleo","Retífica parcial"],chassi:["Laudo de chassi","Remarcação de chassi"],nmotor:["Regularização do nº do motor"],painel:["Painel / velocímetro","Cabo de velocímetro"],eletrica:["Bateria","Chicote elétrico","Lâmpadas / piscas","Regulador retificador"],pneus:["Pneu dianteiro","Pneu traseiro","Câmara de ar"],freios:["Pastilhas de freio","Lona de freio","Disco de freio","Fluido de freio"],garfo:["Retentor de bengala","Alinhamento de garfo","Bengala"],relacao:["Kit relação"],tanque:["Pintura do tanque","Limpeza interna do tanque"],pecas:["Retrovisores","Carenagens","Banco","Para-lama","Escapamento"],placa:["Placa nova","Lacre"]};
const STV={a_vistoriar:"A vistoriar",vistoriada:"Vistoriada",descartada:"Descartada"};
function notaAuto(v){const ck=(v.vistoria&&v.vistoria.checks)||{};let s=0,w=0;Object.entries(ck).forEach(([k,x])=>{if(!x)return;const p=CHECK_PESO[k]||1;w+=p;s+=p*(x==="ok"?1:x==="at"?.5:0)});return w?Math.round(s/w*100)/10:null}
function notaFinal(v){const m=v.vistoria&&v.vistoria.nota;return temV(m)?num(m):notaAuto(v)}
function prazosDe(v){
  const g=grupoDe(v);const c=(g&&g.custas)||{};const base=v.dataLeilao||(g&&g.data_leilao);
  const ganhou=(v.leilao&&v.leilao.resultado==="ganhou")||["arrematado","preparacao","avenda"].includes(v.status);
  if(!base||!ganhou)return [];const d0=new Date(base+"T09:00:00");const add=(d,h)=>new Date(d.getTime()+h*36e5);
  const out=[];if(temV(c.prazoPagamentoH))out.push({k:"pago",t:"Pagar lote + taxas",d:add(d0,num(c.prazoPagamentoH))});
  const lib=temV(c.liberacaoDias)?add(d0,num(c.liberacaoDias)*24):null;if(lib)out.push({k:"retirada",t:"Retirada liberada no pátio",d:lib});
  if(temV(c.prazoTransferenciaDias))out.push({k:"transferido",t:"Transferir no DETRAN (multa se atrasar)",d:add(lib||d0,num(c.prazoTransferenciaDias)*24)});
  // prazos da nota de arremate (retirada e perda do bem), se ainda não retirou
  const n=v.nota||{};if(n.retiradaDias&&!v.retirado&&!out.some(x=>x.k==="retirada")){out.push({k:"retirada",t:`Retirar do pátio${n.estadiaDia?` (depois R$ ${n.estadiaDia}/dia)`:""}`,d:add(d0,num(n.retiradaDias)*24)});
    if(n.perdaDias)out.push({k:"perda",t:"Perde o bem se não retirar",d:add(d0,num(n.perdaDias)*24)})}
  const pz=v.prazos||{};if(v.retirado)pz.retirada=true;return out.map(x=>({...x,feito:!!pz[x.k],dias:Math.ceil((x.d-new Date())/864e5)}));
}
function openEditor(id,isNew){
  editing=vehicles.find(v=>v.id===id);if(!editing)return;
  const minha=MINHA(editing);etab=isNew?"dados":(papel==="vistoriador"?"vistoria":minha?(etab&&etab!=="vistoria"&&etab!=="leilao"?etab:"numeros"):(etab||"vistoria"));
  renderEditor();$("#ov").classList.add("on");$("#ov").scrollTop=0;document.body.style.overflow="hidden";
  if(isNew)setTimeout(()=>{const m=$('[data-k="modelo"]');if(m)m.focus()},80);
}
function renderEditor(){
  const v=editing;if(!v)return;
  const tabs=[["vistoria","🔍 Vistoria"],["numeros","💰 Números","fin"],["leilao","🏁 Leilão","fin"],["dados","📄 Dados"],["docs",`📎 Docs${(v.docs||[]).length?" "+v.docs.length:""}`]];
  $("#sheet").innerHTML=`<div class="shead"><div class="row"><button class="btn ghost sm" id="xClose">← Voltar</button><h2 id="eTitle">${esc(v.modelo||"Novo veículo")}</h2>${v.lote?`<span class="chip st-avaliacao">Lote ${esc(v.lote)}</span>`:""}</div>
   <div class="summ fin"><div><span>Custo previsto</span><b id="sCusto">—</b></div><div><span>Lance máx.</span><b id="sLmax">—</b></div><div><span>Lucro · ROI</span><b id="sLucro">—</b></div><div><span>Nota</span><b id="sNota">—</b></div></div>
   <div class="etabs">${tabs.map(([k,l,c])=>`<button data-etab="${k}" class="${etab===k?"on":""} ${c||""}">${l}</button>`).join("")}</div></div>
  <div class="sbody" id="eBody"></div>`;
  renderETab();bindEditor();
}
function renderETab(){
  const v=editing;const b=$("#eBody");
  b.innerHTML=etab==="vistoria"?tabVistoria(v):etab==="numeros"?tabNumeros(v):etab==="leilao"?tabLeilao(v):etab==="docs"?tabDocs(v):tabDados(v);
  if(etab==="vistoria"){vistRefresh();renderVF()}
  if(etab==="numeros"){renderFipe()}
  if(!canWrite)b.querySelectorAll("input,select,textarea").forEach(e=>e.disabled=true);
  if(papel==="vistoriador")b.querySelectorAll("[data-k],[data-dk],[data-ok]").forEach(e=>e.disabled=true);
  refresh();
}
/* ----- aba Vistoria ----- */
function tabVistoria(v){
  const vs=v.vistoria||{};const ck=vs.checks||{};const orc=v.orcado||[];
  const resp=membros.map(m=>`<option value="${esc(m.nome)}" ${vs.resp===m.nome?"selected":""}>${esc(m.nome)}</option>`).join("");
  return `${v.fotosRef?`<div class="gal">${v.fotosRef.map((u,i)=>`<button class="gal-i" data-lb="${i}"><img src="${esc(u)}" alt="Foto ${i+1}"></button>`).join("")}</div><div class="mini" style="margin-top:6px">Fotos do leilão · toque para ampliar</div>`:""}
  <fieldset class="vist"><legend>🔍 Vistoria presencial</legend>
   <div class="f2"><label>Situação<select data-vk="status">${Object.entries(STV).map(([k,n])=>`<option value="${k}" ${(vs.status||"a_vistoriar")===k?"selected":""}>${n}</option>`).join("")}</select></label>
    <label>Responsável<select data-vk="resp"><option value="">—</option>${resp}</select></label></div>
   <div class="vist-row" style="margin:12px 0 4px"><div class="vbar2"><i id="vProg"></i></div><span id="vProgT"></span></div>
   <div class="nota-auto" id="vNota"></div>
   ${v.chassi?`<div class="mini">Chassi do edital: <b class="num">${esc(v.chassi)}</b> — confira na moto</div>`:""}
   ${CHECKS.map(([k,l])=>{const x=ck[k];const its=orc.filter(o=>o.item===k);return `<div class="chk2 ${x?"st-"+x:""}"><div class="chk"><span>${l}</span><div class="seg" data-ck="${k}">${[["ok","✓ OK"],["at","⚠ Atenção"],["pb","✕ Problema"]].map(([val,t])=>`<button class="s-${val} ${x===val?"on":""}" data-cv="${val}">${t}</button>`).join("")}</div></div>
     ${x==="at"||x==="pb"?`<div class="orc-box">
       <div class="fin">${its.map(o=>orcRow(o,v)).join("")}<div class="chips">${(CHECK_SUG[k]||[]).map(s=>`<button data-orcadd="${k}" data-desc="${esc(s)}">＋ ${esc(s)}</button>`).join("")}<button data-orcadd="${k}" data-desc="">＋ Outro</button></div></div>
       <label class="btn ghost sm vf-add" style="margin-top:6px"><input type="file" accept="image/*" multiple hidden data-fitem="${k}">📷 Foto deste item</label></div>`:""}</div>`}).join("")}
   <div class="f2 fin" style="margin-top:12px"><label>Nota manual (opcional)<input data-vk="nota" inputmode="decimal" value="${esc(vs.nota??"")}" placeholder="vazio = automática"></label><label>Meu lance limite (R$)<input data-vk="limite" inputmode="decimal" value="${esc(fmtIn(vs.limite))}" placeholder="Até quanto vou"></label></div>
   <div class="calc fin"><span>Lance máximo calculado</span><b id="vLmax">—</b></div>
   ${v.lanceMin?`<div class="mini fin">Lance mínimo do leilão: <b>${brl(v.lanceMin)}</b></div>`:""}
   <label style="margin-top:10px">Anotações da vistoria <button class="mic" data-mic="vobs" type="button" title="Ditar">🎤</button><textarea id="vobs" data-vk="obs" rows="3" placeholder="O que viu no pátio: barulho, peças faltando, ferrugem…">${esc(vs.obs||"")}</textarea></label>
   <div class="sec-t" style="margin:16px 0 8px">📷 Fotos da vistoria</div>
   <div class="vf" id="vfBox"></div>
   <label class="btn ghost sm vf-add"><input type="file" id="vfIn" accept="image/*" multiple hidden>📷 Tirar / adicionar fotos</label>
   <div class="mini" id="vfSt"></div>
   ${(v.audiosVist||[]).length?`<div class="sec-t" style="margin:16px 0 8px">🎤 Áudios da vistoria</div>${v.audiosVist.map(a=>`<details class="evid"><summary>${esc(a.arquivo)}</summary>${esc(a.texto)}</details>`).join("")}`:""}
  </fieldset>`;
}
function orcRow(o,v){return `<div class="drow orc" data-oid="${o.id}"><input data-ok="desc" list="dlPecas" value="${esc(o.desc)}" placeholder="Peça / serviço"><input data-ok="valor" inputmode="decimal" placeholder="R$" value="${esc(fmtIn(o.valor))}"><button data-orcdel="${o.id}" aria-label="Remover">✕</button>
  <div class="orc-meta">${sugHTML(o.desc,v.modelo)}${o.origem==="ia"?`<span class="tag-ia">IA</span>`:""}${o.feito?`<span class="tag-ok">gasto lançado</span>`:""}</div></div>`}
/* ----- aba Números ----- */
function tabNumeros(v){
  const c=calc(v);const g=grupoDe(v);const cu=c.cu;const orc=v.orcado||[];
  const cats=["estetica","mecanica","documentacao","transporte","outros"];
  const real=k=>(v.despesas||[]).filter(d=>d.cat===k).reduce((a,d)=>a+num(d.valor),0);
  const prev=k=>orc.filter(o=>o.cat===k&&o.on!==false).reduce((a,o)=>a+num(o.valor),0);
  const socios=v.socios||[];const totAp=socios.reduce((a,s)=>a+num(s.aporte),0);
  return `<fieldset><legend>📁 Edital</legend>${g?`<div><b>${esc(g.nome)}</b> <span class="mini">${custasResumo(g.custas).join(" · ")}</span></div>`:`<div class="mini">Sem grupo. Defina na aba 🏁 Leilão para usar as custas do edital.</div>`}
    <div class="f2" style="margin-top:8px"><label>Comissão (%) desta moto<input data-k="comissaoPct" inputmode="decimal" value="${esc(fmtIn(v.comissaoPct))}" placeholder="edital: ${num(cu.c.comissaoPct)}"></label><label>Taxa adm. (%) desta moto<input data-k="taxaAdmPct" inputmode="decimal" value="${esc(fmtIn(v.taxaAdmPct))}" placeholder="edital: ${num(cu.c.taxaAdmPct)}"></label></div>
    <div class="mini">Deixe vazio para usar o valor do edital.</div></fieldset>
  <fieldset><legend><span class="dot" style="background:var(--c-arremate)"></span>🔨 Arremate</legend>
    <div class="f3">${inp("lance","Valor do lance (R$)",{num:1})}${inp("taxaPatio","Pátio / diárias (R$)",{num:1})}${inp("outrosArremate","Outras taxas (R$)",{num:1})}</div>
    <div class="calc"><span>Comissão + taxa adm.</span><b id="cCom">—</b></div>${cu.fixas?`<div class="calc"><span>Taxas fixas do edital</span><b>${brl(cu.fixas)}</b></div>`:""}
    <div class="calc big"><span>💰 Pagamento total do arremate</span><b id="cPag">—</b></div><div class="mini" id="cFipe"></div></fieldset>
  <fieldset><legend>🧾 Orçamento previsto <span class="mini" style="margin:0">— da vistoria, da IA ou manual</span></legend>
    ${cats.map(k=>{const its=orc.filter(o=>o.cat===k);return its.length?`<div class="sec-t" style="margin:10px 0 4px">${CATS[k].i} ${CATS[k].n}</div>`+its.map(o=>`<div class="orc2 ${o.on===false?"off":""}"><input type="checkbox" data-oon="${o.id}" ${o.on===false?"":"checked"}><div><b>${esc(o.desc||"—")}</b>${o.item?` <small>${esc((CHECKS.find(c=>c[0]===o.item)||[0,""])[1])}</small>`:""}</div><b>${brl(num(o.valor))}</b>
      ${o.feito?`<span class="tag-ok">real ${brl(num(o.real))}</span>`:`<button class="btn ghost sm" data-ofeito="${o.id}">✓ Gasto feito</button>`}</div>`).join(""):""}).join("")||`<div class="mini">Nada orçado ainda. Marque ⚠/✕ na vistoria para orçar peça por peça.</div>`}
    <div class="chips"><button data-orcadd="" data-desc="">＋ Item manual</button></div>
    ${c.docsPrev?`<div class="mini">+ documentação típica do edital: ${brl(c.docsPrev)} (sai da conta quando você lançar gasto de documentação)</div>`:""}
    <div id="orcFeito"></div></fieldset>
  <fieldset><legend>⚖️ Orçado × gasto real</legend><table class="tcmp"><tr><th></th><th>Orçado</th><th>Real</th><th>Dif.</th></tr>
    ${cats.map(k=>{const p=prev(k),r=real(k);return p||r?`<tr><td>${CATS[k].i} ${CATS[k].n}</td><td>${brl(p)}</td><td>${brl(r)}</td><td class="${r-p>0?"neg":"pos"}">${r-p>0?"+":""}${brl(r-p)}</td></tr>`:""}).join("")}
    <tr class="tot"><td>Total</td><td>${brl(c.orcTot)}</td><td>${brl(c.real)}</td><td class="${c.real-c.orcTot>0?"neg":"pos"}">${brl(c.real-c.orcTot)}</td></tr></table></fieldset>
  ${despSec("estetica","Gastos reais — estética","✨")}${despSec("mecanica","Gastos reais — mecânica","🔧")}${despSec("documentacao","Gastos reais — documentação","📄")}${despSec("transporte","Gastos reais — transporte","🚚")}${despSec("outros","Gastos reais — outros","➕")}
  <fieldset><legend>🏷️ Venda</legend>
    <div class="f2">${inp("vendaPretendida","Preço de venda alvo (R$)",{num:1})}${inp("margemAlvo","Margem desejada (%)",{num:1,ph:"edital: "+cu.margem})}
    ${inp("conting","Reserva p/ imprevistos (%)",{num:1,ph:"edital: "+cu.conting})}${inp("vendaValor","Valor vendido (R$)",{num:1})}${inp("dataVenda","Data da venda",{type:"date"})}</div>
    <div class="calc"><span>Preço mínimo p/ margem desejada</span><b id="cMin">—</b></div><div class="calc"><span>Ponto de equilíbrio</span><b id="cEq">—</b></div>
    <div class="calc big"><span id="cResL">Lucro</span><b id="cRes">—</b></div><div class="mini" id="cDias"></div></fieldset>
  <fieldset><legend>🤝 Sócios nesta moto</legend>
    ${socios.map((s,i)=>`<div class="drow"><input data-sc="${i}" data-sf="nome" value="${esc(s.nome)}" placeholder="Nome"><input data-sc="${i}" data-sf="aporte" inputmode="decimal" value="${esc(fmtIn(s.aporte))}" placeholder="Aporte R$"><button data-scdel="${i}">✕</button></div>
      <div class="mini">${totAp?`${pct(num(s.aporte)/totAp)} · lucro ${isFinite(c.lucro)?brl(c.lucro*num(s.aporte)/totAp):"—"}`:""}</div>`).join("")||`<div class="mini">Ninguém. Adicione para dividir o lucro pelo valor que cada um colocou.</div>`}
    <div class="chips"><button data-scadd="1">＋ Sócio</button></div></fieldset>
  <fieldset><legend>📈 Controle FIPE × venda</legend><div id="fipeBox"></div>
    <div class="toolbar" style="margin:10px 0 0"><button class="btn ghost sm" id="fAdd">＋ Registrar FIPE de hoje</button><a class="lk" style="font-size:13px" href="https://veiculos.fipe.org.br/" target="_blank" rel="noopener">FIPE oficial ↗</a></div></fieldset>`;
}
/* ----- aba Leilão ----- */
function tabLeilao(v){
  const c=calc(v);const L=v.leilao||{};const pz=prazosDe(v);
  return `<fieldset><legend>📁 Grupo / edital</legend><label>Grupo${grupoSelect(v,'data-k="grupoId"')}</label>
    <div class="f2" style="margin-top:8px">${inp("lote","Lote")}${inp("dataLeilao","Data do leilão",{type:"date"})}${inp("leiloeiro","Leiloeiro")}${inp("lanceMin","Lance mínimo (R$)",{num:1})}</div>
    <div style="margin-top:8px">${inp("link","Link do lote",{ph:"https://…"})}</div>
    ${/^https?:\/\//.test(v.link||"")?`<a class="btn ghost sm" style="text-decoration:none;margin-top:8px" href="${esc(v.link)}" target="_blank" rel="noopener">🔗 Abrir lote</a>`:""}</fieldset>
  ${(()=>{const la=laInfo(v);return la?`<fieldset><legend>📈 Lance atual no site</legend><div class="calc big"><span>Maior lance</span><b>${brl(la.valor)}</b></div>
    <div class="mini">${haQuanto(la.em)}${la.qtd?` · ${la.qtd} lances`:""}${la.inc?` · incremento ${brl(la.inc)}`:""}</div><div style="margin-top:6px">${alertaLance(v)}</div>
    ${(v.leilao.historico||[]).length>1?`<div class="mini" style="margin-top:6px">Evolução: ${v.leilao.historico.slice(-8).map(h=>brl(h.valor).replace(",00","")).join(" → ")}</div>`:""}
    <div class="toolbar" style="margin:8px 0 0"><button class="btn ghost sm" id="laUm">🔄 Atualizar</button></div></fieldset>`:(/^https?:/.test(v.link||"")?`<div class="toolbar" style="margin:0 0 10px"><button class="btn ghost sm" id="laUm">🔄 Buscar lance atual no site</button></div>`:"")})()}
  <fieldset><legend>🎯 Limite de lance</legend>
    <div class="calc big"><span>Lance máximo calculado</span><b id="lLmax">—</b></div>
    <div class="mini">Venda alvo ${brl(c.V)} − margem ${c.cu.margem}% − custas do edital − orçamento ${brl(c.orcTot+c.docsPrev)} (+${c.cu.conting}% reserva), dividido por (1 + comissão + taxa adm.).</div>
    <div class="f2" style="margin-top:8px"><label>Meu lance limite (R$)<input data-vk="limite" inputmode="decimal" value="${esc(fmtIn((v.vistoria||{}).limite))}"></label><div style="display:flex;align-items:flex-end"><button class="btn ghost sm" id="usarLmax">Usar o calculado</button></div></div></fieldset>
  <fieldset><legend>🏁 Resultado do leilão</legend>
    <div class="f2"><label>Resultado<select data-lk="resultado">${[["","Aguardando"],["ganhou","Arrematei"],["perdeu","Perdi"],["nao","Não participei"]].map(([k,n])=>`<option value="${k}" ${(L.resultado||"")===k?"selected":""}>${n}</option>`).join("")}</select></label>
     <label>Meu último lance (R$)<input data-lk="meuLance" inputmode="decimal" value="${esc(fmtIn(L.meuLance))}"></label>
     <label>Valor final do arremate (R$)<input data-lk="valorFinal" inputmode="decimal" value="${esc(fmtIn(L.valorFinal))}"></label></div>
    <div class="mini">Registrar o valor final, mesmo quando você perde, monta a sua base de preços reais de arremate.</div></fieldset>
  ${pz.length?`<fieldset><legend>⏰ Prazos depois do arremate</legend>${pz.map(p=>`<label class="pz ${p.feito?"ok":p.dias<0?"atr":p.dias<=3?"perto":""}"><input type="checkbox" data-pz="${p.k}" ${p.feito?"checked":""}><span><b>${esc(p.t)}</b><small>${p.d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})} · ${p.feito?"feito":p.dias<0?`atrasado ${-p.dias}d`:p.dias===0?"hoje":`em ${p.dias}d`}</small></span></label>`).join("")}
    <div class="mini">Prazos calculados pelas custas do edital (${esc((grupoDe(v)||{}).nome||"")}).</div></fieldset>`:""}`;
}
/* ----- aba Dados ----- */
function tabDados(v){
  return `<fieldset><legend>🚗 Veículo</legend><div class="f2">${inp("modelo","Marca / modelo",{ph:"Ex.: Honda CG 160 Fan"})}${inp("ano","Ano",{ph:"2019/2020"})}
    ${inp("cor","Cor")}${inp("placa","Placa")}${inp("chassi","Chassi (do edital)")}${inp("km","Km")}
    <label>Status<select data-k="status">${Object.entries(STATUS).map(([k,n])=>`<option value="${k}" ${v.status===k?"selected":""}>${n}</option>`).join("")}</select></label><span class="fin">${inp("fipe","Tabela FIPE (R$)",{num:1})}</span></div>
    <div class="toolbar fin" style="margin:10px 0 0"><button class="btn ghost sm" id="xAval">🤖 ${v.avaliacao?"Ver avaliação":"Avaliar"}</button></div></fieldset>
  <fieldset><legend>📝 Observações</legend><label><textarea data-k="obs" rows="4">${esc(v.obs)}</textarea></label></fieldset>
  ${canWrite&&papel!=="vistoriador"?`<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn danger" id="xDel">Excluir (vai para a lixeira)</button></div>
  <div class="confirm" id="cfm">Mover <b>${esc(v.modelo||"este veículo")}</b> para a lixeira? Dá para restaurar em ⚙️ Config. <div style="margin-top:8px;display:flex;gap:8px"><button class="btn danger sm" id="cfmY">Sim, excluir</button><button class="btn ghost sm" id="cfmN">Cancelar</button></div></div>`:""}`;
}
/* ----- cálculos ao vivo ----- */
function refresh(){
  const v=editing;if(!v)return;const c=calc(v);const set=(id,t,cl)=>{const e=$("#"+id);if(e){e.textContent=t;if(cl!==undefined)e.className=cl}};
  const nt=notaFinal(v);
  set("sCusto",brl(c.custo));set("sLmax",c.lmax?brl(c.lmax):"—");set("sLucro",isFinite(c.roi)?pct(c.roi):"—",isFinite(c.lucro)?(c.lucro>=0?"pos":"neg"):"");set("sNota",nt!=null?nt.toLocaleString("pt-BR")+"/10":"—");
  set("vLmax",c.lmax?brl(c.lmax):"informe venda alvo ou FIPE");set("lLmax",c.lmax?brl(c.lmax):"informe venda alvo ou FIPE");
  set("cCom",brl(c.comissao+c.adm));set("cPag",brl(c.pagamento));
  const cf=$("#cFipe");if(cf)cf.textContent=c.fipe?`Arremate = ${pct(c.pagamento/c.fipe)} da FIPE · custo previsto = ${pct(c.pctFipe)} da FIPE`:"";
  ["estetica","documentacao","mecanica","transporte","outros"].forEach(k=>set("sub-"+k,brl(c.porCat[k])));
  set("cMin",brl(c.precoMin));set("cEq",brl(c.custo));
  set("cResL",c.vendido?"✅ Lucro realizado":"📈 Lucro previsto");
  const r=$("#cRes");if(r){r.textContent=isFinite(c.lucro)?`${brl(c.lucro)} · ${pct(c.roi)}`:"informe lance e venda";r.style.color=isFinite(c.lucro)?(c.lucro>=0?"var(--good)":"var(--bad)"):""}
  set("cDias",c.dias!=null?`${c.dias} dia(s) ${c.vendido?"do leilão até a venda":"desde o leilão"}`:"");
  const vn=$("#vNota");if(vn){const a=notaAuto(v);vn.innerHTML=a!=null?`Nota automática: <b>${a.toLocaleString("pt-BR")}/10</b> <small>(motor e chassi pesam 3×, freios e garfo 2×)</small>`:`<small>Marque os itens para calcular a nota.</small>`}
  fipeInfo&&$("#fipeInfo")&&fipeInfo();
}
function salvar(){refresh();persist(editing)}
function dlPecas(){const s=new Set([...nomesConhecidos(),...Object.values(CHECK_SUG).flat(),...Object.values(PRESETS).flat()]);return `<datalist id="dlPecas">${[...s].map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`}
function bindEditor(){
  const s=$("#sheet");if(!$("#dlPecas"))s.insertAdjacentHTML("beforeend",dlPecas());
  s.oninput=e=>{const t=e.target;const v=editing;if(!v)return;
    if(t.dataset.k){v[t.dataset.k]=t.value;if(t.dataset.k==="modelo")$("#eTitle").textContent=t.value||"Novo veículo";
      if(t.dataset.k==="grupoId"){const g=grupoDe(v);v.grupo=g?g.nome:"";renderETab();if(g)autoCompletar(v)}
      if(t.dataset.k==="vendaValor"&&num(t.value)>0&&v.status!=="vendido"){v.status="vendido";if(!v.dataVenda)v.dataVenda=new Date().toISOString().slice(0,10);toast("Status: Vendido")}}
    else if(t.dataset.dk){const d=(v.despesas||[]).find(x=>x.id===t.closest(".drow").dataset.did);if(d){d[t.dataset.dk]=t.value;registrarPreco("real:"+v.id+":"+d.id,d.desc,d.cat,d.valor,"gasto_real",v)}}
    else if(t.dataset.fh!=null){const h=(v.fipeHist||[])[+t.dataset.fh];if(h)h[t.dataset.ff]=t.value}
    else if(t.dataset.vk){v.vistoria=v.vistoria||{checks:{}};v.vistoria[t.dataset.vk]=t.value}
    else if(t.dataset.ok){const o=(v.orcado||[]).find(x=>x.id===t.closest("[data-oid]").dataset.oid);if(o){o[t.dataset.ok]=t.value;registrarPreco("orc:"+v.id+":"+o.id,o.desc,o.cat,o.valor,o.origem||"vistoria",v);
      if(t.dataset.ok==="desc"){const m=t.closest("[data-oid]").querySelector(".orc-meta");if(m)m.innerHTML=sugHTML(o.desc,v.modelo)}}}
    else if(t.dataset.lk){v.leilao=v.leilao||{};v.leilao[t.dataset.lk]=t.value;
      if(t.dataset.lk==="resultado"&&t.value==="ganhou"){if(v.status==="avaliacao")v.status="arrematado";if(num(v.leilao.valorFinal))v.lance=v.leilao.valorFinal;toast("Status: Arrematado");setTimeout(renderETab,0)}
      if(t.dataset.lk==="valorFinal"&&v.leilao.resultado==="ganhou")v.lance=t.value}
    else if(t.dataset.sc!=null){const x=(v.socios||[])[+t.dataset.sc];if(x)x[t.dataset.sf]=t.value}
    else if(t.dataset.oon){const o=(v.orcado||[]).find(x=>x.id===t.dataset.oon);if(o){o.on=t.checked;t.closest(".orc2").classList.toggle("off",!t.checked)}}
    else if(t.dataset.pz){v.prazos=v.prazos||{};v.prazos[t.dataset.pz]=t.checked?new Date().toISOString().slice(0,10):null;setTimeout(renderETab,0)}
    else return;
    salvar();
  };
  s.onchange=e=>{const t=e.target;
    if(t.id==="vfIn"||t.dataset.fitem!==undefined){const fs=[...t.files];t.value="";enfileirarFotos(editing,fs,t.dataset.fitem||null);if(etab!=="vistoria"){etab="vistoria";renderETab()}return}
    if(t.dataset.nf){const fs=[...t.files];t.value="";enfileirarFotos(editing,fs,"nf:"+t.dataset.nf);toast("Comprovante guardado nas fotos da vistoria");return}
    if(t.tagName==="SELECT"||t.type==="checkbox"||t.type==="date")s.oninput(e)};
  s.onclick=e=>{const t=e.target.closest("button");if(!t)return;const v=editing;
    if(t.dataset.etab){etab=t.dataset.etab;s.querySelectorAll(".etabs button").forEach(b=>b.classList.toggle("on",b.dataset.etab===etab));renderETab();$("#ov").scrollTop=0;return}
    if(t.dataset.cv){const k=t.closest(".seg").dataset.ck;v.vistoria=v.vistoria||{checks:{}};v.vistoria.checks=v.vistoria.checks||{};const nv=v.vistoria.checks[k]===t.dataset.cv?"":t.dataset.cv;v.vistoria.checks[k]=nv;
      (v.orcado||[]).filter(o=>o.item===k).forEach(o=>o.on=nv==="at"||nv==="pb");
      if(vistProg(v).done>=CHECKS.length&&(!v.vistoria.status||v.vistoria.status==="a_vistoriar"))v.vistoria.status="vistoriada";
      keepScroll(renderETab);salvar();return}
    if(t.dataset.orcadd!==undefined){const k=t.dataset.orcadd;v.orcado=v.orcado||[];const sug=sugerirPreco(t.dataset.desc,v.modelo);
      const o={id:uid(),cat:k?CHECK_CAT[k]:"outros",desc:t.dataset.desc,valor:sug?String(sug.mediana):"",item:k||null,origem:k?"vistoria":"manual",on:true};v.orcado.push(o);
      if(sug)registrarPreco("orc:"+v.id+":"+o.id,o.desc,o.cat,o.valor,o.origem,v);keepScroll(renderETab);salvar();
      setTimeout(()=>{const r=$(`[data-oid="${o.id}"] input[data-ok="${o.desc?"valor":"desc"}"]`);if(r)r.focus()},30);return}
    if(t.dataset.orcdel){v.orcado=(v.orcado||[]).filter(o=>o.id!==t.dataset.orcdel);keepScroll(renderETab);salvar();return}
    if(t.dataset.sugv){const row=t.closest("[data-oid]");if(row){const o=v.orcado.find(x=>x.id===row.dataset.oid);o.valor=t.dataset.sugv;row.querySelector('[data-ok="valor"]').value=fmtIn(o.valor);registrarPreco("orc:"+v.id+":"+o.id,o.desc,o.cat,o.valor,o.origem||"vistoria",v);salvar()}return}
    if(t.dataset.ofeito){const o=v.orcado.find(x=>x.id===t.dataset.ofeito);$("#orcFeito").innerHTML=`<div class="card" style="margin-top:10px"><b>Quanto custou de verdade “${esc(o.desc)}”?</b><div class="drow" style="grid-template-columns:1fr 110px"><input id="ofV" inputmode="decimal" value="${esc(fmtIn(o.valor))}"><button class="btn sm" data-ofok="${o.id}">Lançar</button></div><div class="mini">Vira um gasto real e ensina o banco de preços.</div></div>`;$("#ofV").focus();return}
    if(t.dataset.ofok){const o=v.orcado.find(x=>x.id===t.dataset.ofok);const real=num($("#ofV").value);if(!(real>0))return;
      const d={id:uid(),cat:o.cat,desc:o.desc,valor:String(real),orcId:o.id};v.despesas=v.despesas||[];v.despesas.push(d);o.feito=true;o.real=real;
      registrarPreco("real:"+v.id+":"+d.id,d.desc,d.cat,real,"gasto_real",v);keepScroll(renderETab);salvar();toast("Gasto lançado ✓");return}
    if(t.dataset.add){const cat=t.dataset.add;const d={id:uid(),cat,desc:t.dataset.desc,valor:""};v.despesas=v.despesas||[];v.despesas.push(d);keepScroll(renderETab);salvar();
      setTimeout(()=>{const r=$(`[data-did="${d.id}"] input[data-dk="${d.desc?"valor":"desc"}"]`);if(r)r.focus()},30);return}
    if(t.dataset.del){v.despesas=(v.despesas||[]).filter(x=>x.id!==t.dataset.del);keepScroll(renderETab);salvar();return}
    if(t.dataset.scadd){v.socios=v.socios||[];v.socios.push({nome:"",aporte:""});keepScroll(renderETab);salvar();return}
    if(t.dataset.scdel!=null){v.socios.splice(+t.dataset.scdel,1);keepScroll(renderETab);salvar();return}
    if(t.dataset.lb!=null){openLB(v.fotosRef,+t.dataset.lb);return}
    if(t.dataset.vfo!=null){openLB((v.fotosVist||[]).map(f=>f.url),+t.dataset.vfo);return}
    if(t.dataset.vfx!=null){if(!canWrite)return;if(t.dataset.c!=="1"){t.dataset.c="1";t.textContent="?";setTimeout(()=>{t.dataset.c="";t.textContent="✕"},3000);return}removerFoto(v,t.dataset.vfx);return}
    if(t.dataset.fhdel!=null){v.fipeHist.splice(+t.dataset.fhdel,1);renderFipe();salvar();return}
    if(t.id==="fAdd"){v.fipeHist=v.fipeHist||[];v.fipeHist.push({data:new Date().toISOString().slice(0,10),valor:v.fipe||""});renderFipe();salvar();return}
    if(t.id==="usarLmax"){const c=calc(v);if(!c.lmax)return toast("Informe venda alvo ou FIPE");v.vistoria=v.vistoria||{checks:{}};v.vistoria.limite=String(Math.floor(c.lmax/50)*50);keepScroll(renderETab);salvar();return}
    if(t.dataset.mic){ditar($("#"+t.dataset.mic),t);return}
    if(t.id==="xAval"){closeEditor();loadAvFromVehicle(v);tab="avaliar";render();window.scrollTo(0,0);return}
    if(t.id==="xClose"){closeEditor();return}
    if(t.id==="xDel"){$("#cfm").classList.add("on");return}
    if(t.id==="cfmN"){$("#cfm").classList.remove("on");return}
    if(t.id==="cfmY"){const id=v.id;editing=null;$("#ov").classList.remove("on");document.body.style.overflow="";removeV(id);toast("Movido para a lixeira");return}
  };
}
function keepScroll(fn){const o=$("#ov");const y=o.scrollTop;fn();o.scrollTop=y}
function closeEditor(){
  if(editing&&canWrite&&papel!=="vistoriador"){const v=vehicles.find(x=>x.id===editing.id);if(v&&!v.modelo&&!num(v.lance)&&!(v.despesas||[]).length&&!(v.orcado||[]).length&&!srv[v.id]){vehicles=vehicles.filter(x=>x!==v);lsSave()}}
  editing=null;$("#ov").classList.remove("on");document.body.style.overflow="";render();
}
let _rec=null;
function ditar(ta,btn){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast("Ditado não disponível neste navegador");
  if(_rec){_rec.stop();return}_rec=new SR();_rec.lang="pt-BR";_rec.interimResults=false;_rec.continuous=true;btn.classList.add("rec");
  _rec.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)t+=e.results[i][0].transcript;if(t){ta.value=(ta.value?ta.value.trim()+" ":"")+t.trim();ta.dispatchEvent(new Event("input",{bubbles:true}))}};
  _rec.onend=()=>{_rec=null;btn.classList.remove("rec")};_rec.onerror=()=>{_rec=null;btn.classList.remove("rec")};_rec.start();toast("🎤 Fale… toque de novo para parar")}
