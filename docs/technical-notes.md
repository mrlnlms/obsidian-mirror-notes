# Mirror Notes — Technical Notes (historico por versao)

O que mudou em cada versao e por que. Para arquitetura atual, file map, fluxos e decisoes, ver [architecture.md](architecture.md).

## Observability level 1: decision trace logs (pos-v53)

### O que mudou

**Contexto:** fluxo de decisao de runtime espalhado em 5 arquivos com 11 pontos de decisao. Logs existentes eram operacionais ("Loading template: X") — nao mostravam o fluxo de decisao completo. Identificado via analise de carga cognitiva (Codex).

**`traceMirrorDecision()` em mirrorUtils.ts** — funcao que formata e loga decisoes com prefixo `[trace]`:
```
[trace] notes/project.md [v0] config-resolve → mirror="Project Card" pos=above-title
[trace] notes/project.md [v0] dom-injection → mirror="above-title.md" pos=above-title engine=dom
[trace] notes/project.md [v0] cooldown-skip [45ms ago]
[trace] notes/project.md [v0] forced-update → mirror="top.md" [config changed: position, templatePath]
[trace] notes/project.md render-skip [content unchanged]
```

**5 pontos de insercao:**
1. `mirrorConfig.ts` — apos `getApplicableConfig()` resolver qual mirror matcha
2. `domPositionManager.ts` — cooldown skip (substituiu Logger.log existente)
3. `domPositionManager.ts` — apos injecao DOM, com posicao pedida vs real
4. `mirrorState.ts` — forced update quando config muda, com campos alterados
5. `templateRenderer.ts` — cache hit (render skipped)

**Filtrar:** `grep '[trace]' src/dev/debug.log` — mostra so decisoes, sem poluicao dos logs operacionais.

**Publico-alvo:** LLM (Claude, Codex) em sessoes de debug + humano durante desenvolvimento.

---

## Dot notation + unicode template variables (pos-v53)

### O que mudou

**Contexto:** regex `[\w-]+` no templateRenderer impedia `{{project.status}}` (dot notation) e `{{descrição}}` (unicode). Backlog de prioridade alta — usuario ja usa YAML nested no vault de projetos.

**Regex expandido:** `[\w\p{L}\p{N}.-]+` com flag `u`. Aceita letras unicode, numeros unicode, pontos e hifens.

**`resolveVariable(key, variables)` em mirrorUtils.ts:**
Estrategia flat-first, nested-fallback:
1. Tenta chave literal (`frontmatter["ma.miii"]`) — respeita propriedades com ponto do Obsidian
2. Se nao encontrar, tenta path nested (`frontmatter["ma"]["miii"]`) — como Dataview faz
3. Se nenhum, retorna undefined (template mantem `{{key}}` intacto)

**Por que flat-first:** Obsidian aceita chaves com pontos como propriedades validas (testado empiricamente: `ma.miii: valor` vira property real no vault). Se o usuario criou uma property `ma.miii`, ela deve ter prioridade sobre acesso nested `ma: { miii: ... }`.

**Arquivos:** `mirrorUtils.ts` (+resolveVariable), `templateRenderer.ts` (regex + import). 17 testes novos (13 resolveVariable + 4 templateRenderer). Total: 284 unit tests.

---

## E2E test suite (pos-v53)

### O que mudou

**Contexto:** 267 unit tests (Vitest+jsdom) cobriam logica mas nao DOM/CSS/timing reais. 5 gaps documentados no backlog desde v52: CSS layout, CM6 rendering, mode switch, cold start, plugin lifecycle. O harness `obsidian-plugin-e2e` (projeto separado) foi finalizado e integrado.

**25 E2E specs em 5 suites** rodando contra Obsidian v1.12.4 real via WebdriverIO + wdio-obsidian-service.

**Infraestrutura:**
- `wdio.conf.mts` com `createConfig()` do harness + `before` hook que injeta config E2E (wdio-obsidian-service copia `data.json` do pluginDir, sobrescrevendo a config curada)
- Test vault minimo em `test/e2e/vaults/visual/` com 9 templates (callouts E2E-prefixed), 8 notas (uma por posicao + smoke/dual/no-mirror), e `data.json` com 11 mirrors
- Helper em `test/e2e/helpers/mirror.ts` com selectors, markers, e funcoes de navegacao/assertion

**Decisoes tecnicas:**
- **Uma nota por posicao** — first-match-wins impede multiplos mirrors na mesma nota. Cada nota tem frontmatter `mirror: <position>` que matcha exatamente um mirror
- **`markdown:toggle-preview`** em vez de `editor:toggle-source` — o segundo nao funciona no sandbox do wdio-obsidian-service
- **Config injection via `before` hook** — `wdio-obsidian-service` copia tudo de `pluginDir` incluindo `data.json` do workbench. Hook substitui settings no runtime
- **Viewport tolerance 10%** — screenshots de viewport variam por cursor, timing, e subpixel rendering. Component screenshots usam 1.5%
- **Fallback-resilient specs** — posicoes DOM (properties, backlinks) testam DOM injection OU CM6 fallback, refletindo o comportamento real do plugin

