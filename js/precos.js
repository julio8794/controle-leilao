/* ---------- banco de preços que aprende ----------
   Cada valor de peça/serviço lançado (orçamento da vistoria, avaliação, gasto real)
   é guardado com o nome normalizado. A sugestão é a MEDIANA dos valores já lançados
   (preferindo o mesmo modelo), nunca um valor inventado. */
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\(.*?\)/g," ").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
const MARCAS=/\b(honda|yamaha|suzuki|dafra|shineray|haojue|kawasaki|bmw|fiat|vw|volkswagen|chevrolet|gm|ford|toyota|hyundai|renault|nissan|jeep|peugeot|citroen|mitsubishi|mmc|kia)\b/g;
function familia(modelo){const t=norm(modelo).replace(MARCAS," ").replace(/\s+/g," ").trim().split(" ");return t.slice(0,2).join(" ")}
const mediana=a=>{const s=[...a].sort((x,y)=>x-y);const n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):0};
function sugerirPreco(nome,modelo){
  const it=norm(nome);if(!it)return null;
  const todos=precos.filter(p=>p.item===it&&num(p.valor)>0);if(!todos.length)return null;
  const fam=familia(modelo);const mesmo=todos.filter(p=>p.familia===fam);
  const base=mesmo.length>=2?mesmo:todos;const vs=base.map(p=>num(p.valor));
  return {mediana:Math.round(mediana(vs)),n:vs.length,min:Math.min(...vs),max:Math.max(...vs),mesmoModelo:base===mesmo,ultimo:num(base[0].valor)};
}
function nomesConhecidos(cat){const m=new Map();precos.forEach(p=>{if((!cat||p.categoria===cat)&&p.nome&&!m.has(p.item))m.set(p.item,p.nome)});return [...m.values()].slice(0,200)}
const _precoTimers={};
function registrarPreco(ref,nome,cat,valor,origem,v){
  if(!sb||!canWrite||!painelId)return;const val=num(valor);const it=norm(nome);if(!it||!(val>0))return;
  clearTimeout(_precoTimers[ref]);
  _precoTimers[ref]=setTimeout(async()=>{
    const row={painel_id:painelId,ref,item:it,nome:String(nome).trim().slice(0,120),categoria:cat||null,valor:val,origem,modelo:v&&v.modelo||null,familia:v?familia(v.modelo):null,veiculo_id:v&&v.id||null,por:me&&me.id,atualizado_em:new Date().toISOString()};
    const {error}=await sb.from("precos").upsert(row,{onConflict:"painel_id,ref"});
    if(!error){const i=precos.findIndex(p=>p.ref===ref);const loc={...row};if(i>=0)precos[i]=loc;else precos.unshift(loc)}
  },1500);
}
function sugHTML(nome,modelo){const s=sugerirPreco(nome,modelo);if(!s)return "";
  return `<button class="sug" data-sugv="${s.mediana}" title="Mediana de ${s.n} valor(es) já lançado(s)${s.mesmoModelo?" para este modelo":""}">💡 ${brl(s.mediana)} <small>${s.n}× · ${brl(s.min)}–${brl(s.max)}</small></button>`}
