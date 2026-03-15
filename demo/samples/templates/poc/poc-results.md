---
cssclasses: []
---

# PoC Results: Column Plugins + Meta Bind

Data: 2026-03-14

## Checklist por plugin

### Multi-Column Markdown (ckRobinson)
Nota de teste: `[[Teste MCM]]`

- [x] Plugin instalado e ativo
- [ ] Colunas renderizam em Live Preview
- [ ] INPUT fields renderizam dentro das colunas
- [ ] INPUT fields escrevem no frontmatter
- [ ] VIEW fields atualizam reativamente
- [ ] Tabelas markdown dentro das colunas
- [ ] Computed VIEW funciona (budget / team_size)
- [ ] Performance aceitavel
- [x] Notas: Sintaxe custom (`--- start-multi-column`) NAO renderiza dentro de mirrors (MarkdownRenderer). Eliminado.

### Obsidian Columns (tnichols217)
Nota de teste: `[[Teste Obsidian Columns]]`

- [x] Plugin instalado e ativo
- [x] Colunas renderizam em Live Preview
- [x] INPUT fields renderizam dentro das colunas
- [x] INPUT fields escrevem no frontmatter
- [x] VIEW fields atualizam reativamente
- [x] Tabelas markdown dentro das colunas
- [x] Computed VIEW funciona (budget / team_size)
- [x] Performance aceitavel
- [x] Notas: Funciona dentro de mirrors. Menu right-click com opcoes de layout. Sintaxe callout nativa. Suporta blocos 3-col + 2-col sequenciais. Code block mirror renderiza dentro do template.

### Multi-Column Layout (MaxMiksa)
Nota de teste: `[[Teste Multi-Column Layout]]`

- [x] Plugin instalado e ativo
- [x] Colunas renderizam em Live Preview
- [x] INPUT fields renderizam dentro das colunas
- [x] INPUT fields escrevem no frontmatter
- [x] VIEW fields atualizam reativamente
- [x] Tabelas markdown dentro das colunas
- [x] Computed VIEW funciona (budget / team_size)
- [x] Performance aceitavel
- [x] Notas: Funciona dentro de mirrors. Sintaxe callout. Suporta blocos sequenciais.

## Comparativo

| Criterio | MCM | Obsidian Columns | Multi-Column Layout |
|----------|-----|-----------------|-------------------|
| Funciona em mirrors | NO | YES | YES |
| Meta Bind funciona | N/A | YES | YES |
| Tabelas em colunas | N/A | YES | YES |
| Computed views | N/A | YES | YES |
| Source mode legivel | YES | YES | YES |
| Nested layouts | N/A | YES | YES |
| Performance | N/A | OK | OK |
| Resize interativo | N/A | N/A | YES |
| Right-click menu | NO | YES | NO |

## Veredito

Plugin escolhido: **Obsidian Columns** (tnichols217)
Motivo: Unico que funciona em mirrors E tem menu right-click pra layout. Sintaxe callout nativa (`[!col]` + `[!col-md|N]`) mais limpa. Multi-Column Layout tambem funciona mas sem o menu contextual. MCM eliminado — sintaxe custom nao renderiza via MarkdownRenderer.
