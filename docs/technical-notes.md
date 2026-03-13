# Mirror Notes — Technical Notes (historico por versao)

O que mudou em cada versao e por que. Para arquitetura atual, file map, fluxos e decisoes, ver [architecture.md](architecture.md).

## Versao Atual: v41 — metadataCache unificado + scoped cache + code block self-dependency

### O que mudou na v41

**Contexto: unificacao de fonte de verdade + revisao de cache/invalidacao + reatividade code blocks**

Tres frentes: (1) migracao do CM6 path pra usar `metadataCache` como fonte unica de frontmatter, eliminando parser YAML manual com bugs conhecidos; (2) revisao de robustez de convergencia entre CM6 widgets, DOM injection e code block processor; (3) code blocks sem `source:` agora reagem a mudancas no frontmatter da propria nota.

**1. Scoped cache invalidation (`mirrorState.ts`):**

`handleForcedUpdate()` chamava `clearRenderCache()` (sem argumento) e `MirrorTemplateWidget.domCache.clear()` — limpando caches de TODOS os editores quando qualquer um recebia forced update. Na pratica o impacto era baixo (hash check e barato, domCache e self-correcting), mas era over-invalidation desnecessaria.

Fix: `clearRenderCache(oldCacheKey)` + `domCache.delete(oldCacheKey)` — so o widget atualizado perde cache. Outros editores mantem seus caches intactos.

**2. Per-source timeout (`main.ts`):**

`crossNoteTimeout` era unico. Se `metadataCache.on('changed')` disparava pra source A, e dentro de 500ms disparava pra source B, o `clearTimeout` cancelava o timeout de A — callbacks de A eram descartados.

Fix: `crossNoteTimeouts = new Map<string, NodeJS.Timeout>()` — cada file.path tem seu proprio debounce.

**3. Cleanup: `debugComputedStyles` removido (`templateRenderer.ts`):**

Funcao de ~200 linhas marcada como "DEBUG temporario" — CSS diagnostic triplo (mirror vs Reading View vs Live Preview). Imports orfaos (`MarkdownView`, `getEditorView`) tambem removidos.

**4. metadataCache como fonte unica de frontmatter (`mirrorUtils.ts`, `mirrorState.ts`):**

`parseFrontmatter()` fazia parsing YAML manual (split por `\n`, busca `:`) com bugs: listas sempre iam pra `result.tags` independente da chave real, tipos achatados (boolean/number → string). Usado so no CM6 path — code blocks e DOM injection ja usavam `metadataCache`.

Fix: `parseFrontmatter` removido, substituido por `extractRawYaml` (3 linhas — retorna string YAML bruta pra hashing). Valores de frontmatter agora vem de `metadataCache.getFileCache()` via helper `getMetadataCacheFrontmatter()`. Todos os 3 caminhos (CM6, code block, DOM) usam a mesma fonte.

Trade-off: delay de ~200ms entre edicao e atualizacao de variaveis no template CM6 (metadataCache atualiza async). `forceMirrorUpdateEffect` via `metadataCache.on('changed')` garante convergencia.

**5. Code block self-dependency (`codeBlockProcessor.ts`):**

Code blocks sem `source:` nao se registravam no `SourceDependencyRegistry`. Quando o frontmatter da propria nota mudava, `metadataCache.on('changed')` disparava `forceMirrorUpdateEffect` (CM6 widgets) e `sourceDeps.getDependentCallbacks()` (code blocks com source externo), mas code blocks sem source ficavam de fora.

Fix: code blocks sem `source:` agora chamam `plugin.sourceDeps.register(ctx.sourcePath, ctx.sourcePath, blockKey, doRender)` — registram a propria nota como source. Branch 2 do `metadataCache.on('changed')` em `main.ts` encontra os callbacks naturalmente. Cleanup via `child.register()` garante unregister quando bloco e destruido.

