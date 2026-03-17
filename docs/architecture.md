# Mirror Notes — Arquitetura

Estado atual do plugin. Referencia rapida pra entender como as coisas funcionam.
Para historico de mudancas por versao, ver [technical-notes.md](technical-notes.md).

## File Map (v52)

```
main.ts                                    — MirrorUIPlugin (lifecycle, event registration, CM6 setup) — 386 linhas
settings.ts                                — MirrorUISettingsTab (classe shell, banner, routing) — 83 linhas
src/settings/types.ts                      — Interfaces, defaults, CustomMirror, Condition, ViewOverrides, createDefaultCustomMirror()
src/settings/globalSection.ts              — buildGlobalSection() — secao global mirror do settings
src/settings/customCards.ts                — buildCustomMirrorsSection() — cards de custom mirrors + search/filter
src/settings/settingsUI.ts                 — addModeToggle() + addPositionOptions() — componentes reutilizaveis
src/settings/viewOverridesUI.ts            — addViewOverridesSection() — view overrides deduplicado (usado por global + custom)
src/settings/conditionBuilder.ts           — buildConditionsSection() — conditions unificadas com AND/OR e negacao
src/settings/pathValidator.ts              — addPathValidation() — inline warnings em inputs
src/settings/settingsHelpers.ts            — rebuildKnownTemplatePaths() + checkDeletedTemplates()
src/suggesters/suggest.ts                  — TextInputSuggest base class (Popper-based)
src/suggesters/file-suggest.ts             — FileSuggest, FolderSuggest, YamlPropertySuggest
src/rendering/templateRenderer.ts          — renderMirrorTemplate() — modulo compartilhado (CM6 + code block)
src/rendering/codeBlockProcessor.ts        — registerMarkdownCodeBlockProcessor("mirror") + cross-note deps
src/rendering/blockParser.ts               — parseBlockContent() — parser key:value do code block
src/rendering/domInjector.ts               — DOM position engine (above-title, properties, backlinks)
src/rendering/domPositionManager.ts        — setupDomPosition() + positionOverrideKey() — orchestracao DOM injection
src/rendering/templateChangeHandler.ts     — handleTemplateChange() + clearTemplateChangeTimeout() — template reactivity
src/rendering/sourceDependencyRegistry.ts  — SourceDependencyRegistry (cross-note reactivity)
src/rendering/templateDependencyRegistry.ts — TemplateDependencyRegistry (template change reactivity)
src/editor/mirrorState.ts                  — CM6 StateField + StateEffects + helpers extraidos
src/editor/decorationBuilder.ts            — buildDecorations() — CM6 Decoration builder
src/editor/mirrorWidget.ts                 — CM6 WidgetType (delega para templateRenderer)
src/editor/viewOverrides.ts               — applyViewOverrides() — per-view CSS overrides (hideProps, readableLineLength, inlineTitle)
src/editor/timingConfig.ts                 — TIMING object (constantes centralizadas de debounce/delay)
src/editor/mirrorConfig.ts                 — getApplicableConfig() + configCache + evaluateCondition/evaluateConditions
src/editor/mirrorTypes.ts                  — Interfaces compartilhadas (MirrorPosition, ApplicableMirrorConfig, etc)
src/editor/mirrorUtils.ts                  — extractRawYaml, hashObject, generateWidgetId
src/editor/marginPanelExtension.ts         — Left/right margin panels (ViewPlugin)
src/utils/obsidianInternals.ts             — Wrappers tipados pra TODAS as APIs internas do Obsidian (14 wrappers)
src/utils/obsidianConfigMonitor.ts         — snapshotObsidianConfig() + registerConfigWatcher() — detecta mudancas visuais do Obsidian
src/utils/modeSwitchDetector.ts            — registerModeSwitchDetector() — layout-change com debounce pra mode switch LP/RV
src/utils/settingsPaths.ts                 — updateSettingsPaths() — auto-update paths on rename
src/utils/array.ts                         — arraymove() — utilitario compartilhado
src/dev/logger.ts                          — Logger dev-only (no-op em prod via __DEV__ flag)
src/dev/clear-log.sh                       — Script pra limpar debug.log
styles.css                                 — Plugin styles + viewOverrides (hideProps, inlineTitle) + code block CSS
```

## Dois modos de operacao

O plugin renderiza templates de duas formas independentes:

### CM6 widget (Live Preview, via settings)

