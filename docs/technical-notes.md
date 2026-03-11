# Mirror Notes Plugin — Technical Notes

Documento tecnico atualizado a cada versao. Estado atual do codigo, arquitetura, bugs, e o que mudou.

## Versao Atual: v25 — Fix hideProps (Era 4)

**Substitui Decoration.replace por CSS-based property hiding. HideFrontmatterWidget removido, decorations simplificadas.**

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

## Arquitetura (v25)

```
main.ts                          — MirrorUIPlugin (lifecycle, CM6 setup, hideProps)
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

### Fluxo principal

1. `MirrorUIPlugin.setupEditor()` registra `mirrorStateField` como extensao CM6
2. `mirrorState.ts` — StateField parseia frontmatter do documento e cruza com filtros (file, folder, props)
3. `mirrorDecorations.ts` — se match, cria Decoration.widget na posicao configurada (top/bottom)
4. `mirrorViewPlugin.ts` — ViewPlugin aplica as decorations
5. `mirrorWidget.ts` — WidgetType renderiza o template markdown com substituicao `{{var}}`
6. `main.ts` — `updateHidePropsForView()` adiciona/remove classe CSS pra esconder frontmatter

### Eventos registrados

- `editor-change` — re-setup do editor ao editar
- `file-open` — setup ao abrir arquivo (delay 25ms)
- `active-leaf-change` — setup ao trocar aba (delay 25ms)
- `metadataCache.changed` — force update se usuario inativo >1s (delay 500ms)
- `vault.modify` em `data.json` — re-update ao mudar settings (debounce 500ms)
- DOM: `keydown` + `mousedown` — tracking de ultima interacao do usuario

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

**Estado**: ViewPlugin recovery mantido como safety net (nao dispara mais com o fix, mas existe como fallback).

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