Decisao: so registrar quando `!config.sourcePath`. Com source externo, o bloco ja esta registrado pro source — registrar self-dependency causaria double-render sem beneficio (frontmatter local tem prioridade menor no merge).

**6. Throttle de forced update 1000ms → 500ms (`timingConfig.ts`):**

Checkbox boolean clicado rapidamente: segundo toggle caia dentro da janela de throttle e era ignorado. Mirror ficava no estado anterior. 500ms ainda protege contra rajadas de `metadataCache.on('changed')`.

**6. Lint zerado — 5 unused imports removidos**

**Findings NAO implementados (e por que):**
- Callback snapshot antes do debounce (Finding 4): render em container desconectado e inofensivo.
- Ordenacao invertida no settings handler (Finding 5): so acontece via edicao externa do `data.json` — cenario de dev.

---

### O que mudou na v40

**Problema: `backlinkInDocument` NAO e reativo pra abas abertas:**

O toggle `backlinkInDocument` no Obsidian muda a config em disco (`.obsidian/backlink.json`) imediatamente, mas o DOM so atualiza quando a aba e fechada e reaberta. Isso cria dessincronizacao:
- Toggle ON → config diz true, mas `.embedded-backlinks` ta vazio (sem `.backlink-pane`)
- Toggle OFF → config diz false, mas `.embedded-backlinks` ainda tem conteudo visivel
- Plugin ON/OFF (`core-plugins.json`) E reativo — Obsidian adiciona/remove elementos imediatamente

**Anatomia do `.embedded-backlinks`:**
- Quando plugin ON + backlinkInDocument ON + aba reaberta: `children = [DIV.nav-header, DIV.backlink-pane]`
- Quando plugin ON + backlinkInDocument OFF + aba reaberta: `children = []` (elemento existe mas vazio)
- Quando plugin ON + backlinkInDocument acabou de mudar: DOM nao muda ate close+reopen
- Quando plugin OFF: `.embedded-backlinks` nao existe no DOM

**Solucao: two-layer check (API gate + DOM truth):**

1. `isDomTargetVisible` (gate): so checa `bl.enabled` (plugin ON/OFF). NAO checa `backlinkInDocument` — config e DOM estao dessincronizados
2. `resolveTarget` (switch case): `backlinks.children.length > 0` — verdade do DOM. Se tem filhos, conteudo existe. Se vazio, shell sem conteudo

**Fix do fallback `.cm-sizer` em below-backlinks:**
- Antes: `.embedded-backlinks` vazio → `children.length > 0` falha → cai no `.cm-sizer` → DOM inject no lugar errado
- Agora: `.cm-sizer` so e usado quando `.embedded-backlinks` nao existe (`!backlinks`), nao quando existe mas ta vazio

**vault.on('raw') — so core-plugins.json:**
- `backlink.json` muda quando `backlinkInDocument` e toggled, mas reagir a isso e inutil (DOM nao muda)
- So `core-plugins.json` trigga `refreshAllEditors` (plugin ON/OFF e reativo)

**Testes (132 total, +6):**
- `isDomTargetVisible`: backlinks visible when plugin ON regardless of backlinkInDocument
- `resolveTarget`: empty shell (0 children) → null, real content (children > 0) → DOM inject
- `resolveTarget`: plugin OFF → null (via isDomTargetVisible gate)

---

### O que mudou na v39

**Problema: DOM targets "sempre presentes" impediam fallback:**

O Obsidian nunca remove `.inline-title` nem `.metadata-container` do DOM — quando o usuario desliga "Show inline title" ou muda "Properties in document" pra "Hidden", o Obsidian apenas aplica `display:none` via CSS. O `querySelector` do `resolveTarget()` sempre encontrava o elemento, entao o fallback nunca disparava. O mirror era injetado ao lado de um elemento invisivel.

**Solucao: `isDomTargetVisible()` em domInjector.ts:**
- Consulta `app.vault.getConfig('showInlineTitle')` e `app.vault.getConfig('propertiesVisibility')` antes de aceitar o target DOM
- `resolveTarget()` aceita parametro opcional `app` — se passado, checa visibilidade antes de fazer querySelector
- Se o target existe no DOM mas esta configurado como invisivel, retorna `null` → fallback dispara

