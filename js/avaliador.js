/* ================= AVALIADOR IA ================= */
const CONDS=["Não informado","Recuperado de financiamento","Pequena monta","Média monta","Grande monta / sucata","Sinistro / colisão","Enchente / alagamento","Roubo/furto recuperado","Frota / locadora","Particular / outros"];
let av=newAv(), avPhotos=[], avCtl=null, sampleFn=undefined, sampleLim=null;
function newAv(){return {vid:null,link:"",leiloeiro:"",lote:"",dataLeilao:"",placa:"",local:"",modelo:"",ano:"",km:"",uf:"BA",condicao:CONDS[0],descricao:"",fipe:"",lanceAtual:"",comissaoPct:5,taxas:"",margem:20,conting:10,vendaAlvo:"",result:null,itens:[],data:null}}
function loadAvFromVehicle(v){
  const a=v.avaliacao;
  av=a?{...newAv(),...JSON.parse(JSON.stringify(a)),vid:v.id}:{...newAv(),vid:v.id,modelo:v.modelo||"",ano:v.ano||"",link:v.link||"",fipe:v.fipe||"",lanceAtual:v.lance||"",comissaoPct:v.comissaoPct??5,taxas:String(num(v.taxaAdm)+num(v.taxaPatio)+num(v.outrosArremate)||""),margem:v.margemAlvo||20,vendaAlvo:v.vendaPretendida||""};
  avPhotos.forEach(p=>URL.revokeObjectURL(p.url));avPhotos=[];
}
async function getSample(){
  if(sampleFn!==undefined)return sampleFn;
  try{sampleFn=(window.claude&&window.claude.use)?await window.claude.use("sample"):null;
    if(sampleFn)sampleLim=await sampleFn.limits().catch(()=>null);}catch(e){sampleFn=null}
  return sampleFn;
}
function avIn(k,l,o={}){return `<label>${l}<input data-a="${k}" ${o.num?'inputmode="decimal" placeholder="0,00"':""} ${o.ph?`placeholder="${o.ph}"`:""} value="${esc(o.num?fmtIn(av[k]):av[k])}"></label>`}
function avaliarHTML(){
  const linkOk=/^https?:\/\//.test(av.link||"");
  return `
  <div class="card" style="border-color:var(--acc)"><b>🤖 Avaliador de lote com IA</b>
   <div class="mini" style="margin-top:6px">Envie as fotos do lote: a IA aponta peças e serviços necessários, estima os gastos, compara com a FIPE e calcula <b>até quanto você pode dar de lance</b> mantendo sua margem.</div></div>

  <div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>📥 Importar análise feita pelo Claude</b><button class="btn ghost sm" id="impTg">Colar código</button></div>
   <div id="impBox" style="display:none;margin-top:10px"><div class="mini" style="margin:0 0 8px">Mande o link do lote no chat do Claude, copie o código que ele devolver e cole aqui.</div><textarea class="bk" id="impTxt" placeholder='{"tipo":"avaliacao-leilao", ...}'></textarea><button class="btn sm" id="impOk" style="margin-top:8px">Importar e preencher tudo</button></div></div>

  <div class="sec-t">1 · Lote</div>
  <div class="card">
   <div style="display:flex;gap:8px;align-items:flex-end">${avIn("link","Link do lote",{ph:"Cole o link do leilão"})}${linkOk?`<a class="btn ghost sm" style="text-decoration:none;white-space:nowrap;margin-bottom:2px" href="${esc(av.link)}" target="_blank" rel="noopener">Abrir ↗</a>`:""}</div>
   <div class="f2" style="margin-top:10px">${avIn("modelo","Marca / modelo / versão",{ph:"Ex.: Onix 1.0 LT"})}${avIn("ano","Ano",{ph:"2019/2020"})}
   ${avIn("km","Km (se informado)",{num:0,ph:"Ex.: 85000"})}${avIn("uf","Estado (UF)",{ph:"BA"})}
   ${avIn("leiloeiro","Leiloeiro / comitente")}${avIn("lote","Lote")}
   ${avIn("dataLeilao","Data do leilão",{ph:"AAAA-MM-DD"})}${avIn("placa","Placa / final")}</div>
   ${av.local?`<div class="mini">📍 ${esc(av.local)}</div>`:""}
   <label style="margin-top:10px">Condição / tipo de lote<select data-a="condicao">${CONDS.map(c=>`<option ${av.condicao===c?"selected":""}>${c}</option>`).join("")}</select></label>
   <label style="margin-top:10px">Descrição do lote (copie do site)<textarea data-a="descricao" rows="3" placeholder="Ex.: Veículo com avarias na dianteira, motor não testado, sem chave…">${esc(av.descricao)}</textarea></label>
  </div>

  <div class="sec-t">2 · Fotos do lote</div>
  <div class="card">
   <label class="drop" id="drop">📷 <b>Toque para escolher as fotos</b><br><span style="font-size:12px">ou arraste / cole (Ctrl+V) aqui</span><input type="file" id="avFiles" accept="image/*" multiple></label>
   <div class="thumbs" id="thumbs"></div>
   <div class="note">💡 O app não consegue baixar as fotos direto do site do leilão. Abra o link, salve as fotos (no celular: segure a foto → <i>Salvar imagem</i>, ou tire print) e envie aqui. Quanto mais ângulos (frente, laterais, traseira, painel, motor, interior, pneus), melhor a análise.</div>
  </div>

  <div class="sec-t">3 · FIPE e números do arremate</div>
  <div class="card">
   <div class="f2">${avIn("fipe","FIPE (R$)",{num:1})}${avIn("lanceAtual","Lance atual / inicial (R$)",{num:1})}
   ${avIn("comissaoPct","Comissão leiloeiro (%)",{num:1})}${avIn("taxas","Taxas fixas: adm + pátio + remoção (R$)",{num:1})}
   ${avIn("margem","Margem de lucro desejada (%)",{num:1})}${avIn("conting","Reserva p/ imprevistos (%)",{num:1})}</div>
   <div style="margin-top:10px">${avIn("vendaAlvo","Preço de venda alvo (R$) — vazio = sugestão da IA",{num:1})}</div>
   <div class="toolbar" style="margin:10px 0 0"><button class="btn ghost sm" id="avFipe">💲 Buscar FIPE oficial</button><span class="mini" style="margin:0" id="avFipeSt">${av.fipeRef?esc(av.fipeRef.modelo+" · "+av.fipeRef.mes):"Pela tabela FIPE oficial, com modelo e ano preenchidos."}</span></div>
  </div>

  <button class="btn aibtn" id="avGo">🤖 Analisar com IA</button>
  <button class="btn ghost sm" id="avStop" style="display:none;margin-top:8px">■ Parar</button>
  <div class="aist" id="avSt"></div>
  <div id="avRes"></div>`;
}
function bindAv(){
  const m=$("#main");
  m.oninput=e=>{const t=e.target;
    if(t.dataset.a){av[t.dataset.a]=t.value;avSum();return}
    if(t.dataset.iv!=null){const it=av.itens[+t.dataset.iv];if(it){it.valor=t.value;avSum();avSubs()}}
    if(t.dataset.pn!=null){const it=av.itens[+t.dataset.pn];if(it)it.peca=t.value}
  };
  m.onchange=e=>{const t=e.target;
    if(t.dataset.a){av[t.dataset.a]=t.value;if(t.dataset.a==="link")renderBg();else avSum()}
    if(t.dataset.ion!=null){const it=av.itens[+t.dataset.ion];if(it){it.on=t.checked;t.closest(".irow").classList.toggle("off",!t.checked);avSum();avSubs()}}
    if(t.id==="avFiles"){addPhotos([...t.files]);t.value=""}
  };
  m.onclick=e=>{const b=e.target.closest("button");if(!b)return;
    if(b.dataset.ph!=null){const p=avPhotos.splice(+b.dataset.ph,1)[0];if(p)URL.revokeObjectURL(p.url);renderThumbs()}
    else if(b.dataset.idel!=null){av.itens.splice(+b.dataset.idel,1);renderAvRes()}
    else if(b.dataset.iadd){av.itens.push({categoria:b.dataset.iadd,peca:"Novo item",servico:"",gravidade:"media",min:0,max:0,valor:"",evidencia:"adicionado manualmente",on:true,edit:true});renderAvRes()}
    else if(b.id==="impTg"){const x=$("#impBox");x.style.display=x.style.display==="none"?"block":"none";if(x.style.display==="block")$("#impTxt").focus()}
    else if(b.id==="impOk")importAv($("#impTxt").value);
    else if(b.id==="avGo")runAI();
    else if(b.id==="avStop"){if(avCtl)avCtl.abort()}
    else if(b.id==="avSave")saveAv();
    else if(b.id==="avNew"){loadAvFromVehicle({});av=newAv();renderBg()}
    else if(b.id==="avUseFipe"){av.fipe=String(Math.round(num(av.result.fipe_estimada.valor)));renderBg()}
  };
  const d=$("#drop");
  d.ondragover=e=>{e.preventDefault();d.classList.add("over")};d.ondragleave=()=>d.classList.remove("over");
  d.ondrop=e=>{e.preventDefault();d.classList.remove("over");addPhotos([...e.dataTransfer.files])};
  renderThumbs();renderAvRes();
  getSample().then(s=>{if(!s){const g=$("#avGo");if(g)g.style.display="none";$("#avSt").innerHTML="💡 Para a análise automática por fotos, mande o link do lote no chat do Claude e cole o código em <b>📥 Importar análise</b> (no topo desta tela). As contas de lance máximo aqui embaixo funcionam normalmente.";}
    else if(!(sampleLim&&sampleLim.images)){$("#avSt").textContent="⚠ Envio de fotos indisponível nesta visualização — a IA vai analisar só pela descrição."}});
}
document.addEventListener("paste",e=>{if(tab!=="avaliar"||editing)return;const fs=[...(e.clipboardData?.items||[])].filter(i=>i.type.startsWith("image/")).map(i=>i.getAsFile()).filter(Boolean);if(fs.length){e.preventDefault();addPhotos(fs)}});
function addPhotos(files){
  const max=(sampleLim&&sampleLim.images&&sampleLim.images.maxCount)||20;
  files.filter(f=>f&&f.type&&f.type.startsWith("image/")).forEach(f=>{if(avPhotos.length<max)avPhotos.push({file:f,url:URL.createObjectURL(f)})});
  if(files.length&&avPhotos.length>=max)toast(`Máximo de ${max} fotos por análise`);
  renderThumbs();
}
function renderThumbs(){const t=$("#thumbs");if(!t)return;t.innerHTML=avPhotos.map((p,i)=>`<div><img src="${p.url}" alt=""><span>Foto ${i+1}</span><button data-ph="${i}" aria-label="Remover">✕</button></div>`).join("")}

