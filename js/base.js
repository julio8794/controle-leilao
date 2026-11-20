const CATS={
  arremate:{n:"Arremate",c:"var(--c-arremate)",i:"🔨"},
  estetica:{n:"Estética",c:"var(--c-estetica)",i:"✨"},
  documentacao:{n:"Documentação",c:"var(--c-documentacao)",i:"📄"},
  mecanica:{n:"Mecânica",c:"var(--c-mecanica)",i:"🔧"},
  transporte:{n:"Transporte/Guincho",c:"var(--c-transporte)",i:"🚚"},
  outros:{n:"Outros",c:"var(--c-outros)",i:"➕"}
};
const PRESETS={
  estetica:["Polimento","Cristalização","Higienização interna","Lavagem técnica motor","Funilaria","Pintura","Martelinho de ouro","Faróis (revitalização)","Película","Tapetes/bancos","Rodas/pneus"],
  documentacao:["Vistoria/laudo cautelar","Transferência DETRAN","IPVA em atraso","Licenciamento","Multas","Taxa de baixa de gravame","Despachante","2ª via CRV","Regularização chassi/motor","Placa Mercosul"],
  mecanica:["Revisão/óleo e filtros","Bateria","Freios","Suspensão","Correia dentada","Elétrica","Ar-condicionado","Chave reserva"],
  transporte:["Guincho/remoção","Diárias de pátio extra","Combustível/frete"],
  outros:["Anúncio (OLX/Webmotors)","Comissão de venda","Seguro temporário"]
};
const STCOL={avaliacao:"#8b98a8",arrematado:"#4c8dff",preparacao:"#d16bff",avenda:"#f5a524",vendido:"#3fb950"};
const STATUS={avaliacao:"Em avaliação",arrematado:"Arrematado",preparacao:"Em preparação",avenda:"À venda",vendido:"Vendido"};