**Arquivos:** `wdio.conf.mts`, `tsconfig.e2e.json`, `test/e2e/` (helpers, specs, vaults)

---

## Code review fixes (pos-v53)

### O que mudou

**Contexto:** code review completo do projeto identificou 2 issues criticos, 6 importantes e 6 sugestoes. Todos corrigidos exceto: deprecated positions no dropdown (backlog), @popperjs/core (backlog), template regex (backlog).

**1. XSS no templateRenderer.ts catch block**
O `container.innerHTML = \`Error: ${error}\`` no catch block permitia injecao de HTML se o error contivesse markup (ex: template path malicioso). Corrigido com `createEl` + `textContent`.

**2. hashObject fragil com strings**
`hashObject(extractRawYaml(...))` recebia uma string, mas `JSON.stringify(obj, Object.keys(obj).sort())` com string retorna indices de caractere (`['0','1','2',...]`) em vez de propriedades. Adicionado `typeof obj === 'string'` pra usar string direta.

**3. arraymove sem bounds guard**
`customCards.ts` chamava `arraymove(arr, 0, -1)` no "Move up" do primeiro item — `splice(-1, 0, el)` insere antes do ultimo, movendo silenciosamente o primeiro item pro final. Adicionado `if (index > 0)` e `if (index < length - 1)`.

**4. Caches module-level sem cleanup**
`lastSetupTime` (domPositionManager) e `lastConfig` (obsidianConfigMonitor) nao tinham funcao de reset. Adicionado `clearSetupCooldowns()` e `resetConfigSnapshot()` chamados no `onunload`.

**5. CSS legacy removido (~93 linhas)**
Regras `.mirror-frontmatter-hider`, `.mirror-hidden-frontmatter-line`, `.mirror-ui-anchor-line` e `.mirror-ui-injected-widget` nao tinham referencia no source code. Removidas.

**6. Logger mock paths corrigidos**
4 test files usavam `vi.mock('../src/logger')` mas o Logger real esta em `../src/dev/logger`. Funcionava por acidente (Logger e no-op sem `init()`), mas o mock era dead code.

**7. tsconfig.test.json**
Criado pra incluir arquivos de teste na validacao de tipos (antes eram excluidos pelo `tsconfig.json`).

**Arquivos tocados:** templateRenderer.ts, mirrorUtils.ts, main.ts, customCards.ts, domPositionManager.ts, obsidianConfigMonitor.ts, mirrorWidget.ts, eslint.config.mjs, styles.css, tsconfig.test.json, 5 test files.

---

## Versao Atual: v53 — Rename mirrors + typo migration

### O que mudou na v53

**Contexto:** backlog de Settings UI tinha dois itens de limpeza: mirrors sem opcao de rename (so deletar e recriar), e typo `overide` (sem segundo r) presente desde v1 em campos de settings e data.json.

**1. Inline rename para custom mirrors**

Substituicao do `.setName(customMirror.name)` estatico por text input editavel no header do card. `sanitizeMirrorName(input, index)` faz trim + fallback pra `Mirror N+1`. Save acontece no `blur` (nao per-keystroke) pra evitar disk I/O e `refreshAllEditors` excessivo. `onChange` atualiza in-memory pra search filter funcionar durante digitacao.

**2. Typo fix `overide → override`**

Correcao direta em todos os campos: interfaces (`MirrorUIPluginSettings`, `CustomMirror`), defaults, factory, source code (mirrorConfig, globalSection, customCards), todos os testes, e data.json (root, demo, old-filter-engine). Sem migration function — plugin ainda nao foi publicado, nao existe data.json legado pra migrar.

**3. Fix `toogle-header → toggle-header`**

Typo na CSS class em 7 ocorrencias (customCards.ts, globalSection.ts, settingsUI.ts). Nenhuma regra CSS referenciava `.toogle-header` — fix e puramente na atribuicao JS.

**4. UI labels EN**

Descricoes dos toggles de override traduzidas PT-BR → EN (plugin e public-facing).

**5. Cobertura de testes (+33, 234 → 267)**

Rodada de auditoria de cobertura. 4 novos arquivos de teste:
- `blockParser.test.ts` (13): parsing de code blocks — template, source, inline vars, erros de sintaxe, edge cases (URLs com colon, linhas vazias)
- `arraymove.test.ts` (7): reordenacao de arrays (forward, backward, same index, mutacao in-place)
- `mirrorUtils.test.ts` (+3): `generateWidgetId` — prefixo, unicidade (100 ids), formato timestamp+random
- `settingsHelpers.test.ts` (10): `rebuildKnownTemplatePaths` (4 cenarios: global, custom, clear, empty) + `checkDeletedTemplates` (6 cenarios: Notice spy, click handler com openSettingsToField, multiplos matches)

Zona cinza documentada (5 arquivos com mock pesado): mirrorState, decorationBuilder, mirrorWidget, codeBlockProcessor, domPositionManager. Decisao: reavaliar com E2E.

## v52 — Structural refactor (code review triage)