**Fallback chain com hierarquia DOM preservada:**
- Antes: qualquer falha de target DOM → CM6 top (salto direto)
- Agora: `above-title` → tenta `above-properties` → so entao CM6 top
- `getFallbackPosition()` atualizado pra suportar fallback DOM→DOM antes de cair pro CM6
- `setupDomPosition` em main.ts faz retry quando fallback retorna outra posicao DOM (em vez de assumir CM6)
- `removeAllDomMirrors(file.path)` chamado antes da re-injecao pra evitar containers duplicados no retry

**Deteccao reativa de config (`vault.on('raw')`):**
- `.obsidian/app.json` nao e um arquivo do vault normal — `vault.on('modify')` nao dispara pra ele
- `css-change` tambem nao dispara pra mudancas de config (testado: toggle inline title, properties visibility)
- `vault.on('raw')` detecta qualquer mudanca no filesystem, incluindo `.obsidian/app.json`
- Listener filtra por `app.json` no path e chama `refreshAllEditors()` — mirrors se reposicionam em tempo real

**Testes (126 total, +7 novos):**
- `isDomTargetVisible`: 7 casos cobrindo combinacoes de showInlineTitle (true/false) e propertiesVisibility (visible/hidden/source)
- `getFallbackPosition`: atualizado pra validar fallback chain DOM→DOM→CM6
- Mock `pluginFactory.ts`: `vault.getConfig()` adicionado com defaults (`showInlineTitle: true`, `propertiesVisibility: 'visible'`)

**Infraestrutura de teste:**
- `test-visibility/` — 4 notas com mirrors em posicoes diferentes pra testar visibilidade
- `templates/positions/visibility-test.md` — template dedicado
- 4 configs adicionadas ao `data.json`

---

### O que mudou na v38

**CSS parity completo com Reading View nativo — todos os 11 elementos comparados tem computed styles identicos.**

Abordagem: diagnostic triplo automatizado (mirror vs Reading View vs Live Preview) guiou fixes cirurgicos.

**Diagnostic triplo (`debugComputedStyles` em templateRenderer.ts):**
- Funcao recebe `plugin` + `templatePath` (antes: so `contentDiv` + `cacheKey`)
- Usa `workspace.iterateAllLeaves()` pra encontrar o template aberto:
  - Reading View: `mode === 'preview'` → busca `.markdown-preview-sizer`
  - Live Preview: `mode === 'source'` + `source === false` → acessa `editorView.contentDOM`
- Reading View: mesmos seletores HTML do mirror — comparacao direta 1:1
- Live Preview: mapeamento CM6 → semantico (`.HyperMD-header-1` → h1, `.cm-callout .callout` → .callout, `.HyperMD-list-line` → li, `.HyperMD-quote` → blockquote, etc.)
- Diff triplo: `mirror vs native-rv`, `mirror vs native-lp`, `native-rv vs native-lp`
- O diff rv-vs-lp prova que divergencias com LP sao do proprio Obsidian, nao nossas

**CSS fixes (4 mismatches eliminados):**
1. `hr` margin: **1em → 2em** (16px → 32px) — nativo-rv usa 2em
2. `:first-of-type` limpeza: removido h2/h3, mantido **so h1** — `:first-of-type` pega o primeiro h2 do container (mesmo que h2 venha depois de h1), zerando mt indevidamente. Nativo-rv nao faz isso
3. `pre` margin-top: adicionado **1em** (0px → 16px) — MarkdownRenderer gera mt:0 por default, nativo-rv tem 16px
4. Seletor diagnostic `pre` → `pre:not(.frontmatter)` — evita pegar o `<pre>` fantasma (display:none) do MarkdownRenderer

