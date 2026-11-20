# Skills da IA do Controle de Leilão

Cada ação que a IA executa no sistema tem uma skill própria, com entrada, saída e regras fixas.
Elas rodam na Edge Function `ia` do Supabase. A chave da OpenAI nunca vai para o navegador.

Regras que valem para todas:

1. **Só o que está escrito.** A IA extrai o que está na fonte (edital, página do lote, foto). O que não estiver lá volta `null`, e nunca como "valor típico".
2. **Trecho obrigatório.** Todo valor extraído de texto vem com o `trecho` literal de onde saiu.
3. **Verificação no servidor.** O servidor confere se o trecho existe na fonte e se o número está dentro do trecho. Se não conferir, o campo chega marcado como **não verificado** e vem desmarcado na tela de revisão.
4. **Humano aprova.** Nada é gravado direto. A IA preenche uma tela de revisão, e a pessoa aceita campo por campo.
5. **Saída com schema estrito.** A resposta segue um JSON Schema estrito (Structured Outputs). Se não seguir, a ação falha em vez de inventar.
6. **Preço não é inventado.** Valor de peça e serviço vem da base de preços aprendida no próprio painel. A IA só sugere faixa quando não há histórico, e isso aparece marcado como "estimativa IA".

| Skill | Arquivo | Usada em |
|---|---|---|
| ler_edital | ler_edital.md | 📁 Editais → 🤖 Ler edital com IA |
| importar_lote | importar_lote.md | ＋ Importar lote por link |
| analisar_fotos | analisar_fotos.md | 🤖 Avaliar → fotos |
| mapear_planilha | mapear_planilha.md | Importar planilha (quando os cabeçalhos não são reconhecidos) |
