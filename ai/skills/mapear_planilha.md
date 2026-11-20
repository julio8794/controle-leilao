# Skill: mapear_planilha

**Entrada:** cabeçalhos e até 5 linhas de amostra de uma planilha.

**Saída:** para cada cabeçalho, o campo do sistema correspondente ou `null`.

Campos válidos: modelo, ano, cor, placa, chassi, km, lote, lanceMin, lance, fipe, vendaPretendida, vendaValor, dataVenda, dataLeilao, leiloeiro, link, obs, status.

**Regras:**
- Primeiro, o app tenta sozinho por sinônimos fixos ("Lance mínimo", "Lance min", "Valor mínimo" → lanceMin). A IA só é chamada para os cabeçalhos que sobraram.
- A IA só mapeia; ela **nunca** altera ou gera valores das linhas.
- Em dúvida, `null`. A pessoa confere o mapeamento antes de importar.
