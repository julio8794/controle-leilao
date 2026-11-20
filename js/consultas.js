/* ---------- 🔎 consultas veiculares externas (só dono; senha a cada consulta) ---------- */
// catálogo completo (igual ao do servidor): [slug, nome, entrada, preço, grupo]
const CV_CATALOGO=[["renajud-restricoes","RENAJUD — restrições judiciais","placa",0.50,"Restrições e gravame"],["renajud-senatran","Restrições Renajud (Senatran)","placa",0.45,"Restrições e gravame"],["renajud-processos","RENAJUD — processos judiciais do veículo","placa",0.48,"Restrições e gravame"],["sng-gravames","SNG — gravame / alienação","placa",0.50,"Restrições e gravame"],["historico-restricoes-databras","Histórico e restrições do veículo","placa",1.00,"Restrições e gravame"],["placa-mj","Dados e restrições por placa (MJ)","placa",0.42,"Restrições e gravame"],["ocorrencias-senatran","Roubo / furto (Senatran)","placa",0.45,"Roubo e furto"],["ocorrencias-senatran-databras","Ocorrências Senatran (completa)","placa",2.00,"Roubo e furto"],["multas-senatran","Multas (Senatran)","placa",0.45,"Multas"],["multas-senatran-ctb","Multas (Senatran · CTB)","placa",0.45,"Multas"],["multas-senatran-databras","Multas Senatran (completa)","placa",2.00,"Multas"],["leilao-base01-score","Leilão Base 01 — score","placa",4.96,"Leilão e risco"],["leilao-score-indicio","Leilão score + indício","placa",9.36,"Leilão e risco"],["leilao-vip-gold","Leilão VIP Gold","placa",28.64,"Leilão e risco"],["analise-risco","Análise de risco consolidada","placa",7.65,"Leilão e risco"],["laudo-veicular","Laudo veicular SISCSV + ECV","placa",0.90,"Laudos e vistoria"],["laudo-veicular-historico","Histórico de laudos por placa","placa",0.45,"Laudos e vistoria"],["vistoria-veicular","Vistoria — laudo completo com fotos","placa",1.40,"Laudos e vistoria"],["auto-vistoria","Auto vistoria","placa",31.84,"Laudos e vistoria"],["placa-senatran","Veículo por placa (Senatran)","placa",0.60,"Dados do veículo"],["veiculo-senatran","Ficha completa Senatran","placa",0.90,"Dados do veículo"],["veiculo-senatran-completo-databras","Ficha completa Senatran premium","placa",2.00,"Dados do veículo"],["placa-serpro","Placa via Serpro","placa",0.45,"Dados do veículo"],["placa-df","Placa via DF","placa",0.40,"Dados do veículo"],["placa-crv","Placa via CRV","placa",1.62,"Dados do veículo"],["placa-databras","Consulta de placa","placa",1.00,"Dados do veículo"],["renavam-base-estadual","RENAVAM base estadual","placa",0.80,"Dados do veículo"],["veiculo-2-0","Veículo 2.0","placa",0.90,"Dados do veículo"],["veiculo-essencial","Veículo essencial","placa",30.24,"Dados do veículo"],["agregados-basica","Agregados (motor, câmbio etc.)","placa",0.22,"Dados do veículo"],["bin-placa","Base BIN (placa)","placa",0.09,"Dados do veículo"],["chassi-senatran","Veículo por chassi (Senatran)","chassi",0.60,"Dados do veículo"],["chassi-serpro","Chassi via Serpro","chassi",0.48,"Dados do veículo"],["chassi-databras","Consulta de chassi","chassi",0.90,"Dados do veículo"],["bin-chassi","Base BIN (chassi)","chassi",0.09,"Dados do veículo"],["renavam-serpro","Renavam via Serpro","renavam",0.21,"Dados do veículo"],["bin-renavam","Base BIN (renavam)","renavam",0.09,"Dados do veículo"],["motor-senatran","Veículo por motor (Senatran)","motor",0.60,"Dados do veículo"],["motor-databras","Consulta por nº do motor","motor",1.00,"Dados do veículo"],["bin-motor","Base BIN (motor)","motor",0.09,"Dados do veículo"],["recall-senatran","Recall (por chassi)","chassi",0.45,"Recall"]];
const CV_PADRAO=["renajud-restricoes","sng-gravames","ocorrencias-senatran","multas-senatran","placa-mj","recall-senatran","leilao-base01-score"];
let cvAtivos=null; // slugs que aparecem na seleção (Config do painel)
function cvLerAtivos(){try{const x=JSON.parse(localStorage.getItem("leilaoCV_"+painelId)||"null");if(Array.isArray(x))return x}catch(e){}return null}
async function cvCarregarAtivos(){cvAtivos=cvLerAtivos();try{const r=await sb.from("paineis").select("config").eq("id",painelId).maybeSingle();const c=r.data&&r.data.config&&r.data.config.consultas;if(Array.isArray(c)){cvAtivos=c;try{localStorage.setItem("leilaoCV_"+painelId,JSON.stringify(c))}catch(e){}}}catch(e){}return cvAtivos}
const cvAtivosLista=()=>(cvAtivos||cvLerAtivos()||CV_PADRAO);
Object.defineProperty(window,"CV_PRODUTOS",{get:()=>CV_CATALOGO.filter(x=>cvAtivosLista().includes(x[0]))});
const CV_ALERTA=/roubo|furto|restri[cç][aã]o\s+(judicial|administrativa)|bloqueio|alienad|gravame\s+ativo|penhora|apreens|sinistr|recuperad|baixad/i;
let cvSel={};
function cvValido(v,ent){const L=x=>String(x||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  return ent==="placa"?/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(L(v.placa)):ent==="chassi"?/^[A-HJ-NPR-Z0-9]{17}$/.test(L(v.chassi)):ent==="renavam"?/^\d{9,11}$/.test(String(v.renavam||"").replace(/\D/g,"")):/^[A-Z0-9]{5,20}$/.test(L(v.motor))}
function cvLinhas(o,pre){if(o==null)return "";if(typeof o!=="object"){const s=String(o);return `<div class="kv"><span>${esc(pre)}</span><b class="${CV_ALERTA.test(s)?"neg":""}">${/^https?:\/\//.test(s)?`<a class="lk" href="${esc(s)}" target="_blank" rel="noopener">abrir ↗</a>`:esc(s.slice(0,300))}</b></div>`}
  if(Array.isArray(o))return o.length?o.slice(0,40).map((x,i)=>cvLinhas(x,pre+" #"+(i+1))).join(""):`<div class="kv"><span>${esc(pre)}</span><b>nenhum</b></div>`;
  return Object.entries(o).slice(0,60).map(([k,x])=>cvLinhas(x,pre?pre+" › "+k:k)).join("")}
function consultasHTML(v){
  if(papel!=="dono")return "";
  const hist=v.consultasExt||[];
  return `<fieldset><legend>🔎 Consultas veiculares <span class="mini" style="margin:0">— plataforma externa, cobrada por consulta</span></legend>
   <div class="mini">Placa: <b>${esc(v.placa||"—")}</b> · Chassi: <b>${esc(v.chassi||"—")}</b>${v.renavam?` · Renavam: <b>${esc(v.renavam)}</b>`:""}${v.motor?` · Motor: <b>${esc(v.motor)}</b>`:""}. Só consultas sobre o veículo. A cada consulta o sistema pede a sua senha. <a class="lk" href="#" data-cvircfg="1">Escolher quais aparecem ⚙</a></div>
   ${CV_PRODUTOS.map(([s,n,ent,p])=>{const ok=cvValido(v,ent);return `<label class="ia-it"><input type="checkbox" data-cv="${s}" ${cvSel[s]&&ok?"checked":""} ${ok?"":"disabled"}><span><b>${n}</b> · ${brl(p)}${(()=>{const f=cvFalhas()[s];return f&&!f.ok?` <small class="neg">⚠ falhou ${new Date(f.em).toLocaleDateString("pt-BR")}</small>`:""})()}${ok?"":` <small class="neg">sem ${ent} válido${ent==="placa"&&v.semPlaca?" (moto sem placa)":""}</small>`}</span></label>`}).join("")}
   <div class="toolbar" style="margin:8px 0 0"><button class="btn sm" id="cvIr">Consultar selecionadas <span id="cvTot">${brl(CV_PRODUTOS.filter(x=>cvSel[x[0]]&&cvValido(v,x[2])).reduce((a,x)=>a+x[3],0))}</span></button></div>
   <div id="cvSt" class="mini"></div>
   ${hist.length?`<div class="sec-t" style="margin:12px 0 6px">Resultados</div>${hist.slice().reverse().map(h=>`<details class="cvres ${h.ok?(CV_ALERTA.test(JSON.stringify(h.resultado||""))?"alerta":"ok"):"erro"}"><summary><b>${esc(h.nome)}</b> · ${new Date(h.em).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})} · ${h.ok?(CV_ALERTA.test(JSON.stringify(h.resultado||""))?"⚠ verificar":"✓"):"erro"} · ${brl(h.custo||0)}</summary>${h.ok?cvLinhas(h.resultado,""):`<div class="mini neg">${esc(h.erro||"")}</div>`}</details>`).join("")}
    <div class="mini">Termos em vermelho (roubo, restrição, alienação, sinistro…) são só destaque automático; leia o resultado completo.</div>`:""}
  </fieldset>`;
}
const _tabDadosCV=tabDados;
let cvCarregado=null;
tabDados=function(v){if(papel==="dono"&&cvCarregado!==painelId){cvCarregado=painelId;const antes=JSON.stringify(cvAtivosLista());cvCarregarAtivos().then(()=>{if(JSON.stringify(cvAtivosLista())!==antes&&editing&&etab==="dados")keepScroll(renderETab)})}
  return _tabDadosCV(v).replace('<fieldset><legend>📝 Observações</legend>',consultasHTML(v)+'<fieldset><legend>📝 Observações</legend>')};
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||t.dataset.cv==null||!editing)return;cvSel[t.dataset.cv]=t.checked;const tot=$("#cvTot");if(tot)tot.textContent=brl(CV_PRODUTOS.filter(x=>cvSel[x[0]]&&cvValido(editing,x[2])).reduce((a,x)=>a+x[3],0))});
document.addEventListener("click",e=>{const b=e.target.closest("#cvIr,#cvOk,#cvCancel");if(!b||!editing)return;const v=editing;
  if(b.id==="cvCancel"){$("#cvSt").innerHTML="";return}
  const prods=CV_PRODUTOS.filter(x=>cvSel[x[0]]&&cvValido(v,x[2]));
  if(b.id==="cvIr"){if(!prods.length)return toast("Selecione ao menos uma consulta");
    $("#cvSt").innerHTML=`<div class="ia-box"><b>Confirmar ${prods.length} consulta(s) · ${brl(prods.reduce((a,x)=>a+x[3],0))}</b><div class="mini">${prods.map(x=>esc(x[1])).join(" · ")}</div>
      <label style="margin-top:8px">Sua senha de acesso<input type="password" id="cvSenha" autocomplete="current-password"></label>
      <div class="toolbar" style="margin:8px 0 0"><button class="btn sm" id="cvOk">Confirmar e consultar</button><button class="btn ghost sm" id="cvCancel">Cancelar</button></div></div>`;setTimeout(()=>{const s=$("#cvSenha");if(s)s.focus()},30);return}
  if(b.id==="cvOk"){const senha=$("#cvSenha").value;if(!senha)return toast("Digite sua senha");b.disabled=true;b.textContent="Consultando…";
    chamarIA("consulta_veicular",{produtos:prods.map(x=>x[0]),placa:v.placa,chassi:v.chassi,renavam:v.renavam,motor:v.motor,senha,ref:v.link||v.placa||v.id}).then(r=>{
      v.consultasExt=(v.consultasExt||[]).concat((r.consultas||[]).map(c=>({...c,em:r.em}))).slice(-40);persist(v);cvSel={};
      const ok=(r.consultas||[]).filter(c=>c.ok).length;toast(`${ok} de ${(r.consultas||[]).length} consulta(s) feita(s) · ${brl(r.custo_brl||0)}`);keepScroll(renderETab)})
    .catch(err=>{const m=/desconhecida/i.test(err.message)?"A consulta veicular ainda não foi ativada no servidor.":err.message;const st=$("#cvSt");if(st)st.innerHTML=`<div class="ia-box"><b class="neg">${esc(m)}</b></div>`});}
});

