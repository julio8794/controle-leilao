/* ---------- custos da IA ---------- */
const AGENTE_NOME={ler_edital:"📄 Leitor de edital (custas)",importar_lote:"🌐 Importador de lote",analisar_fotos:"📷 Vistoriador por fotos",mapear_planilha:"📊 Mapeador de planilha",escolher_fipe:"💲 Desempate FIPE",lotes_edital:"📋 Leitor do Anexo I",paginas_edital:"📄 Texto do edital",transcrever:"🎤 Transcrição de áudio",extrair_vistoria:"🎤 Vistoria por áudio",consulta_veicular:"🔎 Consultas veiculares (externa)"};
let cotacao=null,custoSessao=0;
async function usdBrl(){
  if(cotacao)return cotacao;try{const c=JSON.parse(localStorage.getItem("leilaoUSD")||"null");if(c&&Date.now()-c.t<12*36e5)return cotacao=c}catch(e){}
  try{const r=await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");const d=await r.json();const v=num(d.USDBRL.bid);if(v>0){cotacao={v,t:Date.now(),fonte:"AwesomeAPI "+new Date(+d.USDBRL.timestamp*1000).toLocaleDateString("pt-BR")};localStorage.setItem("leilaoUSD",JSON.stringify(cotacao));return cotacao}}catch(e){}
  return cotacao={v:5.40,t:Date.now(),fonte:"valor padrão (sem cotação online)"};
}
const limiteMes=()=>{try{return num(localStorage.getItem("leilaoIALim_"+painelId))}catch(e){return 0}};
const usd=v=>"US$ "+(v||0).toLocaleString("pt-BR",{minimumFractionDigits:v<1?4:2,maximumFractionDigits:v<1?4:2});
/* registra o custo de cada chamada na sessão e avisa quando passar do limite do mês */
const _chamarIA0=chamarIA;
chamarIA=async function(acao,dados){
  const r=await _chamarIA0(acao,dados);const c=r&&r._uso&&r._uso.custo_usd;
  if(c>0){custoSessao+=c;const lim=limiteMes();if(lim){const k=await usdBrl();const mes=await gastoMes();if(mes*k.v>=lim)toast(`⚠ IA: gasto do mês (R$ ${(mes*k.v).toFixed(2)}) passou do seu limite de R$ ${lim.toFixed(2)}`)}}
  return r;
};
async function gastoMes(){const ini=new Date();ini.setDate(1);ini.setHours(0,0,0,0);const {data}=await sb.from("ia_uso").select("custo_usd").eq("painel_id",painelId).gte("criado_em",ini.toISOString()).limit(5000);return (data||[]).reduce((a,x)=>a+num(x.custo_usd),0)}
async function custosHTML(){
  const desde=new Date(Date.now()-90*864e5).toISOString();
  const {data,error}=await sb.from("ia_uso").select("acao,modelo,tokens_in,tokens_cache,tokens_out,custo_usd,custo_brl,origem,ref,ok,erro,ms,criado_em").eq("painel_id",painelId).gte("criado_em",desde).order("criado_em",{ascending:false}).limit(5000);
  if(error)return `<div class="mini neg">Não consegui ler os custos: ${esc(error.message)}</div>`;
  const k=await usdBrl();const R=v=>brl((v||0)*k.v);const rows=data||[];
  rows.forEach(x=>{x.custo_usd=num(x.custo_usd)+num(x.custo_brl)/k.v;if(x.origem==="consulta")x.origem="ia"});
  const agora=new Date(),hoje=new Date(agora);hoje.setHours(0,0,0,0);const mesIni=new Date(agora.getFullYear(),agora.getMonth(),1);const sem=new Date(Date.now()-7*864e5);
  const soma=f=>rows.filter(f).reduce((a,x)=>a+num(x.custo_usd),0);
  const per=[["Hoje",soma(x=>new Date(x.criado_em)>=hoje)],["7 dias",soma(x=>new Date(x.criado_em)>=sem)],["Este mês",soma(x=>new Date(x.criado_em)>=mesIni)],["90 dias",soma(()=>true)]];
  const ag={};rows.forEach(x=>{const a=ag[x.acao]=ag[x.acao]||{pagas:0,gratis:0,erros:0,tin:0,tout:0,tc:0,usd:0,ms:0,modelos:new Set()};
    if(!x.ok)a.erros++;else if(x.origem==="ia"){a.pagas++;a.tin+=x.tokens_in||0;a.tout+=x.tokens_out||0;a.tc+=x.tokens_cache||0;a.ms+=x.ms||0;if(x.modelo)a.modelos.add(String(x.modelo).replace(/-\d{4}-\d{2}-\d{2}$/,""))}else a.gratis++;a.usd+=num(x.custo_usd)});
  const porLote={};rows.filter(x=>x.ref&&num(x.custo_usd)>0).forEach(x=>{porLote[x.ref]=(porLote[x.ref]||0)+num(x.custo_usd)});
  const nomeRef=u=>{const v=vehicles.find(v=>v.link&&urlEdital(v.link)===urlEdital(u));if(v)return (v.lote?v.lote+" · ":"")+(v.modelo||"");const g=grupos.find(g=>urlEdital(g.edital_url)===urlEdital(u)||((g.custas||{}).editalAliases||[]).some(a=>urlEdital(a)===urlEdital(u)));if(g)return "Edital · "+g.nome;return String(u).split("/").pop().slice(0,40)};
  const topLote=Object.entries(porLote).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const motosAval=new Set(rows.filter(x=>x.acao==="analisar_fotos"&&x.ok&&x.ref).map(x=>x.ref)).size;
  const lim=limiteMes(),mes=per[2][1]*k.v;const totG=rows.filter(x=>x.ok&&x.origem!=="ia").length;
  return `<div class="sec-t">💸 Custos da IA <span class="mini" style="margin:0;text-transform:none">· US$ 1 = ${brl(k.v)} (${esc(k.fonte)})</span></div>
  <div class="grid kpis">${per.map(([n,v])=>`<div class="card kpi"><span>${n}</span><b class="num">${R(v)}</b><small>${usd(v)}</small></div>`).join("")}</div>
  <div class="card" style="margin-top:10px"><div class="f2"><label>Limite mensal de gasto com IA (R$)<input id="iaLim" inputmode="decimal" value="${lim?fmtIn(lim):""}" placeholder="sem limite"></label>
   <div style="align-self:end">${lim?`<div class="vbar2"><i style="width:${Math.min(100,mes/lim*100)}%;${mes>=lim?"background:var(--bad)":""}"></i></div><div class="mini">${R(per[2][1])} de ${brl(lim)} no mês (${Math.round(mes/lim*100)}%)</div>`:`<div class="mini">Defina um limite para receber aviso quando o mês passar dele.</div>`}</div></div></div>
  <div class="sec-t">Por agente</div>
  <div class="card cmpw"><table class="tcmp big"><tr><th>Agente</th><th>Modelo</th><th>Pagas</th><th>Grátis</th><th>Erros</th><th>Tokens (entrada / saída)</th><th>Custo</th><th>Médio</th></tr>
   ${Object.entries(ag).sort((a,b)=>b[1].usd-a[1].usd).map(([n,a])=>`<tr><td><b>${esc(AGENTE_NOME[n]||n)}</b></td><td><small>${esc([...a.modelos].join(", ")||(a.gratis?"código / cache":"—"))}</small></td><td>${a.pagas}</td><td>${a.gratis}</td><td class="${a.erros?"neg":""}">${a.erros}</td>
     <td><small>${a.tin.toLocaleString("pt-BR")}${a.tc?` (${Math.round(a.tc/Math.max(1,a.tin)*100)}% cache)`:""} / ${a.tout.toLocaleString("pt-BR")}</small></td><td><b>${R(a.usd)}</b><small>${usd(a.usd)}</small></td><td>${a.pagas?R(a.usd/a.pagas):"—"}</td></tr>`).join("")||`<tr><td colspan="8">Nenhum uso ainda.</td></tr>`}</table></div>
  <div class="mini">"Grátis" = leituras feitas por código (Anexo I, registro do lote no site) ou vindas do cache, sem chamar a IA. ${totG} de ${rows.filter(x=>x.ok).length} chamadas saíram de graça.</div>
  ${topLote.length?`<div class="sec-t">Custo por lote / edital</div><div class="card">${topLote.map(([u,v])=>`<div class="rank"><span class="nm">${esc(nomeRef(u))}</span><b class="num">${R(v)}</b></div>`).join("")}${motosAval?`<div class="mini">Média por lote com fotos analisadas: ${R(Object.entries(porLote).filter(([u])=>rows.some(x=>x.acao==="analisar_fotos"&&x.ref===u)).reduce((a,[,v])=>a+v,0)/motosAval)}</div>`:""}</div>`:""}
  <details class="card" style="margin-top:10px"><summary><b>Últimas chamadas</b></summary>${rows.slice(0,25).map(x=>`<div class="rank"><span class="nm"><small>${new Date(x.criado_em).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</small> ${esc(AGENTE_NOME[x.acao]||x.acao)} ${!x.ok?`<small class="neg">erro: ${esc(String(x.erro||"").slice(0,60))}</small>`:x.origem!=="ia"?`<small>${esc(x.origem)}</small>`:""}</span><span class="mini" style="margin:0">${x.ms?(x.ms/1000).toFixed(1)+"s":""}</span><b class="num">${num(x.custo_usd)?R(num(x.custo_usd)):"grátis"}</b></div>`).join("")}</details>`;
}
const _renderConfig0=renderConfig;
renderConfig=async function(){
  await _renderConfig0();if(tab!=="config"||!canWrite)return;
  const box=document.createElement("div");box.id="iaCustos";box.innerHTML='<div class="mini">Carregando custos da IA…</div>';$("#main").prepend(box);
  box.innerHTML=await custosHTML();
  const li=$("#iaLim");if(li)li.onchange=()=>{try{localStorage.setItem("leilaoIALim_"+painelId,String(num(li.value)))}catch(e){}renderConfig()};
};
