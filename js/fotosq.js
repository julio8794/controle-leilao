/* ---------- fila de fotos (funciona sem internet) ---------- */
const FQ={_db:null,
  open(){return this._db||(this._db=new Promise((res,rej)=>{const r=indexedDB.open("leilaoFotos",1);r.onupgradeneeded=()=>r.result.createObjectStore("q",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
  async tx(mode,fn){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction("q",mode);const st=t.objectStore("q");const out=fn(st);t.oncomplete=()=>res(out&&out.result!==undefined?out.result:out);t.onerror=()=>rej(t.error)})},
  add(rec){return this.tx("readwrite",st=>st.put(rec))},
  del(id){return this.tx("readwrite",st=>st.delete(id))},
  all(){return this.tx("readonly",st=>st.getAll())}
};
let fqUrls={},fqBusy=false;
async function fqPendentes(vid){try{return (await FQ.all()).filter(r=>r.p===painelId&&r.vid===vid)}catch(e){return[]}}
async function enfileirarFotos(v,files,item){
  if(!canWrite)return;const st=$("#vfSt");let n=0;
  for(const f of files){try{const blob=await compress(f);await FQ.add({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),p:painelId,vid:v.id,item:item||null,blob,t:Date.now(),por:me&&me.id});n++}catch(e){toast("Foto inválida: "+(e.message||e))}}
  if(st)st.textContent=n?`📷 ${n} foto(s) ${navigator.onLine?"enviando…":"guardada(s) — envio quando o sinal voltar"}`:"";
  if(editing===v)renderVF();processFQ();
}
async function processFQ(){
  if(fqBusy||!sb||!me||!navigator.onLine)return;fqBusy=true;
  try{const recs=await FQ.all();
    for(const r of recs){
      const path=`${r.p}/${r.vid}/${r.id}.jpg`;
      const up=await sb.storage.from("vistorias").upload(path,r.blob,{contentType:"image/jpeg",upsert:true});
      if(up.error&&!/exists/i.test(up.error.message)){if(/row-level|permission|not allowed/i.test(up.error.message)){await FQ.del(r.id);toast("Sem permissão para enviar fotos")}continue}
      const url=sb.storage.from("vistorias").getPublicUrl(path).data.publicUrl;
      const foto={url,path,t:r.t,por:r.por,item:r.item};
      const {data,error}=await sb.rpc("adicionar_foto",{p_painel:r.p,p_id:r.vid,p_foto:foto});
      if(error)continue;
      await FQ.del(r.id);if(fqUrls[r.id]){URL.revokeObjectURL(fqUrls[r.id]);delete fqUrls[r.id]}
      if(r.p===painelId){srv[r.vid]=data;const v=vehicles.find(x=>x.id===r.vid);if(v)v.fotosVist=data.fotosVist||[];if(editing&&editing.id===r.vid){editing.fotosVist=data.fotosVist||[];renderVF()}}
    }
    const rest=(await FQ.all()).length;const st=$("#vfSt");if(st&&!rest)st.textContent="✓ Fotos enviadas";
  }catch(e){}finally{fqBusy=false}
}
async function removerFoto(v,path){
  const {data,error}=await sb.rpc("remover_foto",{p_painel:painelId,p_id:v.id,p_path:path});
  if(error)return toast("Erro: "+error.message);sb.storage.from("vistorias").remove([path]);
  srv[v.id]=data;v.fotosVist=data.fotosVist||[];if(editing===v)renderVF();
}
setInterval(processFQ,30000);window.addEventListener("online",processFQ);
