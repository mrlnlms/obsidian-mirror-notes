# Mirror Notes Plugin — Technical Notes

Documento tecnico atualizado a cada versao. Estado atual do codigo, arquitetura, bugs, e o que mudou.

## Versao Atual: v32 — Position Engine + filterProps Fix

### O que mudou na v32

**Arquitetura de posicoes — 3 engines:**

O MN agora tem 3 engines de renderizacao, cada uma cobrindo uma parte da anatomia da nota:

| Engine | Posicoes | Tecnica | Onde opera |
|--------|----------|---------|------------|
| CM6 StateField | top, bottom | `Decoration.widget({ side: 0/1 })` | Dentro do `.cm-content` |
| DOM Injector | above-title, above/below-properties, above/below-backlinks | `insertBefore`/`insertAfter` no DOM | Fora do `.cm-editor` |
| Margin ViewPlugin | left, right | ViewPlugin no `scrollDOM`, position absolute | Lateral do editor |

**Flow de posicoes:**
1. `getApplicableConfig()` retorna config com position original do settings
2. Se position e CM6 (top/bottom): StateField → buildDecorations (existente)
3. Se position e DOM: `setupDomPosition()` → `injectDomMirror()` → resolve target
4. Se DOM target nao existe (ex: properties ocultas): fallback → CM6 position via `positionOverrides`
5. Se position e margin: `mirrorMarginPanelPlugin` (ViewPlugin) detecta no `update()` e injeta

**Fallback chain:**
- above-title → top (se `.inline-title` nao existe)
- above-properties, below-properties → top (se `.metadata-container` nao existe)
- above-backlinks, below-backlinks → bottom (se `.embedded-backlinks` nao existe)
- left, right → sempre funciona (scrollDOM sempre existe)

**positionOverrides (Map no plugin):**
- Quando domInjector detecta fallback, seta `plugin.positionOverrides.set(filePath, fallbackPos)`
- `getApplicableConfig()` checa este map antes de retornar — aplica override se existir
- Override e limpo em `updateAllEditors()` e `setupDomPosition()` (fresh attempt)

**filterProps fix:**
- `mirrorConfig.ts` linhas 111-121: matching de YAML properties agora trata:
  - `boolean`: `String(val) === template` (antes: `true === "true"` → false)
  - `Array`: `val.some(item => String(item) === template)` (antes: `["a","b"] === "a"` → false)
  - Fallback: `String(val) === template` pra outros tipos

**marginPanelExtension.ts (basico):**
- ViewPlugin que cria div absoluto no `scrollDOM`
- Usa `contentDOM.offsetLeft` pra posicionar (esquerda: espaco antes do conteudo, direita: apos)
- Largura fixa 250px, sem tratamento de line numbers/readable-line-width (v33)
- Renderiza via `renderMirrorTemplate()` (compartilhado)

### O que mudou na v31

**Refatoracao do suggester (codigo herdado do Templater):**

- `utils.ts` (3 linhas, so `wrapAround`) eliminado. Funcao movida inline pra `utils/suggest.ts`
- `suggest.ts`: `(<any>this.app).dom.appContainerEl` trocado por `document.body` (equivalente, sem cast)
- `suggest.ts`: `(<any>this.app).keymap.pushScope/popScope` trocado por `this.app.keymap.pushScope/popScope` com `// @ts-ignore` explicito (API interna inevitavel)
- `suggest.ts`: linhas em branco extras removidas (130, 136, 166)
- `settings.ts`: classe CSS `templater_search` → `mirror-search-input` (4 ocorrencias). Classe original do Templater, sem CSS correspondente

**Busca de mirrors no settings:**

- Campo de busca inline (`Setting.addSearch`) acima da lista de cards
- Metodo `filterMirrorCards(container, query)`: filtra por nome com `String.contains()`, show/hide via `display: none`
- Mensagem "No mirrors matching" criada dentro do `cardsContainer` (`mirror-plugin-cards`) — mesmo contexto visual dos cards
- CSS: `.mirror-search-container` com margin e sem borda superior, `.mirror-search-empty` com `background-color: var(--color-base-20)`, `border-radius: 8px`, `margin-top: 10px` — visual identico aos `.mirror-card`