1. `MirrorUIPlugin.setupEditor()` registra `mirrorStateField` como extensao CM6
2. `mirrorState.ts` — StateField usa `extractRawYaml` (hash detection) e `getApplicableConfig` (mirrorConfig)
3. `decorationBuilder.ts` — `buildDecorations()` cria `MirrorTemplateWidget` com `Decoration.widget`
4. `mirrorWidget.ts` — WidgetType chama `renderMirrorTemplate()` (templateRenderer)
5. `viewOverrides.ts` — `applyViewOverrides()` aplica overrides per-view (hideProps, readableLineLength, showInlineTitle)

### Dual-template (v49)

Cada mirror pode ter templates diferentes pra Live Preview e Reading View:
- LP: `enable_custom_live_preview_mode` + `custom_settings_live_preview_note` + `custom_settings_live_preview_pos`
- RV: `enable_custom_preview_mode` + `custom_settings_preview_note` + `custom_settings_preview_pos`

`getApplicableConfig(plugin, file, fm, viewId?, viewMode?)` seleciona o template correto por modo. Sem fallback entre modos: mirror so com LP configurado nao aparece em RV, e vice-versa. Se ambos estao configurados, cada modo usa seu template/posicao. Cache key inclui viewMode — `${file.path}:${viewMode}`. StateField (CM6) sempre chama sem viewMode (default `source` — CM6 so existe em LP).

### Code block (Reading View + Live Preview, inline)

1. `main.ts` — `registerMirrorCodeBlock(this)` registra o processor no `onload()`
2. Obsidian detecta bloco ` ```mirror ``` ` e chama o processor
3. `blockParser.ts` — `parseBlockContent()` extrai template, source, variaveis inline
4. `codeBlockProcessor.ts` — resolve variaveis (inline > source > frontmatter atual via metadataCache)
5. `templateRenderer.ts` — `renderMirrorTemplate()` le template, substitui `{{var}}`, `MarkdownRenderer.renderMarkdown()`
6. `MarkdownRenderChild` registrado via `ctx.addChild()` para lifecycle do Obsidian

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

## Position Engine — 3 engines + fallback chain

**3 engines de renderizacao, cada uma cobrindo uma parte da anatomia da nota:**

| Engine | Posicoes | Tecnica | Onde opera |
|--------|----------|---------|------------|
| CM6 StateField | top, bottom (Live Preview) | `Decoration.widget({ side: 0/1 })` | Dentro do `.cm-content` |
| DOM Injector | above-title, above/below-properties, above/below-backlinks; top/bottom em Reading View | `insertBefore`/`insertAfter` no DOM | Fora do `.cm-editor` (LP) e dentro do `.markdown-preview-sizer` (RV) |
| Margin ViewPlugin | left, right | ViewPlugin no `scrollDOM`, position absolute | Lateral do editor |

**Flow:**
1. `getApplicableConfig()` itera mirrors, avalia `evaluateConditions()` com AND/OR + negacao
2. Se position e CM6 (top/bottom) em Live Preview: StateField → buildDecorations
3. Se position e CM6 (top/bottom) em Reading View: `setupDomPosition()` → DOM injection nos targets RV (`.el-pre.mod-frontmatter` / `.mod-footer`)
4. Se position e DOM: `setupDomPosition()` → `injectDomMirror()` → resolve target
5. Se DOM target nao existe (ex: properties ocultas): fallback → CM6 position via `positionOverrides`
6. Se position e margin: `mirrorMarginPanelPlugin` (ViewPlugin) detecta no `update()` e injeta

**Fallback chain:**
- above-title → above-properties → CM6 top
- above-properties → DOM obrigatorio (unico caso — CM6 nao alcanca acima do `.metadata-container`)
- above-backlinks, below-backlinks → CM6 bottom (se `.embedded-backlinks` nao existe ou esta vazio)

### Decisao arquitetural: preferir CM6 sobre DOM

| Posicao | Implementacao | Motivo |
|---------|---------------|--------|
| above-properties | DOM (obrigatorio) | CM6 nao consegue inserir antes do `.metadata-container` |
| below-properties | CM6 top (preferencial) | Resultado visual identico, melhor performance |
| sem properties | CM6 top | Mesmo caso |

