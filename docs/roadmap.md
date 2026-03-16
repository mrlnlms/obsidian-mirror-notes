# Mirror Notes — Roadmap

Horizonte de produto e ordem de execucao. Trabalho tecnico corrente esta no [backlog.md](backlog.md). Arquitetura atual em [architecture.md](architecture.md).

## Ordem de execucao

### 1. Logica AND/OR nos filtros

Menor escopo, primeiro a ser atacado. Hoje filtros sao OR-only — nao tem como combinar condicoes. Detalhes no [backlog](backlog.md).

### 2. Margin Panel (epico)

Segundo bloco de trabalho. Posicionamento flush e ResizeObserver ja implementados (v45). Faltam: largura configuravel, threshold de sobreposicao, gutters, min-height. Menu de posicoes so se consolida no final do epico (pode precisar de opcoes intermediarias pra teste). Plano de trabalho em `docs/superpowers/plans/`.

### 3. Revisao de Settings UI

Apos margin panel. Renomear mirrors, usabilidade com dezenas de mirrors, layout geral da pagina.

### 4. Reading View DOM injection

Top/bottom via `.mod-header.mod-ui` / `.mod-footer`. CM6 widgets so existem em Live Preview — esta feature fecha o gap. Entra apos AND/OR e margin panel.

## Pre-lancamento (must-have)

- [ ] **Curadoria do demo vault** — revisar notas e exemplos em `demo/samples/`, selecionar os melhores, organizar pra publicacao. Hoje o vault acumula tudo que foi portado via `copy-to-demo` durante o dev — precisa de uma passada final
- [ ] **Starter configs** — templates pre-configurados pra novos usuarios. So faz sentido quando o plugin estiver pronto pra lancar
- [ ] **Import/Export de configuracoes** — validacao de schema, paths quebrados, conflitos com mirrors existentes. Menor prioridade entre os must-have

## Ideias (viabilidade a definir)

- **Multiplos mirrors na mesma nota** — hoje o primeiro mirror que matcha ganha, segundo descartado com warning. Requer `Map<string, CustomMirror[]>` e rendering pipeline pra multiplos widgets/DOM. Config de teste "Edge: Conflito" preservada como referencia
- **Dashboard de uso** — metricas de mirrors ativos, templates usados, etc. Nao sei se vale a pena ou e viavel

## Versoes concluidas

Resumo por versao. Detalhes tecnicos em [technical-notes.md](technical-notes.md), changelog completo em [CHANGELOG.md](CHANGELOG.md).

| Versao | Tema | Destaques |
|--------|------|-----------|
| v45 | Margin panel positioning | Posicionamento flush (left:0/right:0), ResizeObserver responsivo |
| v44 | Config cache + race condition + below-backlinks | Fix config cache (override nao polui cache), race condition cold start (removeOtherDomMirrors), below-backlinks alinhado, retry cascade fix |
| v43 | Position simplification + cold start | Unificar bottom/above-backlinks, dropdown deprecated, retry backlinks timing, cold start rendering fix |
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