let vehicles=[], dbCol=null, mode="local", tab="painel", editing=null, dirty=new Set(), saveTimers={}, filtro="", fstatus="";
const $=s=>document.querySelector(s);
const brl=n=>(isFinite(n)?n:0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pct=n=>isFinite(n)?(n*100).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%":"—";
const num=v=>{if(v==null||v==="")return 0;if(typeof v==="number")return v;let s=String(v).replace(/[R$\s]/g,"");if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?n:0};
const fmtIn=v=>v?String(v).replace(".",","):"";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>"v"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function toast(m){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(t._t);t._t=setTimeout(()=>t.style.display="none",2200)}

let grupos=[],precos=[],membros=[];
const grupoDe=v=>grupos.find(g=>g.id===v.grupoId)||null;
const temV=x=>x!==undefined&&x!==null&&x!=="";
function custas(v){const c=(grupoDe(v)||{}).custas||{};
  return {comPct:temV(v.comissaoPct)?num(v.comissaoPct):num(c.comissaoPct),admPct:temV(v.taxaAdmPct)?num(v.taxaAdmPct):num(c.taxaAdmPct),
    fixas:(c.taxasFixas||[]).reduce((a,t)=>a+num(t.valor),0),taxasFixas:c.taxasFixas||[],docs:c.docs||[],
    conting:temV(v.conting)?num(v.conting):(temV(c.contingPct)?num(c.contingPct):10),margem:temV(v.margemAlvo)?num(v.margemAlvo):(temV(c.margemPct)?num(c.margemPct):20),c}}
function calc(v){
  const cu=custas(v);const lance=num(v.lance);
  const comissao=lance*cu.comPct/100,adm=lance*cu.admPct/100;
  const extras=num(v.taxaAdm)+num(v.taxaPatio)+num(v.outrosArremate);
  const pagamento=lance?lance+comissao+adm+cu.fixas+extras:0;
  const porCat={arremate:pagamento,estetica:0,documentacao:0,mecanica:0,transporte:0,outros:0};
  (v.despesas||[]).forEach(d=>{porCat[d.cat]=(porCat[d.cat]||0)+num(d.valor)});
  const real=Object.keys(porCat).filter(k=>k!=="arremate").reduce((a,k)=>a+porCat[k],0);
  const orc=(v.orcado||[]).filter(o=>o.on!==false);
  const orcTot=orc.reduce((a,o)=>a+num(o.valor),0),orcPend=orc.filter(o=>!o.feito).reduce((a,o)=>a+num(o.valor),0);
  const temDoc=(v.despesas||[]).some(d=>d.cat==="documentacao")||orc.some(o=>o.cat==="documentacao");
  const docsPrev=temDoc?0:cu.docs.reduce((a,d)=>a+num(d.valor),0);
  const vendido=v.status==="vendido"&&num(v.vendaValor)>0;
  const previsto=vendido?0:orcPend+docsPrev;
  const custo=pagamento+real+previsto;
  const r=(v.avaliacao&&v.avaliacao.result&&v.avaliacao.result.preco_revenda_sugerido)||{};
  const fipe=num(v.fipe);
  const V=num(v.vendaPretendida)||((num(r.min)+num(r.max))/2)||fipe*.85;
  const venda=vendido?num(v.vendaValor):V;
  const lucro=venda&&(lance||vendido)?venda-custo:NaN;
  const roi=custo&&venda&&lance?lucro/custo:NaN;
  const m=cu.margem/100,cont=cu.conting/100;
  const lmax=V?Math.max(0,(V/(1+m)-cu.fixas-extras-(orcTot+docsPrev)*(1+cont))/(1+(cu.comPct+cu.admPct)/100)):0;
  const dias=v.dataLeilao?Math.max(0,Math.round(((v.dataVenda&&vendido?new Date(v.dataVenda):new Date())-new Date(v.dataLeilao))/864e5)):null;
  return {cu,lance,comissao,adm,extras,pagamento,porCat,despesas:real,real,orcTot,orcPend,docsPrev,previsto,custo,venda,V,vendido,lucro,roi,fipe,pctFipe:fipe?custo/fipe:NaN,dias,precoMin:custo*(1+m),margem:m,lmax};
}
function stackHTML(porCat,total,h){
  if(!total)return `<div class="stack" ${h?`style="height:${h}px"`:""}></div>`;
  return `<div class="stack" ${h?`style="height:${h}px"`:""}>`+Object.keys(CATS).map(k=>porCat[k]>0?`<i title="${CATS[k].n}: ${brl(porCat[k])}" style="width:${porCat[k]/total*100}%;background:${CATS[k].c}"></i>`:"").join("")+`</div>`;
}

/* ---------- storage ---------- */
function lsSave(){try{if(painelId)localStorage.setItem("leilaoVeic_"+painelId,JSON.stringify(vehicles))}catch(e){}}
function lsLoad(p){try{return JSON.parse(localStorage.getItem("leilaoVeic_"+p)||"[]")}catch(e){return[]}}
function setSt(m){$("#savest").textContent=m}

/* ---------- Supabase ---------- */
const SB_URL="https://ugzevdmpkcdunealeezi.supabase.co",SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnemV2ZG1wa2NkdW5lYWxlZXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxMjQ4MjYsImV4cCI6MjExMDcwMDgyNn0.KR66TG6SOnTzJpCmG1yCKE3EL8iIJnidem4i9Z3n-5A";
const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let me=null,meuNome="",papel="leitor",canWrite=false,pend={},rtCh=null,painelId=null,paineis=[],joining=false;
const PAPEL={dono:"Dono",editor:"Editor",vistoriador:"Vistoriador",leitor:"Leitor"};
const conviteToken=new URLSearchParams(location.search).get("c");
let srv={},lixo=[];
function loadPend(){try{pend=JSON.parse(localStorage.getItem("leilaoPend3")||"{}")}catch(e){pend={}}}
function savePend(){try{localStorage.setItem("leilaoPend3",JSON.stringify(pend))}catch(e){}}
const pk=(p,id)=>p+"|"+id;
const isObj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const SEM_DIFF=new Set(["fotosVist"]); // fotos têm RPC própria (não sobrescrever envio de outra pessoa)
function diffPaths(a,b,pre="",dep=0,out={}){
  const ka=isObj(a)?a:{},kb=isObj(b)?b:{};
  new Set([...Object.keys(ka),...Object.keys(kb)]).forEach(k=>{
    if(!pre&&SEM_DIFF.has(k))return;
    const x=ka[k],y=kb[k];if(JSON.stringify(x)===JSON.stringify(y))return;
    if(isObj(x)&&isObj(y)&&dep<2)diffPaths(x,y,pre+k+".",dep+1,out);else out[pre+k]=y===undefined?null:y;
  });return out}
function applySet(o,set){const r=JSON.parse(JSON.stringify(o||{}));Object.entries(set||{}).forEach(([p,v])=>{const ks=p.split(".");let c=r;ks.slice(0,-1).forEach(k=>{if(!isObj(c[k]))c[k]={};c=c[k]});const last=ks[ks.length-1];if(v===null)delete c[last];else c[last]=v});return r}
const okMsg=()=>canWrite?"✓ Sincronizado — igual em todos os celulares":"👁 Somente visualização";
function persist(v){
  if(!canWrite){setSt("👁 Somente visualização — peça ao dono para te dar acesso de editor");return}
  const p=painelId;dirty.add(v.id);clearTimeout(saveTimers[v.id]);setSt("Salvando…");
  saveTimers[v.id]=setTimeout(async()=>{lsSave();
    const ch=diffPaths(srv[v.id]||{},JSON.parse(JSON.stringify(v)));
    if(Object.keys(ch).length){const k=pk(p,v.id);pend[k]=pend[k]||{p,id:v.id,set:{}};Object.assign(pend[k].set,ch);savePend()}
    await flush();dirty.delete(v.id)},600);
}
let flushing=false;
async function flush(){
  if(!sb||!me||flushing)return;
  const ks=Object.keys(pend);if(!ks.length){setSt(okMsg());processFQ();return}
  if(!navigator.onLine){setSt(`📴 Sem internet — ${ks.length} alteração(ões) guardada(s), envio automático ao voltar`);return}
  flushing=true;
  try{for(const k of ks){const x=pend[k];let r;
    if(x.lix!==undefined)r=await sb.rpc("lixeira",{p_painel:x.p,p_id:x.id,p_excluir:x.lix});
    else{r=await sb.rpc("salvar_campos",{p_painel:x.p,p_id:x.id,p_set:x.set});if(!r.error&&x.p===painelId)srv[x.id]=JSON.parse(JSON.stringify(r.data))}
    if(r.error){if(/permiss|vistoriador|sem permiss/i.test(r.error.message)){delete pend[k];savePend();toast("⚠ "+r.error.message);continue}throw r.error}
    delete pend[k];savePend()}
    setSt(okMsg());
  }catch(e){setSt("⚠ Não salvou ("+(e.message||"erro")+") — tento de novo em instantes")}
  finally{flushing=false}
  processFQ();
}
window.addEventListener("online",flush);setInterval(flush,20000);
function setRO(){document.body.classList.toggle("ro",!canWrite);document.body.classList.toggle("is-dono",papel==="dono");document.body.classList.toggle("is-vist",papel==="vistoriador")}
async function removeV(id){
  if(!canWrite||papel==="vistoriador")return;
  const v=vehicles.find(x=>x.id===id);vehicles=vehicles.filter(x=>x.id!==id);if(v)lixo.unshift({...v,excluido:true,excluidoEm:new Date().toISOString()});lsSave();
  pend[pk(painelId,id)+"|lix"]={p:painelId,id,lix:true};savePend();flush();render();
}
async function restaurarV(id){
  const v=lixo.find(x=>x.id===id);lixo=lixo.filter(x=>x.id!==id);if(v){delete v.excluido;delete v.excluidoEm;delete v.excluidoPor;vehicles.push(v)}
  pend[pk(painelId,id)+"|lix"]={p:painelId,id,lix:false};savePend();await flush();render();
}
async function initStore(){
  loadPend();
  if(!sb){render();setSt("⚠ Não consegui carregar o servidor — verifique a internet");return}
  sb.auth.onAuthStateChange((ev,ses)=>{
    if(ev==="SIGNED_OUT"){me=null;showAuth()}
    else if((ev==="SIGNED_IN"||ev==="INITIAL_SESSION")&&ses&&!me&&!joining&&!conviteToken)startSession(ses.user);
    else if(ev==="PASSWORD_RECOVERY")showAuth("nova");
  });
  if(conviteToken){showConvite();return}
  const {data:{session}}=await sb.auth.getSession();
  if(!session&&!me)showAuth();
}
async function startSession(u,preferir){
  me=u;hideAuth();
  const {data:ms,error}=await sb.from("membros").select("painel_id,papel,nome,paineis(nome,dono)").eq("user_id",u.id);
  if(error){setSt("⚠ "+error.message);return}
  paineis=(ms||[]).map(m=>({id:m.painel_id,papel:m.papel,meuNome:m.nome,nome:(m.paineis&&m.paineis.nome)||"Painel"}));
  if(!paineis.length){
    $("#auth").classList.add("on");$("#authBox").innerHTML=`<div class="a-logo">🔒</div><h2>Sem acesso</h2><p class="a-sub">${u.is_anonymous?"Você entrou por um convite que não está mais ativo. Peça um link novo a quem te convidou.":"Seu painel ainda está sendo criado. Recarregue a página em alguns segundos."}</p><button class="btn" style="width:100%" onclick="location.reload()">Recarregar</button><button class="a-link" id="sairX">Sair</button>`;
    $("#sairX").onclick=async()=>{await sb.auth.signOut();location.href=location.pathname};return}
  let alvo=preferir;try{alvo=alvo||localStorage.getItem("leilaoPainel")}catch(e){}
  if(!paineis.find(p=>p.id===alvo))alvo=(paineis.find(p=>p.papel==="dono")||paineis[0]).id;
  await trocarPainel(alvo);
}
async function trocarPainel(id){
  const p=paineis.find(x=>x.id===id);if(!p)return;
  painelId=id;papel=p.papel;meuNome=p.meuNome||"";canWrite=papel==="dono"||papel==="editor"||papel==="vistoriador";setRO();
  try{localStorage.setItem("leilaoPainel",id)}catch(e){}
  renderWho();vehicles=lsLoad(id);try{grupos=JSON.parse(localStorage.getItem("leilaoGr_"+id)||"[]")}catch(e){grupos=[]}render();await Promise.all([loadAll(),carregarAux(id)]);
  if(rtCh)sb.removeChannel(rtCh);
  rtCh=sb.channel("veic-"+id).on("postgres_changes",{event:"*",schema:"public",table:"veiculos",filter:"painel_id=eq."+id},pl=>{
    if(painelId!==id)return;
    if(pl.eventType==="DELETE"){const vid=pl.old&&pl.old.id;if(!vid)return;delete srv[vid];vehicles=vehicles.filter(v=>v.id!==vid);lixo=lixo.filter(v=>v.id!==vid)}
    else{const v=pl.new&&pl.new.dados;if(!v)return;srv[v.id]=JSON.parse(JSON.stringify(v));
      if(editing&&editing.id===v.id){if(JSON.stringify(editing.fotosVist||[])!==JSON.stringify(v.fotosVist||[])){editing.fotosVist=v.fotosVist||[];renderVF&&renderVF()}return}
      if(dirty.has(v.id))return;
      const rows=[...vehicles,...lixo].filter(x=>x.id!==v.id).map(x=>srv[x.id]||x);rows.push(v);montarLista(rows)}
    lsSave();if(!editing&&tab!=="avaliar"&&tab!=="config")render();
  }).on("postgres_changes",{event:"*",schema:"public",table:"grupos",filter:"painel_id=eq."+id},pl=>{
    if(painelId!==id)return;if(pl.eventType==="DELETE")grupos=grupos.filter(g=>g.id!==(pl.old&&pl.old.id));
    else{const g=pl.new;const i=grupos.findIndex(x=>x.id===g.id);if(i>=0)grupos[i]={...grupos[i],...g,lotes:Array.isArray(g.lotes)&&g.lotes.length?g.lotes:grupos[i].lotes,_pendente:undefined};else grupos.push(g)}
    if(!editing&&tab!=="avaliar"&&tab!=="config")render();
  }).subscribe();
  flush();
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&me&&painelId){loadAll();flush()}});
function montarLista(rows){
  const pp=Object.values(pend).filter(x=>x.p===painelId);
  // cópia profunda: a referência do servidor NUNCA pode ser o mesmo objeto da tela (senão nenhuma alteração gera diferença para salvar)
  const cp=o=>JSON.parse(JSON.stringify(o));
  srv={};rows.forEach(r=>{if(r)srv[r.id]=cp(r)});rows=rows.map(r=>r&&cp(r));
  const lixP=new Map(pp.filter(x=>x.lix!==undefined).map(x=>[x.id,x.lix]));
  const all=rows.filter(Boolean).map(r=>{const x=pp.find(x=>x.id===r.id&&x.set);return x?applySet(r,x.set):r});
  pp.forEach(x=>{if(x.set&&!all.find(m=>m.id===x.id))all.push(applySet({id:x.id},x.set))});
  const exc=v=>lixP.has(v.id)?lixP.get(v.id):!!v.excluido;
  vehicles=all.filter(v=>!exc(v));lixo=all.filter(exc);
}
async function carregarAux(id){
  const [g,p,m]=await Promise.all([sb.from("grupos").select("*").eq("painel_id",id).order("data_leilao",{ascending:false}),
    sb.from("precos").select("item,nome,categoria,valor,origem,familia,atualizado_em").eq("painel_id",id).order("atualizado_em",{ascending:false}).limit(3000),
    sb.from("membros").select("user_id,nome,papel").eq("painel_id",id)]);
  if(id!==painelId)return;
  if(!g.error){grupos=g.data||[];try{localStorage.setItem("leilaoGr_"+id,JSON.stringify(grupos))}catch(e){}}
  if(!p.error)precos=p.data||[];if(!m.error)membros=m.data||[];
  if(!editing&&tab!=="avaliar"&&tab!=="config")render();
}
async function loadAll(){
  const p=painelId;const {data,error}=await sb.from("veiculos").select("id,dados").eq("painel_id",p).order("id");
  if(p!==painelId)return;
  if(error){setSt("📴 Sem conexão — mostrando a última cópia deste celular");return}
  montarLista(data.map(r=>r.dados));lsSave();setSt(okMsg());if(!editing&&tab!=="avaliar"&&tab!=="config")render();
}
function renderWho(){
  $("#who").innerHTML=`${paineis.length>1?`<select id="pSel" aria-label="Painel">${paineis.map(p=>`<option value="${p.id}" ${p.id===painelId?"selected":""}>${esc(p.nome)}</option>`).join("")}</select>`:`<span class="pnome">${esc((paineis[0]||{}).nome||"")}</span>`}
   <span>👤 ${esc(meuNome||me.email||"")}</span><b class="pap pap-${papel}">${PAPEL[papel]}</b><button id="sair">Sair</button>`;
  const ps=$("#pSel");if(ps)ps.onchange=()=>{tab="painel";trocarPainel(ps.value)};
  $("#sair").onclick=async()=>{if(me.is_anonymous&&!confirmSair())return;await sb.auth.signOut();location.href=location.pathname};
}
let sairOk=false;function confirmSair(){if(sairOk)return true;sairOk=true;toast("Você entrou por convite: para voltar, vai precisar do link de novo. Toque em Sair outra vez para confirmar.");setTimeout(()=>sairOk=false,5000);return false}

