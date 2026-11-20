/* ---------- IA (Edge Function "ia" no Supabase; regras em ai/skills) ---------- */
async function chamarIA(acao,dados){
  if(!sb||!painelId)throw new Error("Entre na sua conta para usar a IA");
  const {data,error}=await sb.functions.invoke("ia",{body:{acao,painel_id:painelId,...dados}});
  if(error){let m=error.message||"falha";try{const j=await error.context.json();m=j.erro||m}catch(e){}
    if(/Failed to send|not found|404/i.test(m))m="A função de IA ainda não foi instalada no Supabase";throw new Error(m)}
  if(data&&data.erro)throw new Error(data.erro);return data;
}
const ok=c=>c&&c.valor!==null&&c.valor!==undefined&&c.valor!=="";
const selo=c=>c.verificado?`<span class="tag-ok">✓ conferido no texto</span>`:`<span class="tag-warn">⚠ ${esc(c.motivo||"confira")}</span>`;
const trechoHTML=c=>c.trecho?`<div class="evid">“${esc(c.trecho)}”${c.pagina?` <small>· pág. ${c.pagina}</small>`:""}</div>`:"";

/* ----- ler_edital ----- */
let edRes=null;
async function lerEditalIA(g){
  const st=$("#gIASt");const say=t=>{if(st)st.innerHTML=t};
  if(!/^https?:\/\//.test(g.edital_url||""))return say(`<div class="mini neg">Cole o link do PDF do edital no campo acima.</div>`);
  say(`<div class="ia-box">🤖 Lendo o edital… pode levar até 1 minuto.</div>`);
  try{edRes=await chamarIA("ler_edital",{url:g.edital_url});revisarEdital(g)}
  catch(e){say(`<div class="ia-box"><b class="neg">Não consegui ler o edital.</b><div class="mini">${esc(e.message)}</div></div>`)}
}
const ED_CAMPOS=[["comissaoPct","Comissão do leiloeiro","%"],["taxaAdmPct","Taxa administrativa","%"],["prazoPagamentoH","Prazo de pagamento","h"],["liberacaoDias","Retirada liberada após","dias"],["prazoTransferenciaDias","Prazo de transferência","dias"],["diasCarencia","Dias sem estadia","dias"],["estadiaDia","Estadia por dia","R$"],["data_leilao","Data do leilão",""],["leiloeiro","Leiloeiro",""],["comitente","Comitente",""],["cidade","Cidade",""],["debitos","Débitos",""],["regras","Regras",""]];
function revisarEdital(g){
  const r=edRes;const st=$("#gIASt");const achados=ED_CAMPOS.filter(([k])=>ok(r[k]));
  const nulos=ED_CAMPOS.filter(([k])=>!ok(r[k])).map(x=>x[1]);
  st.innerHTML=`<div class="ia-box"><b>🤖 O que a IA achou no edital</b>${r.escaneado?`<div class="mini neg">PDF escaneado: não deu para conferir os trechos automaticamente. Confira cada um no edital.</div>`:`<div class="mini">${r.paginas} página(s) lidas. Itens conferidos no texto vêm marcados. Os outros, confira antes de aplicar.</div>`}
   ${achados.map(([k,l,u])=>{const c=r[k];return `<label class="ia-it"><input type="checkbox" data-edk="${k}" ${c.verificado?"checked":""}><span><b>${l}:</b> ${esc(String(c.valor))}${u&&typeof c.valor==="number"?" "+u:""} ${selo(c)}${trechoHTML(c)}</span></label>`}).join("")}
   ${(r.taxasFixas||[]).map((t,i)=>`<label class="ia-it"><input type="checkbox" data-edt="${i}" ${t.verificado?"checked":""}><span><b>Taxa fixa:</b> ${esc(t.nome)} — ${brl(num(t.valor))} ${selo(t)}${trechoHTML(t)}</span></label>`).join("")}
   ${nulos.length?`<div class="mini">Não está no edital: ${nulos.map(esc).join(", ")}. Ficou em branco, sem chute.</div>`:""}
   ${(r.obs||[]).length?`<div class="mini">Observações: ${r.obs.map(esc).join(" · ")}</div>`:""}
   <div class="toolbar" style="margin:10px 0 0"><button class="btn sm" id="edAplicar">Aplicar os marcados</button><button class="btn ghost sm" id="edDesc">Descartar</button></div></div>`;
  $("#edAplicar").onclick=()=>{const c=g.custas;c.evidencias=c.evidencias||{};
    st.querySelectorAll("[data-edk]:checked").forEach(x=>{const k=x.dataset.edk;const v=r[k];
      if(["data_leilao","leiloeiro","comitente","cidade"].includes(k))g[k]=v.valor;else c[k]=v.valor;if(v.trecho)c.evidencias[k]=v.trecho+(v.pagina?` (pág. ${v.pagina})`:"")});
    st.querySelectorAll("[data-edt]:checked").forEach(x=>{const t=r.taxasFixas[+x.dataset.edt];if(!c.taxasFixas.some(y=>norm(y.nome)===norm(t.nome)))c.taxasFixas.push({nome:t.nome,valor:num(t.valor)});c.evidencias["taxa: "+t.nome]=t.trecho});
    c.fonte=`Edital lido por IA em ${new Date().toLocaleDateString("pt-BR")}, revisado por ${meuNome||"você"}`;edRes=null;renderGrupo();toast("Aplicado. Confira e toque em 💾 Salvar edital")};
  $("#edDesc").onclick=()=>{edRes=null;st.innerHTML=""};
}

/* ----- importar_lote (link) ----- */
const LOTE_CAMPOS=[["modelo","Modelo"],["ano","Ano"],["cor","Cor"],["placa_final","Placa (final)"],["chassi","Chassi"],["km","Km"],["lote","Lote"],["lance_minimo","Lance mínimo"],["lance_atual","Lance atual"],["data_leilao","Data do leilão"],["leiloeiro","Leiloeiro"],["comitente","Comitente"],["situacao","Situação"],["observacoes","Observações"]];
let loteRes=null,loteGrupo="";
function abrirImportLink(){
  if(!podeGerir())return;loteRes=null;loteGrupo=fgrupoId||"";
  $("#sheet").innerHTML=`<div class="shead"><div class="row"><button class="btn ghost sm" id="ilX">← Voltar</button><h2>🔗 Importar lote por link</h2></div></div><div class="sbody">
   <fieldset><legend>Lote</legend><label>Link da página do lote<input id="ilUrl" placeholder="https://… (site do leiloeiro)"></label>
   <label style="margin-top:8px">Grupo / edital${grupoSelect({grupoId:loteGrupo},'id="ilGr"')}</label>
   <div class="toolbar" style="margin:10px 0 0"><button class="btn" id="ilGo">🤖 Ler o lote</button></div><div id="ilSt"></div></fieldset>
   <div class="mini">A IA lê só o que está escrito na página e mostra o trecho de onde tirou cada dado. FIPE e estado da moto não vêm da página: FIPE você consulta, e o estado sai da vistoria.</div></div>`;
  $("#ov").classList.add("on");$("#ov").scrollTop=0;document.body.style.overflow="hidden";
  const s=$("#sheet");s.oninput=null;s.onchange=null;
  s.onclick=async e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="ilX"){$("#ov").classList.remove("on");document.body.style.overflow="";render();return}
    if(b.id==="ilGo"){const url=$("#ilUrl").value.trim();loteGrupo=$("#ilGr").value;if(!/^https?:\/\//.test(url))return toast("Cole um link válido");
      if(grupos.length&&!loteGrupo)return toast("Escolha o grupo / edital");
      b.disabled=true;$("#ilSt").innerHTML=`<div class="ia-box">🤖 Lendo a página do lote…</div>`;
      try{loteRes=await chamarIA("importar_lote",{url});revisarLote(url)}catch(err){$("#ilSt").innerHTML=`<div class="ia-box"><b class="neg">Não consegui ler.</b><div class="mini">${esc(err.message)}</div></div>`}finally{b.disabled=false}return}
    if(b.id==="ilSalvar")salvarLote();
  };
}
function revisarLote(url){
  const r=loteRes;const it=LOTE_CAMPOS.filter(([k])=>ok(r[k]));
  $("#ilSt").innerHTML=`<div class="ia-box"><b>Confira antes de cadastrar</b>
   ${it.map(([k,l])=>`<label class="ia-it"><input type="checkbox" data-lt="${k}" ${r[k].verificado?"checked":""}><span><b>${l}:</b> ${esc(String(r[k].valor))} ${selo(r[k])}${trechoHTML(r[k])}</span></label>`).join("")||`<div class="mini">Nenhum dado encontrado na página.</div>`}
   ${(r.fotos||[]).length?`<div class="sec-t" style="margin:10px 0 6px">Fotos (${r.fotos.length})</div><div class="ia-fotos">${r.fotos.map((u,i)=>`<label><input type="checkbox" data-lf="${i}" checked><img src="${esc(u)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></label>`).join("")}</div>`:""}
   <div class="toolbar" style="margin:10px 0 0"><button class="btn" id="ilSalvar">Cadastrar moto</button></div></div>`;
}
function salvarLote(){
  const r=loteRes;const g=grupos.find(x=>x.id===loteGrupo);const pega=k=>{const x=$(`[data-lt="${k}"]`);return x&&x.checked?r[k].valor:""};
  const fotos=[...document.querySelectorAll("[data-lf]:checked")].map(x=>r.fotos[+x.dataset.lf]);
  const obs=[pega("situacao")&&"Situação: "+pega("situacao"),pega("observacoes")].filter(Boolean).join(" · ");
  const v={id:uid(),modelo:pega("modelo"),ano:pega("ano"),cor:pega("cor"),placa:pega("placa_final"),chassi:pega("chassi"),km:String(pega("km")||""),lote:pega("lote"),lanceMin:pega("lance_minimo")||"",lance:"",
    dataLeilao:pega("data_leilao")||(g&&g.data_leilao)||"",leiloeiro:pega("leiloeiro")||(g&&g.leiloeiro)||"",grupoId:g?g.id:"",grupo:g?g.nome:"",status:"avaliacao",link:r.url,fotosRef:fotos.length?fotos:undefined,
    despesas:[],orcado:[],vistoria:{checks:{}},fipeHist:[],obs,origemIA:{trechos:Object.fromEntries(LOTE_CAMPOS.filter(([k])=>pega(k)!=="").map(([k])=>[k,r[k].trecho]))},criado:Date.now()};
  if(!v.fotosRef)delete v.fotosRef;vehicles.unshift(v);persist(v);loteRes=null;toast("Moto cadastrada ✓");openEditor(v.id);
}