**Arquivos modificados:** `utils/suggest.ts`, `settings.ts`, `styles.css`
**Arquivos deletados:** `utils.ts`
**Sem mudanca:** `utils/file-suggest.ts`

## v30 — Cross-Note Reactivity (Era 5)

**Mirror blocks com `source:` atualizam automaticamente quando o frontmatter da source muda.**

### O que mudou na v30

**Problema**: Quando um mirror block usa `source: outra-nota.md`, o frontmatter era lido uma unica vez no render inicial. Editar a source em outra aba nao atualizava o mirror block. O listener existente em `metadataCache.on('changed')` so escutava mudancas no arquivo ativo.

**Solucao**: `SourceDependencyRegistry` — registry centralizado com callbacks de re-render direto.

**Arquivos:**
- Novo `src/rendering/sourceDependencyRegistry.ts`:
  - `deps: Map<sourcePath, Set<blockKey>>` — quem depende de quem
  - `callbacks: Map<blockKey, () => Promise<void>>` — re-render direto no container
  - `register()`, `unregisterBlock()`, `getDependentCallbacks()`, `clear()`
- Modificado `src/rendering/codeBlockProcessor.ts`:
  - Extrai `doRender()` como funcao reusavel (resolve variaveis + renderiza)
  - Registra `doRender` como callback no registry quando bloco tem `source:`
  - Cleanup via `MarkdownRenderChild.register()` — chama `unregisterBlock()` no unload
- Modificado `main.ts`:
  - `sourceDeps: SourceDependencyRegistry` (propriedade publica)
  - `crossNoteTimeout` — debounce do branch cross-note
  - Branch 2 no `metadataCache.on('changed')`: consulta registry, invoca callbacks apos debounce
  - Cleanup no `onunload()`: `sourceDeps.clear()` + `clearTimeout(crossNoteTimeout)`

**Aprendizado importante — `previewMode.rerender(true)` so funciona em Reading View:**
- A abordagem inicial usava `previewMode.rerender(true)` + `forceMirrorUpdateEffect` pra re-render
- Em Reading View funcionava (preview e o modo ativo)
- Em Live Preview nao funcionava — code blocks sao renderizados pelo CM6 e `previewMode` e o modo "escondido"
- Fix: guardar callbacks diretos (funcoes que re-resolve variaveis e re-renderiza no mesmo container DOM)
- Callbacks funcionam em ambos os modos porque operam diretamente no container, sem depender do modo de view

**Fluxo end-to-end:**
1. `dashboard.md` tem `source: projects/alpha.md` → processor registra dependencia + callback
2. Usuario edita frontmatter de `alpha.md` em outra aba
3. `metadataCache.on('changed')` dispara com `file.path = "projects/alpha.md"`
4. Registry retorna callbacks dos blocos dependentes
5. Apos debounce 500ms, callbacks sao invocados
6. Cada callback re-resolve variaveis (le frontmatter fresco do `metadataCache`) e re-renderiza

### O que mudou na v29

**Dependencias — salto de 2022 pra 2025:**
- TypeScript 4.7 → 5.9: backward-compat, zero erros de tipo. `strict: true` NAO habilitado (tarefa futura)
- esbuild 0.17 → 0.25: config `.mjs` compativel, `context()` API ja existia
- ESLint: `.eslintrc` (v5) → `eslint.config.mjs` (v9 flat config + @typescript-eslint v8)
- tsconfig: target ES6 → ES2018, lib DOM+ES2018 (alinhado com esbuild target)
- @codemirror/state e @codemirror/view movidos pra devDependencies (sao external no esbuild, Obsidian fornece em runtime)
- obsidian pinado em ^1.12.3 (era `latest`)
- Peer dep conflict: obsidian 1.12.3 pede @codemirror/state@6.5.0 exato, resolvido com --legacy-peer-deps (types-only, nao afeta runtime)

**Facet CM6 (`mirrorPluginFacet`):**
- Substitui `window.mirrorUIPluginInstance` — Facet e o padrao idiomatico do CM6 pra injetar dependencias no StateField
- `mirrorPluginFacet.of(this)` registrado junto com `mirrorStateField` no `setupEditor()`
- `state.facet(mirrorPluginFacet)!` no create, `tr.state.facet(mirrorPluginFacet)!` no update
- Non-null assertion (`!`) seguro porque facet e StateField sao registrados juntos

