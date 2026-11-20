/* ---------- novo veículo: nota de arremate, link do lote ou manual ---------- */
let nn=null; // estado da importação por nota
const titulo=s=>String(s||"").toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());
function decodChassi(vin){vin=String(vin||"").toUpperCase().replace(/\s/g,"");if(!vin)return null;
  return {vin,valido:/^[A-HJ-NPR-Z0-9]{17}$/.test(vin),fab:WMI[vin.slice(0,3)]||null,wmi:vin.slice(0,3),familia:vin.slice(3,7),ano:VIN_ANO[vin[9]]||null,serie:vin.slice(11)}}
function achadosChassi(vin,placa){
  const P=String(placa||"").toUpperCase();
  const mesmos=vehicles.filter(v=>!v._excluido&&((vin&&norm(v.chassi||"")===norm(vin))||(P.length>=7&&norm(v.placa||"")===norm(P))));
  const lotes=[];grupos.forEach(g=>(g.lotes||[]).forEach(l=>{if((vin&&norm(l.chassi||"")===norm(vin))||(P.length>=7&&norm(l.placa||"")===norm(P)))lotes.push({g,l})}));
  return {mesmos,lotes}}
function abrirNovo(){
  if(!podeGerir())return;nn=null;
  $("#sheet").innerHTML=`<div class="shead"><div class="row"><button class="btn ghost sm" id="nvX">← Voltar</button><h2>＋ Novo veículo</h2></div></div><div class="sbody">
   <div class="nv-opts">
    <label class="nv-op destaque"><span class="ic">📄</span><b>Nota de arremate</b><small>PDF ou foto da nota. Preenche lance, comissão, lote, placa e chassi, e busca FIPE e dados pelo chassi.</small><input type="file" id="nvNota" accept="application/pdf,.pdf,image/*" hidden></label>
    <button class="nv-op" id="nvLink"><span class="ic">🔗</span><b>Link do lote</b><small>Cole o link do leiloeiro: fotos, dados e lance vêm do site.</small></button>
    <button class="nv-op" id="nvMan"><span class="ic">✍</span><b>Preencher manualmente</b><small>Cadastro em branco para digitar os dados.</small></button>
   </div><div id="nvSt"></div></div>`;
  $("#ov").classList.add("on");$("#ov").scrollTop=0;document.body.style.overflow="hidden";
}
function fecharNovo(){nn=null;$("#ov").classList.remove("on");document.body.style.overflow="";render()}
const lerB64=f=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=()=>ko(new Error("Não consegui ler o arquivo"));r.readAsDataURL(f)});
async function lerNotaArquivo(f){
  const st=$("#nvSt");const say=h=>{if(st)st.innerHTML=h};
  if(!f)return;if(f.size>15e6)return say(`<div class="ia-box neg">Arquivo com ${(f.size/1e6).toFixed(1)} MB: o limite é 15 MB.</div>`);
  say(`<div class="ia-box">📄 Lendo ${esc(f.name)}…</div>`);
  try{const arquivo=await lerB64(f);const r=await chamarIA("ler_nota",{arquivo,mime:f.type,nome:f.name,ref:"nota: "+f.name});
    if(!r.veiculos||!r.veiculos.length)return say(`<div class="ia-box neg">Não encontrei veículo nessa nota. Confira se é a nota de arrematação.</div>`);
    nn={nota:r,arquivo:f.name,itens:r.veiculos.map(x=>novoDaNota(r,x))};renderNota()}
  catch(e){say(`<div class="ia-box neg">⚠ ${esc(e.message)}</div>`)}
}
function novoDaNota(n,x){
  const d=decodChassi(x.chassi);const ac=achadosChassi(x.chassi,x.placa);
  const marca=titulo(x.marca||(d&&d.fab)||"");const mod=String(x.modelo||"").trim();
  const modelo=(mod&&marca&&!norm(mod).startsWith(norm(marca))?marca+" "+mod:mod||marca).trim();
  const ano=x.ano||(d&&d.ano?String(d.ano):"");
  const lance=num(x.lance)||(n.veiculos.length===1?num(n.subtotal):0);
  const pct=n.comissao_pct!=null?n.comissao_pct:(lance&&n.comissao_valor?Math.round(n.comissao_valor/lance*1000)/10:5);
  const alvo=ac.mesmos[0]||null;const lt=ac.lotes[0]||null;
  return {x,d,ac,acao:alvo?"atualizar":"criar",alvoId:alvo?alvo.id:"",grupoId:alvo&&alvo.grupoId||(lt?lt.g.id:""),retirado:false,
    f:{modelo,ano,placa:x.placa||"",chassi:(d&&d.vin)||"",cor:x.cor||"",renavam:x.renavam||"",motor:x.motor||"",lote:x.lote||"",lance:lance?String(lance):"",comissaoPct:String(pct),
      leiloeiro:[n.leiloeiro?titulo(n.leiloeiro):"",n.patio||""].filter(Boolean).join(" · "),dataLeilao:n.data_leilao||""}};
}
function renderNota(){
  const n=nn.nota;const prazo=n.data_leilao&&n.retirada_dias?new Date(new Date(n.data_leilao+"T12:00").getTime()+n.retirada_dias*864e5):null;
  const somaOk=n.total&&n.subtotal!=null&&n.comissao_valor!=null?Math.abs(n.subtotal+n.comissao_valor-n.total)<1:null;
  $("#sheet").innerHTML=`<div class="shead"><div class="row"><button class="btn ghost sm" id="nvX">← Voltar</button><h2>📄 Nota de arremate</h2></div></div><div class="sbody">
   <fieldset><legend>Leilão</legend>
    <div class="nv-grid"><div><span>Nota</span><b>${esc(n.numero||"—")}</b></div><div><span>Leilão nº</span><b>${esc(n.leilao||"—")}</b></div><div><span>Data</span><b>${n.data_leilao?fmtD(n.data_leilao):"—"}</b></div>
     <div><span>Leiloeiro</span><b>${esc(titulo(n.leiloeiro||"—"))}</b></div><div><span>Local</span><b>${esc([n.patio,n.cidade&&n.cidade+(n.uf?"-"+n.uf:"")].filter(Boolean).join(" · ")||"—")}</b></div>
     <div><span>Total da nota</span><b>${n.total?brl(n.total):"—"}</b><small>${n.subtotal!=null?`lance ${brl(n.subtotal)}`:""}${n.comissao_valor!=null?` + comissão ${n.comissao_pct!=null?n.comissao_pct+"% ":""}${brl(n.comissao_valor)}`:""}${somaOk===true?" ✓ confere":somaOk===false?` <b class="neg">⚠ soma não confere</b>`:""}</small></div></div>
    ${prazo?`<div class="mini">Retirada em até ${n.retirada_dias} dias (até ${prazo.toLocaleDateString("pt-BR")})${n.estadia_moto?` · depois R$ ${n.estadia_moto}/dia de pátio (moto)`:""}${n.perda_dias?` · perde o bem após ${n.perda_dias} dias`:""}</div>`:""}
    <div class="mini">${n.metodo==="ia"?"Lida pela IA (foto ou PDF escaneado): confira os campos.":"Lida direto do PDF, sem IA e sem custo."} Os dados pessoais da nota não são salvos.</div>
   </fieldset>
   ${nn.itens.map((it,i)=>itemNotaHTML(it,i)).join("")}
   <div class="toolbar" style="margin-top:14px"><button class="btn" id="nvSalvar">✓ Cadastrar ${nn.itens.length>1?nn.itens.length+" veículos":"veículo"} como arrematado</button><button class="btn ghost" id="nvX2">Cancelar</button></div>
   <div id="nvSt"></div></div>`;
}
function itemNotaHTML(it,i){const f=it.f,d=it.d,ac=it.ac;const inp=(k,l,t="text")=>`<label>${l}<input data-nf="${i}" data-k="${k}" type="${t}" value="${esc(f[k]||"")}"></label>`;
  const anoCh=d&&d.ano;const lt=ac.lotes[0];
  return `<fieldset><legend>🏍 Lote ${esc(f.lote||"?")} · ${esc(f.modelo||"Veículo")}</legend>
   <div class="nv-form">${inp("modelo","Modelo")}${inp("ano","Ano modelo")}${inp("placa","Placa")}${inp("chassi","Chassi")}${inp("cor","Cor")}${inp("lote","Lote")}${inp("lance","Lance (R$)","number")}${inp("comissaoPct","Comissão (%)","number")}${inp("leiloeiro","Leiloeiro / pátio")}${inp("dataLeilao","Data do leilão","date")}</div>
   <div class="sec-t" style="margin:12px 0 6px">🔎 Busca pelo chassi</div>
   ${d?`<div class="ck ${d.valido?"ok":"no"}">${d.valido?"✓":"⚠"} Chassi ${esc(d.vin)} ${d.valido?"com 17 caracteres válidos":"fora do padrão de 17 caracteres"}</div>
     ${d.fab?`<div class="ck ${!f.modelo||norm(marcaDe(f.modelo))===norm(d.fab)?"ok":"no"}">${!f.modelo||norm(marcaDe(f.modelo))===norm(d.fab)?"✓":"⚠"} Fabricante pelo chassi: ${esc(d.fab)} (${esc(d.wmi)}) · família ${esc(d.familia)}</div>`:""}
     ${anoCh?`<div class="ck ok">✓ Ano modelo pelo chassi: ${anoCh} (10º dígito "${esc(d.vin[9])}")${f.ano&&anoModelo(f.ano)&&anoModelo(f.ano)!==anoCh?` <b class="neg">· nota/campo diz ${esc(f.ano)}</b>`:""}</div>`:""}`:`<div class="ck no">⚠ A nota não traz chassi: confira no documento.</div>`}
   ${ac.mesmos.length?`<div class="ck ok">✓ Já existe no painel: <b>${esc(ac.mesmos[0].modelo||"")}</b> ${ac.mesmos[0].lote?"lote "+esc(ac.mesmos[0].lote):""} (${esc(STATUS[ac.mesmos[0].status||"avaliacao"]||"")})</div>
     <label class="nv-chk"><input type="radio" name="nvA${i}" data-na="${i}" value="atualizar" ${it.acao==="atualizar"?"checked":""}> Atualizar essa moto para Arrematado (mantém fotos e vistoria)</label>
     <label class="nv-chk"><input type="radio" name="nvA${i}" data-na="${i}" value="criar" ${it.acao==="criar"?"checked":""}> Criar um veículo novo</label>`:`<div class="ck">· Chassi não está em nenhuma moto do painel</div>`}
   ${lt?`<div class="ck ok">✓ Está no Anexo I do edital <b>${esc(lt.g.nome)}</b> · ${esc(lt.l.patio||"")} lote ${esc(lt.l.lote||"")}</div>`:""}
   <div class="mini">Ao cadastrar, o sistema busca a FIPE oficial e faz as checagens do chassi. Restrições, roubo e gravame: use "🔎 Consultas veiculares" na aba Dados (pago, com sua senha).</div>
   <label class="nv-chk"><input type="checkbox" data-nr="${i}" ${it.retirado?"checked":""}> Já retirei do pátio (está comigo)</label>
  </fieldset>`}
