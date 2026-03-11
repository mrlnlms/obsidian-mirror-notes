# Mirror Notes — Roadmap

## Concluido: v27 — Performance, Timing, Cleanup

- [x] Centralizar constantes de timing em timingConfig.ts
- [x] Ativar configCache em mirrorConfig.ts (cache por file.path + frontmatterHash)
- [x] cachedRead para templates (vault.cachedRead em vez de vault.read)
- [x] Unificar iterateAllLeaves no startup (uma passada so no onLayoutReady)
- [x] Substituir window.mirrorUIPluginInstance por mirrorPluginFacet (Facet CM6)
- [x] Remover StateEffect.reconfigure([]) do onunload
- [x] Remover window.mirrorUICleanup (export normal)

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
