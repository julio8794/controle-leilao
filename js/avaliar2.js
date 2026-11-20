/* ---------- Avaliar: importação só por link (site + edital + FIPE) ---------- */
const urlEdital=u=>String(u||"").split("?")[0].trim().toLowerCase();
const slugLote=u=>{const m=String(u||"").match(/\/lotes?\/(\d{2,4}-\d{2,4})/i);return m?m[1]:""};
const cidadeDoPatio=p=>String(p||"").replace(/\b(ADM|F\/R|FR|INSERV[IÍ]VEL|SUCATA|P[AÁ]TIO)\b/gi,"").replace(/\s+/g," ").trim().toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E)\b/g,w=>w.toLowerCase());
const chassisDe=ls=>new Set((ls||[]).map(l=>norm(l.chassi)).filter(c=>c.length>=10));
function sobreposicao(a,b){const A=chassisDe(a),B=chassisDe(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(c=>{if(B.has(c))n++});return n/Math.min(A.size,B.size)}
/* mesmo edital = mesmo link, link alternativo já visto, ou mesmos chassis no Anexo I (o leiloeiro publica o mesmo edital em arquivos diferentes) */
function gruposDoEdital(ed,lotes){return grupos.filter(g=>urlEdital(g.edital_url)===urlEdital(ed)||((g.custas||{}).editalAliases||[]).some(u=>urlEdital(u)===urlEdital(ed))||(lotes&&lotes.length&&sobreposicao(g.lotes,lotes)>=.8))}
async function gravarGrupoPendente(g){if(!g||!g._pendente)return;const row={...g};delete row._pendente;const {error}=await sb.from("grupos").upsert(row);if(error)throw new Error("Não consegui criar o grupo: "+error.message);delete g._pendente;toast("Grupo "+g.nome+" criado ✓")}
async function lembrarAlias(gs,ed){for(const g of gs){if(urlEdital(g.edital_url)===urlEdital(ed))continue;g.custas=g.custas||{};const al=g.custas.editalAliases||[];if(al.some(u=>urlEdital(u)===urlEdital(ed)))continue;al.push(ed);g.custas.editalAliases=al;try{await sb.from("grupos").update({custas:g.custas}).eq("id",g.id)}catch(e){}}}
const mesmaCidade=(g,c)=>{const a=norm(g.cidade||g.nome||""),b=norm(c);return !!b&&(a===b||a.startsWith(b+" ")||a.startsWith(b))};

let avFila=[],avLinks=[""],avOcupado=false,avMsg="";
const MAX_LINKS=10;
function linksValidos(){const out=[];avLinks.join("\n").split(/[\s,;]+/).forEach(u=>{u=u.trim();if(/^https?:\/\//.test(u)&&!out.some(x=>urlEdital(x)===urlEdital(u)))out.push(u)});return out.slice(0,MAX_LINKS)}
/* casa o lote do site com o Anexo I, sem depender de grupo */
function casarLoteSite(d,lotes,edUrl){
  const n=+String(d.lote||"").split(/[-\/ ]/).pop();const mt=tok(d.modelo),am=anoModelo(d.ano);const pref=String(d.lote||"").includes("-")?String(d.lote).split("-")[0]:"";
  const gsEd=gruposDoEdital(edUrl,lotes).map(g=>g.id);const outros=vehicles.filter(x=>x.editalLote&&String(x.lote||"").includes("-")&&gsEd.includes(x.grupoId));
  const doPref=new Set(outros.filter(x=>pref&&String(x.lote).startsWith(pref+"-")).map(x=>x.editalLote.patio));
  const deOutro=new Set(outros.filter(x=>pref&&!String(x.lote).startsWith(pref+"-")).map(x=>x.editalLote.patio));
  const cand=lotes.filter(l=>(n&&+l.lote===n)||(d.chassi&&norm(d.chassi)===norm(l.chassi))).map(l=>{let s=0;const lt=tok(l.modelo);
    s+=mt.length?mt.filter(t=>lt.includes(t)).length/Math.max(mt.length,lt.length)*4:0;if(am&&anoModelo(l.ano)===am)s+=2;if(num(d.lanceMin)&&num(d.lanceMin)===l.lanceMin)s+=2;
    if(d.cor&&norm(d.cor)===norm(l.cor))s+=1;if(d.chassi&&norm(d.chassi)===norm(l.chassi))s+=10;if(doPref.has(l.patio))s+=3;if(deOutro.has(l.patio))s-=3;return {l,s}}).sort((a,b)=>b.s-a.s);
  if(!cand.length)return {nada:true};const [a,b]=cand;
  if(a.s<4||(b&&a.s-b.s<1.5))return {duvida:true,cands:cand.slice(0,4).map(x=>x.l)};
  return {lote:a.l};
}
/* cria/acha o grupo do edital + cidade */
async function grupoParaLote(edUrl,cidade,base,st){
  const mesmos=gruposDoEdital(edUrl,base.lotes);await lembrarAlias(mesmos.filter(g=>!g._pendente),edUrl);
  const ja=mesmos.find(g=>mesmaCidade(g,cidade))||(!cidade&&mesmos[0]);if(ja)return {g:ja,acao:"vinculado"};
  if(!podeGerir())return {g:null,acao:"sem permissão para criar grupo"};
  let custas,extra={};
  if(mesmos.length){const m=mesmos[0];custas=JSON.parse(JSON.stringify(m.custas||{}));extra={data_leilao:m.data_leilao,leiloeiro:m.leiloeiro,comitente:m.comitente,edital_nome:m.edital_nome,lotes:m.lotes||base.lotes}}
  else{if(st)st("🤖 Edital novo: lendo custas e prazos…");custas={taxasFixas:[],docs:[],margemPct:20,contingPct:10,evidencias:{}};extra={lotes:base.lotes};
    try{const r=await chamarIA("ler_edital",{url:edUrl});
      ["comissaoPct","taxaAdmPct","prazoPagamentoH","liberacaoDias","prazoTransferenciaDias","diasCarencia","estadiaDia","debitos","regras"].forEach(k=>{const c=r[k];if(c&&c.verificado&&c.valor!=null){custas[k]=c.valor;if(c.trecho)custas.evidencias[k]=c.trecho+(c.pagina?` (pág. ${c.pagina})`:"")}});
      ["data_leilao","leiloeiro","comitente"].forEach(k=>{const c=r[k];if(c&&c.verificado&&c.valor)extra[k]=c.valor});
      (r.taxasFixas||[]).filter(t=>t.verificado).forEach(t=>custas.taxasFixas.push({nome:t.nome,valor:num(t.valor)}));
      custas.fonte=`Edital lido por IA em ${new Date().toLocaleDateString("pt-BR")} na importação por link (só itens conferidos no texto). Revise em 📁 Editais.`}catch(e){custas.fonte="⚠ Custas não lidas: "+e.message}}
  const nome=[cidade||"Edital",extra.data_leilao?fmtD(extra.data_leilao).slice(0,5):""].filter(Boolean).join(" ");
  const row={id:crypto.randomUUID?crypto.randomUUID():uid(),painel_id:painelId,nome,cidade:cidade||null,leiloeiro:extra.leiloeiro||null,comitente:extra.comitente||null,data_leilao:extra.data_leilao||null,edital_url:edUrl,edital_nome:extra.edital_nome||null,custas,lotes:extra.lotes||null,lotes_lidos_em:new Date().toISOString(),atualizado_em:new Date().toISOString()};
  row._pendente=true;grupos.push(row);
  return {g:row,acao:(mesmos.length?"grupo novo (mesmo edital, outra cidade)":"grupo novo (edital novo)")+" — criado ao salvar"};
}
async function importarPorLink(){
  const st=$("#avLinkSt");const say=h=>{if(st)st.innerHTML=h};
  const url=String(av.link||"").trim();delete av._erro;if(!/^https?:\/\//.test(url)){av._erro="Link inválido";return say(`<span class="neg">Cole o link da página do lote.</span>`)}
  const b=$("#avImp");if(b)b.disabled=true;
  try{
    say("🌐 Lendo a página do lote…");const r=await chamarIA("importar_lote",{url});
    const pega=k=>r[k]&&r[k].valor!=null&&r[k].valor!==""?r[k].valor:"";
    const fresh=newAv();Object.assign(av,{...fresh,_st:av._st,link:url,margem:av.margem||20,conting:av.conting||10,vendaAlvo:""});
    const d={modelo:pega("modelo"),ano:pega("ano"),cor:pega("cor"),placa:pega("placa_final"),chassi:pega("chassi"),renavam:pega("renavam"),motor:pega("motor"),combustivel:pega("combustivel"),cidade:pega("cidade"),uf:pega("uf"),km:pega("km"),lote:slugLote(url)||pega("lote"),lanceMin:pega("lance_minimo"),lanceAtual:pega("lance_atual"),dataLeilao:pega("data_leilao"),leiloeiro:pega("leiloeiro"),comitente:pega("comitente"),situacao:pega("situacao"),obs:pega("observacoes")};
    const ex=vehicles.find(x=>x.link&&urlEdital(x.link)===urlEdital(url));if(ex){av.vid=ex.id;av.jaExiste=ex.modelo||"moto"}
    av.site={estruturado:!!r.estruturado,dados:d,verif:Object.fromEntries(Object.keys(r).filter(k=>r[k]&&typeof r[k]==="object"&&"verificado"in r[k]).map(k=>[k,!!r[k].verificado])),editais:r.editais||[]};
    Object.assign(av,{modelo:d.modelo,ano:d.ano,km:String(d.km||""),lote:d.lote,dataLeilao:d.dataLeilao,leiloeiro:d.leiloeiro||d.comitente,placa:d.placa,lanceAtual:String(d.lanceAtual||d.lanceMin||""),descricao:[d.situacao,d.obs].filter(Boolean).join(" · "),condicao:CONDS[0]});
    av._fotosLink=(r.fotos||[]).filter(u=>!/comitente/i.test(u)).slice(0,8);av._loteLido=1;
    // edital
    const ed=(r.editais||[])[0];av.edital={url:ed||null};
    if(ed){say("📄 Lendo o Anexo I do edital…");
      const conhecido=gruposDoEdital(ed,null)[0];
      let lotes=conhecido?await lotesDoGrupo(conhecido):null;if(!lotes||!lotes.length){const x=await chamarIA("lotes_edital",{url:ed});lotes=x.lotes||[]}
      const m=casarLoteSite(d,lotes,ed);
      if(m.duvida){av.edital.duvida=m.cands;av.edital.lotes=lotes;say("⚠ O lote aparece em mais de um pátio: escolha abaixo.")}
      else{const L=m.lote||null;av.edital.lote=L;await vincularGrupo(ed,L,lotes,say)}}
    else av.edital.aviso="A página não tem link para o edital. Escolha o grupo manualmente.";
    // FIPE oficial
    if(av.modelo&&av.ano){say("💲 Consultando FIPE oficial…");try{const f=await buscarFipe(av.modelo,av.ano);if(f.valor){av.fipe=String(Math.round(f.valor));av.fipeRef=f}else if(f.duvida)av.fipeCands=f.candidatos}catch(e){}}
    av.importadoEm=new Date().toISOString();renderBg();
    const s2=$("#avLinkSt");if(s2)s2.innerHTML="✅ Importado. Confira abaixo e toque em 🤖 Analisar fotos.";
  }catch(e){av._erro=e.message||String(e);console.error("importar lote",url,e);say(`<span class="neg">⚠ ${esc(av._erro)}</span>`)}finally{const b2=$("#avImp");if(b2)b2.disabled=false}
}
async function vincularGrupo(ed,L,lotes,say){
  const cidade=L?cidadeDoPatio(L.patio):"";
  const r=await grupoParaLote(ed,cidade,{lotes},t=>say(t));av.edital.lote=L;av.edital.acao=r.acao;
  if(r.g){av.grupoId=r.g.id;const c=r.g.custas||{};av.comissaoPct=num(c.comissaoPct)+num(c.taxaAdmPct);av.taxas=String((c.taxasFixas||[]).reduce((a,t)=>a+num(t.valor),0)+(c.docs||[]).reduce((a,t)=>a+num(t.valor),0));
    if(c.margemPct!=null)av.margem=num(c.margemPct);if(c.contingPct!=null)av.conting=num(c.contingPct)}
  if(L){const d=av.site.dados;av.anexo=L;["modelo","ano"].forEach(k=>{if(!av[k])av[k]=L[k]});if(!av.placa)av.placa=L.placa;if(!num(av.lanceAtual))av.lanceAtual=String(L.lanceMin);
    av.diverg=[["Modelo",d.modelo,L.modelo,"modelo"],["Ano",d.ano,L.ano,"ano"],["Cor",d.cor,L.cor,"cor"],["Lance mínimo",d.lanceMin,L.lanceMin,"lanceMin"],["Placa",d.placa,L.placa,"placa"],["Chassi",d.chassi,L.chassi,"chassi"],["Renavam",d.renavam,L.renavam,"renavam"],["Nº do motor",d.motor,L.motor,"motor"],["Combustível",d.combustivel,L.combustivel,"combustivel"]].filter(([n,a,b,k])=>temV(a)&&temV(b)&&!/\*|SUPRIMID/.test(String(b))&&!iguais(a,b,k)).map(([n,a,b])=>({n,site:a,edital:b}))}
}
function vinculoHTML(){
  if(!av.importadoEm&&!av.edital)return "";
  const d=(av.site||{}).dados||{},E=av.edital||{},L=E.lote,g=grupos.find(x=>x.id===av.grupoId);
  const lin=(k,v,ok)=>v!==""&&v!=null?`<div class="kv"><span>${k}</span><b>${esc(String(v))}</b>${ok===false?` <small class="neg">não conferido</small>`:""}</div>`:"";
  return `<div class="card vinc">
   ${(av._fotosLink||[]).length?`<div class="mini" style="margin:0 0 4px">${av.site&&av.site.estruturado?`📷 ${av._fotosLink.length} foto(s) do próprio lote (registro do site)`:`📷 ${av._fotosLink.length} foto(s) — confira se são deste lote`}</div><div class="gal">${av._fotosLink.map((u,i)=>`<button class="gal-i" data-avlb="${i}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>`:""}
   <div class="vinc-g">
    <div><div class="sec-t" style="margin:8px 0 4px">🌐 Site do leiloeiro</div>${lin("Modelo",d.modelo)}${lin("Ano",d.ano)}${lin("Cor",d.cor)}${lin("Placa",d.placa)}${lin("Chassi",d.chassi)}${lin("Renavam",d.renavam)}${lin("Motor",d.motor)}${lin("Combustível",d.combustivel)}${lin("Cidade",[d.cidade,d.uf].filter(Boolean).join("/"))}${lin("Lote",d.lote)}${lin("Lance mínimo",d.lanceMin?brl(num(d.lanceMin)):"")}${lin("Lance atual",d.lanceAtual?brl(num(d.lanceAtual)):"")}${lin("Data",d.dataLeilao?fmtD(d.dataLeilao):"")}${lin("Situação",d.situacao)}${lin("Observações",d.obs)}</div>
    <div><div class="sec-t" style="margin:8px 0 4px">📄 Edital ${L?`· ${esc(L.patio)} lote ${esc(L.lote)}`:""}</div>
     ${L?`${lin("Placa",L.placa||(L.semPlaca?"sem placa":""))}${lin("Chassi",L.chassi)}${lin("Renavam",L.renavam)}${L.sufixo?lin("Tipo de lote",L.sufixo):""}${L.suprimido?`<div class="mini">ℹ O edital suprime parte dos dados deste lote; vale o que está no site.</div>`:""}${lin("Motor",L.motor)}${lin("Combustível",L.combustivel)}${lin("Classificação",L.classificacao)}${lin("Lance mínimo",brl(L.lanceMin))}${L.desalienacao?`<div class="mini">⚠ Taxa/desalienação a pagar</div>`:""}`
      :E.duvida?`<div class="mini">O lote aparece em mais de um pátio. Qual é?</div>${E.duvida.map((l,i)=>`<button class="btn ghost sm" style="margin:4px 4px 0 0" data-patio="${i}">${esc(l.patio)} · ${esc(l.modelo)} · ${brl(l.lanceMin)}</button>`).join("")}`
      :`<div class="mini">${esc(E.aviso||(E.url?"Lote não encontrado no Anexo I.":"Sem edital."))}</div>`}
     ${E.url?`<div class="mini"><a class="lk" href="${esc(E.url)}" target="_blank" rel="noopener">Abrir edital ↗</a></div>`:""}</div>
   </div>
   ${(av.diverg||[]).length?`<div class="ia-box" style="margin-top:10px"><b>⚠ Site e edital divergem</b>${av.diverg.map(x=>`<div class="mini" style="margin:4px 0 0">${esc(x.n)}: site “${esc(String(x.site))}” × edital “${esc(String(x.edital))}”. Vale o edital.</div>`).join("")}</div>`:""}
   <div class="sec-t" style="margin:12px 0 4px">📁 Grupo</div>
   ${g?`<div><b>${esc(g.nome)}</b> <span class="mini" style="margin:0">${esc(E.acao||"")} · ${custasResumo(g.custas).join(" · ")}</span></div>`:""}
   <label style="margin-top:6px">Grupo / edital${grupoSelect({grupoId:av.grupoId||""},'id="avGr"')}</label>
   <div class="sec-t" style="margin:12px 0 4px">💲 FIPE oficial</div>
   ${av.fipeRef?`<div><b>${brl(num(av.fipe))}</b> · ${esc(av.fipeRef.modelo)} · ${esc(av.fipeRef.mes)} <small>${av.fipeRef.metodo==="ia"?"(versão escolhida pela IA)":""}</small></div>`:`<div class="mini">${(av.fipeCands||[]).length?"Escolha a versão:":"FIPE não encontrada para esse modelo/ano."}</div>`}
   ${(av.fipeCands||[]).length&&!av.fipeRef?`<select id="avFipeSel"><option value="">— versão na FIPE —</option>${av.fipeCands.map((x,i)=>`<option value="${i}">${esc(x.nome)}</option>`).join("")}</select>`:""}
   ${podeGerir()&&!av.result?`<div class="toolbar" style="margin:12px 0 0"><button class="btn ghost sm" id="avSave">💾 Salvar no controle sem análise de fotos</button></div>`:""}
  </div>`;
}
avaliarHTML=function(){
  const nOk=avFila.filter(x=>x.importadoEm).length;
  return `
  <div class="card" style="border-color:var(--acc)"><b>🔗 Avaliar lotes pelo link</b>
   <div class="mini" style="margin-top:6px">Cole um link por janela, ou vários de uma vez. O sistema puxa os dados e as fotos do site, vincula o edital (cria o grupo se for edital novo ou outra cidade), consulta a FIPE oficial, e a IA analisa as fotos.</div>
   <div class="links">${avLinks.map((u,i)=>`<div class="lrow"><span class="lnum">${i+1}</span><input data-lk="${i}" placeholder="https://…/lotes/230-006-…" value="${esc(u)}" ${avOcupado?"disabled":""}>${avLinks.length>1?`<button class="lx" data-lkdel="${i}" aria-label="Remover janela" ${avOcupado?"disabled":""}>✕</button>`:""}</div>`).join("")}</div>
   <div class="toolbar" style="margin:8px 0 0">${avLinks.length<MAX_LINKS?`<button class="btn ghost sm" id="avAddLink" ${avOcupado?"disabled":""}>＋ Outro link</button>`:""}<button class="btn" id="avImp" ${avOcupado?"disabled":""}>${avOcupado?"⏳ Importando…":`Importar ${linksValidos().length>1?linksValidos().length+" lotes":""}`}</button></div>
   <div class="mini" id="avLinkSt">${avOcupado?"":avMsg}</div></div>
  ${avFila.length>1?`<div class="fila">${avFila.map((x,i)=>`<span class="fwrap"><button class="fchip ${x===av?"on":""} f-${x._st||"fila"}" data-fila="${i}" title="${esc(x._erro||x.link)}"><b>${i+1}</b> ${esc((x.modelo||slugLote(x.link)||"lote").replace(/^[^\/]*\//,"").slice(0,22))}<small>${x._st==="lendo"?"⏳":x._st==="erro"?"⚠":x.vidSalvo?"💾":x.result?"🤖":x.importadoEm?"✓":"…"}</small></button>${avOcupado?"":`<button class="fdel" data-filadel="${i}" aria-label="Excluir lote ${i+1}">✕</button>`}</span>`).join("")}</div>
   ${!avOcupado&&avFila.some(x=>x._st==="erro")?`<div class="toolbar" style="margin:0 0 6px"><button class="btn ghost sm" id="avRetryErr">🔄 Tentar de novo os com erro (${avFila.filter(x=>x._st==="erro").length})</button><button class="btn ghost sm" id="avDelErr">🗑 Remover os com erro</button></div>`:""}
   ${nOk>1&&!avOcupado?`<div class="toolbar" style="margin:0 0 6px"><button class="btn ghost sm" id="avAllAI">🤖 Analisar fotos de todos (${nOk})</button><button class="btn ghost sm" id="avAllSave">💾 Salvar todos no controle</button></div>`:""}`:""}
  ${av._erro&&!avOcupado?`<div class="ia-box"><b class="neg">⚠ Não consegui importar este lote</b><div class="mini">${esc(av._erro)}</div><div class="mini" style="word-break:break-all">${esc(av.link||"")}</div><div class="toolbar" style="margin:8px 0 0"><button class="btn sm" id="avRetry1">🔄 Tentar de novo</button>${avFila.length>1?`<button class="btn ghost sm" data-filadel="${avFila.indexOf(av)}">🗑 Excluir da lista</button>`:""}</div></div>`:""}
  ${av.jaExiste?`<div class="note">Este lote já está no controle (${esc(av.jaExiste)}). Salvar atualiza a moto existente, sem duplicar.</div>`:""}
  ${vinculoHTML()}
  ${av.importadoEm?`<div class="sec-t">Números do arremate</div>
  <div class="card"><div class="f2">${avIn("lanceAtual","Lance atual / mínimo (R$)",{num:1})}${avIn("fipe","FIPE (R$)",{num:1})}
   ${avIn("comissaoPct","Comissão + taxa adm. do edital (%)",{num:1})}${avIn("taxas","Taxas fixas + documentação do edital (R$)",{num:1})}
   ${avIn("margem","Margem desejada (%)",{num:1})}${avIn("conting","Reserva p/ imprevistos (%)",{num:1})}</div>
   <div style="margin-top:10px">${avIn("vendaAlvo","Preço de venda alvo (R$) — vazio = 85% da FIPE",{num:1})}</div></div>
  <button class="btn aibtn" id="avGo">🤖 Analisar fotos com IA</button>
  <div class="aist" id="avSt"></div>`:""}
  <div id="avRes"></div>`;
};
bindAv=function(){
  const m=$("#main");
  m.oninput=e=>{const t=e.target;
    if(t.dataset.lk!=null){const parts=t.value.split(/\s+/).filter(s=>/^https?:\/\//.test(s));
      if(parts.length>1){avLinks.splice(+t.dataset.lk,1,...parts);avLinks=avLinks.filter((x,i,a)=>x||a.length===1).slice(0,MAX_LINKS);renderBg();return}
      avLinks[+t.dataset.lk]=t.value;const b=$("#avImp");if(b&&!avOcupado){const n=linksValidos().length;b.textContent="Importar "+(n>1?n+" lotes":"")}return}
    if(t.dataset.a){av[t.dataset.a]=t.value;if(t.dataset.a!=="link")avSum();return}
    if(t.dataset.iv!=null){const it=av.itens[+t.dataset.iv];if(it){it.valor=t.value;avSum();avSubs()}}
    if(t.dataset.pn!=null){const it=av.itens[+t.dataset.pn];if(it)it.peca=t.value}};
  m.onchange=async e=>{const t=e.target;
    if(t.dataset.ion!=null){const it=av.itens[+t.dataset.ion];if(it){it.on=t.checked;t.closest(".irow").classList.toggle("off",!t.checked);avSum();avSubs()}}
    if(t.id==="avGr"){av.grupoId=t.value;const g=grupos.find(x=>x.id===t.value);if(g){const c=g.custas||{};av.comissaoPct=num(c.comissaoPct)+num(c.taxaAdmPct);av.taxas=String((c.taxasFixas||[]).reduce((a,x)=>a+num(x.valor),0)+(c.docs||[]).reduce((a,x)=>a+num(x.valor),0))}renderBg()}
    if(t.id==="avFipeSel"&&t.value!==""){const c=av.fipeCands[+t.value];try{const f=await valorFipe(c.tipo,c.marca,c.cod,c.anoCod);av.fipe=String(Math.round(f.valor));av.fipeRef={...f,metodo:"manual"};renderBg()}catch(err){toast(err.message)}}};
  m.onclick=async e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="avImp"){importarFila();return}
    if(b.id==="avAddLink"){avLinks.push("");renderBg();setTimeout(()=>{const x=document.querySelector(`[data-lk="${avLinks.length-1}"]`);if(x)x.focus()},30);return}
    if(b.dataset.lkdel!=null){avLinks.splice(+b.dataset.lkdel,1);if(!avLinks.length)avLinks=[""];renderBg();return}
    if(b.dataset.fila!=null){av=avFila[+b.dataset.fila];renderBg();return}
    if(b.dataset.filadel!=null){const i=+b.dataset.filadel;const x=avFila.splice(i,1)[0];if(x){avLinks=avLinks.filter(u=>urlEdital(u)!==urlEdital(x.link));if(!avLinks.length)avLinks=[""]}if(av===x)av=avFila[Math.min(i,avFila.length-1)]||newAv();if(avFila.length===1)av=avFila[0];avMsg=avFila.length?`${avFila.length} lote(s) na lista.`:"";renderBg();return}
    if(b.id==="avDelErr"){const fora=avFila.filter(x=>x._st==="erro");avFila=avFila.filter(x=>x._st!=="erro");avLinks=avLinks.filter(u=>!fora.some(x=>urlEdital(x.link)===urlEdital(u)));if(!avLinks.length)avLinks=[""];if(!avFila.includes(av))av=avFila[0]||newAv();avMsg=`${fora.length} lote(s) com erro removido(s).`;renderBg();return}
    if(b.id==="avRetryErr"){reimportar(avFila.filter(x=>x._st==="erro"));return}
    if(b.id==="avRetry1"){reimportar([av]);return}
    if(b.id==="avAllAI"){emLote("ai");return}
    if(b.id==="avAllSave"){emLote("save");return}
    if(b.dataset.patio!=null){const L=av.edital.duvida[+b.dataset.patio];av.edital.duvida=null;await vincularGrupo(av.edital.url,L,av.edital.lotes,t=>{const s=$("#avLinkSt");if(s)s.textContent=t});renderBg();return}
    if(b.dataset.avlb!=null){openLB(av._fotosLink,+b.dataset.avlb);return}
    if(b.dataset.idel!=null){av.itens.splice(+b.dataset.idel,1);renderAvRes();return}
    if(b.dataset.iadd){av.itens.push({categoria:b.dataset.iadd,peca:"Novo item",servico:"",gravidade:"media",min:0,max:0,valor:"",evidencia:"adicionado manualmente",on:true,edit:true});renderAvRes();return}
    if(b.id==="avGo"){runAI();return}
    if(b.id==="avSave"){await salvarAvaliacaoLink();return}
    if(b.id==="avNew"){av=newAv();avFila=[];avLinks=[""];renderBg();return}};
  m.onkeydown=e=>{if(e.target.dataset.lk!=null&&e.key==="Enter"){e.preventDefault();importarFila()}};
  renderAvRes();
};
async function salvarAvaliacaoLink(){
  const gs=$("#avGr");if(gs)av.grupoId=gs.value;
  const gp=grupos.find(g=>g.id===av.grupoId);if(gp&&gp._pendente){try{await gravarGrupoPendente(gp)}catch(e){toast("⚠ "+e.message);return}}
  const antes=av.vid;saveAv();const v=vehicles.find(x=>x.id===av.vid);if(!v)return;
  const L=av.anexo||{},d=(av.site||{}).dados||{};
  const put=(k,val)=>{if(temV(val)&&!temV(v[k]))v[k]=val};
  const ok=x=>x&&!/\*|SUPRIMID/.test(String(x))?x:"";put("cor",L.cor||d.cor);put("chassi",ok(L.chassi)||d.chassi);put("renavam",ok(L.renavam)||d.renavam);put("motor",d.motor);put("motor",L.motor);put("uf",L.uf);put("combustivel",L.combustivel);put("classificacao",L.classificacao);
  put("lanceMin",L.lanceMin||num(d.lanceMin)||"");put("km",d.km);put("placa",L.placa);
  if(L.patio)v.editalLote={patio:L.patio,lote:L.lote};if(L.desalienacao)v.desalienacao=true;
  if(!v.fotosRef&&(av._fotosLink||[]).length)v.fotosRef=av._fotosLink.slice(0,8);
  if(av.fipeRef){v.fipeRef={codigo:av.fipeRef.codigo,modelo:av.fipeRef.modelo,mes:av.fipeRef.mes,metodo:av.fipeRef.metodo,ref:av.fipeRef.ref,em:new Date().toISOString().slice(0,10)};if(av.fipeRef.candidatos)v.fipeCands=av.fipeRef.candidatos}
  v.link=av.link;persist(v);autoCompletar(v);if(!antes)toast("Moto salva e vinculada ao grupo ✓");
}

/* ----- fila de links ----- */
async function importarFila(){
  if(avOcupado)return;avMsg="";const urls=linksValidos();if(!urls.length){const s=$("#avLinkSt");if(s)s.innerHTML=`<span class="neg">Cole pelo menos um link de lote.</span>`;return}
  avOcupado=true;avFila=urls.map(u=>{const x=newAv();x.link=u;x._st="fila";return x});
  for(let i=0;i<avFila.length;i++){const x=avFila[i];av=x;x._st="lendo";renderBg();const s=$("#avLinkSt");if(s&&avFila.length>1)s.textContent=`Lote ${i+1} de ${avFila.length}…`;
    try{await importarPorLink()}catch(e){}x._st=x.importadoEm?"ok":"erro"}
  avOcupado=false;av=avFila.find(x=>x.importadoEm)||avFila[0];renderBg();
  const ok=avFila.filter(x=>x.importadoEm).length,s=$("#avLinkSt");avMsg=avFila.length>1?`✅ ${ok} de ${avFila.length} importado(s).${ok<avFila.length?` <span class="neg">Toque no lote com ⚠ para ver o erro.</span>`:""}`:(ok?"✅ Importado. Confira abaixo e toque em 🤖 Analisar fotos.":(s?s.innerHTML:""));if(s)s.innerHTML=avMsg;
}
async function emLote(tipo){
  if(avOcupado)return;avOcupado=true;const alvo=avFila.filter(x=>x.importadoEm);let n=0;
  for(const x of alvo){av=x;renderBg();const s=$("#avLinkSt");n++;if(s)s.textContent=`${tipo==="ai"?"🤖 Analisando":"💾 Salvando"} ${n} de ${alvo.length}…`;
    try{if(tipo==="ai"){if(!x.result)await runAI()}else{if(grupos.length&&!x.grupoId){x._st="erro";x._erro="Sem grupo / edital: escolha o grupo deste lote";continue}await salvarAvaliacaoLink();x.vidSalvo=x.vid}}catch(e){x._st="erro";x._erro=e.message}}
  avOcupado=false;avMsg=tipo==="ai"?`✅ Fotos analisadas em ${alvo.length} lote(s).`:`💾 ${alvo.filter(x=>x.vidSalvo).length} lote(s) salvos no controle.${alvo.some(x=>!x.vidSalvo)?" Os marcados com ⚠ ficaram sem grupo.":""}`;renderBg();
}

async function reimportar(lista){
  if(avOcupado||!lista.length)return;avOcupado=true;let i=0;
  for(const x of lista){i++;av=x;x._st="lendo";delete x._erro;renderBg();const s=$("#avLinkSt");if(s)s.textContent=`Tentando de novo ${i} de ${lista.length}…`;
    try{await importarPorLink()}catch(e){x._erro=e.message}x._st=x.importadoEm?"ok":"erro"}
  avOcupado=false;const ok=lista.filter(x=>x.importadoEm).length;avMsg=`🔄 ${ok} de ${lista.length} importado(s) na nova tentativa.`;renderBg();
}
