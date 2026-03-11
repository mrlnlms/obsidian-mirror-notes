# Benchmark: Virtual Content vs Mirror Notes vs Qualia Coding

**Data**: 2026-03-11 | **Fase 1** — Levantamento completo

Tres plugins, tres abordagens de injecao de conteudo na anatomia de uma nota Obsidian:
- **Virtual Content (VN)** — DOM injection pura com regras condicionais
- **Mirror Notes (MN)** — CM6 widgets + code block processor com templates dinamicos
- **Qualia Coding (QDA)** — CM6 ViewPlugin multi-engine com margin panel e sidebar unificada

---

## 1. Arquitetura Geral

| Aspecto | Virtual Content (VN) | Mirror Notes (MN) | Qualia Coding (QDA) |
|---------|---------------------|--------------------|---------------------|
| **Paradigma** | Rules-based injection (condicoes → conteudo → posicao) | Template mirroring (1 template → N notas com variaveis) | Qualitative coding (marcar segmentos de texto/PDF/imagem com codigos) |
| **Tamanho** | 1 arquivo (main.ts, ~2300 linhas) | Modular (14 arquivos src/, settings.ts, main.ts) | Multi-engine modular (markdown, PDF, image, CSV, audio, video, analytics) |
| **Scope** | So markdown notes | So markdown notes | Markdown + PDF + Image + CSV + Audio + Video |
| **Versao** | Estavel (repo publico) | v30 (Era 5 — Cross-Note Reactivity) | v45 |

---

## 2. Rendering Engines

| Aspecto | VN | MN | QDA |
|---------|----|----|-----|
| **Abordagem core** | DOM injection direta (createElement + appendChild/insertBefore) | CM6 StateField + WidgetType (LP) + registerMarkdownCodeBlockProcessor (ambas views) | CM6 StateField + ViewPlugins (decorations, overlays, margin panel) |
| **Rendering** | `MarkdownRenderer.render()` com Component manual | `MarkdownRenderer.renderMarkdown()` via templateRenderer.ts | Sem markdown rendering — divs absolutas, SVG overlays, Fabric.js canvas |
| **Content source** | Texto direto OU arquivo .md | Sempre arquivo .md (template) com `{{variable}}` | Dados do modelo (markers com range/codes) |
| **Lifecycle** | Component manual (new → load → unload) | CM6 gerencia widget; code blocks usam MarkdownRenderChild | ViewPlugin.destroy() + engine cleanup functions |
| **Cache** | Nenhum (re-renderiza a cada mudanca) | Hash cache (simpleHash) pra CM6 widgets | rAF throttle + mutation suppression |
| **Reactivity** | `metadataCache.on('changed')` (opt-in) | `metadataCache.on('changed')` + SourceDependencyRegistry (cross-note) | Model.onChange() listeners + CM6 effects bidirecionais |

---

## 3. Posicoes DOM — Anatomia da Nota

### Mapa de posicoes

```
┌─────────────────────────────────────────┐
│  HEADER (VN: .mod-header.mod-ui)        │  ← VN: header normal
│  [above-properties]                      │  ← VN: renderAboveProperties
├─────────────────────────────────────────┤
│  PROPERTIES (.metadata-container)        │  ← MN: hideProps CSS hack
├─────────────────────────────────────────┤
│  [MN: top widget / VN: LP header]        │  ← MN: CM6 widget(top) / VN: insertBefore
│                                          │
│  EDITOR CONTENT (.cm-content)            │
│    [MN: inline ```mirror``` blocks]      │  ← MN: code block processor
│    [QDA: inline highlights/decorations]  │  ← QDA: CM6 StateField decorations
│    [QDA: drag handles SVG overlay]       │  ← QDA: ViewPlugin overlay
│                                          │
│  [MN: bottom widget]                     │  ← MN: CM6 widget(bottom)
│  [VN: LP footer]                         │  ← VN: appendChild(.cm-sizer)
├─────────────────────────────────────────┤
│  [above-backlinks]                       │  ← VN: renderAboveBacklinks
│  BACKLINKS (.embedded-backlinks)         │
├─────────────────────────────────────────┤
│  FOOTER (VN: .mod-footer)               │  ← VN: footer normal (Reading View)
└─────────────────────────────────────────┘

│← QDA MARGIN PANEL (no .cm-scroller)     │  ← QDA: div absoluto, bars + labels
│  VN SIDEBAR (ItemView)                  │  ← VN: painel lateral separado
│  QDA SIDEBAR (2x ItemView)              │  ← QDA: Explorer + Detail views
```

