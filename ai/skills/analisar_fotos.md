# Skill: analisar_fotos

**Entrada:** até 8 fotos (URL), modelo/ano, e a lista de peças/serviços já conhecidos no painel com as medianas.

**Saída por item:** peca, categoria (estetica | mecanica | documentacao | outros), gravidade (leve | media | grave), foto (índice da foto onde aparece), evidencia (o que se vê na foto, de forma concreta), confianca (0–1), `nome_base` (nome exato da base de preços, quando corresponder).

**Regras:**
- Só listar o que é **visível** nas fotos. Nada de "provavelmente precisa de revisão".
- Sem evidência visual, o item não entra. O que não dá para avaliar por foto (motor, elétrica) vai em `nao_avaliavel`.
- Preço: o servidor **não** pede valor ao modelo. O valor sai da base de preços do painel (mediana). Sem histórico, o item fica sem valor para a pessoa preencher.
- Confiança abaixo de 0,5 chega desmarcada.