**Fix onunload:**
- `StateEffect.reconfigure([])` removido — nukava TODAS as extensoes CM6 de todos os editores (Dataview, Meta-bind, etc)
- `window.mirrorUICleanup` → `cleanupMirrorCaches()` (funcao exportada de mirrorState.ts)

**Insert Mirror Block:**
- `src/commands/insertMirrorBlock.ts`: `InsertMirrorBlockModal` + `insertMirrorBlock()` + `registerInsertMirrorBlock()`
- Modal com FileSuggest pra template e source
- Registra command palette (editorCallback) + editor-menu (right-click)
- Chamado no onload logo apos registerMirrorCodeBlock

**Limpeza (22 items):**
- Unused imports removidos: TextComponent, TFile, toggleWidgetEffect, wrapAround, mirrorStateField (2x), WidgetType, Decoration, DecorationSet, ApplicableMirrorConfig, MirrorState, cleanOrphanWidgets
- Dead vars removidas: lastUpdateTime, RESERVED_KEYS, hasFrontmatter, frontmatterEndLine
- Destructuring simplificado em renderMirrorTemplate (so extrai cacheKey)
- `catch (e)` → `catch` (mirrorUtils.ts)
- `let` → `const` onde aplicavel (auto-fix)

### O que mudou na v28.1

- `openSettingsToField` em main.ts: `private` → `public` (linha 207)
- templateRenderer.ts: bloco de erro "Template not found" (linhas 52-66) reescrito:
  - Antes: `container.innerHTML = '<div style="color:...">${errorMsg}</div>'` (string estatica)
  - Depois: DOM via `container.createEl()` com link `<a>` que chama `plugin.openSettingsToField(templatePath)`
  - `errorDiv.style.cssText` inclui `pointer-events: auto; user-select: text; -webkit-user-select: text`
  - Necessario porque o container do CM6 widget (`mirrorWidget.ts:53`) tem `pointer-events: none` e `user-select: none`
  - O contentDiv do render normal ja tinha `pointer-events: auto` (linha 83), mas o early-return de erro nao passava por ele
- Cache guard `if (container.innerHTML !== ...)` removido — era redundante com o hash cache da linha 75, e incompativel com DOM elements

### O que mudou na v28

- Novos campos: `auto_update_paths` (global, default true), `custom_auto_update_paths` (per-mirror, default true)
- `vault.on('rename')` em main.ts — `updateSettingsPaths(oldPath, newPath)` percorre settings e atualiza:
  - Template paths globais e custom (match exato ou prefixo de folder)
  - `filterFiles[].folder` — compara filename (`.split('/').pop()`), so muda se nome do arquivo mudou
  - `filterFolders[].folder` — compara prefixo de path
  - Respeita toggles: global OFF = nada atualiza, per-mirror OFF = pula aquele mirror
  - Retorna `{ changed, mirrorIndices[], globalAffected }` pra feedback preciso
- `vault.on('delete')` em main.ts — `checkDeletedTemplates(path)` emite Notice por template afetado
- Notice usa `DocumentFragment` com link clicavel "Open settings":
  - `openSettingsToField(targetValue, mirrorIndices)` — expande mirrors colapsados, abre settings tab, setTimeout 250ms → busca input por valor, `scrollIntoView({ behavior: 'smooth', block: 'center' })` + `focus()`
  - `app.setting.open()` + `app.setting.openTabById(manifest.id)` (runtime APIs, @ts-ignore)
- Inline validation: `addPathValidation(container, value, type)` em settings.ts
  - Busca `.setting-item` dentro do container pra inserir warning no componente visual correto
  - 3 tipos: `file` (getAbstractFileByPath), `folder` (getAbstractFileByPath + not TFile), `filename` (vault.getFiles().some)
  - Valida no render + blur do input
  - 6 pontos de insercao: 2 global templates, 2 custom templates, filterFiles, filterFolders
- CSS: `.mirror-path-warning` com `var(--text-error)` e `var(--font-ui-smaller)`
- Bug: mirrors existentes sem `custom_auto_update_paths` no JSON → `undefined` (falsy) → check `=== false` em vez de `!value`

