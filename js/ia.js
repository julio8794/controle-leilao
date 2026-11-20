/* ---------- IA (Edge Function "ia") ---------- */
async function chamarIA(acao,dados){
  const {data,error}=await sb.functions.invoke("ia",{body:{acao,painel_id:painelId,...dados}});
  if(error){let m=error.message||"falha";try{const j=await error.context.json();m=j.erro||m}catch(e){}throw new Error(m)}
  if(data&&data.erro)throw new Error(data.erro);return data;
}
async function lerEditalIA(g){
  const st=$("#gIASt");const say=t=>{if(st)st.innerHTML=t};
  if(!g.edital_url)return say("Informe o link do PDF do edital.");
  say("🤖 Lendo o edital… (até 1 min)");
  try{const r=await chamarIA("ler_edital",{url:g.edital_url});aplicarEdital(g,r)}
  catch(e){say(`<span class="neg">Não consegui ler: ${esc(e.message)}</span>`)}
}