### Detalhamento por posicao

| Posicao | VN | MN | QDA | Seletor/API | Risco quebra |
|---------|----|----|-----|-------------|--------------|
| **Header (Reading)** | ✅ `.mod-header.mod-ui` | ❌ | ❌ | querySelector | Medio |
| **Header (Live Preview)** | ✅ insertBefore `.cm-contentContainer` | ✅ CM6 widget `side:0` | ❌ | VN: qS / MN: CM6 API | VN: alto / MN: baixo |
| **Above Properties** | ✅ insertBefore `.metadata-container` | ❌ | ❌ | querySelector | Alto (sem API) |
| **Inline (editor)** | ❌ | ✅ code block ```` ```mirror``` ```` | ✅ CM6 decorations (highlights) | MN: API oficial / QDA: CM6 | Baixo |
| **Inline overlays** | ❌ | ❌ | ✅ SVG drag handles no editor | CM6 ViewPlugin | Baixo |
| **Footer (Reading)** | ✅ `.mod-footer` | ❌ | ❌ | querySelector | Medio |
| **Footer (Live Preview)** | ✅ appendChild `.cm-sizer` | ✅ CM6 widget `side:1` | ❌ | VN: qS / MN: CM6 | VN: alto / MN: baixo |
| **Above Backlinks** | ✅ insertBefore `.embedded-backlinks` | ❌ | ❌ | querySelector | Alto (sem API) |
| **Margin Panel** | ❌ | ❌ | ✅ div absoluto em `scrollDOM` | CM6: `view.scrollDOM` | Baixo (CM6 API) |
| **Sidebar (tab)** | ✅ 1x ItemView | ❌ (Era 1 v6 testou) | ✅ 2x ItemView (Explorer + Detail) | `registerView()` API | Baixo (API oficial) |
| **Sidebar (separate tabs)** | ✅ N tabs dinamicos por rule | ❌ | ❌ | `registerView()` API | Baixo |
| **Popover** | ✅ MutationObserver global | ❌ | ❌ | qS + MutationObserver | Alto (fragil) |
| **Hover menu** | ❌ | ❌ | ✅ Tooltip popup (350ms delay) | CM6 ViewPlugin | Baixo |
| **Source Mode** | ✅ (opt-in) | ❌ | ✅ (CM6 funciona em ambos) | — | — |
| **Left/Right** | ❌ | ❌ (dropdown existe) | ❌ (margin panel e adjacente, nao left/right) | — | — |
| **PDF overlay** | ❌ | ❌ | ✅ highlights + shapes + margin bars por pagina | PDF.js DOM | Baixo |
| **Image canvas** | ❌ | ❌ | ✅ Fabric.js regions + labels | Custom ItemView | Baixo |

### APIs vs querySelector por posicao

| Posicao | API publica? | Alternativa estavel |
|---------|-------------|---------------------|
| Header (Reading) | `view.previewMode.containerEl` → qS | Semi-estavel (.mod-header) |
| Header (LP) | qS `.cm-contentContainer` | CM6 widget (top) mais estavel |
| Above Properties | **Nenhuma** | So querySelector |
| Footer (Reading) | `view.previewMode.containerEl` → qS | Semi-estavel (.mod-footer) |
| Footer (LP) | qS `.cm-sizer` | CM6 widget (bottom) mais estavel |
| Above Backlinks | **Nenhuma** | So querySelector |
| Sidebar | ✅ `registerView()` + `ItemView` | API oficial, estavel |
| Popover | **Nenhuma** | MutationObserver, fragil |
| Margin Panel | ✅ CM6 `view.scrollDOM` | API CM6, estavel |
| Inline decorations | ✅ CM6 StateField + DecorationSet | API CM6, estavel |
| Inline overlays | ✅ CM6 ViewPlugin | API CM6, estavel |

---

## 4. Condicionais (Matching Rules)

