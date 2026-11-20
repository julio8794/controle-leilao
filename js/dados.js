/* ---------- completar e conferir dados (edital + site + FIPE) ---------- */
const FIPE_API="https://parallelum.com.br/fipe/api/v1";
const VIN_ANO={A:2010,B:2011,C:2012,D:2013,E:2014,F:2015,G:2016,H:2017,J:2018,K:2019,L:2020,M:2021,N:2022,P:2023,R:2024,S:2025,T:2026,V:2027,W:2028,X:2029,Y:2030,1:2031,2:2032,3:2033,4:2034,5:2035,6:2036,7:2037,8:2038,9:2039};
const WMI={"9C2":"HONDA","9C6":"YAMAHA","94J":"YAMAHA","93H":"HONDA","9CD":"SUZUKI","99H":"SHINERAY","9BW":"VW","9BG":"CHEVROLET","9BD":"FIAT","9BF":"FORD","93Y":"RENAULT","9BH":"HYUNDAI","95P":"DAFRA","9C6K":"YAMAHA","LXY":"SHINERAY","LZS":"SUNDOWN","9EB":"HAOJUE","95V":"KASINSKI","9CK":"DAFRA"};
const nt=s=>norm(s).replace(/([a-z])(\d)/g,"$1 $2").replace(/(\d)([a-z])/g,"$1 $2");
const tok=s=>nt(s).split(" ").filter(Boolean);
const anoModelo=a=>{const m=String(a||"").match(/(\d{4})\D+(\d{4})/);return m?+m[2]:(/(\d{4})/.test(a||"")?+RegExp.$1:null)};
const marcaDe=m=>{const x=String(m||"").toUpperCase().split(/[\/\s]/)[0];return {VW:"VOLKSWAGEN",CHEV:"CHEVROLET",GM:"CHEVROLET",MMC:"MITSUBISHI",MB:"MERCEDES-BENZ"}[x]||x};
function renavamOk(r){r=String(r||"").replace(/\D/g,"");if(!r)return null;if(r.length>11)return false;r=r.padStart(11,"0");const w="3298765432";let s=0;for(let i=0;i<10;i++)s+=+r[i]*+w[i];let d=(s*10)%11;if(d===10)d=0;return d===+r[10]}
function placaOk(p){p=String(p||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!p)return null;return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(p)}

/* ----- lotes do edital (Anexo I) ----- */
async function lotesDoGrupo(g,forcar){
  if(!g||!g.edital_url)return null;
  if(!forcar&&Array.isArray(g.lotes)&&g.lotes.length)return g.lotes;
  const r=await chamarIA("lotes_edital",{url:g.edital_url});
  g.lotes=r.lotes||[];g.lotes_falhas=r.falhas||[];
  try{await sb.from("grupos").update({lotes:g.lotes,lotes_lidos_em:new Date().toISOString()}).eq("id",g.id)}catch(e){}
  return g.lotes;
}
function casarLote(v,lotes){
  if(!lotes||!lotes.length)return null;
  const n=+String(v.lote||"").split(/[-\/ ]/).pop();const mt=tok(v.modelo),am=anoModelo(v.ano);
  const pont=l=>{let s=0;const lt=tok(l.modelo);const comuns=mt.filter(t=>lt.includes(t)).length;s+=mt.length?comuns/Math.max(mt.length,lt.length)*4:0;
    if(am&&anoModelo(l.ano)===am)s+=2;if(num(v.lanceMin)&&num(v.lanceMin)===l.lanceMin)s+=2;if(v.chassi&&norm(v.chassi)===norm(l.chassi))s+=10;if(v.placa&&norm(v.placa)===norm(l.placa))s+=10;return s};
  let cand=lotes.filter(l=>(n&&+l.lote===n)||(v.chassi&&norm(v.chassi)===norm(l.chassi))||(v.placa&&v.placa.length>=7&&norm(v.placa)===norm(l.placa)));
  if(!cand.length)return null;
  // 1) pátios da cidade do grupo têm prioridade
  const g=grupoDe(v);const cid=g?norm(g.cidade||g.nome).split(" ")[0]:"";
  if(cid){const daCid=cand.filter(l=>norm(l.patio).includes(cid));if(daCid.length)cand=daCid}
  // 2) prefixo do leilão no site (ex.: 230-, 231-) → pátio, aprendido das motos já casadas do mesmo grupo
  const pref=String(v.lote||"").includes("-")?String(v.lote).split("-")[0]:"";
  if(pref){const vis=vehicles.filter(x=>x!==v&&x.grupoId===v.grupoId&&x.editalLote&&String(x.lote||"").startsWith(pref+"-")).map(x=>x.editalLote.patio);
    const doPref=vis.length?cand.filter(l=>vis.includes(l.patio)):[];if(doPref.length)cand=doPref;
    else{const outros=new Set(vehicles.filter(x=>x!==v&&x.grupoId===v.grupoId&&x.editalLote&&!String(x.lote||"").startsWith(pref+"-")).map(x=>x.editalLote.patio));const livres=cand.filter(l=>!outros.has(l.patio));if(livres.length)cand=livres}}
  cand=cand.map(l=>({l,s:pont(l)})).sort((a,b)=>b.s-a.s);
  const [a,b]=cand;if(a.s<4)return {duvida:true,cands:cand.slice(0,3).map(x=>x.l)};
  if(b&&a.s-b.s<1.5)return {duvida:true,cands:[a.l,b.l]};
  return {lote:a.l,pontos:Math.round(a.s*10)/10};
}