### O que mudou na v52

**Contexto:** code review externo (Codex) identificou 4 areas de divida tecnica: main.ts grande demais, settings.ts monolitico, @ts-ignore espalhados, e `any` em modulos core. Triagem priorizou por ROI — refactor estrutural puro, zero mudanca de comportamento.

**1. Centralizacao de @ts-ignore em `obsidianInternals.ts`**

Antes: 13 `@ts-ignore` espalhados por 6 arquivos (viewOverrides.ts, domInjector.ts, domPositionManager.ts, suggest.ts, conditionBuilder.ts, main.ts). Depois: zero fora de `obsidianInternals.ts` (exceto `super()` do PluginSettingTab — nao faz sentido wrappear). 8 wrappers novos: `getVaultConfig`, `getViewMode`, `getBacklinkPlugin`, `pushKeymapScope`, `popKeymapScope`, `onVaultRaw` + refatoracao de 4 usos de `addSearchClass` no conditionBuilder.

**2. Tipagem de `any` em modulos core**

- `mirrorTypes.ts`: `frontmatter: any` → `Record<string, any>` (mais expressivo)
- `mirrorState.ts`: `file: any` → `TFile | null`, `decorations: any` → `DecorationSet`, `as any` → `as TFile | null`
- `marginPanelExtension.ts`: `mirrorState: any, config: any` → `MirrorState, ApplicableMirrorConfig`

**3. Extracao de main.ts (449 → 386 linhas)**

- `obsidianConfigMonitor.ts`: snapshot + raw listener (app.json, core-plugins.json). Encapsula diff de config e callback `onConfigChange`. Usa wrappers tipados.
- `modeSwitchDetector.ts`: layout-change + trailing debounce 50ms + per-view mode tracking (`lastViewMode`). Chama setupEditor/setupDomPosition/applyViewOverrides conforme modo.

**4. Split de settings.ts (545 → 83 linhas)**

- `settingsUI.ts`: `addModeToggle()` + `addPositionOptions()` — componentes reutilizaveis (usados 4x entre global e custom)
- `viewOverridesUI.ts`: `addViewOverridesSection()` — deduplicacao do bloco de view overrides que era identico no global e no custom (~45 linhas x2 → 1 funcao parametrizada)
- `globalSection.ts`: `buildGlobalSection()` — secao inteira de global mirror
- `customCards.ts`: `buildCustomMirrorsSection()` — custom mirrors + cards + filter
- `array.ts`: `arraymove()` — utilitario compartilhado (antes duplicado em settings.ts e conditionBuilder.ts)

Interface de extracao segue padrao do conditionBuilder: options object com `app`, `plugin`, `onSave`, `onRedisplay`.

**Arquivos tocados:** main.ts, settings.ts, src/editor/viewOverrides.ts, src/editor/mirrorState.ts, src/editor/mirrorTypes.ts, src/editor/marginPanelExtension.ts, src/rendering/domInjector.ts, src/rendering/domPositionManager.ts, src/suggesters/suggest.ts, src/settings/conditionBuilder.ts + 8 arquivos novos

**Testes:** 215 (sem mudanca — refactor puro, zero comportamento alterado)

---

## v51 — Codex audit fixes + minAppVersion

### O que mudou na v51

**Contexto:** analise externa (Codex) revisou o projeto e identificou 3 findings. Finding 1 (filePathFacet stale) descartado como falso positivo (ja investigado na v49). Findings 2 e 3 eram bugs reais de baixa severidade.

**Fix 1: per-template debounce (templateChangeHandler.ts)**

Problema: `templateUpdateTimeout` era um unico `setTimeout` global. Se dois templates diferentes mudavam dentro da janela de debounce (500ms), o segundo `clearTimeout` cancelava o refresh do primeiro. Callbacks de templateA eram perdidos.

Causa: design original assumia que so um template mudava por vez. Com cross-note reactivity (v30+) e multiplos mirrors apontando pra templates diferentes, o cenario de edicao concorrente ficou possivel.

Fix: trocar `let templateUpdateTimeout` por `Map<string, NodeJS.Timeout>` indexado por filePath. Cada template tem seu proprio debounce independente. `clearTemplateChangeTimeout()` itera o Map. Mesmo padrao de `crossNoteTimeouts` no main.ts (v41).

**Fix 2: MarkdownRenderChild acumulando (templateRenderer.ts)**

Problema: a cada `doRender()` de code block, um novo `MarkdownRenderChild` era adicionado ao component sem remover o anterior. `container.innerHTML = ""` removia o DOM, mas o child antigo ficava no array `_children` do component como referencia morta ate o code block ser destruido.

Impacto: numa nota com 3 code blocks e 10 re-renders cada (cross-note reactivity), acumulava 30 MarkdownRenderChild orphans. Nao era leak permanente (cleanup no destroy), mas gastava memoria desnecessariamente.

Fix: `lastRenderChildren` Map<string, MarkdownRenderChild> indexado por cacheKey. Antes de `addChild(new)`, faz `removeChild(prev)`. `clearRenderCache()` tambem limpa o Map de children.