/* ---------- convite (entrar só com o nome) ---------- */
async function showConvite(){
  $("#auth").classList.add("on");const box=$("#authBox");box.innerHTML=`<div class="a-logo">🔨</div><h2>Carregando convite…</h2>`;
  const {data,error}=await sb.rpc("info_convite",{t:conviteToken});
  const info=data&&data[0];
  if(error||!info){box.innerHTML=`<div class="a-logo">⚠️</div><h2>Convite inválido</h2><p class="a-sub">Este link foi desativado ou está incompleto. Peça um link novo a quem te convidou.</p><button class="btn" style="width:100%" id="cvIr">Entrar com e-mail</button>`;$("#cvIr").onclick=()=>{history.replaceState(null,"",location.pathname);showAuth("entrar")};return}
  const {data:{session}}=await sb.auth.getSession();
  box.innerHTML=`<div class="a-logo">🤝</div><h2>Você foi convidado</h2>
   <p class="a-sub"><b>${esc(info.dono||"Alguém")}</b> te deu acesso ao <b>${esc(info.painel)}</b> como <b>${PAPEL[info.papel]}</b>${info.papel==="editor"?" — você poderá ver e alterar motos e vistorias":info.papel==="vistoriador"?" — você vai preencher as vistorias (checklist, fotos e anotações)":" — você poderá ver as motos e vistorias"}.</p>
   <form id="cvForm"><label>Seu nome<input id="cvNome" required maxlength="60" autocomplete="name" placeholder="Como você quer aparecer no histórico" value="${esc(session&&session.user.user_metadata&&session.user.user_metadata.nome||"")}"></label>
   <button class="btn" style="width:100%;margin-top:14px">Entrar no painel</button></form>
   <p class="mini" style="text-align:center">Sem senha nem e-mail. Seu acesso fica salvo neste aparelho.</p><div id="cvMsg"></div>`;
  $("#cvForm").onsubmit=async e=>{e.preventDefault();const bt=e.target.querySelector("button");bt.disabled=true;bt.textContent="Entrando…";
    const nome=$("#cvNome").value.trim();
    try{joining=true;
      let {data:{session:s}}=await sb.auth.getSession();
      if(!s){const r=await sb.auth.signInAnonymously({options:{data:{nome}}});if(r.error)throw r.error;s=r.data.session}
      const {data:pid,error:er}=await sb.rpc("aceitar_convite",{t:conviteToken,nome_in:nome});if(er)throw er;
      history.replaceState(null,"",location.pathname);joining=false;await startSession(s.user,pid);toast("Bem-vindo, "+nome+"!");
    }catch(er){joining=false;bt.disabled=false;bt.textContent="Entrar no painel";$("#cvMsg").innerHTML=`<div class="a-msg err">${esc(er.message||"Erro ao entrar")}</div>`}
  };
}

