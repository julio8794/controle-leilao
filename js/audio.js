/* ---------- 🎤 vistoria por áudio ---------- */
let aud={grupo:"",itens:[],ocupado:false,res:null};
const CK_NOME=k=>((CHECKS.find(c=>c[0]===k)||[0,k])[1]);
const ST_NOME={ok:"✓ OK",at:"⚠ Atenção",pb:"✕ Problema"};
function arqB64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=()=>rej(new Error("Não consegui ler "+f.name));r.readAsDataURL(f)})}
function duracao(f){return new Promise(res=>{const a=document.createElement("audio");const u=URL.createObjectURL(f);a.preload="metadata";a.onloadedmetadata=()=>{const d=isFinite(a.duration)?a.duration:0;URL.revokeObjectURL(u);res(d)};a.onerror=()=>{URL.revokeObjectURL(u);res(0)};a.src=u;setTimeout(()=>res(0),5000)})}
const motosAud=()=>vehicles.filter(v=>!aud.grupo||v.grupoId===aud.grupo);
function contextoAud(){const ms=motosAud();return "Vistoria de motos em pátio de leilão. Motos: "+ms.map(v=>[v.lote,v.modelo,v.cor].filter(Boolean).join(" ")).join("; ")+". Termos: lote, chassi, motor, bengala, relação, coroa, pinhão, carenagem, retrovisor, para-lama, tanque, pneu, freio, pastilha, painel, partida, embreagem."}
function abrirAudio(gid){
  if(!podeGerir())return;aud={grupo:gid||fgrupoId||"",itens:[],ocupado:false,res:null};renderAudio();
  $("#ov").classList.add("on");$("#ov").scrollTop=0;document.body.style.overflow="hidden";
}
function renderAudio(){
  const ms=motosAud();
  $("#sheet").innerHTML=`<div class="shead"><div class="row"><button class="btn ghost sm" id="auX">← Voltar</button><h2>🎤 Vistoria por áudio</h2></div></div><div class="sbody">
   <fieldset><legend>Áudios</legend>
    <label>Grupo / edital das motos${grupoSelect({grupoId:aud.grupo},'id="auGr" '+(aud.ocupado?"disabled":""))}</label>
    <div class="mini">${ms.length} moto(s) no grupo. Diga no áudio o lote, o modelo ou a cor de cada moto.</div>
    <label class="btn" style="margin-top:10px">🎤 Escolher áudios<input type="file" id="auIn" accept="audio/*,.ogg,.opus,.m4a,.mp3,.wav,.aac,.amr" multiple hidden ${aud.ocupado?"disabled":""}></label>
    <div id="auSt" class="mini"></div>
    ${aud.itens.map((a,i)=>`<div class="aud ${a.st}"><b>${i+1}. ${esc(a.nome)}</b> <small>${a.seg?Math.round(a.seg)+"s":""} · ${a.st==="ok"?"✓ transcrito":a.st==="erro"?"⚠ "+esc(a.erro||""):"⏳ "+esc(a.st)}</small>
      ${a.texto?`<details><summary>Transcrição</summary><div class="evid">${esc(a.texto)}</div></details>`:""}</div>`).join("")}
   </fieldset>
   ${aud.res?revisaoAudHTML():""}
  </div>`;
  const s=$("#sheet");s.oninput=null;
  s.onchange=async e=>{const t=e.target;if(t.id==="auGr"){aud.grupo=t.value;renderAudio()}if(t.id==="auIn"){const fs=[...t.files];t.value="";processarAudios(fs)}
    if(t.dataset.auon){const [mi,tipo,ix]=t.dataset.auon.split(":");const m=aud.res[+mi];(tipo==="moto"?m:m[tipo][+ix]).on=t.checked}
    if(t.dataset.aumoto){aud.res[+t.dataset.aumoto].moto_id=t.value||null;renderAudio()}};
  s.onclick=e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="auX"){$("#ov").classList.remove("on");document.body.style.overflow="";render();return}
    if(b.id==="auAplicar"){aplicarAudio();return}};
}
async function processarAudios(fs){
  if(!fs.length)return;aud.ocupado=true;aud.res=null;
  const novos=fs.map(f=>({f,nome:f.name,st:"na fila"}));aud.itens.push(...novos);renderAudio();
  for(const a of novos){try{a.seg=await duracao(a.f);a.st="transcrevendo";renderAudio();
      const r=await chamarIA("transcrever",{audio:await arqB64(a.f),nome:a.nome,mime:a.f.type||"audio/ogg",segundos:a.seg,contexto:contextoAud(),ref:"audio:"+a.nome});
      a.texto=r.texto;a.st=a.texto?"ok":"erro";if(!a.texto)a.erro="transcrição vazia"}catch(e){a.st="erro";a.erro=e.message}renderAudio()}
  const st=$("#auSt");if(st)st.textContent="🤖 Lendo as transcrições e separando por moto…";
  const ms=motosAud().map(v=>({id:v.id,lote:v.lote,modelo:v.modelo,ano:v.ano,cor:v.cor,placa:v.placa}));
  const porMoto={};const semId=[];
  for(const a of aud.itens.filter(x=>x.st==="ok"&&!x.extraido)){
    try{const r=await chamarIA("extrair_vistoria",{texto:a.texto,motos:ms,ref:"audio:"+a.nome});a.extraido=true;
      (r.motos||[]).forEach(m=>{m.origem=a.nome;m.hora=(a.nome.match(/(\d{2}\.\d{2}\.\d{2})/)||[])[1]||"";const k=m.moto_id||("?"+semId.length);
        if(!m.moto_id){semId.push(m);porMoto[k]={...m,checks:[...m.checks],pecas:[...m.pecas],observacoes:[...m.observacoes],origens:[a.nome],resumos:[m.resumo]};return}
        const x=porMoto[k];if(!x){porMoto[k]={...m,origens:[a.nome],resumos:[m.resumo]};return}
        x.origens.push(a.nome);x.resumos.push(m.resumo);m.checks.forEach(c=>{const i=x.checks.findIndex(y=>y.item===c.item);if(i>=0)x.checks[i]=c;else x.checks.push(c)});
        x.pecas.push(...m.pecas.filter(p=>!x.pecas.some(q=>norm(q.desc)===norm(p.desc))));x.observacoes.push(...m.observacoes);["km","nota","limite"].forEach(f=>{if(m[f]&&m[f].valor!=null)x[f]=m[f]})});
      (r.nao_identificado||[]).forEach(t=>a.erro=(a.erro?a.erro+" · ":"")+t)}catch(e){a.st="erro";a.erro=e.message}}
  const PESO={ok:0,at:1,pb:2};
  aud.res=Object.values(porMoto).map(m=>{const pior={};m.checks.forEach(c=>{const x=pior[c.item];if(!x||PESO[c.status]>PESO[x.status])pior[c.item]=c});m.checks=Object.values(pior);m.on=!!m.moto_id;m.checks.forEach(c=>c.on=true);m.pecas.forEach(p=>p.on=true);m.observacoes.forEach(o=>o.on=true);return m});
  aud.ocupado=false;renderAudio();const s2=$("#auSt");if(s2)s2.textContent=`✅ ${aud.itens.filter(x=>x.st==="ok").length} áudio(s) transcrito(s) · ${aud.res.filter(m=>m.moto_id).length} moto(s) identificada(s). Revise e aplique.`;
}
function revisaoAudHTML(){
  return `<fieldset><legend>Revisão por moto</legend>${aud.res.map((m,mi)=>{const v=vehicles.find(x=>x.id===m.moto_id);const ck=(v&&v.vistoria&&v.vistoria.checks)||{};
    return `<div class="aurev"><label class="ia-it"><input type="checkbox" data-auon="${mi}:moto" ${m.on?"checked":""}><span><b>${v?esc((v.lote?v.lote+" · ":"")+v.modelo+" "+(v.cor||"")):"⚠ Moto não identificada"}</b>
      <small> · áudio ${esc(m.origens.join(", "))}</small>${m.identificacao_trecho?`<div class="evid">“${esc(m.identificacao_trecho)}”</div>`:""}</span></label>
     <select data-aumoto="${mi}"><option value="">— escolher moto —</option>${motosAud().map(x=>`<option value="${x.id}" ${x.id===m.moto_id?"selected":""}>${esc((x.lote||"")+" "+x.modelo+" "+(x.cor||""))}</option>`).join("")}</select>
     ${m.checks.map((c,i)=>`<label class="ia-it"><input type="checkbox" data-auon="${mi}:checks:${i}" ${c.on?"checked":""}><span><b>${esc(CK_NOME(c.item))}:</b> ${ST_NOME[c.status]}${ck[c.item]&&ck[c.item]!==c.status?` <small class="neg">(hoje: ${ST_NOME[ck[c.item]]} → será trocado)</small>`:ck[c.item]?` <small>(já estava assim)</small>`:""}<div class="evid">“${esc(c.trecho)}”</div></span></label>`).join("")}
     ${m.pecas.map((p,i)=>{const s=sugerirPreco(p.desc,v&&v.modelo);return `<label class="ia-it"><input type="checkbox" data-auon="${mi}:pecas:${i}" ${p.on?"checked":""}><span><b>Orçar:</b> ${esc(p.desc)} ${s?`<small>💡 ${brl(s.mediana)} (${s.n}×)</small>`:`<small>sem preço na base</small>`}<div class="evid">“${esc(p.trecho)}”</div></span></label>`}).join("")}
     ${["km","nota","limite"].filter(f=>m[f]&&m[f].valor!=null).map(f=>`<div class="mini">${f==="km"?"Km":f==="nota"?"Nota":"Lance limite"}: <b>${f==="limite"?brl(m[f].valor):m[f].valor}</b> · “${esc(m[f].trecho)}”</div>`).join("")}
     ${m.observacoes.map((o,i)=>`<label class="ia-it"><input type="checkbox" data-auon="${mi}:observacoes:${i}" ${o.on?"checked":""}><span>📝 ${esc(o.texto)}<div class="evid">“${esc(o.trecho)}”</div></span></label>`).join("")}
     ${m.descartados?`<div class="mini neg">${m.descartados} item(ns) descartado(s): o trecho não foi encontrado na transcrição.</div>`:""}
     <div class="mini">Resumo: ${esc(m.resumos.filter(Boolean).join(" "))}</div></div>`}).join("")}
   <div class="toolbar" style="margin:12px 0 0"><button class="btn" id="auAplicar">Aplicar nas motos marcadas</button></div></fieldset>`;
}
function aplicarAudio(){
  let n=0;
  aud.res.filter(m=>m.on&&m.moto_id).forEach(m=>{const v=vehicles.find(x=>x.id===m.moto_id);if(!v)return;
    v.vistoria=v.vistoria||{checks:{}};v.vistoria.checks=v.vistoria.checks||{};
    m.checks.filter(c=>c.on).forEach(c=>{v.vistoria.checks[c.item]=c.status});
    v.orcado=v.orcado||[];m.pecas.filter(p=>p.on).forEach(p=>{if(v.orcado.some(o=>norm(o.desc)===norm(p.desc)))return;const s=sugerirPreco(p.desc,v.modelo);
      const item=p.item||null;const cat=item&&CHECK_CAT[item]?CHECK_CAT[item]:(p.categoria||"outros");const o={id:uid(),cat,desc:p.desc,valor:s?String(s.mediana):"",item,origem:"audio",on:true};v.orcado.push(o);if(s)registrarPreco("orc:"+v.id+":"+o.id,o.desc,o.cat,o.valor,"audio",v)});
    if(m.km&&m.km.valor!=null&&!num(v.km))v.km=String(m.km.valor);
    if(m.nota&&m.nota.valor!=null)v.vistoria.nota=String(m.nota.valor);
    if(m.limite&&m.limite.valor!=null)v.vistoria.limite=String(m.limite.valor);
    const obs=[...m.resumos.filter(Boolean),...m.observacoes.filter(o=>o.on).map(o=>o.texto)].join(" ");
    const marca=`🎤 Áudio ${m.origens.map(o=>(o.match(/(\d{2}\.\d{2}\.\d{2})/)||[])[1]||o).join(", ")}:`;
    if(obs&&!(v.vistoria.obs||"").includes(marca))v.vistoria.obs=((v.vistoria.obs||"")+(v.vistoria.obs?"\n":"")+marca+" "+obs).trim();
    v.audiosVist=v.audiosVist||[];m.origens.forEach(o=>{const a=aud.itens.find(x=>x.nome===o);if(a&&!v.audiosVist.some(x=>x.arquivo===o))v.audiosVist.push({arquivo:o,texto:a.texto,em:new Date().toISOString()})});
    if(!v.vistoria.resp&&meuNome)v.vistoria.resp=meuNome;
    if(vistProg(v).done>=CHECKS.length&&(!v.vistoria.status||v.vistoria.status==="a_vistoriar"))v.vistoria.status="vistoriada";
    persist(v);n++});
  toast(`Vistoria aplicada em ${n} moto(s) ✓`);$("#ov").classList.remove("on");document.body.style.overflow="";tab="veiculos";fgrupoId=aud.grupo||fgrupoId;render();
}
document.addEventListener("click",e=>{const b=e.target.closest("#impAudio,[data-gaud]");if(!b)return;abrirAudio(b.dataset.gaud||fgrupoId)});
