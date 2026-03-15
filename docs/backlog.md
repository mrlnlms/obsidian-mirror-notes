# Mirror Notes — Backlog

Trabalho tecnico a ser feito. Atualizado na v44.

## Bugs

(nenhum bug aberto)

## Features

- **Logica AND/OR nas condicionais** — hoje todos os filtros sao OR (qualquer match ativa o mirror). Nao tem como exigir "folder X **E** property Y". VirtualNotes tem rules com condicoes compostas. Impacta uso real — ex: "mirror X so pra notas em projects/ que tenham type: active" nao e possivel hoje. Afeta `mirrorConfig.ts` (matching) e `settings.ts` (UI pra combinar condicoes)
- **Suporte a multiplos mirrors na mesma nota** — hoje o primeiro mirror que matcha ganha, o segundo e descartado com warning. Config de teste "Edge: Conflito" (pos-top.md claimado por 2 mirrors) preservada como referencia. Requer `Map<string, CustomMirror[]>` e rendering pipeline pra multiplos widgets/DOM
- **Reading View DOM injection pra top/bottom** — CM6 widgets so existem em Live Preview. Pra top/bottom em Reading View: DOM injection em `.mod-header.mod-ui` / `.mod-footer`

## Position engine

- **Simplificar menu de posicoes (parcial v43/v44)** — `bottom` + `above-backlinks` unificados (v43), `below-backlinks` alinhado com mesmo fallback (v44). `below-properties` + `top` ja unificados (v42). Falta: remover opcoes deprecated do dropdown completamente (breaking change — migrar data.json de usuarios)
- **Margin panel avancado** — 3 problemas conhecidos: (1) left margin sobrepoe conteudo — precisa calcular largura disponivel (`contentDOM.offsetLeft`, readable-line-width); (2) right margin nao responde a resize — precisa ResizeObserver; (3) margins com readable line length OFF — sem margem disponivel, precisa fallback (ocultar? mover?). Tambem: tratamento de line numbers (`cm-gutters.offsetWidth`), min-height (VN usa 528px footer, 100px above-backlinks)
## Considerado resolvido

- **CSS parity com Live Preview nativo** — mirrors tem parity com Reading View (v38). Live Preview usa modelo de spacing completamente diferente (CM6 lines, padding em vez de margin). Delta LP vs RV e do proprio Obsidian. Nao e bug do plugin
- **`{{title}}` e `{{position}}` literal** — templates de teste usavam variaveis que nao existem no frontmatter. templateRenderer resolve so frontmatter da nota, nao propriedades do config do mirror. Comportamento correto — campo vazio e preenchido pelo usuario (ex: meta-bind)

## Integracao com outros plugins

| Plugin | Syntax no template | Status | Notas |
|--------|-------------------|--------|-------|
| Dataview inline | `` `= this.campo` `` | Validado (v25.1) | Reativo via post-processor |
| DataviewJS | ` ```dataviewjs dv.current()``` ` | Validado (v25.2) | Reativo via post-processor |
| Meta-bind | `INPUT[text:campo]` | Validado (v25.2) | Leitura/escrita no frontmatter, sobrevive digitacao rapida |
| Templater | `<% tp.* %>` | Nao aplicavel | One-shot: processa na criacao da nota, nao reativo |
| Core Templates | — | Nao aplicavel | Mesmo caso do Templater: insercao estatica |
| `{{var}}` (nativo) | `{{nomeDoCampo}}` | Funciona | Syntax propria do Mirror Notes |

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
- [x] Benchmark VN+QDA completo — posicoes, condicoes, engines mapeadas (v32, docs/benchmark-vn-vs-mn.md)
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
- [x] below-properties ≈ top — decisao: CM6 top, plano em `plan-below-properties-cm6.md` (v39)
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
