/* ---------- 🔎 consultas veiculares externas (só dono; senha a cada consulta) ---------- */
const CV_PRODUTOS=[["renajud-restricoes","Restrições judiciais (Renajud)","placa",0.50],["sng-gravames","Gravame / alienação (SNG)","placa",0.50],["ocorrencias-senatran","Roubo / furto (Senatran)","placa",0.45],["multas-senatran","Multas (Senatran)","placa",0.45],["placa-mj","Situação e restrições (MJ)","placa",0.42],["recall-senatran","Recall (por chassi)","chassi",0.45],["leilao-base01-score","Score de passagem por leilão","placa",4.96]];
const CV_ALERTA=/roubo|furto|restri[cç][aã]o\s+(judicial|administrativa)|bloqueio|alienad|gravame\s+ativo|penhora|apreens|sinistr|recuperad|baixad/i;
let cvSel={};
function cvValido(v,ent){return ent==="placa"?/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(String(v.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,"")):/^[A-HJ-NPR-Z0-9]{17}$/.test(String(v.chassi||"").toUpperCase().replace(/[^A-Z0-9]/g,""))}
function cvLinhas(o,pre){if(o==null)return "";if(typeof o!=="object"){const s=String(o);return `<div class="kv"><span>${esc(pre)}</span><b class="${CV_ALERTA.test(s)?"neg":""}">${/^https?:\/\//.test(s)?`<a class="lk" href="${esc(s)}" target="_blank" rel="noopener">abrir ↗</a>`:esc(s.slice(0,300))}</b></div>`}
  if(Array.isArray(o))return o.length?o.slice(0,40).map((x,i)=>cvLinhas(x,pre+" #"+(i+1))).join(""):`<div class="kv"><span>${esc(pre)}</span><b>nenhum</b></div>`;
  return Object.entries(o).slice(0,60).map(([k,x])=>cvLinhas(x,pre?pre+" › "+k:k)).join("")}
function consultasHTML(v){
  if(papel!=="dono")return "";
  const hist=v.consultasExt||[];
  return `<fieldset><legend>🔎 Consultas veiculares <span class="mini" style="margin:0">— plataforma externa, cobrada por consulta</span></legend>
   <div class="mini">Placa: <b>${esc(v.placa||"—")}</b> · Chassi: <b>${esc(v.chassi||"—")}</b>. Só consultas sobre o veículo. A cada consulta o sistema pede a sua senha.</div>
   ${CV_PRODUTOS.map(([s,n,ent,p])=>{const ok=cvValido(v,ent);return `<label class="ia-it"><input type="checkbox" data-cv="${s}" ${cvSel[s]&&ok?"checked":""} ${ok?"":"disabled"}><span><b>${n}</b> · ${brl(p)}${ok?"":` <small class="neg">sem ${ent} válido${ent==="placa"&&v.semPlaca?" (moto sem placa)":""}</small>`}</span></label>`}).join("")}
   <div class="toolbar" style="margin:8px 0 0"><button class="btn sm" id="cvIr">Consultar selecionadas <span id="cvTot">${brl(CV_PRODUTOS.filter(x=>cvSel[x[0]]&&cvValido(v,x[2])).reduce((a,x)=>a+x[3],0))}</span></button></div>
   <div id="cvSt" class="mini"></div>
   ${hist.length?`<div class="sec-t" style="margin:12px 0 6px">Resultados</div>${hist.slice().reverse().map(h=>`<details class="cvres ${h.ok?(CV_ALERTA.test(JSON.stringify(h.resultado||""))?"alerta":"ok"):"erro"}"><summary><b>${esc(h.nome)}</b> · ${new Date(h.em).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})} · ${h.ok?(CV_ALERTA.test(JSON.stringify(h.resultado||""))?"⚠ verificar":"✓"):"erro"} · ${brl(h.custo||0)}</summary>${h.ok?cvLinhas(h.resultado,""):`<div class="mini neg">${esc(h.erro||"")}</div>`}</details>`).join("")}
    <div class="mini">Termos em vermelho (roubo, restrição, alienação, sinistro…) são só destaque automático; leia o resultado completo.</div>`:""}
  </fieldset>`;
}
const _tabDadosCV=tabDados;
tabDados=function(v){return _tabDadosCV(v).replace('<fieldset><legend>📝 Observações</legend>',consultasHTML(v)+'<fieldset><legend>📝 Observações</legend>')};
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||t.dataset.cv==null||!editing)return;cvSel[t.dataset.cv]=t.checked;const tot=$("#cvTot");if(tot)tot.textContent=brl(CV_PRODUTOS.filter(x=>cvSel[x[0]]&&cvValido(editing,x[2])).reduce((a,x)=>a+x[3],0))});
document.addEventListener("click",e=>{const b=e.target.closest("#cvIr,#cvOk,#cvCancel");if(!b||!editing)return;const v=editing;
  if(b.id==="cvCancel"){$("#cvSt").innerHTML="";return}
  const prods=CV_PRODUTOS.filter(x=>cvSel[x[0]]&&cvValido(v,x[2]));
  if(b.id==="cvIr"){if(!prods.length)return toast("Selecione ao menos uma consulta");
    $("#cvSt").innerHTML=`<div class="ia-box"><b>Confirmar ${prods.length} consulta(s) · ${brl(prods.reduce((a,x)=>a+x[3],0))}</b><div class="mini">${prods.map(x=>esc(x[1])).join(" · ")}</div>
      <label style="margin-top:8px">Sua senha de acesso<input type="password" id="cvSenha" autocomplete="current-password"></label>
      <div class="toolbar" style="margin:8px 0 0"><button class="btn sm" id="cvOk">Confirmar e consultar</button><button class="btn ghost sm" id="cvCancel">Cancelar</button></div></div>`;setTimeout(()=>{const s=$("#cvSenha");if(s)s.focus()},30);return}
  if(b.id==="cvOk"){const senha=$("#cvSenha").value;if(!senha)return toast("Digite sua senha");b.disabled=true;b.textContent="Consultando…";
    chamarIA("consulta_veicular",{produtos:prods.map(x=>x[0]),placa:v.placa,chassi:v.chassi,senha,ref:v.link||v.placa||v.id}).then(r=>{
      v.consultasExt=(v.consultasExt||[]).concat((r.consultas||[]).map(c=>({...c,em:r.em}))).slice(-40);persist(v);cvSel={};
      const ok=(r.consultas||[]).filter(c=>c.ok).length;toast(`${ok} de ${(r.consultas||[]).length} consulta(s) feita(s) · ${brl(r.custo_brl||0)}`);keepScroll(renderETab)})
    .catch(err=>{const m=/desconhecida/i.test(err.message)?"A consulta veicular ainda não foi ativada no servidor.":err.message;const st=$("#cvSt");if(st)st.innerHTML=`<div class="ia-box"><b class="neg">${esc(m)}</b></div>`});}
});
