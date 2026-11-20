/* ---------- 📎 documentos do veículo: CRLV, CRV, laudos, recibos, notas fiscais, débitos, comprovantes ---------- */
// Arquivos vão para o bucket PRIVADO "documentos" (só membros do painel abrem, por link temporário).
const DOC_TIPO={nota_arremate:["🧾","Nota de arremate"],crlv:["🪪","CRLV"],crv_atpv:["📘","CRV / ATPV"],laudo_cautelar:["🔬","Laudo cautelar"],laudo_vistoria_detran:["🔍","Vistoria DETRAN"],
  recibo_despesa:["🧾","Recibo"],nota_fiscal:["🧾","Nota fiscal"],orcamento:["📝","Orçamento"],comprovante_pagamento:["💸","Comprovante"],debitos_detran:["🏛","Débitos DETRAN"],consulta_veicular:["🔎","Consulta"],edital:["📄","Edital"],outro:["📎","Documento"]};
const DOC_CAMPOS=[["placa","placa","Placa"],["chassi","chassi","Chassi"],["renavam","renavam","Renavam"],["motor","motor","Nº do motor"],["cor","cor","Cor"],["combustivel","combustivel","Combustível"],["uf","uf","UF"],["km","km","Km"]];
let docFila=[]; // {vid,nome,st,erro}
const slugDoc=s=>norm(String(s||"doc").replace(/\.[a-z0-9]+$/i,"")).replace(/ /g,"-").slice(0,50)||"doc";
async function enviarDocArquivo(v,f){
  const ext=(f.name.match(/\.([a-z0-9]{2,5})$/i)||[,/pdf/.test(f.type)?"pdf":"jpg"])[1].toLowerCase();
  const path=`${painelId}/${v.id}/${Date.now()}-${slugDoc(f.name)}.${ext}`;
  const up=await sb.storage.from("documentos").upload(path,f,{contentType:f.type||undefined,upsert:false});
  return up.error?{erro:up.error.message}:{path};
}
function propostasDoc(v,d){
  const out=[];const V=d.veiculo||{};
  DOC_CAMPOS.forEach(([dk,vk,l])=>{let val=V[dk];if(val==null||val==="")return;val=String(val).trim();if(vk==="placa"||vk==="chassi")val=val.toUpperCase().replace(/[^A-Z0-9]/g,"");
    const atual=String(v[vk]??"").trim();if(!atual)out.push({k:"campo",campo:vk,valor:val,txt:`${l}: ${val}`,on:true});
    else if(norm(atual).replace(/ /g,"")!==norm(val).replace(/ /g,""))out.push({k:"campo",campo:vk,valor:val,txt:`${l}: ${val} (no sistema: ${atual})`,on:vk!=="chassi"&&vk!=="placa",diverge:true})});
  const af=V.ano_fabricacao,am=V.ano_modelo;if(af||am){const ano=af&&am&&af!==am?`${af}/${am}`:String(am||af);const atual=String(v.ano||"");
    if(!atual)out.push({k:"campo",campo:"ano",valor:ano,txt:`Ano: ${ano}`,on:true});else if(anoModelo(atual)!==anoModelo(ano)||atual!==ano)out.push({k:"campo",campo:"ano",valor:ano,txt:`Ano: ${ano} (no sistema: ${atual})`,on:anoModelo(atual)===anoModelo(ano),diverge:anoModelo(atual)!==anoModelo(ano)})}
  if(V.situacao)out.push({k:"obs",valor:`${(DOC_TIPO[d.tipo]||DOC_TIPO.outro)[1]}: situação "${V.situacao}"`,txt:`Anotar situação: ${V.situacao}`,on:true});
  (d.despesas||[]).forEach(x=>{if(!num(x.valor))return;const ja=(v.despesas||[]).some(y=>num(y.valor)===num(x.valor)&&(y.docId===d.id||norm(y.desc)===norm(x.descricao)));
    out.push({k:"despesa",cat:x.categoria||"outros",desc:x.descricao,valor:num(x.valor),data:x.data||"",txt:`Despesa · ${(CATS[x.categoria]||{}).n||x.categoria}: ${x.descricao} — ${brl(num(x.valor))}`,on:!ja,ja})});
  (d.debitos||[]).forEach(x=>{if(!num(x.valor))return;const rot=({ipva:"IPVA",licenciamento:"Licenciamento",multa:"Multa",seguro_dpvat:"Seguro/DPVAT",taxa_detran:"Taxa DETRAN"})[x.tipo]||"Débito";const desc=x.descricao?(norm(x.descricao).startsWith(norm(rot))?x.descricao:rot+" · "+x.descricao):rot;
    const ja=(v.orcado||[]).some(o=>num(o.valor)===num(x.valor)&&o.docId===d.id);
    out.push({k:"debito",desc,valor:num(x.valor),venc:x.vencimento||"",txt:`Débito a pagar: ${desc} — ${brl(num(x.valor))}${x.vencimento?" · vence "+fmtD(x.vencimento):""}`,on:!ja,ja})});
  if(d.laudo&&d.laudo.resultado)out.push({k:"laudo",valor:d.laudo,txt:`Laudo: ${d.laudo.resultado.replace(/_/g," ")}${d.laudo.apontamentos.length?" · "+d.laudo.apontamentos.length+" apontamento(s)":""}`,on:true});
  if(d.tipo==="nota_arremate"&&d.nota){const n=d.nota,x=(n.veiculos||[]).find(y=>(y.chassi&&norm(y.chassi)===norm(v.chassi||""))||(y.placa&&norm(y.placa)===norm(v.placa||"")))||(n.veiculos||[])[0];
    if(x){const lance=num(x.lance)||num(n.subtotal);if(lance&&num(v.lance)!==lance)out.push({k:"campo",campo:"lance",valor:String(lance),txt:`Lance arrematado: ${brl(lance)}${v.lance?` (no sistema: ${brl(num(v.lance))})`:""}`,on:true});
      if(n.comissao_pct!=null&&num(v.comissaoPct)!==n.comissao_pct)out.push({k:"campo",campo:"comissaoPct",valor:String(n.comissao_pct),txt:`Comissão: ${n.comissao_pct}%`,on:true});
      ["placa","chassi","lote"].forEach(k=>{if(x[k]&&!v[k])out.push({k:"campo",campo:k,valor:x[k],txt:`${k[0].toUpperCase()+k.slice(1)}: ${x[k]}`,on:true})});
      if(v.status==="avaliacao")out.push({k:"campo",campo:"status",valor:"arrematado",txt:"Status: Arrematado",on:true})}}
  return out;
}
function aplicarDoc(v,d){let n=0;
  (d.propostas||[]).forEach(p=>{if(!p.on||p.feito)return;
    if(p.k==="campo"){v[p.campo]=p.valor;n++}
    else if(p.k==="obs"){if(!(v.obs||"").includes(p.valor)){v.obs=((v.obs||"")+(v.obs?"\n":"")+p.valor).trim();n++}}
    else if(p.k==="despesa"){v.despesas=v.despesas||[];v.despesas.push({id:uid(),cat:p.cat,desc:p.desc,valor:String(p.valor),data:p.data,docId:d.id});n++}
    else if(p.k==="debito"){v.orcado=v.orcado||[];v.orcado.push({id:uid(),cat:"documentacao",desc:p.desc,valor:String(p.valor),item:null,origem:"documento",on:true,docId:d.id,venc:p.venc});n++}
    else if(p.k==="laudo"){v.laudo={...p.valor,docId:d.id,em:d.data||""};const t=`Laudo (${p.valor.resultado.replace(/_/g," ")})${p.valor.apontamentos.length?": "+p.valor.apontamentos.join("; "):""}`;if(!(v.obs||"").includes(t))v.obs=((v.obs||"")+(v.obs?"\n":"")+t).trim();n++}
    p.feito=true});
  d.aplicado=true;d.aplicadoEm=new Date().toISOString();
  if((d.alertas||[]).length){v.alertasDocs=v.alertasDocs||[];d.alertas.forEach(a=>{if(!v.alertasDocs.some(x=>x.txt===a))v.alertasDocs.push({txt:a,doc:d.titulo||d.nome,docId:d.id})})}
  return n;
}
async function processarDocs(v,files){
  if(!podeGerir())return;v.docs=v.docs||[];
  const itens=[...files].map(f=>({f,vid:v.id,nome:f.name,st:"enviando"}));docFila.push(...itens);docRefresh();
  for(const it of itens){const f=it.f;
    try{if(f.size>15e6)throw new Error("acima de 15 MB");
      const up=await enviarDocArquivo(v,f);it.st="lendo";docRefresh();
      const arquivo=await lerB64(f);let r=await chamarIA("ler_documento",{arquivo,mime:f.type,nome:f.name,ref:"doc: "+f.name});
      if(r.tipo==="nota_arremate"&&!r.nota){try{const n=await chamarIA("ler_nota",{arquivo,mime:f.type,nome:f.name,ref:"nota: "+f.name});r={...r,nota:n}}catch(e){}}
      const d={id:uid(),nome:f.name,path:up.path||"",semArquivo:up.erro||"",tipo:r.tipo||"outro",titulo:r.titulo||(DOC_TIPO[r.tipo]||DOC_TIPO.outro)[1],data:r.data_documento||"",emissor:r.emissor||"",resumo:r.resumo||"",
        alertas:r.alertas||[],veiculo:r.veiculo||null,despesas:r.despesas||[],debitos:r.debitos||[],pagamentos:r.pagamentos||[],laudo:r.laudo||null,nota:r.nota||null,metodo:r.metodo,em:new Date().toISOString(),aplicado:false};
      d.propostas=propostasDoc(v,d);v.docs.push(d);persist(v);it.st="ok"}
    catch(e){it.st="erro";it.erro=e.message}
    docRefresh()}
  setTimeout(()=>{docFila=docFila.filter(x=>x.st!=="ok");docRefresh()},2500);
}
function docRefresh(){if(editing&&etab==="docs"&&$("#eBody"))keepScroll(renderETab)}
function tabDocs(v){
  const ds=(v.docs||[]).slice().reverse();const fila=docFila.filter(x=>x.vid===v.id);const al=v.alertasDocs||[];
  return `${al.length?`<div class="doc-alerta">⚠ <b>Alertas nos documentos</b>${al.map(a=>`<div>${esc(a.txt)} <small>— ${esc(a.doc||"")}</small></div>`).join("")}</div>`:""}
  <fieldset><legend>📎 Documentos do veículo</legend>
   <div class="mini">CRLV, CRV/ATPV, laudo cautelar, recibos e notas fiscais de peças e serviços, orçamentos, débitos do DETRAN, comprovantes de pagamento ou a nota de arremate. O sistema lê cada um e mostra o que vai preencher antes de aplicar.</div>
   ${canWrite&&podeGerir()?`<label class="btn" style="margin-top:10px">📎 Adicionar documentos (PDF ou foto)<input type="file" id="docIn" accept="application/pdf,.pdf,image/*" multiple hidden></label>`:""}
   ${fila.map(x=>`<div class="aud ${x.st}"><b>${esc(x.nome)}</b> <small>${x.st==="ok"?"✓ lido":x.st==="erro"?"⚠ "+esc(x.erro||""):x.st==="enviando"?"⬆ enviando…":"🤖 lendo…"}</small></div>`).join("")}
   ${ds.length?ds.map(d=>docHTML(v,d)).join(""):fila.length?"":`<div class="mini" style="margin-top:10px">Nenhum documento ainda.</div>`}
  </fieldset>`;
}
function docHTML(v,d){const [ic,nt]=DOC_TIPO[d.tipo]||DOC_TIPO.outro;const ps=d.propostas||[];const pend=ps.filter(p=>!p.feito);
  return `<div class="doc-card ${d.aplicado?"ok":""}"><div class="doc-h"><span class="doc-ic">${ic}</span><div><b>${esc(d.titulo||nt)}</b><small>${esc(nt)}${d.data?" · "+fmtD(d.data):""}${d.emissor?" · "+esc(d.emissor):""}${d.metodo==="codigo"?" · lido sem IA":""}</small></div>
   <div class="doc-acts">${d.path?`<button class="btn ghost sm" data-docabrir="${d.id}">Abrir</button>`:""}${canWrite?`<button class="btn ghost sm" data-docdel="${d.id}" title="Remover">✕</button>`:""}</div></div>
   ${d.resumo?`<div class="mini" style="margin:6px 0 0">${esc(d.resumo)}</div>`:""}
   ${(d.alertas||[]).length?`<div class="neg" style="font-size:12px;margin-top:6px">⚠ ${d.alertas.map(esc).join(" · ")}</div>`:""}
   ${(d.pagamentos||[]).length?`<div class="mini">💸 ${d.pagamentos.map(p=>`${esc(p.descricao)} ${brl(num(p.valor))}${p.data?" em "+fmtD(p.data):""}`).join(" · ")}</div>`:""}
   ${d.semArquivo?`<div class="mini neg">Arquivo não foi guardado (${esc(d.semArquivo)}); os dados lidos ficaram.</div>`:""}
   ${ps.length?`<div class="doc-props">${ps.map((p,i)=>`<label class="nv-chk ${p.feito?"feito":""}"><input type="checkbox" data-docp="${d.id}:${i}" ${p.on&&!p.feito?"checked":""} ${p.feito||!canWrite?"disabled":""}> <span>${p.feito?"✓ ":""}${esc(p.txt)}${p.diverge?` <b class="neg">diverge</b>`:""}${p.ja&&!p.feito?` <small>(já lançado?)</small>`:""}</span></label>`).join("")}</div>
     ${pend.length&&canWrite?`<button class="btn sm" style="margin-top:8px" data-docap="${d.id}">✓ Aplicar selecionados</button>`:""}`:`<div class="mini">Nada a preencher a partir deste documento.</div>`}
  </div>`}