/* ---------- login / cadastro ---------- */
let authMode="entrar",lastEmail="";
function showAuth(m){if(m)authMode=m;const el=$("#auth");el.classList.add("on");renderAuth()}
function hideAuth(){$("#auth").classList.remove("on")}
function renderAuth(msg,err){
  const m=authMode;
  $("#authBox").innerHTML=`<div class="a-logo">🔨</div><h2>Controle de Leilão</h2><p class="a-sub">Motos, vistorias e lances — iguais em todos os celulares.</p>
   ${m==="nova"?"":`<div class="a-tabs"><button data-am="entrar" class="${m==="entrar"?"on":""}">Entrar</button><button data-am="criar" class="${m==="criar"?"on":""}">Criar conta</button></div>`}
   <form id="aForm">
    ${m==="criar"?`<label>Seu nome<input id="aNome" autocomplete="name" required></label>`:""}
    ${m!=="nova"?`<label>E-mail<input id="aEmail" type="email" autocomplete="email" required value="${esc(lastEmail)}"></label>`:""}
    ${m!=="esqueci"?`<label>${m==="nova"?"Nova senha":"Senha"}<input id="aSenha" type="password" minlength="6" autocomplete="${m==="entrar"?"current-password":"new-password"}" required></label>`:""}
    <button class="btn" style="width:100%;margin-top:14px">${{entrar:"Entrar",criar:"Criar minha conta",esqueci:"Enviar link de recuperação",nova:"Salvar nova senha"}[m]}</button>
   </form>
   ${m==="entrar"?`<button class="a-link" data-am="esqueci">Esqueci minha senha</button>`:""}${m==="esqueci"?`<button class="a-link" data-am="entrar">← Voltar</button>`:""}
   ${msg?`<div class="a-msg ${err?"err":""}">${msg}</div>`:""}`;
  $("#authBox").querySelectorAll("[data-am]").forEach(b=>b.onclick=()=>{authMode=b.dataset.am;renderAuth()});
  $("#aForm").onsubmit=async e=>{e.preventDefault();const bt=e.target.querySelector("button");bt.disabled=true;bt.textContent="Aguarde…";
    const em=$("#aEmail")&&$("#aEmail").value.trim();if(em)lastEmail=em;const pw=$("#aSenha")&&$("#aSenha").value,red=location.href.split("#")[0];
    try{
      if(m==="entrar"){const {error}=await sb.auth.signInWithPassword({email:em,password:pw});if(error)throw error}
      else if(m==="criar"){const {data,error}=await sb.auth.signUp({email:em,password:pw,options:{data:{nome:$("#aNome").value.trim()},emailRedirectTo:red}});if(error)throw error;
        if(!data.session){authMode="entrar";renderAuth(`📩 Enviamos um e-mail de confirmação para <b>${esc(em)}</b>. Abra o link (veja também o spam) e depois entre aqui.`);return}}
      else if(m==="esqueci"){const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:red});if(error)throw error;renderAuth("📩 Link enviado. Abra no celular e crie uma nova senha.");return}
      else if(m==="nova"){const {error}=await sb.auth.updateUser({password:pw});if(error)throw error;authMode="entrar";const {data:{session}}=await sb.auth.getSession();if(session){hideAuth();if(!me)startSession(session.user)}return}
    }catch(er){const t=(er.message||"")+"";renderAuth(/Invalid login/i.test(t)?"E-mail ou senha incorretos.":/not confirmed/i.test(t)?"Confirme seu e-mail primeiro (veja a caixa de entrada e o spam).":/already registered/i.test(t)?"Este e-mail já tem conta. Use Entrar.":/rate limit/i.test(t)?"Muitas tentativas. Aguarde alguns minutos.":/at least 6/i.test(t)?"A senha precisa ter pelo menos 6 caracteres.":"Erro: "+esc(t),true)}
  };
}