| Tipo | VN | MN | QDA | Notas |
|------|----|----|-----|-------|
| **Folder** | ✅ path + recursive + root + all-files | ✅ filterFolders (startsWith) | ❌ (nao tem regras — tudo e manual) | MN: sem recursive/root/all |
| **Filename** | ❌ | ✅ filterFiles (name match) | ❌ | — |
| **Tag** | ✅ tag + includeSubtags | ❌ | ❌ | — |
| **Property** | ✅ key + value + arrays/bool/numbers | ✅ filterProps (key === value, so string) | ❌ | MN falha com arrays |
| **Smart Property Links** | ✅ resolve `[[link]]` | ❌ | ❌ | — |
| **Multi (AND/OR)** | ✅ conditions[] + logic | ❌ | ❌ | — |
| **Negacao** | ✅ per-rule + per-condition | ❌ | ❌ | — |
| **Dataview** | ✅ query → file in results | ❌ | ❌ | — |
| **File type** | ❌ (so markdown) | ❌ (so markdown) | ✅ fileInterceptor por extensao | QDA: png/jpg/pdf/csv/etc |
| **Global (all files)** | ✅ (path="") | ✅ Global Mirror | ❌ | — |
| **Override logic** | ❌ | ✅ global ↔ custom priority | ❌ | — |
| **Manual selection** | ❌ | ❌ | ✅ (usuario seleciona texto e aplica codigo) | Paradigma diferente |

**Abordagens fundamentalmente diferentes:**
- VN: "regras automaticas que injetam conteudo em notas que matcham condicoes"
- MN: "mirrors que aplicam templates a grupos de notas"
- QDA: "usuario marca segmentos manualmente — sem condicoes automaticas"

---

## 5. Content Model

| Aspecto | VN | MN | QDA |
|---------|----|----|-----|
| **Definicao** | Texto direto OU arquivo .md | Sempre arquivo .md (template) | Segmentos marcados pelo usuario (nao conteudo injetado) |
| **Variaveis** | ❌ | ✅ `{{variable}}` → frontmatter | ❌ |
| **Cross-note** | ❌ | ✅ code blocks com `source:` | ✅ sidebar mostra markers de qualquer arquivo |
| **Multiple rules/posicao** | ✅ agrupa (join `\n\n`) | ❌ 1 mirror por nota | ✅ N markers por nota (cada com N codigos) |
| **Regras por nota** | Ilimitadas | 1 widget + N code blocks | Ilimitados markers |
| **Inline content** | ✅ (texto nos settings) | ❌ (sempre arquivo) | N/A |
| **LP/Reading separados** | Mesma rule, injecao diferente | Templates separados por view mode | CM6 funciona em ambos |
| **Bidirectional sync** | ❌ | ❌ | ✅ hover: editor ↔ margin panel ↔ sidebar |

---

## 6. Settings UX

| Aspecto | VN | MN | QDA |
|---------|----|----|-----|
| **Modelo** | Array de Rules flat | Global + CustomMirrors (cards) | Settings simples (cor, opacidade, toggles) + CodeRegistry |
| **Rule builder** | Dropdown tipo → campos condicionais | Cards com filtros | N/A (codigos sao criados ad-hoc) |
| **Content editor** | Toggle text/file + textarea | File picker (template) | N/A |
| **Position selector** | Dropdown + toggles | Dropdown (top/bottom/left/right) | N/A (posicoes fixas: inline + margin + sidebar) |
| **Reorder** | ❌ | ✅ Move up/down + search | ❌ |
| **Collapse** | ✅ Per-rule | ✅ Per-card | N/A |
| **Validation** | ❌ | ✅ Inline path warning | N/A |
| **Auto-update paths** | ❌ | ✅ Rename-aware (v28) | ✅ vault.on('rename') migra fileIds |
| **Debounced save** | ✅ debounce(1000) | ❌ (imediato) | ✅ debounce(2000) pra posicoes |

---

## 7. Lifecycle e Cleanup

| Aspecto | VN | MN | QDA |
|---------|----|----|-----|
| **View detection** | workspace events (file-open, layout-change, active-leaf-change) | CM6 StateField (automatico) + metadataCache | fileInterceptor (active-leaf-change) + CM6 |
| **Mode detection** | viewState.mode check | CM6 (LP) + code block (ambas) | CM6 (funciona em LP e Source) |
| **DOM cleanup** | querySelectorAll → remove + component.unload | CM6 lifecycle automatico + MarkdownRenderChild | ViewPlugin.destroy + engine cleanup fns |
| **Observers** | MutationObserver pra Reading View + popover | Nenhum (CM6 + code block cuidam) | ResizeObserver + MutationObserver + scroll listener |
| **Content refresh** | Remove + re-inject completo | Hash cache → skip se unchanged | rAF throttle + mutation suppression |
| **Unload** | Itera views + remove DOM + disconnect | CM6 auto + sourceDeps.clear() | Engine cleanup fns em ordem reversa |
| **Hover sync** | ❌ | ❌ | ✅ hoverBridge: editor ↔ margin ↔ sidebar (bidirecional) |