/* ----- Config: quais consultas aparecem na seleção ----- */
function cvFalhas(){const m={};vehicles.forEach(v=>(v.consultasExt||[]).forEach(c=>{const a=m[c.produto];if(!a||new Date(c.em)>new Date(a.em))m[c.produto]={ok:c.ok,em:c.em,erro:c.erro||""}}));return m}
let cvCfgSel=null;
function cvCfgHTML(){
  if(papel!=="dono")return "";
  if(!cvCfgSel)cvCfgSel=new Set(cvAtivosLista());const F=cvFalhas();const grupos=[...new Set(CV_CATALOGO.map(x=>x[4]))];
  const ENT={placa:"placa",chassi:"chassi",renavam:"renavam",motor:"nº do motor"};
  return `<div class="sec-t" id="cvCfg">🔎 Consultas veiculares</div>
  <div class="card"><div class="mini" style="margin:0 0 8px">Marque as consultas que aparecem para escolher na aba Dados de cada moto. Quando uma fonte cair (ex.: SNG fora do ar), desmarque e marque outra do mesmo grupo. Só consultas sobre o veículo; dados pessoais que vierem junto são omitidos.</div>
   ${grupos.map(g=>`<div class="cvg"><div class="cvg-t">${esc(g)}</div>${CV_CATALOGO.filter(x=>x[4]===g).map(([sl,n,ent,pr])=>{const f=F[sl];
     return `<label class="nv-chk cvc"><input type="checkbox" data-cvcfg="${sl}" ${cvCfgSel.has(sl)?"checked":""}><span><b>${esc(n)}</b> <small>· ${brl(pr)} · por ${ENT[ent]}</small>${f?(f.ok?` <small class="pos">✓ funcionou ${new Date(f.em).toLocaleDateString("pt-BR")}</small>`:` <small class="neg" title="${esc(f.erro)}">⚠ falhou ${new Date(f.em).toLocaleDateString("pt-BR")}${f.erro?": "+esc(f.erro.slice(0,60)):""}</small>`):""}</span></label>`}).join("")}</div>`).join("")}
   <div class="toolbar" style="margin:10px 0 0"><button class="btn sm" id="cvCfgOk">Salvar seleção (<span id="cvCfgN">${cvCfgSel.size}</span>)</button><button class="btn ghost sm" id="cvCfgPad">Voltar ao padrão</button></div></div>`;
}
const _configHTMLCV=configHTML;
configHTML=async function(){await cvCarregarAtivos();cvCfgSel=null;const h=await _configHTMLCV();const bloco=cvCfgHTML();if(!bloco)return h;
  const i=h.indexOf('<div class="sec-t">👥 Pessoas');return i>=0?h.slice(0,i)+bloco+h.slice(i):h+bloco};
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||t.dataset.cvcfg==null||!cvCfgSel)return;t.checked?cvCfgSel.add(t.dataset.cvcfg):cvCfgSel.delete(t.dataset.cvcfg);const n=$("#cvCfgN");if(n)n.textContent=cvCfgSel.size});
document.addEventListener("click",async e=>{const b=e.target.closest("#cvCfgOk,#cvCfgPad,[data-cvircfg]");if(!b)return;
  if(b.dataset.cvircfg){e.preventDefault();$("#ov").classList.remove("on");document.body.style.overflow="";editing=null;tab="config";render();setTimeout(()=>{const a=$("#cvCfg");if(a)a.scrollIntoView({behavior:"smooth"})},700);return}
  if(b.id==="cvCfgPad"){cvCfgSel=new Set(CV_PADRAO);document.querySelectorAll("[data-cvcfg]").forEach(x=>x.checked=cvCfgSel.has(x.dataset.cvcfg));$("#cvCfgN").textContent=cvCfgSel.size;return}
  const lista=CV_CATALOGO.map(x=>x[0]).filter(x=>cvCfgSel.has(x));if(!lista.length)return toast("Marque ao menos uma consulta");
  b.disabled=true;cvAtivos=lista;try{localStorage.setItem("leilaoCV_"+painelId,JSON.stringify(lista))}catch(err){}
  let ok=false;try{const r=await sb.from("paineis").select("config").eq("id",painelId).maybeSingle();if(!r.error){const cfg={...((r.data&&r.data.config)||{}),consultas:lista};const u=await sb.from("paineis").update({config:cfg}).eq("id",painelId);ok=!u.error}}catch(err){}
  b.disabled=false;toast(ok?`${lista.length} consulta(s) na seleção ✓`:`${lista.length} consulta(s) salvas neste aparelho (falta ativar o salvamento no servidor)`)});