**Audit minAppVersion**

Problema: manifest.json declarava `minAppVersion: "0.15.0"`, mas o plugin usa CM6 (StateField, ViewPlugin, Decoration), APIs internas (`editor.cm`, `view.getMode()`, `vault.getConfig()`, `vault.on('raw')`, `app.internalPlugins`) e padroes que so estabilizaram na 1.0.0. Dev typings: `obsidian ^1.12.3`.

Decisao: floor real e `1.0.0` — quando Obsidian finalizou a migracao CM6. Atualizado manifest.json e versions.json.

**Arquivos tocados:** `src/rendering/templateChangeHandler.ts`, `src/rendering/templateRenderer.ts`, `manifest.json`, `versions.json`, `docs/backlog.md`

**Testes:** 213 (+6 novos: templateChangeHandler 5 cenarios, templateRenderer 1 cenario de acumulacao)

---

## v50 — MutationObserver auto-recovery + cooldown

### O que mudou na v50

**Contexto:** desde a v47 (Reading View DOM injection), containers injetados no `.markdown-preview-sizer` eram destruidos pelo Obsidian durante mode switches e re-renders internos. O container e um elemento "intruso" — nao faz parte do render tree do Obsidian. Quando o Obsidian reconstroi o sizer, nosso container desaparece. O pane ativo era re-injetado via `layout-change`/`active-leaf-change`, mas panes inativos perdiam o mirror ate receberem foco.

**Diagnostico:** log temporario (`[DIAG-pane]`) em `domPositionManager.ts` confirmou o fluxo: `existingContainers=1 isConnected=true` → mode switch → `existingContainers=0`. Container sumia sem que nenhum event handler re-injetasse pra panes inativos.

**Solucao: MutationObserver + cooldown com bypass**

A implementacao envolveu 3 camadas que interagem de forma nao-trivial:

1. **MutationObserver no sizer (`domInjector.ts`):**
   - `setupContainerObserver(key, container, onRemoved)` — observa `container.parentElement` com `{ childList: true }`
   - Quando `!container.isConnected` → desconecta observer imediatamente (previne callbacks duplicados) → chama `onRemoved()`
   - Map `injectionObservers` paralelo ao `injectedContainers` com mesma key
   - `injectDomMirror` ganhou parametro opcional `onContainerRemoved?: () => void`
   - Observer criado apos insercao bem-sucedida, desconectado em todas as funcoes de cleanup

2. **Cooldown 100ms (`domPositionManager.ts`):**
   - Sem cooldown, o observer re-injetava instantaneamente, e depois `file-open` + `active-leaf-change` (delay 25ms) chamavam `setupDomPosition` de novo — resultado: 3 injections pra 1 operacao (2 desperdicadas, cache hit mas log poluido)
   - `lastSetupTime` Map por `viewId:filePath` — bloqueia chamadas dentro de 100ms

3. **Bypass do cooldown pra observer (`isMutationRecovery`):**
   - Problema encontrado no teste: container injetado → Obsidian destroi imediatamente (rebuild do sizer) → observer dispara → cooldown bloqueia porque a injection que criou o container setou o timestamp ha <100ms → container PERDIDO
   - Fix: `setupDomPosition(plugin, view, isRetry, isMutationRecovery)` — quarto parametro. Observer chama com `isMutationRecovery=true`, que bypassa o cooldown mas SETA o timestamp pra bloquear event handlers subsequentes
   - `isRetry=true` (backlinks timing) tambem bypassa cooldown

**Complexidade e armadilhas encontradas:**

- **Cooldown bloqueando observer:** a primeira implementacao do cooldown nao distinguia entre chamadas de event handlers (desperdicadas) e do observer (legitimas). O observer era bloqueado quando o container era destruido logo apos criacao — exatamente o cenario que ele deveria cobrir. Resolvido com flag `isMutationRecovery`
- **Dependencia circular:** `domInjector.ts` nao pode importar de `domPositionManager.ts` (que ja importa de `domInjector`). Resolvido com callback pattern: `injectDomMirror` recebe callback, `domPositionManager` passa `() => setupDomPosition(plugin, view, false, true)`
- **Observer no sizer vs view-content:** observar `.view-content` com `subtree: true` seria ruidoso (qualquer mudanca no RV dispara). Observar o sizer direto com `childList: true` e cirurgico — so dispara quando children diretos mudam
- **Sizer substituido vs children reconstruidos:** se o sizer inteiro e substituido (nao so children), o observer no sizer antigo nao dispara. `layout-change` cobre o pane ativo. Pane inativo: coberto por `active-leaf-change` ao receber foco

**Cleanup adicional:**
- Diagnostico temporario `[DIAG-pane]` removido de `domPositionManager.ts`

**Arquivos tocados:** `src/rendering/domInjector.ts`, `src/rendering/domPositionManager.ts`, `tests/domInjector.test.ts`

**Testes:** 207 (+10 novos: setupContainerObserver 5 cenarios, disconnectObserver/ByPrefix 2 cenarios, injectDomMirror com callback 3 cenarios)

---

