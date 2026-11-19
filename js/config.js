/* ---------- configurações: convite, pessoas, histórico ---------- */
const LBL={modelo:"Modelo",ano:"Ano",placa:"Placa",cor:"Cor",status:"Status",lance:"Lance",lanceMin:"Lance mínimo",fipe:"FIPE",lote:"Lote",leiloeiro:"Leiloeiro",link:"Link do lote",grupo:"Cidade/grupo",dataLeilao:"Data do leilão",dataVistoria:"Data da vistoria",dataVenda:"Data da venda",comissaoPct:"Comissão %",taxaAdm:"Taxa administrativa",taxaPatio:"Pátio/diárias",outrosArremate:"Outras taxas",despesas:"Despesas",vendaPretendida:"Venda alvo",vendaValor:"Valor vendido",margemAlvo:"Margem desejada",obs:"Observações",fotosVist:"Fotos da vistoria",fotosRef:"Fotos de referência",fipeHist:"Histórico FIPE",avaliacao:"Avaliação",localPatio:"Local","vistoria.nota":"Nota da vistoria","vistoria.limite":"Lance limite","vistoria.obs":"Anotações da vistoria"};
const CKV={ok:"✓ OK",at:"⚠ Atenção",pb:"✕ Problema"};
function fmtV(campo,v){if(v===null||v===undefined||v==="")return "—";if(campo.startsWith("vistoria.checks."))return CKV[v]||"—";if(campo==="status")return STATUS[v]||v;
  if(Array.isArray(v))return campo==="fotosVist"?`${v.length} foto(s)`:`${v.length} item(s)`;if(typeof v==="object")return "…";
  if(/^(lance|lanceMin|fipe|vendaPretendida|vendaValor|taxaAdm|taxaPatio|outrosArremate|vistoria\.limite)$/.test(campo)&&num(v))return brl(num(v));
  const t=String(v);return t.length>70?t.slice(0,70)+"…":t}
