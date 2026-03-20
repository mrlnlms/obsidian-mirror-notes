# Mirror Notes — Backlog

Trabalho tecnico pendente. Atualizado pos-v58.

## Code Review v58

9 rodadas, 11 findings na ultima (4 medium, 7 low). 6 resolvidos inline, 5 pro backlog.

### Pendente (findings da rodada 9)

- **readableLineLength override nao aplica em Reading View** (medium) — `.markdown-source-view` selector acha o container LP (hidden em RV), toggle aplica no elemento errado. hideProps/showInlineTitle nao tem esse problema (usam .view-content). Precisa de decisao: aplicar no `.markdown-reading-view` tambem, ou limitacao aceita? Relacionado com #11
- **Double position override no trace** (medium) — `getApplicableConfig` ja aplica positionOverride, `computeMirrorRuntimeDecision` re-consulta. requestedPosition mostra valor ja overridden. Zero impacto funcional, polui debug.log
- **resetConfigSnapshot usa defaults hardcoded** (low) — showInlineTitle:true, propertiesInDocument:'visible', backlinkEnabled:false no unload. Se usuario tem valores diferentes, snapshot fica errado ate proximo onload. Janela pequena
- **transition: none !important em .mirror-ui-widget \*** (low) — mata animacoes em todo conteudo renderizado (callout fold, temas). Precisa avaliar: remover causa flickering? Scoped pra excluir .markdown-rendered?
- **readableLineLength nao monitorado pelo config watcher** (low) — obsidianConfigMonitor monitora showInlineTitle e propertiesInDocument, mas nao readableLineLength. Depende do fix de #1

## Code Review v56

Auditoria completa do codebase (v55). Findings organizados por severidade.

Todos os findings resolvidos ou avaliados. Ver secoes "Considerado resolvido" e "Resolvidos" abaixo.

## Epico: Margin Panel

O margin panel (`marginPanelExtension.ts`) renderiza mirrors nas posicoes `left` e `right` como ViewPlugin CM6. Posicionamento flush (left:0/right:0) e ResizeObserver ja implementados (v45). Plano de trabalho em `docs/superpowers/plans/`.

Itens pendentes:

- **Largura do painel** — hoje e 250px fixo (`PANEL_WIDTH`). Testar diferentes estrategias: proporcional ao espaco disponivel, configuravel por mirror, fit-content com max-width, ou combinacao
- **Sobreposicao / threshold** — quando nao tem espaco (janela estreita, readable line length OFF), o painel sobrepoe conteudo. Definir threshold minimo pra renderizar e fallback (ocultar? mover pra top/bottom?). Evitar valores magicos hardcoded
- **Gutters / line numbers** — calculo de posicao nao considera `cm-gutters.offsetWidth`. Relevante quando line numbers estao ativados
- **Min-height** — painel cresce com conteudo, sem min-height. Avaliar se precisa de altura minima (VN usa 528px footer, 100px above-backlinks como referencia)

## Template Variables — concluido (pos-v53)

Dot notation + unicode implementados. Regex expandido de `[\w-]+` pra `[\w\p{L}\p{N}.-]+` com flag `u`. Funcao `resolveVariable(key, variables)` em mirrorUtils.ts com estrategia flat-first, nested-fallback. 17 testes novos (13 resolveVariable + 4 templateRenderer).

## Observabilidade e decisao centralizada (teto de qualidade de codigo)

Identificado via analise de carga cognitiva (Codex, 2026-03-18). O codigo esta limpo e modular, mas o **fluxo de decisao de runtime** (qual engine? qual posicao? fallback? por que?) fica espalhado em 4-5 modulos. Debugar "por que esse mirror sumiu?" exige juntar pecas de main.ts, mirrorConfig, domInjector, domPositionManager e templateRenderer. Este e o limite maximo de melhoria estrutural — depois disso, so E2E testing acrescenta algo.

**Nivel 1 — Logs orientados a decisao — CONCLUIDO (pos-v53)**
`traceMirrorDecision()` implementado em mirrorUtils.ts com prefixo `[trace]` filtravel. 5 pontos de insercao: config-resolve (mirrorConfig), cooldown-skip e dom-injection (domPositionManager), forced-update (mirrorState), render-skip (templateRenderer). Filtrar: `grep '[trace]' debug.log`. 6 testes unitarios.

