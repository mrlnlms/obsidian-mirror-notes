# Mirror Notes — Roadmap

Horizonte de produto e itens para lancamento. Trabalho tecnico corrente esta no [backlog.md](backlog.md).

## Concluido: v39 — isDomTargetVisible + smart fallback chain + reactive config

- [x] `isDomTargetVisible()` — consulta `app.vault.getConfig()` antes de aceitar target DOM
- [x] `resolveTarget()` com parametro `app` opcional pra checagem de visibilidade
- [x] Fallback chain DOM→DOM→CM6 (above-title → above-properties → CM6 top)
- [x] `setupDomPosition` retry + `removeAllDomMirrors` pre-injecao
- [x] `vault.on('raw')` detecta mudancas em `.obsidian/app.json` → `refreshAllEditors()`
- [x] 126 testes (+7 novos: isDomTargetVisible, getFallbackPosition atualizado)
- [x] Infraestrutura de teste: `test-visibility/` + template + configs no data.json

## Concluido: v38 — CSS parity com Reading View nativo

- [x] Diagnostic triplo: mirror vs Reading View vs Live Preview (via `iterateAllLeaves`)
- [x] Seletores CM6 mapeados pra Live Preview (HyperMD-header, cm-callout, etc.)
- [x] `hr` margin 1em → 2em (match nativo-rv: 32px)
- [x] `h2/h3:first-of-type` removido (so h1 deve ter mt:0)
- [x] `pre` margin-top adicionado (0 → 16px)
- [x] `pre:not(.frontmatter)` no diagnostic
- [x] Resultado: 11/11 elementos com computed styles identicos ao Reading View nativo

## Concluido: v37 — CSS parity mirror vs native

- [x] Callout/hr margins com especificidade alta + `!important`
- [x] h1 `:first-of-type` (MarkdownRenderer injeta `<pre>` fantasma antes do h1)
- [x] Text selection restaurada (`user-select: text !important`)
- [x] below-properties margin-top: 0 (compensar margin nativo do metadata-container)
- [x] Debug diagnostic: mirror + nativo + filhos + ancestors + diff automatico
- [x] Debug outlines por tipo de container (vermelho/verde/laranja)

## Concluido: v36 — Reactivity fix (cross-pane + template editing)

- [x] `filePathFacet` — cada editor CM6 recebe seu file.path via Facet (fix `getActiveFile()` cross-pane)
- [x] `handleTemplateChange` — fast-path `knownTemplatePaths` O(1) + iterateAllLeaves dentro do debounce
- [x] Guard de inatividade removido — Properties UI agora triga update corretamente
- [x] Dead code removido (lastUserInteraction, USER_INACTIVITY_THRESHOLD)

## Concluido: v35 — Performance fix + Template reactivity

- [x] Fix re-render excessivo DOM injector (setupDomPosition fora do hot path)
- [x] Logger otimizado (early return com debug off)
- [x] Margin panel: docChanged → geometryChanged (sem forced reflow)
- [x] TemplateDependencyRegistry — mirrors atualizam quando template e editado
- [x] handleTemplateChange debounced — cobertura completa (metadataCache + vault.modify)
- [x] clearRenderCache global removido (hash invalida naturalmente)

## Concluido: v34 — CI/CD + Release workflow

- [x] `.github/workflows/release.yml` — auto-release no push de tag
- [x] `.github/workflows/ci.yml` — build + lint + test em push/PR
- [x] Skill `obsidian-plugin-scaffold` atualizada com secao CI/CD

## Concluido: v40 — Backlinks timing fix + children-based DOM detection

- [x] `isDomTargetVisible` pra backlinks — so checa `bl.enabled`, nao `backlinkInDocument` (nao reativo)
- [x] `resolveTarget` — `children.length > 0` pra detectar conteudo real do `.embedded-backlinks`
- [x] below-backlinks `.cm-sizer` fallback — gated por `!backlinks` (so quando elemento nao existe)
- [x] vault.on('raw') — removido `backlink.json`, so `core-plugins.json` trigga refresh
- [x] 132 testes (+6 novos: backlinks visibility, empty shell, real content)

## Concluido: v41 — metadataCache unificado + scoped cache + cleanup

- [x] `parseFrontmatter` removido — `metadataCache` como fonte unica de frontmatter pra todos os caminhos (CM6, code block, DOM)
- [x] `extractRawYaml` — hash de deteccao de mudanca via string YAML bruta (sem parsing)
- [x] Bug fix: filterProps com arrays em chaves diferentes de `tags` (ex: `categories`)
- [x] Throttle de forced update 1000ms → 500ms (checkbox boolean travava)
- [x] Scoped `clearRenderCache(oldCacheKey)` + `domCache.delete(oldCacheKey)` em `handleForcedUpdate`
- [x] `crossNoteTimeouts` Map por `file.path` (antes: timeout unico descartava callbacks)
- [x] Cleanup `debugComputedStyles` (~200 linhas de CSS diagnostic temporario)
- [x] Lint zerado — 5 unused imports removidos
- [x] 138 testes passando (+7 novos)
- [x] Code blocks sem `source:` re-renderizam com frontmatter da propria nota (self-dependency no SourceDependencyRegistry)