/* ----- FIPE oficial ----- */
async function fipeJSON(path){const k="fipe:"+path;try{const c=JSON.parse(localStorage.getItem(k)||"null");if(c&&Date.now()-c.t<864e5*7)return c.d}catch(e){}
  const r=await fetch(FIPE_API+path);if(!r.ok)throw new Error("FIPE indisponível ("+r.status+")");const d=await r.json();try{localStorage.setItem(k,JSON.stringify({t:Date.now(),d}))}catch(e){}return d}
async function buscarFipe(modelo,ano,tipo){
  const am=anoModelo(ano);if(!modelo||!am)return {erro:"Falta modelo ou ano"};
  tipo=tipo||"motos";const marca=marcaDe(modelo);
  const marcas=await fipeJSON(`/${tipo}/marcas`);const mk=marcas.find(x=>norm(x.nome)===norm(marca))||marcas.find(x=>norm(x.nome).startsWith(norm(marca)));
  if(!mk){if(tipo==="motos")return buscarFipe(modelo,ano,"carros");return {erro:`Marca ${marca} não encontrada na FIPE`}}
  const ms=(await fipeJSON(`/${tipo}/marcas/${mk.codigo}/modelos`)).modelos;
  const vt=tok(String(modelo).replace(/^[^\/]*\//,"")).filter(t=>t!==norm(marca));
  const nums=vt.filter(t=>/^\d+$/.test(t)),fam=vt.find(t=>/^[a-z]/.test(t));
  let cand=ms.map(m=>{const mt=tok(m.nome);const tem=t=>mt.includes(t)||mt.some(x=>x.startsWith(t)&&t.length>=3);
      if(nums.some(n=>!mt.includes(n))||(fam&&!tem(fam)))return null;
      const extra=vt.filter(t=>!nums.includes(t)&&t!==fam);const hit=extra.filter(tem).length;const sobra=mt.filter(t=>!vt.includes(t)&&!/^(flex|mix|flexone|es|esd|esi|ks|i)$/.test(t)).length;
      return {m,s:hit*2-sobra*.5+(extra.length?0:1)}}).filter(Boolean).sort((a,b)=>b.s-a.s).slice(0,10);
  // só modelos com o ano disponível
  const comAno=[];for(const c of cand){try{const an=await fipeJSON(`/${tipo}/marcas/${mk.codigo}/modelos/${c.m.codigo}/anos`);const a=an.find(x=>x.codigo.startsWith(am+"-"));if(a)comAno.push({...c,anoCod:a.codigo})}catch(e){}}
  if(!comAno.length)return {erro:"Nenhum modelo da FIPE com esse nome e ano",candidatos:cand.map(c=>c.m.nome)};
  let esc=null,metodo="",motivo="";
  if(comAno.length===1||comAno[0].s-comAno[1].s>=2){esc=comAno[0];metodo="exato"}
  else{try{const r=await chamarIA("escolher_fipe",{veiculo:modelo,ano:String(ano),candidatos:comAno.map(c=>c.m.nome),ref:"fipe:"+modelo+" "+ano});if(r.indice!=null){esc=comAno[r.indice];metodo="ia";motivo=r.motivo}}catch(e){motivo="IA indisponível: "+e.message}}
  const cands=comAno.map(c=>({nome:c.m.nome,cod:c.m.codigo,anoCod:c.anoCod,marca:mk.codigo,tipo}));
  if(!esc)return {duvida:true,candidatos:cands,motivo};
  return {...await valorFipe(tipo,mk.codigo,esc.m.codigo,esc.anoCod),metodo,motivo,candidatos:cands};
}
async function valorFipe(tipo,marca,modelo,anoCod){
  const d=await fipeJSON(`/${tipo}/marcas/${marca}/modelos/${modelo}/anos/${anoCod}`);
  return {valor:num(String(d.Valor).replace(/[^\d,]/g,"").replace(",",".")),codigo:d.CodigoFipe,modelo:d.Modelo,mes:String(d.MesReferencia||"").trim(),ano:d.AnoModelo,comb:d.Combustivel,ref:{tipo,marca,modelo,anoCod}};
}
function aplicarFipe(v,f){
  v.fipe=String(Math.round(f.valor));v.fipeRef={codigo:f.codigo,modelo:f.modelo,mes:f.mes,metodo:f.metodo,motivo:f.motivo||"",ref:f.ref,em:new Date().toISOString().slice(0,10)};
  v.fipeHist=v.fipeHist||[];const hoje=new Date().toISOString().slice(0,10);if(!v.fipeHist.some(h=>h.data===hoje))v.fipeHist.push({data:hoje,valor:v.fipe,fonte:"FIPE "+f.mes});
}

/* ----- completar + conferir ----- */
const CAMPOS_CONF=[["modelo","Modelo"],["ano","Ano"],["cor","Cor"],["placa","Placa"],["chassi","Chassi"],["renavam","Renavam"],["motor","Nº do motor"],["uf","UF"],["combustivel","Combustível"],["classificacao","Classificação"],["lanceMin","Lance mínimo"]];
const ESTRUT=["placa","chassi","renavam","motor","uf","combustivel","classificacao","lanceMin"];
const iguais=(a,b,k)=>{if(k==="lanceMin")return num(a)===num(b);if(k==="modelo"){const A=tok(a),B=tok(b);return A.length&&B.length&&A.filter(t=>B.includes(t)).length>=Math.min(A.length,B.length)*.8}
  if(k==="ano"){return anoModelo(a)===anoModelo(b)&&String(a).slice(0,4)===String(b).slice(0,4)}return norm(a).replace(/ /g,"")===norm(b).replace(/ /g,"")};
async function completarDados(v,op={}){
  const log=[];const g=grupoDe(v);const fontes={};
  // 1) edital
  if(g&&g.edital_url){try{const ls=await lotesDoGrupo(g);const c=casarLote(v,ls);
      if(c&&c.lote){fontes.edital=c.lote;v.editalLote={patio:c.lote.patio,lote:c.lote.lote,pontos:c.pontos}}else if(c&&c.duvida){log.push(`Edital: mais de um lote possível (${c.cands.map(l=>l.patio+" "+l.lote).join(", ")}). Informe placa ou chassi.`)}
      else log.push("Edital: lote não encontrado no Anexo I")}catch(e){log.push("Edital: "+e.message)}}
  // 2) site do lote (cache de 30 dias no servidor)
  if(/^https?:\/\//.test(v.link||"")){try{const r=await chamarIA("importar_lote",{url:v.link});const s={};
      [["modelo","modelo"],["ano","ano"],["cor","cor"],["placa_final","placa"],["chassi","chassi"],["renavam","renavam"],["motor","motor"],["combustivel","combustivel"],["km","km"],["lance_minimo","lanceMin"],["lance_atual","lanceAtual"],["situacao","classificacao"],["observacoes","obsSite"],["data_leilao","dataLeilao"]].forEach(([a,b])=>{if(r[a]&&r[a].valor!=null&&r[a].verificado)s[b]=r[a].valor});
      fontes.site=s;
      // fotos: o registro do lote é a fonte certa; substitui fotos antigas vindas do site (que podiam misturar outros lotes)
      const daWeb=(v.fotosRef||[]).every(u=>/^https?:/.test(u));
      if(r.fotos&&r.fotos.length&&(!v.fotosRef||(r.estruturado&&daWeb))){const novas=r.fotos.filter(u=>!/comitente/i.test(u)).slice(0,8);if(JSON.stringify(novas)!==JSON.stringify(v.fotosRef)){if(v.fotosRef)log.push(`Fotos atualizadas: ${novas.length} do próprio lote`);v.fotosRef=novas}}}catch(e){log.push("Site: "+e.message)}}
  // 3) mescla com regras
  const E=fontes.edital||{},S=fontes.site||{};const itens=[];
  CAMPOS_CONF.forEach(([k,l])=>{const atual=v[k],ed=E[k],si=S[k];const it={campo:k,nome:l,sistema:atual??"",edital:ed??"",site:si??""};
    if(temV(ed)&&temV(si)&&!(k==="placa"&&String(si).length<7)&&!iguais(ed,si,k))it.alerta=`edital e site divergem`;
    if(!temV(atual)){const val=temV(ed)?ed:si;if(temV(val)){v[k]=k==="lanceMin"?num(val):val;it.status="preenchido";it.fonte=temV(ed)?"edital":"site"}else it.status="falta"}
    else if(temV(ed)&&!iguais(atual,ed,k)){if(ESTRUT.includes(k)&&!op.manter){v[k]=k==="lanceMin"?num(ed):ed;it.status="corrigido";it.antes=atual;it.fonte="edital"}else{it.status="divergente";it.fonte="edital"}}
    else if(!temV(ed)&&temV(si)&&!iguais(atual,si,k)&&!(k==="placa"&&String(si).length<7))it.status="divergente_site";
    else it.status="ok";
    itens.push(it)});
  if(E.desalienacao!==undefined)v.desalienacao=E.desalienacao;if(E.semPlaca)v.semPlaca=true;
  if(S.obsSite&&!(v.obs||"").includes(S.obsSite))v.obs=((v.obs||"")+(v.obs?"\n":"")+"Site: "+S.obsSite).trim();
  // 4) checagens técnicas (sem IA)
  const ch=[];const vin=String(v.chassi||"").toUpperCase();
  if(vin){ch.push({nome:"Chassi com 17 caracteres válidos",ok:/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)});
    const ay=VIN_ANO[vin[9]],am=anoModelo(v.ano);if(ay&&am)ch.push({nome:`Ano no chassi (${vin[9]} = ${ay}) × ano modelo ${am}`,ok:ay===am||ay===am-1,detalhe:"o chassi indica outro ano: confira no documento"});
    const fab=WMI[vin.slice(0,3)];if(fab)ch.push({nome:`Fabricante no chassi (${vin.slice(0,3)} = ${fab}) × marca ${marcaDe(v.modelo)}`,ok:norm(fab)===norm(marcaDe(v.modelo))||(fab==="VW"&&/VOLKS/.test(marcaDe(v.modelo)))});
    const mo=String(v.motor||"").toUpperCase();if(mo&&fab==="HONDA"){const famC=vin.slice(3,7),famM=mo.slice(0,4);ch.push({nome:`Família do motor (${famM}) × chassi (${famC})`,ok:famC.slice(0,2)===famM.slice(0,2)&&famC.slice(2,4)===famM.slice(2,4),detalhe:"padrão Honda: as 4 letras/números do motor repetem as do chassi"})}}
  if(v.renavam)ch.push({nome:"Renavam (dígito verificador)",ok:renavamOk(v.renavam)});
  if(v.placa)ch.push({nome:"Placa no formato oficial",ok:placaOk(v.placa)});
  // 5) FIPE oficial
  let fipeInfo=null;if(!op.semFipe&&v.modelo&&v.ano){try{const f=await buscarFipe(v.modelo,v.ano);fipeInfo=f;if(f.valor)aplicarFipe(v,f);else if(f.duvida){v.fipeCands=f.candidatos;log.push("FIPE: escolha a versão entre "+f.candidatos.length+" opções")}else if(f.erro)log.push("FIPE: "+f.erro)}catch(e){log.push("FIPE: "+e.message)}}
  v.conferencia={em:new Date().toISOString(),itens,checks:ch,log,edital:v.editalLote||null,temSite:!!fontes.site};
  persist(v);return v.conferencia;
}
function resumoConf(v){const c=v.conferencia;if(!c)return null;const div=c.itens.filter(i=>/divergente/.test(i.status)||i.alerta).length+c.checks.filter(x=>!x.ok).length;return {div,pre:c.itens.filter(i=>i.status==="preenchido"||i.status==="corrigido").length}}
function confHTML(v){
  const c=v.conferencia;const F={edital:"📄",site:"🌐"};
  return `<fieldset><legend>🧩 Dados conferidos <span class="mini" style="margin:0">— edital, site do leiloeiro e FIPE</span></legend>
   ${c?`<div class="mini">Última conferência: ${new Date(c.em).toLocaleString("pt-BR")}${c.edital?` · Anexo I: ${esc(c.edital.patio)} lote ${esc(c.edital.lote)}`:""}</div>
   <table class="tcmp conf"><tr><th>Campo</th><th>No sistema</th><th>📄 Edital</th><th>🌐 Site</th><th></th></tr>
   ${c.itens.map(i=>`<tr class="cf-${i.status}"><td>${esc(i.nome)}</td><td><b>${esc(String(v[i.campo]??""))}</b>${i.antes?`<small>antes: ${esc(String(i.antes))}</small>`:""}</td><td>${esc(String(i.edital))}</td><td>${esc(String(i.site))}</td>
     <td>${i.status==="ok"?"✓":i.status==="preenchido"?`<span class="tag-ok">preenchido</span>`:i.status==="corrigido"?`<span class="tag-warn">corrigido</span>`:i.status==="falta"?`<small>sem dado</small>`:`<button class="btn ghost sm" data-usar="${i.campo}" data-src="${i.status==="divergente"?"edital":"site"}">usar ${i.status==="divergente"?"edital":"site"}</button>`}${i.alerta?`<small class="neg">⚠ ${esc(i.alerta)}</small>`:""}</td></tr>`).join("")}</table>
   ${c.checks.length?`<div class="sec-t" style="margin:12px 0 6px">Checagens técnicas</div>${c.checks.map(x=>`<div class="ck ${x.ok?"ok":"no"}">${x.ok?"✓":"⚠"} ${esc(x.nome)}${!x.ok&&x.detalhe?` <small>${esc(x.detalhe)}</small>`:""}</div>`).join("")}`:""}
   ${c.log.length?`<div class="mini neg" style="margin-top:8px">${c.log.map(esc).join("<br>")}</div>`:""}`:`<div class="mini">Ainda não conferido.</div>`}
   <div class="sec-t" style="margin:12px 0 6px">💲 FIPE oficial</div>
   ${v.fipeRef?`<div><b>${brl(num(v.fipe))}</b> · ${esc(v.fipeRef.modelo)} · cód. ${esc(v.fipeRef.codigo)} · ${esc(v.fipeRef.mes)} <small>${v.fipeRef.metodo==="ia"?`(versão escolhida pela IA entre ${(v.fipeCands||[]).length||"várias"} opções${v.fipeRef.motivo?": "+esc(v.fipeRef.motivo):""})`:v.fipeRef.metodo==="manual"?"(versão escolhida por você)":"(versão casada pelo nome)"}</small></div>`:`<div class="mini">Sem FIPE oficial ainda.</div>`}
   ${(v.fipeCands||[]).length?`<label style="margin-top:6px">Versão na FIPE<select id="fipeSel"><option value="">— escolher —</option>${v.fipeCands.map((x,i)=>`<option value="${i}" ${v.fipeRef&&v.fipeRef.ref&&v.fipeRef.ref.modelo==x.cod?"selected":""}>${esc(x.nome)}</option>`).join("")}</select></label>`:""}
   ${podeGerir()?`<div class="toolbar" style="margin:12px 0 0"><button class="btn sm" id="xConf">🔄 Completar e conferir agora</button></div><div class="mini" id="xConfSt"></div>`:""}
  </fieldset>`;
}
async function completarGrupo(gid,st){
  const ms=vehicles.filter(v=>v.grupoId===gid);let i=0,div=0;
  for(const v of ms){i++;if(st)st.textContent=`Conferindo ${i}/${ms.length}: ${v.modelo||""}…`;try{await completarDados(v);const r=resumoConf(v);if(r&&r.div)div++}catch(e){}}
  return {n:ms.length,div};
}

