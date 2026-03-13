# Mirror Notes — Arquitetura

Estado atual do plugin. Referencia rapida pra entender como as coisas funcionam.
Para historico de mudancas por versao, ver [technical-notes.md](technical-notes.md).

## File Map (v41)

```
main.ts                                    — MirrorUIPlugin (lifecycle, CM6 setup, code block, cross-note, hideProps)
settings.ts                                — MirrorUISettingsTab (UI, delega pra builders)
src/settings/types.ts                      — Interfaces, defaults, CustomMirror, createDefaultCustomMirror()
src/settings/filterBuilder.ts              — buildFilterSection() — builder reutilizavel (files/folders/props)
src/settings/pathValidator.ts              — addPathValidation() — inline warnings em inputs
src/suggesters/suggest.ts                  — TextInputSuggest base class (Popper-based)
src/suggesters/file-suggest.ts             — FileSuggest, FolderSuggest, YamlPropertySuggest
src/rendering/templateRenderer.ts          — renderMirrorTemplate() — modulo compartilhado (CM6 + code block)
src/rendering/codeBlockProcessor.ts        — registerMarkdownCodeBlockProcessor("mirror") + cross-note deps
src/rendering/blockParser.ts               — parseBlockContent() — parser key:value do code block
src/rendering/domInjector.ts               — DOM position engine (above-title, properties, backlinks)
src/rendering/sourceDependencyRegistry.ts  — SourceDependencyRegistry (cross-note reactivity)
src/rendering/templateDependencyRegistry.ts — TemplateDependencyRegistry (template change reactivity)
src/editor/mirrorState.ts                  — CM6 StateField + StateEffects + helpers extraidos
src/editor/decorationBuilder.ts            — buildDecorations() — CM6 Decoration builder
src/editor/mirrorWidget.ts                 — CM6 WidgetType (delega para templateRenderer)
src/editor/timingConfig.ts                 — TIMING object (constantes centralizadas de debounce/delay)
src/editor/mirrorConfig.ts                 — getApplicableConfig() + configCache + clearConfigCache()
src/editor/mirrorTypes.ts                  — Interfaces compartilhadas (MirrorPosition, ApplicableMirrorConfig, etc)
src/editor/mirrorUtils.ts                  — extractRawYaml, hashObject, generateWidgetId
src/editor/marginPanelExtension.ts         — Left/right margin panels (ViewPlugin)
src/utils/obsidianInternals.ts             — Wrappers tipados pra APIs internas do Obsidian
src/utils/settingsPaths.ts                 — updateSettingsPaths() — auto-update paths on rename
src/logger.ts                              — Logger com toggle via settings
styles.css                                 — Plugin styles + hideProps + code block CSS
```

## Dois modos de operacao

O plugin renderiza templates de duas formas independentes:

### CM6 widget (Live Preview, via settings)

1. `MirrorUIPlugin.setupEditor()` registra `mirrorStateField` como extensao CM6
2. `mirrorState.ts` — StateField usa `extractRawYaml` (hash detection) e `getApplicableConfig` (mirrorConfig)
3. `decorationBuilder.ts` — `buildDecorations()` cria `MirrorTemplateWidget` com `Decoration.widget`
4. `mirrorWidget.ts` — WidgetType chama `renderMirrorTemplate()` (templateRenderer)
5. `main.ts` — `updateHidePropsForView()` adiciona/remove classe CSS pra esconder frontmatter

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
| CM6 StateField | top, bottom | `Decoration.widget({ side: 0/1 })` | Dentro do `.cm-content` |
| DOM Injector | above-title, above/below-properties, above/below-backlinks | `insertBefore`/`insertAfter` no DOM | Fora do `.cm-editor` |
| Margin ViewPlugin | left, right | ViewPlugin no `scrollDOM`, position absolute | Lateral do editor |

**Flow:**
1. `getApplicableConfig()` retorna config com position original do settings
2. Se position e CM6 (top/bottom): StateField → buildDecorations
3. Se position e DOM: `setupDomPosition()` → `injectDomMirror()` → resolve target
4. Se DOM target nao existe (ex: properties ocultas): fallback → CM6 position via `positionOverrides`
5. Se position e margin: `mirrorMarginPanelPlugin` (ViewPlugin) detecta no `update()` e injeta

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

A implementacao DOM para `below-properties` permanece no codigo como fallback encapsulado, mas o caminho preferencial e CM6 `top`. DOM so ficou ativo pra debug de CSS parity lado a lado (v37/v38). Task pendente no [backlog](backlog.md): ativar o intercept no `setupDomPosition` e simplificar menu de posicoes pro usuario.

