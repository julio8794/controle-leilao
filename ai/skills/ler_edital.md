# Skill: ler_edital

**Entrada:** URL do PDF do edital (http/https, até 20 MB).

**Processo:**
1. O servidor baixa o PDF e extrai o texto, página por página.
2. O modelo recebe o texto com marcadores `[[página N]]`. Se o PDF for escaneado e não tiver texto, recebe o próprio PDF.
3. O modelo devolve o schema abaixo.
4. O servidor verifica cada trecho no texto, ignorando acentos, caixa e espaços, e confere se o número aparece no trecho.

**Campos (cada um com `valor`, `trecho`, `pagina`):**
- `comissaoPct`: comissão do leiloeiro em % sobre o arremate.
- `taxaAdmPct`: taxa administrativa em % (quando for percentual).
- `taxasFixas[]`: taxas em R$ por lote (nome, valor, trecho).
- `prazoPagamentoH`: prazo para pagar, em horas. "3 dias úteis" vira 72 e é anotado em `obs`.
- `liberacaoDias`, `prazoTransferenciaDias`, `diasCarencia`, `estadiaDia`.
- `debitos`: quem paga IPVA, multas, licenciamento e estadia (resumo literal).
- `regras`: regras de retirada, circulação e transferência.
- `data_leilao`, `leiloeiro`, `comitente`, `cidade`.

**Proibido:** completar com valores de outros editais, "padrão de mercado" ou suposição. Custos de documentação (vistoria, transferência) não vêm do edital, então o modelo não os preenche.

**Saída para a tela:** cada campo com ✓ verificado ou ⚠ não verificado. A pessoa marca o que aplicar no grupo.