### O que mudou na v27

- Novo `src/editor/timingConfig.ts` — objeto `TIMING` com 8 constantes (`as const`)
- 9 magic numbers substituidos em 3 arquivos: main.ts (6), mirrorState.ts (2), settings.ts (1)
- `configCache` movido de mirrorState.ts (dead code) para mirrorConfig.ts (ativo)
  - Cache por `file.path` + hash do frontmatter via `hashObject()`
  - Cache hit evita iterar todos os custom mirrors + `.some()` em 3 arrays por keystroke
  - Invalidacao: `clearConfigCache()` chamado em forced updates, settings file change, settings tab
- `vault.read()` → `vault.cachedRead()` em templateRenderer.ts — retorna da memoria se arquivo nao mudou
- Startup unificado: `iterateAllLeaves` duplicado no onload removido, setupEditor + rerender numa unica passada dentro do `onLayoutReady`
- `UPDATE_DEBOUNCE` local removida de mirrorState.ts (usa `TIMING.UPDATE_DEBOUNCE`)
- Mirror index em mirrorConfig.ts: `buildMirrorIndex()` constroi `byFile` (Map filename→mirror) e `folderToMirror` (Map folder→mirror, ordenado por especificidade). File match O(1), folder match O(depth). Props continua iterando (precisa do frontmatter)
- Override duplicado eliminado: antes o matching rodava 2x quando `global_settings_overide` estava ativo (`.find()` reiterava todos os mirrors). Agora `matchedMirror` guarda a referencia na primeira passada
- Index invalidado junto com cache via `clearConfigCache()` (`mirrorIndex = null`, rebuild lazy)
- `window.mirrorUIPluginInstance` substituido por `mirrorPluginFacet` (Facet CM6) em mirrorState.ts
  - `state.facet(mirrorPluginFacet)` no create(), `tr.state.facet(mirrorPluginFacet)` no update()
  - Facet registrado junto com StateField via `mirrorPluginFacet.of(this)` no setupEditor()
- `window.mirrorUICleanup` substituido por `cleanupMirrorCaches()` exportada de mirrorState.ts
- Removido `StateEffect.reconfigure([])` do onunload — nukava TODAS as extensoes CM6 (Dataview, Meta-bind, etc)

### O que mudou na v26

- Novo `registerMarkdownCodeBlockProcessor("mirror", ...)` — processa blocos ` ```mirror ``` ` em ambas as views
- Logica de rendering extraida de `mirrorWidget.ts` para `src/rendering/templateRenderer.ts` (modulo compartilhado)
- `mirrorWidget.ts` refatorado: `doUpdateContent()` + `simpleHash()` substituidos por `renderMirrorTemplate()`
- Novo `src/rendering/blockParser.ts` — parser key:value para conteudo do code block
- Novo `src/rendering/codeBlockProcessor.ts` — processor + resolucao de variaveis via `metadataCache`
- `MarkdownRenderChild` registrado via `ctx.addChild()` — necessario para lifecycle correto no Reading View
- `onLayoutReady()` em `main.ts` — forca `previewMode.rerender(true)` nas notas ja abertas quando o plugin carrega
- Cache de hash desabilitado para code blocks (`!ctx.component`) — Obsidian recria o container a cada render
- Caches `lastRenderedContent` e `renderingPromises` movidos de `MirrorTemplateWidget` para `templateRenderer.ts`
- `mirrorState.ts` usa `clearRenderCache()` em vez de acessar cache estatico do widget

### Sintaxe do code block

````
```mirror
template: templates/meu-template.md
source: notas/outra-nota.md
titulo: Override Custom
```
````

- `template` — obrigatorio, caminho do template no vault
- `source` — opcional, nota de onde puxar frontmatter (default: nota atual)
- Demais chaves = variaveis inline (override sobre frontmatter)
- Resolucao: `{ ...frontmatterAtual, ...frontmatterSource, ...inlineVars }`

### O que mudou na v25.3

