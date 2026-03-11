# Mirror Notes Plugin

Um plugin para Obsidian que renderiza templates dinamicos dentro do editor usando CodeMirror 6.

## Versao Atual: v32 — Position Engine + filterProps Fix

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

