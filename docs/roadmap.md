# Mirror Notes — Roadmap

Horizonte de produto e ordem de execucao. Trabalho tecnico corrente esta no [backlog.md](backlog.md). Arquitetura atual em [architecture.md](architecture.md).

## Ordem de execucao

### 1. Margin Panel (epico)

Proximo bloco de trabalho. Base tecnica pronta (v45: flush positioning + ResizeObserver). Foco: refinamento de largura, thresholds e consolidacao do menu de posicoes. Itens granulares no [backlog](backlog.md#epico-margin-panel).

### 2. Revisao de Settings UI

Apos margin panel. Estrutura de codigo pronta (v52: settings.ts split em 5 modulos). v53 resolveu rename de mirrors e fix do typo `overide`. Pendente: padronizar textos PT→EN, limpar opcoes deprecated, layout/hierarquia visual. Itens granulares no [backlog](backlog.md#revisao-de-settings-ui).

## Pre-lancamento (must-have)

- [ ] **Curadoria do demo vault** — revisar notas e exemplos em `demo/samples/`, selecionar os melhores, organizar pra publicacao. Hoje o vault acumula tudo que foi portado via `copy-to-demo` durante o dev — precisa de uma passada final
- [ ] **Starter configs** — templates pre-configurados pra novos usuarios. So faz sentido quando o plugin estiver pronto pra lancar
- [ ] **Import/Export de configuracoes** — validacao de schema, paths quebrados, conflitos com mirrors existentes. Menor prioridade entre os must-have

## Ideias (viabilidade a definir)

- **Multiplos mirrors na mesma nota** — hoje o primeiro mirror que matcha ganha, segundo descartado silenciosamente (first-match-wins, sem warning). Requer `Map<string, CustomMirror[]>` e rendering pipeline pra multiplos widgets/DOM. Config de teste "Edge: Conflito" preservada como referencia
  - **Aprendizados da v46 (AND/OR) que informam o design:**
    - *First-match-wins gera friccao*: properties exclusivas foram necessarias pra testar mirrors isolados (ex: `category: research` em vez de `type: project`). Multiplos mirrors eliminaria essa necessidade
    - *Negacao sem escopo e perigosa*: `status IS NOT draft` matchou o vault inteiro. Com multiplos mirrors, negacao ampla + outro mirror = sobreposicao visual indesejada. Precisa de regras de precedencia ou stacking order
    - *AND/OR aumenta sobreposicao legitima*: conditions expressivas tornam mais provavel que 2+ mirrors queiram renderizar na mesma nota (ex: mirror folder=projects/ + mirror type=project AND status=active)
    - *Ordem no settings = prioridade implicita*: com 1 mirror por nota, a ordem define quem ganha. Com multiplos, a ordem define stacking (qual renderiza primeiro/em cima). Precisa de UX clara pra isso
- **Dashboard de uso** — metricas de mirrors ativos, templates usados, etc. Nao sei se vale a pena ou e viavel

## Versoes concluidas

Resumo por versao. Detalhes tecnicos em [technical-notes.md](technical-notes.md), changelog completo em [CHANGELOG.md](CHANGELOG.md).

| Versao | Tema | Destaques |
|--------|------|-----------|
| v55 | Central decision function | `computeMirrorRuntimeDecision`, `resolveEngine`, domPositionManager refactor, canonical flows docs. 370 unit + 37 E2E |
| v54 | Runtime correctness + pane isolation | Stale callbacks, multi-pane frontmatter, memory leak, code block pane isolation, type safety, DRY. Audit Claude+Codex. 359 unit + 37 E2E |
| v53 | Rename mirrors + typo migration | Inline rename, `overide→override` migration com auto-save, `toogle→toggle` fix, UI labels EN |
| v52 | Structural refactor (code review) | @ts-ignore centralizados (14 wrappers), tipagem core, main.ts 449→386, settings.ts 545→83 (5 modulos), view overrides dedup |
| v51 | Codex audit fixes + minAppVersion | Per-template debounce, RenderChild cleanup, minAppVersion 0.15.0→1.0.0 |
| v50 | MutationObserver auto-recovery | Observer detecta container destruido pelo Obsidian, re-injeta automaticamente, cooldown 100ms, isMutationRecovery bypass |
| v49 | Dual-template LP + RV + refactor | Preview Mode fields funcionais, viewMode-aware config, cache mode-aware, legacy hideProps cleanup, refactor main.ts (4 modulos extraidos) |
| v48 | Per-view DOM injection | viewId via WeakMap, containers independentes por pane, positionOverrides per-view, viewIdFacet |
| v47 | Reading View DOM injection | top/bottom em RV via DOM injection, layout-change event, debounce 50ms, lastViewMode guard |
| v46 | AND/OR compound filters | Conditions unificadas, evaluateConditions any/all, negacao is/not, mirrorIndex eliminado, conditionBuilder UI |
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