- Completada modularizacao da v23: mirrorState.ts agora importa de mirrorUtils.ts, mirrorWidget.ts, mirrorConfig.ts
- Removido `getApplicableConfig2()` de mirrorState.ts (dead code, nunca chamada)
- Removida classe `MirrorTemplateWidget` duplicada de mirrorState.ts (~185 linhas). A versao ativa e mirrorWidget.ts
- `widgetInstanceCache` movido pra `MirrorTemplateWidget.widgetInstanceCache` (static em mirrorWidget.ts). Corrige bug: `(as any).widgetInstanceCache` retornava undefined — cache nunca funcionava
- `parseFrontmatter`, `hashObject`, `generateWidgetId` movidos de mirrorState.ts pra mirrorUtils.ts (versao atualizada com fix YAML)
- Recovery system (ViewPlugin + widgetRecoveryEffect) comentado — nunca disparava apos fix de decoration mapping
- Removido import morto de `getApplicableConfig` em mirrorDecorations.ts
- mirrorState.ts: 583 → 273 linhas (-53%)

### O que mudou na v25.2

- Fix decoration mapping bug: widget nao desaparece mais durante digitacao rapida em meta-bind
- ViewPlugin recovery implementado como safety net (depois comentado na v25.3)
- Fix CSS containment: widgets CM6 nao podem usar `contain: paint` com conteudo dinamico

### O que mudou na v25

- Novo `updateHidePropsForView()` em main.ts: toggle CSS class `.mirror-hide-properties` no `.view-content`
- `HideFrontmatterWidget` removido inteiro de mirrorDecorations.ts
- Decorations simplificadas de ~120 pra ~35 linhas (so mirror widget, sem hide widget)
- styles.css: `.mirror-hide-properties .metadata-container { display: none }`, seletores com `:has()`
- settings.ts chama `updateHidePropsForView()` apos force update

### O que mudou na v24

- `parseFrontmatter()` agora suporta listas YAML (linhas com `-`). Obsidian padronizou `tags` como lista e o parser anterior nao lidava.
- Fix toggle swap: Hide Properties e Replace Custom Mirrors estavam trocados no settings
- Nova logica de prioridade custom vs global mirrors em mirrorConfig.ts
- HideFrontmatterWidget usa `Decoration.replace` em vez de `display:none` por linha
- Filtros configuraveis substituem `type: project` hardcoded (filterFiles, filterFolders, filterProps com key+value)

### O que mudou na v23

- Modularizacao: codigo monolitico dividido em arquivos menores
- Novo mirrorConfig.ts: constantes e configuracao extraidas
- Novo mirrorDecorations.ts: logica de decoracoes extraida
- Novo mirrorTypes.ts: definicoes de tipos compartilhados
- Novo mirrorUtils.ts: funcoes utilitarias extraidas
- mirrorState.ts simplificado com imports modulares

---

## Arquitetura (v30)

```
main.ts                                    — MirrorUIPlugin (lifecycle, CM6 setup, code block, cross-note, hideProps)
settings.ts                                — MirrorUISettingsTab (global/custom mirrors, filters)
YAMLSuggest.ts                             — YAML property suggestions
utils.ts                                   — Utility functions
utils/file-suggest.ts                      — FileSuggest, FolderSuggest, YamlPropertySuggest
utils/suggest.ts                           — Abstract suggest base class
src/rendering/templateRenderer.ts          — renderMirrorTemplate() — modulo compartilhado (CM6 + code block)
src/rendering/codeBlockProcessor.ts        — registerMarkdownCodeBlockProcessor("mirror") + cross-note deps
src/rendering/blockParser.ts               — parseBlockContent() — parser key:value do code block
src/rendering/sourceDependencyRegistry.ts  — SourceDependencyRegistry (cross-note reactivity)
src/editor/mirrorState.ts                  — CM6 StateField + StateEffects (hub central)
src/editor/mirrorWidget.ts           — CM6 WidgetType (delega para templateRenderer)
src/editor/timingConfig.ts           — TIMING object (constantes centralizadas de debounce/delay)
src/editor/mirrorConfig.ts           — getApplicableConfig() + configCache + clearConfigCache()
src/editor/mirrorDecorations.ts      — buildDecorations() + cleanOrphanWidgets()
src/editor/mirrorTypes.ts            — Interfaces compartilhadas
src/editor/mirrorUtils.ts            — parseFrontmatter, hashObject, generateWidgetId
src/editor/mirrorViewPlugin.ts       — Recovery ViewPlugin (comentado, v25.3)
src/logger.ts                        — Logger com toggle via settings
styles.css                           — Plugin styles + hideProps + code block CSS
```