**Nivel 2 — Funcao central de decisao (`computeMirrorRuntimeDecision`) — CONCLUIDO (v55)**
`computeMirrorRuntimeDecision()` em `mirrorDecision.ts`. Funcao pura: recebe (plugin, file, frontmatter, viewId, viewMode), retorna `{ config, engine, requestedPosition, resolvedPosition, fallbackApplied, reason }`. `resolveEngine()` centraliza decisao de engine (CM6 positions em RV → dom). `domPositionManager.setupDomPosition` refatorado pra usar a decisao. 11 testes unitarios.

**Nivel 3 — Documentar fluxos canonicos no architecture.md — CONCLUIDO (v55)**
3 fluxos canonicos documentados em architecture.md: mode switch (Cmd+E), metadata change, template change. Cada fluxo com evento de entrada → funcao central → saidas possiveis.

**Nivel 4 — Migrar callers restantes pra `computeMirrorRuntimeDecision` — CONCLUIDO (v56)**
`mirrorState.ts` (3 callers) e `viewOverrides.ts` (1 caller + resolveEngine) migrados. `marginPanelExtension.ts` nao chamava diretamente (backlog stale — pega config do StateField). viewMode explicitado como `'source'` nos callers CM6. `getApplicableConfig` e `resolveEngine` agora sao internos a `mirrorDecision.ts` — zero callers externos em producao.

**O que NAO fazer:** nao abstrair demais, nao criar framework interno, nao refatorar so porque e complexo. Complexidade atual e quase toda inevitavel dado o escopo do plugin (paridade LP/RV, 7 posicoes, multi-pane, fallback chain, reatividade) num host sem APIs publicas completas.

## Suggest component — migrado pra AbstractInputSuggest (v57)

Migrado de `@popperjs/core` + `TextInputSuggest` custom pra `AbstractInputSuggest` nativo do Obsidian. `DebouncedInputSuggest` base class com debounce 150ms. Dependencia runtime eliminada. Validado manualmente + E2E smoke.

## Revisao de Settings UI

Apos margin panel. A **estrutura de codigo ja foi refatorada** (v52: settings.ts 545→83, split em 5 modulos). Pendente e UX/design:

- **Visual redesign** — layout, hierarquia, agrupamento e navegacao. Com dezenas de mirrors a lista fica dificil de navegar (busca existe desde v31 mas nao resolve). Revisao completa de organizacao visual
- **Menu de posicoes (consolidacao final)** — `bottom` + `above-backlinks` unificados (v43), `below-backlinks` alinhado (v44), `below-properties` + `top` unificados (v42). Remover opcoes deprecated do dropdown (breaking change — migrar data.json). Inclui revisao de UX writing das labels e feedbacks na tela

## E2E Testing — concluido (pos-v54)

45 E2E test cases em 10 spec files passando contra Obsidian real via `obsidian-e2e-visual-test-kit` harness. Stack: WebdriverIO 9 + wdio-obsidian-service + @wdio/visual-service.

| Suite | Specs | Cobertura |
|-------|-------|-----------|
| smoke | 3 | Plugin carrega, arquivo abre, mirror renderiza |
| positions | 8 | 5 DOM injection + 2 CM6 widgets + negative test |
| mode-switch | 4 | LP→RV→LP, dual templates, sem classes vazadas |
| lifecycle | 4 | Cold start, unload cleanup, re-enable, sem orphans |
| visual-baselines | 6 | Screenshots: above-title, viewport, CM6, RV, roundtrip |
| code-blocks | 5 | Render, variavel frontmatter, RV, source reference, border |
| advanced-behaviors | 7 | Multi-pane isolation (3), code block multi-pane (2), MutationObserver recovery (2) |

Rodar: `npm run test:e2e` (primeira vez baixa Obsidian ~200MB). Atualizar baselines: `npm run test:visual:update`.

**CI:** smoke E2E roda no GitHub Actions (ubuntu + xvfb). Visual comparison so local (screenshots sao machine-dependent). Pacote: `obsidian-e2e-visual-test-kit` via `github:mrlnlms/obsidian-e2e-visual-test-kit`.