## Proximo: v42 — Position engine refinement

- [ ] **below-properties → CM6 top** — preferir CM6 sobre DOM (resultado visual identico, melhor reatividade). ~5 linhas em `main.ts` + label em `settings.ts`. Plano: [plan-below-properties-cm6.md](plan-below-properties-cm6.md)

## Pre-lancamento (must-have)

- [ ] **Sistema de templates pre-configurados (starter configs)** — usuario instala e ja tem exemplos funcionando. So faz sentido quando o plugin estiver pronto pra lancar
- [x] **README: documentar code blocks** (v29) — secao com sintaxe ` ```mirror ``` `, exemplos e uso
- [ ] **Margin panel avancado** — line numbers, readable-line-width, resize observer (base existe em marginPanelExtension.ts)
- [ ] **Reading View DOM injection** — top/bottom via `.mod-header.mod-ui` / `.mod-footer` (CM6 so funciona em Live Preview)

## Should-have

- [ ] **Import/Export de configuracoes** — precisa de user-flow bem pensado. Validacao de schema no import, tratamento de paths quebrados, conflitos com mirrors existentes. Depende do redesign de settings (backlog) pra validacao mais forte

## Nice-to-have

- [ ] **Dashboard de uso** — metricas de mirrors ativos, templates usados, etc.

## Concluido: v33 — Refatoracao estrutural

- [x] settings.ts: 813 → ~320 linhas (types, pathValidator, filterBuilder extraidos)
- [x] mirrorState.ts update(): subfuncoes extraidas (hasForcedUpdate, detectFrontmatterChange, handleForcedUpdate, handleConfigChange)
- [x] Dependencia circular mirrorState ↔ mirrorDecorations resolvida (decorationBuilder.ts)
- [x] Dead code removido (YAMLSuggest.ts, mirrorViewPlugin.ts)
- [x] utils/ → src/suggesters/
- [x] obsidianInternals.ts centraliza @ts-ignore

## Concluido: v32 — Position Engine + filterProps Fix

- [x] 6 novas posicoes DOM: above-title, above/below-properties, above/below-backlinks
- [x] 2 margin panels basicos: left, right (ViewPlugin no scrollDOM)
- [x] `MirrorPosition` type union + constantes `DOM_POSITIONS`, `CM6_POSITIONS`, `MARGIN_POSITIONS`
- [x] `src/rendering/domInjector.ts` — engine DOM com fallback chain
- [x] `src/editor/marginPanelExtension.ts` — ViewPlugin basico
- [x] Fallback automatico: DOM target ausente → CM6 position via `positionOverrides`
- [x] filterProps fix: arrays, booleans, coercao string
- [x] Bug fix: dropdown preview mode salvava no campo errado
- [x] Dropdown com 9 posicoes visuais + helper DRY

## Concluido: v31 — Refatorar Suggester + Busca de Mirrors

- [x] `utils.ts` eliminado — `wrapAround` inline em `suggest.ts`
- [x] `suggest.ts` limpo: `document.body`, `@ts-ignore` explicito, whitespace
- [x] `templater_search` → `mirror-search-input` (4 ocorrencias)
- [x] Campo de busca inline pra filtrar mirrors por nome no settings
- [x] `filterMirrorCards()` — hide/show de cards em tempo real
- [x] Mensagem "No mirrors matching" dentro do container de cards com visual coerente

## Concluido: v30 — Cross-Note Reactivity

- [x] `SourceDependencyRegistry` — registry centralizado com callbacks de re-render
- [x] Code block processor registra dependencias + callback `doRender()` com cleanup automatico
- [x] Branch cross-note no `metadataCache.on('changed')` com debounce 500ms
- [x] Funciona em Live Preview e Reading View (callbacks diretos, sem depender de `previewMode.rerender`)

## Concluido: v29 — Dependency Update + Insert Mirror Block + Cleanup

- [x] Deps atualizadas: TS 4.7→5.9, esbuild 0.17→0.25, ESLint 9 flat config, obsidian pinado
- [x] codemirror movido pra devDeps, tsconfig modernizado (ES2018)
- [x] `window.mirrorUIPluginInstance` → `mirrorPluginFacet` (Facet CM6)
- [x] `StateEffect.reconfigure([])` removido do onunload
- [x] Insert Mirror Block — modal + command palette + right-click menu
- [x] Limpeza: 22 unused imports/vars, dead code removido
- [x] Script `npm run lint` adicionado

## Concluido: v28.1 — Clickable Error in Renderer

- [x] Link "Open settings" no erro "Template not found" (widget + code block)
- [x] `openSettingsToField` publico pra uso pelo renderer
- [x] `pointer-events: auto` no errorDiv (CM6 widget bloqueia eventos por default)

## Concluido: v28 — Rename-Aware Settings + Inline Validation

- [x] `vault.on('rename')` — auto-update de paths nos settings
- [x] `vault.on('delete')` — Notice clicavel avisando template quebrado
- [x] Toggle global + per-mirror pra controlar auto-update
- [x] Notice com "Open settings" → expande mirror colapsado, scroll + focus
- [x] Inline path validation em todos os campos de path/folder/filename
- [x] Validacao no render + blur do input

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
