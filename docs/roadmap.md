# Mirror Notes — Roadmap

Horizonte de produto e itens para lancamento. Trabalho tecnico corrente esta no [backlog.md](backlog.md). Arquitetura atual em [architecture.md](architecture.md).

## Proximo: v43

- [ ] **Simplificar menu de posicoes** — remover opcoes redundantes que os fallbacks ja cobrem (ex: `below-properties` → CM6 `top`). Plano em `zippy-herding-volcano`. Ver [backlog](backlog.md) e [architecture.md](architecture.md#position-engine--3-engines--fallback-chain)

## Pre-lancamento (must-have)

- [ ] **Sistema de templates pre-configurados (starter configs)** — usuario instala e ja tem exemplos funcionando. So faz sentido quando o plugin estiver pronto pra lancar
- [ ] **Margin panel avancado** — line numbers, readable-line-width, resize observer (base existe em marginPanelExtension.ts). 3 bugs conhecidos no [backlog](backlog.md)
- [ ] **Reading View DOM injection** — top/bottom via `.mod-header.mod-ui` / `.mod-footer` (CM6 so funciona em Live Preview)

## Should-have

- [ ] **Import/Export de configuracoes** — validacao de schema, tratamento de paths quebrados, conflitos com mirrors existentes
- [ ] **Logica AND/OR nas condicionais** — hoje todos os filtros sao OR. VirtualNotes tem rules com condicoes compostas. Ver [backlog](backlog.md)

## Nice-to-have

- [ ] **Dashboard de uso** — metricas de mirrors ativos, templates usados, etc.
- [ ] **Multiplos mirrors na mesma nota** — requer `Map<string, CustomMirror[]>` e rendering pipeline pra multiplos widgets/DOM

## Versoes concluidas

Resumo por versao. Detalhes tecnicos em [technical-notes.md](technical-notes.md), changelog completo em [CHANGELOG.md](CHANGELOG.md).

| Versao | Tema | Destaques |
|--------|------|-----------|
| v42 | Per-view setting overrides | ViewOverrides (hideProps, readableLineLength, showInlineTitle), CSS per-view, class nativa `is-readable-line-width`, Settings UI com dropdowns |
| v41 | metadataCache unificado + cache | parseFrontmatter removido, scoped cache, per-source timeout, code block self-dependency |
| v40 | Backlinks timing | two-layer check (API gate + DOM truth), cm-sizer fallback fix |
| v39 | isDomTargetVisible + fallback chain | smart fallback DOM→DOM→CM6, reactive config via vault.on('raw') |
| v38 | CSS parity Reading View | diagnostic triplo, 11/11 elementos identicos ao nativo |
| v37 | CSS parity mirror vs native | callout/hr margins, h1 first-of-type, text selection |
| v36 | Reactivity fix | filePathFacet cross-pane, knownTemplatePaths, guard inatividade removido |
| v35 | Performance + template reactivity | hot path zerado, TemplateDependencyRegistry, Logger early return |
| v34 | CI/CD | GitHub Actions release + CI |
| v33 | Refatoracao estrutural | settings split, dep circular eliminada, dead code |
| v32 | Position engine | 6 posicoes DOM + 2 margins + fallback chain + filterProps fix |
| v31 | Suggester + busca | refatoracao suggester, campo de busca no settings |
| v30 | Cross-note reactivity | SourceDependencyRegistry + callbacks diretos |
| v29 | Deps + insert mirror | TS5, esbuild 0.25, ESLint 9, mirrorPluginFacet, insert command |
| v28 | Rename-aware + validation | auto-update paths, inline validation, Notice clicavel |
| v27 | Performance | configCache, cachedRead, mirror index, timing centralizado |
| v26 | Code block processor | Reading View + Live Preview, rendering compartilhado |