**Learnings importantes pro harness:**
- `wdio-obsidian-service` copia `data.json` do pluginDir — injetar config via `before` hook no wdio.conf
- `editor:toggle-source` NAO funciona no sandbox — usar `markdown:toggle-preview`
- First-match-wins: uma nota por posicao nos testes
- Viewport screenshots variam 4-10% entre runs — tolerancia alta necessaria
- Screenshots no CI (Linux) tem 60%+ mismatch vs baselines macOS — rodar visual comparison so local

---

## Integracao com outros plugins

| Plugin | Syntax no template | Status | Notas |
|--------|-------------------|--------|-------|
| Dataview inline | `` `= this.campo` `` | Validado (v25.1) | Reativo via post-processor |
| DataviewJS | ` ```dataviewjs dv.current()``` ` | Validado (v25.2) | Reativo via post-processor |
| Meta-bind | `INPUT[text:campo]` | Validado (v25.2) | Leitura/escrita no frontmatter, sobrevive digitacao rapida |
| Templater | `<% tp.* %>` | Nao aplicavel | One-shot: processa na criacao da nota, nao reativo |
| Core Templates | — | Nao aplicavel | Mesmo caso do Templater: insercao estatica |
| `{{var}}` (nativo) | `{{nomeDoCampo}}` | Funciona | Syntax propria do Mirror Notes |

## Considerado resolvido