### Fluxo principal — CM6 widget (Live Preview, via settings)

1. `MirrorUIPlugin.setupEditor()` registra `mirrorStateField` como extensao CM6
2. `mirrorState.ts` — StateField usa `parseFrontmatter` (mirrorUtils) e `getApplicableConfig` (mirrorConfig)
3. `mirrorDecorations.ts` — `buildDecorations()` cria `MirrorTemplateWidget` (mirrorWidget) com `Decoration.widget`
4. `mirrorWidget.ts` — WidgetType chama `renderMirrorTemplate()` (templateRenderer)
5. `main.ts` — `updateHidePropsForView()` adiciona/remove classe CSS pra esconder frontmatter

### Fluxo principal — Code block (Reading View + Live Preview, inline)

1. `main.ts` — `registerMirrorCodeBlock(this)` registra o processor no `onload()`
2. Obsidian detecta bloco ` ```mirror ``` ` e chama o processor
3. `blockParser.ts` — `parseBlockContent()` extrai template, source, variaveis inline
4. `codeBlockProcessor.ts` — resolve variaveis (inline > source > frontmatter atual via metadataCache)
5. `templateRenderer.ts` — `renderMirrorTemplate()` le template, substitui `{{var}}`, `MarkdownRenderer.renderMarkdown()`
6. `MarkdownRenderChild` registrado via `ctx.addChild()` para lifecycle do Obsidian

### Eventos registrados

- `editor-change` — re-setup do editor ao editar
- `file-open` — setup ao abrir arquivo (delay TIMING.EDITOR_SETUP_DELAY)
- `active-leaf-change` — setup ao trocar aba (delay TIMING.EDITOR_SETUP_DELAY)
- `metadataCache.changed` — branch 1: force update se usuario inativo (delay TIMING.METADATA_CHANGE_DEBOUNCE). Branch 2: cross-note — invoca callbacks de re-render para blocos dependentes (debounce TIMING.METADATA_CHANGE_DEBOUNCE)
- `vault.modify` em `data.json` — re-update ao mudar settings (debounce TIMING.SETTINGS_FILE_DEBOUNCE)
- DOM: `keydown` + `mousedown` — tracking de ultima interacao do usuario

---

## Performance — Benchmark comparativo (v27)

Numeros estimados para vault com 50 custom mirrors e 30 tabs abertas.

| Operacao | Antes (v26) | Depois (v27) | Reducao |
|----------|-------------|--------------|---------|
| Startup (comparacoes de filtro) | 30 × 500 = 15.000 | ~500 (build index) + 30 lookups = 530 | ~28x |
| Keystroke (cache hit) | 500 comparacoes | 1 Map.get() | ~500x |
| Settings change (override ativo) | 30 × 500 × 2 = 30.000 | 1 rebuild + 30 lookups = 530 | ~56x |
| Troca de tab (frontmatter igual) | 500 comparacoes | 1 Map.get() | ~500x |
| Template read | I/O disco | Memoria (cachedRead) | — |
| Iteracoes de leaves no startup | 2 × 30 = 60 | 1 × 30 = 30 | 2x |

**Nota**: em vaults pequenos (5 mirrors, 3 tabs) a diferença e imperceptível. Os ganhos escalam com mirrors × tabs.

**Otimizacoes aplicadas**: configCache (Map por file.path + frontmatterHash), mirror index (Map file→mirror + folder→mirror ordenado por especificidade), override duplicado eliminado, cachedRead para templates, startup unificado (1 iteracao).

---

## Bugs conhecidos (v25)

- **Hide Properties nao funciona** — `updateHidePropsForView()` dispara (visivel nos logs) mas o seletor CSS `.mirror-hide-properties .metadata-container { display: none }` nao bate com a estrutura DOM atual do Obsidian. Frontmatter continua visivel.
- **filterProps nao funciona com listas YAML** — matching usa `===` (string vs array = sempre false). So valores simples funcionam (ex: `type: projects`).
- **parseFrontmatter hardcoda listas em `result.tags`** — todas as linhas com `-` sao jogadas em `result.tags`, ignorando a key real da lista.