### isDomTargetVisible (v39)

`.inline-title` e `.metadata-container` nunca saem do DOM — Obsidian so aplica `display:none`. `querySelector` sempre encontra. Fix: consultar `app.vault.getConfig()` antes de aceitar target. Se target configurado como invisivel → `null` → fallback dispara.

### Backlinks two-layer check (v40)

`backlinkInDocument` NAO e reativo pra abas abertas. `isDomTargetVisible` so checa `bl.enabled` (plugin ON/OFF). `resolveTarget` usa `children.length > 0` pra DOM truth. Detalhes em [technical-notes.md secao v40](technical-notes.md#o-que-mudou-na-v40).

### positionOverrides (Map no plugin)

- Quando domInjector detecta fallback, seta `plugin.positionOverrides.set(filePath, fallbackPos)`
- `getApplicableConfig()` checa este map antes de retornar — aplica override se existir
- Override e limpo em `updateAllEditors()` e `setupDomPosition()` (fresh attempt)

## Reactivity — eventos e registries

### Eventos registrados

- `editor-change` — registra StateField se nao existe (early return se ja registrado, zero custo)
- `file-open` — setup editor + DOM injection (delay TIMING.EDITOR_SETUP_DELAY)
- `active-leaf-change` — setup editor + DOM injection (delay TIMING.EDITOR_SETUP_DELAY)
- `metadataCache.changed` — branch 1: DOM injection + hideProps + force CM6 update. Branch 2: cross-note source deps. Branch 3: template deps
- `vault.modify` — em `data.json`: re-update settings. Em outros: template deps
- `vault.on('raw')` — detecta mudancas em `.obsidian/app.json` e `core-plugins.json` → `refreshAllEditors()`

### Cross-note reactivity (v30)

`SourceDependencyRegistry` — registry centralizado com callbacks de re-render direto.
- Code blocks com `source:` registram `doRender()` como callback
- Code blocks sem `source:` registram self-dependency (v41) — reagem a mudancas no proprio frontmatter
- `metadataCache.on('changed')` Branch 2: consulta registry, invoca callbacks apos debounce 500ms
- Cleanup via `MarkdownRenderChild.register()` — unregister automatico quando bloco e destruido

### Template reactivity (v35)

`TemplateDependencyRegistry` — mesma interface do SourceDependencyRegistry.
- Code blocks e DOM mirrors registram callback de re-render por template
- `handleTemplateChange()` debounce 500ms — invoca callbacks + `forceMirrorUpdateEffect` nos CM6 widgets
- `knownTemplatePaths` (Set precomputado) como fast-path O(1)

### Fonte de verdade: metadataCache (v41)

Todos os 3 caminhos (CM6, code block, DOM) usam `metadataCache.getFileCache()` como fonte unica de frontmatter. Hash de deteccao de mudanca usa `extractRawYaml` (string YAML bruta). Detalhes em [technical-notes.md secao v41](technical-notes.md#o-que-mudou-na-v41).

## Cache e invalidacao

- **Hash cache** (`templateRenderer.ts`): `lastRenderedContent` por cacheKey. Previne `MarkdownRenderer.renderMarkdown()` se conteudo nao mudou
- **DOM cache** (`mirrorWidget.ts`): `domCache` por cacheKey. Reusa container DOM existente
- **Config cache** (`mirrorConfig.ts`): `configCache` por `file.path + frontmatterHash`. Evita iterar mirrors a cada keystroke
- **Scoped invalidation** (v41): `clearRenderCache(cacheKey)` + `domCache.delete(cacheKey)` — so o widget atualizado perde cache
- **Per-source timeout** (v41): `crossNoteTimeouts = Map<string, Timeout>` — cada source tem debounce independente

## Notas tecnicas

- O plugin nunca modifica o conteudo da nota — so adiciona elementos visuais ao DOM do editor
- `StateEffect.appendConfig` e usado pra registrar a extensao (nao `reconfigure`)
- `mirrorPluginFacet` (Facet CM6) injeta referencia ao plugin em cada editor (substitui window global desde v29)
- `filePathFacet` (v36) — cada editor CM6 recebe seu `file.path` via Facet (fix cross-pane)
- Build copia automaticamente `main.js`, `manifest.json` e `styles.css` para `demo/.obsidian/plugins/` via plugin `copyToDemo` no esbuild

## Build & Dev

```bash
npm install
npm run build    # tsc -noEmit + esbuild production
npm run dev      # esbuild watch mode + copy to demo vault
npm run lint     # eslint
npm test         # vitest (138 testes, 9 suites)
```

Abrir o vault `demo/` no Obsidian para testar.