- **`getBlockViewId` closest pode retornar viewId errado se Obsidian reusar elementos** — nao e risco real. `el.closest('.workspace-leaf-content')` sobe pelo DOM e encontra o ancestral mais proximo. Cada pane tem seu proprio `.workspace-leaf-content`. Se o Obsidian reutilizar o mesmo DOM element, o WeakMap retorna o mesmo viewId — comportamento correto (mesmo element = mesmo pane). Mesmo pattern que `getViewId(view.containerEl)` usa desde v48 sem problemas. Avaliado na v54, descartado
- **`resolveVariables` perde type narrowing no spread** — nao e problema. `{ ...currentFm, ...sourceFm, ...inlineVars }` merge `Record<string, unknown>` com `Record<string, string>`, resultado e `Record<string, unknown>` — correto. Downstream (`resolveVariable`) ja faz `String()` com null checks. TypeScript esta correto. Avaliado na v54, descartado
- **`templateUpdateTimeouts` nao limpo no unload** — falso. `clearTemplateChangeTimeout()` E chamado no `onunload()` e faz `clearTimeout` + `clear()` no Map. Avaliado na v54, descartado
- **`viewIdCounter` cresce monotonicamente entre reloads** — por design. viewIds sao so identificadores unicos pra Maps e injection keys, nao precisam ser sequenciais. `resetViewIdCounter()` existe pra testes. Counter chega ao limite seguro de JS (2^53) apos bilhoes de reloads. Avaliado na v54, descartado
- **`handleForcedUpdate`/`handleConfigChange` duplicavam comparacao de config** — resolvido na v54. Extraido `hasConfigChanged(value, freshConfig)` helper em mirrorState.ts
- **`layout-change` so processa view ativa** — por design, nao e bug. Mode switch (Cmd+E) so acontece no pane ativo — Obsidian foca o pane antes de trocar modo. `getActiveViewOfType(MarkdownView)` cobre 100% do fluxo real. Varredura global de todos os panes seria desperdicio (layout-change dispara pra sidebar, splits, etc). Panes inativos sao atualizados quando recebem foco via `file-open`/`active-leaf-change`. Avaliado na v47, descartado como nao-problema
- **`viewOverrides` em Reading View** — funciona sem codigo extra. CM6 DOM (`.markdown-source-view`) existe em ambos os modos (Obsidian cria simultaneamente com `.markdown-reading-view`), mas em RV o CM6 fica hidden via CSS — o StateField existe mas nao e relevante visualmente. `applyViewOverrides` aplica CSS class no `.view-content` que cobre ambos os modos. Fallback RV consulta `getApplicableConfig` com viewMode + verifica `resolveEngine != 'none'` (v55 fix — nao aplica overrides se engine e none, ex: left/right em RV). Validado empiricamente na v47/v55
- **`configCache` indexado por `file.path` (nao per-view)** — por design. Config base (qual mirror matcha, template, posicao) e identica entre panes do mesmo arquivo. O unico dado per-view e `positionOverride`, aplicado DEPOIS do cache via `positionOverrides` Map (per-view desde v48). Cenario onde config base variasse por pane (ex: "pane A mostra mirror X, pane B mostra mirror Y pro mesmo arquivo") nao existe e nao tem UX viavel. Se surgir, refatorar cache pra `viewId + file.path`. Avaliado na v48, descartado como nao-problema
- **`resolveViewOverrides` hideProps merge com `||`** — campo legacy (`custom_settings_hide_props` / `global_settings_hide_props`) removido. `viewOverrides.hideProps` e autoritativo. `resolveViewOverrides()` eliminada. Resolvido na v48 (cleanup)
- **`main.ts` acoplamento operacional** — resolvido em 2 ondas: v49 (4 modulos: viewOverrides, domPositionManager, templateChangeHandler, settingsHelpers, 650→444), v52 (+2 modulos: obsidianConfigMonitor, modeSwitchDetector, 449→386). Zero @ts-ignore restante no main.ts
- **`settings.ts` monolitico (545 linhas)** — resolvido na v52. Split em 5 modulos: globalSection, customCards, settingsUI, viewOverridesUI, array. settings.ts reduzido pra 83 linhas (classe shell). View overrides deduplicado
- **@ts-ignore espalhados pelo codebase** — resolvido na v52. 13 @ts-ignore centralizados em obsidianInternals.ts (14 wrappers tipados). Zero fora do centralizador (exceto super() do PluginSettingTab)
- **`any` em modulos core** — resolvido na v52. mirrorState.ts (TFile, DecorationSet), mirrorTypes.ts (Record<string,any>), marginPanelExtension.ts (MirrorState, ApplicableMirrorConfig)
- **`file-open` race com `getActiveViewOfType`** — teorico, nao e bug. O handler usa setTimeout + getActiveViewOfType, mas `active-leaf-change` dispara junto com a `leaf` correta e tem o mesmo delay, corrigindo imediatamente. `setupEditor`/`setupDomPosition` usam `view.file` (nao o `file` do evento), entao operam no arquivo correto da view. Janela de race e EDITOR_SETUP_DELAY (poucos ms). Avaliado na v49, descartado
- **`filePathFacet`/`viewIdFacet` stale ao trocar arquivo na mesma pane** — nao e bug. Logs confirmam que Obsidian recria o EditorState ao navegar: `setupEditor: adding StateField` dispara em cada file-open, provando que o StateField anterior e destruido e re-adicionado com path correto. Verificado empiricamente via debug.log. Avaliado na v49, descartado
- **templateDeps stale callbacks na navegacao** — resolvido no refactor pos-v49. `domPositionManager.ts` chama `plugin.templateDeps.unregisterByPrefix(dom-${viewId}-)` no inicio de `setupDomPosition`, limpando callbacks do arquivo anterior antes de registrar novos
- **templateDeps stale no rename/delete de template** — resolvido na v55. `unregisterTemplate(path)` adicionado ao TemplateDependencyRegistry, chamado em `vault.on('rename')` (limpa callbacks do path antigo) e `vault.on('delete')` (limpa callbacks do template deletado). Previne acumulo de callbacks mortos em memoria se templates sao renomeados/deletados frequentemente. 2 testes unitarios
- **External frontmatter sync (iCloud, Obsidian Sync, Syncthing)** — seguro por design, nao e bug. Investigado na v55. Per-file debounce em `metadataCache.on('changed')` cancela timeouts anteriores em writes rapidos. Dados sempre fresh (re-query de metadataCache dentro do setTimeout, sem closure stale). `forceMirrorUpdateEffect` bypassa per-view debounce do StateField. Views destruidas durante debounce sao filtradas pelo `iterateAllLeaves`. Janela de 500ms com dados stale e inerente ao design (esperar metadataCache parsear YAML)
- **Split LP+RV do mesmo arquivo simultaneamente** — seguro por design, nao e bug. Investigado na v55. RV nao tem CM6 StateField — Reading View nao usa CodeMirror. Toda renderizacao em RV e via DOM injection (`setupDomPosition`), que passa `viewMode` corretamente via `computeMirrorRuntimeDecision`. positionOverrides isolados por `viewId:filePath`. Config cache mode-aware (`file:source` vs `file:preview`). Dual-template (LP template + RV template no mesmo mirror) funciona porque cada path (CM6 e DOM) consulta config com viewMode correto
- **Template delete durante render ativo** — graceful, nao e bug. try-catch no `doRender` captura erro de `vault.cachedRead` em TFile deletado, mostra "Template not found" com link pro settings. Settings atualizados automaticamente no rename (via `updateSettingsPaths`), manualmente no delete (usuario clica "Open settings" no Notice). `templateDeps.unregisterTemplate` limpa callbacks (v55)
- **renderingPromises stale no hot-reload** — resolvido na v55. `clearRenderingPromises()` chamado em `cleanupMirrorCaches()`. Previne instancia nova ficar presa no `while (renderingPromises.has)` esperando promise de instancia morta
- **Render concurrency com 3+ callers** — resolvido na v55. `if` → `while` loop guard em `renderMirrorTemplate`. Waiters re-checam lock apos resumir. Teste com `maxActiveRenders` tracking confirma serializacao
- **ResizeObserver perdido apos position change cycle** — resolvido na v55. `update()` chama `removePanel()` em vez de `destroy()`. Observer persiste monitorando `scrollDOM`. `destroy()` so chamado no teardown do ViewPlugin pelo CM6
- **Margin positions silenciosas em Reading View** — resolvido na v55. `resolveEngine` retorna `none` pra left/right em preview. Margin panel e CM6 ViewPlugin dentro de `.markdown-source-view` que Obsidian esconde em RV — renderizar seria invisivel
- **Fire-and-forget timers nao cancelados no onunload** — resolvido na v55. `scheduleTimer()` centraliza via `Set<NodeJS.Timeout>` com auto-cleanup. Cobre: file-open (25ms), active-leaf-change (25ms), cold-start-retry (1s), mode switch debounce (50ms), hideProps delay (100ms), openSettingsToField (250ms), backlinks retries (500/1500/3000ms). `modeSwitchDetector` expoe funcao de cleanup. Todos cancelados no `onunload`
- **Falsy frontmatter values (`0`, `false`, `""`)** — resolvido na v49. `variables[key] || match` trocado por `val != null ? String(val) : match` em templateRenderer.ts. Agora `{{count}}` com `0` e `{{done}}` com `false` renderizam corretamente
- **viewOverrides em mirrors preview-only** — resolvido. `applyViewOverrides` agora tem fallback: se StateField nao tem config (preview-only mirror), consulta `getApplicableConfig` com viewMode do view atual. Overrides aplicam corretamente em mirrors RV-only (v49)
- **sourcePath no MarkdownRenderer e a nota hospedeira, nao o template** — por design, nao e bug. `renderMarkdown(..., sourcePath)` resolve links relativos. Links no template devem resolver do contexto da nota que mostra o mirror (ex: `[[tasks]]` relativo a nota, nao ao template em `templates/`). Se resolvesse do template, links quebrariam pra qualquer nota fora da pasta do template
- **"Descartado com warning" no multi-mirror** — warning existia no antigo `buildMirrorIndex` (removido na v46). Hoje e first-match-wins silencioso. Doc do roadmap corrigida
- **`getBlockViewId` depende de `.workspace-leaf-content`** — risco aceito (v54). Mesma classe usada pelo Obsidian em toda a API de workspace (`view.containerEl`). Se Obsidian mudar o seletor, `getBlockViewId` degrada pra fallback `'default'` (sem crash, perde isolamento multi-pane de code blocks — volta ao comportamento pre-v54). Mitigacao: E2E multi-pane code blocks no backlog. Avaliado na v54, aceito como risco baixo
- **CSS parity com Live Preview nativo** — mirrors tem parity com Reading View (v38). Live Preview usa modelo de spacing completamente diferente (CM6 lines, padding em vez de margin). Delta LP vs RV e do proprio Obsidian. Nao e bug do plugin
- **`{{title}}` e `{{position}}` literal** — templates de teste usavam variaveis que nao existem no frontmatter. templateRenderer resolve so frontmatter da nota, nao propriedades do config do mirror. Comportamento correto — campo vazio e preenchido pelo usuario (ex: meta-bind)
- **Widget destroy() no-op** — por design, nao e bug. CM6 chama destroy/toDOM no viewport recycling (scroll). Limpar domCache no destroy causa re-render e flickering a cada scroll. mirrorState.ts ja limpa cacheKeys antigos quando config muda (linhas 125-126). cleanupMirrorCaches() limpa tudo no unload. Acumulo durante sessao e bounded pelo numero de widgets unicos. Avaliado na v56 code review, descartado
- **Cold start retry limpa render cache global** — trade-off aceito, nao e bug. clearRenderCache() global necessario porque DOM mirror cacheKeys sao internos ao domPositionManager e nao podem ser enumerados externamente. Unico impacto: mirrors que renderizaram OK no primeiro try re-renderizam 1x apos 1s. Custo negligivel vs garantir recovery. Documentado no codigo. Avaliado na v56 code review, aceito