document.addEventListener("change",e=>{const t=e.target;if(!editing)return;
  if(t.id==="docIn"){processarDocs(editing,t.files);t.value="";return}
  if(t.dataset&&t.dataset.docp){const [id,i]=t.dataset.docp.split(":");const d=(editing.docs||[]).find(x=>x.id===id);if(d&&d.propostas[+i])d.propostas[+i].on=t.checked}});
document.addEventListener("click",async e=>{const b=e.target.closest("[data-docap],[data-docabrir],[data-docdel]");if(!b||!editing)return;const v=editing;
  if(b.dataset.docap){const d=v.docs.find(x=>x.id===b.dataset.docap);const n=aplicarDoc(v,d);persist(v);toast(`${n} informação(ões) aplicada(s) ✓`);keepScroll(renderETab);return}
  if(b.dataset.docabrir){const d=v.docs.find(x=>x.id===b.dataset.docabrir);const w=window.open("","_blank");const r=await sb.storage.from("documentos").createSignedUrl(d.path,600);
    if(r.error){if(w)w.close();return toast("Não consegui abrir: "+r.error.message)}if(w)w.location=r.data.signedUrl;else location.href=r.data.signedUrl;return}
  if(b.dataset.docdel){const d=v.docs.find(x=>x.id===b.dataset.docdel);if(!d)return;
    if(b.dataset.conf!=="1"){b.dataset.conf="1";b.textContent="Remover?";setTimeout(()=>{if(b.isConnected){b.dataset.conf="";b.textContent="✕"}},3000);return}
    if(d.path)try{await sb.storage.from("documentos").remove([d.path])}catch(err){}
    v.docs=v.docs.filter(x=>x!==d);v.alertasDocs=(v.alertasDocs||[]).filter(a=>a.docId!==d.id);persist(v);keepScroll(renderETab);toast("Documento removido (o que já foi aplicado continua no veículo)")}});
