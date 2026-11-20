// Supabase Edge Function "ia" — Controle de Leilão
// Segredos necessários: OPENAI_API_KEY. Opcional: OPENAI_MODEL (padrão gpt-5.5), IA_LIMITE_DIA (padrão 150).
// Regras de cada ação: ai/skills/*.md no repositório.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.5";
const LIMITE = Number(Deno.env.get("IA_LIMITE_DIA") || 150);
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const erro = (m: string, s = 400) => json({ erro: m }, s);

// ---------- preços (US$ por 1 milhão de tokens: entrada, entrada em cache, saída) ----------
// Fonte: developers.openai.com/api/docs/pricing (nov/2026). Atualize aqui se a OpenAI mudar.
const PRECOS: [RegExp, number, number, number][] = [
  [/^gpt-6\.2-astra/, 8, 0.40, 40], [/^gpt-6\.2-sol/, 2, 0.10, 10], [/^gpt-6-astra/, 10, 1, 50], [/^gpt-6\.1-sol/, 2, 0.10, 10], [/^gpt-6\.1-terra/, 1, 0.05, 5],
  [/^gpt-6-luna/, 0.10, 0.01, 0.50], [/^gpt-6-sol/, 2, 0.20, 10], [/^gpt-5\.6-sol/, 4, 0.40, 20], [/^gpt-5\.6-luna/, 0.20, 0.02, 1.20], [/^gpt-5\.5-pro/, 30, 30, 180], [/^gpt-5\.5/, 5, 0.50, 30],
  [/^gpt-5\.4-mini/, 0.75, 0.075, 4.5], [/^gpt-5\.4-nano/, 0.20, 0.02, 1.25], [/^gpt-5\.4/, 2.5, 0.25, 15], [/^gpt-5-mini/, 0.25, 0.025, 2], [/^gpt-5-nano/, 0.05, 0.005, 0.40], [/^gpt-5/, 1.25, 0.125, 10],
];
function custoUSD(modelo: string, entrada: number, cache: number, saida: number) {
  const p = PRECOS.find(([re]) => re.test(String(modelo || ""))); if (!p) return null;
  return ((Math.max(0, entrada - cache)) * p[1] + cache * p[2] + saida * p[3]) / 1e6;
}
// ---------- utilidades de verificação ----------
const norm = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%,.$]+/g, " ").replace(/\s+/g, " ").trim();
const digitos = (s: string) => String(s || "").replace(/\D/g, "");
function trechoExiste(fonteN: string, trecho: string | null) {
  if (!trecho) return false; const t = norm(trecho); if (t.length < 4) return false;
  if (fonteN.includes(t)) return true;
  // tolera reticências/quebras: todas as partes longas precisam existir em ordem
  const partes = t.split(/\s*\.\.\.\s*|\s*…\s*/).filter(p => p.length >= 6); if (!partes.length) return false;
  let i = 0; for (const p of partes) { const j = fonteN.indexOf(p, i); if (j < 0) return false; i = j + p.length } return true;
}
function numeroNoTrecho(valor: unknown, trecho: string | null) {
  if (valor === null || valor === undefined || !trecho) return false; if (typeof valor !== "number") return true;
  const d = digitos(trecho); const inteiro = String(Math.trunc(valor)); const cent = Math.round(valor * 100).toString();
  if (d.includes(cent) || d.includes(inteiro)) return true;
  const ext: Record<number, string[]> = { 1: ["um", "uma"], 2: ["dois", "duas"], 3: ["tres"], 4: ["quatro"], 5: ["cinco"], 10: ["dez"], 15: ["quinze"], 20: ["vinte"], 24: ["vinte e quatro"], 30: ["trinta"], 48: ["quarenta e oito"], 60: ["sessenta"], 72: ["setenta e dois", "tres dias", "3 dias"], 90: ["noventa"] };
  return (ext[valor] || []).some(w => norm(trecho).includes(w));
}
function verificar(campo: any, fonteN: string) {
  if (!campo || campo.valor === null || campo.valor === undefined || campo.valor === "") return { ...campo, valor: null, verificado: false, motivo: "não encontrado na fonte" };
  const ok = trechoExiste(fonteN, campo.trecho); const okN = ok && numeroNoTrecho(campo.valor, campo.trecho);
  return { ...campo, verificado: ok && okN, motivo: !ok ? "trecho não localizado na fonte" : !okN ? "número não aparece no trecho" : null };
}
function urlSegura(u: string) {
  let x: URL; try { x = new URL(u) } catch { return null }
  if (!/^https?:$/.test(x.protocol)) return null; const h = x.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.includes(":") || /^\d+$/.test(h)) return null;
  return x;
}
async function baixar(u: string, max: number) {
  const x = urlSegura(u); if (!x) throw new Error("Link inválido");
  const r = await fetch(x, { headers: { "User-Agent": "Mozilla/5.0 (ControleLeilao)" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`O site respondeu ${r.status}`);
  const b = new Uint8Array(await r.arrayBuffer()); if (b.length > max) throw new Error("Arquivo grande demais");
  return { bytes: b, tipo: r.headers.get("content-type") || "", url: r.url };
}

// ---------- OpenAI (Responses API, saída estrita) ----------
// Agentes publicados na plataforma da OpenAI (Respostas → Prompts). Instruções em ai/agentes/p_*.txt.
const AGENTES: Record<string, { prompt: string; modelo: string }> = {
  ler_edital: { prompt: Deno.env.get("PROMPT_LER_EDITAL") || "pmpt_6aff950fd0f481948847945c280c1361055ffbbf3d8005b4", modelo: "gpt-6.2-sol" },
  importar_lote: { prompt: Deno.env.get("PROMPT_IMPORTAR_LOTE") || "pmpt_6aff9564f2f4819087db1d058af07710078f2f34ff066db9", modelo: "gpt-6-luna" },
  analisar_fotos: { prompt: Deno.env.get("PROMPT_ANALISAR_FOTOS") || "pmpt_6aff95809a1c8194b72e09a85b69480003274924a703d52b", modelo: "gpt-6.2-sol" },
  escolher_fipe: { prompt: Deno.env.get("PROMPT_ESCOLHER_FIPE") || "", modelo: "gpt-6-luna" },
  mapear_planilha: { prompt: Deno.env.get("PROMPT_MAPEAR_PLANILHA") || "pmpt_6aff959a109c819392d43d4ef4c665bb025bc8d8b650f83b", modelo: "gpt-6-luna" },
};
let AGENTE_ATUAL = "";
async function openai(system: string, content: any[], nome: string, schema: any, vars?: Record<string, string>) {
  const ag = AGENTES[AGENTE_ATUAL];
  if (ag?.prompt) {
    try { return await chamarOpenAI({ prompt: { id: ag.prompt, ...(vars ? { variables: vars } : {}) }, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: nome, strict: true, schema } } }) }
    catch (e) { if (!/prompt|not found|404/i.test(String((e as Error).message))) throw e; console.warn("agente indisponível, usando instruções locais:", (e as Error).message) }
  }
  return await chamarOpenAI({ model: Deno.env.get("OPENAI_MODEL") || ag?.modelo || MODEL, input: [{ role: "system", content: [{ type: "input_text", text: system }] }, { role: "user", content }], text: { format: { type: "json_schema", name: nome, strict: true, schema } } });
}
async function chamarOpenAI(corpo: any) {
  const key = Deno.env.get("OPENAI_API_KEY") || Object.values(Deno.env.toObject()).find(v => /^sk-[A-Za-z0-9_-]{20,}/.test(String(v).trim()))?.trim(); if (!key) throw new Error("Chave da OpenAI não configurada no Supabase (OPENAI_API_KEY)");
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(140000),
    body: JSON.stringify(corpo)
  });
  const d = await r.json(); if (!r.ok) throw new Error("OpenAI: " + (d?.error?.message || r.status));
  let txt = ""; for (const o of d.output || []) for (const c of o.content || []) { if (c.type === "refusal") throw new Error("A IA recusou: " + c.refusal); if (c.type === "output_text") txt += c.text }
  if (!txt) throw new Error("Resposta vazia da IA");
  return { dados: JSON.parse(txt), uso: { entrada: d.usage?.input_tokens || 0, cache: d.usage?.input_tokens_details?.cached_tokens || 0, saida: d.usage?.output_tokens || 0, modelo: d.model || MODEL, agente: corpo.prompt ? "plataforma" : "local" } };
}
const N = (t: string[]) => ({ type: [...t, "null"] });
const campo = (tipo: string) => ({ type: "object", additionalProperties: false, required: ["valor", "trecho", "pagina"], properties: { valor: N([tipo]), trecho: N(["string"]), pagina: N(["integer"]) } });
const obj = (props: Record<string, any>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });

const REGRAS_GERAIS = `Você é um extrator de dados para um sistema de controle de leilões de motos e carros no Brasil.
REGRAS INVIOLÁVEIS:
1. Extraia SOMENTE o que está escrito na fonte fornecida. Nunca use conhecimento externo, médias de mercado, valores de outros editais ou suposições.
2. Se a informação não estiver na fonte, devolva valor null e trecho null. Null é a resposta correta quando não há o dado.
3. "trecho" deve ser cópia LITERAL e contígua da fonte (até 300 caracteres), sem reescrever, contendo o número extraído.
4. "pagina" é o número indicado no marcador [[página N]] onde o trecho está (null se não houver marcadores).
5. Não arredonde nem converta valores, exceto as conversões pedidas explicitamente no campo.
6. Responda apenas no formato JSON exigido.`;

// ---------- texto do PDF (sem IA) ----------
async function textoPdf(url: string) {
  const { bytes } = await baixar(url, 20e6); const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false }); return (text as string[]);
}
// ---------- Anexo I: tabela de lotes (leitura determinística, sem IA) ----------
function lerAnexoLotes(paginas: string[]) {
  const COMB = "ALCOOL\\/GASOLINA\\/\\s?GNV|GASOLINA\\/ALCOOL\\/\\s?GNV|ALCOOL\\/GASOLINA|GASOLINA\\/ALCOOL|GASOLINA\\/ELETRICO|GASOLINA|ALCOOL|ETANOL|FLEX|DIESEL|ELETRICO|ELÉTRICO|GNV|N\\/I";
  const out: any[] = [], falhas: any[] = []; let patio = "";
  let corpo = "";
  for (const l of paginas.join("\n").split("\n")) {
    const m = l.trim(); if (/^ANEXO\b/i.test(m)) continue;
    if (/^[A-ZÀ-Ú\/ ]{4,40}$/.test(m) && !/^(VEÍCULO|VEICULO|CONSERVADO|SUCATA|SIM|NÃO|NAO|LOTE|PLACA|O\/LANCE|MÍNIMO|MINIMO|NAÇÃO|CLASSIFICAÇÃO|AVALIAÇÃ|TAXA\/|DESALIE)/.test(m) && !/PÁGINA|EDITAL/.test(m)) { corpo += `\n@@PATIO ${m}\n`; continue }
    if (/EDITAL DE LEILÃO|^LOTE PLACA|^TAXA\/|^DESALIE|^NAÇÃO|^CLASSIFICAÇÃO|^AVALIAÇÃ|^O\/LANCE|^MÍNIMO$/.test(m)) continue;
    corpo += " " + m;
  }
  const partes = corpo.split(/(?=@@PATIO )|(?=(?:^|\s)\d{4}\s+(?:[A-Z]{3}\d[A-Z0-9]\d{2}|\d\s+EMPLAC|SEM\s+PLACA|N\/I)\s)/);
  const re = new RegExp(`^\\s*(\\d{4})\\s+([A-Z]{3}\\d[A-Z0-9]\\d{2}|\\d\\s+EMPLAC|SEM\\s+PLACA|N\\/I)\\s+([A-HJ-NPR-Z0-9]{17}|N\\/I)\\s+(.+?)\\s+(\\d{6,11}|N\\/I)\\s+([A-Z]{2}|N\\/I)\\s+(.+?)\\s+(\\d{4}\\/\\d{4}|N\\/I)\\s+(${COMB})\\s+(.+?)\\s+(SIM|NÃO|NAO)\\s+(.+?)\\s+R\\$\\s*([\\d.]+,\\d{2})`, "i");
  for (const p of partes) {
    const s = p.replace(/\s+/g, " ").trim(); if (!s) continue;
    if (s.startsWith("@@PATIO ")) { patio = s.slice(8).replace(/^.*R\$\s*[\d.,]+\s*/, "").trim(); continue }
    if (!/^\d{4}\s/.test(s)) continue;
    const m = s.match(re); if (!m) { falhas.push({ patio, texto: s.slice(0, 260) }); continue }
    const [, lote, placa, chassi, modelo, renavam, uf, cor, ano, comb, motor, desal, classif, valor] = m;
    out.push({ patio, lote, placa: /EMPLAC|SEM|N\/I/.test(placa) ? "" : placa, semPlaca: /EMPLAC|SEM/.test(placa), chassi: chassi === "N/I" ? "" : chassi, modelo: modelo.trim(), renavam: renavam === "N/I" ? "" : renavam, uf: uf === "N/I" ? "" : uf, cor: cor.trim(), ano: ano === "N/I" ? "" : ano, combustivel: comb.replace(/\s+/g, ""), motor: motor.replace(/\s+/g, ""), desalienacao: /SIM/i.test(desal), classificacao: classif.trim(), lanceMin: Number(valor.replace(/\./g, "").replace(",", ".")), linha: s.slice(0, 300) });
  }
  return { lotes: out, falhas };
}
async function escolherFipe(veiculo: string, ano: string, candidatos: string[]) {
  const c = (candidatos || []).slice(0, 12).map(String);
  const schema = obj({ indice: N(["integer"]), motivo: { type: "string" } });
  const instr = `Você casa o nome de um veículo do DETRAN/leiloeiro com o modelo da TABELA FIPE.
Escolha o índice (0 a ${c.length - 1}) do candidato que é a MESMA versão (mesma cilindrada, mesma linha/versão, ex.: FAN, TITAN, START, CARGO, ES/ESD/EX). Use somente a lista. Se nenhum for claramente a mesma versão, ou se houver empate real, devolva indice null. motivo: 1 frase.`;
  const { dados, uso } = await openai(instr, [{ type: "input_text", text: JSON.stringify({ veiculo, ano, candidatos: c.map((n, i) => `${i}: ${n}`) }) }], "escolha_fipe", schema);
  const i = dados.indice; return { resultado: { indice: Number.isInteger(i) && i >= 0 && i < c.length ? i : null, motivo: dados.motivo }, uso };
}
// ---------- skills ----------
async function lerEdital(url: string) {
  const { bytes } = await baixar(url, 20e6);
  let texto = ""; try { const pdf = await getDocumentProxy(bytes); const { text } = await extractText(pdf, { mergePages: false }); texto = (text as string[]).map((t, i) => `[[página ${i + 1}]]\n${t}`).join("\n\n") } catch (_) { texto = "" }
  const escaneado = texto.replace(/\[\[página \d+\]\]/g, "").trim().length < 200;
  const schema = obj({
    comissaoPct: campo("number"), taxaAdmPct: campo("number"),
    taxasFixas: { type: "array", items: obj({ nome: { type: "string" }, valor: { type: "number" }, trecho: { type: "string" }, pagina: N(["integer"]) }) },
    prazoPagamentoH: campo("number"), liberacaoDias: campo("number"), prazoTransferenciaDias: campo("number"), diasCarencia: campo("number"), estadiaDia: campo("number"),
    data_leilao: campo("string"), leiloeiro: campo("string"), comitente: campo("string"), cidade: campo("string"),
    debitos: campo("string"), regras: campo("string"), obs: { type: "array", items: { type: "string" } }
  });
  const instr = `${REGRAS_GERAIS}
TAREFA: ler o EDITAL de leilão e extrair as custas e prazos que o arrematante paga/cumpre.
- comissaoPct: comissão do leiloeiro em % sobre o valor do arremate (ex.: "5% (cinco por cento)" → 5).
- taxaAdmPct: taxa administrativa / de serviço em % (só se for percentual).
- taxasFixas: taxas cobradas em R$ por lote (ex.: taxa de remoção, taxa de pátio fixa, taxa administrativa em R$). Uma entrada por taxa.
- prazoPagamentoH: prazo para pagar o arremate, em HORAS (dias corridos × 24; "dias úteis": converta ×24 e registre isso em obs).
- liberacaoDias: em quantos dias após o leilão o veículo é liberado para retirada.
- prazoTransferenciaDias: prazo para o arrematante transferir o veículo.
- diasCarencia / estadiaDia: dias sem cobrança de estadia e valor da diária em R$ após isso.
- data_leilao no formato AAAA-MM-DD (data da sessão/encerramento).
- debitos: quem responde por IPVA, multas, licenciamento, estadia e outros débitos (resumo fiel, valor = texto curto).
- regras: retirada, circulação, documentação e transferência (resumo fiel, valor = texto curto).
- NÃO preencha custos de vistoria, transferência ou despachante cobrados por terceiros, pois não fazem parte do edital.
- obs: avisos curtos sobre conversões feitas ou ambiguidades encontradas.`;
  // economia: manda só as páginas que tratam de custas/prazos (a verificação continua sobre o texto inteiro)
  const CHAVE = /comiss[aã]o|taxa administrativa|taxa de|prazo de|pagamento|retirad|liberad|transfer[eê]ncia|estadia|di[aá]ria|d[eé]bitos?|ipva|multas?\b|remo[cç][aã]o|guincho/gi;
  const paginas = texto.split(/(?=\[\[página \d+\]\])/).filter(Boolean);
  // páginas com densidade mínima de termos de custas/prazos (+ as 2 primeiras, com data e partes)
  const relevantes = paginas.filter((p, i) => i < 2 || (p.match(CHAVE) || []).length >= 3);
  const enviado = (relevantes.length ? relevantes : paginas).join("\n\n").slice(0, 120000);
  const content = escaneado
    ? [{ type: "input_file", filename: "edital.pdf", file_data: "data:application/pdf;base64," + b64(bytes) }, { type: "input_text", text: instr }]
    : [{ type: "input_text", text: "FONTE (texto do edital):\n" + enviado }];
  const { dados, uso } = await openai(escaneado ? REGRAS_GERAIS : instr, content, "edital", schema);
  const fonteN = norm(texto);
  const out: any = { escaneado, paginas: (texto.match(/\[\[página/g) || []).length, paginas_enviadas: escaneado ? null : relevantes.length, obs: dados.obs || [] };
  for (const k of ["comissaoPct", "taxaAdmPct", "prazoPagamentoH", "liberacaoDias", "prazoTransferenciaDias", "diasCarencia", "estadiaDia", "data_leilao", "leiloeiro", "comitente", "cidade", "debitos", "regras"]) {
    const c = dados[k]; out[k] = escaneado ? { ...c, verificado: false, motivo: "PDF escaneado: confira no edital" } : (["debitos", "regras", "leiloeiro", "comitente", "cidade"].includes(k) ? { ...c, verificado: c?.valor ? trechoExiste(fonteN, c.trecho) : false } : verificar(c, fonteN));
  }
  if (out.data_leilao?.valor && !/^\d{4}-\d{2}-\d{2}$/.test(out.data_leilao.valor)) out.data_leilao = { ...out.data_leilao, valor: null, verificado: false, motivo: "data em formato inválido" };
  out.taxasFixas = (dados.taxasFixas || []).map((t: any) => ({ ...t, ...(escaneado ? { verificado: false } : verificar({ valor: t.valor, trecho: t.trecho }, fonteN)), valor: t.valor }));
  return { resultado: out, uso };
}
// ---------- lote estruturado (JSON embutido na página; sem IA) ----------
function fimObjeto(s: string, i: number) { let d = 0, str = false; for (let k = i; k < s.length; k++) { const c = s[k]; if (str) { if (c === "\\") { k++; continue } if (c === '"') str = false; continue } if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (!d) return k + 1 } } return -1 }
function loteEstruturado(html: string, url: string) {
  const h = html.replace(/\\\\u([0-9a-f]{4})/gi, "\\u$1").replace(/\\\\"/g, '"').replace(/\\"/g, '"');
  const slug = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
  let L: any = null; let pos = 0;
  while ((pos = h.indexOf('{"lot":{"id"', pos)) >= 0) { const e = fimObjeto(h, pos); if (e < 0) break; try { const o = JSON.parse(h.slice(pos, e)).lot; if (o && (o.slug === slug || !L)) { L = o; if (o.slug === slug) break } } catch (_) { } pos = e }
  if (!L || (L.slug && slug && L.slug !== slug)) return null;
  const v = (x: any) => x === null || x === undefined || x === "" ? null : x;
  const c = (valor: any) => ({ valor: v(valor), trecho: v(valor) == null ? null : String(valor), pagina: null, verificado: v(valor) != null, fonte: "registro do lote na página" });
  const titulo = String(L.title || ""); const mt = titulo.match(/^(.*?)\s*([A-Z0-9]+\/\S.*?)\s+-\s+(\d{4}\/\d{4})\s*$/);
  const n = (x: any) => { const k = Number(String(x ?? "").replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(k) && k > 0 ? k : null };
  const lances = (L.bids || []).map((b: any) => n(b.value ?? b.amount ?? b.bid)).filter(Boolean) as number[];
  const A = L.auction || {}; const datas = Object.entries(A).filter(([k, x]) => /date|closing|opening|start|end/i.test(k) && typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x as string)).map(([, x]) => String(x).slice(0, 10)).sort();
  const limpa = (t: any) => v(String(t || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
  const fotos = (L.images || []).map((i: any) => i?.image?.origin || (i?.image?.filename ? new URL("/lotes/fotos/" + i.image.filename, "https://nordesteleiloes-files.s3.amazonaws.com").href : null)).filter(Boolean);
  const pdfs = [...JSON.stringify(A).matchAll(/https?:\/\/[^"\s]+?\.pdf/gi)].map(m => m[0]);
  return {
    fotos, editaisLote: pdfs,
    campos: {
      modelo: c(mt ? mt[2] : (L.carBrand?.name ? null : null)), marca: c(L.carBrand?.name), ano: c(L.year || (mt && mt[3])), cor: c(L.color), placa_final: c(L.plate), chassi: c(L.chassi),
      renavam: c(L.renavam), motor: c(L.engine), combustivel: c(L.gas), km: c(null), lote: c(L.numberCode != null ? String(L.numberCode).padStart(3, "0") : null),
      lance_minimo: c(n(L.minimunSale) ?? n(L.avaliation) ?? n(L.initialBid)), lance_atual: c(lances.length ? Math.max(...lances) : null),
      data_leilao: c(datas[datas.length - 1] || null), leiloeiro: c(A.auctioneer?.name), comitente: c(A.comitent?.name || A.committent?.name || A.seller?.name), cidade: c(L.city), uf: c(L.state),
      situacao: c(mt ? mt[1] : null), observacoes: c(limpa(L.observation) || limpa(L.description)),
    }
  };
}
async function importarLote(url: string) {
  const { bytes, url: final } = await baixar(url, 6e6);
  const html = new TextDecoder().decode(bytes);
  const meuSlug = decodeURIComponent(new URL(final).pathname.split("/").filter(Boolean).pop() || "");
  let corte = html.length; for (const m of html.matchAll(/href=["']([^"']*\/lotes?\/[^"'#?]+)["']/gi)) { const sl = decodeURIComponent(m[1].split("/").filter(Boolean).pop() || ""); if (sl && sl !== meuSlug) { corte = m.index!; break } }
  const fotos = new Set<string>(); const abs = (u: string) => { try { return new URL(u.replace(/&amp;/g, "&"), final).href } catch { return null } };
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/gi)) { const a = abs(m[1]); if (a) fotos.add(a) }
  for (const m of html.matchAll(/(?:src|data-src|href)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) { if (m.index! > corte) continue; const a = abs(m[1]); if (a && !/logo|icon|sprite|banner|avatar|whats|placeholder/i.test(a)) fotos.add(a) }
  // fotos carregadas por JSON/JS (URLs soltas, inclusive com barras escapadas)
  const h2 = html.replace(/\\\//g, "/"); let corte2 = h2.length; for (const m of h2.matchAll(/href=["']([^"']*\/lotes?\/[^"'#?]+)["']/gi)) { const sl = decodeURIComponent(m[1].split("/").filter(Boolean).pop() || ""); if (sl && sl !== meuSlug) { corte2 = m.index!; break } }
  for (const m of h2.matchAll(/https?:\/\/[^"'\s<>()]+?\.(?:jpe?g|png|webp)(?:\?[^"'\s<>()]*)?/gi)) { if (m.index! > corte2) continue; const a = abs(m[0]); if (a && !/logo|icon|sprite|banner|avatar|whats|placeholder|thumb_?s?mall|comitente/i.test(a)) fotos.add(a) }
  // PDFs da página (edital primeiro) — extração por código, sem IA
  const pdfs: { url: string; txt: string }[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+?\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) { const a = abs(m[1]); if (a) pdfs.push({ url: a, txt: m[2].replace(/<[^>]+>/g, " ").trim() }) }
  for (const m of html.replace(/\\\//g, "/").matchAll(/https?:\/\/[^"'\s<>()]+?\.pdf(?:\?[^"'\s<>()]*)?/gi)) { const a = abs(m[0]); if (a && !pdfs.some(p => p.url === a)) pdfs.push({ url: a, txt: "" }) }
  const est = loteEstruturado(html, final);
  const editais = [...new Set([...(est?.editaisLote || []), ...pdfs.sort((x, y) => (/edital/i.test(y.url + y.txt) ? 1 : 0) - (/edital/i.test(x.url + x.txt) ? 1 : 0)).map(p => p.url)])].slice(0, 5);
  if (est && est.campos.modelo.valor) return { resultado: { ...est.campos, fotos: est.fotos, editais, url: final, estruturado: true }, uso: { entrada: 0, cache: 0, saida: 0, modelo: "sem IA (registro do lote)", agente: "codigo" } };
  const texto = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 60000);
  const props: Record<string, any> = {}; ["modelo", "marca", "ano", "cor", "placa_final", "chassi", "lote", "data_leilao", "leiloeiro", "comitente", "situacao", "observacoes"].forEach(k => props[k] = campo("string")); ["km", "lance_minimo", "lance_atual"].forEach(k => props[k] = campo("number"));
  const instr = `${REGRAS_GERAIS}
TAREFA: extrair os dados do LOTE desta página de leiloeiro.
- modelo: como escrito (ex.: "HONDA/CG 160 FAN"). ano: como escrito (ex.: "2016/2016").
- lance_minimo / lance_atual em reais (número). data_leilao em AAAA-MM-DD.
- situacao: a classificação do site (ex.: "conservado", "sucata", "recuperável", "documentável").
- NÃO estime FIPE, preço de venda ou estado mecânico.`;
  const { dados, uso } = await openai(instr, [{ type: "input_text", text: "FONTE (texto da página):\n" + texto }], "lote", obj(props));
  const fonteN = norm(texto); const out: any = {};
  for (const k of Object.keys(props)) out[k] = ["km", "lance_minimo", "lance_atual"].includes(k) ? verificar(dados[k], fonteN) : { ...dados[k], verificado: dados[k]?.valor ? trechoExiste(fonteN, dados[k].trecho) : false };
  if (out.data_leilao?.valor && !/^\d{4}-\d{2}-\d{2}$/.test(out.data_leilao.valor)) out.data_leilao.verificado = false;
  return { resultado: { ...out, fotos: [...fotos].slice(0, 12), editais, url: final }, uso };
}
async function analisarFotos(imagens: string[], modelo: string, ano: string, base: string[]) {
  const imgs = (imagens || []).filter(u => urlSegura(u) || /^data:image\//.test(u)).slice(0, 8); if (!imgs.length) throw new Error("Nenhuma foto válida");
  const schema = obj({
    itens: { type: "array", items: obj({ peca: { type: "string" }, categoria: { type: "string", enum: ["estetica", "mecanica", "documentacao", "outros"] }, gravidade: { type: "string", enum: ["leve", "media", "grave"] }, foto: { type: "integer" }, evidencia: { type: "string" }, confianca: { type: "number" }, nome_base: N(["string"]) }) },
    nao_avaliavel: { type: "array", items: { type: "string" } }, resumo: { type: "string" }
  });
  const instr = `Você é um vistoriador de motos/carros de leilão no Brasil analisando FOTOS.
REGRAS INVIOLÁVEIS:
1. Liste apenas danos, peças faltando ou desgastes VISÍVEIS nas fotos. Cada item precisa de evidência concreta ("foto 2: retrovisor esquerdo ausente").
2. "foto" é o índice (1 a ${imgs.length}) da foto onde o problema aparece.
3. Não liste nada que não se vê (motor, elétrica, embreagem, documentação): coloque em "nao_avaliavel".
4. Não informe preços.
5. "nome_base": se a peça corresponder a um nome desta lista do painel, copie o nome exato; senão null. Lista: ${JSON.stringify((base || []).slice(0, 200))}
6. confianca entre 0 e 1. Em dúvida, confiança baixa. Nunca invente.
Veículo: ${modelo || "não informado"} ${ano || ""}.`;
  const content: any[] = [{ type: "input_text", text: `Veículo: ${modelo || "não informado"} ${ano || ""}\nLISTA_BASE: ${JSON.stringify((base || []).slice(0, 200))}` }, ...imgs.map((u, i) => [{ type: "input_text", text: `Foto ${i + 1}:` }, { type: "input_image", image_url: u, detail: "high" }]).flat()];
  const { dados, uso } = await openai(instr, content, "vistoria_fotos", schema);
  dados.itens = (dados.itens || []).filter((i: any) => i.foto >= 1 && i.foto <= imgs.length && i.evidencia && i.evidencia.length > 8).map((i: any) => ({ ...i, confianca: Math.max(0, Math.min(1, i.confianca)), nome_base: (base || []).includes(i.nome_base) ? i.nome_base : null }));
  return { resultado: dados, uso };
}
const CAMPOS_PLANILHA = ["modelo", "ano", "cor", "placa", "chassi", "km", "lote", "lanceMin", "lance", "fipe", "vendaPretendida", "vendaValor", "dataVenda", "dataLeilao", "leiloeiro", "link", "obs", "status"];
async function mapearPlanilha(cab: string[], amostra: any[][]) {
  const c = (cab || []).slice(0, 60).map(String);
  const schema = obj({ mapa: { type: "array", items: obj({ cabecalho: { type: "string" }, campo: { type: ["string", "null"], enum: [...CAMPOS_PLANILHA, null] } }) } });
  const instr = `Mapeie cabeçalhos de planilha de leilão de veículos para campos do sistema. Campos válidos: ${CAMPOS_PLANILHA.join(", ")}.
lanceMin = lance mínimo/inicial; lance = valor arrematado/pago; vendaPretendida = preço de venda pretendido; vendaValor = valor efetivamente vendido.
Use as linhas de amostra só para entender o significado. Em dúvida, campo null. Não repita um campo para dois cabeçalhos. Devolva um item por cabeçalho, com o texto exato.`;
  const { dados, uso } = await openai(instr, [{ type: "input_text", text: JSON.stringify({ cabecalhos: c, amostra: (amostra || []).slice(0, 5) }) }], "mapa_planilha", schema);
  const usados = new Set(); const mapa = (dados.mapa || []).filter((m: any) => c.includes(m.cabecalho)).map((m: any) => { if (m.campo && usados.has(m.campo)) return { ...m, campo: null }; usados.add(m.campo); return m });
  return { resultado: { mapa }, uso };
}
function b64(b: Uint8Array) { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s) }

// ---------- servidor ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro("Método inválido", 405);
  const auth = req.headers.get("Authorization") || ""; if (!auth) return erro("Entre na sua conta", 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, (Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY"))!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser(); if (!u?.user) return erro("Sessão expirada, entre de novo", 401);
  let body: any; try { body = await req.json() } catch { return erro("Pedido inválido") }
  const { acao, painel_id } = body || {}; if (!painel_id) return erro("Painel não informado");
  const { data: papel } = await sb.rpc("papel_no_painel", { p: painel_id });
  if (!["dono", "editor"].includes(papel)) return erro("Sem permissão para usar a IA neste painel", 403);
  const hoje = new Date(); hoje.setUTCHours(3, 0, 0, 0); if (hoje > new Date()) hoje.setUTCDate(hoje.getUTCDate() - 1);
  const { count } = await sb.from("ia_uso").select("id", { count: "exact", head: true }).eq("painel_id", painel_id).eq("origem", "ia").gte("criado_em", hoje.toISOString());
  if ((count || 0) >= LIMITE) return erro(`Limite diário de ${LIMITE} usos da IA atingido`, 429);
  const t0 = Date.now(); AGENTE_ATUAL = acao;
  const chave = ["ler_edital", "importar_lote"].includes(acao) && body.url ? acao + ":v3:" + body.url : null;
  if (chave && !body.refazer) { const { data: c } = await sb.from("ia_cache").select("resultado").eq("painel_id", painel_id).eq("chave", chave).gte("criado_em", new Date(Date.now() - 30 * 864e5).toISOString()).maybeSingle(); if (c) { await sb.from("ia_uso").insert({ painel_id, user_id: u.user.id, acao, modelo: "cache", custo_usd: 0, origem: "cache", ref: String(body.url).slice(0, 300), ms: Date.now() - t0, ok: true }); return json({ ...c.resultado, _cache: true, _uso: { custo_usd: 0, agente: "cache" } }) } }
  try {
    let r: any;
    if (acao === "paginas_edital") { const ps = await textoPdf(body.url); const re = new RegExp(body.filtro || "chassi|renavam|placa", "i"); return json({ total: ps.length, paginas: ps.map((t, i) => ({ n: i + 1, t })).filter(p => re.test(p.t)).map(p => ({ ...p, t: p.t.slice(0, body.max || 6000) })) }) }
    if (acao === "lotes_edital") { const ps = await textoPdf(body.url); const x = lerAnexoLotes(ps); await sb.from("ia_uso").insert({ painel_id, user_id: u.user.id, acao, modelo: "sem IA (Anexo I)", custo_usd: 0, origem: "codigo", ref: String(body.url).slice(0, 300), ms: Date.now() - t0, ok: true }); return json({ paginas: ps.length, ...x, _uso: { custo_usd: 0, agente: "codigo" } }) }
    if (acao === "ler_edital") r = await lerEdital(body.url);
    else if (acao === "escolher_fipe") r = await escolherFipe(body.veiculo, body.ano, body.candidatos);
    else if (acao === "importar_lote") r = await importarLote(body.url);
    else if (acao === "analisar_fotos") r = await analisarFotos(body.imagens, body.modelo, body.ano, body.base);
    else if (acao === "mapear_planilha") r = await mapearPlanilha(body.cabecalhos, body.amostra);
    else return erro("Ação desconhecida");
    const custo = r.uso.agente === "codigo" ? 0 : custoUSD(r.uso.modelo, r.uso.entrada, r.uso.cache || 0, r.uso.saida);
    r.uso.custo_usd = custo;
    await sb.from("ia_uso").insert({ painel_id, user_id: u.user.id, acao, modelo: r.uso.modelo, tokens_in: r.uso.entrada, tokens_cache: r.uso.cache || 0, tokens_out: r.uso.saida, custo_usd: custo, origem: r.uso.agente === "codigo" ? "codigo" : "ia", ref: String(body.ref || body.url || "").slice(0, 300) || null, ms: Date.now() - t0, ok: true });
    if (chave) await sb.from("ia_cache").upsert({ painel_id, chave, resultado: r.resultado, criado_em: new Date().toISOString() });
    return json({ ...r.resultado, _uso: r.uso });
  } catch (e) {
    await sb.from("ia_uso").insert({ painel_id, user_id: u.user.id, acao, modelo: (AGENTES[acao] || {}).modelo || MODEL, custo_usd: 0, origem: "erro", ref: String(body.ref || body.url || "").slice(0, 300) || null, ms: Date.now() - t0, ok: false, erro: String((e as Error).message).slice(0, 300) });
    return erro((e as Error).message || "Falha", 502);
  }
});