/* ----- integração com a ficha ----- */
const _tabDadosOrig=tabDados;
tabDados=function(v){const base=_tabDadosOrig(v);
  const extra=`<fieldset><legend>🪪 Documento</legend><div class="f2">${inp("renavam","Renavam")}${inp("motor","Nº do motor")}${inp("uf","UF")}${inp("combustivel","Combustível")}${inp("classificacao","Classificação (edital)")}</div>
   ${v.desalienacao?`<div class="mini">⚠ Edital indica taxa/desalienação a pagar.</div>`:""}${v.semPlaca?`<div class="mini">⚠ Veículo sem placa (1º emplacamento).</div>`:""}</fieldset>`;
  return base.replace('<fieldset><legend>📝 Observações</legend>',extra+confHTML(v)+'<fieldset><legend>📝 Observações</legend>')};
document.addEventListener("click",async e=>{const b=e.target.closest("#sheet button");if(!b||!editing)return;const v=editing;
  if(b.id==="xConf"){b.disabled=true;const st=$("#xConfSt");st.textContent="Lendo edital, site e FIPE…";try{await completarDados(v);toast("Dados conferidos ✓")}catch(err){st.textContent="⚠ "+err.message}keepScroll(renderETab);return}
  if(b.dataset.usar){const it=v.conferencia.itens.find(i=>i.campo===b.dataset.usar);const val=b.dataset.src==="edital"?it.edital:it.site;v[it.campo]=it.campo==="lanceMin"?num(val):val;it.status="ok";if(it.campo==="modelo"||it.campo==="ano"){try{const f=await buscarFipe(v.modelo,v.ano);if(f.valor)aplicarFipe(v,f)}catch(err){}}persist(v);keepScroll(renderETab);return}
});
document.addEventListener("change",async e=>{if(e.target.id!=="fipeSel"||!editing)return;const v=editing;const c=v.fipeCands[+e.target.value];if(!c)return;
  try{const f=await valorFipe(c.tipo,c.marca,c.cod,c.anoCod);aplicarFipe(v,{...f,metodo:"manual"});persist(v);keepScroll(renderETab);toast("FIPE atualizada ✓")}catch(err){toast(err.message)}});
