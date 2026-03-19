# Mirror Notes Plugin

Um plugin para Obsidian que renderiza templates dinamicos dentro do editor usando CodeMirror 6.

## v56 — Code review + observability nivel 4

- Fix: data.json modify handler agora recarrega settings do disco (afetava Obsidian Sync)
- Fix: migration guard pra mirrors pre-v46 sem campo conditions (crash no load)
- Fix: applyViewOverrides em file-open e active-leaf-change (CSS overrides stale ao navegar)
- Fix: hashObject null guard (previne crash silencioso em StateField)
- Fix: refreshAllEditors aplica overrides em views RV sem CM6
- Fix: settingsUpdateDebounce migrado pra scheduleTimer (auto-cleanup)
- Fix: typo "Colapse" → "Collapse"
- Cleanup: lastContentHash dead code removido, clearRenderingPromises import morto removido
- Refactor: mirrorState.ts (3 callers) e viewOverrides.ts (1 caller) migrados pra computeMirrorRuntimeDecision
- Refactor: getApplicableConfig e resolveEngine agora internos a mirrorDecision.ts (zero callers externos)
- Docs: architecture.md caller list corrigida (6 hooks), observability nivel 4 concluido
- 377 testes (+3)

## v55 — Central decision function + canonical flows

- Feat: `computeMirrorRuntimeDecision()` em `mirrorDecision.ts` — funcao pura central de decisao de runtime (engine, posicao, fallback)
- Feat: `resolveEngine()` centraliza decisao de engine (CM6 positions em RV → DOM) num unico lugar
- Refactor: `domPositionManager.setupDomPosition` usa decision function (remove `shouldInjectDom` espalhado)
- Refactor: trace logging integrado na decision function (`runtime-decision` events)
- Docs: 3 fluxos canonicos em architecture.md (mode switch, metadata change, template change)
- Backlog: observabilidade niveis 2-3 concluidos
- Fix: render concurrency race com 3+ callers no mesmo cacheKey (`if` → `while` loop guard)
- Fix: margin panel ResizeObserver sobrevive ciclo de mudanca de posicao (`destroy` → `removePanel` em update)
- Fix: margin positions retornam `engine:none` em Reading View (CM6 ViewPlugin invisivel em RV)
- Fix: todos fire-and-forget timers rastreados via `scheduleTimer()` e cancelados no onunload (backlinks retries 3s, cold-start 1s, mode switch 50ms)
- Fix: `renderingPromises` limpo no onunload — previne hot-reload ficar preso em promise de instancia morta
- Docs: architecture.md corrigido (metadata flow, `resolveViewOverrides` removido, test counts)
- Backlog: nivel 4 — migrar mirrorState + marginPanelExtension pra `computeMirrorRuntimeDecision`
- Fix: templateDeps limpo no rename/delete de template (previne acumulo de callbacks stale)
- Fix: viewOverrides stale apos mudanca de mirror — `applyViewOverrides` agora roda APOS `cm.dispatch` (StateField atualizado)
- Fix: viewOverrides nao aplica overrides quando engine e `none` (left/right em RV sem mirror visivel)
- Fix: data.json modify handler processa panes RV sem CM6 editor (setupDomPosition + applyViewOverrides fora do `if (cm)`)
- 374 testes (+15)

## v54 — Runtime correctness + type safety + DRY