---

## 8. Patterns Unicos do QDA Relevantes pro MN

Patterns do QDA que podem informar decisoes de implementacao no MN:

### 8.1 Margin Panel (ViewPlugin no scrollDOM)
- `ViewPlugin.fromClass()` — nao WidgetType, nao StateField
- Cria div no `view.scrollDOM` como primeiro filho
- `position: absolute; top: 0; min-height: 100%`
- Empurra conteudo via `contentDOM.style.paddingLeft` ou `gutters.style.marginLeft`
- Detecta espaco natural (readable line length) e expande se tiver
- ResizeObserver + MutationObserver + scroll listener + rAF
- `view.coordsAtPos()` pra precisao visual-line
- **Relevancia MN**: Pattern diretamente aplicavel se MN implementar left/right positions

### 8.2 Sidebar Unificada (2x ItemView)
- **Explorer View**: lista todos os markers de todos os engines
- **Detail View**: foco em um codigo — mostra todos os markers daquele codigo
- Type-aware navigation: clique no marker → abre arquivo e navega
- **Relevancia MN**: MN poderia ter sidebar mostrando todos os mirrors ativos + preview

### 8.3 Bidirectional Hover Bridge
- hoverBridge.ts: CM6 effect → sidebar update E sidebar hover → CM6 effect
- `suppressMutationUntil` evita loops (hover causa DOM rebuild que causa hover)
- **Relevancia MN**: Util se MN implementar margin panel ou sidebar com preview interativo

### 8.4 File Interceptor
- Centraliza deteccao de tipo de arquivo
- Extensoes registradas por engine
- `shouldIntercept()` guard (ex: setting toggle)
- **Relevancia MN**: Pattern limpo pra routing se MN expandir alem de markdown

### 8.5 Engine Registration Pattern
- Cada engine retorna cleanup function no registro
- `onunload()` chama cleanups em ordem reversa
- **Relevancia MN**: Bom pattern se MN modularizar posicoes como "engines"

---

## 9. Experimentos DOM Era 1 (MN)

| Commit | Versao | Tecnica | Resultado | Relevancia hoje |
|--------|--------|---------|-----------|-----------------|
| `1ceb033` | v2 | `insertBefore(block, header.nextSibling)` | Funciona mas fragil (qS) | Descartada — CM6 widget resolve |
| `610bd36` | v4 | `containerEl.prepend()` + `MarkdownRenderer.render()` | Toolbar acima de tudo, sem lifecycle | Pattern similar ao VN |
| `a0a9dfc` | v5 | `querySelector(".cm-scroller").append()` | Funciona mas CM6 pode recriar scroller | QDA faz isso com ViewPlugin (mais estavel) |
| `96974bd` | v6 | `ItemView` (MirrorUIView) | Sidebar funcional | VN e QDA usam — viavel pra MN |

---

## 10. Gaps e Decisoes Pendentes

### Gaps do MN vs VN + QDA

| # | Gap | Quem tem | Impacto | Dificuldade | API? |
|---|-----|----------|---------|-------------|------|
| G1 | **Reading View rendering** (widget injection) | VN | Alto | Medio | Parcial |
| G2 | **Above Properties** | VN | Medio | Baixo | ❌ |
| G3 | **Above Backlinks** | VN | Medio | Baixo | ❌ |
| G4 | **Sidebar tab** | VN, QDA | Baixo | Baixo | ✅ |
| G5 | **Popover support** | VN | Baixo | Alto | ❌ |
| G6 | **Source Mode** | VN, QDA | Baixo | Medio | — |
| G7 | **Tag matching** | VN | Alto | Baixo | ✅ |
| G8 | **Multi conditions AND/OR** | VN | Medio | Medio | — |
| G9 | **Negacao** | VN | Baixo | Baixo | — |
| G10 | **Dataview integration** | VN | Baixo | Medio | — |
| G11 | **Multiple rules/posicao** | VN | Medio | Medio | — |
| G12 | **Content inline** | VN | Baixo | Baixo | — |
| G13 | **Property match robusto** (arrays, bool, numbers) | VN | Alto | Baixo | — |
| G14 | **Smart Property Links** | VN | Baixo | Medio | — |
| G15 | **Left/Right positions** (margin panel) | QDA (margin) | Medio | Alto | ✅ CM6 |
| G16 | **Bidirectional hover sync** | QDA | Baixo | Alto | CM6 |
| G17 | **Inline decorations** (highlights no texto) | QDA | Baixo | Medio | ✅ CM6 |

