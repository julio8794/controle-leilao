/* ---------- Config → 💰 Custos padrão (teto % FIPE, UF de registro, serviços fixos) ---------- */
const UFS="AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
function cfgCustosHTML(){
  if(!["dono","editor"].includes(papel))return "";const ed=papel==="dono";const S=PCFG.servicos||{};
  const campo=(id,l,val,extra="")=>`<label>${l}<input id="${id}" inputmode="decimal" value="${esc(fmtIn(val))}" ${ed?"":"disabled"} ${extra}></label>`;
  return `<div class="sec-t" id="cfgCustos">💰 Custos padrão</div>
  <div class="card"><div class="mini" style="margin:0 0 10px">Valem para todas as motos e entram no custo e no lance máximo sugerido. Em cada moto dá para ligar ou desligar um serviço (aba 💰 Números).</div>
   <div class="f2">${campo("ccPct","Teto do investimento (% da FIPE)",PCFG.pctFipe,'placeholder="70"')}
    <label>UF onde você registra as motos<select id="ccUf" ${ed?"":"disabled"}>${UFS.map(u=>`<option ${String(PCFG.ufBase).toUpperCase()===u?"selected":""}>${u}</option>`).join("")}</select></label></div>
   <div class="sec-t" style="margin:14px 0 6px">Serviços fixos (R$)</div>
   <div class="f2">${SERVICOS.map(([k,n])=>campo("ccS-"+k,n,S[k],'placeholder="0,00"')).join("")}</div>
   <div class="mini" style="margin-top:8px">Transferência e vistoria entram em todas. Transferência de estado entra quando a UF do veículo é diferente da sua. Desalienação entra quando o edital, um documento ou a consulta indicar gravame.</div>
   ${ed?`<div class="toolbar" style="margin:10px 0 0"><button class="btn sm" id="ccOk">Salvar custos padrão</button></div>`:`<div class="mini">Só o dono do painel altera.</div>`}</div>`;
}
const _configHTMLCC=configHTML;
configHTML=async function(){const h=await _configHTMLCC();const bloco=cfgCustosHTML();if(!bloco)return h;
  const i=h.indexOf('<div class="sec-t" id="cvCfg">');const j=h.indexOf('<div class="sec-t">👥 Pessoas');const k=i>=0?i:j;return k>=0?h.slice(0,k)+bloco+h.slice(k):h+bloco};
document.addEventListener("click",async e=>{const b=e.target.closest("#ccOk");if(!b)return;
  const custos={pctFipe:num($("#ccPct").value)||70,ufBase:$("#ccUf").value,servicos:{}};SERVICOS.forEach(([k])=>{const x=$("#ccS-"+k);custos.servicos[k]=x&&x.value.trim()?String(num(x.value)):""});
  if(custos.pctFipe<20||custos.pctFipe>120)return toast("Use um teto entre 20% e 120% da FIPE");
  b.disabled=true;let ok=false;
  try{const r=await sb.from("paineis").select("config").eq("id",painelId).maybeSingle();if(!r.error){const cfg={...((r.data&&r.data.config)||{}),custos};const u=await sb.from("paineis").update({config:cfg}).eq("id",painelId);ok=!u.error;if(ok){aplicarPCFG(cfg);try{localStorage.setItem("leilaoCfg_"+painelId,JSON.stringify(cfg))}catch(err){}}}}catch(err){}
  b.disabled=false;toast(ok?"Custos padrão salvos ✓ — lances máximos recalculados":"Não consegui salvar. Tente de novo.")});
