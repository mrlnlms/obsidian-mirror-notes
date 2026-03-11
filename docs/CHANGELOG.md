# Mirror Notes Plugin

Um plugin para Obsidian que renderiza templates dinamicos dentro do editor usando CodeMirror 6.

## Versao Atual: v27 — Performance + Timing (Era 5)

**Adiciona `registerMarkdownCodeBlockProcessor("mirror")` — templates inline via code blocks, funciona em Reading View e Live Preview. Rendering compartilhado entre CM6 widget e code block.**

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