- Fix: stale callbacks em debounce de cross-note e template (re-query dentro do setTimeout)
- Fix: multi-pane frontmatter staleness (iterateAllLeaves no metadataCache handler)
- Fix: lastRenderChildren memory leak (clearRenderChild no block destroy)
- Fix: clearRenderCache() global nao orfana mais lifecycle de blocos vivos (Codex review)
- Fix: metadataUpdateTimeout per-file — mudancas em arquivos diferentes nao cancelam refresh (Codex review)
- Fix: code blocks per-pane isolation via `getBlockViewId` — split view da mesma nota nao colide mais (Codex review #2)
- Fix: throttle/debounce per-view — panes secundarios nao sao mais bloqueados (Codex review #4)
- Fix: positionOverrides aplicado em cache hit — DOM→CM6 fallback funciona com cache quente (Codex review #4)
- Fix: renderingPromises re-render com contexto fresco em vez de reusar promise velha (Codex review #4)
- Fix: 3 lint errors (imports nao usados em E2E specs) (Codex review #4)
- Refactor: frontmatter types padronizados pra `Record<string, unknown>` (6 arquivos)
- Refactor: hash function deduplicada, buildContainerClasses extraido, cooldown centralizado
- 359 testes (+8)

## Observability level 1: decision trace logs (pos-v53)

- `traceMirrorDecision()` com prefixo `[trace]` filtravel via grep
- 5 pontos de trace: config-resolve, cooldown-skip, dom-injection, forced-update, render-skip
- Filtrar: `grep '[trace]' debug.log`
- 6 testes unitarios (290 total)

## CI + package migration (pos-v53)

- Migrado de `obsidian-plugin-e2e` (local) para `obsidian-e2e-visual-test-kit` (github:mrlnlms)
- CI atualizado: job `e2e-tests` com xvfb roda smoke E2E no ubuntu-latest
- Visual comparison continua local-only (screenshots sao machine-dependent)

## Dot notation + unicode template variables (pos-v53)

- Template variables agora suportam dot notation: `{{project_info.dates.start_date}}`
- Suporte a unicode: `{{descrição}}`, `{{título}}`
- Chaves flat com ponto (`ma.miii`) tem prioridade sobre acesso nested
- Regex expandido de `[\w-]+` para `[\w\p{L}\p{N}.-]+` com flag unicode
- 17 testes novos (284 total)

## E2E test suite (pos-v53)

- 25 E2E specs contra Obsidian real via obsidian-plugin-e2e harness (WebdriverIO + wdio-obsidian-service)
- 5 suites: smoke (3), positions (8), mode-switch (4), lifecycle (4), visual-baselines (6)
- Test vault minimo com 9 templates, 8 notas, 11 mirrors pre-configurados
- Screenshot baselines para above-title, CM6 top/bottom, RV template, viewport
- Cobre os 5 gaps: CSS layout, CM6 rendering, mode switch, cold start, plugin lifecycle

## Code review fixes (pos-v53)

- Fix XSS: catch block no templateRenderer usava innerHTML com error interpolado
- Fix hashObject: string inputs passavam por JSON.stringify incorreto
- Fix arraymove bounds: Move up no index 0 movia item pro final silenciosamente
- Cleanup: caches module-level resetam no onunload
- ESLint: no-explicit-any de off para warn
- CSS: ~93 linhas de regras legacy removidas
- Tests: logger mock paths corrigidos, import nao usado removido
- tsconfig.test.json para incluir testes na validacao de tipos

## Versao Atual: v53 — Rename mirrors + typo migration

## Code review fixes (pos-v53)

- Fix XSS: catch block no templateRenderer usava innerHTML com error interpolado → createEl + textContent
- Fix hashObject: string inputs passavam por JSON.stringify com Object.keys (indices de caractere) → deteccao de tipo
- Fix arraymove bounds: customCards "Move up" no index 0 movia item pro final do array silenciosamente → bounds guards
- Fix log stale: "v25 loaded" → "Mirror Notes loaded"
- Cleanup: caches module-level (lastSetupTime, lastConfig) agora resetam no onunload
- ESLint: `no-explicit-any` de off → warn (81 warnings, 0 errors)
- CSS: ~93 linhas de regras legacy removidas (frontmatter-hider, anchor-line, injected-widget)
- Tests: logger mock paths corrigidos em 4 arquivos (../src/logger → ../src/dev/logger)
- Tests: import nao usado (Notice) removido de settingsHelpers.test.ts
- Adicionado tsconfig.test.json pra incluir testes na validacao de tipos

- Inline rename for custom mirrors in settings UI (editable text input in card header)
- Fix `overide` → `override` typo across codebase (types, source, UI labels, tests, data.json)
- Fix `toogle-header` → `toggle-header` CSS class typo
- Settings UI labels translated to English (global/custom override descriptions)
- Test coverage: +33 tests (blockParser, arraymove, generateWidgetId, settingsHelpers) — 234 → 267 total

## v52 — Structural refactor (code review triage)

### v52: @ts-ignore centralizados, tipagem core, split settings.ts, extracao main.ts

- Todos os `@ts-ignore` centralizados em `obsidianInternals.ts` (14 wrappers tipados, zero espalhado)
- `any` tipados em mirrorState.ts, mirrorTypes.ts, marginPanelExtension.ts → tipos concretos
- main.ts: 449 → 386 linhas — obsidianConfigMonitor e modeSwitchDetector extraidos
- settings.ts: 545 → 83 linhas — split em 5 modulos focados (globalSection, customCards, settingsUI, viewOverridesUI, array)
- View overrides deduplicado (era copypaste entre global e custom)
- `arraymove` compartilhado (era duplicado em settings.ts e conditionBuilder.ts)
- 215 testes, tsc + build OK

### v51: Per-template debounce, RenderChild cleanup, minAppVersion audit

- Per-template debounce em `templateChangeHandler` — templates concorrentes nao cancelam callbacks um do outro
- `MarkdownRenderChild` cleanup: `removeChild(prev)` antes de `addChild(new)` em re-renders de code blocks
- `minAppVersion` atualizado de `0.15.0` → `1.0.0` (floor real: finalizacao da migracao CM6)
- `versions.json` atualizado com `1.1.0: "1.0.0"`
- Backlog settings UI: notas sobre naming inconsistencies, mixing PT/EN, opcoes deprecated
- 213 testes (+6: templateChangeHandler 5 cenarios, templateRenderer acumulacao 1)

### v50: Auto-recovery de containers RV destruidos pelo Obsidian

- MutationObserver no `.markdown-preview-sizer` detecta quando container injetado e removido pelo Obsidian
- Re-injecao automatica via callback — panes inativos mantem mirror sem precisar de foco
- `setupContainerObserver()` com lifecycle completo: criacao, cleanup, desconexao em todas as funcoes de remove
- Cooldown 100ms em `setupDomPosition` previne injections duplicadas de event handlers sobrepostos
- `isMutationRecovery` flag permite que observer bypasse cooldown sem bloquear re-injecoes legitimas
- Diagnostico temporario `[DIAG-pane]` removido
- 207 testes (+10 novos: observer lifecycle, callback trigger, cleanup, disconnect)

### v49: Preview Mode fields funcionais + refactor main.ts

- Refactor: 4 modulos extraidos de main.ts (viewOverrides, domPositionManager, templateChangeHandler, settingsHelpers)
- `activeEditors` dead code removido
- `templateDependencyRegistry` ganhou `unregisterByPrefix()` (cleanup callbacks stale)
- Campos "Preview Mode Template" na UI agora sao usados em Reading View (antes: dead code)
- `getApplicableConfig` recebe `viewMode` — seleciona template/posicao por modo de visualizacao
- `configFromMirror` dual: se mirror tem `enable_custom_preview_mode` + template, usa em RV; senao fallback pra LP
- Global mirror idem: `enable_global_preview_mode` + `global_settings_preview_note`
- Cache key inclui viewMode (`file.path:source` / `file.path:preview`) — LP e RV cachados separado
- Mirror so com RV ativo agora matcha (antes ignorado por checar so `enable_custom_live_preview_mode`)
- Campo legacy `custom_settings_hide_props` removido, `resolveViewOverrides` eliminada
- 191 testes (+6 novos: dual-template, fallback, RV-only, cache separation, global dual)

### v48: Containers DOM independentes por pane

- viewId via WeakMap (`getViewId`) — cada pane recebe ID unico amarrado ao `containerEl`
- `injectionKey` inclui viewId: `dom-${viewId}-${filePath}-${position}`
- Mesmo arquivo em dois panes → mirrors independentes (antes: so o ultimo pane ativado mostrava)
- `viewIdFacet` no CM6 — positionOverrides per-view no StateField
- `positionOverrides` key composta `${viewId}:${filePath}` — fallback DOM→CM6 isolado por pane
- Fix TS error pre-existente em `CM6_POSITIONS.includes`
- 185 testes (+9 novos: getViewId, isolamento per-view, remove/cleanup scoped)

### v47: Mirrors top/bottom renderizam em Reading View

- Mirrors com posicao `top`/`bottom` agora renderizam via DOM injection em Reading View (antes: so CM6 em Live Preview)
- Targets DOM: `.el-pre.mod-frontmatter` (top), `.mod-footer` (bottom) dentro de `.markdown-preview-sizer`
- Evento `layout-change` detecta mode switch LP ↔ RV com debounce 50ms e guard `lastViewMode`
- Cleanup automatico: DOM mirrors removidos ao voltar pra Live Preview, CM6 widgets reassumem
- 176 testes (+5 novos: resolveTarget Reading View, top/bottom com/sem frontmatter/footer)

### v46: Conditions unificadas com AND/OR e negacao

- Data model: 3 arrays separados (`filterFiles/filterFolders/filterProps`) → `conditions: Condition[]` + `conditionLogic: 'any' | 'all'`
- Cada condition tem tipo (file/folder/property), negacao (is/not), e campos semanticos
- `evaluateCondition()` e `evaluateConditions()` — funcoes puras exportadas e testadas
- `mirrorIndex` eliminado — scan linear + configCache existente (incompativel com AND)
- Settings UI: secao "Conditions" unificada com dropdown any/all, rows tipadas, is/not
- `filterBuilder.ts` → `conditionBuilder.ts` (reescrito)
- `settingsPaths.ts` adaptado pra iterar conditions com campos semanticos
- 166 testes (+20 novos: evaluateCondition unit, AND/OR/negation integration)

### v45: Margin panel positioning

- Posicionamento flush left:0/right:0 (remove calculo com contentDOM.offsetLeft + gap)
- ResizeObserver responsivo a resize de janela, sidebar, split panes
- `calcPanelStyle()` extraida como funcao pura testavel

### v44: 3 bug fixes no position engine de backlinks

- Fix config cache: override runtime (`positionOverrides`) nao polui mais o cache — retries de backlinks agora funcionam
- Fix race condition cold start: `removeOtherDomMirrors()` substitui `removeAllDomMirrors()` em `setupDomPosition` — container nao e destruido durante render async
- `below-backlinks` alinhado com `above-backlinks`: removido fallback `.cm-sizer` (dead code), mesmo two-layer check + CM6 fallback
- Fix retry cascade: parametro `isRetry` previne agendamento exponencial de retries
- Event logging: `[event] file-open`, `active-leaf-change`, `onLayoutReady`, cold start retry
- Label `below-backlinks` atualizado pra "(DOM, CM6 fallback)"
- 146 testes (+3 novos pra below-backlinks parity)

### v43: Position engine simplification + cold start rendering fix

- Dropdown unificado: `above-backlinks` → "Bottom / Above backlinks (DOM, CM6 fallback)"
- `bottom` (CM6 puro) marcado como deprecated no dropdown
- `positionOverrides.delete` movido pra antes de `getApplicableConfig` — impede override stale
- Retry 500ms pra posicoes backlinks quando `resolveTarget` falha por timing
- Cold start fix: retry 1s no `onLayoutReady` com `clearRenderCache()` — MarkdownRenderer retornava success mas nao populava DOM no startup
- Backlinks DOM: plugin sempre insere `.embedded-backlinks` mesmo com backlinkInDocument OFF — elemento existe mas vazio

### v42: ViewOverrides — hideProps, readableLineLength, showInlineTitle

- Per-view overrides de settings do Obsidian via CSS classes e class nativa `is-readable-line-width`
- `ViewOverrides` type: `hideProps` (boolean), `readableLineLength` (true/false/null), `showInlineTitle` (true/false/null)
- Settings UI: secao "View overrides" em global e custom mirrors (toggle + 2 dropdowns inherit/on/off)
- `updateHidePropsForView()` → `applyViewOverrides()` — generalizado pra 3 overrides
- readableLineLength via toggle da class nativa `is-readable-line-width` (nao CSS hack)
- showInlineTitle via CSS `display:none` / `display:block` per-view
- Multi-pane: cada aba independente (CSS scoped por `.view-content`)
- Restore automatico: `inherit` restaura setting global do Obsidian ao navegar entre notas
- Cleanup no `onunload()`: remove classes + restaura `is-readable-line-width` pro valor global
- Bug backlog "hideProperties CSS fix" fechado como falso positivo — seletor funciona, `.metadata-container` continua descendente de `.view-content`
- Backward compat: `resolveViewOverrides()` migra campo legacy `hide_props` automaticamente
- 143 testes (12 pra applyViewOverrides cobrindo todos overrides + edge cases)

### v41: cache/invalidation protocol hardening + code block self-dependency

**Fix: `clearRenderCache()` e `domCache.clear()` globais:**
- Antes: forced update em qualquer editor limpava o hash cache e domCache de TODOS os editores
- Agora: scoped — so limpa o cacheKey do widget sendo atualizado (`clearRenderCache(oldCacheKey)` + `domCache.delete(oldCacheKey)`)
- Impacto pratico: elimina hash checks desnecessarios em editores que nao mudaram

**Fix: `crossNoteTimeout` compartilhado entre sources:**
- Antes: timeout unico — se source A e B mudavam dentro de 500ms, callbacks de A eram descartados
- Agora: `crossNoteTimeouts` (Map por `file.path`) — cada source tem debounce independente
- Cenario: plugins de automacao (Dataview, Templater batch) editando multiplos arquivos em sequencia

**Cleanup: `debugComputedStyles` removido:**
- Funcao de ~200 linhas marcada como "DEBUG temporario" (CSS diagnostic triplo mirror/RV/LP)
- Imports nao utilizados removidos (`MarkdownView`, `getEditorView` do templateRenderer)

**Fix: `parseFrontmatter` removido — metadataCache como fonte unica:**
- Antes: parser YAML manual (split por `\n`, busca `:`) com bugs conhecidos (listas hardcoded em `tags`, tipos achatados pra string)
- Agora: CM6 path usa `metadataCache.getFileCache()` pra valores de frontmatter (mesmo source que code blocks e DOM injection)
- Hash de deteccao de mudanca usa string YAML bruta (`extractRawYaml`) — deteccao imediata sem parsing
- `parseFrontmatter` substituido por `extractRawYaml` (~40 linhas → 3 linhas)
- Bug corrigido: filterProps com arrays em chaves diferentes de `tags` (ex: `categories`) agora funciona corretamente

**Fix: code blocks sem `source:` agora re-renderizam com frontmatter da propria nota:**
- Antes: code blocks sem `source:` nao se registravam no `SourceDependencyRegistry` — frontmatter local mudava mas ninguem invocava `doRender()`
- Agora: code blocks sem `source:` registram self-dependency (`ctx.sourcePath` como source) — `metadataCache.on('changed')` encontra os callbacks e re-renderiza
- Hash cache do `templateRenderer` previne re-render desnecessario se conteudo nao mudou

**Fix: throttle de forced update 1000ms → 500ms:**
- Clicar checkbox boolean rapidamente fazia o segundo toggle ser ignorado pelo throttle
- Mirror ficava preso no estado anterior ate proximo evento
- Reduzido em `timingConfig.ts`

**Chore: 5 unused imports removidos (lint zerado):**
- `CustomMirror` (settings.ts), `Logger` (marginPanelExtension.ts), `Component`/`MarkdownRenderChild` (domInjector.ts), `MirrorUIPluginSettings` (pluginFactory.ts)

**Testes:** 138 passando (+7 novos: extractRawYaml, hash detection com stale cache, filterProps com tipos nativos do metadataCache)

### v40: backlinks visibility — DOM-truth via children.length

**Fix: backlinkInDocument nao e reativo pra abas abertas:**
- `backlinkInDocument` muda config imediatamente, mas o DOM so atualiza no close+reopen da aba
- Antes: `isDomTargetVisible` lia `backlinkInDocument` da API → dessincronizado com DOM real
- Agora: `isDomTargetVisible` so checa `bl.enabled` (plugin ON/OFF, que E reativo)
- `resolveTarget` checa `children.length > 0` no `.embedded-backlinks` pra detectar conteudo real
- `.embedded-backlinks` vazio (0 children) = shell sem conteudo → CM6 fallback
- `.embedded-backlinks` com filhos (`.nav-header`, `.backlink-pane`) = conteudo real → DOM inject

**Fix: below-backlinks .cm-sizer fallback incorreto:**
- `.cm-sizer` fallback so ativa quando `.embedded-backlinks` NAO existe (plugin OFF)
- Antes: elemento vazio (exists + 0 children) caia no `.cm-sizer` e fazia DOM inject errado
- Agora: elemento vazio → null → CM6 bottom fallback

**Fix: vault.on('raw') nao reage a backlink.json:**
- `backlink.json` (backlinkInDocument toggle) NAO trigga `refreshAllEditors`
- So `core-plugins.json` (plugin ON/OFF) trigga refresh — o unico que e reativo no DOM
- `lastObsidianConfig` simplificado: so `backlinkEnabled`, sem `backlinkInDocument`

**Testes:**
- 132 testes passando (+6)
- Novos: `isDomTargetVisible` backlinks (plugin ON regardless of backlinkInDocument), `resolveTarget` empty shell vs real content

### v39: isDomTargetVisible + smart fallback chain + reactive config detection

**Feature: `isDomTargetVisible()` + smart fallback chain:**
- Nova funcao `isDomTargetVisible()` que consulta `app.vault.getConfig()` antes da injecao DOM
- Obsidian nunca remove `.inline-title` / `.metadata-container` do DOM — so esconde via CSS (`display:none`). Sem essa checagem, `querySelector` sempre encontrava o elemento e fallback nunca disparava
- `resolveTarget()` agora aceita parametro opcional `app` pra verificar visibilidade antes do querySelector
- Fallback chain preserva hierarquia DOM: `above-title → above-properties → CM6 top` (em vez de pular direto pro CM6 top)
- `setupDomPosition` em main.ts faz retry de injecao quando fallback retorna outra posicao DOM
- `removeAllDomMirrors(file.path)` chamado antes da re-injecao pra evitar containers duplicados

**Feature: Deteccao reativa de mudanca de config:**
- Listener `vault.on('raw')` detecta mudancas em `.obsidian/app.json` (toggle inline title, visibilidade de properties)
- Chama `refreshAllEditors()` automaticamente — mirrors se reposicionam em tempo real sem restart
- Evento `css-change` foi testado mas NAO dispara pra essas mudancas de config

**Testes:**
- 126 testes passando (era 119)
- Novos: `isDomTargetVisible` (7 casos), `getFallbackPosition` atualizado pra chain DOM
- Mock: `pluginFactory.ts` agora inclui `vault.getConfig()` com defaults

**Infraestrutura de teste:**
- Pasta `test-visibility/` com 4 notas de teste (vis-above-title, vis-above-props, vis-below-props, vis-cm6-top)
- Template `templates/positions/visibility-test.md`
- 4 configs de mirror adicionadas ao data.json pra testes de visibilidade

### v38: CSS parity com Reading View nativo — diagnostic triplo + fixes guiados por dados

**Diagnostic triplo (mirror vs Reading View vs Live Preview):**
- `debugComputedStyles` reescrito: recebe `plugin` + `templatePath`, usa `workspace.iterateAllLeaves()` pra encontrar o template em Reading View (mode=preview) e Live Preview (mode=source, source=false)
- Reading View: mesmos seletores HTML (h1, .callout, hr, etc.) — comparacao 1:1
- Live Preview: seletores CM6 mapeados (`.HyperMD-header-1` → h1, `.cm-callout .callout` → .callout, etc.)
- Diff triplo: mirror vs RV, mirror vs LP, RV vs LP — identifica o que e responsabilidade nossa vs delta do Obsidian
- Seletor `pre` corrigido pra `pre:not(.frontmatter)` (diagnostic pegava o `<pre>` fantasma do MarkdownRenderer)

**CSS fixes guiados pelo diagnostic (4 mismatches corrigidos):**
- `hr` margin: 1em → **2em** (16px → 32px) — match exato com native-rv
- `h2/h3:first-of-type` removido — so h1 deve ter mt:0. `:first-of-type` pega o primeiro h2 do container mesmo quando h2 segue h1, zerando indevidamente
- `pre` margin-top: adicionado **1em** (0 → 16px) — match exato com native-rv
- `pre:not(.frontmatter)` no diagnostic — `pre.frontmatter` (display:none) era capturado em vez do code block real

**Resultado: todos os 11 elementos comparados (h1-h3, p, .callout, .callout-content, hr, ul, li, blockquote, pre) com computed styles identicos entre mirror e Reading View nativo.** Unico "mismatch" restante e padding-bottom do scroll area do Reading View (irrelevante pros mirrors).

### v37: CSS parity — callout/hr margins, h1 first-of-type, text selection, debug diagnostic

**CSS parity entre CM6 widget, DOM injection e rendering nativo:**
- Callout/hr margins: regras com especificidade alta + `!important` pra vencer theme resets. `.callout` e `hr` passaram de mt:0/mb:0 pra mt:16px/mb:16px
- h1 margin-top: MarkdownRenderer injeta `<pre class="frontmatter language-yaml">` (display:none) antes do h1, quebrando `:first-child`. Fix: `:first-of-type` pra h1/h2/h3 + `:first-child` generico
- Text selection restaurada: `user-select: text !important` no `.markdown-rendered` e filhos (overrida `user-select: none` do widget container)
- below-properties margin-top: 10px → 0 (`.metadata-container` ja tem margin-bottom nativo, somava gap extra)
- Debug outlines melhorados: cores por tipo de container (vermelho=CM6, verde=DOM, laranja=code block, cinza=metadata-container)
- `debugComputedStyles` reescrito: captura mirror + nativo + filhos diretos + ancestors (5 niveis) + diff automatico prop a prop

**Descoberta: `.markdown-preview-view` como classe no contentDiv nao funciona:**
- Tentativa de herdar styles do theme adicionando `.markdown-preview-view` no container de render
- Resultado: theme aplica backgrounds, paddings, widths extras que bagunçam layout
- Decisao: manter margins manuais nos poucos elementos que precisam (callout, hr, h1)

**Pendente (minor):** espaçamento entre elementos nos mirrors vs nativo (Live Preview). Nativo herda margins maiores do theme via `.markdown-preview-view` ancestor. Mirrors usam margins manuais que sao proximos mas nao identicos.

### v36: Reactivity fix — filePathFacet + handleTemplateChange + inactivity guard removal

**Bug fix — `getActiveFile()` em cenario cross-pane:**
- CM6 StateField `create()` e `update()` usavam `getActiveFile()` pra obter o arquivo do editor
- Com 2+ paineis, `getActiveFile()` retorna o painel com foco, nao necessariamente o painel daquele editor
- Cenario: template no painel A, nota com mirror no painel B. Forced update no B → `getActiveFile()` retorna A (template) → `getApplicableConfig(template)` → null → widget sumia
- Fix: `filePathFacet` (Facet CM6) injetado em `setupEditor()` com `file.path`. Cada editor recebe seu path via `state.facet(filePathFacet)`, independente do painel ativo
- `mirrorWidget.ts`: `updateContentIfNeeded` usa `state.filePath` em vez de `getActiveFile()`
- `mirrorTypes.ts`: campo `filePath: string` adicionado ao `MirrorState`

**Fix — Cenario C-settings (editar template → CM6 mirror nao atualiza):**
- `handleTemplateChange()` fazia early return quando `templateCbs.length === 0` (CM6 widgets nao se registram no `templateDeps`)
- Fix: `knownTemplatePaths` (Set precomputado dos template paths nos settings) como fast-path O(1)
- `iterateAllLeaves` movido pra dentro do debounce (nao roda sincronamente a cada `vault.on('modify')`)
- Sem `clearRenderCache()` global (desnecessario — `handleForcedUpdate` no StateField ja faz + hash invalida naturalmente)

**Fix — Cenario A (editar frontmatter via Properties UI):**
- Guard de inatividade (`USER_INACTIVITY_THRESHOLD`) removia o `forceMirrorUpdateEffect` durante digitacao
- Properties UI edita YAML sem gerar CM6 transactions → StateField nao auto-detecta → guard bloqueava unico caminho
- Fix: remover guard. Debounce 500ms + throttle 1/sec no StateField ja protegem contra spam

**Dead code removido:**
- `getLastUserInteraction()`, `lastUserInteraction`, `USER_INACTIVITY_THRESHOLD` — nao mais necessarios

### v35: Performance fix (DOM injector, Logger, Margin panel) + Template reactivity

**Performance — hot path de digitacao zerado:**
- `setupDomPosition()` removido do `setupEditor()` (chamado a cada keystroke via `editor-change`). Chamadas explicitas em `file-open`, `active-leaf-change`, `onLayoutReady`, `settings-change`
- `setupEditor()` faz early return imediato quando StateField ja existe (sem log, sem setTimeout)
- `Logger.log()` e `Logger.warn()` fazem early return quando debug desligado (antes: `console.log` sempre)
- Margin panel: `update.docChanged` → `update.geometryChanged` (elimina forced layout reflow por keystroke)
- `clearRenderCache()` global removido do `handleTemplateChange` — hash cache invalida naturalmente quando conteudo do template muda

**Template reactivity:**
- `TemplateDependencyRegistry` — registry de dependencias por template path (analogo ao `SourceDependencyRegistry`)
- `handleTemplateChange()` em main.ts — debounced 500ms, re-render todos mirrors (DOM + CM6 + code blocks) que usam o template editado
- Triggers: `metadataCache.on('changed')` (Branch 3) + `vault.on('modify')` (body changes)
- Code blocks registram template deps automaticamente via `templateDeps.register()` com cleanup no lifecycle
- DOM injection registra template deps em `setupDomPosition()`

### v34: CI/CD + Release workflow

**GitHub Actions:**
- `.github/workflows/release.yml` — cria release automatico no push de tag (`*.*.*`) com main.js, manifest.json, styles.css
- `.github/workflows/ci.yml` — roda build + lint + test em push/PR pra main
- Usa `softprops/action-gh-release@v1` + `actions/checkout@v4` + `actions/setup-node@v4` (Node 18)

**Flow de release:**
- `npm version patch/minor/major` → roda version-bump.mjs (synca manifest.json + versions.json)
- `git push && git push --tags` → Action cria release no GitHub
- BRAT: usuario adiciona repo URL e recebe updates

**Skill obsidian-plugin-scaffold atualizada:**
- Secao CI/CD com templates de release.yml e ci.yml
- Secao "How to Release" com instrucoes
- README template com secao Install (BRAT + manual)
- Project structure atualizado com .github/workflows/

### v33 — Refatoracao estrutural

### v33: Refatoracao estrutural (zero mudancas de comportamento)

**Reorganizacao de settings.ts (813 → ~320 linhas):**
- Interfaces + defaults extraidos pra `src/settings/types.ts`
- Path validation extraido pra `src/settings/pathValidator.ts`
- Builder reutilizavel pros 3 filter blocks (files/folders/props) em `src/settings/filterBuilder.ts`
- Funcao helper `addModeToggle()` elimina duplicacao entre global e custom mirrors
- Re-exports em settings.ts mantém compatibilidade de imports

**Refatoracao do mirrorState.ts update() (198 → orquestrador enxuto):**
- `hasForcedUpdate()` — deteccao de effect
- `detectFrontmatterChange()` — analise de ranges alterados
- `handleForcedUpdate()` — path completo de forced update
- `handleConfigChange()` — path normal de config change
- `clearWidgetCaches()` — limpeza de instance cache
- Update() agora e um orquestrador que delega pras funcoes acima

**Dependencia circular resolvida:**
- `mirrorState.ts` ↔ `mirrorDecorations.ts` eliminada
- `buildDecorations()` movido pra `src/editor/decorationBuilder.ts` (sem import de mirrorState)
- `mirrorDecorations.ts` deletado (cleanOrphanWidgets nunca era chamado)

**Dead code removido:**
- `YAMLSuggest.ts` deletado (substituido por `YamlPropertySuggest` em suggesters/)
- `src/editor/mirrorViewPlugin.ts` deletado (recovery plugin desabilitado desde v25.2)

**Suggesters movidos pra src/:**
- `utils/suggest.ts` → `src/suggesters/suggest.ts`
- `utils/file-suggest.ts` → `src/suggesters/file-suggest.ts`
- Diretorio `utils/` da raiz removido

**Wrapper de APIs internas do Obsidian:**
- `src/utils/obsidianInternals.ts` — centraliza @ts-ignore em funcoes tipadas
- `getEditorView()`, `getVaultBasePath()`, `openSettings()`, `openSettingsTab()`, `rerenderPreview()`, `addSearchClass()`
- main.ts e settings.ts usam os wrappers em vez de @ts-ignore direto

**Verificacao:** 85 testes passando, build limpo, zero mudancas de comportamento

---

### v32: Position Engine (DOM + Margin) + filterProps Fix

**Novas posicoes (9 no total, de 3 implementadas pra 9):**
- `above-title` — DOM: `insertBefore(.inline-title)` com fallback → top CM6
- `above-properties` — DOM: `insertBefore(.metadata-container)` com fallback → top CM6
- `below-properties` — DOM: `insertAfter(.metadata-container)` com fallback → top CM6
- `above-backlinks` — DOM: `insertBefore(.embedded-backlinks)` com fallback → bottom CM6
- `below-backlinks` — DOM: `insertAfter(.embedded-backlinks)` com fallback → bottom CM6
- `left` — CM6 ViewPlugin: panel absoluto no `scrollDOM`, posicionado via `contentDOM.offsetLeft`
- `right` — CM6 ViewPlugin: mesmo pattern, lado oposto

**Arquitetura de posicoes:**
- `MirrorPosition` type union com 9 valores (era 4 strings)
- `DOM_POSITIONS`, `CM6_POSITIONS`, `MARGIN_POSITIONS` — categorias exportadas
- Novo: `src/rendering/domInjector.ts` — engine DOM com resolucao de target, fallback, e cleanup
- Novo: `src/editor/marginPanelExtension.ts` — ViewPlugin basico pro left/right
- `positionOverrides` no plugin — quando DOM fallback acontece, overrides forcam CM6 position

**Fix: filterProps com arrays e booleans:**
- `mirrorConfig.ts`: matching de properties agora trata `boolean`, `Array`, e coercao `String()`
- Antes: `frontmatter[key] === template` (strict equality, falhava pra tags e booleans)
- Agora: array → `val.some(item => String(item) === template)`, boolean → `String(val) === template`

**Fix: bug no dropdown do global preview mode:**
- `settings.ts`: preview mode dropdown salva/le em `global_settings_preview_pos` (antes usava `global_settings_live_preview_pos` por engano)

**Dropdown de posicoes atualizado:**
- Labels visuais: "Above title", "Top of note", "Above properties", "Below properties", "Bottom of note", "Above backlinks", "Below backlinks", "Left margin", "Right margin"
- Helper `addPositionOptions()` — DRY pra 4 dropdowns

**Arquivos novos:**
- `src/rendering/domInjector.ts`
- `src/editor/marginPanelExtension.ts`

**Arquivos modificados:**
- `src/editor/mirrorTypes.ts` — MirrorPosition type + constantes
- `src/editor/mirrorConfig.ts` — filterProps fix + positionOverrides + import MirrorPosition
- `src/editor/mirrorDecorations.ts` — sem mudanca (DOM positions retornam Decoration.none)
- `settings.ts` — dropdown helper + positionOverrides clear no updateAllEditors
- `main.ts` — setupDomPosition, import domInjector/marginPanel, cleanup no onunload
- `styles.css` — CSS pra DOM positions e margin panels

## v31 — Refatorar Suggester + Busca de Mirrors

### v31: Refatorar Suggester + Busca de Mirrors

**Refatoracao:**
- `utils.ts` eliminado — `wrapAround` movido inline pra `utils/suggest.ts`
- `suggest.ts` limpo: `(<any>this.app).dom.appContainerEl` → `document.body`, `(<any>this.app).keymap` → `// @ts-ignore` explicito, whitespace removido
- `templater_search` → `mirror-search-input` em 4 ocorrencias no `settings.ts`
- `utils/file-suggest.ts` sem mudanca (codigo limpo)

**Busca de mirrors no settings:**
- Novo campo de busca inline acima da lista de custom mirrors
- Filtro por nome em tempo real (hide/show de cards via `display: none`)
- Mensagem "No mirrors matching" aparece dentro do `mirror-plugin-cards` com visual de card (background, border-radius)
- CSS: `.mirror-search-container` com `margin-bottom` e `border-top: none`, `.mirror-search-empty` com visual de card

## v30 — Cross-Note Reactivity (Era 5)

**Mirror blocks com `source:` agora atualizam automaticamente quando o frontmatter da nota source muda em outra aba.**

### v30: Cross-Note Reactivity

- Novo `src/rendering/sourceDependencyRegistry.ts` — registry centralizado de dependencias cross-note
  - Map `sourcePath → Set<blockKey>` com callbacks de re-render
  - Lookup O(1) no `metadataCache.on('changed')`
- `codeBlockProcessor.ts` — registra dependencia + callback `doRender()` quando bloco tem `source:`
  - Callback re-resolve variaveis (frontmatter fresco) e re-renderiza no mesmo container
  - Cleanup automatico via `MarkdownRenderChild.register()` quando bloco e destruido
- `main.ts` — branch cross-note no listener de `metadataCache.on('changed')`
  - `sourceDeps` como propriedade publica do plugin
  - Debounce via `crossNoteTimeout` (500ms, reusa `TIMING.METADATA_CHANGE_DEBOUNCE`)
  - Callbacks invocados diretamente (funciona em Live Preview e Reading View)
  - Cleanup do registry e timeout no `onunload()`
- Abordagem inicial com `previewMode.rerender(true)` descartada — so funciona em Reading View

### v29: Dependency Update + Insert Mirror Block + Cleanup

**Dependencias atualizadas (blocker pro benchmark):**
- TypeScript 4.7.4 → 5.9.3 (major)
- esbuild 0.17.3 → 0.25.12 (major)
- @types/node 16 → 22 (major)
- @codemirror/state 6.5.2 → 6.5.4, @codemirror/view 6.37.2 → 6.39.17 (movidos pra devDeps)
- obsidian: latest → ^1.12.3 (pinado)
- tslib 2.4.0 → 2.8.1
- builtin-modules 3.3.0 → 4.0.0
- ESLint migrado: .eslintrc → eslint.config.mjs (flat config v9 + @typescript-eslint v8)
- Script `npm run lint` adicionado
- tsconfig modernizado: target ES6 → ES2018, lib DOM+ES2018

**Facet CM6 + Fix onunload:**
- `window.mirrorUIPluginInstance` substituido por `mirrorPluginFacet` (Facet CM6 idiomatico)
- `StateEffect.reconfigure([])` removido do onunload — nukava todas as extensoes CM6 de todos os editores
- `window.mirrorUICleanup` substituido por `cleanupMirrorCaches()` (funcao exportada)

**Insert Mirror Block (menu contextual):**
- Novo arquivo: `src/commands/insertMirrorBlock.ts`
- Modal com campos Template e Source (FileSuggest para autocomplete)
- Insere bloco ` ```mirror ``` ` no editor
- Acessivel via right-click (editor-menu) e Command Palette (Cmd+P)

**Limpeza de codigo (detectada pelo linter novo):**
- 22 unused imports/vars removidos em 11 arquivos
- Dead code: `lastUpdateTime`, `RESERVED_KEYS`, `hasFrontmatter`, `frontmatterEndLine`
- prefer-const aplicado onde apropriado

### v28.1: Clickable Error in Renderer (Era 5)

**Erro "Template not found" agora tem link clicavel "Open settings" dentro do widget/code block.**

### v28.1: Clickable Error Link in Renderer

- Erro "Template not found" no renderer agora exibe link "Open settings" clicavel
- `openSettingsToField` tornado `public` em main.ts (antes `private`)
- Erro construido via DOM (createEl) em vez de innerHTML estatico — permite event listeners
- `pointer-events: auto` + `user-select: text` no errorDiv — necessario porque o container do CM6 widget tem `pointer-events: none`
- Cache guard de innerHTML removido do bloco de erro (redundante com hash cache)
- Funciona em CM6 widget (Live Preview) e code block processor (Reading View)

### v28: Rename-Aware Settings + Inline Validation

- `vault.on('rename')` — detecta rename/move, atualiza paths nos settings automaticamente
- `vault.on('delete')` — Notice clicavel avisando qual mirror ficou com template quebrado
- Toggle global `auto_update_paths` (ON default) + toggle per-mirror `custom_auto_update_paths`
- Notice clicavel "Open settings" — expande mirror colapsado, scroll + focus no campo afetado
- Inline path validation: warning vermelho dentro do `.setting-item` quando path nao existe
  - Valida no render e no blur do input
  - Cobre template paths, filterFiles (filename) e filterFolders (folder path)
- Bug fix: `custom_auto_update_paths` undefined em mirrors existentes → check `=== false`

### Historico de Eras

#### Era 1: Prototype Sprint (Jun 6-8, 2024)
- v1: Skeleton: Notice, stubs
- v2: Ribbon button + tooltip
- v3: YAML type check
- v4: ProjectToolbarPlugin + MarkdownRenderer
- v5: cm-scroller targeting
- v6: MirrorUIPlugin class with settings, view, ribbon
- v7: Settings tab enabled
- v8: Mode detection (eventTests, bugs: null guards missing)
- v9: Full routing + debug (addToolbar restored, mode routing, excessive Notices)
- v10: v1 final + primeiro _historico files

#### Era 2: Settings Evolution (Jul 19 - Aug 5, 2024)
- v11: settings.ts + YAMLSuggest (Era 2 start, rewrite completo)
- v12: utils/ autocomplete (TextInputSuggest, FileSuggest, FolderSuggest, YamlPropertySuggest)
- v13: SettingModel1 (primeiro modelo alternativo, usa utils do v12)
- v14: SettingModel2 (31KB, Getting Started banner, global/custom mirrors, cards)
- v15: SettingModel3 (checkpoint, identico ao v14)
- v16: finalmente.ts wired into main.ts (bug: constructor 1 param, crash no settings)
- v17: Settings.ts final (fix constructor crash, versao limpa 732 linhas)
- v18: Build + styles.css (Era 2 complete)

#### Era 3: CSS (Nov 2024)
- v19: styles.css rewrite (grid layout, novas classes form-layout)

#### Era 4: CM6 Rewrite (Jun 24, 2025)
- **v20: CM6 integration** — Rewrite completo!
  - Todo o codigo de settings/utils da Era 3 removido
  - Nova arquitetura baseada em CodeMirror 6
  - StateField para gerenciamento de estado (mirrorState.ts)
  - ViewPlugin para renderizacao de widgets (mirrorViewPlugin.ts)
  - WidgetType para decoracoes inline (mirrorWidget.ts)
  - Deteccao de frontmatter via filtros configuraveis
  - Renderizacao de templates markdown com substituicao de variaveis {{var}}
- **v21: Settings + v1.1.0** — Settings tab com CM6!
  - Settings tab completo com configuracoes globais e customizadas
  - Plugin renomeado de sample-plugin para mirror-notes v1.1.0
  - manifest.json e package.json atualizados
  - @popperjs/core adicionado, autocomplete de volta
  - Arquivos de referencia: Settings_REFERENCIA.ts, styles_REFERENCIA.css, main_REF.js
- **v22: Posicionamento** — Posicionamento relativo + settings reactivity
  - Limpeza de widgets orfaos (cleanOrphanWidgets)
  - onunload melhorado: remove widgets e reconfigura CodeMirror
  - Settings disparam forceMirrorUpdateEffect via updateAllEditors()
  - Path de config usa manifest.id em vez de hardcoded sample-plugin
- **v23: Modularizacao** — Refatoracao em arquivos menores
  - Novo mirrorConfig.ts: constantes e configuracao extraidas
  - Novo mirrorDecorations.ts: logica de decoracoes extraida
  - Novo mirrorTypes.ts: definicoes de tipos compartilhados
  - Novo mirrorUtils.ts: funcoes utilitarias extraidas
  - mirrorState.ts simplificado com imports modulares
  - Diretorio backup/ com copias de referencia pre-modularizacao
- **v24: Fix YAML** — Fix YAML frontmatter + settings + prioridade
  - parseFrontmatter() agora suporta listas YAML (linhas com `-`)
  - Obsidian padronizou `tags` como lista e o parser anterior nao lidava
  - Fix toggle swap: Hide Properties e Replace Custom Mirrors estavam trocados
  - Nova logica de prioridade custom vs global mirrors em mirrorConfig.ts
  - HideFrontmatterWidget usa Decoration.replace em vez de display:none por linha
  - Filtros configuraveis substituem `type: project` hardcoded (filterFiles, filterFolders, filterProps)
- **v25: Fix hideProps — FINAL VERSION**
  - Novo updateHidePropsForView() em main.ts: toggle CSS class `.mirror-hide-properties`
  - HideFrontmatterWidget removido inteiro de mirrorDecorations.ts
  - Decorations simplificadas de ~120 pra ~35 linhas
  - styles.css: `.mirror-hide-properties .metadata-container { display: none }`, seletores com `:has()`
  - settings.ts chama updateHidePropsForView() apos force update

#### Era 5: Code Block Processor (Mar 2026)
- **v27: Performance, timing centralizado, cleanup de globals**
  - Novo `src/editor/timingConfig.ts` — 8 constantes de timing centralizadas (TIMING object)
  - Magic numbers (25, 100, 500, 1000) substituidos em main.ts (6), mirrorState.ts (2), settings.ts (1)
  - `configCache` ativado em mirrorConfig.ts (existia em mirrorState.ts mas nunca era usado)
  - Cache por `file.path` + `frontmatterHash` — evita recomputar config a cada keystroke
  - `clearConfigCache()` chamado em forced updates, settings change, e settings tab
  - Mirror index: `buildMirrorIndex()` constroi Maps de file→mirror e folder→mirror. File match O(1), folder match O(depth). Rebuild lazy via `clearConfigCache()`
  - Override duplicado eliminado: matching rodava 2x quando `global_settings_overide` ativo. Agora guarda referencia na primeira passada
  - `vault.read()` → `vault.cachedRead()` em templateRenderer.ts (retorna da memoria se arquivo nao mudou)
  - Startup unificado: `iterateAllLeaves` duplicado removido, setupEditor + rerender numa unica passada no onLayoutReady
  - `window.mirrorUIPluginInstance` substituido por `mirrorPluginFacet` (Facet CM6 idiomatico)
  - `window.mirrorUICleanup` substituido por `cleanupMirrorCaches()` (export normal)
  - Removido `StateEffect.reconfigure([])` do onunload (nukava todas as extensoes CM6)
- **v26: Code block processor + shared renderer**
  - `registerMarkdownCodeBlockProcessor("mirror", ...)` — funciona em Reading View e Live Preview
  - Sintaxe: ` ```mirror\ntemplate: path\nsource: nota\nvar: valor\n``` `
  - Logica de rendering extraida para `src/rendering/templateRenderer.ts` (modulo compartilhado)
  - CM6 widget (`mirrorWidget.ts`) refatorado para usar `renderMirrorTemplate()`
  - Parser de code blocks em `src/rendering/blockParser.ts`
  - Resolucao de variaveis: inline > source > frontmatter da nota atual (via `metadataCache`)
  - `MarkdownRenderChild` para lifecycle correto no Reading View
  - `onLayoutReady()` forca re-render de notas ja abertas ao iniciar
  - Cache de hash desabilitado para code blocks (container recreado pelo Obsidian a cada render)

### Bugs conhecidos (v25)

- **Hide Properties nao funciona**: `updateHidePropsForView()` dispara (visivel nos logs) mas o seletor CSS `.mirror-hide-properties .metadata-container { display: none }` nao bate com a estrutura DOM atual do Obsidian. Frontmatter continua visivel.
- **filterProps nao funciona com listas YAML**: Matching usa `===` (string vs array = sempre false). So valores simples funcionam (ex: `type: projects`).
- **parseFrontmatter hardcoda listas em `result.tags`**: Todas as linhas com `-` sao jogadas em `result.tags`, ignorando a key real da lista.

### Arquitetura (v25)

```
main.ts                          — MirrorUIPlugin (CM6 extensions, settings, hideProps)
settings.ts                      — MirrorUISettingsTab (global/custom mirrors, filters)
YAMLSuggest.ts                   — YAML property suggestions
utils.ts                         — Utility functions
utils/file-suggest.ts            — FileSuggest, FolderSuggest, YamlPropertySuggest
utils/suggest.ts                 — Abstract suggest base class
src/editor/mirrorState.ts        — CM6 StateField + StateEffects + parseFrontmatter
src/editor/mirrorViewPlugin.ts   — CM6 ViewPlugin (widget rendering)
src/editor/mirrorWidget.ts       — CM6 WidgetType (template rendering + {{var}} substitution)
src/editor/mirrorConfig.ts       — Configuration + filter matching logic
src/editor/mirrorDecorations.ts  — Decoration builder
src/editor/mirrorTypes.ts        — Shared type definitions
src/editor/mirrorUtils.ts        — Editor utility functions
styles.css                       — Plugin styles + hideProps CSS
```

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```

O build (dev e production) copia automaticamente `main.js`, `manifest.json` e `styles.css` para `demo/.obsidian/plugins/mirror-notes/` via plugin `copyToDemo` no `esbuild.config.mjs`. Basta abrir o vault `demo/` no Obsidian para testar.