**Decisao de target: Reading View, nao Live Preview.**
- Mirror usa `MarkdownRenderer.renderMarkdown()` que produz HTML semantico (h1, p, .callout)
- Reading View usa a mesma engine → comparacao justa
- Live Preview usa linhas CM6 (`.cm-line`) com modelo de spacing completamente diferente (padding em vez de margin, sem margins entre blocos)
- Delta LP vs RV e responsabilidade do Obsidian, nao nossa

---

### O que mudou na v37

**CSS parity — computed styles identicos entre CM6 widget e DOM injection:**

Problema: mirrors CM6 e DOM tinham callouts/hr com margin 0, h1 com 40px margin-top extra, e text selection quebrada. Tudo causado por especificidade CSS insuficiente e o MarkdownRenderer injetando elementos inesperados.

**Callout/hr margins (mt:0 → mt:16px):**
- Regras `.markdown-rendered .callout { margin: 1em }` nao aplicavam — theme do Obsidian sobrescrevia com regras mais especificas
- Fix: seletores com `.mirror-container-styled`, `.mirror-ui-widget`, `.mirror-dom-injection`, `.mirror-code-block` + `!important`

**h1 margin-top (40px → 0):**
- `MarkdownRenderer.renderMarkdown()` injeta `<pre class="frontmatter language-yaml" style="display:none">` como primeiro filho do `.markdown-rendered`
- Regra `:first-child { margin-top: 0 }` pegava esse `<pre>` invisivel, nao o h1
- Fix: `:first-of-type` pra h1/h2/h3 garante que o primeiro heading tem margin-top: 0

**below-properties margin-top (10px → 0):**
- `.metadata-container` (anchor do DOM injection) ja tem margin-bottom nativo
- Nosso `margin-top: 10px` somava, criando gap maior que o CM6 widget (que nao tem esse ancestral)

**Text selection:**
- `user-select: none` no `.mirror-ui-widget` propagava para `.markdown-rendered`
- Fix: `user-select: text !important` no `.markdown-rendered` e filhos

**Debug diagnostic (`debugComputedStyles` em templateRenderer.ts):**
- Captura 3 contextos: mirror, nativo (busca `.markdown-preview-sizer` ou `.markdown-rendered` fora de containers mirror), ancestors (5 niveis)
- Loga filhos diretos do `.markdown-rendered` com tag, classe, display e margin-top — essencial pra descobrir o `<pre>` fantasma
- Diff automatico prop a prop entre mirror e nativo com labels MISMATCH/OK
- Busca nativa expandida: tenta `.markdown-preview-view .markdown-preview-sizer`, `.markdown-preview-view .markdown-rendered`, `.markdown-reading-view .markdown-rendered`

**Debug outlines por tipo de container:**
- Vermelho = CM6 widget (`:not(.mirror-dom-injection)`)
- Verde = DOM injection
- Laranja = code block processor
- Azul tracejado = `.markdown-rendered` interno
- Cinza tracejado = `.metadata-container` (referencia de posicao)
- Amarelo/cyan/magenta = editor CM6 layers

**Tentativa descartada: `.markdown-preview-view` como classe no contentDiv:**
- Adicionar a classe faz o theme aplicar backgrounds, paddings, widths, resets que bagunçam o layout completamente
- Decisao: manter margins manuais nos poucos elementos que divergem (callout, hr, h1)

---

### O que mudou na v36

**Bug cross-pane — `getActiveFile()` retornava arquivo errado:**

`getActiveFile()` retorna o arquivo do painel com foco, nao do painel onde o editor CM6 vive. Com 2+ paineis abertos (template no painel A, nota com mirror no painel B), um forced update no B chamava `getActiveFile()` → retornava A (template) → `getApplicableConfig(templateFile, ...)` → null → widget sumia.

Fix: `filePathFacet` — Facet CM6 injetado por `setupEditor()` via `StateEffect.appendConfig.of([..., filePathFacet.of(file.path)])`. Cada instancia de editor recebe seu proprio path.

