# Skill: importar_lote

**Entrada:** URL da página do lote no site do leiloeiro.

**Processo:**
1. O servidor baixa o HTML, remove scripts e estilos e gera o texto (até 60 mil caracteres).
2. As URLs das fotos vêm do HTML (og:image e imagens jpg/png/webp), e não do modelo.
3. O modelo extrai os campos com o trecho literal de cada um.
4. O servidor verifica os trechos.

**Campos:** modelo, marca, ano, cor, placa_final, chassi, km, lote, lance_minimo, lance_atual, data_leilao, leiloeiro, comitente, situacao (texto do site: "conservado", "sucata", "recuperável"…), observacoes.

**Proibido:** FIPE, preço de venda e estado mecânico. Isso não está na página. A FIPE é consultada à parte, e o estado vem da vistoria ou da skill analisar_fotos.
