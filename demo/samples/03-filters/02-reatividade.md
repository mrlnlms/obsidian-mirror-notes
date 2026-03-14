---
title: Teste Reatividade v41
status: ativo
priority: 18
type: reatividade-infinita
---

# Teste 2 — Reatividade ao editar frontmatter

Edite os campos do frontmatter e observe se o mirror atualiza.

## Sequencia de edicoes
1. Mude `status: ativo` para `status: pausado`
2. Mude `priority: 5` para `priority: 0`
3. Adicione campo novo: `author: Marlon`

## Checklist
- [ ] Cada edicao atualiza o mirror (delay aceitavel: ate ~1s)
- [ ] Campo novo `author` aparece como vazio no template (nao tem `{{author}}`)
- [ ] Nenhum erro no console (Ctrl+Shift+I)