function buildPrompt(){
  const hoje=new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  return `Você é um avaliador sênior de veículos de leilão no Brasil (preços de ${hoje}). Analise ${avPhotos.length?`as ${avPhotos.length} fotos anexadas (numeradas Foto 1, Foto 2… na ordem enviada) e `:""}os dados do lote para estimar tudo o que será preciso gastar para deixar o carro pronto para revenda.

DADOS DO LOTE
- Veículo: ${av.modelo||"não informado"} ${av.ano||""}
- Km: ${av.km||"não informado"}
- Estado (UF): ${av.uf||"não informado"}
- Condição/tipo de lote: ${av.condicao}
- Descrição do leiloeiro: ${(av.descricao||"não informada").slice(0,3000)}
- FIPE informada pelo usuário: ${num(av.fipe)?brl(num(av.fipe)):"não informada"}
- Link (apenas referência, você não consegue abrir): ${av.link||"—"}

REGRAS
1. Liste peças e serviços em 4 categorias: "estetica" (funilaria, pintura, polimento, para-choques, faróis, vidros, interior, rodas/pneus), "mecanica" (motor, suspensão, freios, elétrica, arrefecimento, airbag, bateria, chave), "documentacao" (transferência, vistoria, laudo cautelar, IPVA/licenciamento atrasados prováveis, regularização de monta, despachante) e "transporte" (remoção/guincho até a cidade do comprador).
2. Para cada item diga o que você VIU (cite a foto) ou por que é provável. Avarias que não dá para confirmar nas fotos (ex.: motor não testado, airbag, chassi) entram com servico "verificar" e custo provável.
3. Valores em reais (min e max), peças + mão de obra, oficina independente e peças de boa qualidade no estado ${av.uf||"informado"}. Seja realista e não otimista.
4. Inclua SEMPRE a documentação típica de carro de leilão. Monta média/grande: inclua vistoria/regularização especial e mencione a desvalorização.
5. Estime a FIPE do modelo/ano (pelo seu conhecimento; pode estar desatualizada) e um preço de revenda realista já considerando que carro com registro de leilão vende abaixo da FIPE.
6. Sem fotos ou com fotos ruins: confianca "baixa".

Responda SOMENTE com um JSON neste formato exato:
{"resumo":"2-3 frases sobre o estado geral","nota":7,"condicao_geral":"boa|regular|ruim|critica","confianca":"alta|media|baixa",
"itens":[{"categoria":"estetica","peca":"Para-choque dianteiro","servico":"trocar|reparar|pintar|polir|verificar","gravidade":"alta|media|baixa","min":600,"max":1100,"evidencia":"Foto 2: trincado no lado direito"}],
"fipe_estimada":{"valor":45000,"observacao":"curta"},
"preco_revenda_sugerido":{"min":36000,"max":41000,"observacao":"curta"},
"riscos":["risco curto"],"alertas_documentacao":["alerta curto"],"dicas_vistoria":["o que conferir pessoalmente"]}`;
}
const ERR={not_granted:"Você não autorizou o uso da IA neste app. Recarregue e permita para analisar.",sampling_disabled:"A IA não está disponível para esta conta.",rate_limited:"Muitas análises seguidas ou limite de uso atingido. Tente de novo em alguns minutos.",session_expired:"Entre novamente na sua conta do Claude.",image_rejected:"Alguma foto não foi aceita (formato ou tamanho). Remova e tente de novo.",images_unavailable:"Envio de fotos indisponível aqui. Remova as fotos para analisar só pela descrição.",invalid_json:"A IA respondeu fora do formato. Toque em Analisar de novo.",refused:"A IA não conseguiu analisar este conteúdo. Troque as fotos ou a descrição.",empty_completion:"A IA não retornou resposta. Tente com menos fotos.",prompt_too_large:"Descrição grande demais. Encurte o texto."};
async function runAI(){
  const s=await getSample();
  if(!s){$("#avSt").textContent="⚠ A análise com IA só funciona com o app aberto dentro do Claude (logado na sua conta).";return}
  if(!av.modelo&&!avPhotos.length&&!av.descricao){toast("Informe o modelo, a descrição ou envie fotos");return}
  const go=$("#avGo"),stop=$("#avStop"),st=$("#avSt");
  go.disabled=true;go.textContent="⏳ Analisando… (pode levar até 1–2 min)";stop.style.display="inline-block";
  st.textContent=`Enviando ${avPhotos.length} foto(s) e dados para a IA…`;
  avCtl=new AbortController();
  const t0=Date.now();const tick=setInterval(()=>{if(st.dataset.stream!=="1")st.textContent=`🔍 Examinando fotos e calculando custos… ${Math.round((Date.now()-t0)/1000)}s`},1000);
  try{
    const opts={signal:avCtl.signal,modelTier:"default",cache:false,onText:({text})=>{st.dataset.stream="1";st.textContent=`✍️ Montando o relatório… (${text.length} caracteres)`}};
    if(avPhotos.length&&sampleLim&&sampleLim.images)opts.images=avPhotos.map(p=>p.file);
    const r=await s.json(buildPrompt(),opts);
    if(!r||!Array.isArray(r.itens))throw {code:"invalid_json"};
    av.result=r;av.data=new Date().toISOString();
    av.itens=r.itens.map(i=>({...i,min:num(i.min),max:num(i.max),valor:String(Math.round((num(i.min)+num(i.max))/2)),on:true,categoria:CATS[i.categoria]?i.categoria:"outros"}));
    st.textContent=`✅ Análise concluída em ${Math.round((Date.now()-t0)/1000)}s. Ajuste os valores se quiser — tudo recalcula na hora.`;
    renderAvRes();setTimeout(()=>{const el=$("#avRes");if(el)el.scrollIntoView({behavior:"smooth"})},100);
  }catch(e){
    st.textContent=e&&e.code==="cancelled"?"Análise interrompida.":"⚠ "+(ERR[e&&e.code]||"Falha temporária na IA. Tente de novo.");
  }finally{clearInterval(tick);delete st.dataset.stream;go.disabled=false;go.textContent=av.result?"🔄 Analisar de novo":"🤖 Analisar com IA";stop.style.display="none";avCtl=null}
}
function avCalc(){
  const it=av.itens.filter(i=>i.on!==false);
  const S=f=>it.reduce((a,i)=>a+f(i),0);
  const sMin=S(i=>Math.min(num(i.min),num(i.valor))),sMax=S(i=>Math.max(num(i.max),num(i.valor))),sVal=S(i=>num(i.valor));
  const cont=num(av.conting)/100,com=num(av.comissaoPct)/100,m=num(av.margem)/100,tx=num(av.taxas);
  const r=av.result||{};const rv=r.preco_revenda_sugerido||{};
  const revMed=num(rv.min)&&num(rv.max)?(num(rv.min)+num(rv.max))/2:0;
  const fipeIA=num(r.fipe_estimada&&r.fipe_estimada.valor);
  const fipe=num(av.fipe)||fipeIA;
  const V=num(av.vendaAlvo)||revMed||fipe*.85;
  const vSrc=num(av.vendaAlvo)?"informada por você":revMed?"sugerida pela IA":fipe?"85% da FIPE":"";
  const lm=rep=>Math.max(0,(V/(1+m)-tx-rep*(1+cont))/(1+com));
  const otim=lm(sMin),real=lm(sVal),pess=lm(sMax);
  const L=num(av.lanceAtual);
  const custoL=L*(1+com)+tx+sVal*(1+cont);
  const porCat={};Object.keys(CATS).forEach(k=>porCat[k]=0);it.forEach(i=>porCat[i.categoria]+=num(i.valor));
  return {sMin,sMax,sVal,cont,com,m,tx,V,vSrc,fipe,fipeIA,otim,real,pess,L,custoL,lucroL:L?V-custoL:NaN,roiL:L?(V-custoL)/custoL:NaN,porCat,rv};
}
function avSum(){
  const el=$("#avSum");if(!el)return;const c=avCalc();
  if(!c.V){el.innerHTML=`<div class="note">Informe a FIPE ou o preço de venda alvo para calcular o lance máximo.</div>`;return}
  let vd,col;
  if(!c.L){vd=["🎯 Lance máximo calculado","Informe o lance atual para comparar."];col="var(--acc)"}
  else if(c.L<=c.pess){vd=["🟢 Ótimo negócio","Lance abaixo até do cenário pessimista."];col="var(--good)"}
  else if(c.L<=c.real){vd=["🟡 Bom, dentro do limite","Cabe no cenário realista com sua margem."];col="#e3c400"}
  else if(c.L<=c.otim){vd=["🟠 Arriscado","Só fecha a conta se os reparos saírem no mínimo."];col="#ff8c3a"}
  else{vd=["🔴 Acima do limite","Nesse lance você não atinge a margem desejada."];col="var(--bad)"}
  const top=Math.max(c.otim,c.L,1)*1.15;
  const z=(a,b,cl)=>`<i style="width:${Math.max(0,(Math.min(b,top)-a)/top*100)}%;background:${cl}"></i>`;
  // composição da venda no lance realista
  const lr=c.real,comp=[["Lance",lr,"var(--c-arremate)"],["Comissão",lr*c.com,"#7aaaff"],["Taxas",c.tx,"var(--c-transporte)"],["Reparos/docs",c.sVal,"var(--c-estetica)"],["Reserva",c.sVal*c.cont,"#6b5a8a"],["Lucro",c.V-(lr*(1+c.com)+c.tx+c.sVal*(1+c.cont)),"var(--good)"]];
  el.innerHTML=`
  <div class="verdict" style="border-color:${col};background:color-mix(in srgb,${col} 10%,transparent)">
   <h3 style="color:${col}">${vd[0]}</h3><div style="font-size:14px">${vd[1]}</div>
   <div class="scn"><div><span>Otimista</span><b>${brl(c.otim)}</b></div><div class="main"><span>Lance máx. realista</span><b>${brl(c.real)}</b></div><div><span>Pessimista</span><b>${brl(c.pess)}</b></div></div>
   <div class="gwrap"><div class="gauge">${z(0,c.pess,"#3fb95099")}${z(c.pess,c.real,"#e3c40099")}${z(c.real,c.otim,"#ff8c3a99")}${z(c.otim,top,"#f8514999")}</div>
   ${c.L?`<div class="gmark" style="left:calc(${Math.min(c.L/top,1)*100}% - 2px)"><small>seu lance ${brl(c.L)}</small></div>`:""}</div>
   ${c.L?`<div class="calc"><span>Lucro estimado nesse lance (realista)</span><b class="${c.lucroL>=0?"pos":"neg"}">${brl(c.lucroL)} · ${pct(c.roiL)}</b></div>`:""}
  </div>
  <div class="sec-t">Composição da venda alvo (${brl(c.V)} · ${c.vSrc})</div>
  <div class="card"><div class="stack" style="height:22px">${comp.map(([n,v,cl])=>v>0?`<i title="${n}" style="width:${v/c.V*100}%;background:${cl}"></i>`:"").join("")}</div>
   <div class="legend">${comp.map(([n,v,cl])=>`<div><span class="dot" style="background:${cl}"></span>${n}<span class="v">${brl(v)}</span><span class="p">${Math.round(v/c.V*100)}%</span></div>`).join("")}</div>
   <div class="mini">No lance máximo realista, o dinheiro da venda se divide assim.</div></div>
  <div class="sec-t">FIPE × venda</div>
  <div class="card">
   <div class="calc"><span>FIPE ${num(av.fipe)?"informada":"estimada pela IA ⚠"}</span><b>${c.fipe?brl(c.fipe):"—"}</b></div>
   ${c.fipeIA&&num(av.fipe)?`<div class="calc"><span>FIPE estimada pela IA</span><b>${brl(c.fipeIA)}</b></div>`:""}
   ${c.rv&&num(c.rv.min)?`<div class="calc"><span>Revenda sugerida (IA)</span><b>${brl(num(c.rv.min))} – ${brl(num(c.rv.max))}</b></div>`:""}
   ${c.fipe?`<div class="calc"><span>Venda alvo = % da FIPE</span><b>${pct(c.V/c.fipe)}</b></div><div class="calc"><span>Lance máx. realista = % da FIPE</span><b>${pct(c.real/c.fipe)}</b></div>`:""}
   ${!num(av.fipe)&&c.fipeIA?`<div class="toolbar" style="margin:10px 0 0"><button class="btn ghost sm" id="avUseFipe">Usar FIPE estimada</button><a class="lk" style="font-size:13px" href="https://veiculos.fipe.org.br/" target="_blank" rel="noopener">Confirmar no site oficial ↗</a></div>`:""}
   ${av.result&&av.result.fipe_estimada&&av.result.fipe_estimada.observacao?`<div class="mini">IA: ${esc(av.result.fipe_estimada.observacao)}</div>`:""}
  </div>
  <div class="sec-t">Custos estimados</div>
  <div class="card"><div class="scn"><div><span>Mínimo</span><b>${brl(c.sMin)}</b></div><div class="main"><span>Considerado</span><b>${brl(c.sVal)}</b></div><div><span>Máximo</span><b>${brl(c.sMax)}</b></div></div>
   <div style="margin-top:12px">${stackHTML(c.porCat,c.sVal,14)}</div>
   <div class="legend">${Object.keys(CATS).filter(k=>c.porCat[k]).map(k=>`<div><span class="dot" style="background:${CATS[k].c}"></span>${CATS[k].i} ${CATS[k].n}<span class="v">${brl(c.porCat[k])}</span></div>`).join("")}</div>
   <div class="mini">+ reserva de ${num(av.conting)}% para imprevistos: ${brl(c.sVal*c.cont)}</div></div>`;
}
function avSubs(){Object.keys(CATS).forEach(k=>{const e=$("#isub-"+k);if(e)e.textContent=brl(av.itens.filter(i=>i.categoria===k&&i.on!==false).reduce((a,i)=>a+num(i.valor),0))})}
function renderAvRes(){
  const el=$("#avRes");if(!el)return;
  const r=av.result;
  if(!r&&!av.itens.length){el.innerHTML="";return}
  const cats=["estetica","mecanica","documentacao","transporte","outros"];
  const nota=num(r&&r.nota);
  el.innerHTML=`
  ${r?`<div class="sec-t">Diagnóstico da IA ${av.data?`<span style="font-weight:500;text-transform:none">· ${new Date(av.data).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span>`:""}</div>
  <div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <span class="chip" style="background:${nota>=7?"#3fb95022":nota>=5?"#f5a52422":"#f8514922"};color:${nota>=7?"#5fd36f":nota>=5?"#ffc35c":"#ff7b72"}">Nota ${nota||"—"}/10</span>
    <span class="chip st-avaliacao">Estado: ${esc(r.condicao_geral||"—")}</span><span class="chip st-avaliacao">Confiança: ${esc(r.confianca||"—")}</span></div>
   <div style="font-size:14px;line-height:1.5">${esc(r.resumo||"")}</div></div>`:""}
  <div id="avSum"></div>
  <div class="sec-t">Peças e serviços <span style="font-weight:500;text-transform:none">· desmarque ou ajuste os valores</span></div>
  ${cats.map(k=>{const its=av.itens.map((i,ix)=>({i,ix})).filter(x=>x.i.categoria===k);return `
   <div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center"><b><span class="dot" style="display:inline-block;background:${CATS[k].c};margin-right:6px"></span>${CATS[k].i} ${CATS[k].n}</b><b class="num" id="isub-${k}"></b></div>
   ${its.map(({i,ix})=>`<div class="irow ${i.on===false?"off":""}"><input type="checkbox" data-ion="${ix}" ${i.on===false?"":"checked"}>
     <div>${i.edit?`<input class="v" data-pn="${ix}" value="${esc(i.peca)}" style="margin-bottom:3px">`:`<div class="nm"><span class="gv gv-${esc(i.gravidade)}"></span>${esc(i.peca)}${i.servico?` <span style="color:var(--mut)">· ${esc(i.servico)}</span>`:""}</div>`}
     ${num(i.min)||num(i.max)?`<div class="rg">Faixa IA: ${brl(num(i.min))} – ${brl(num(i.max))}</div>`:""}${i.evidencia?`<div class="ev">${esc(i.evidencia)}</div>`:""}</div>
     <input class="v" data-iv="${ix}" inputmode="decimal" value="${esc(fmtIn(i.valor))}" placeholder="R$"><button data-idel="${ix}" aria-label="Remover">✕</button></div>`).join("")||`<div class="mini">Nenhum item.</div>`}
   <div class="chips"><button data-iadd="${k}">＋ Adicionar item</button></div></div>`}).join("")}
  ${r?[["⚠️ Riscos",r.riscos],["📄 Alertas de documentação",r.alertas_documentacao],["🔍 Confira na vistoria presencial",r.dicas_vistoria]].filter(x=>Array.isArray(x[1])&&x[1].length).map(([t,a])=>`<div class="sec-t">${t}</div><div class="card"><ul class="ul">${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join(""):""}
  <div class="note">Estimativa feita por IA a partir das fotos e da descrição: serve para comparar lotes e definir seu limite de lance, não substitui vistoria presencial. FIPE estimada pela IA pode estar desatualizada: confirme no site oficial.</div>
  <div class="toolbar" style="margin-top:14px"><button class="btn" id="avSave">💾 ${av.vid&&vehicles.find(v=>v.id===av.vid)?"Atualizar no controle":"Salvar no controle de veículos"}</button><button class="btn ghost" id="avNew">＋ Nova avaliação</button></div>`;
  avSum();avSubs();
}
function importAv(txt){
  let o;try{const s=txt.trim();o=JSON.parse(s.slice(s.indexOf("{"),s.lastIndexOf("}")+1))}catch(e){toast("Código inválido — copie o bloco inteiro");return}
  const a=o.av||o;if(!a||typeof a!=="object"){toast("Código inválido");return}
  avPhotos.forEach(p=>URL.revokeObjectURL(p.url));avPhotos=[];
  av={...newAv(),...a,vid:null};
  av.itens=(a.itens||(a.result&&a.result.itens)||[]).map(i=>({...i,categoria:CATS[i.categoria]?i.categoria:"outros",min:num(i.min),max:num(i.max),valor:String(i.valor!=null&&i.valor!==""?num(i.valor):Math.round((num(i.min)+num(i.max))/2)),on:i.on!==false}));
  if(!av.data)av.data=new Date().toISOString();
  renderBg();toast("Análise importada ✓");setTimeout(()=>{const el=$("#avRes");if(el)el.scrollIntoView({behavior:"smooth"})},150);
}
function saveAv(){
  if(!canWrite){toast("Só o dono do app pode salvar no controle");return}
  const gs=$("#avGr");av.grupoId=gs?gs.value:(av.grupoId||"");
  if(grupos.length&&!av.grupoId){toast("Escolha o grupo / edital antes de salvar");if(gs)gs.focus();return}
  const g=grupos.find(x=>x.id===av.grupoId);
  const c=avCalc();
  let v=av.vid&&vehicles.find(x=>x.id===av.vid);
  const snap={...JSON.parse(JSON.stringify(av)),lanceMax:Math.round(c.real),vid:undefined};
  const desp=[],orc=av.itens.filter(i=>num(i.valor)>0).map(i=>({id:uid(),cat:i.categoria,desc:i.peca+(i.servico?` (${i.servico})`:""),valor:String(num(i.valor)),origem:"ia",on:i.on!==false,item:null,evid:i.evidencia||i.motivo||""}));
  const gx=g?{grupoId:g.id,grupo:g.nome}:{};
  if(!v){
    v={id:uid(),modelo:av.modelo,ano:av.ano,placa:av.placa||"",leiloeiro:av.leiloeiro||"",lote:av.lote||"",dataLeilao:/^\d{4}-\d{2}-\d{2}$/.test(av.dataLeilao||"")?av.dataLeilao:new Date().toISOString().slice(0,10),status:"avaliacao",fipe:av.fipe||(c.fipeIA?String(Math.round(c.fipeIA)):""),lance:av.lanceAtual||String(Math.round(c.real)),...gx,taxaPatio:"",outrosArremate:"",despesas:desp,orcado:orc,vistoria:{checks:{}},vendaPretendida:String(Math.round(c.V)),vendaValor:"",dataVenda:"",margemAlvo:num(av.margem),obs:av.result&&av.result.resumo?"IA: "+av.result.resumo:"",link:av.link,fipeHist:[],criado:Date.now()};
    vehicles.unshift(v);av.vid=v.id;toast("Salvo como 'Em avaliação' ✓");
  }else{
    Object.assign(v,{link:av.link||v.link,modelo:v.modelo||av.modelo,ano:v.ano||av.ano});
    if(v.status==="avaliacao"){Object.assign(v,{...gx,orcado:[...(v.orcado||[]).filter(o=>o.origem!=="ia"),...orc],lance:av.lanceAtual||String(Math.round(c.real)),outrosArremate:"",vendaPretendida:String(Math.round(c.V)),margemAlvo:num(av.margem),fipe:av.fipe||v.fipe})}
    toast(v.status==="avaliacao"?"Avaliação atualizada ✓":"Avaliação anexada ao veículo ✓ (gastos reais mantidos)");
  }
  v.avaliacao=snap;persist(v);renderAvRes();
}