### Vantagens exclusivas do MN (nenhum dos outros tem)

| # | Vantagem | Impacto |
|---|----------|---------|
| V1 | `{{variable}}` substituicao de frontmatter | Alto — diferencial core |
| V2 | Cross-note reactivity (SourceDependencyRegistry) | Alto |
| V3 | Template reuse (1 template → N notas) | Alto |
| V4 | Code block processor inline (ambas views) | Alto |
| V5 | Hash cache (skip re-render se unchanged) | Medio |
| V6 | Rename-aware settings (auto-update paths) | Medio |
| V7 | CM6 lifecycle sem DOM hacks em LP | Medio |
| V8 | Mirror index O(1) file lookup | Baixo |
| V9 | Inline path validation | Baixo |

---

## 11. Decisoes pro Usuario (Fase 2)

### Posicoes DOM
- [ ] **Above Properties** — implementar? (qS '.metadata-container', sem API)
- [ ] **Above Backlinks** — implementar? (qS '.embedded-backlinks', sem API)
- [ ] **Sidebar tab** — voltar a implementar? (API oficial, VN e QDA usam)
- [ ] **Popover** — implementar? (fragil, MutationObserver global)
- [ ] **Left/Right** — margin panel QDA-style? CSS flexbox? Ou nao implementar?
- [ ] **Source Mode** — suportar?
- [ ] **Reading View widget injection** — DOM injection como VN pra header/footer?

### Condicionais
- [ ] **Tag matching** — adicionar? (getAllTags, simples)
- [ ] **Multi conditions AND/OR** — adicionar?
- [ ] **Negacao** — adicionar?
- [ ] **Dataview** — adicionar? (depende de plugin externo)
- [ ] **Property fix** — corrigir arrays/booleans/numbers no filterProps?

### Content Model
- [ ] **Multiple rules/posicao** — permitir N mirrors na mesma nota?
- [ ] **Content inline** — texto direto sem criar arquivo template?
- [ ] **Modelo de settings** — manter "mirrors com filtros" ou migrar pra "rules com conditions" (VN-style)?

### Patterns do QDA pra considerar
- [ ] **Margin panel** — adotar ViewPlugin no scrollDOM pra left/right?
- [ ] **Sidebar unificada** — ter sidebar com lista de mirrors ativos + preview?
- [ ] **Hover bridge bidirecional** — util se tiver margin/sidebar?

### Prioridades
- [ ] O que entra na v32?
- [ ] O que fica pra depois?

---

## Apendice A: Seletores DOM do VN

```typescript
// Live Preview
'.cm-editor .cm-content'                              // editor content area
'.markdown-source-view.mod-cm6 .cm-contentContainer'  // content container parent
'.cm-contentContainer'                                 // content container
'.cm-sizer'                                            // sizer (footer injection)

// Reading View
'.mod-header.mod-ui'                                   // header area
'.mod-footer'                                          // footer area

// Shared
'.embedded-backlinks'                                  // backlinks section
'.metadata-container'                                  // properties section

// Popover
'.popover.hover-popover'                               // popover container
'.markdown-embed'                                      // embedded markdown in popover
'.inline-title'                                        // note title in popover
```

## Apendice B: Arquitetura QDA (resumo)

```
qualia-coding/
  src/
    main.ts                    — Plugin entry, engine registration
    core/
      dataManager.ts           — Persistencia unificada
      codeDefinitionRegistry.ts — Codigos compartilhados (nome + cor)
      fileInterceptor.ts       — Routing por extensao
      types.ts                 — BaseMarker, SidebarModelInterface
      unifiedExplorerView.ts   — Sidebar: lista markers
      unifiedDetailView.ts     — Sidebar: detalhe por codigo
    markdown/
      models/codeMarkerModel.ts — CRUD markers + lookup
      cm6/
        markerStateField.ts    — CM6 StateField (decorations)
        markerViewPlugin.ts    — Drag handles (SVG overlay)
        marginPanelExtension.ts — Margin panel (bars + labels)
        hoverMenuExtension.ts  — Hover tooltip
        hoverBridge.ts         — Bidirectional hover sync
      menu/menuController.ts   — Selection menu + code assignment
    pdf/                       — PDF.js highlight injection
    image/                     — Fabric.js canvas regions
    csv/, audio/, video/       — Engines adicionais
    analytics/                 — Agregacao + visualizacao
```