A implementacao DOM para `below-properties` permanece no codigo como fallback encapsulado, mas o caminho preferencial e CM6 `top`. Mesmo padrao para `above-backlinks`/`bottom`: `above-backlinks` (DOM) e a opcao primaria, `bottom` (CM6) e o fallback quando backlinks nao estao visiveis. `below-backlinks` segue o mesmo padrao: DOM quando backlinks tem conteudo, CM6 `bottom` quando nao tem (v44). Ambos `below-properties` e `bottom` estao deprecated no dropdown (v43).

### Reading View DOM injection (v47)

CM6 widgets so existem em Live Preview. Em Reading View, `top`/`bottom` usam DOM injection nos targets do `.markdown-preview-sizer`:
- `top` → `insertAfter` no `.el-pre.mod-frontmatter` (ou `.mod-header` se frontmatter ausente)
- `bottom` → `insertBefore` no `.mod-footer` (ou `appendChild` no sizer se footer ausente)

Deteccao de modo: `view.getMode()` retorna `'source'` (LP) ou `'preview'` (RV). Em `setupDomPosition`, o gate expande: `isDomPosition(pos) || (isReadingView && CM6_POSITIONS.includes(pos))`.

Evento `layout-change` detecta mode switch (LP ↔ RV) — `file-open`/`active-leaf-change` nao disparam pra mudanca de modo na mesma aba. Trailing debounce 50ms porque `getMode()` pode oscilar durante a transicao do Obsidian. Guard `lastViewMode` Map previne re-processamento quando modo nao mudou.

Cleanup automatico: RV → LP = `setupDomPosition` vê que `top`/`bottom` nao sao DOM positions em LP → `removeAllDomMirrors`. LP → RV = CM6 widgets ficam ocultos (`.markdown-source-view` hidden), DOM injection ativa.

### MutationObserver auto-recovery (v50)

Obsidian destroi e reconstroi o `.markdown-preview-sizer` durante mode switches e re-renders internos do Reading View. Nosso container DOM injetado e destruido junto porque nao faz parte do render tree do Obsidian (e um "intruso"). Sem protecao, panes inativos perdem o mirror ate receberem foco.

**Mecanismo:**

1. `injectDomMirror()` aceita callback opcional `onContainerRemoved`
2. Apos inserir o container no DOM, `setupContainerObserver()` cria MutationObserver no `parentElement` do container (o sizer) com `{ childList: true }`
3. Quando o observer detecta `!container.isConnected`, desconecta imediatamente e chama o callback
4. O callback chama `setupDomPosition(plugin, view, false, true)` — `isMutationRecovery=true` bypassa o cooldown

**Lifecycle dos observers:**

- Map paralelo `injectionObservers` (mesma key do `injectedContainers`)
- Criados em `injectDomMirror()` apos insercao bem-sucedida
- Desconectados em todas as funcoes de cleanup: `removeDomMirror`, `removeAllDomMirrors`, `removeOtherDomMirrors`, `cleanupAllDomMirrors`
- `disconnectObserversByPrefix()` chamado em `setupDomPosition` junto com `templateDeps.unregisterByPrefix()`

**Cooldown (100ms):** `setupDomPosition` tem cooldown por `viewId:filePath` que previne chamadas duplicadas de event handlers (observer re-injeta instantaneamente, `file-open`/`active-leaf-change` chegam 25ms depois). O cooldown:

- Bloqueia chamadas normais dentro de 100ms
- NAO bloqueia `isMutationRecovery=true` (observer) nem `isRetry=true` (backlinks timing)
- Seta o timestamp apos passar o guard — observer bypassa mas reseta o timer pra bloquear event handlers subsequentes

**Limitacao conhecida:** se o sizer inteiro for substituido (nao so rebuild de children), o observer no sizer antigo nao dispara. Coberto pelo `layout-change` handler pro pane ativo. Pane inativo: observer nao detecta substituicao total do sizer, mas ao receber foco via `active-leaf-change`, `setupDomPosition` re-injeta.

### isDomTargetVisible (v39)

`.inline-title` e `.metadata-container` nunca saem do DOM — Obsidian so aplica `display:none`. `querySelector` sempre encontra. Fix: consultar `app.vault.getConfig()` antes de aceitar target. Se target configurado como invisivel → `null` → fallback dispara.

### Backlinks two-layer check (v40)

