# Mirror Notes Plugin

Um plugin para Obsidian que renderiza templates dinamicos dentro do editor usando CodeMirror 6.

## Versao Atual: v41 — metadataCache unificado + scoped cache + cleanup

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