## v49 — Dual-template (LP + RV)

### O que mudou na v49

**Contexto:** a UI sempre teve campos separados pra "Live Preview Mode Template" e "Preview Mode Template" — template, posicao, enable toggle. Mas o runtime (`getApplicableConfig` / `configFromMirror`) so usava os campos `_live_preview_`. Os campos `_preview_` eram persistidos, rename-aware, e notificados em delete, mas nunca entravam na decisao. Com Reading View funcionando (v47), hora de ativar.

**Mudancas:**

1. **`configFromMirror(mirror, viewMode?)`** — se `viewMode === 'preview'` E mirror tem `enable_custom_preview_mode` + template configurado, usa `custom_settings_preview_note` / `custom_settings_preview_pos`. Senao fallback pra live_preview.

2. **`getApplicableConfig(plugin, file, fm, viewId?, viewMode?)`** — matching agora aceita mirror com pelo menos um modo ativo (`hasLP || hasRV`). Antes so checava LP. Global mirror idem.

3. **Cache key mode-aware** — `${file.path}:${viewMode ?? 'source'}`. LP e RV cachados separado. Necessario porque o mesmo arquivo pode ter configs diferentes por modo.

4. **`setupDomPosition`** — ja tinha `view.getMode()`, agora passa pra `getApplicableConfig`.

5. **Cleanup legacy hideProps** — `custom_settings_hide_props` / `global_settings_hide_props` removidos dos types/defaults/settings UI. `resolveViewOverrides()` eliminada. `viewOverrides.hideProps` e autoritativo.

**Arquivos tocados:** `mirrorConfig.ts`, `main.ts`, `types.ts`, `settings.ts`, `mirrorConfig.test.ts`

### Refactor main.ts (pos-v49)

**Contexto:** main.ts concentrava ~650 linhas com lifecycle, event handlers, render paths e coordenacao. Funcional mas alto acoplamento — qualquer mudanca em event handlers ou setupDomPosition impactava todos os render paths. 191 testes como rede de seguranca.

**O que foi feito:** extrair 4 modulos autonomos, cada um recebendo `plugin: MirrorUIPlugin` como parametro (dependency injection, sem import circular):

1. `src/editor/viewOverrides.ts` — `applyViewOverrides(plugin, view)` (CSS per-view overrides)
2. `src/rendering/domPositionManager.ts` — `setupDomPosition(plugin, view, isRetry?)` + `positionOverrideKey()` (orchestracao DOM injection + fallback)
3. `src/rendering/templateChangeHandler.ts` — `handleTemplateChange(plugin, filePath)` + `clearTemplateChangeTimeout()` (template reactivity com estado local de timeout)
4. `src/settings/settingsHelpers.ts` — `rebuildKnownTemplatePaths(plugin)` + `checkDeletedTemplates(plugin, deletedPath)` (helpers de settings)

**Cleanup adicional:**
- `activeEditors` Map removido (dead code — nunca lido/escrito, so cleared no onunload)
- `knownTemplatePaths` e `lastViewMode` tornados public (modulos extraidos precisam acessar)
- `templateDependencyRegistry.ts` ganhou `unregisterByPrefix()` (usado por domPositionManager pra limpar callbacks stale ao navegar entre notas)
- Imports nao usados removidos do main.ts

**Resultado:** main.ts 650→444 linhas. So lifecycle (`onload`/`onunload`), event registrations, `setupEditor`, `refreshAllEditors`, `openSettingsToField` e `loadSettings`/`saveSettings`/`resetSettings`.

**Arquivos tocados:** `main.ts`, `tests/updateHideProps.test.ts`, `src/rendering/templateDependencyRegistry.ts` + 4 novos modulos

---

## v48 — Per-view DOM injection isolation

### O que mudou na v48

**Contexto:** `injectedContainers` Map usava key `dom-${filePath}-${position}`. Mesmo arquivo em dois panes compartilhava a mesma key. `insertBefore` (DOM spec) MOVE o container de pane A pra B — pane A perdia o mirror.

**Causa raiz:** DOM injector nao tinha conceito de "qual pane". CM6 ja resolvia isso via `filePathFacet` (v36) — cada pane tem StateField independente. Mas o DOM injector era global.

**Solucao: viewId via WeakMap**

1. **`domInjector.ts` — `getViewId(containerEl)`:** WeakMap `<HTMLElement, string>` gera ID unico (`v0`, `v1`, ...) por `view.containerEl`. Auto-cleanup via GC quando leaf fecha. `injectionKey` agora e `dom-${viewId}-${filePath}-${position}`. Todas as funcoes de remove recebem viewId.

2. **`mirrorState.ts` — `viewIdFacet`:** Facet CM6 analogamente a `filePathFacet`, setado em `setupEditor`. Permite que o StateField passe viewId pro `getApplicableConfig`.

3. **`mirrorConfig.ts` — `getApplicableConfig(plugin, file, fm, viewId?)`:** positionOverrides lookup usa key composta `${viewId}:${filePath}`. Parametro opcional — callers sem contexto de view (ex: testes de config) continuam funcionando.

