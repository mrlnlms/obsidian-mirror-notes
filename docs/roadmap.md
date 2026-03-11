# Mirror Notes — Roadmap

## Concluido: v26 — Code Block Processor

- [x] `registerMarkdownCodeBlockProcessor("mirror")` — Reading View + Live Preview
- [x] Rendering compartilhado (templateRenderer.ts)
- [x] Sintaxe: template, source, variaveis inline
- [x] MarkdownRenderChild para lifecycle correto
- [x] onLayoutReady para notas ja abertas

## Prioridade 1: Estabilizar bugs existentes

- [ ] Fix Hide Properties (CSS selector vs DOM do Obsidian)
- [ ] Fix filterProps com listas YAML (tags, aliases)
- [ ] Fix parseFrontmatter para listas genericas

## Prioridade 2: Qualidade de vida

- [ ] Validacao de configuracoes (template inexistente, filtro vazio)
- [ ] Documentacao de uso do code block processor (README ou wiki)
- [ ] Reatividade cross-note (quando `source: outra-nota.md` muda, re-renderizar)

## Futuro

Ver [backlog.md](backlog.md) para a lista completa de features planejadas.