---

## Aprendizados CM6 — Widget Containment (v25.1)

Widgets CM6 (`Decoration.widget` com `block: true`) que renderizam conteudo dinamico via `MarkdownRenderer` **nao podem usar containment de paint/layout**.

**Problema**: `contain: layout style paint` + `overflow: hidden` + `transform: translateZ(0)` criam um contexto de composicao isolado (como um "iframe virtual"). Quando o editor redimensiona (ex: sidebar abre/fecha), o container do widget mantem as dimensoes do momento da renderizacao inicial. O conteudo existe no DOM mas fica invisivel atras de uma "mascara fixa" — clipping vertical e lateral.

**Causa raiz**: `contain: paint` impede que o browser repinte o conteudo quando o layout externo muda. `overflow: hidden` corta tudo que sai dos bounds originais. `transform: translateZ(0)` nos filhos cria camadas de composicao separadas que nao reagem a mudancas do pai.

**Fix**: Remover todas essas propriedades dos seletores `.mirror-ui-widget`, `.mirror-position-top`, `.mirror-position-bottom`:
- `contain: layout style paint` → `contain: none`
- `overflow: hidden` → `overflow: visible`
- `transform: translateZ(0)` + `perspective` + `backface-visibility` → removidos

**Regra**: Widgets CM6 com conteudo dinamico (Dataview, meta-bind, callouts) precisam fluir naturalmente com o editor. Containment de paint/layout e otimizacoes de GPU (translateZ) sao incompativeis com conteudo que precisa reflowir durante resize.

**Testado**: Dataview TABLE renderizado via MarkdownRenderer dentro de widget block, com sidebar aberta/fechada. Fix confirmado.

## Bug resolvido: Widget sumia ao digitar rapido no meta-bind (v25.1)

**Sintoma**: Widget desaparecia ao digitar rapido em campos meta-bind que editam YAML. Nenhum log do plugin era emitido no momento do desaparecimento.

**Diagnostico inicial (errado)**: MutationObserver mostrou CM6 removendo o widget de `.cm-content.cm-lineWrapping`. Achavamos que era o CM6 descartando o widget arbitrariamente durante DOM sync. Isso levou a implementar um ViewPlugin recovery que detectava widget ausente e recriava — mas recriava o DOM inteiro, causando perda de foco nos inputs.

**Causa raiz REAL**: Bug de decoration mapping nos early-returns do `StateField.update()`. O codigo fazia `let decorations = fieldState.decorations.map(tr.changes)` no inicio (mapeando posicoes pro novo documento), mas os early-returns de debounce retornavam `fieldState` (posicoes antigas) em vez de `{ mirrorState: value, decorations }` (posicoes mapeadas). Durante digitacao rapida, o debounce descartava o mapeamento → widget ficava na posicao errada → CM6 removia porque a posicao nao batia com o DOM.

**Fix**: 2 linhas — trocar `return fieldState` por `return { mirrorState: value, decorations }` nos 2 caminhos de early-return (debounce por arquivo e throttle de forced update) em `mirrorState.ts`.

**Resultado**: Zero desaparecimentos em 12+ segundos de digitacao rapida continua. Widget permanece firme, foco preservado.

**Regra**: Em `StateField.update()`, se voce faz `decorations.map(tr.changes)` no inicio, NUNCA retorne o `fieldState` original quando `tr.docChanged` — sempre retorne com as decorations mapeadas. O mapeamento de posicoes nao pode ser debounced.

**Estado**: ViewPlugin recovery comentado na v25.3 (nunca disparava apos o fix). Codigo mantido em mirrorViewPlugin.ts como referencia.

---

## Notas tecnicas

- O plugin nunca modifica o conteudo da nota — so adiciona elementos visuais ao DOM do editor
- `StateEffect.appendConfig` e usado pra registrar a extensao (nao `reconfigure`)
- `onunload` faz cleanup completo: widgets DOM, classes CSS, `StateEffect.reconfigure([])`, caches, timeouts
- `window.mirrorUIPluginInstance` expoe o plugin globalmente (usado internamente)
- Build copia automaticamente `main.js`, `manifest.json` e `styles.css` para `demo/.obsidian/plugins/mirror-notes/` via plugin `copyToDemo` no esbuild

