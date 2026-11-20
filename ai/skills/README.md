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

## Agentes na plataforma da OpenAI

Cada skill tem um agente publicado em platform.openai.com → Respostas (prompts versionados). A função `ia` chama o agente pelo ID. Se o agente não estiver acessível, usa as mesmas instruções guardadas no código (`ai/agentes/p_*.txt`). Para trocar o ID sem mexer no código, crie no Supabase o segredo `PROMPT_<AÇÃO>`.

| Agente | Ação | Modelo | ID |
|---|---|---|---|
| Leilão · Leitor de edital | ler_edital | gpt-6.2-sol | pmpt_6aff950fd0f481948847945c280c1361055ffbbf3d8005b4 |
| Leilão · Importador de lote | importar_lote | gpt-6-luna | pmpt_6aff9564f2f4819087db1d058af07710078f2f34ff066db9 |
| Leilão · Vistoriador por fotos | analisar_fotos | gpt-6.2-sol | pmpt_6aff95809a1c8194b72e09a85b69480003274924a703d52b |
| Leilão · Mapeador de planilha | mapear_planilha | gpt-6-luna | pmpt_6aff959a109c819392d43d4ef4c665bb025bc8d8b650f83b |

Economia: o edital vai só com as páginas de custas e prazos (a verificação usa o texto inteiro), e leituras de edital e lote ficam em cache por 30 dias (`ia_cache`).

Teste de 19/11/2026 (edital 23/2026 e lote 006 de Alagoinhas):
- Edital: 5 de 5 valores presentes extraídos e verificados no texto. Comissão, carência e diária ficaram em branco porque não estão no edital. Custo de cerca de US$ 0,05.
- Lote: 9 de 9 campos presentes corretos. Custo menor que US$ 0,001.
- Fotos (6): 7 itens com foto citada, coerentes com a descrição do leiloeiro. Custo de cerca de US$ 0,05.