let logLim=60;
async function configHTML(){
  CHECKS.forEach(([k,l])=>LBL["vistoria.checks."+k]="Vistoria · "+l);
  const pa=paineis.find(p=>p.id===painelId)||{};
  const [ms,cv,lg]=await Promise.all([
    sb.from("membros").select("user_id,nome,papel,via_convite,criado_em").eq("painel_id",painelId).order("criado_em"),
    papel==="dono"?sb.from("convites").select("token,papel,ativo,criado_em").eq("painel_id",painelId).eq("ativo",true).order("criado_em",{ascending:false}):Promise.resolve({data:[]}),
    sb.from("logs").select("id,nome,veiculo,veiculo_id,acao,mudancas,criado_em").eq("painel_id",painelId).order("criado_em",{ascending:false}).limit(logLim)]);
  const bk=papel==="dono"?await sb.from("backups").select("id,criado_em,total").eq("painel_id",painelId).order("criado_em",{ascending:false}).limit(30):{data:[]};
  let uso=0;if(papel==="dono"){const u=await sb.rpc("uso_fotos");uso=u.data||0}
  const base=location.origin+location.pathname;
  const dia=d=>new Date(d).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}),hora=d=>new Date(d).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  let ultDia="";
  return `<div class="cfg">
  <div class="sec-t">⚙️ Painel</div>
  <div class="card">${papel==="dono"?`<label>Nome do painel<input id="pNome" value="${esc(pa.nome||"")}"></label><button class="btn ghost sm" id="pNomeOk" style="margin-top:8px">Salvar nome</button>`:`<b>${esc(pa.nome||"")}</b><div class="mini">Você é ${PAPEL[papel]} neste painel.</div>`}</div>
  ${papel==="dono"?`<div class="sec-t">🔗 Link de convite</div>
  <div class="card"><div class="mini" style="margin:0 0 10px">Quem abrir o link entra no seu painel <b>só digitando o nome</b>, sem e-mail nem senha. Mande pelo WhatsApp para quem vai trabalhar com você.</div>
   ${(cv.data||[]).map(c=>`<div class="cv"><div class="cv-l"><span class="pap pap-${c.papel}">${PAPEL[c.papel]}</span><code>${esc(base)}?c=${esc(c.token)}</code></div>
     <div class="cv-b"><button class="btn sm" data-cvcp="${esc(base)}?c=${esc(c.token)}">📋 Copiar</button><a class="btn ghost sm" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("Acesse o painel de leilão: "+base+"?c="+c.token)}">WhatsApp</a><button class="btn danger sm" data-cvoff="${esc(c.token)}">Desativar</button></div></div>`).join("")||`<div class="mini">Nenhum link ativo.</div>`}
   <div class="toolbar" style="margin:10px 0 0"><select id="cvPapel"><option value="editor">Pode editar tudo</option><option value="vistoriador">Só vistoria (sem valores)</option><option value="leitor">Só visualizar</option></select><button class="btn" id="cvNovo">＋ Gerar link</button></div>
   <div class="mini">Desativar um link impede novas entradas por ele. Quem já entrou continua até você remover em “Pessoas”.</div></div>`:""}
  <div class="sec-t">👥 Pessoas com acesso · ${(ms.data||[]).length}</div>
  <div class="card">${(ms.data||[]).map(m=>`<div class="eq"><div><b>${esc(m.nome||"—")}${m.user_id===me.id?" (você)":""}</b><small>${m.via_convite?"entrou por convite":"conta com e-mail"} · desde ${new Date(m.criado_em).toLocaleDateString("pt-BR")}</small></div>
    ${papel==="dono"&&m.papel!=="dono"?`<div style="display:flex;gap:6px"><select data-mpap="${m.user_id}">${["editor","vistoriador","leitor"].map(r=>`<option value="${r}" ${m.papel===r?"selected":""}>${PAPEL[r]}</option>`).join("")}</select><button class="btn danger sm" data-mrem="${m.user_id}" data-mnome="${esc(m.nome||"")}">Remover</button></div>`:`<span class="pap pap-${m.papel}">${PAPEL[m.papel]}</span>`}</div>`).join("")}</div>
  <div class="sec-t">🕘 Histórico de alterações</div>
  <div class="card log">${(lg.data||[]).map(l=>{const d=dia(l.criado_em);const sep=d!==ultDia?`<div class="lg-d">${d}</div>`:"";ultDia=d;
    const ch=Array.isArray(l.mudancas)?l.mudancas:[];
    return sep+`<div class="lg"><div class="lg-h"><span class="lg-t">${hora(l.criado_em)}</span><b>${esc(l.nome||"Alguém")}</b> <span class="lg-a lg-${esc((l.acao||"").split(" ")[0])}">${esc(l.acao||"")}</span> ${l.veiculo?`<span class="lg-v">${esc(l.veiculo)}${l.veiculo_id&&/^alag-/.test(l.veiculo_id)?` <small>${esc(l.veiculo_id.replace(/^alag-/,"lote "))}</small>`:""}</span>`:""}</div>
     ${ch.length?`<ul>${ch.slice(0,12).map(c=>`<li><span>${esc(LBL[c.campo]||c.campo)}</span>: ${esc(fmtV(c.campo,c.de))} → <b>${esc(fmtV(c.campo,c.para))}</b></li>`).join("")}${ch.length>12?`<li>+ ${ch.length-12} outras</li>`:""}</ul>`:""}</div>`}).join("")||`<div class="mini">Nenhuma alteração registrada ainda.</div>`}
   ${(lg.data||[]).length>=logLim?`<button class="btn ghost sm" id="lgMais" style="margin-top:10px">Ver mais antigos</button>`:""}</div>
  ${canWrite&&papel!=="vistoriador"?`<div class="sec-t">🗑️ Lixeira · ${lixo.length}</div>
  <div class="card">${lixo.length?lixo.map(v=>`<div class="eq"><div><b>${esc(v.modelo||"Sem nome")}</b><small>${v.lote?"Lote "+esc(v.lote)+" · ":""}excluída ${v.excluidoEm?new Date(v.excluidoEm).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):""}</small></div>
    <div style="display:flex;gap:6px"><button class="btn ghost sm" data-rest="${esc(v.id)}">↩ Restaurar</button>${papel==="dono"?`<button class="btn danger sm" data-apaga="${esc(v.id)}">Apagar de vez</button>`:""}</div></div>`).join(""):`<div class="mini" style="margin:0">Vazia. Motos excluídas ficam aqui e podem ser restauradas.</div>`}</div>`:""}
  ${papel==="dono"?`<div class="sec-t">💾 Backups automáticos</div>
  <div class="card"><div class="mini" style="margin:0 0 8px">Uma cópia de todo o painel é feita todo dia às 3h e guardada por 30 dias.</div>
   ${(bk.data||[]).map(b=>`<div class="eq"><div><b>${new Date(b.criado_em).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</b><small>${b.total} veículo(s)</small></div><button class="btn ghost sm" data-bk="${b.id}">⬇ Baixar</button></div>`).join("")||`<div class="mini">Nenhum backup ainda.</div>`}
   <div class="toolbar" style="margin:10px 0 0"><button class="btn ghost sm" id="expJson">⬇ Exportar agora (JSON)</button></div>
   <div class="sec-t" style="margin:14px 0 6px">📦 Espaço das fotos</div><div class="vbar2" style="height:10px"><i style="width:${Math.min(100,uso/1073741824*100)}%"></i></div><div class="mini">${(uso/1048576).toFixed(0)} MB de 1.024 MB do plano gratuito</div></div>`:""}
  ${papel!=="dono"?`<div class="sec-t">Sair deste painel</div><div class="card"><button class="btn danger sm" id="sairPainel">Sair do painel</button></div>`:""}
  </div>`;
}
async function renderConfig(){
  $("#main").innerHTML='<div class="mini">Carregando…</div>';const h=await configHTML();if(tab!=="config")return;$("#main").innerHTML=h;
  const m=$("#main");
  const ok=$("#pNomeOk");if(ok)ok.onclick=async()=>{const n=$("#pNome").value.trim();if(!n)return;const {error}=await sb.from("paineis").update({nome:n}).eq("id",painelId);if(error)return toast("Erro: "+error.message);paineis.find(p=>p.id===painelId).nome=n;renderWho();toast("Nome salvo ✓")};
  const nv=$("#cvNovo");if(nv)nv.onclick=async()=>{const {error}=await sb.from("convites").insert({painel_id:painelId,papel:$("#cvPapel").value,criado_por:me.id});if(error)return toast("Erro: "+error.message);renderConfig()};
  m.querySelectorAll("[data-cvcp]").forEach(b=>b.onclick=async()=>{const u=b.dataset.cvcp;try{if(navigator.share){await navigator.share({title:"Painel de leilão",text:"Acesse o painel de leilão:",url:u});return}await navigator.clipboard.writeText(u);toast("Link copiado ✓")}catch(e){try{await navigator.clipboard.writeText(u);toast("Link copiado ✓")}catch(_){prompt("Copie o link:",u)}}});
  m.querySelectorAll("[data-cvoff]").forEach(b=>b.onclick=async()=>{const {error}=await sb.from("convites").update({ativo:false}).eq("token",b.dataset.cvoff);toast(error?"Erro: "+error.message:"Link desativado");renderConfig()});
  m.querySelectorAll("[data-mpap]").forEach(sel=>sel.onchange=async()=>{const {error}=await sb.from("membros").update({papel:sel.value}).eq("painel_id",painelId).eq("user_id",sel.dataset.mpap);toast(error?"Erro: "+error.message:"Permissão atualizada ✓")});
  m.querySelectorAll("[data-mrem]").forEach(b=>b.onclick=async()=>{if(b.dataset.c!=="1"){b.dataset.c="1";b.textContent="Confirmar?";setTimeout(()=>{b.dataset.c="";b.textContent="Remover"},4000);return}
    const {error}=await sb.from("membros").delete().eq("painel_id",painelId).eq("user_id",b.dataset.mrem);toast(error?"Erro: "+error.message:"Acesso removido");renderConfig()});
  m.querySelectorAll("[data-rest]").forEach(b=>b.onclick=async()=>{await restaurarV(b.dataset.rest);toast("Restaurada ✓");renderConfig()});
  m.querySelectorAll("[data-apaga]").forEach(b=>b.onclick=async()=>{if(b.dataset.c!=="1"){b.dataset.c="1";b.textContent="Confirmar? Não tem volta";return}
    const {error}=await sb.rpc("apagar_definitivo",{p_painel:painelId,p_id:b.dataset.apaga});if(error)return toast("Erro: "+error.message);lixo=lixo.filter(v=>v.id!==b.dataset.apaga);renderConfig()});
  m.querySelectorAll("[data-bk]").forEach(b=>b.onclick=async()=>{const {data,error}=await sb.from("backups").select("criado_em,dados").eq("id",b.dataset.bk).single();if(error)return toast("Erro: "+error.message);baixar(`backup-${data.criado_em.slice(0,10)}.json`,JSON.stringify(data.dados,null,1),"application/json")});
  const ej=$("#expJson");if(ej)ej.onclick=()=>baixar(`painel-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify([...vehicles,...lixo],null,1),"application/json");
  const lm=$("#lgMais");if(lm)lm.onclick=()=>{logLim+=100;renderConfig()};
  const sp=$("#sairPainel");if(sp)sp.onclick=async()=>{if(sp.dataset.c!=="1"){sp.dataset.c="1";sp.textContent="Toque de novo para confirmar";return}
    await sb.from("membros").delete().eq("painel_id",painelId).eq("user_id",me.id);try{localStorage.removeItem("leilaoPainel")}catch(e){}location.reload()};
}

function baixar(nome,conteudo,tipo){const b=conteudo instanceof Blob?conteudo:new Blob([conteudo],{type:tipo||"application/octet-stream"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