4. **`main.ts` — `setupDomPosition`:** extrai viewId no inicio, passa pra todas as operacoes (remove, inject, positionOverrides, templateDeps blockKey). Helper `positionOverrideKey()` evita repeticao.

**Fix bonus:** erro TS pre-existente em `CM6_POSITIONS.includes(config?.position ?? '')` — `''` nao era assignable a `MirrorPosition`. Fix: cast `CM6_POSITIONS as readonly string[]`.

**Testes:** 185 (+9). 3 testes de `getViewId` (estabilidade, unicidade, pattern). 5 testes de isolamento per-view (containers independentes, remove scoped, cleanup scoped, keys unicas). 1 teste de `removeOtherDomMirrors`.

**Arquivos tocados:** `domInjector.ts` (core), `mirrorState.ts` (facet), `mirrorConfig.ts` (viewId param), `main.ts` (callers), `domInjector.test.ts`, `updateHideProps.test.ts` (mocks).

## v47 — Reading View DOM injection

### O que mudou na v47

**Contexto:** mirrors com posicao `top`/`bottom` usavam CM6 widgets — invisíveis em Reading View. Proximo item do roadmap.

**Problema:** CM6 widgets (Decorations) so sao visiveis em Live Preview. Em Reading View, Obsidian esconde `.markdown-source-view` via CSS (CM6 continua no DOM mas oculto) e mostra `.markdown-reading-view` → `.markdown-preview-sizer`. Mirrors top/bottom simplesmente nao apareciam.

**Investigacao empirica:** log diagnostico temporario revelou a arvore DOM do Reading View:
- `.markdown-preview-sizer` contem: `[0] .markdown-preview-pusher`, `[1] .mod-header.mod-ui`, `[2] .el-pre.mod-frontmatter.mod-ui`, `[3..N] conteudo`, `[N] .mod-footer.mod-ui`
- `.mod-header` e `.mod-footer` estao DENTRO do sizer (nao como irmaos do `.markdown-reading-view`)
- `view.getMode()` retorna `'source'` (LP/Source) e `'preview'` (RV)
- Ambos containers (`.markdown-source-view` e `.markdown-reading-view`) coexistem no DOM, Obsidian alterna via CSS

**Solucao (3 mudancas):**

1. **`domInjector.ts` — novos cases em `resolveTarget()`:**
   - `top`: busca `.markdown-preview-sizer` → `insertAfter` no `.el-pre.mod-frontmatter` (fallback: `.mod-header`)
   - `bottom`: busca `.markdown-preview-sizer` → `insertBefore` no `.mod-footer` (fallback: `appendChild` no sizer)
   - Em Live Preview, `.markdown-preview-sizer` nao existe → retorna null → comportamento inalterado

2. **`main.ts` — gate expandido em `setupDomPosition()`:**
   - `shouldInjectDom = isDomPosition(pos) || (isReadingView && CM6_POSITIONS.includes(pos))`
   - Em LP: `isReadingView = false` → identico ao comportamento anterior
   - Em RV com top/bottom: prossegue com DOM injection

3. **`main.ts` — evento `layout-change`:**
   - Unico evento que dispara na mudanca de modo (Cmd+E). `file-open`/`active-leaf-change` NAO disparam
   - Trailing debounce 50ms: `getMode()` oscila durante transicao do Obsidian (source↔preview bounce). Debounce espera estabilizar
   - Guard `lastViewMode` Map: so processa quando modo realmente mudou
   - Em RV, nao chama `setupEditor()` — CM6 dispatch em RV causava layout-change cascata

**Arquivos tocados:** `main.ts` (gate + layout-change + lastViewMode), `src/rendering/domInjector.ts` (resolveTarget + selectors), `src/editor/mirrorTypes.ts` (import CM6_POSITIONS), `tests/domInjector.test.ts` (+5 testes RV)

**Trade-offs:**
- 50ms debounce no mode switch e imperceptivel mas previne cascata de re-renders
- CM6 widgets continuam sendo criados em RV (StateField registrado), mas ficam ocultos (`.markdown-source-view` display:none). Nao causa problema — e assim que Obsidian funciona
- `applyViewOverrides` funciona em RV porque CM6 existe em ambos os modos — Obsidian cria os dois containers simultaneamente. CSS class no `.view-content` cobre LP e RV

---

## v46 — AND/OR compound filter logic

### O que mudou na v46

**Contexto:** filtros eram OR-only (3 arrays separados). Benchmark com Virtual Notes revelou gap — nao tinha como exigir "folder X E property Y". Primeiro item do backlog.

**1. Data model unificado (`types.ts`):**
- Nova interface `Condition` com `type: 'file' | 'folder' | 'property'`, `negated: boolean`, e campos semanticos (`fileName`, `folderPath`, `propertyName`, `propertyValue`)
- `CustomMirror` troca `filterFiles/filterFolders/filterProps` por `conditions: Condition[]` + `conditionLogic: 'any' | 'all'`
- `propertyValue` vazio = match any value (property existe)