---

## Build & Dev

```bash
npm install
npm run build    # tsc -noEmit + esbuild production
npm run dev      # esbuild watch mode + copy to demo vault
```

Abrir o vault `demo/` no Obsidian para testar.

---

## Analise comparativa: CM6 (Mirror Notes) vs DOM puro (Virtual Content)

### Numeros

| | Mirror Notes (CM6) | Virtual Content (DOM) |
|---|---|---|
| Total | 2,547 linhas (10 arquivos) | 2,927 linhas (2 arquivos) |
| Core engine | ~1,004 (src/editor/) | ~2,865 (main.ts monolito) |
| Settings UI | 688 (separada) | dentro do main.ts |

### Posicionamento: o que cada abordagem consegue

O CM6 so opera dentro de `.cm-content` (area editavel). O DOM pode injetar em qualquer ponto da hierarquia do Obsidian.

**Pontos de injecao do Virtual Content:**
- `.cm-sizer` antes de `.cm-contentContainer` → header no topo do editor
- `.metadata-container.parentElement` via `insertBefore` → acima das properties
- `.embedded-backlinks.parentElement` via `insertBefore` → acima dos backlinks
- `.cm-sizer` via `appendChild` → footer no fim do editor
- Targets diferentes pra Reading Mode (`.mod-header`, `.mod-footer`, `.markdown-preview-section`)

**Pontos de injecao do Mirror Notes (CM6):**
- `Decoration.widget({ block: true, side: 0 })` em `frontmatterEndPos` → top (depois do frontmatter)
- `Decoration.widget({ block: true, side: 1 })` em `docLength` → bottom (fim do documento)
- Nao consegue: acima das properties, acima dos backlinks, Reading Mode

### O que o CM6 entrega que o DOM nao entrega

| Capacidade | CM6 | DOM |
|---|---|---|
| `decorations.map(tr.changes)` — posicoes ajustam automaticamente | Sim | N/A (re-injection manual) |
| Widget sobrevive a edição rapida (validado) | Sim | Precisa de idempotency strategy |
| Dataview/meta-bind/callouts dentro do widget | Nativo | Nativo |
| Lifecycle gerenciado pelo editor | Sim (create/update/destroy) | Manual (observer + cleanup) |
| Integração com transacoes do editor | Sim (StateField reage a effects) | Nenhuma |
| Risco de quebra entre versoes do Obsidian | Baixo (API CM6 estavel) | Alto (depende de classes internas) |

### O que o DOM entrega que o CM6 nao entrega

| Capacidade | DOM | CM6 |
|---|---|---|
| Posicionar acima de `.metadata-container` | `insertBefore()` | Impossivel |
| Posicionar acima de `.embedded-backlinks` | `insertBefore()` | Impossivel |
| Reading Mode | Targets separados (`.mod-header`, `.mod-footer`) | Nao funciona |
| Sidebar tab | `ItemView` separada | N/A |
| Popovers / hover previews | Targets dentro de `.markdown-embed` | N/A |

### Conclusao

O CM6 e a escolha certa quando o widget vive **dentro do conteudo do editor** (top/bottom). Menos codigo, posicionamento declarativo, lifecycle automatico.

Se precisarmos de posicoes **fora do `.cm-content`** (acima das props, acima dos backlinks, Reading Mode), a unica opcao e DOM puro — uma camada separada do CM6, como o Virtual Content faz. Essas duas abordagens nao sao mutuamente exclusivas: e possivel usar CM6 pro widget principal e DOM pra posicoes extras.

---

## Referencias

- **[Virtual Content](https://github.com/Signynt/virtual-content)** — Plugin Obsidian que renderiza conteudo markdown virtual (header, footer, sidebar) sem modificar os arquivos. Regras baseadas em pastas, tags, properties e queries Dataview. Logica AND/OR, matching recursivo, toggle por regra. 2,927 linhas (main.ts monolito + styles.css). Abordagem 100% DOM: injeta em `.cm-sizer`, `.metadata-container`, `.embedded-backlinks` via `insertBefore`/`appendChild`. Nenhum uso de CM6 APIs.
