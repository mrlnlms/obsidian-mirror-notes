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

## Bug aberto: CM6 DOM sync remove widget (v25.1)

**Sintoma**: Widget do Mirror Notes desaparece ao digitar rapido em campos meta-bind que editam YAML. Nenhum log do plugin e emitido no momento do desaparecimento.

**Investigacao**:
1. Logs do StateField mostram que nenhum rebuild/recreate e disparado
2. `forceMirrorUpdateEffect` corretamente detecta "config unchanged, keeping widget alive"
3. Debounce e checks de frontmatter funcionam — o StateField nao destroi o widget
4. MutationObserver no DOM capturou o momento exato: o widget e removido do `.cm-content.cm-lineWrapping` pelo proprio CM6

**Causa raiz**: Quando meta-bind edita o YAML (document change), o CM6 re-renderiza a regiao do `.cm-content` como parte do DOM sync. O block widget (`Decoration.widget({ block: true })`) posicionado logo apos o frontmatter e removido do DOM durante esse sync. O CM6 mantem a decoration no state, mas nao chama `toDOM()` novamente para re-inserir o elemento.

**Hipoteses para fix** (nao testadas):
- ViewPlugin com `update()` que detecta widget ausente no DOM e re-insere
- MutationObserver no main.ts que re-dispara `setupEditor()` quando widget e removido
- Trocar `Decoration.widget` por abordagem DOM pura (como Virtual Content faz) — eliminaria o problema mas perderia vantagens do CM6

**Contexto**: Esse e o trade-off central da arquitetura CM6 vs DOM. O Virtual Content (referencia) nao tem esse problema porque injeta diretamente no DOM fora do CM6.

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

## Referencias

- **[Virtual Content](https://github.com/Signynt/virtual-content)** — Plugin Obsidian que renderiza conteudo markdown virtual (header, footer, sidebar) sem modificar os arquivos. Regras baseadas em pastas, tags, properties e queries Dataview. Logica AND/OR, matching recursivo, toggle por regra. Referencia direta pro Mirror Notes — resolve o mesmo problema (injecao visual de conteudo) com abordagem diferente (regras configuradas no settings vs templates no frontmatter).