async function salvarNota(){
  const n=nn.nota;const criados=[];
  for(const it of nn.itens){const f=it.f;
    let v=it.acao==="atualizar"&&it.alvoId?vehicles.find(x=>x.id===it.alvoId):null;
    if(!v){const g=grupos.find(x=>x.id===it.grupoId);v={id:uid(),despesas:[],orcado:[],vistoria:{checks:{}},vendaPretendida:"",vendaValor:"",dataVenda:"",obs:"",criado:Date.now(),grupoId:g?g.id:"",grupo:g?g.nome:""};vehicles.unshift(v)}
    ["modelo","ano","placa","chassi","cor","renavam","motor","lote","leiloeiro","dataLeilao"].forEach(k=>{if(f[k])v[k]=f[k]});
    v.lance=f.lance;v.comissaoPct=f.comissaoPct;v.status="arrematado";
    if(it.x.situacao)v.classificacao=v.classificacao||it.x.situacao;
    v.nota={numero:n.numero||"",leilao:n.leilao||"",comitente:n.comitente||"",emissao:n.emissao||"",total:n.veiculos.length===1?n.total:null,patio:n.patio||"",cidade:n.cidade||"",uf:n.uf||"",
      retiradaDias:n.retirada_dias||null,estadiaDia:n.estadia_moto||null,perdaDias:n.perda_dias||null,arquivo:nn.arquivo,lidaEm:new Date().toISOString(),metodo:n.metodo};
    v.retirado=it.retirado;if(it.retirado&&!v.retiradoEm)v.retiradoEm=new Date().toISOString().slice(0,10);
    const linha=`Nota de arremate nº ${n.numero||"?"} · leilão nº ${n.leilao||"?"}${n.total&&n.veiculos.length===1?` · total pago ${brl(n.total)}`:""}`;
    if(!(v.obs||"").includes(linha))v.obs=((v.obs||"")+(v.obs?"\n":"")+linha).trim();
    persist(v);criados.push(v)}
  fecharNovo();tab="veiculos";render();toast(`${criados.length} veículo(s) arrematado(s) cadastrado(s) ✓ · buscando FIPE pelo chassi…`);
  for(const v of criados){try{await completarDados(v)}catch(e){}}
  render();if(criados.length===1)openEditor(criados[0].id);
}
document.addEventListener("click",e=>{const b=e.target.closest("#nvX,#nvX2,#nvLink,#nvMan,#nvSalvar");if(!b)return;
  if(b.id==="nvX"||b.id==="nvX2")return fecharNovo();
  if(b.id==="nvLink"){fecharNovo();return abrirImportLink()}
  if(b.id==="nvMan"){fecharNovo();return newV()}
  if(b.id==="nvSalvar"){b.disabled=true;b.textContent="Salvando…";salvarNota()}});
document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="nvNota")return lerNotaArquivo(t.files[0]);
  if(!nn)return;
  if(t.dataset.na!=null){nn.itens[+t.dataset.na].acao=t.value;return}
  if(t.dataset.nr!=null){nn.itens[+t.dataset.nr].retirado=t.checked;return}});
document.addEventListener("input",e=>{const t=e.target;if(!nn||t.dataset.nf==null)return;nn.itens[+t.dataset.nf].f[t.dataset.k]=t.value});