Mudancas:
- `mirrorState.ts`: novo `filePathFacet` (linhas 22-24). `create()` usa `state.facet(filePathFacet)`. `update()` usa `vault.getAbstractFileByPath(value.filePath)` em vez de `getActiveFile()`. `handleForcedUpdate` e `handleConfigChange` propagam `filePath`
- `mirrorWidget.ts`: `updateContentIfNeeded` usa `this.state.filePath` em vez de `getActiveFile()`
- `mirrorTypes.ts`: `filePath: string` adicionado ao `MirrorState`
- `main.ts` (setupEditor): `filePathFacet.of(file.path)` no appendConfig

**Fix Cenario C-settings — template editado nao atualizava CM6 mirrors:**

`handleTemplateChange()` fazia `if (templateCbs.length === 0) return` — CM6 widgets nao se registram no `templateDeps` (so code blocks e DOM mirrors). O `iterateAllLeaves` que despacharia `forceMirrorUpdateEffect` nunca era alcancado.

Fix: `knownTemplatePaths` (Set<string>) precomputado em `loadSettings()` e `saveSettings()`. Fast-path O(1): se o arquivo modificado nao e template conhecido E nao tem callbacks → return. Senao, debounce 500ms → `iterateAllLeaves` (dentro do debounce, nao sincronamente).

Sem `clearRenderCache()` global no `handleTemplateChange` — redundante porque `handleForcedUpdate` no StateField ja limpa caches, e o hash cache invalida naturalmente (conteudo diferente → hash diferente → cache miss).

**Fix Cenario A — Properties UI nao trigava update:**

Guard de inatividade (`now - lastUserInteraction > 1s`) bloqueava `forceMirrorUpdateEffect` durante digitacao. Properties UI edita YAML sem gerar CM6 transactions → StateField nao auto-detecta → guard bloqueava o unico caminho.

Fix: removido guard. Protecoes existentes sao suficientes: debounce 500ms (`METADATA_CHANGE_DEBOUNCE`) + throttle 1/sec (`FORCED_UPDATE_THROTTLE` no StateField).

Dead code removido: `getLastUserInteraction()`, `lastUserInteraction`, `USER_INACTIVITY_THRESHOLD` do timingConfig.

---

### O que mudou na v35

**Performance — eliminacao de trabalho desnecessario no hot path de digitacao:**

Antes: cada keystroke em nota com DOM injection disparava `setupDomPosition()` (~20 chamadas/2s), cada uma fazendo querySelector + vault.cachedRead + regex + simpleHash. O hash cache do `templateRenderer` evitava o `MarkdownRenderer.renderMarkdown()` pesado, mas o resto era desperdicio puro.

Causa raiz: `editor-change` chamava `setupEditor()` que sempre agendava `setupDomPosition()` via setTimeout. DOM anchors (`.inline-title`, `.metadata-container`, `.embedded-backlinks`) nao se movem com keystrokes — nunca precisavam de re-injecao.

Mudancas em `main.ts`:
- `setupEditor()`: removido `setupDomPosition()` do setTimeout. Early return quando StateField ja existe (sem log, sem setTimeout)
- `file-open`, `active-leaf-change`, `onLayoutReady`: chamadas explicitas a `setupDomPosition()`
- `settings-change` handler: adicionado `setupDomPosition()` pra cobrir mudanca CM6→DOM

Mudancas em `src/logger.ts`:
- `log()` e `warn()`: early return quando `_enabled === false`. Antes: `console.log()` rodava sempre
- `error()`: mantido sempre visivel no console (erros nao devem ser silenciados)

Mudancas em `src/editor/marginPanelExtension.ts`:
- `update()`: `update.docChanged` → `update.geometryChanged`. Elimina `updatePosition()` (que le `offsetLeft`, forcando layout reflow) em cada keystroke. Agora so reposiciona em resize/scroll/sidebar toggle.

**Template reactivity — mirrors atualizam quando template e editado:**