function autoCompletar(v){if(!v||!podeGerir())return;completarDados(v).then(()=>{if(editing&&editing.id===v.id)keepScroll(renderETab);else render()}).catch(()=>{})}
document.addEventListener("click",async e=>{const b=e.target.closest("#avFipe");if(!b)return;const st=$("#avFipeSt");b.disabled=true;st.textContent="Consultando FIPE…";
  try{const f=await buscarFipe(av.modelo,av.ano);if(f.valor){av.fipe=String(Math.round(f.valor));av.fipeRef=f;renderBg()}else{st.textContent=f.duvida?"Várias versões possíveis: "+f.candidatos.map(c=>c.nome).slice(0,4).join(" · "):"⚠ "+(f.erro||"não encontrada")}}catch(err){st.textContent="⚠ "+err.message}b.disabled=false});

/* ----- envio do PDF do edital ----- */
const slugArq=s=>norm(String(s||"edital").replace(/\.pdf$/i,"")).replace(/ /g,"-").slice(0,60)||"edital";
async function enviarEditalPDF(g,file){
  const st=$("#gIASt");const say=h=>{if(st)st.innerHTML=h};
  if(!file)return;
  if(!/pdf$/i.test(file.type)&&!/\.pdf$/i.test(file.name))return say(`<div class="ia-box neg">Envie o edital em PDF.</div>`);
  if(file.size>20e6)return say(`<div class="ia-box neg">PDF com ${(file.size/1e6).toFixed(1)} MB: o limite é 20 MB.</div>`);
  say(`<div class="ia-box">⬆ Enviando ${esc(file.name)} (${(file.size/1e6).toFixed(1)} MB)…</div>`);
  const path=`${painelId}/${g.id}/${Date.now()}-${slugArq(file.name)}.pdf`;
  const up=await sb.storage.from("editais").upload(path,file,{contentType:"application/pdf",upsert:false});
  if(up.error)return say(`<div class="ia-box"><b class="neg">Não consegui enviar o PDF.</b><div class="mini">${esc(up.error.message)}</div></div>`);
  g.edital_url=sb.storage.from("editais").getPublicUrl(path).data.publicUrl;g.edital_nome=file.name;g.lotes=null;g.lotes_falhas=null;
  if(!String(g.nome||"").trim()||g._nomeAuto){g.nome=slugArq(file.name).replace(/-/g," ");g._nomeAuto=true}
  renderGrupo();
  await lerLotesUI(g,true,true);
  lerEditalIA(g);
}
async function lerLotesUI(g,forcar,emSeguida){
  const a=$("#gArq");if(a)a.textContent="📋 Lendo a tabela de lotes do Anexo I…";
  try{const ls=await lotesDoGrupo(g,forcar);g.lotes_lidos_em=new Date().toISOString();
    const pat={};(ls||[]).forEach(l=>pat[l.patio]=(pat[l.patio]||0)+1);
    const txt=ls&&ls.length?`📄 ${esc(g.edital_nome||"edital")} · <b>${ls.length} lote(s)</b> lidos do Anexo I (${Object.entries(pat).map(([p,n])=>esc(p)+": "+n).join(" · ")})${(g.lotes_falhas||[]).length?` · ⚠ ${g.lotes_falhas.length} linha(s) não reconhecidas`:""}`
      :`⚠ Nenhum lote reconhecido no Anexo I. Se o PDF for escaneado (imagem), os lotes não podem ser lidos automaticamente.`;
    const el=$("#gArq");if(el)el.innerHTML=txt;
    const ms=vehicles.filter(v=>v.grupoId===g.id).length;
    if(ls&&ls.length&&ms&&!emSeguida&&el)el.innerHTML+=` <button class="btn ghost sm" id="gConfAgora">🧩 Completar as ${ms} moto(s)</button>`;
    return ls;
  }catch(e){const el=$("#gArq");if(el)el.innerHTML=`<span class="neg">⚠ ${esc(e.message)}</span>`}
}
document.addEventListener("change",async e=>{
  if(e.target.id==="gPdf"&&gEdit){const f=e.target.files[0];e.target.value="";await enviarEditalPDF(gEdit,f)}
  if(e.target.id==="gNovoPdf"){const f=e.target.files[0];e.target.value="";if(!f)return;abrirGrupo(null);await enviarEditalPDF(gEdit,f)}
});
document.addEventListener("click",async e=>{const b=e.target.closest("#gConfAgora");if(!b||!gEdit)return;b.disabled=true;
  if(grupos.some(x=>x.id===gEdit.id)){const r=await completarGrupo(gEdit.id,b);b.textContent=`✓ ${r.n} conferida(s)${r.div?` · ${r.div} a conferir`:""}`}else b.textContent="Salve o edital primeiro"});