**2. Matching engine (`mirrorConfig.ts`):**
- `mirrorIndex` eliminado (Maps pre-computados de file/folder). Incompativel com AND — teria que ser reescrito
- `evaluateCondition()` e `evaluateConditions()` — funcoes puras, exportadas pra teste
- AND: `conditions.every()`, OR: `conditions.some()`, negacao: `condition.negated ? !result : result`
- `configCache` preservado intacto — so avalia no cache miss
- Trade-off: cold start perde O(1) file lookup, mas com <20 mirrors o scan e <1ms

**3. Settings UI (`conditionBuilder.ts`):**
- `filterBuilder.ts` deletado, substituido por `conditionBuilder.ts`
- Secao unificada "Conditions" com dropdown "Match any / Match all"
- Cada row: dropdown is/not → dropdown tipo → inputs contextuais (suggesters preservados)
- 3 chamadas a `buildFilterSection` → 1 chamada a `buildConditionsSection`

**4. Rename-aware (`settingsPaths.ts`):**
- Itera `conditions[]` com campos semanticos em vez de arrays genericos
- Guard `oldName !== newName` preservado pra folder moves

**Arquivos tocados:** `types.ts`, `mirrorConfig.ts`, `conditionBuilder.ts` (novo), `settings.ts`, `settingsPaths.ts`, `pluginFactory.ts`, `mirrorConfig.test.ts`, `updateSettingsPaths.test.ts`

### O que mudou na v44

**Contexto: 3 bugs interligados no position engine de backlinks**

O fix do config cache expôs uma race condition latente no cold start, e a investigacao revelou que `below-backlinks` tinha dead code e logica inconsistente com `above-backlinks`.

**1. Config cache poluido por positionOverrides (`mirrorConfig.ts`):**
- Problema: `getApplicableConfig()` aplicava o override (ex: `above-backlinks` → `bottom`) ANTES de cachear. Na proxima chamada (retry, cold start), o cache retornava `bottom` direto, e `isDomPosition('bottom')` = false → `setupDomPosition` retornava early sem tentar DOM
- Causa raiz: o override e estado runtime (muda quando backlinks populam), mas estava poluindo o cache que deveria guardar so a config base
- Fix: cachear resultado ANTES de aplicar override. Override e aplicado dinamicamente a cada chamada, nao persiste no cache
- Impacto: retries de backlinks timing nunca funcionaram antes deste fix — o cache sempre retornava a posicao fallback

**2. Race condition no cold start (`main.ts` + `domInjector.ts`):**
- Problema: `setupDomPosition` chamava `removeAllDomMirrors()` antes de `injectDomMirror()`. No cold start, multiplos event handlers (`file-open`, `active-leaf-change`, `onLayoutReady`) disparam em rapida sucessao, cada um removendo o container que o anterior esta renderizando (async, ~2s via MarkdownRenderer)
- Resultado: container vazio na primeira abertura — o container com conteudo renderizado era removido por uma chamada subsequente que criava um container novo e vazio
- Fix: nova funcao `removeOtherDomMirrors(filePath, keepPosition)` — so remove containers de OUTRAS posicoes. Container da posicao atual e reutilizado por `injectDomMirror` (ja existia check de `isConnected`)
- Antes deste fix, o bug era mascarado pelo cache poluido (item 1) — o cache retornava `bottom`, `isDomPosition` dava false, e `setupDomPosition` retornava early sem destruir o container

**3. `below-backlinks` alinhado com `above-backlinks` (`domInjector.ts`):**
- Removido fallback `.cm-sizer` — dead code (plugin OFF → `isDomTargetVisible` retorna null antes do switch; plugin ON → `.embedded-backlinks` sempre existe)
- Bug potencial: se existisse estado transitorio com plugin ON mas sem o elemento DOM, o mirror seria injetado via DOM dentro do `.cm-sizer`, `injectDomMirror` retornaria sucesso, nenhum retry seria agendado — mirror preso no lugar errado
- Agora `below-backlinks` e identico a `above-backlinks`: `children.length > 0` → DOM, senao → CM6 `bottom` via fallback
- Removida constante `SELECTOR_CM_SIZER` (nao usada em nenhum outro lugar)
- Label do dropdown atualizado pra "Below backlinks (DOM, CM6 fallback)"

**4. Retry cascade exponencial (`main.ts`):**
- Problema: retries de backlinks (500/1500/3000ms) chamavam `setupDomPosition()` que, ao falhar, agendava MAIS retries — explosao exponencial (18K+ linhas de log)
- Fix: parametro `isRetry` — retries nao agendam mais retries. 3 tentativas fixas (500ms, 1.5s, 3s) e para

**5. Event logging (`main.ts`):**
- Adicionados logs em `file-open`, `active-leaf-change`, `onLayoutReady` e cold start retry
- Formato: `[event] nome: path` — permite rastrear fluxo de navegacao no debug.log

**Arquivos modificados:** `src/rendering/domInjector.ts`, `src/editor/mirrorConfig.ts`, `main.ts`, `settings.ts`, `src/editor/mirrorTypes.ts`, `tests/domInjector.test.ts`

