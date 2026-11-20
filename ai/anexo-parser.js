// Leitor determinístico do Anexo I (tabela de lotes) de editais DETRAN. Sem IA.
function lerAnexoLotes(paginas){
  const COMB="ALCOOL\\/GASOLINA|GASOLINA\\/ALCOOL|GASOLINA\\/ELETRICO|GASOLINA|ALCOOL|ETANOL|FLEX|DIESEL|ELETRICO|ELÉTRICO|GNV|N\\/I";
  const out=[],falhas=[];let patio="";
  const txt=paginas.map(p=>p.t).join("\n");
  // pátio: linha só com nome em maiúsculas logo após "ANEXO"
  const linhas=txt.split("\n");
  // junta tudo e separa por início de lote (4 dígitos + espaço + placa/emplac)
  let corpo="";for(const l of linhas){const m=l.trim();if(/^ANEXO\b/i.test(m))continue;
    if(/^[A-ZÀ-Ú ]{4,40}$/.test(m)&&!/^(VEÍCULO|VEICULO|CONSERVADO|SUCATA|SIM|NÃO|NAO|LOTE|PLACA|O\/LANCE|MÍNIMO|MINIMO|NAÇÃO|CLASSIFICAÇÃO|AVALIAÇÃ|TAXA\/|DESALIE)/.test(m)&&!/PÁGINA|EDITAL/.test(m)){corpo+=`\n@@PATIO ${m}\n`;continue}
    if(/EDITAL DE LEILÃO|^LOTE PLACA|^TAXA\/|^DESALIE|^NAÇÃO|^CLASSIFICAÇÃO|^AVALIAÇÃ|^O\/LANCE|^MÍNIMO$/.test(m))continue;
    corpo+=" "+m}
  const partes=corpo.split(/(?=@@PATIO )|(?=(?:^|\s)\d{4}\s+(?:[A-Z]{3}\d[A-Z0-9]\d{2}|\d\s+EMPLAC|SEM\s+PLACA|N\/I)\s)/);
  const re=new RegExp(`^\\s*(\\d{4})\\s+([A-Z]{3}\\d[A-Z0-9]\\d{2}|\\d\\s+EMPLAC|SEM\\s+PLACA|N\\/I)\\s+([A-HJ-NPR-Z0-9]{17}|N\\/I)\\s+(.+?)\\s+(\\d{6,11}|N\\/I)\\s+([A-Z]{2}|N\\/I)\\s+(.+?)\\s+(\\d{4}\\/\\d{4}|N\\/I)\\s+(${COMB})\\s+(.+?)\\s+(SIM|NÃO|NAO)\\s+(.+?)\\s+R\\$\\s*([\\d.]+,\\d{2})`,"i");
  for(const p of partes){const s=p.replace(/\s+/g," ").trim();if(!s)continue;
    if(s.startsWith("@@PATIO ")){patio=s.slice(8).trim();continue}
    if(!/^\d{4}\s/.test(s))continue;
    const m=s.match(re);
    if(!m){falhas.push({patio,texto:s.slice(0,260)});continue}
    const [,lote,placa,chassi,modelo,renavam,uf,cor,ano,comb,motor,desal,classif,valor]=m;
    out.push({patio,lote,placa:/EMPLAC|SEM|N\/I/.test(placa)?"":placa,semPlaca:/EMPLAC|SEM/.test(placa),chassi:chassi==="N/I"?"":chassi,modelo:modelo.trim(),renavam:renavam==="N/I"?"":renavam,uf:uf==="N/I"?"":uf,cor:cor.trim(),ano:ano==="N/I"?"":ano,combustivel:comb,motor:motor.replace(/\s+/g,""),desalienacao:/SIM/i.test(desal),classificacao:classif.trim(),lanceMin:Number(valor.replace(/\./g,"").replace(",","."))});
  }
  return {lotes:out,falhas};
}
if(typeof module!=="undefined")module.exports={lerAnexoLotes};
