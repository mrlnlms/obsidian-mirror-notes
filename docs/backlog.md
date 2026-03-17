# Mirror Notes — Backlog

Trabalho tecnico pendente. Atualizado na v49.

## Bugs

- **RV DOM container destruido pelo Obsidian** — Obsidian reconstroi `.markdown-preview-sizer` a cada mode switch/re-render. Nosso container injetado e destruido junto. Pane inativo perde mirror. Plano completo em `~/.claude/plans/humming-cooking-leaf.md`. Fix recomendado: MutationObserver no sizer pra detectar remocao e re-injetar

## Epico: Margin Panel

O margin panel (`marginPanelExtension.ts`) renderiza mirrors nas posicoes `left` e `right` como ViewPlugin CM6. Posicionamento flush (left:0/right:0) e ResizeObserver ja implementados (v45). Plano de trabalho em `docs/superpowers/plans/`.

Itens pendentes:

- **Largura do painel** — hoje e 250px fixo (`PANEL_WIDTH`). Testar diferentes estrategias: proporcional ao espaco disponivel, configuravel por mirror, fit-content com max-width, ou combinacao
- **Sobreposicao / threshold** — quando nao tem espaco (janela estreita, readable line length OFF), o painel sobrepoe conteudo. Definir threshold minimo pra renderizar e fallback (ocultar? mover pra top/bottom?). Evitar valores magicos hardcoded
- **Gutters / line numbers** — calculo de posicao nao considera `cm-gutters.offsetWidth`. Relevante quando line numbers estao ativados
- **Min-height** — painel cresce com conteudo, sem min-height. Avaliar se precisa de altura minima (VN usa 528px footer, 100px above-backlinks como referencia)
- **Menu de posicoes (consolidacao final)** — `bottom` + `above-backlinks` unificados (v43), `below-backlinks` alinhado (v44), `below-properties` + `top` unificados (v42). Falta remover opcoes deprecated do dropdown (breaking change — migrar data.json). So no final do epico, porque o margin panel pode adicionar opcoes intermediarias pra teste. Inclui revisao de UX writing das labels e feedbacks na tela

## Revisao de Settings UI

Apos margin panel. A pagina de settings funciona mas tem gaps de usabilidade:

- **Renomear mirrors** — hoje nao tem como renomear um mirror criado, so deletar e recriar
- **Usabilidade com muitos mirrors** — com dezenas de mirrors a lista fica dificil de navegar. Busca existe (v31) mas layout/hierarquia visual precisam de revisao
- **Layout geral** — revisar organizacao visual, agrupamento, e hierarquia da pagina

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

- **`layout-change` so processa view ativa** — por design, nao e bug. Mode switch (Cmd+E) so acontece no pane ativo — Obsidian foca o pane antes de trocar modo. `getActiveViewOfType(MarkdownView)` cobre 100% do fluxo real. Varredura global de todos os panes seria desperdicio (layout-change dispara pra sidebar, splits, etc). Panes inativos sao atualizados quando recebem foco via `file-open`/`active-leaf-change`. Avaliado na v47, descartado como nao-problema
- **`viewOverrides` em Reading View** — funciona sem codigo extra. CM6 existe em ambos os modos (Obsidian cria `.markdown-source-view` e `.markdown-reading-view` simultaneamente). `setupEditor` registra StateField, `applyViewOverrides` aplica CSS class no `.view-content` que cobre LP e RV. Validado empiricamente na v47 com `hideProps: true` — persiste entre mode switches e sobrevive cold start
- **`configCache` indexado por `file.path` (nao per-view)** — por design. Config base (qual mirror matcha, template, posicao) e identica entre panes do mesmo arquivo. O unico dado per-view e `positionOverride`, aplicado DEPOIS do cache via `positionOverrides` Map (per-view desde v48). Cenario onde config base variasse por pane (ex: "pane A mostra mirror X, pane B mostra mirror Y pro mesmo arquivo") nao existe e nao tem UX viavel. Se surgir, refatorar cache pra `viewId + file.path`. Avaliado na v48, descartado como nao-problema
- **`resolveViewOverrides` hideProps merge com `||`** — campo legacy (`custom_settings_hide_props` / `global_settings_hide_props`) removido. `viewOverrides.hideProps` e autoritativo. `resolveViewOverrides()` eliminada. Resolvido na v48 (cleanup)
- **`main.ts` acoplamento operacional** — resolvido via refactor pos-v49. 4 modulos extraidos (viewOverrides, domPositionManager, templateChangeHandler, settingsHelpers). main.ts 650→444 linhas, so lifecycle e event registrations. activeEditors dead code removido
- **`file-open` race com `getActiveViewOfType`** — teorico, nao e bug. O handler usa setTimeout + getActiveViewOfType, mas `active-leaf-change` dispara junto com a `leaf` correta e tem o mesmo delay, corrigindo imediatamente. `setupEditor`/`setupDomPosition` usam `view.file` (nao o `file` do evento), entao operam no arquivo correto da view. Janela de race e EDITOR_SETUP_DELAY (poucos ms). Avaliado na v49, descartado
- **`filePathFacet`/`viewIdFacet` stale ao trocar arquivo na mesma pane** — nao e bug. Logs confirmam que Obsidian recria o EditorState ao navegar: `setupEditor: adding StateField` dispara em cada file-open, provando que o StateField anterior e destruido e re-adicionado com path correto. Verificado empiricamente via debug.log. Avaliado na v49, descartado
- **templateDeps stale callbacks** — resolvido no refactor pos-v49. `domPositionManager.ts` chama `plugin.templateDeps.unregisterByPrefix(dom-${viewId}-)` no inicio de `setupDomPosition`, limpando callbacks do arquivo anterior antes de registrar novos
- **Falsy frontmatter values (`0`, `false`, `""`)** — resolvido na v49. `variables[key] || match` trocado por `val != null ? String(val) : match` em templateRenderer.ts. Agora `{{count}}` com `0` e `{{done}}` com `false` renderizam corretamente
- **viewOverrides em mirrors preview-only** — resolvido. `applyViewOverrides` agora tem fallback: se StateField nao tem config (preview-only mirror), consulta `getApplicableConfig` com viewMode do view atual. Overrides aplicam corretamente em mirrors RV-only (v49)
- **sourcePath no MarkdownRenderer e a nota hospedeira, nao o template** — por design, nao e bug. `renderMarkdown(..., sourcePath)` resolve links relativos. Links no template devem resolver do contexto da nota que mostra o mirror (ex: `[[tasks]]` relativo a nota, nao ao template em `templates/`). Se resolvesse do template, links quebrariam pra qualquer nota fora da pasta do template
- **"Descartado com warning" no multi-mirror** — warning existia no antigo `buildMirrorIndex` (removido na v46). Hoje e first-match-wins silencioso. Doc do roadmap corrigida
- **CSS parity com Live Preview nativo** — mirrors tem parity com Reading View (v38). Live Preview usa modelo de spacing completamente diferente (CM6 lines, padding em vez de margin). Delta LP vs RV e do proprio Obsidian. Nao e bug do plugin
- **`{{title}}` e `{{position}}` literal** — templates de teste usavam variaveis que nao existem no frontmatter. templateRenderer resolve so frontmatter da nota, nao propriedades do config do mirror. Comportamento correto — campo vazio e preenchido pelo usuario (ex: meta-bind)

## Resolvidos

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
- [x] MutationObserver pra backlinks — problema coberto por `vault.on('raw')` + `refreshAllEditors` (v39/v40). Gap restante (`backlinkInDocument` toggle sem fechar aba) e limitacao do Obsidian
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