## Resolvidos

- [x] Margin panel race condition — offscreen render + generation counter, stale render nao toca panel real (v58 code review)
- [x] loadSettings schema normalization — customMirrors null/{}, global_view_overrides null, custom_view_overrides por mirror (v58 code review)
- [x] Async callback fire-and-forget — Promise.resolve(cb()).catch() em sourceDeps e templateDeps loops (v58 code review)
- [x] Code block post-destroy race — isConnected guard apos await MarkdownRenderer (v58 code review)
- [x] Scalar sanitization — sanitizeBool coerce "true"/"false" string, sanitizePosition valida contra set de posicoes (v58 code review)
- [x] Settings UI texto PT/EN — ultimo texto portugues no banner Getting Started traduzido (v58)
- [x] CI actions deprecated — checkout v6, setup-node v6, cache v5, Node 22, xvfb-run inline (v58)
- [x] Unused import TAbstractFile — quebrava CI lint (v58)
- [x] data.json modify handler recarrega settings do disco — `loadSettings()` + `Logger.setEnabled()` no handler (v56 code review)
- [x] Migration guard pra `conditions` em CustomMirror — `loadSettings()` migra mirrors sem conditions/conditionLogic + defesa em profundidade com `?.` em mirrorConfig.ts (v56 code review)
- [x] `applyViewOverrides` adicionado em file-open e active-leaf-change — CSS overrides aplicam imediatamente ao navegar entre notas (v56 code review)
- [x] hashObject null guard — retorna '0' pra null/undefined, previne crash silencioso em StateField (v56 code review)
- [x] architecture.md caller list de applyViewOverrides atualizada — 6 hooks corretos documentados (v56 code review)
- [x] refreshAllEditors applyViewOverrides fora do if(cm) — RV sem CM6 recebe overrides corretamente (v56 code review)
- [x] Typo "Colapse" → "Collapse" em customCards.ts (v56 code review)
- [x] settingsUpdateDebounce migrado pra scheduleTimer — auto-cleanup no unload, consistente com padrao do projeto (v56 code review)
- [x] lastContentHash dead code removido de mirrorTypes.ts (v56 code review)