/* ----- analisar_fotos (aba Avaliar) ----- */
getSample=async()=>{sampleLim={images:{maxCount:8}};return "srv"};
function fotoDataURL(file){return compress(file,1024,.72).then(b=>new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(b)}))}
async function runAI(){
  const go=$("#avGo"),st=$("#avSt");
  if(!avPhotos.length&&!/^https?:\/\//.test(av.link||""))return toast("Envie fotos ou cole o link do lote");
  go.disabled=true;const t0=Date.now();const tick=setInterval(()=>{go.textContent=`⏳ Analisando… ${Math.round((Date.now()-t0)/1000)}s`},1000);
  try{
    let imgs=[];
    if(/^https?:\/\//.test(av.link||"")&&!av._loteLido){st.textContent="🔗 Lendo a página do lote…";
      try{const r=await chamarIA("importar_lote",{url:av.link});av._loteLido=1;
        if(ok(r.modelo)&&!av.modelo)av.modelo=r.modelo.valor;if(ok(r.ano)&&!av.ano)av.ano=r.ano.valor;if(ok(r.km)&&!av.km)av.km=String(r.km.valor);
        const la=ok(r.lance_atual)?r.lance_atual.valor:ok(r.lance_minimo)?r.lance_minimo.valor:null;if(la&&!av.lanceAtual)av.lanceAtual=String(la);
        if(ok(r.observacoes)&&!av.descricao)av.descricao=r.observacoes.valor;av._fotosLink=r.fotos||[]}catch(e){st.textContent="⚠ Não deu para ler o link: "+e.message}}
    if(avPhotos.length){st.textContent=`📷 Preparando ${avPhotos.length} foto(s)…`;imgs=await Promise.all(avPhotos.slice(0,8).map(p=>fotoDataURL(p.file)))}
    else imgs=(av._fotosLink||[]).slice(0,8);
    if(!imgs.length)throw new Error("Nenhuma foto disponível. Envie as fotos do lote");
    st.textContent=`🔍 A IA está examinando ${imgs.length} foto(s)…`;
    const r=await chamarIA("analisar_fotos",{imagens:imgs,modelo:av.modelo,ano:av.ano,base:nomesConhecidos()});
    const conf=r.itens.length?r.itens.reduce((a,i)=>a+i.confianca,0)/r.itens.length:0;
    av.result={resumo:r.resumo,confianca:conf>=.75?"alta":conf>=.5?"media":"baixa",condicao_geral:"",nota:0,itens:r.itens,riscos:[],alertas_documentacao:[],dicas_vistoria:(r.nao_avaliavel||[]).map(x=>"Conferir no pátio: "+x),fipe_estimada:null,preco_revenda_sugerido:null};
    av.data=new Date().toISOString();
    av.itens=r.itens.map(i=>{const s=sugerirPreco(i.nome_base||i.peca,av.modelo);
      return {categoria:CATS[i.categoria]?i.categoria:"outros",peca:i.nome_base||i.peca,servico:"",gravidade:i.gravidade==="grave"?"alta":i.gravidade==="leve"?"baixa":"media",
        min:s?s.min:0,max:s?s.max:0,valor:s?String(s.mediana):"",evidencia:`Foto ${i.foto}: ${i.evidencia}${s?` · preço: mediana de ${s.n} lançamento(s)`:" · sem preço na base, preencha"}`,on:i.confianca>=.5}});
    const semPreco=av.itens.filter(i=>!num(i.valor)).length;
    const msg=`✅ ${r.itens.length} item(ns) visto(s) nas fotos em ${Math.round((Date.now()-t0)/1000)}s.${semPreco?` ${semPreco} sem preço na sua base: preencha o valor.`:""} Itens com pouca certeza vêm desmarcados.`;
    renderBg();const st2=$("#avSt");if(st2)st2.textContent=msg;setTimeout(()=>{const el=$("#avRes");if(el)el.scrollIntoView({behavior:"smooth"})},100);
  }catch(e){st.textContent="⚠ "+e.message}
  finally{clearInterval(tick);const g=$("#avGo");if(g){g.disabled=false;g.textContent=av.result?"🔄 Analisar de novo":"🤖 Analisar com IA"}}
}

/* ----- planilha (importar / exportar) ----- */
let _xlsx=null;
function carregarXLSX(){if(window.XLSX)return Promise.resolve(window.XLSX);if(_xlsx)return _xlsx;
  _xlsx=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";s.onload=()=>res(window.XLSX);s.onerror=()=>{_xlsx=null;rej(new Error("Sem internet para carregar o leitor de planilhas"))};document.head.appendChild(s)});return _xlsx}
const SINON={modelo:["modelo","veiculo","veículo","marca/modelo","marca modelo","descricao","descrição","moto"],ano:["ano","ano/modelo","ano fab","ano modelo"],cor:["cor"],placa:["placa","final placa","placa final"],chassi:["chassi","chassis"],km:["km","quilometragem","hodometro","hodômetro"],
  lote:["lote","nº lote","n lote","numero do lote","número do lote"],lanceMin:["lance minimo","lance mínimo","lance inicial","valor minimo","valor mínimo","minimo","mínimo","avaliacao","avaliação"],lance:["lance","arremate","valor arrematado","valor pago","valor do arremate","meu lance"],
  fipe:["fipe","tabela fipe","valor fipe"],vendaPretendida:["venda alvo","preco de venda","preço de venda","venda pretendida","valor de venda"],vendaValor:["vendido","valor vendido","venda realizada"],dataVenda:["data venda","data da venda"],
  dataLeilao:["data","data leilao","data do leilão","data do leilao"],leiloeiro:["leiloeiro","leiloeira"],link:["link","url","endereco","endereço"],obs:["obs","observacao","observação","observacoes","observações","descricao do lote"],status:["status","situacao","situação"]};
const CAMPO_LBL={modelo:"Modelo",ano:"Ano",cor:"Cor",placa:"Placa",chassi:"Chassi",km:"Km",lote:"Lote",lanceMin:"Lance mínimo",lance:"Lance/arremate",fipe:"FIPE",vendaPretendida:"Venda alvo",vendaValor:"Valor vendido",dataVenda:"Data da venda",dataLeilao:"Data do leilão",leiloeiro:"Leiloeiro",link:"Link",obs:"Observações",status:"Status"};
function mapaFixo(cab){const usados=new Set();return cab.map(h=>{const n=norm(h);for(const [k,ls] of Object.entries(SINON)){if(usados.has(k))continue;if(ls.some(s=>norm(s)===n)){usados.add(k);return k}}return null})}
let plan=null;
async function abrirImportPlanilha(){
  if(!podeGerir())return;const inp=document.createElement("input");inp.type="file";inp.accept=".xlsx,.xls,.csv";
  inp.onchange=async()=>{const f=inp.files[0];if(!f)return;try{const X=await carregarXLSX();const wb=X.read(await f.arrayBuffer(),{cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];
    let rows=X.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});rows=rows.filter(r=>r.some(c=>String(c).trim()));
    const hi=rows.findIndex(r=>r.filter(c=>String(c).trim()).length>=2);const cab=rows[hi].map(String);const dados=rows.slice(hi+1);
    plan={nome:f.name,cab,dados,mapa:mapaFixo(cab),grupo:fgrupoId||""};telaPlanilha()}catch(e){toast(e.message)}};inp.click();
}
function telaPlanilha(){
  const p=plan;const faltam=p.cab.filter((h,i)=>h.trim()&&!p.mapa[i]).length;
  $("#sheet").innerHTML=`<div class="shead"><div class="row"><button class="btn ghost sm" id="plX">← Voltar</button><h2>⬆ Importar planilha</h2></div></div><div class="sbody">
   <fieldset><legend>${esc(p.nome)} · ${p.dados.length} linha(s)</legend><label>Grupo / edital das motos${grupoSelect({grupoId:p.grupo},'id="plGr"')}</label>
   <div class="sec-t" style="margin:12px 0 6px">Colunas → campos do sistema</div>
   ${p.cab.map((h,i)=>h.trim()?`<div class="drow" style="grid-template-columns:1fr 1fr"><div class="mini" style="margin:0;align-self:center"><b>${esc(h)}</b><br>${esc(String((p.dados[0]||[])[i]||"").slice(0,40))}</div><select data-pm="${i}"><option value="">— ignorar —</option>${Object.entries(CAMPO_LBL).map(([k,l])=>`<option value="${k}" ${p.mapa[i]===k?"selected":""}>${l}</option>`).join("")}</select></div>`:"").join("")}
   ${faltam?`<div class="toolbar" style="margin:10px 0 0"><button class="btn ghost sm" id="plIA">🤖 Sugerir as ${faltam} coluna(s) restante(s) com IA</button></div>`:""}<div id="plSt" class="mini"></div>
   <div class="toolbar" style="margin:12px 0 0"><button class="btn" id="plOk">Importar ${p.dados.length} moto(s)</button></div></fieldset>
   <div class="mini">A IA só sugere qual coluna é qual. Os valores vêm da planilha sem alteração. Motos com o mesmo lote e modelo de um registro existente são atualizadas, e não duplicadas.</div></div>`;
  $("#ov").classList.add("on");document.body.style.overflow="hidden";
  const s=$("#sheet");s.oninput=null;
  s.onchange=e=>{const t=e.target;if(t.dataset.pm!=null)p.mapa[+t.dataset.pm]=t.value||null;if(t.id==="plGr")p.grupo=t.value};
  s.onclick=async e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="plX"){plan=null;$("#ov").classList.remove("on");document.body.style.overflow="";render();return}
    if(b.id==="plIA"){b.disabled=true;$("#plSt").textContent="🤖 Analisando os cabeçalhos…";
      try{const idx=p.cab.map((h,i)=>i).filter(i=>p.cab[i].trim()&&!p.mapa[i]);const r=await chamarIA("mapear_planilha",{cabecalhos:idx.map(i=>p.cab[i]),amostra:p.dados.slice(0,5).map(l=>idx.map(i=>l[i]))});
        const usados=new Set(p.mapa.filter(Boolean));let n=0;r.mapa.forEach(m=>{const i=idx.find(j=>p.cab[j]===m.cabecalho);if(i!=null&&m.campo&&!usados.has(m.campo)){p.mapa[i]=m.campo;usados.add(m.campo);n++}});
        telaPlanilha();$("#plSt").textContent=`IA sugeriu ${n} coluna(s). Confira acima.`}catch(err){b.disabled=false;$("#plSt").textContent="⚠ "+err.message}return}
    if(b.id==="plOk")importarLinhas();
  };
}
function valCampo(k,x){x=String(x??"").trim();if(!x)return "";
  if(["lanceMin","lance","fipe","vendaPretendida","vendaValor"].includes(k)){const n=x.replace(/[^\d,.-]/g,"");const v=/,\d{1,2}$/.test(n)?n.replace(/\./g,"").replace(",","."):n.replace(/,/g,"");return isFinite(+v)&&v!==""?String(+v):""}
  if(["dataVenda","dataLeilao"].includes(k)){const m=x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m)return `${m[3].length===2?"20"+m[3]:m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;return /^\d{4}-\d{2}-\d{2}/.test(x)?x.slice(0,10):""}
  if(k==="status"){const n=norm(x);return Object.keys(STATUS).find(s=>norm(STATUS[s])===n||s===n)||""}return x}
function importarLinhas(){
  const p=plan;if(!p.mapa.includes("modelo"))return toast("Indique a coluna do modelo");if(grupos.length&&!p.grupo)return toast("Escolha o grupo / edital");
  const g=grupos.find(x=>x.id===p.grupo);let n=0,m=0;
  p.dados.forEach(l=>{const o={};p.mapa.forEach((k,i)=>{if(k){const v=valCampo(k,l[i]);if(v!=="")o[k]=v}});if(!o.modelo)return;
    const ex=vehicles.find(v=>o.lote&&v.lote===o.lote&&norm(v.modelo)===norm(o.modelo)&&(!g||v.grupoId===g.id));
    if(ex){Object.assign(ex,o);persist(ex);m++;return}
    const v={id:uid(),status:"avaliacao",despesas:[],orcado:[],vistoria:{checks:{}},fipeHist:[],criado:Date.now(),...o,grupoId:g?g.id:"",grupo:g?g.nome:"",dataLeilao:o.dataLeilao||(g&&g.data_leilao)||"",leiloeiro:o.leiloeiro||(g&&g.leiloeiro)||""};
    vehicles.push(v);persist(v);n++});
  plan=null;$("#ov").classList.remove("on");document.body.style.overflow="";fgrupoId=g?g.id:"";tab="veiculos";render();toast(`${n} importada(s)${m?` · ${m} atualizada(s)`:""} ✓`);
}
async function exportarPlanilha(){
  try{const X=await carregarXLSX();const arr=filtrados();
    const rows=arr.map(v=>{const c=calc(v);const g=grupoDe(v);const vs=v.vistoria||{};return {"Grupo":g?g.nome:"","Lote":v.lote||"","Modelo":v.modelo||"","Ano":v.ano||"","Cor":v.cor||"","Placa":v.placa||"","Status":STATUS[v.status]||"",
      "Vistoria":`${vistProg(v).done}/${CHECKS.length}`,"Nota":notaFinal(v)??"","Responsável":vs.resp||"","Lance mínimo":num(v.lanceMin)||"","Meu limite":num(vs.limite)||"","Lance máx. calculado":Math.round(c.lmax)||"",
      "Lance/arremate":num(v.lance)||"","Comissão+taxa adm.":Math.round(c.comissao+c.adm),"Taxas fixas":c.cu.fixas,"Pagamento total":Math.round(c.pagamento),"Orçado":Math.round(c.orcTot),"Gasto real":Math.round(c.real),"Documentação prevista":Math.round(c.docsPrev),
      "Custo previsto":Math.round(c.custo),"FIPE":num(v.fipe)||"","Venda alvo/vendido":Math.round(c.venda)||"","Lucro":isFinite(c.lucro)?Math.round(c.lucro):"","ROI %":isFinite(c.roi)?Math.round(c.roi*1000)/10:"","Data venda":v.dataVenda||"","Link":v.link||""}});
    const orc=[];arr.forEach(v=>(v.orcado||[]).forEach(o=>orc.push({"Moto":v.modelo,"Lote":v.lote||"","Item vistoria":(CHECKS.find(c=>c[0]===o.item)||[0,""])[1],"Peça/serviço":o.desc,"Categoria":(CATS[o.cat]||{}).n||o.cat,"Orçado":num(o.valor),"Real":o.feito?num(o.real):"","Origem":o.origem||""})));
    const wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.json_to_sheet(rows),"Motos");if(orc.length)X.utils.book_append_sheet(wb,X.utils.json_to_sheet(orc),"Orçamento");
    const pr=precos.map(p=>({"Peça/serviço":p.nome||p.item,"Categoria":(CATS[p.categoria]||{}).n||p.categoria,"Valor":num(p.valor),"Modelo":p.modelo||"","Origem":p.origem||"","Data":(p.criado_em||"").slice(0,10)}));if(pr.length)X.utils.book_append_sheet(wb,X.utils.json_to_sheet(pr),"Preços");
    const g=grupos.find(x=>x.id===fgrupoId);X.writeFile(wb,`leilao-${g?norm(g.nome).replace(/ /g,"-"):"todos"}-${new Date().toISOString().slice(0,10)}.xlsx`);toast("Planilha gerada ✓")}catch(e){toast(e.message)}
}