Novo `src/rendering/templateDependencyRegistry.ts`:
- `TemplateDependencyRegistry` — mesma interface do `SourceDependencyRegistry`
- `register(templatePath, blockKey, rerender)` — com `unregisterBlock` automatico pra evitar duplicatas
- `getDependentCallbacks(templatePath)` — O(1) Map lookup

Novo `handleTemplateChange()` em `main.ts`:
- Chamado por `metadataCache.on('changed')` (Branch 3) e `vault.on('modify')` (body changes)
- Debounce 500ms via `templateUpdateTimeout`
- Executa callbacks dos template deps (DOM injection + code blocks)
- Itera leaves pra dispatchar `forceMirrorUpdateEffect` em CM6 widgets que usam o template

Registros:
- Code blocks: `templateDeps.register()` no processor, cleanup via `MarkdownRenderChild.register()`
- DOM injection: `templateDeps.register()` em `setupDomPosition()`, re-registra a cada chamada (idempotente)

`clearRenderCache()` global removido do `handleTemplateChange` — desnecessario porque o hash cache invalida naturalmente quando o conteudo processado muda (template diferente → hash diferente → cache miss).

**Novo arquivo:** `src/rendering/templateDependencyRegistry.ts`

---

### O que mudou na v34

**Novos arquivos:**

```
.github/workflows/
  release.yml    — auto-release no push de tag (main.js, manifest.json, styles.css)
  ci.yml         — build + lint + test em push/PR pra main
```

**Release flow:**
1. `npm version patch` (ou minor/major) → roda version-bump.mjs automaticamente
2. `git push && git push --tags`
3. GitHub Action faz checkout → npm install → npm run build → cria release com assets

**CI flow:**
- Push pra main ou PR: checkout → install → build → lint → test (vitest)
- Node 18, `--legacy-peer-deps`

---

### O que mudou na v33

**Estrutura de arquivos (pos-refactor):**

```
settings.ts          — MirrorUISettingsTab (UI), re-exports de types
src/settings/
  types.ts           — FolderTemplate, MirrorUIPluginSettings, CustomMirror, DEFAULT_SETTINGS
  pathValidator.ts   — addPathValidation() (inline warnings em inputs)
  filterBuilder.ts   — buildFilterSection() (builder pra filterFiles/Folders/Props)
src/suggesters/
  suggest.ts         — TextInputSuggest base (Popper-based, ex-utils/suggest.ts)
  file-suggest.ts    — FileSuggest, FolderSuggest, YamlPropertySuggest
src/editor/
  mirrorState.ts     — StateField + filePathFacet + helpers (hasForcedUpdate, detectFrontmatterChange, etc)
  decorationBuilder.ts — buildDecorations() (ex-mirrorDecorations.ts, sem dep circular)
src/utils/
  obsidianInternals.ts — wrappers tipados pra APIs @ts-ignore
  settingsPaths.ts     — updateSettingsPaths() (inalterado)
```

**Dependencia circular eliminada:**
- Antes: mirrorState → mirrorDecorations → mirrorState
- Agora: mirrorState → decorationBuilder (sem import reverso)

**settings.ts flow:**
- `addModeToggle()` — metodo generico pra Live Preview / Preview mode (global e custom)
- `buildFilterSection()` em filterBuilder.ts — recebe tipo (filterFiles/Folders/Props) e gera UI completa
- `addPathValidation()` extraido — reutilizado por settings.ts e filterBuilder.ts

---

### O que mudou na v32

**Position engine:** 3 engines (CM6, DOM, Margin) + fallback chain + positionOverrides. Detalhes completos na secao **Arquitetura > Position Engine** acima.

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

## Referencia

Para arquitetura atual (file map, fluxos, position engine, fallback chain, reactivity, cache), ver [architecture.md](architecture.md).

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

**Estado**: ViewPlugin recovery comentado na v25.3 (nunca disparava apos o fix). Arquivo deletado na v33 — git mantem o historico.

---

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