- [x] Widget sumia ao digitar rapido no meta-bind (v25.2)
- [x] Dead code em mirrorState.ts (v25.3)
- [x] Suporte a Reading View — code block processor (v26)
- [x] Performance — configCache, cachedRead, mirror index (v27/v27.1)
- [x] Validacao de configuracoes — inline path validation (v28)
- [x] Sistema de logs (v25.2)
- [x] Remover `window.mirrorUIPluginInstance` → mirrorPluginFacet (v27)
- [x] Fix `StateEffect.reconfigure([])` no onunload (v27)
- [x] Debounce/delay hardcoded → timingConfig.ts (v27)
- [x] Rename-aware settings (v28)
- [x] Inline path validation (v28)
- [x] Atualizar dependencias — TS5, esbuild 0.25, ESLint 9 (v29)
- [x] Menu contextual — insert mirror block (v29)
- [x] Limpeza de codigo — 22 unused imports/vars (v29)
- [x] Reatividade cross-note — SourceDependencyRegistry + callbacks diretos (v30)
- [x] README: documentar code blocks (v29)
- [x] Refatorar suggester — wrapAround inline, limpar casts, CSS class renomeada (v31)
- [x] Busca e filtros dentro da lista de espelhos no settings (v31)
- [x] Benchmark VN+QDA completo — posicoes, condicoes, engines mapeadas (v32, arquivado em docs/archive/)
- [x] Position engine — 6 novas posicoes DOM + 2 margin panels (v32)
- [x] filterProps fix — arrays e booleans (v32)
- [x] Bug dropdown preview mode — salvar em campo correto (v32)
- [x] Dropdown de posicoes com labels visuais + helper DRY (v32)
- [x] Dead code — YAMLSuggest.ts e mirrorViewPlugin.ts deletados (v33)
- [x] settings.ts monolitico — extrair types, pathValidator, filterBuilder (v33)
- [x] mirrorState update() — extrair subfuncoes (v33)
- [x] Dependencia circular mirrorState ↔ mirrorDecorations — eliminada (v33)
- [x] Root utils/ movido pra src/suggesters/ (v33)
- [x] @ts-ignore centralizado em obsidianInternals.ts (v33)
- [x] Fix re-render excessivo DOM injector — setupDomPosition removido do hot path de digitacao (v35)
- [x] Logger otimizado — early return com debug off, elimina console.log desnecessario (v35)
- [x] Margin panel — docChanged → geometryChanged, elimina forced layout reflow por keystroke (v35)
- [x] Template reactivity — TemplateDependencyRegistry + handleTemplateChange (v35)
- [x] Bug cross-pane — getActiveFile() retornava arquivo errado em cenario multi-painel → filePathFacet (v36)
- [x] Cenario C-settings — editar template nao atualizava CM6 mirrors → knownTemplatePaths + handleTemplateChange fix (v36)
- [x] Cenario A — Properties UI nao trigava update → guard de inatividade removido (v36)
- [x] Dead code — lastUserInteraction, USER_INACTIVITY_THRESHOLD removidos (v36)
- [x] Investigacao `.metadata-container` sem YAML — confirmado: Obsidian sempre cria o container no DOM, independente de ter YAML ou setting "hidden". Fallback `above/below-properties → top` e codigo morto na pratica (v36)
- [x] CSS parity CM6 vs DOM — callout/hr margins, h1 first-of-type, text selection, below-properties margin-top, debug diagnostic (v37)
- [x] CSS parity com Reading View nativo — diagnostic triplo (mirror/RV/LP), hr 2em, h2/h3 first-of-type removido, pre margin-top (v38)
- [x] isDomTargetVisible — checagem de visibilidade via `app.vault.getConfig()` antes de injecao DOM. querySelector sempre encontrava targets ocultos (display:none) (v39)
- [x] Smart fallback chain — fallback DOM→DOM→CM6 preservando hierarquia (above-title → above-properties → CM6 top) (v39)
- [x] Reactive config detection — `vault.on('raw')` detecta mudancas em `.obsidian/app.json`, mirrors reposicionam em tempo real (v39)
- [x] Backlinks timing fix — `backlinkInDocument` nao e reativo, `isDomTargetVisible` so checa `bl.enabled`, `resolveTarget` usa `children.length > 0` pra DOM truth (v40)
- [x] below-backlinks `.cm-sizer` fallback — so ativa quando `.embedded-backlinks` nao existe, nao quando existe mas ta vazio (v40)
- [x] vault.on('raw') backlink.json — removido, so `core-plugins.json` trigga refresh (v40)
- [x] Scoped cache invalidation — `clearRenderCache()` e `domCache.clear()` globais → scoped por cacheKey (v41)
- [x] Per-source timeout — `crossNoteTimeout` unico → Map por `file.path` (v41)
- [x] Cleanup `debugComputedStyles` — ~200 linhas de CSS diagnostic temporario removidas (v41)
- [x] parseFrontmatter removido — metadataCache como fonte unica, extractRawYaml pra hash, bug listas→tags corrigido (v41)
- [x] Throttle de forced update 1000ms → 500ms — checkbox boolean travava em cliques rapidos (v41)
- [x] Lint zerado — 5 unused imports removidos (v41)
- [x] Reatividade code block pra frontmatter da propria nota — self-dependency no SourceDependencyRegistry (v41)
- [x] CM6 nao carrega no startup + hot-swap nao reativo — `filePathFacet` fix cross-pane (v36)
- [x] Fallback below-backlinks ausente — `getFallbackPosition('below-backlinks')` → `'bottom'` (v32)
- [x] Logica prioridade global vs custom — checar `globalMirrorActive` antes de `global_settings_overide` (v32)
- [x] Line-height CM6 vs DOM — CSS parity normalizada (v37/v38)
- [x] above-title com inline title OFF — coberto por `isDomTargetVisible` + fallback chain (v39)
- [x] Backlinks desabilitados com notas eq — coberto por two-layer check (v40)
- [x] below-properties ≈ top — decisao: CM6 top (v39)
- [x] above-title fallback — coberto por fallback chain DOM→DOM→CM6 (v39)
- [x] Log de conflito em buildMirrorIndex — warning quando dois mirrors apontam pro mesmo arquivo (v32)
- [x] Fallback DOM → CM6 salto visual — resolvido em duas frentes: posicionamento correto via isDomTargetVisible + fallback chain (v39), CSS parity com Reading View nativo (v37/v38)
- [x] Tag matching — ja funciona via `filterProps` existente. `mirrorConfig.ts` faz `Array.isArray(val) ? val.some(...)` pra arrays como `tags`. Teste cobrindo (v32/v41)
- [x] Auditar minAppVersion real — validado: CM6 (StateField, ViewPlugin, Decoration), registerMarkdownCodeBlockProcessor, APIs internas (getConfig, internalPlugins), Live Preview/Reading View. Floor real e `1.0.0` (finalizacao da migracao CM6). manifest.json e versions.json atualizados de `0.15.0` → `1.0.0` (v51)
- [x] MutationObserver pra backlinks — problema coberto por `vault.on('raw')` + `refreshAllEditors` (v39/v40). Gap restante (`backlinkInDocument` toggle sem fechar aba) e limitacao do Obsidian
- [x] Renomear mirrors — inline rename com text input no card header, `sanitizeMirrorName` helper, save on blur (v53)
- [x] Naming inconsistencies (typo `overide`) — correcao direta em types/source/tests/data.json (v53)
- [x] `toogle-header` CSS class typo — corrigido em 7 ocorrencias (3 arquivos settings) (v53)
- [x] hideProperties CSS — seletor funciona no Obsidian atual. Bug era falso positivo — `.metadata-container` continua descendente de `.view-content` (parent mudou pra `.cm-sizer` mas CSS descendant selector cobre). Diagnosticado v42
- [x] Per-view Obsidian setting overrides — ViewOverrides (hideProps, readableLineLength, showInlineTitle) com CSS per-view e class nativa `is-readable-line-width` (v42)
- [x] Unificar bottom + above-backlinks — dropdown unificado, `above-backlinks` primario (DOM), `bottom` deprecated (CM6 fallback) (v43)
- [x] Cold start rendering — MarkdownRenderer retornava success sem popular DOM. Retry 1s no onLayoutReady com clearRenderCache (v43)
- [x] positionOverrides stale — override persistia entre sessoes, impedindo re-avaliacao DOM. Delete movido pra antes de getApplicableConfig (v43)
- [x] Backlinks timing retry — resolveTarget falha por children.length === 0 no startup. Retry 500ms apos fallback (v43)
- [x] Margin panel posicionamento flush — left:0/right:0 em vez de calculo com contentDOM.offsetLeft + gap 20px (v45)
- [x] Margin panel ResizeObserver — responsive a resize de janela, sidebar, split panes (v45)
- [x] Logica AND/OR nos filtros — conditions unificadas, evaluateConditions com any/all, negacao per-condition, mirrorIndex eliminado, conditionBuilder UI (v46)
- [x] Reading View DOM injection — top/bottom renderizam via DOM em Reading View, layout-change event com debounce 50ms, lastViewMode guard (v47)
- [x] Per-view DOM injection — viewId via WeakMap, containers independentes por pane, positionOverrides per-view, viewIdFacet no CM6, fix TS error CM6_POSITIONS.includes (v48)
- [x] RV DOM container destruido pelo Obsidian — MutationObserver no sizer detecta remocao, re-injeta automaticamente. Cooldown 100ms + isMutationRecovery bypass (v50)