`backlinkInDocument` NAO e reativo pra abas abertas. `isDomTargetVisible` so checa `bl.enabled` (plugin ON/OFF). `resolveTarget` usa `children.length > 0` pra DOM truth. Detalhes em [technical-notes.md secao v40](technical-notes.md#o-que-mudou-na-v40).

### Per-view identification (v48)

Cada pane recebe um `viewId` unico via `WeakMap<HTMLElement, string>` em `domInjector.ts`, usando `view.containerEl` como key. WeakMap auto-limpa quando o DOM element e coletado (leaf fechada).

- `injectionKey` formato: `dom-${viewId}-${filePath}-${position}` — containers DOM sao independentes por pane
- `getViewId(containerEl)` exportado de `domInjector.ts` — unica fonte de viewId
- CM6: `viewIdFacet` (analogamente a `filePathFacet`) setado em `setupEditor` via `appendConfig`
- `positionOverrides` key: `${viewId}:${filePath}` — isolamento de fallback DOM→CM6 por pane
- `templateDeps` blockKey: `dom-${viewId}-${filePath}-${position}` — callbacks de re-render por pane
- Config cache (`configCache` em `mirrorConfig.ts`) permanece keyed por `file.path` — cache e base, override per-view e aplicado depois

### positionOverrides (Map no plugin)

- Quando domInjector detecta fallback, seta `plugin.positionOverrides.set(viewId:filePath, fallbackPos)`
- `getApplicableConfig(plugin, file, fm, viewId?)` aplica override DEPOIS do cache — override e estado runtime, nao deve poluir o cache (v44)
- Override e limpo ANTES de `getApplicableConfig` em `setupDomPosition()` — garante re-avaliacao fresh a cada chamada
- Tambem limpo em `refreshAllEditors()` (refresh global)

### Cold start rendering (v43/v44)

`MarkdownRenderer.renderMarkdown` no `onLayoutReady` pode retornar success sem popular o DOM visivelmente. Fix: retry de 1s apos `onLayoutReady` com `clearRenderCache()` + re-execucao de `setupDomPosition` pra todas as leaves.

Race condition (v44): multiplos event handlers (`file-open`, `active-leaf-change`, `onLayoutReady`) disparam em rapida sucessao. `setupDomPosition` usa `removeOtherDomMirrors()` (nao `removeAll`) pra preservar o container da posicao atual durante render async. Container e reutilizado por `injectDomMirror` via check `isConnected`.

Backlinks timing: quando `resolveTarget` falha por `.embedded-backlinks` sem children (plugin ativo mas conteudo nao populou ainda), alem do fallback pra CM6, agenda retry em 500ms/1.5s/3s. Guard `isRetry` previne cascata exponencial — retries nao agendam mais retries.

## Condition Matching (v46)

Cada mirror tem `conditions: Condition[]` e `conditionLogic: 'any' | 'all'`.

```typescript
interface Condition {
  type: 'file' | 'folder' | 'property';
  negated: boolean;
  fileName?: string;       // type=file
  folderPath?: string;     // type=folder
  propertyName?: string;   // type=property
  propertyValue?: string;  // type=property (vazio = match any value)
}
```

**Matching:** `evaluateConditions()` — scan linear em todos os mirrors. Primeiro match ganha.
- `conditionLogic: 'any'` → `.some()` (OR)
- `conditionLogic: 'all'` → `.every()` (AND)
- `negated: true` → inverte resultado da condition individual

**Cache:** `configCache` (por `file.path + frontmatterHash`) preservado — so avalia no cache miss.

**Historico:** Antes da v46, o matching usava 3 arrays separados (`filterFiles`, `filterFolders`, `filterProps`) com logica OR-only e um `mirrorIndex` (Map pre-computado). O index foi eliminado porque era incompativel com AND/OR — o cache existente ja cobre o caso de performance.

## Reactivity — eventos e registries

### Eventos registrados

- `editor-change` — registra StateField se nao existe (early return se ja registrado, zero custo)
- `file-open` — setup editor + DOM injection (delay TIMING.EDITOR_SETUP_DELAY)
- `active-leaf-change` — setup editor + DOM injection (delay TIMING.EDITOR_SETUP_DELAY)
- `metadataCache.changed` — branch 1: DOM injection + viewOverrides + force CM6 update. Branch 2: cross-note source deps. Branch 3: template deps
- `vault.modify` — em `data.json`: re-update settings. Em outros: template deps
- `vault.on('raw')` — delegado a `obsidianConfigMonitor.ts`: detecta mudancas em `.obsidian/app.json` e `core-plugins.json` → `refreshAllEditors()`
- `layout-change` — delegado a `modeSwitchDetector.ts`: trailing debounce 50ms, per-view mode tracking, triggers setupEditor + setupDomPosition + applyViewOverrides

### Cross-note reactivity (v30)

`SourceDependencyRegistry` — registry centralizado com callbacks de re-render direto.
- Code blocks com `source:` registram `doRender()` como callback
- Code blocks sem `source:` registram self-dependency (v41) — reagem a mudancas no proprio frontmatter
- `metadataCache.on('changed')` Branch 2: consulta registry, invoca callbacks apos debounce 500ms
- Cleanup via `MarkdownRenderChild.register()` — unregister automatico quando bloco e destruido

### Template reactivity (v35)

`TemplateDependencyRegistry` — mesma interface do SourceDependencyRegistry.
- Code blocks e DOM mirrors registram callback de re-render por template
- `handleTemplateChange()` (em `templateChangeHandler.ts`) debounce 500ms — invoca callbacks + `forceMirrorUpdateEffect` nos CM6 widgets
- `knownTemplatePaths` (Set precomputado, rebuilded por `settingsHelpers.ts`) como fast-path O(1)

### Fonte de verdade: metadataCache (v41)

Todos os 3 caminhos (CM6, code block, DOM) usam `metadataCache.getFileCache()` como fonte unica de frontmatter. Hash de deteccao de mudanca usa `extractRawYaml` (string YAML bruta). Detalhes em [technical-notes.md secao v41](technical-notes.md#o-que-mudou-na-v41).

## Cache e invalidacao

- **Hash cache** (`templateRenderer.ts`): `lastRenderedContent` por cacheKey. Previne `MarkdownRenderer.renderMarkdown()` se conteudo nao mudou
- **DOM cache** (`mirrorWidget.ts`): `domCache` por cacheKey. Reusa container DOM existente
- **Config cache** (`mirrorConfig.ts`): `configCache` por `file.path + frontmatterHash`. Evita iterar mirrors a cada keystroke. Cache guarda config BASE (sem positionOverride) — override e aplicado dinamicamente apos cache hit (v44)
- **Scoped invalidation** (v41): `clearRenderCache(cacheKey)` + `domCache.delete(cacheKey)` — so o widget atualizado perde cache
- **Per-source timeout** (v41): `crossNoteTimeouts = Map<string, Timeout>` — cada source tem debounce independente

## View Overrides (v42)

Per-view overrides de settings globais do Obsidian. Cada mirror pode sobrescrever:

| Override | Tipo | Efeito | Implementacao |
|---|---|---|---|
| hideProps | boolean | Esconde `.metadata-container` | CSS `display:none` scoped por `.view-content` |
| readableLineLength | true/false/null | Forca readable on/off ou inherit | Toggle class nativa `is-readable-line-width` no `.markdown-source-view` |
| showInlineTitle | true/false/null | Forca inline title on/off ou inherit | CSS `display:none`/`display:block` na `.inline-title` |

- `null` = inherit: restaura setting global do Obsidian via `app.vault.getConfig()`
- Multi-pane: cada view aplica overrides independentes (CSS scoped, class toggle por elemento)
- `applyViewOverrides()` chamado em 5 hooks (metadataCache.changed, refreshAllEditors, setupEditor, file-open, active-leaf-change)
- Onunload: remove classes CSS + restaura `is-readable-line-width` pro valor global
- Config: `ViewOverrides` em `types.ts`, resolvido por `resolveViewOverrides()` em `mirrorConfig.ts`

## Notas tecnicas

- O plugin nunca modifica o conteudo da nota — so adiciona elementos visuais ao DOM do editor
- `StateEffect.appendConfig` e usado pra registrar a extensao (nao `reconfigure`)
- `mirrorPluginFacet` (Facet CM6) injeta referencia ao plugin em cada editor (substitui window global desde v29)
- `filePathFacet` (v36) — cada editor CM6 recebe seu `file.path` via Facet (fix cross-pane)
- Build copia automaticamente `main.js`, `manifest.json` e `styles.css` para `demo/.obsidian/plugins/` via plugin `copyToDemo` no esbuild

## Build & Dev

```bash
npm install
npm run build    # tsc -noEmit + esbuild production (__DEV__=false, logger no-op)
npm run dev      # esbuild watch mode + copy to demo vault (__DEV__=true, logger ativo)
npm run lint     # eslint
npm test         # vitest (215 testes, 12 suites)
```

Abrir o vault `demo/` no Obsidian para testar.