### O que mudou na v43

**Contexto: simplificar menu de posicoes e corrigir rendering no cold start**

O dropdown tinha `bottom` (CM6) e `above-backlinks` (DOM) como opcoes separadas. Na pratica, o usuario quer "bottom da nota" — se backlinks estao ativos, o mirror deve aparecer acima deles (DOM); se nao, no fim do editor (CM6 fallback). Seguindo o padrao do `top` (CM6 primario, DOM deprecated com fallback), unificamos as opcoes.

**1. Dropdown unificado (`settings.ts`):**
- `above-backlinks` → "Bottom / Above backlinks (DOM, CM6 fallback)" — opcao primaria
- `bottom` → deprecated, aponta pra "Bottom/Above backlinks"
- Mesmo padrao do `top` / `below-properties`: DOM tenta primeiro, CM6 e fallback

**2. positionOverrides stale (`main.ts`):**
- `positionOverrides.delete(file.path)` movido pra ANTES de `getApplicableConfig()` em `setupDomPosition`
- Problema: quando backlinks sumiam, override `bottom` persistia e impedia re-avaliacao do DOM na proxima abertura
- Causa raiz: `getApplicableConfig` aplicava override antes do check `isDomPosition`, entao `above-backlinks` virava `bottom` e saía do fluxo DOM

**3. Retry pra backlinks timing (`main.ts`):**
- Quando `resolveTarget('above-backlinks')` falha (`.embedded-backlinks` sem children), alem do fallback pra CM6, agenda retry de 500ms
- Backlinks plugin sempre insere `.embedded-backlinks` no DOM quando ativo, mas popula children com delay (nao e reativo pra abas abertas)

**4. Cold start rendering fix (`main.ts`):**
- `MarkdownRenderer.renderMarkdown` no `onLayoutReady` retornava success mas nao populava o DOM visivelmente
- Fix: retry de 1s apos `onLayoutReady` com `clearRenderCache()` + re-execucao de `setupDomPosition` pra todas as leaves

**Arquivos modificados:** `settings.ts`, `main.ts`

### O que mudou na v42

**Contexto: permitir que cada mirror sobrescreva settings globais do Obsidian per-view**

O backlog listava um bug em `hideProperties` — o seletor CSS supostamente nao funcionava no Obsidian atual. Diagnostico DOM via Logger revelou que era falso positivo: `.metadata-container` continua descendente de `.view-content` (pai mudou de `.cm-editor` pra `.cm-sizer`, mas descendant selector cobre). O verdadeiro problema nos testes iniciais era matching errado (`filterFiles` com path completo vs `file.name`).

Com hideProps confirmado funcional, generalizamos o padrao pra 3 overrides:

**1. ViewOverrides type (`types.ts`):**

Interface `ViewOverrides` com `hideProps` (boolean), `readableLineLength` (true/false/null), `showInlineTitle` (true/false/null). `null` = inherit do Obsidian. Adicionado a `MirrorUIPluginSettings` (global) e `CustomMirror` (per-mirror). `resolveViewOverrides()` migra campo legacy `hide_props` automaticamente.

**2. readableLineLength — class nativa, nao CSS hack:**

Primeira tentativa: CSS `max-width` no `.cm-contentContainer`. Quebrava o layout do CM6 (conteudo colapsava em coluna de 1 caractere). Segunda tentativa: `var(--file-line-width)` com fallback. Faltava centralizar. Terceira (final): toggle da class nativa `is-readable-line-width` que o Obsidian ja usa no `.markdown-source-view`. Zero CSS, usa as regras nativas do Obsidian.

Problema descoberto durante testes: ao navegar de uma nota com `readableLine=false` pra outra com `readableLine=null` (inherit), a class `is-readable-line-width` nao era restaurada — o estado da nota anterior contaminava a proxima. Fix: no caso `inherit`, consultar `app.vault.getConfig("readableLineLength")` e restaurar a class pro valor global.

**3. showInlineTitle — CSS per-view:**

CSS `display: none !important` na `.inline-title` quando `showInlineTitle=false`. CSS `display: block !important` quando `showInlineTitle=true`. Ambos scoped por `.view-content` — multi-pane funciona.

**4. Settings UI (`settings.ts`):**

Secao "View overrides" com heading separado. Toggle pra hideProps, dropdowns pra readableLineLength e showInlineTitle (Inherit/Force ON/Force OFF). Replicado em global mirror e cada custom mirror.

**5. applyViewOverrides (`main.ts`):**

Rename de `updateHidePropsForView()`. Aplica todos os overrides em sequencia. Chamado nos mesmos 5 pontos (metadataCache.changed, refreshAllEditors, setupEditor, etc). Onunload limpa classes CSS + restaura `is-readable-line-width` via `getConfig`.

**Arquivos tocados:** `types.ts`, `mirrorTypes.ts`, `mirrorConfig.ts`, `mirrorState.ts`, `main.ts`, `settings.ts`, `styles.css`, `updateHideProps.test.ts`, `backlog.md`

### v41 — metadataCache unificado + scoped cache + code block self-dependency

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
