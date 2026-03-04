---
name: mirror-notes-learnings
description: >
  Technical learnings captured from reconstructing the Mirror Notes plugin
  history commit by commit. Obsidian API patterns, failures, evolution.
---

# Mirror Notes — Technical Learnings

Documento vivo. Atualizado a cada commit observado durante o porting do plugin.

---

## Commit 1: Skeleton (v1 — 2024-06-06 19:27)
**SHA:** `2cb089b` | **Build:** success

### O que fez
- Plugin scaffold basico: `MyPlugin extends Plugin`
- `new Notice("Opening Mirror Preview Plugin!")` no `onload()`
- Metodos `onFileOpen` e `insertCustomBlock` existem mas estao desconectados (event listeners comentados)

### Padroes Obsidian API
- **Notice** — forma mais simples de feedback ao usuario. `new Notice("msg")` funciona direto no onload.
- **metadataCache.getFileCache(file)** — ja aparece no stub, lendo `frontmatter.type`. Mostra que desde o inicio o dev sabia que o metadataCache era o caminho pra ler YAML.
- **MarkdownView** — import de `obsidian`, usado pra type-check do view. Padrao correto.
- **containerEl.querySelector('.markdown-preview-view')** — tentativa de encontrar o container de conteudo. Funciona mas e fragil (depende de classes internas do Obsidian).

### Erros / Anti-patterns
- **`registerEvent` no `onunload()`** — Errado. `registerEvent` registra um event listener para cleanup automatico. Usar dentro de `onunload` nao faz sentido — o plugin ja esta descarregando. O correto seria apenas `new Notice(...)` direto.
- **Event listeners comentados** — `active-leaf-change` estava no caminho certo mas foi comentado. O dev estava experimentando.
- **Metodos async desnecessarios** — `onFileOpen` e `insertCustomBlock` sao `async` mas nao usam `await`. Nao causa erro mas e ruido.

### Aprendizado
> O obsidian-sample-plugin template (scaffold) da um bom ponto de partida, mas os metodos stub (onFileOpen, insertCustomBlock) ficam "mortos" se voce nao conecta os event listeners. O Obsidian nao chama nada automaticamente alem de `onload()` e `onunload()`.

---

## Commit 2: Ribbon Button via DOM (v2 — 2024-06-06 19:40)
**SHA:** `b565f6c` | **Build:** success

### O que fez
- Tentativa de adicionar botao customizado no ribbon esquerdo via DOM direto
- `addToolbar()` usa `document.querySelector('.workspace-ribbon-left')` pra encontrar o ribbon
- `addIcon()` cria um `<div>` manualmente com tooltip hover
- `insertCustomBlock()` injeta "MARLON BRANDON" depois do primeiro `<h1>`
- `onActiveLeafChange` limpa o ribbon (innerHTML = '') e re-adiciona o icone

### Padroes Obsidian API
- **`this.app.workspace.on('active-leaf-change', ...)`** — evento correto pra detectar troca de nota. Usado corretamente com `this.registerEvent()` para auto-cleanup.
- **`this.app.workspace.activeLeaf`** — acesso ao leaf ativo. Funciona mas e deprecated em versoes mais novas do Obsidian (preferir `this.app.workspace.getActiveViewOfType()`).

### Erros / Anti-patterns
- **querySelector('.workspace-ribbon-left') FALHA** — essa classe nao existe no DOM do Obsidian. O selector correto seria mais complexo, mas o approach inteiro esta errado. O Obsidian tem `this.addRibbonIcon()` como API oficial pra adicionar icones ao ribbon.
- **DOM manipulation direta pro ribbon** — anti-pattern grave. O ribbon e gerenciado pelo Obsidian; manipular seu DOM diretamente causa conflitos e o botao simplesmente nao aparece.
- **innerHTML = '' no onActiveLeafChange** — DESTRUTIVO. Limpa TODO o conteudo do ribbon a cada troca de nota. Se o selector funcionasse, destruiria icones de outros plugins.
- **Tooltip manual com mouseenter/mouseleave** — reinventando a roda. O Obsidian tem `setTooltip()` e o `addRibbonIcon()` ja aceita tooltip como parametro.
- **hot-reload e BRAT commitados no demo vault** — plugins de dev foram incluidos no commit. Corrigido no commit 3 com .gitignore.

### Aprendizado
> **NUNCA manipular o ribbon via DOM direto.** Use `this.addRibbonIcon(iconId, tooltip, callback)`. E a API oficial, funciona em todos os temas, e limpa automaticamente no unload. Qualquer querySelector pro ribbon vai falhar silenciosamente porque a estrutura DOM e interna e muda entre versoes.

> **Plugins de dev (hot-reload, BRAT) nao devem ser commitados.** Adicionar ao .gitignore ANTES de commitar.

---

## Commit 3: YAML Frontmatter Detection (v3 — 2024-06-06 20:24)
**SHA:** `ab4d53e` | **Build:** success

### O que fez
- Renomeou classe pra `MyCustomPlugin`
- Escuta evento `file-open` (nao mais `active-leaf-change`)
- Le YAML frontmatter via `metadataCache.getFileCache(file)?.frontmatter`
- Se `type === 'projects'` (plural), renderiza barra amarela com botao
- Cleanup da barra quando abre nota sem match
- Console.log com contexto: `[Mirror Notes] file-open: <name> | type: <type>`

### Padroes Obsidian API
- **`workspace.on('file-open', async (file) => {...})`** — evento que dispara quando uma nota e aberta. Recebe o `TFile` diretamente (mais simples que `active-leaf-change` que recebe um `WorkspaceLeaf`). Boa escolha pra este caso de uso.
- **`metadataCache.getFileCache(file)?.frontmatter`** — jeito CORRETO de ler frontmatter no Obsidian. Nao precisa parsear YAML manualmente — o metadataCache ja faz isso. Optional chaining (`?.`) protege contra null.
- **`workspace.getActiveViewOfType(MarkdownView)`** — usado corretamente pra obter o containerEl. Mais seguro que `activeLeaf.view as MarkdownView`.
- **`containerEl.appendChild()`** — adiciona a barra ao final do container da view. Funciona mas posiciona no fundo da view, nao inline com o conteudo.

### Erros / Anti-patterns
- **`type === 'projects'` (plural)** — typo que sera corrigido depois. O frontmatter real usa `type: project` (singular). Mostra a importancia de testar com notas reais.
- **Elemento adicionado ao containerEl, nao ao content area** — a barra amarela aparece no fundo do container inteiro da view, nao junto ao conteudo da nota. Para injecao inline, seria necessario usar o `.markdown-preview-section` ou um approach com MarkdownPostProcessor / CM6 extension.
- **Classe CSS 'cMenuModalBar'** — nome emprestado de outro plugin (cMenu). Nao e um problema tecnico, mas indica que o dev estava se inspirando em outro plugin. Sera renomeado eventualmente.

### Evolucao importante v2 → v3
- **Abandonou DOM manipulation do ribbon** — voltou ao core: detectar frontmatter e reagir.
- **Trocou `active-leaf-change` por `file-open`** — mais direto pro caso de uso (reacao a abertura de nota, nao a qualquer mudanca de leaf).
- **Adicionou cleanup** — `cleanupCustomElement()` remove a barra quando a nota nao tem match. Mostra maturidade: o dev percebeu que sem cleanup, barras ficam fantasmas ao navegar entre notas.
- **Adicionou console.log com contexto** — pattern util pra debug: logar o nome do arquivo e o valor do frontmatter. Ajuda a entender por que o plugin nao esta reagindo.
- **Corrigiu .gitignore** — adicionou `demo/.obsidian/plugins/hot-reload/` e `demo/.obsidian/plugins/obsidian42-brat/` pra nao commitar plugins de dev.

### Aprendizado
> **`file-open` e o evento mais direto pra reagir a abertura de nota.** Recebe `TFile` diretamente, sem precisar extrair do leaf. Use `active-leaf-change` apenas quando precisar do WorkspaceLeaf (ex: detectar split views, sidebar panels).

> **metadataCache e o unico jeito correto de ler frontmatter.** Nunca leia o conteudo da nota e parseie YAML manualmente. O cache e atualizado automaticamente pelo Obsidian e disponibiliza o frontmatter como objeto JS.

> **Sempre implemente cleanup.** Se voce adiciona um elemento DOM no `renderX()`, crie um `cleanupX()` que remove. Registre-o no `onunload()` ou chame-o quando o contexto muda. Elementos fantasma sao um bug comum em plugins Obsidian.

---

## Commit 4: ProjectToolbarPlugin + MarkdownRenderer (v4 — 2024-06-06 22:33)
**SHA:** `6411e8e` | **Build:** success

### O que fez
- Refactor grande: classe renomeada pra `ProjectToolbarPlugin`
- Usa `MarkdownRenderer.render()` pra injetar markdown renderizado numa div toolbar
- Corrigiu `type === "project"` (singular — v3 usava plural `"projects"`)
- Toolbar posicionada com `containerEl.prepend()` (topo da nota, nao fundo)
- Escuta 3 eventos: `file-open`, `layout-change`, `active-leaf-change`
- `removeToolbar()` via `document.querySelector(".project-toolbar").remove()`
- Conteudo hardcoded: `"marlon\n leticia \n livia"` — path do template comentado

### Padroes Obsidian API
- **`MarkdownRenderer.render(app, markdown, containerEl, sourcePath, component)`** — API oficial pra renderizar markdown em qualquer elemento DOM. O 4o parametro (`sourcePath`) e o caminho do arquivo fonte pra resolver links relativos. O 5o (`component`) e o plugin (implements `Component`) — garante lifecycle cleanup dos elementos renderizados. Usado corretamente aqui.
- **`containerEl.prepend(toolbar)`** — melhoria sobre v3 que usava `appendChild()`. Agora a toolbar aparece no TOPO da nota, nao no fundo.
- **`workspace.on('layout-change', ...)`** — novo evento adicionado. Dispara quando o layout muda (redimensionar panels, fechar/abrir sidebars). Util como "catch-all" pra re-renderizar quando a view e recriada.
- **Tres eventos combinados** — `file-open` + `layout-change` + `active-leaf-change` cobre praticamente todos os cenarios de navegacao. Pattern robusto mas pode causar multiplas execucoes redundantes (ver erros abaixo).

### Erros / Anti-patterns
- **`document.querySelector(".project-toolbar")` pra cleanup** — busca global no DOM. Se houver split view com 2 notas project, remove a toolbar da nota errada. O correto seria buscar dentro do `containerEl` especifico: `view.containerEl.querySelector(".project-toolbar")`.
- **`activeDocument.createElement("div")` seguido de `document.body.appendChild(toolbar)`** — cria a div, appenda ao body, depois remove e prependa no containerEl. Passo intermediario desnecessario e potencialmente visivel como flash. Deveria criar e inserir diretamente no containerEl.
- **Sem debounce nos 3 eventos** — `file-open`, `layout-change` e `active-leaf-change` podem disparar quase simultaneamente. Sem debounce, `addToolbar` roda 2-3 vezes seguidas: remove + re-cria toolbar cada vez. Causa flicker. Solucao: debounce ou flag `isRendering`.
- **`this.app.workspace.activeLeaf` ainda usado** — deprecated. E redundante aqui porque o leaf ja vem como parametro do evento. Mas `file-open` recebe `TFile` (nao leaf), entao a assinatura `addToolbar(leaf: WorkspaceLeaf)` so funciona com `active-leaf-change`. Os outros eventos passam argumentos diferentes.
- **Assinatura do handler inconsistente** — `addToolbar(leaf: WorkspaceLeaf)` e bound a 3 eventos com assinaturas diferentes: `file-open` passa `TFile|null`, `layout-change` nao passa nada, `active-leaf-change` passa `WorkspaceLeaf|null`. O guard `if (!leaf || !leaf.view)` salva dos crashes, mas `file-open` e `layout-change` efetivamente nunca executam o corpo (leaf sera `TFile` ou `undefined`, nao tera `.view`).
- **Codigo comentado abundante** — `querySelector('.cm-contentContainer')`, `vault.adapter.read("templates/...")`, `querySelector('.mod-header')` — indicam experimentacao ativa. O dev estava tentando varios pontos de injecao.

### Evolucao importante v3 → v4
- **MarkdownRenderer.render()** — salto qualitativo. Em vez de DOM manual (createElement, innerHTML), agora usa a API do Obsidian pra renderizar markdown. Isso significa que links, formatting, embeds, etc funcionam nativamente.
- **`prepend` em vez de `appendChild`** — toolbar no topo. Melhor UX.
- **Correcao do typo `projects` → `project`** — agora matches com notas reais.
- **Classe CSS propria** — `project-toolbar` em vez de `cMenuModalBar` (emprestada do cMenu). Identidade propria do plugin.
- **Template path como sourcePath** — `"templates/ui-live_preview-mode.md"` como 4o parametro do MarkdownRenderer. Indica que o plano e carregar conteudo de um template, nao hardcoded. O path ja existe no vault.

### Aprendizado
> **`MarkdownRenderer.render()` e a forma correta de injetar conteudo markdown em qualquer lugar do DOM.** Aceita markdown string, renderiza como HTML com todas as features do Obsidian (links, formatting, embeds), e respeita o lifecycle do component (cleanup automatico). Sempre passe o `plugin` como ultimo argumento.

> **Cuidado com multiplos eventos fazendo a mesma coisa.** `file-open` + `layout-change` + `active-leaf-change` cobrem todos os cenarios, mas sem debounce a callback roda 2-3x por navegacao. Considere `debounce()` do Obsidian ou uma flag de controle.

> **Busque elementos sempre dentro do containerEl, nunca via `document.querySelector()` global.** Em split view, querySelector global pega o primeiro match, que pode ser de outra panel.

> **Assinatura de eventos importa.** Cada evento do workspace passa argumentos diferentes. Nao reutilize o mesmo handler pra eventos com assinaturas incompativeis sem adaptar.

---

## Commit 5: cm-scroller Targeting (v5 — 2024-06-07 11:10)
**SHA:** `4c8d978` | **Build:** success

### O que fez
- Experimento: tenta injetar toolbar dentro de `.cm-scroller` (container de scroll do CodeMirror 6)
- `document.body.querySelector(".cm-scroller")` encontra o elemento (Notice "AHAHAAHA" confirma)
- Mas logo em seguida `containerEl.prepend(toolbar)` move o mesmo elemento pra fora do cm-scroller — ultima operacao vence
- Resultado visual identico ao v4
- Symlinks do demo vault foram substituidos por copias reais dos arquivos (main.js, manifest.json, styles.css)

### Padroes Obsidian API / CodeMirror 6
- **`.cm-scroller`** — e o container de scroll do CodeMirror 6 no editor. Existe no DOM quando o editor esta em modo source/live-preview. O dev encontrou o elemento, mostrando que ja estava investigando a estrutura CM6.
- **Hierarquia CM6 no Obsidian:** `containerEl > .cm-editor > .cm-scroller > .cm-content`. Injetar dentro de `.cm-scroller` posiciona o elemento junto ao conteudo editavel, mas fora do fluxo normal do CM6 — pode causar problemas de layout e scroll.

### Erros / Anti-patterns
- **Double injection (append + prepend)** — appenda no cm-scroller, depois prependa no containerEl. Como o DOM move o elemento (nao copia), o segundo `prepend` remove do cm-scroller. Codigo morto — o append nao tem efeito visivel.
- **`document.body.querySelector(".cm-scroller")` global** — mesmo problema do v4: em split view, pega o cm-scroller da primeira panel, nao necessariamente a ativa. Deveria buscar dentro do `view.containerEl`.
- **Symlinks perdidos** — o demo vault tinha symlinks pra main.js/manifest.json/styles.css (apontando pro root do repo). Neste commit foram substituidos por copias reais. Perde a vantagem do hot-reload automatico via symlinks.

### CSS: Primeiro styles.css substancial
O commit inclui 144 linhas de CSS com:
- **`.project-toolbar`** — grid layout, border-radius, box-shadow, z-index via `var(--layer-status-bar)`. Usa CSS variable do Obsidian (bom — respeita o tema).
- **`.elemento-geral`, `.campo`, `.form-content`, `.botoes`** — classes pra settings UI. CSS de formulario com flexbox. Indica que o dev ja estava pensando na Settings Tab.
- **Muito CSS comentado** — ~50% do arquivo e CSS comentado de experimentos anteriores. Nao prejudica mas polui o arquivo.
- **`position: inherit` sobrescrevendo `position: absolute`** — as duas declaracoes estao no mesmo bloco `.project-toolbar`. A segunda (`inherit`) vence, entao o `absolute` e morto.

### Aprendizado
> **Injetar no `.cm-scroller` e um caminho valido mas perigoso.** O CM6 gerencia esse container internamente. Adicionar elementos la dentro pode quebrar scroll, selecao de texto, e recalculo de layout. Para injecoes inline no editor, a abordagem correta e usar CM6 StateField + Decoration (widget/block). Para injecoes fora do editor (toolbar, header), `containerEl.prepend()` e mais seguro.

> **Symlinks no demo vault sao superiores a copias** pra desenvolvimento. Com symlinks, `npm run dev` + hot-reload atualiza automaticamente. Copias exigem rebuild + re-copy manual.

> **Use CSS variables do Obsidian** (`--layer-status-bar`, `--background-modifier-border`, `--color-base-20`) pra garantir compatibilidade com temas. O dev ja fazia isso desde o primeiro CSS.

---

## Commit 6: MirrorUIPlugin Nasce (v6 — 2024-06-07 13:44)
**SHA:** `28c7dd7` | **Build:** success

### O que fez
- **Marco: classe definitiva `MirrorUIPlugin`** — nome que vai persistir
- Sistema de settings: `loadSettings()` / `saveSettings()` com `Object.assign({}, DEFAULTS, await this.loadData())`
- Sidebar view custom: `MirrorUIView extends ItemView` (placeholder: "Emergency contact" + botao Ghostbusters)
- 2 ribbon icons via API oficial: `addRibbonIcon("eye", ...)` e `addRibbonIcon("file", ...)`
- 2 commands: "Decorate Titles" (regex nos headings) e "Peek into the dark" (checkCallback com hora)
- Toolbar agora tenta injetar no `.metadata-container` (novo target)
- Le template via `vault.adapter.read("templates/ui-live_preview-mode.md")` — mas render comentado
- Novos arquivos: `src/view.ts`, `src/settings.ts`

### Padroes Obsidian API — Novos neste commit

**Settings pattern (correto):**
```ts
interface MirrorUIPluginSettings { myPluginName: string; }
const DEFAULTS: Partial<MirrorUIPluginSettings> = { myPluginName: "..." };

async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
}
async saveSettings() { this.saveData(this.settings); }
```
- `Object.assign({}, DEFAULTS, await this.loadData())` — pattern canonico do Obsidian. Cria objeto novo, aplica defaults, sobrescreve com dados salvos. Nao muta DEFAULTS.

**Custom View (ItemView):**
```ts
export class MirrorUIView extends ItemView {
    getViewType() { return MIRROR_UI_VIEW_TYPE; }
    getDisplayText() { return "Mirror UI Title"; }
    async onOpen() { this.contentEl.createEl("h1", {text: "..."}); }
}
```
- `ItemView` e a base pra sidebar views. Requer `getViewType()` e `getDisplayText()`.
- `this.registerView(VIEW_TYPE, (leaf) => new View(leaf))` no `onload()` — registra a view factory.
- `this.app.workspace.getRightLeaf(false)` + `leaf.setViewState({type: VIEW_TYPE})` — abre na sidebar direita.
- `detachLeavesOfType(VIEW_TYPE)` antes de abrir — evita multiplas instancias.

**Ribbon Icons (finalmente correto!):**
```ts
this.addRibbonIcon("eye", "tooltip", () => { ... });
this.addRibbonIcon("file", "tooltip", () => { ... });
```
- API oficial! Comparar com v2 que tentava DOM direto e falhava. Agora funciona, limpa no unload, respeita temas.

**Commands:**
- `addCommand({ id, name, editorCallback })` — comando que so aparece com editor ativo. Recebe `editor` pra manipular texto.
- `addCommand({ id, name, checkCallback })` — comando condicional. Se `checking=true`, retorna boolean (deve aparecer?). Se `checking=false`, executa a acao.

**Template reading:**
- `this.app.vault.adapter.read("path")` — le arquivo raw (string). Funciona pra qualquer arquivo, inclusive fora do vault.
- `this.app.vault.getAbstractFileByPath("path")` — retorna `TAbstractFile | null`. Precisa checar `instanceof TFile` antes de usar.
- `this.app.vault.read(file)` — le conteudo de TFile (retorna Promise<string>).

**`.metadata-container` como target:**
- Novo ponto de injecao. `.metadata-container` e o container das properties/frontmatter no topo da nota. Injetar la coloca a toolbar logo abaixo das properties — posicao mais natural que `containerEl.prepend()`.

### Erros / Anti-patterns
- **Codigo comentado massivo** — ~40 linhas de codigo comentado no `addToolbar()`. O dev esta testando multiplos pontos de injecao simultaneamente sem limpar os anteriores. Dificil entender o que esta ativo.
- **Template lido mas nunca renderizado** — `vault.adapter.read()` e chamado, resultado guardado em `conteudo`, mas o `MarkdownRenderer.render()` esta comentado. O template e um dead end neste commit.
- **`toolbar.createEl("h1", {text: "MARLON"})` nunca visivel** — cria um H1 no toolbar div, mas a toolbar nunca e adicionada ao DOM (o `containerEl.prepend` foi removido, e o `corpodocs.prepend` esta comentado).
- **Settings tab comentada** — `this.addSettingTab(new mirrorSeetingsTab(...))` esta comentado. A classe existe mas nao e usada.
- **view.ts e um placeholder** — "Emergency contact" + "Ghostbusters" sao claramente placeholders pra testar que a sidebar view funciona.
- **Typo: `DEFALT_SETTINGS`** — falta um "U". Nao causa erro mas mostra prototipagem rapida.
- **`mirrorSeetingsTab` com "ee"** — mais typos de prototipagem.

### Evolucao importante v5 → v6
- **Salto arquitetural grande.** De um unico arquivo com `ProjectToolbarPlugin` pra 3 arquivos (`main.ts`, `view.ts`, `settings.ts`) com classe definitiva `MirrorUIPlugin`.
- **Ribbon icons via API oficial** — aprendeu com o erro do v2 (DOM direto). Agora usa `addRibbonIcon()`.
- **Settings pattern canonico** — `Object.assign + loadData()`. Framework correto pro futuro.
- **Custom view** — primeira sidebar. Placeholder mas funcional.
- **Commands** — demonstra `editorCallback` e `checkCallback`. Dois patterns diferentes de comando.
- **Novo target `.metadata-container`** — exploracao continua de onde colocar a toolbar.

### Aprendizado
> **`Object.assign({}, DEFAULTS, await this.loadData())` e O pattern de settings do Obsidian.** Cria objeto limpo, aplica defaults, sobrescreve com dados do usuario. Simples, robusto, usado por 90% dos plugins.

> **`ItemView` e a base pra sidebar views.** Minimo: `getViewType()`, `getDisplayText()`, `onOpen()`. Registrar com `registerView()` no onload. Abrir com `getRightLeaf(false)` + `setViewState()`.

> **`addRibbonIcon(iconId, tooltip, callback)` e o unico jeito correto de adicionar icones ao ribbon.** O dev levou de v2 (falha total) a v6 (API correta) pra chegar aqui. Nunca manipule o ribbon DOM diretamente.

> **`.metadata-container` e um ponto de injecao valido** pra conteudo que deve aparecer abaixo das properties. Mas e uma classe interna — pode mudar entre versoes do Obsidian.

---

## Commit 7: Settings Tab Habilitado + Template Rendering (v7 — 2024-06-07 15:58)
**SHA:** `5f8607b` | **Build:** success

### O que fez
- Descomentou `this.addSettingTab(new mirrorSeetingsTab(...))` — settings tab agora visivel
- Pipeline completo: `vault.adapter.read(path)` → `MarkdownRenderer.render()` → toolbar visivel
- Template `templates/ui-live_preview-mode.md` renderizado dentro da toolbar
- Toolbar appendada ao `.metadata-container` — conteudo template visivel na nota
- `removeToolbar()` melhorado: `querySelectorAll` em vez de `querySelector` — limpa TODAS as instancias

### Padroes Obsidian API
- **Pipeline de template rendering funcional:**
```ts
const fileContents = await this.app.vault.adapter.read(mdFilePath);
const mdContainer = document.createElement("div");
toolbar.append(mdContainer);
MarkdownRenderer.render(this.app, fileContents, mdContainer, file.path, this);
corpodocs.append(toolbar);
```
  - Padrao: le arquivo como string → cria container div → renderiza markdown nele → appenda no DOM
  - `file.path` como sourcePath (4o param) — agora usa o path da nota ativa em vez de hardcoded. Correto: resolve links relativos a partir da nota atual.

- **`querySelectorAll().forEach(el => el.remove())`** — melhoria sobre `querySelector` (que pegava so o primeiro). Resolve o bug de toolbars duplicadas que se acumulavam.

- **`addSettingTab(new PluginSettingTab(...))`** — habilita a aba de settings. Mesmo que seja so um H2 por enquanto, o pattern esta correto.

### Erros / Anti-patterns
- **`toolbar.className = "project-toolbar cm-contentContainer"`** — adiciona `cm-contentContainer` como classe CSS. Essa e uma classe interna do CodeMirror 6 — nao deveria ser reusada em elementos custom. Provavelmente adicionada pra herdar estilos de width/padding do CM6, mas pode causar conflitos com o proprio CM6.
- **Toolbar appendada (nao prepended) ao `.metadata-container`** — `.append()` coloca no final do metadata container. Se as properties estiverem visiveis, a toolbar fica abaixo delas. Funciona mas posicao pode variar dependendo do estado das properties (expandidas/colapsadas).
- **Codigo comentado persiste** — menos que v6, mas ainda tem ~15 linhas mortas.

### Evolucao importante v6 → v7
- **Template rendering funciona pela primeira vez!** O pipeline que estava sendo construido desde v4 (MarkdownRenderer) finalmente conecta: read → render → display. O plugin agora mostra conteudo real de um template Obsidian.
- **Settings tab ativada** — removido o `//` de uma linha. Pequena mudanca, grande marco: o plugin agora aparece nas settings do Obsidian.
- **Cleanup robusto** — `querySelectorAll` garante que todas as toolbars duplicadas sao removidas, nao so a primeira.

### Aprendizado
> **Pipeline de template injection: `vault.adapter.read()` → `MarkdownRenderer.render()` → `DOM.append()`.** Este e O pattern pra carregar um .md e mostrar seu conteudo renderizado em qualquer lugar do plugin. Funciona com qualquer markdown (links, code blocks, embeds).

> **Use `querySelectorAll().forEach(remove)` em vez de `querySelector().remove()` quando pode haver duplicatas.** Especialmente importante quando multiplos eventos podem criar o mesmo elemento antes do cleanup.

> **Nunca reutilize classes CSS internas do Obsidian/CM6 nos seus elementos.** `cm-contentContainer`, `cm-scroller`, etc sao gerenciadas internamente e podem causar conflitos. Crie suas proprias classes.

---

## Commit 8: Mode Detection (v8 — 2024-06-07 17:41)
**SHA:** `34390a9` | **Build:** success

### O que fez
- Novo metodo `eventTests()` substitui `addToolbar()` como handler ativo dos 3 eventos
- Introduz **`view.getMode()`** — retorna `"source"` ou `"preview"` (modo do editor)
- Notice mostra o modo atual a cada evento
- Estrutura pra template condicional por modo (comentada): `if (mode === "preview")` → template A, `else if (mode === "source")` → template B
- **Removeu ribbon icons e commands** do v6-v7 — foco total no sistema de eventos/modo
- `addToolbar()` antigo mantido mas agora usa `_ui-management.md` (template diferente)
- Limpeza significativa de codigo comentado do main.ts

### Padroes Obsidian API
- **`view.getMode()`** — metodo de `MarkdownView` que retorna o modo atual:
  - `"source"` — Live Preview ou Source Mode
  - `"preview"` — Reading View
  - Util pra renderizar conteudo diferente dependendo do modo. O plano e: template com DataviewJS pra preview, template com MetaBind pra source.
- **Nota: `getMode()` nao distingue Live Preview de Source Mode.** Ambos retornam `"source"`. Pra distinguir, seria necessario checar `view.getState().source` (true = Source Mode puro, false = Live Preview).

### Erros / Anti-patterns
- **Cleanup desabilitado no eventTests** — `this.removeToolbar()` no else esta comentado. Significa que ao navegar pra uma nota sem `type: project`, a toolbar fica fantasma.
- **`removeToolbar()` regressou** — voltou pra `querySelector` (singular) com Notice "ACHOU!!!!!" de debug. V7 tinha melhorado pra `querySelectorAll`. Regressao.
- **Template condicional comentado** — a logica `if preview → template A, if source → template B` existe mas esta comentada. Sempre usa o mesmo template.
- **Ribbon icons removidos** — features funcionais do v6-v7 removidas. Indica que o dev esta fazendo "feature branch" mental — focando num problema de cada vez, mesmo que signifique remover features prontas temporariamente.

### Evolucao importante v7 → v8
- **Descoberta do `view.getMode()`** — insight chave pro plugin. Se o plugin mostra templates diferentes por modo (DataviewJS em reading, MetaBind em editing), o getMode() e o gatilho.
- **Refactor em `eventTests()`** — separou a logica de deteccao de modo do addToolbar. Approach de experimentacao: handler separado pra testar sem afetar o codigo que funciona.
- **Stripping down** — removeu features pra focar. Pattern saudavel de prototipagem: simplificar pra entender um problema antes de reintegrar.

### Aprendizado
> **`view.getMode()` retorna `"source"` ou `"preview"`.** Use pra renderizar conteudo diferente por modo. Mas lembre: nao distingue Live Preview de Source Mode — ambos sao `"source"`. Pra essa distincao, use `view.getState().source`.

> **E OK remover features temporariamente durante prototipagem.** O dev removeu ribbon icons e commands pra focar no mode detection. O codigo antigo continua la (addToolbar), sera reintegrado depois. "Simplify to understand" e um pattern valido.

---

## Commit 9: Full Mode Routing + Debug (v9 — 2024-06-07 19:10)
**SHA:** `1f11a80` | **Build:** success

### O que fez
- **Mode routing ativo!** `view.getMode()` agora determina qual template carregar:
  - `"preview"` → `templates/ui-live_preview-mode.md`
  - `"source"` → `templates/ui-preview-mode.md`
- Reintegrou features removidas no v8: ribbon icons (eye + file), commands (Decorate + Peek), sidebar view
- `removeToolbar()` agora `async`, chamado antes E depois do render
- `addToolbar()` voltou como handler principal (eventTests() removido)
- Mudou approach: nao usa mais `leaf` param — usa `this.app.workspace.getActiveViewOfType(MarkdownView)` direto
- Debug massivo: Notices pra mode, template path, "Starting Add Toolbar", "Encontrou .metadata-container"

### Padroes Obsidian API
- **`this.app.workspace.getActiveViewOfType(MarkdownView)` como fonte unica de verdade:**
```ts
const view = this.app.workspace.getActiveViewOfType(MarkdownView);
if (!view) return;
const file = view.file;
```
  - Resolve o problema do v4-v8 onde o handler recebia `leaf` com tipo errado dependendo do evento. Agora ignora o parametro do evento e busca a view ativa diretamente. Mais robusto.

- **Mode routing completo:**
```ts
const mode = view.getMode();
if (mode === "preview") { temps = "templates/ui-live_preview-mode.md"; }
else if (mode === "source") { temps = "templates/ui-preview-mode.md"; }
```
  - Primeira vez que o routing esta ATIVO (nao comentado). O plugin agora mostra conteudo diferente por modo.

- **`removeToolbar()` antes e depois do render:**
```ts
await this.removeToolbar();  // antes: limpa toolbar antiga
// ... render ...
await this.removeToolbar();  // depois: limpa duplicatas do evento anterior
corpodocs.append(toolbar);
```

### Erros / Anti-patterns
- **Debug noise excessivo** — ~8 Notices por navegacao + console.logs. Em producao seria insuportavel. Mas durante prototipagem e valido — o dev esta tracando o fluxo completo.
- **`removeToolbar()` chamado 2x no fluxo** — antes e depois do render. O segundo remove a toolbar que acabou de ser renderizada (antes do append) se o timing for errado. Race condition potencial.
- **`removeToolbar()` feito async sem necessidade** — `querySelectorAll().forEach(remove)` e sincrono. Adicionar `async` nao muda o comportamento mas e enganoso.
- **Codigo comentado massivo reintroduzido** — ~40 linhas mortas voltaram do v6. O dev fez "revert" de features mas trouxe o lixo junto.
- **Nome do template trocado** — em preview usa `ui-live_preview-mode.md`, em source usa `ui-preview-mode.md`. Os nomes sao confusos — "live_preview" e pra Reading View? Provavelmente invertido. Live Preview = source no getMode(), Reading View = preview.

### Evolucao importante v8 → v9
- **Reintegracao de tudo.** V8 stripped down pra focar em mode detection. V9 junta tudo: mode routing + ribbon + commands + settings + sidebar. Versao mais completa ate agora.
- **Resolveu o problema da assinatura do handler** — em vez de depender do tipo do parametro `leaf` (que varia por evento), agora usa `getActiveViewOfType()` diretamente. Elegante.
- **Mode routing funcional** — a feature core do plugin esta ativa pela primeira vez.

### Aprendizado
> **Quando o handler e chamado por multiplos eventos com assinaturas diferentes, ignore o parametro e use `this.app.workspace.getActiveViewOfType(MarkdownView)`.** Funciona independente de qual evento disparou. Mais robusto que tentar tipar o parametro.

> **Nomes de templates importam.** `ui-live_preview-mode.md` vs `ui-preview-mode.md` e confuso. `getMode()` retorna `"source"` pra Live Preview e `"preview"` pra Reading View. Nomeie os templates de forma que reflitam o modo: `template-reading.md` e `template-editing.md` seria mais claro.

---

## Commit 10: v1 Final — Scoped Cleanup + Duplicate Prevention (v10 — 2024-06-08 13:44)
**SHA:** `4e6c559` | **Build:** success | **ERA 1 COMPLETA**

### O que fez
- **Primeira versao estavel.** Limpeza de debug, codigo organizado, bugs corrigidos.
- `removeToolbar(leaf)` agora **scoped ao `view.containerEl`** em vez de `document` global — corrige bug de split view
- **Duplicate prevention:** `if (view.containerEl.querySelector(".project-toolbar")) return;` antes do append
- Debug Notices removidos (apenas console.logs restantes)
- `handleLeafChange()` valida `instanceof MarkdownView` antes de chamar addToolbar
- `onActiveFileLeafChange()` wrapper que checa se leaf tem file
- Voltou a usar `leaf.view as MarkdownView` (em vez do `getActiveViewOfType` do v9)
- Codigo limpo: ~40 linhas de codigo comentado removidas do v9

### Padroes Obsidian API — Correcoes criticas

**Scoped cleanup (CORRECAO do bug desde v4):**
```ts
async removeToolbar(leaf: WorkspaceLeaf) {
    if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;
    const view = leaf.view as MarkdownView;
    const existingToolbar = view.containerEl.querySelector(".project-toolbar");
    if (existingToolbar) existingToolbar.remove();
}
```
- Desde v4, `removeToolbar()` usava `document.querySelector()` global — em split view, removia toolbar da panel errada. Agora busca DENTRO do `view.containerEl` especifico. **Bug corrigido apos 6 versoes.**

**Duplicate prevention:**
```ts
if (view.containerEl.querySelector(".project-toolbar")) return;
```
- Antes do append, checa se ja existe. Evita stacking de toolbars quando multiplos eventos disparam simultaneamente. Resolve o problema de flicker do v4-v9 sem precisar de debounce.

**Leaf validation antes de operar:**
```ts
async handleLeafChange(leaf: WorkspaceLeaf) {
    if (leaf.view instanceof MarkdownView) {
        await this.removeToolbar(leaf);
        this.addToolbar(leaf);
    }
}
```
- Garante que so opera em MarkdownViews. Sidebar views, canvas, graph — todos ignorados.

### Erros / Restos
- **`onActiveFileLeafChange` nao totalmente utilizado** — existe como wrapper mas o `addToolbar` tambem esta registrado diretamente. Redundante.
- **Alguns console.logs restantes** — nao ideal pra producao mas aceitavel pra v1.
- **`activeDocument.createElement` → `document.createElement`** — corrigido. `activeDocument` e pra pop-out windows, `document` e o correto pro vault principal.

### Evolucao v9 → v10 (e resumo da Era 1)
- **Scoped cleanup** — de `document.querySelector` global pra `view.containerEl.querySelector`. Bug critico corrigido.
- **Duplicate prevention** — guard simples que resolve stacking sem debounce.
- **Codigo limpo** — removeu ~40 linhas de comentarios, debug Notices, e experimentos mortos.
- **Lifecycle claro:** load settings → detectar type:project → checar modo → carregar template → renderizar → cleanup

### Aprendizado
> **SEMPRE busque elementos dentro de `view.containerEl`, nunca via `document.querySelector()`.** Em split view, querySelector global pega o primeiro match, que pode ser de outra panel. Este bug persistiu de v4 a v9 (6 versoes!) antes de ser corrigido. Regra de ouro: se o elemento pertence a uma view, busque dentro da view.

> **Duplicate prevention e mais simples que debounce.** Um `if (container.querySelector(".my-class")) return;` antes do append resolve stacking sem a complexidade de timers. Use quando o resultado final e idempotente (toolbar existe ou nao).

> **`document.createElement()` pro vault principal, `activeDocument.createElement()` so pra pop-out windows.** Na maioria dos plugins, use `document`.

---

### Resumo da Era 1 (v1-v10, Jun 6-8 2024)

O Prototype Sprint em 10 versoes, 3 dias:

| v | Marco | Pattern-chave |
|---|-------|---------------|
| 1 | Skeleton + Notice | onload/onunload lifecycle |
| 2 | Ribbon via DOM (FALHA) | NUNCA manipular ribbon DOM direto |
| 3 | YAML frontmatter detection | metadataCache.getFileCache().frontmatter |
| 4 | MarkdownRenderer.render() | API oficial pra renderizar markdown |
| 5 | cm-scroller experiment | CM6 DOM structure awareness |
| 6 | MirrorUIPlugin nasce | Settings, ItemView, addRibbonIcon, addCommand |
| 7 | Settings tab + template rendering | vault.adapter.read() → MarkdownRenderer pipeline |
| 8 | view.getMode() | Detecta preview vs source |
| 9 | Full mode routing | Template condicional por modo |
| 10 | v1 final | Scoped cleanup, duplicate prevention, codigo limpo |

**Arco narrativo:** Explore (v1-v3) → Overreach (v2) → Core (v3-v5) → Architecture (v6) → Pipeline (v7) → Mode (v8-v9) → Polish (v10)

---

## Padroes Gerais Observados (ate v10 — Era 1 completa)

### API Obsidian — O que funciona
| Pattern | Usado em | Status |
|---------|----------|--------|
| `new Notice(msg)` | v1, v4 | OK — feedback simples |
| `this.registerEvent(workspace.on(...))` | v2, v3, v4 | OK — auto-cleanup de events |
| `metadataCache.getFileCache(file)?.frontmatter` | v1 (stub), v3, v4 | OK — leitura de YAML |
| `workspace.getActiveViewOfType(MarkdownView)` | v3 | OK — acesso seguro a view |
| `workspace.on('file-open', ...)` | v3, v4 | OK — evento de abertura de nota |
| `MarkdownRenderer.render(app, md, el, path, component)` | v4 | OK — renderiza markdown em qualquer DOM element |
| `containerEl.prepend(el)` | v4 | OK — insere no topo da view |
| `workspace.on('layout-change', ...)` | v4 | OK — catch-all pra re-render |
| CSS vars do Obsidian (`--layer-status-bar`, etc) | v5 | OK — respeita temas |
| `Object.assign({}, DEFAULTS, loadData())` settings | v6 | OK — pattern canonico |
| `addRibbonIcon(iconId, tooltip, cb)` | v6 | OK — API oficial, limpa no unload |
| `ItemView` sidebar + `registerView()` | v6 | OK — custom sidebar view |
| `addCommand({ checkCallback })` condicional | v6 | OK — comando que aparece so com condicao |
| `addCommand({ editorCallback })` | v6 | OK — comando com acesso ao editor |
| `vault.adapter.read(path)` | v6 | OK — le arquivo raw como string |
| `.metadata-container` target | v6, v7 | Funciona mas classe interna |
| `vault.adapter.read()` → `MarkdownRenderer.render()` pipeline | v7 | OK — template injection completo |
| `addSettingTab(new PluginSettingTab(...))` | v7 | OK — aba de settings |
| `querySelectorAll().forEach(remove)` cleanup | v7 | OK — remove todas as instancias |
| `view.getMode()` → "source" / "preview" | v8, v9, v10 | OK — detecta modo do editor |
| `view.containerEl.querySelector()` scoped | v10 | OK — busca dentro da view, nao global |
| Duplicate prevention (`querySelector` guard) | v10 | OK — evita stacking sem debounce |

### API Obsidian — O que NAO funciona
| Anti-pattern | Tentado em | Por que falha |
|-------------|-----------|---------------|
| `querySelector('.workspace-ribbon-left')` | v2 | Classe nao existe no DOM |
| DOM direto no ribbon | v2 | Ribbon e gerenciado internamente |
| `innerHTML = ''` no ribbon | v2 | Destrutivo, apaga icones de outros plugins |
| Tooltip manual (mouseenter/leave) | v2 | Reinventa API existente (`setTooltip`) |
| `registerEvent` no `onunload()` | v1 | Sem sentido — plugin ja descarregando |
| `document.querySelector()` global pra cleanup | v4 | Pega elemento errado em split view |
| Mesmo handler pra eventos com assinaturas diferentes | v4 | `file-open` passa TFile, `layout-change` passa nada, `active-leaf-change` passa WorkspaceLeaf |
| Double injection (append + prepend no mesmo el) | v5 | Segundo move anula o primeiro — codigo morto |
| Injetar dentro de `.cm-scroller` | v5 | Funciona mas perigoso — CM6 gerencia internamente |

### Evolucao do pensamento do dev
1. **v1:** "Vou mostrar um Notice e deixar stubs" — exploracao minima
2. **v2:** "Vou colocar um botao no ribbon via DOM" — ambicioso demais, approach errado
3. **v3:** "Vou focar no core: detectar frontmatter e reagir" — volta ao essencial, approach correto
4. **v4:** "Agora vou renderizar conteudo de verdade" — MarkdownRenderer, prepend, nomes proprios. Primeiro resultado visual real.
5. **v5:** "Onde exatamente colocar a toolbar?" — exploracao do DOM CM6. Tenta cm-scroller, volta pro containerEl. Primeiro CSS substancial.
6. **v6:** "Agora e serio" — classe definitiva MirrorUIPlugin, settings, sidebar view, ribbon icons via API, commands. Salto arquitetural de 1 arquivo pra 3.
7. **v7:** "Conectar tudo" — settings tab habilitada, template rendering funcional. Primeiro pipeline completo: read → render → display.
8. **v8:** "Qual modo estou?" — `view.getMode()`, strips down pra focar em mode detection. Prepara template condicional por modo.
9. **v9:** "Tudo junto" — mode routing ativo, features reintegradas, debug massivo. Versao mais completa da Era 1.
10. **v10:** "v1 final" — scoped cleanup, duplicate prevention, codigo limpo. **Era 1 completa.**

> **Era 1 (Prototype Sprint): 10 versoes em 3 dias (Jun 6-8 2024).** De um Notice vazio a um plugin funcional que detecta frontmatter, identifica modo, carrega template correto, e renderiza. Os 3 aprendizados mais importantes: (1) NUNCA querySelector global — sempre scope ao containerEl; (2) metadataCache e o unico jeito de ler frontmatter; (3) MarkdownRenderer.render() e O pipeline de template injection.

---

## SINTESE DA ERA 1 — Prototype Sprint (Jun 6-8 2024)

### O que o plugin faz ao final da Era 1
Um plugin Obsidian que:
1. Detecta notas com `type: project` no frontmatter YAML
2. Identifica o modo do editor (preview vs source) via `view.getMode()`
3. Carrega um template .md diferente por modo
4. Renderiza o template via `MarkdownRenderer.render()` dentro de `.metadata-container`
5. Limpa a toolbar ao navegar pra nota sem match (scoped ao containerEl)

### Top 5 regras tecnicas aprendidas
1. **NUNCA `document.querySelector()` global pra elementos de view.** Sempre `view.containerEl.querySelector()`. Bug persistiu 6 versoes (v4-v9).
2. **`metadataCache.getFileCache(file)?.frontmatter`** e o unico jeito de ler YAML. Nunca parsear manualmente.
3. **`vault.adapter.read()` → `MarkdownRenderer.render()`** e O pipeline pra template injection. Links, code blocks, embeds — tudo funciona.
4. **`addRibbonIcon()` e a unica forma de adicionar icones ao ribbon.** DOM direto falha silenciosamente (v2).
5. **Duplicate prevention via guard (`querySelector` antes do append)** e mais simples que debounce.

### O que ficou de fora / divida tecnica pra Era 2+
- **Settings hardcoded** — `type: project` e os paths dos templates estao hardcoded no main.ts. Nao ha como o usuario configurar quais frontmatter values triggeram quais templates.
- **Sem sistema de mirrors** — o conceito de "mirror" (mapear YAML value → template) nao existe como data model ainda. E a feature CORE do plugin.
- **UI de settings vazia** — so tem um H2. Precisa de form pra add/remove/editar mirrors.
- **Sidebar view e placeholder** — "Emergency contact" / Ghostbusters. Precisa de uso real ou ser removida.
- **Template paths hardcoded** — `templates/ui-live_preview-mode.md` e `templates/ui-preview-mode.md` nao sao configuraveis.
- **Sem autocomplete pra YAML/templates** — o usuario precisa digitar paths manualmente.
- **Sem suporte a multiplos mirrors** — so checa `type: project`. E se quiser `type: meeting` → outro template?
- **`layout-change` nao registrado no v10** — so `active-leaf-change`. Perde reactividade ao trocar modo sem trocar nota.
- **Nenhum CSS pro conteudo renderizado** — o template aparece mas sem styling especifico.

### O que a Era 2 precisa resolver
1. **Data model de mirrors** — interface `FolderTemplateSetting` com YAML attr, YAML value, template paths
2. **Settings UI funcional** — form pra CRUD de mirrors, com autocomplete pra YAML props e template paths
3. **Lookup dinamico** — em vez de `if type === "project"`, iterar sobre a lista de mirrors configurados
4. **Persistencia** — settings salvos em data.json, carregados no onload

---

# ERA 2: Settings Evolution (Jul 19 - Aug 5, 2024)

## Commit 11: Full Settings UI + YAMLSuggest (v11 — 2024-07-19 18:14)
**SHA:** `88d0bf7` | **Build:** success | **ERA 2 COMECA** | **Gap: 41 dias desde v10**

### O que fez
- **Rewrite completo do settings.ts** — de 12 linhas (stub) pra 247 linhas (UI funcional)
- **`FolderTemplateSetting` interface:** `{ templateName, templatePath, yamlAttribute, yamlValue }`
- **Settings UI completa:** form pra add/remove/reorder template entries
- **`YAMLSuggester`** — autocomplete de propriedades YAML (novo arquivo `YAMLSuggest.ts`)
- **`SuggestionModal`** — modal com lista de sugestoes, clicavel
- **main.ts refatorado:** metodos renomeados pra `addToolbarToActiveLeaf`, `removeToolbarFromActiveLeaf`, `updateToolbarInActiveLeaf`
- **`MarkdownRenderer.renderMarkdown()`** em vez de `MarkdownRenderer.render()` — API levemente diferente (sem container intermediario)
- **Ribbon icons, commands, sidebar view REMOVIDOS** — foco total no core (settings + toolbar)
- **So `layout-change` registrado** — `file-open` e `active-leaf-change` comentados

### Padroes Obsidian API — Novos

**Settings UI com Setting API:**
```ts
new Setting(containerEl)
    .addText(text => text
        .setPlaceholder('...')
        .setValue(settingData.templateName || '')
        .onChange(value => {
            settingData.templateName = value;
            this.plugin.saveSettings();
        }));
```
- Pattern: `new Setting(el).addText(cb)` — cria campo de texto com auto-save. Cada `onChange` chama `saveSettings()`.

**Extra buttons (reorder/delete):**
```ts
new Setting(buttonsDiv)
    .addExtraButton(btn => btn.setIcon('up-chevron-glyph').onClick(...))
    .addExtraButton(btn => btn.setIcon('down-chevron-glyph').onClick(...))
    .addExtraButton(btn => btn.setIcon('cross').onClick(...));
```
- `addExtraButton` pra icones de acao. `setIcon()` aceita nomes de icones do Lucide (Obsidian usa Lucide icons).

**YAML property discovery:**
```ts
getYAMLProperties(): string[] {
    const files = this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFile);
    const properties = new Set<string>();
    files.forEach(file => {
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (fm) Object.keys(fm).forEach(key => properties.add(key));
    });
    return Array.from(properties);
}
```
- Itera TODOS os arquivos do vault, coleta todas as keys de frontmatter. Util pra autocomplete mas pode ser lento em vaults grandes.

**`MarkdownRenderer.renderMarkdown()` vs `.render()`:**
- v4-v10 usavam `MarkdownRenderer.render(app, md, el, path, component)` — 5 params
- v11 usa `MarkdownRenderer.renderMarkdown(md, el, path, component)` — 4 params (sem `app`)
- **Nota:** `renderMarkdown` e a versao mais antiga da API. `render` e a mais recente. Ambas funcionam mas `render` e preferida em plugins modernos.

### Erros / Anti-patterns
- **`this.app.workspace.getLeaf()` sem parametro** — retorna o leaf ativo ou cria um novo. Fragil — em contextos inesperados pode criar leaf vazio. Preferir `getActiveViewOfType(MarkdownView)`.
- **`view = activeLeaf.view as MarkdownView` sem type check** — cast direto sem `instanceof` check. Se o leaf nao for MarkdownView, crash. v10 tinha isso correto.
- **SuggestionModal com estilos inline** — cria `<style>` tag e appenda ao `document.head`. Nao limpa no close. Cada abertura adiciona mais uma tag. Deveria usar `styles.css` do plugin.
- **YAMLSuggester cria DOM sem cleanup** — o suggestion container persiste no DOM apos uso.
- **`layout-change` como unico evento** — perde reactividade ao abrir nota (file-open) e ao clicar em outra tab (active-leaf-change). So detecta mudancas de layout (resize, sidebar toggle, MODE SWITCH). Provavelmente intencional pra testar mode-switch em isolamento.
- **Settings nao conectados ao main.ts** — os `folderTemplates` sao salvos mas main.ts ainda usa `frontmatter?.type === "project"` hardcoded. O lookup dinamico nao existe ainda.

### Evolucao v10 → v11
- **Gap de 41 dias** (Jun 8 → Jul 19). Indica reflexao/planejamento antes de atacar o settings.
- **Foco na data layer** — `FolderTemplateSetting` e o data model que faltava na Era 1. Agora o plugin sabe QUE dados precisa pra configurar mirrors.
- **UI first, logic depois** — a settings UI esta pronta mas nao conectada ao rendering. Pattern de prototipagem: UI pra validar o modelo mental antes de implementar a logica.
- **Metodos renomeados** — `addToolbar` → `addToolbarToActiveLeaf`. Mais descritivo, indica maturidade.

### Aprendizado
> **`Setting` API do Obsidian e poderosa: `.addText()`, `.addDropdown()`, `.addToggle()`, `.addButton()`, `.addExtraButton()`.** Cada um aceita callback pra configurar. `onChange` pra auto-save. Pattern declarativo e limpo.

> **Descobrir YAML properties do vault: itere `vault.getAllLoadedFiles()` + `metadataCache.getFileCache()`.** Coleta todas as keys de frontmatter. Util pra autocomplete mas O(n) em todos os arquivos — considere cache pra vaults grandes.

> **Settings UI e data model ANTES da logica de negocio.** Valide o modelo mental com UI interativa antes de conectar ao rendering. E mais facil mudar a estrutura dos dados quando so a UI depende deles.

---

## Commit 12: Autocomplete Utils (v12 — 2024-07-20 12:56)
**SHA:** `027ec92` | **Build:** success

### O que fez
- 3 novos arquivos de utilidades pra autocomplete nas settings:
  - **`utils/suggest.ts`** (177 linhas) — classe base `TextInputSuggest<T>` com popup posicionado via Popper.js. Keyboard nav (ArrowUp/Down/Enter/Escape), scroll, mouse hover.
  - **`utils/file-suggest.ts`** (95 linhas) — 3 suggesters concretos: `FileSuggest` (.md files), `FolderSuggest` (folders), `YamlPropertySuggest` (YAML keys do vault)
  - **`settings/utils.ts`** (3 linhas) — `wrapAround()` helper pra navegacao circular em lista
- Fix no build script: removeu `tsc` check que bloqueava esbuild

### Padroes Obsidian API — Novos

**`TextInputSuggest` pattern (baseado no Templater):**
```ts
export abstract class TextInputSuggest<T> implements ISuggestOwner<T> {
    abstract getSuggestions(inputStr: string): T[];
    abstract renderSuggestion(item: T, el: HTMLElement): void;
    abstract selectSuggestion(item: T): void;
}
```
- Implementa `ISuggestOwner<T>` do Obsidian — interface oficial pra suggesters.
- Usa `Scope` do Obsidian pra registrar keybindings (Arrow keys, Enter, Escape).
- `createPopper()` do `@popperjs/core` pra posicionar o popup abaixo do input.
- **Pattern reusavel:** crie uma subclass, implemente os 3 metodos abstratos, e tenha autocomplete em qualquer campo de texto.

**`(this.app as any).keymap.pushScope(scope)` / `popScope(scope)`:**
- API interna (nao documentada) pra gerenciar keyboard scopes. Quando o suggester esta aberto, as keys sao capturadas por ele. Ao fechar, restaura o scope anterior.
- `(this.app as any).dom.appContainerEl` — acesso ao container root, tambem nao documentado.

**`inputEl.trigger("input")`:**
- Dispara evento `input` programaticamente apos selecionar uma sugestao. Garante que o `onChange` do `Setting.addText()` e chamado.

### Aprendizado
> **O pattern `TextInputSuggest<T>` (inspirado no Templater) e a forma mais robusta de criar autocomplete em settings.** Extends `ISuggestOwner<T>`, usa Popper.js pra posicionamento, Scope pra keyboard. Implemente `getSuggestions`, `renderSuggestion`, `selectSuggestion`. Reusavel em qualquer campo.

> **Obsidian tem APIs internas nao documentadas** (`app.keymap.pushScope`, `app.dom.appContainerEl`) que plugins populares usam. Funcionam mas podem quebrar em updates. Use com cuidado e `@ts-ignore` / `as any`.

---

## Commit 13: SettingModel1 (v13 — 2024-07-22 11:14)
**SHA:** `d31d27f` | **Build:** success

### O que fez
- **`settings/SettingModel1.ts`** (234 linhas) — primeira iteracao da arquitetura de settings evoluida
- Interface simplificada: `FolderTemplate { folder: string; template: string; }`
- Settings expandidos: `MyPluginSettings { mySetting, templates_folder, enable_folder_templates, folder_templates[], user_scripts_folder }`
- UI com:
  - Header descritivo (PT-BR + EN misturado)
  - Toggle "Enable folder templates"
  - Botao "+" pra adicionar entries
  - Cada entry: 2 campos `addSearch` (folder + template) com suggesters
  - Botoes up/down/delete
  - `FolderSuggest` no campo folder, `YamlPropertySuggest` no campo template
- **Inspiracao clara no Templater** — estrutura de settings, nomes de metodos, pattern `arraymove` (comentado)

### Padroes Obsidian API — Novos

**`Setting.addSearch()` em vez de `addText()`:**
```ts
new Setting(el).addSearch(cb => {
    new FolderSuggest(this.app, cb.inputEl);
    cb.setPlaceholder("Folder")
      .setValue(folder_template.folder)
      .onChange(new_folder => { ... });
});
```
- `addSearch` cria um campo de busca (com icone de lupa). Combinado com o `TextInputSuggest`, funciona como autocomplete nativo.
- Vantagem sobre `addText`: visual distinto (usuario entende que pode buscar).

**`s.infoEl.remove()`:**
- Remove o label/description do Setting element. Usado quando o setting e so um grupo de inputs sem nome explicito. Hack mas funciona pra layouts custom.

**Toggle condicional:**
```ts
new Setting(el).addToggle(toggle => {
    toggle.setValue(this.plugin.settings.enable_folder_templates)
          .onChange(val => { ...; this.display(); });
});
if (!this.plugin.settings.enable_folder_templates) return;
```
- Toggle que re-renderiza a UI inteira via `this.display()`. Se desabilitado, a secao de folder templates desaparece. Pattern limpo.

### Erros / Anti-patterns
- **Codigo do Templater copiado com restos** — `arraymove` comentado, `FileSuggestMode.TemplateFiles` comentado, `templater_search` class. Indica copy-paste do Templater com adaptacao parcial.
- **Duplicate "Add new" button** — o botao "+" aparece 2 vezes no layout (antes e depois do toggle). Bug de copiar o bloco.
- **`//@ts-ignore` no constructor** — `super(app, plugin)` com `app` nao definido no scope. Deveria ser `super(plugin.app, plugin)`.
- **Modelo nao conectado ao main.ts** — SettingModel1 exporta `SampleSettingTab` e `MyPluginSettings`, mas main.ts ainda importa de `./settings` (o arquivo original). Sao arquivos paralelos.
- **Mistura PT-BR / EN nas descricoes** — "Permite inserir uma nota existente" ao lado de "Templater will fill the empty file".

### Evolucao v11 → v12 → v13
- **v12:** Infraestrutura de autocomplete (suggest, file-suggest). Building blocks.
- **v13:** Primeira iteracao de settings evoluidas. Usa a infra do v12. Inspirado fortemente no Templater.
- **Pattern de iteracao visivel:** o dev vai fazer v13 (Model1), v14 (Model2), v15 (Model3)... iterando no modelo de settings ate acertar. O nome "SettingModel1" ja indica isso.

### Aprendizado
> **`addSearch()` + `TextInputSuggest` = autocomplete nativo nas settings.** Melhor UX que `addText()` pra campos que referenciam arquivos, pastas ou YAML properties.

> **Copiar de plugins maduros (Templater) e um atalho valido, mas limpe os restos.** O Templater tem ~3 anos de iteracao no pattern de settings com suggesters. Copiar a estrutura e adaptar economiza tempo, mas imports comentados, classes com nomes do original, e @ts-ignore sao divida tecnica.

> **Settings models iterativos (Model1, Model2...) sao um bom pattern de prototipagem.** Arquivos paralelos permitem comparar abordagens sem perder a anterior. O dev esta deliberadamente explorando a melhor estrutura antes de commitar numa unica solucao.

---

## Commit 14: SettingModel2 — Multi-Mirror Architecture (v14 — 2024-07-23 20:08)
**SHA:** `7076d01` | **Build:** success | **233 → 747 linhas (3x)**

### O que fez
- **Explosao de complexidade:** de 233 linhas (Model1) pra 747 (Model2)
- Arquitetura Global + Custom mirrors:
  - **Global:** `enable_global_settings`, `enable_global_live_preview_mode`, `enable_global_preview_mode`
  - **Custom:** `custom_items[]` array pra multiplos mirrors
  - **Filtros por mirror:** `filter_files[]`, `filter_folders[]`, `filter_props[]`, `filter_props_values[]`
- UI com:
  - **Getting Started banner** com botao "Dismiss" (salva toggle em settings)
  - **Global Mirror section** com toggle header
  - **Custom Mirror cards** — cada card com botoes up/down/collapse/edit/delete
  - **Separator HR** entre global e custom
  - **Reset Settings** button (logica nao implementada)
- Helper methods: `addToggleHeader()`, `addStatsDescr()`, `createSelectionMirrorNotes()`, `addCustomSettingCards()`

### Padroes Obsidian API — Novos
- **`ExtraButtonComponent`** — importado do obsidian. Buttons icon-only pra toolbar de acoes (diferente de `ButtonComponent` que tem texto).
- **`Setting.addExtraButton()` com icones:** `up-chevron-glyph`, `down-chevron-glyph`, `chevrons-down-up` (collapse), `edit`, `reset`, `cross`.
- **Banner dismissable pattern:** toggle em settings → re-render via `this.display()`.
- **`this.containerEl.createEl("hr", {cls: "mirror-separator"})`** — separador visual entre secoes.

### Aprendizado
> **Separe Global e Custom settings em secoes visuais distintas.** Toggle headers pra mostrar/esconder secoes. Cards pra items individuais. HR entre grupos. O dev esta construindo uma UI de settings pro-level.

---

## Commit 15: SettingModel3 — Refinamento (v15 — 2024-07-24 16:34)
**SHA:** `db690bb` | **Build:** success | **749 linhas (quase identico ao Model2)**

### O que fez
- Refinamento minimo do Model2: +2 linhas (blank lines no topo)
- Mesmas interfaces, mesma estrutura, mesmas features
- Iteracao de revisao/validacao, nao de features

### Aprendizado
> **Nem toda iteracao adiciona features.** Revisar o codigo anterior e confirmar que a arquitetura esta correta e tao valido quanto adicionar funcionalidade. O dev fez 3 models em 3 dias (Jul 22-24), refinando ate ter confianca suficiente pra consolidar no v16.

---

## Commit 16: finalmente.ts — Consolidated Settings (v16 — 2024-07-25 00:49)
**SHA:** `ad31616` | **Build:** success | **1167 linhas — maior arquivo do plugin**

### O que fez
- **"Finalmente!"** — arquivo que consolida Models 1-3 numa unica solucao completa
- **`CustomMirror` interface definitiva:**
```ts
interface CustomMirror {
    id: string;              // crypto.randomUUID()
    name: string;            // "Mirror 1", "Mirror 2"...
    openview: boolean;       // card expandido/colapsado

    enable_custom_live_preview_mode: boolean;
    custom_settings_live_preview_note: string;   // path do template
    custom_settings_live_preview_pos: string;    // "top"|"bottom"|"left"|"right"

    enable_custom_preview_mode: boolean;
    custom_settings_preview_note: string;
    custom_settings_preview_pos: string;

    custom_settings_overide: boolean;   // sobrescrever global?
    custom_settings_hide_props: boolean; // esconder properties?

    filterFiles: Array<FolderTemplate>;
    filterFolders: Array<FolderTemplate>;
    filterProps: Array<FolderTemplate>;
}
```
- **Global Settings completos:** live preview + preview mode, cada um com template path + position dropdown + toggle
- **Custom Mirrors:** "Add New Mirror" cria card com UUID, config completa per-mirror
- **`DropdownComponent`** — novo: dropdown pra selecao de posicao (top/bottom/left/right)
- **Hide properties toggle** — pra esconder frontmatter na nota target
- **Replace custom Mirrors** — toggle pra global sobrescrever custom

### Padroes Obsidian API — Novos
- **`Setting.addDropdown()`:**
```ts
.addDropdown((cb: DropdownComponent) => {
    cb.addOption("top", "Top of note")
    cb.addOption("bottom", "Bottom of note")
    cb.setValue(settings.position);
    cb.onChange(async value => { settings.position = value; await plugin.saveSettings(); });
})
```
- **`crypto.randomUUID()`** pra IDs unicos de mirrors — garante que cada mirror e identificavel mesmo apos reorder/delete.
- **Combinacao `addSearch` + `addDropdown`** num mesmo Setting — template path com autocomplete + posicao como dropdown. Layout compacto.
- **`.infoEl.remove()`** — remove label do Setting quando so quer os controles.

### Erros / Anti-patterns
- **Ainda nao conectado ao main.ts** — finalmente.ts exporta `SampleSettingTab` mas main.ts importa `MirrorUISettingsTab` do `./settings` original. Modelo paralelo.
- **`import { captureRejectionSymbol } from "events"`** — import Node.js que nao deveria estar num plugin Obsidian. Provavelmente resto de autocompletar.
- **Global e Custom settings usam os mesmos toggles `global_settings_live_preview_pos` / `global_settings_preview_pos`** — overlap nos nomes.
- **Settings interface muito grande** — 25+ campos flat. Poderia ser aninhado (`global: {...}, custom: [...]`).

### Evolucao Model1 → Model2 → Model3 → finalmente.ts
| Versao | Linhas | Marco |
|--------|--------|-------|
| Model1 (v13) | 234 | Interface basica FolderTemplate, folder+template |
| Model2 (v14) | 747 | Global + Custom split, filtros, cards, banner |
| Model3 (v15) | 749 | Review pass (identico ao Model2) |
| finalmente (v16) | 1167 | CustomMirror completo, dropdown, UUID, per-mirror config |

**Iteracao em 4 dias (Jul 22-25):** 234 → 1167 linhas. O dev cresceu a complexidade gradualmente, validando cada iteracao antes de expandir. O nome "finalmente" indica satisfacao — o modelo de dados esta completo.

### Aprendizado
> **O `CustomMirror` e o data model central do plugin.** Cada mirror tem: template path por modo (live preview + preview), posicao (top/bottom/left/right), filtros (files, folders, props), e overrides (hide props, replace global). Este e o contrato que o main.ts precisa consumir.

> **`addDropdown()` e ideal pra opcoes fixas** (posicao, modo, etc). `addSearch()` com suggest pra opcoes dinamicas (files, folders, YAML keys). `addToggle()` pra booleans. `addText()` pra strings livres. Cada tipo de dado tem seu widget.

> **`crypto.randomUUID()` pra IDs de items em arrays de settings.** Garante unicidade mesmo com reorder/delete. Muito melhor que usar index como key.

---

## Commit 17: Settings.ts — Versao Definitiva (v17 — 2024-07-26 16:18)
**SHA:** `cff87ac` | **Build:** success | **1167 → 731 linhas (37% menor)**

### O que fez
- **Refinamento do finalmente.ts:** cortou de 1167 pra 731 linhas
- **Limpeza de interfaces:** removeu campos legacy (`mySetting`, `templates_folder`, `enable_folder_templates`, `folder_templates`, `user_scripts_folder`, `enable_custom_settings`, `filter_*`)
- **`MyPluginSettings` limpa:** agora so tem `enable_getting_started`, global settings (9 campos), e `customMirrors[]`
- **`CustomMirror` interface inalterada** — mesma do finalmente.ts. Ja estava certa.
- **Constructor corrigido:** `constructor(app: App, plugin: MyPlugin)` com `this.plugin = plugin` explicito
- **Imports limpos:** removeu `ExtraButtonComponent`, `Notice`, `captureRejectionSymbol`
- **Mesmo nome de classe `SampleSettingTab`** — ainda nao renomeado, mas funcional
- **Ainda nao wired ao main.ts** — arquivo paralelo como os anteriores

### Evolucao completa da Era 2 Settings (ate agora)

| Versao | Arquivo | Linhas | Marco |
|--------|---------|--------|-------|
| v11 | settings.ts (rewrite) | 247 | UI basica com FolderTemplateSetting |
| v12 | utils/suggest.ts + file-suggest.ts | 272 | Infraestrutura de autocomplete |
| v13 | SettingModel1.ts | 234 | Primeira iteracao, inspirada no Templater |
| v14 | SettingModel2.ts | 747 | Global + Custom split, filtros, cards |
| v15 | SettingModel3.ts | 749 | Review pass |
| v16 | finalmente.ts | 1167 | Consolidacao com CustomMirror completo |
| v17 | Settings.ts | 731 | Refinamento: interfaces limpas, -37% codigo |

**Arco:** explorar (v11-v13) → expandir (v14) → validar (v15) → consolidar (v16) → refinar (v17)

### Aprendizado
> **Refinar > acumular.** finalmente.ts (1167 linhas) tinha muito codigo morto e interfaces legacy. Settings.ts (731 linhas) faz o mesmo com 37% menos codigo. A diferenca: remover campos que nao sao mais usados, limpar imports, eliminar `@ts-ignore` desnecessarios. O modelo de dados (CustomMirror) ja estava certo — o problema era o ruido ao redor.

> **O arco Model1→Model2→Model3→finalmente→Settings mostra prototipagem disciplinada.** Cada arquivo e um snapshot. O dev nunca editou o anterior — criou um novo, copiou o que funcionava, adicionou/removeu. Quando cada iteracao e um arquivo separado, rollback e trivial (basta deletar o novo e voltar pro anterior).

---

## Commit 18: Build + Styles Update (v18 — 2024-08-05 11:46)
**SHA:** `ca24144` | **Build:** success | **ULTIMO COMMIT DA ERA 2** | **Gap: 10 dias desde v17**

### O que fez
- **styles.css reescrito** — de CSS basico da Era 1 pra styling completo de settings UI
- Substituiu CSS comentado (~50% do arquivo antigo) por classes reais e funcionais
- `.project-toolbar` refinado: `display: contents` (era `display: grid`), manteve border-radius, box-shadow, z-index
- Novas classes pra settings UI:
  - `.mirror-plugin-banner` — card com background, border-radius, padding
  - `.mirror-card` — card individual por mirror (mesma estetica do banner)
  - `.global-mirror-settings` — container com borda, box-shadow, padding
  - `.mirror-separator` — HR dotted com cor do tema
  - `.global-note-selection-setting` — flex layout pra search + dropdown
  - `.full-width-input` — input 100% com box-sizing
  - `.headers-toggleing` — flex space-between pra toggle headers
  - `.mirror-accordion details` — accordion nativo com `<details>` styled pra callouts do Obsidian

### CSS Patterns
- **`var(--color-base-20)`** — background de cards. Respeita light/dark theme.
- **`var(--color-base-30)`** — borda do separator. Sutil, nao intrusivo.
- **`var(--callout-color)`, `var(--callout-border-opacity)`, `var(--callout-radius)`** — reutiliza variaveis do sistema de callouts do Obsidian pra accordions. Garante consistencia visual.
- **`display: contents`** no `.project-toolbar` — o container "desaparece" do layout, filhos ocupam o espaco do pai. Util quando quer estilizar um wrapper sem afetar o fluxo.
- **`.setting-item` overrides com `!important`** — necessario pra sobrescrever os estilos default do Obsidian nos settings. Hack mas inevitavel quando o Obsidian tem `border-top` hardcoded.

### Erros / Anti-patterns
- **`.sobe { margin-top: -1000px; }`** — classe de debug pra "esconder" algo empurrando pra cima. Nao deveria estar no CSS final.
- **`position: absolute` + `position: inherit` no mesmo bloco** — segundo sobrescreve o primeiro. Codigo morto.
- **Muito CSS comentado removido mas ainda tem restos** — `/* .divider{} */`, `/* .toogle-header */`, etc.

### Significado pra Era 2
Este e o ultimo commit da Era 2 (Settings Evolution). O ciclo foi:
1. **v11:** Settings UI basica
2. **v12:** Infra de autocomplete (suggest, file-suggest)
3. **v13-v15:** Iteracao em modelos (Model1 → Model2 → Model3)
4. **v16:** Consolidacao (finalmente.ts, 1167 linhas)
5. **v17:** Refinamento (Settings.ts, 731 linhas)
6. **v18:** Styling (CSS pra settings UI e toolbar)

**O que a Era 2 conquistou:**
- Data model `CustomMirror` completo com per-mirror config
- Settings UI funcional com add/remove/reorder, suggesters, dropdowns
- CSS system pra settings e toolbar
- Infra de autocomplete reusavel (TextInputSuggest pattern)

**O que ficou de divida pra Era 3+:**
- Settings.ts AINDA NAO wired ao main.ts (o import ativo ainda e o `./settings` original)
- `customMirrors[]` existe no data model mas nao e consumido pelo rendering
- Nenhum lookup dinamico (main.ts ainda checa `type === "project"` hardcoded)
- Accordion nao implementado (CSS existe mas sem `<details>` no HTML)

### Aprendizado
> **Use CSS variables do Obsidian pra tudo que envolve cores e espacamento.** `--color-base-20` pra backgrounds, `--callout-*` pra callout-like components, `--background-modifier-border` pra bordas. Garante compatibilidade com todos os temas e dark/light mode.

> **`display: contents` e util quando quer um wrapper logico sem afetar o layout.** O container desaparece, filhos ocupam o espaco. Bom pra toolbars que nao devem adicionar um nivel extra de layout.

> **Overrides de `.setting-item` com `!important` sao inevitaveis.** O Obsidian tem estilos hardcoded nos settings components. Quando precisa mudar `display`, `border-top`, etc, `!important` e o unico caminho. Documente com comentario o motivo.

---

# ERA 3: CSS (Nov 2024)

## Commit 19: CSS Polish (v19 — 2024-11-16 19:52)
**SHA:** `6a920de` | **Build:** success | **Era 3 inteira = 1 commit** | **Gap: 103 dias desde v18**

### O que fez
- **Reverteu styles.css pro CSS da Era 1** — removeu quase todas as classes de settings UI adicionadas no v18
- Removidos: `.headers-toggleing`, `.sobe`, `.full-width-input`, `.mirror-reset`, `.search-input-container`, `.global-note-selection-setting`, `.mirror-settings-custom-settings`, `.mirror-plugin-banner`, `.mirror-card`, `.global-mirror-settings`, `.mirror-separator`, `.mirror-acordion-summary`, `.mirror-accordion details`
- Mantidos: `.project-toolbar` (voltou pra `display: grid`, era `display: contents` no v18), `.campo .setting-item`, `.elemento-geral`, `.form-content`, `.templates`, `.yaml`, `.campo`, `.botoes`
- De 3.2KB pra 2.5KB (~22% menor)

### O que isso significa
- O dev **decidiu que o CSS de settings UI do v18 era prematuro**. As classes (`.mirror-plugin-banner`, `.mirror-card`, `.global-mirror-settings`) eram pra um settings UI que ainda nao esta conectado ao plugin. Remover CSS sem uso evita side effects.
- **`.project-toolbar` voltou pra `display: grid`** — `display: contents` do v18 fazia o container desaparecer do layout. Grid da mais controle sobre o posicionamento do conteudo renderizado.
- As classes restantes (`.elemento-geral`, `.campo`, `.botoes`) sao do settings UI ORIGINAL (v11, `FolderTemplateSetting`) que ainda e o ativo.

### Aprendizado
> **Nao adicione CSS pra features que ainda nao estao wired.** O v18 adicionou ~30 classes pra settings UI que nao estava conectada. O v19 removeu. CSS sem HTML correspondente e divida tecnica invisivel — polui o arquivo e pode causar conflitos com classes de mesmo nome no futuro.

> **103 dias de gap (Aug 5 → Nov 16) sugere que o dev tentou usar o plugin no dia-a-dia e notou problemas.** O unico change e CSS cleanup — provavelmente percebeu que o styles.css estava causando side effects visuais nao intencionados.

---

# ERA 4: CM6 Rewrite (Jun 2025)

## Commit 20: CM6 Integration (v20 — 2025-06-24 01:27)
**SHA:** `c12346d` | **Build:** success | **PRIMEIRO COMMIT DA ERA 4** | **Gap: 220 dias desde v19**

### O que fez
- **Rewrite arquitetural completo** — deletou TODO o codigo das Eras 2-3 (settings models, utils, suggest)
- Removidos: `src/main.ts` (442 linhas), `src/settings.ts` (256), `SettingModel1.ts` (234), `SettingModel2.ts` (747), `SettingModel3.ts` (749), `Settings.ts` (732), `finalmente.ts` (1166), `file-suggest.ts` (95), `suggest.ts` (177), `utils.ts` (3)
- **Total removido: ~4,601 linhas** de codigo acumulado em 9 commits (v11-v19)
- Novo entry point: `main.ts` na raiz (94 linhas) — substitui `src/main.ts` (442 linhas)
- Nova pasta `src/editor/` com 3 arquivos CM6:
  - `mirrorState.ts` (68 linhas) — StateField + StateEffects
  - `mirrorViewPlugin.ts` (173 linhas) — ViewPlugin com DOM management
  - `mirrorWidget.ts` (70 linhas) — WidgetType (abordagem alternativa, nao usada no fluxo principal)
- **Total novo: ~405 linhas** (91% menos codigo que o removido)
- Adicionou dependencias CM6: `@codemirror/state` ^6.5.2, `@codemirror/view` ^6.37.2
- Novos config files: `.editorconfig`, `.eslintrc`, `.eslintignore`, `.npmrc`, `.hotreload`
- Demo vault com `hot-reload` e `obsidian42-brat` pra development workflow
- Demo note `2025-06-24_v20-cm6-integration/test-note.md` com frontmatter `type: project`
- Template `demo/templates/test-template.md` com sintaxe `{{variable}}`

### Arquitetura CM6 — Os 3 primitivos

**1. StateField (`mirrorState.ts`)**
- `StateField.define<MirrorState>()` — armazena estado reativo: `{ enabled, templatePath, frontmatter }`
- `create()` retorna estado inicial. `update()` reage a transacoes e effects.
- `StateEffect.define<T>()` — define canais de comunicacao tipados:
  - `toggleWidgetEffect` (boolean) — liga/desliga o widget
  - `updateTemplateEffect` ({templatePath}) — muda o template
- **Pattern:** Effects sao dispatched de fora (main.ts), StateField reage. E o "Redux do CM6".
- `parseFrontmatter()` — parser YAML manual via regex + split. Simples mas funcional pra MVP.

**2. ViewPlugin (`mirrorViewPlugin.ts`)**
- `ViewPlugin.fromClass(class { ... })` — plugin que vive no DOM do editor
- `constructor(view: EditorView)` — recebe referencia ao editor. Usa `setTimeout(100)` pra DOM estabilizar.
- `update(update: ViewUpdate)` — chamado em TODA transacao. Compara state via `JSON.stringify` pra decidir se atualiza.
- **DOM strategy:** cria `<div>` FORA do editor (`parent.insertBefore(container, editorDOM)`). Nao usa decorations — manipula DOM diretamente.
- `MarkdownRenderer.renderMarkdown(content, el, sourcePath, component)` — renderiza markdown processado dentro do widget.
- Template variables: `{{key}}` substituido por `frontmatter[key]` via regex.
- Botao fechar: dispatch `toggleWidgetEffect.of(false)` pra desligar via state.
- `destroy()` — chamado quando plugin e removido. Limpa o DOM.

**3. WidgetType (`mirrorWidget.ts`)**
- `WidgetType` — abordagem alternativa pra renderizar inline via decorations
- `eq(other)` — CM6 usa pra decidir se recria o widget. Compara `templatePath` e `position`.
- `toDOM(view)` — retorna HTMLElement. Nao e async, entao `renderTemplate` e fire-and-forget.
- `contentEditable = 'false'` — previne que o cursor entre no widget.
- **NAO esta wired no fluxo principal** — o ViewPlugin faz o trabalho. WidgetType existe como exploracao.

### Como main.ts orquestra

1. `onload()` registra 3 event listeners: `editor-change`, `file-open`, `active-leaf-change`
2. `iterateAllLeaves()` configura editores ja abertos (startup)
3. `setupEditor(view)`:
   - Acessa CM6 via `view.editor.cm` (com `@ts-ignore`)
   - Checa se ja tem extensions: `cm.state.field(mirrorStateField, false)`
   - Se nao: `StateEffect.appendConfig.of([mirrorStateField, viewPlugin])` — injeta extensions dinamicamente
   - Sempre: le frontmatter via `metadataCache`, dispatch `toggleWidgetEffect` baseado em `type === 'project'`

### Padroes Obsidian API + CM6

- **`view.editor.cm`** — acesso ao EditorView do CM6. NAO e API publica (precisa `@ts-ignore`). E o unico caminho pra injetar extensions em runtime.
- **`StateEffect.appendConfig.of([])`** — adiciona extensions a um editor ja criado. Alternativa seria `registerEditorExtension()` no Plugin, mas esse metodo registra pra TODOS os editores. `appendConfig` permite per-editor.
- **`cm.state.field(fieldRef, false)`** — segundo argumento `false` = retorna undefined em vez de throw se o field nao existe. Essencial pra checar "ja configurei este editor?".
- **`metadataCache.getFileCache(file)?.frontmatter`** — forma correta de ler YAML. Usa o cache do Obsidian, nao re-parseia o arquivo.
- **`MarkdownRenderer.renderMarkdown()`** — renderiza markdown dentro de um HTMLElement. 4o argumento e o Component (plugin) pra lifecycle management.
- **`this.app.workspace.iterateAllLeaves()`** — itera todas as leaves abertas. Necessario no onload() pra configurar editores que ja estavam abertos antes do plugin carregar.

### CSS da Era 4
- **Completamente novo** — zero classes das Eras anteriores
- `.cm-mirror-ui-line` — `pointer-events: none` pra nao interferir com edicao
- `.mirror-ui-line-widget` — `pointer-events: auto !important` pra permitir cliques no widget
- Seletores filhos: `button`, `input`, `a` tem `pointer-events: auto` + `user-select: auto`
- Animacao `fadeIn` com `translateY(-10px)` — widget entra deslizando de cima
- **Pattern:** widgets CM6 precisam de gerenciamento explicito de `pointer-events` porque o editor intercepta todos os eventos por default.

### Erros / Anti-patterns
- **`JSON.stringify` pra comparacao de state** — O(n) em cada transacao. Em arquivos grandes com muitas transacoes, pode ser lento. Ideal seria comparacao shallow ou memoizacao.
- **`setTimeout(50)` e `setTimeout(100)`** — timings magicos pra "esperar o DOM". Fragil — pode falhar em maquinas lentas ou com muitas tabs. Pattern melhor: `requestAnimationFrame` ou `queueMicrotask`.
- **Parser YAML manual** — `line.split(':')` quebra em valores com `:` (ex: URLs). Funcional pra MVP mas vai falhar com YAML complexo. Obsidian ja parseia YAML — deveria usar `metadataCache` em vez de re-parsear.
- **Template path hardcoded** — `'templates/test-template.md'` no `create()` do StateField. Funciona pro teste mas precisa vir de settings/frontmatter.
- **`manifest.json` ainda diz "Sample Plugin"** — nao foi atualizado pra Mirror Notes. Inofensivo mas indica que o dev focou na funcionalidade, nao nos metadados.
- **WidgetType nao wired** — `mirrorWidget.ts` existe mas nao e usado. Codigo morto ja no primeiro commit da era. O dev explorou duas abordagens (ViewPlugin vs WidgetType) e escolheu ViewPlugin, mas nao removeu a alternativa.
- **`activeEditors` Map nunca usado** — declarado em `main.ts` mas nenhum metodo adiciona/le. Provavel resquicio de uma estrategia de tracking abandonada.
- **Inline styles no ViewPlugin** — `this.container.style.cssText = ...` em vez de usar classes CSS. O `styles.css` define `.mirror-ui-widget` mas o ViewPlugin usa a classe `.mirror-ui-widget` apenas no className sem depender do CSS (estilos inline sobrescrevem).

### Significado Arquitetural
Este commit e o **maior ponto de inflexao do projeto**. O dev:
1. **Deletou 4,601 linhas** — todo o trabalho das Eras 2-3 (settings models, utils, suggest)
2. **Reconstruiu com 405 linhas** — 91% menos codigo, usando primitivos CM6
3. **Mudou de paradigma:** de "plugin que manipula DOM via Obsidian API" pra "extensao CM6 que vive dentro do editor"
4. **Escolheu ViewPlugin sobre WidgetType** — ViewPlugin manipula DOM diretamente fora do editor, WidgetType usa decorations inline. ViewPlugin da mais controle sobre posicionamento.

O gap de 220 dias (Nov 2024 → Jun 2025) sugere estudo profundo de CM6 antes de implementar. O resultado e codigo mais enxuto e idiomatico que todo o acumulado das eras anteriores.

### Tabela de Evolucao

| Era | Commits | Linhas (pico) | Abordagem | Resultado |
|-----|---------|---------------|-----------|-----------|
| 1 (Jun-Jul 2024) | v1-v10 | ~800 | DOM manipulation via Obsidian API | Toolbar + rendering basico |
| 2 (Jul-Aug 2024) | v11-v18 | ~4,600 | Settings iteration (7 arquivos) | Data model + UI completa |
| 3 (Nov 2024) | v19 | ~2,500 | CSS cleanup | Remove premature styling |
| 4 (Jun 2025) | v20 | ~405 | CM6 StateField + ViewPlugin | Rewrite completo, -91% codigo |

### Aprendizado
> **Rewrite > iterate quando o paradigma muda.** O dev passou 12 commits (v7-v19) iterando sobre DOM manipulation + settings models. Quando decidiu usar CM6, deletou tudo e recomeou com 91% menos codigo. O novo codigo resolve o mesmo problema (renderizar templates em project notes) de forma mais limpa porque usa os primitivos certos (StateField, ViewPlugin) em vez de lutar contra o DOM.

> **StateField + StateEffect e o padrao central de CM6.** State define O QUE mostrar, Effects sao o COMO comunicar mudancas, ViewPlugin e o ONDE renderizar. Separar estado de rendering e o que permite que 405 linhas facam o trabalho de 4,601.

> **`StateEffect.appendConfig` vs `registerEditorExtension`:** appendConfig permite per-editor customization. registerEditorExtension aplica pra TODOS os editores. Pra plugins que so atuam em certos arquivos (type: project), appendConfig e mais preciso.

> **Explore antes de commitar a WidgetType vs ViewPlugin.** O dev criou ambos (`mirrorWidget.ts` e `mirrorViewPlugin.ts`) no mesmo commit. ViewPlugin venceu porque permite DOM fora do editor (inserir ANTES do content area), enquanto WidgetType so funciona inline dentro do texto. Mas o arquivo morto ficou — em producao, deletaria.

---

## Commit 21: Settings + v1.1.0 (v21 — 2025-06-24 16:54)
**SHA:** `11b0322` | **Build:** success | **MAJOR RELEASE** | **Gap: ~15 horas desde v20**

### O que fez
- **Settings UI completa reconectada ao CM6** — settings.ts (671 linhas) com `MirrorUIPluginSettings`, `DEFAULT_SETTINGS`, `MirrorUISettingsTab`
- **Manifest rebrandado**: id `sample-plugin` → `mirror-notes`, name → `Mirror Notes`, version → `1.1.0`
- **Autocomplete infra restaurada**: `utils/file-suggest.ts` (FileSuggest, FolderSuggest, YamlPropertySuggest), `utils/suggest.ts` (TextInputSuggest base)
- **YAMLSuggest.ts** — suggester standalone pra YAML properties
- **mirrorState.ts reescrito** (de 68 → 558 linhas): agora inclui matching logic, WidgetType integrado, decorations via `provide`
- **mirrorViewPlugin.ts removido** — ViewPlugin eliminado, tudo via StateField + Decoration
- **mirrorWidget.ts removido** — substituido por `MirrorTemplateWidget` dentro de mirrorState.ts
- **main.ts expandido** (de 94 → 194 linhas): metadataCache sync, user interaction tracking, settings change detection, debounce
- **Referencia files**: `Settings_REFERENCIA.ts`, `styles_REFERENCIA.css`, `main_REF.js` — snapshots pra consulta
- **styles.css reescrito** (de 49 → 332 linhas): CSS de settings UI + widget positioning + performance CSS
- **Dependencia**: `@popperjs/core` adicionado (positioning)
- **Hot-reload removido** de demo vault, brat removido

### Mudanca Arquitetural: ViewPlugin → StateField + Decorations
No v20, o widget era renderizado por um **ViewPlugin** que manipulava DOM diretamente fora do editor (`parent.insertBefore`). No v21, isso foi **completamente substituido**:

1. **StateField agora faz tudo**: mirrorState + matching + decorations
2. **`provide: field => EditorView.decorations.from(field, ...)`** — o StateField fornece decorations diretamente ao CM6
3. **`Decoration.widget({ widget, block: true, side })`** — widgets injetados via decoration system, nao DOM manual
4. **Posicao `side: 0`** = antes da posicao (top), **`side: 1`** = depois (bottom)
5. **`BottomSpacerWidget`** — widget auxiliar pra espacamento no bottom

**Por que a mudanca?** ViewPlugin + DOM manual tinha problemas:
- Widgets "orfaos" quando o editor era recriado
- Sem integracao com o sistema de transacoes do CM6
- Posicionamento fragil (dependia de `parentElement`)

Decorations via StateField resolve isso porque o CM6 gerencia o lifecycle dos widgets automaticamente.

### Settings Data Model (reconectado)
```typescript
interface MirrorUIPluginSettings {
  enable_getting_started: boolean;
  global_settings: boolean;           // toggle global mirror
  enable_global_live_preview_mode: boolean;
  global_settings_live_preview_note: string;  // path do template
  global_settings_live_preview_pos: string;   // top|bottom|left|right
  enable_global_preview_mode: boolean;
  global_settings_preview_note: string;
  global_settings_preview_pos: string;
  global_settings_overide: boolean;
  global_settings_hide_props: boolean;
  customMirrors: CustomMirror[];
}

interface CustomMirror {
  id: string;                         // crypto.randomUUID()
  name: string;
  filterFiles: FolderTemplate[];      // match por filename
  filterFolders: FolderTemplate[];    // match por folder path
  filterProps: FolderTemplate[];      // match por YAML property
  // + toggles/paths pra live preview e reading mode
}
```

### Matching Logic (`getApplicableConfig`)
1. **Custom mirrors primeiro** — itera `customMirrors[]`, checa `filterFiles`, `filterFolders`, `filterProps`
2. **Global mirror fallback** — se nenhum custom match, usa global (se habilitado)
3. **Override logic** — custom mirror com `custom_settings_overide` + global com `global_settings_overide` permite que custom sobrescreva global
4. Retorna `ApplicableMirrorConfig { templatePath, position, hideProps }` ou `null`

### Caching Strategy
- **`widgetInstanceCache`** (Map) — reutiliza instancias de `MirrorTemplateWidget` por widgetId
- **`MirrorTemplateWidget.domCache`** (static Map) — reutiliza HTMLElements por cacheKey
- **`MirrorTemplateWidget.lastRenderedContent`** (static Map) — evita re-render se conteudo nao mudou
- **`lastWidgetId` + `lastDecorations`** — cache de DecorationSet, retorna cached se widgetId nao mudou
- **Content hash**: compara processedContent string pra evitar re-render

### Comunicacao Plugin ↔ CM6
- **`(window as any).mirrorUIPluginInstance = this`** — referencia global pro StateField acessar o plugin
- **`forceMirrorUpdateEffect`** — novo Effect pra forcar re-criacao do widget (usado por settings changes e metadataCache)
- **`metadataCache.on('changed')`** — dispara update quando YAML muda, com debounce 500ms + user interaction check (1s cooldown)
- **`vault.on('modify')` pra `data.json`** — detecta mudancas nas settings, broadcast update pra todos os editores
- **`registerDomEvent(document, 'keydown/mousedown')`** — tracking de ultima interacao do usuario

### Padroes Obsidian API
- **`addSettingTab(new SettingsTab(app, plugin))`** — registra aba de configuracoes
- **`loadData()` / `saveData()`** — persiste settings em `data.json`
- **`crypto.randomUUID()`** — ID unico pra cada custom mirror
- **`Setting.addSearch(cb => new FileSuggest(app, cb.inputEl))`** — integra autocomplete no search input do Setting component
- **`Setting.addDropdown(cb => cb.addOption(...))`** — dropdown nativo pra posicao
- **`Setting.addExtraButton(cb => cb.setIcon("cross"))`** — botoes de acao (delete, move up/down, collapse)
- **`containerEl.createEl("div", { cls: "..." })`** — criacao de DOM com classes via API do Obsidian
- **`this.display()`** — re-renderiza settings UI inteira (pattern de "full refresh")

### CSS da Era 4 (v21)
**3 camadas de CSS:**
1. **Widget CSS** (novo): `.mirror-ui-widget`, `.mirror-position-top`, `.mirror-position-bottom`, `.mirror-bottom-spacer`
2. **Settings UI CSS** (restaurado do v18): `.mirror-plugin-banner`, `.mirror-card`, `.global-mirror-settings`, `.mirror-separator`
3. **Performance CSS** (novo): `contain: layout style paint`, `will-change: auto`, `backface-visibility: hidden`, `transform: translateZ(0)`, `transition: none !important`, `animation: none !important`

**CSS Containment (`contain: layout style paint`)** — diz ao browser que o widget nao afeta o layout externo. Crucial pra performance em editors com muitas linhas.

### Erros / Anti-patterns
- **`(window as any).mirrorUIPluginInstance`** — global mutable state. Funciona mas e fragil: se dois plugins usarem o mesmo pattern, colisao. Alternativa: passar plugin ref via facet ou context.
- **`file.path === '.obsidian/plugins/sample-plugin/data.json'`** — hardcoded path com ID ERRADO (sample-plugin, nao mirror-notes). Settings change detection NAO funciona.
- **Settings UI faz `this.display()` em quase todo onChange** — re-renderiza a pagina inteira de settings a cada toggle. Lento com muitos custom mirrors. Ideal: atualizar apenas o componente afetado.
- **`JSON.stringify` pra comparacao de frontmatter** — mesmo problema do v20, O(n) em cada transacao.
- **`.sobe { margin-top: -1000px; }`** — classe de debug do v18 voltou no CSS
- **`backface-visibility: hidden` + `perspective: 1000px` + `transform: translateZ(0)` em TODOS os filhos** — GPU compositing forcado em cada elemento. Pode causar problemas de memoria em widgets complexos.
- **`MirrorTemplateWidget.destroy()` limpa cache** — mas no v22 isso muda pra NAO limpar (comparar).
- **BottomSpacerWidget** — widget auxiliar so pra adicionar espaco antes do widget bottom. Hack visual.
- **Content comparison via string equality** — `lastContent === processedContent` compara string inteira do template processado. Funciona mas e O(n) no tamanho do template.

### Aprendizado
> **StateField.provide(decorations) > ViewPlugin + DOM manual.** O v20 usou ViewPlugin pra inserir DOM fora do editor. O v21 mudou pra decorations via StateField. A diferenca: CM6 gerencia o lifecycle dos widgets automaticamente — sem widgets orfaos, sem cleanup manual, sem race conditions de DOM.

> **Matching logic deve viver FORA do StateField.** `getApplicableConfig()` e uma funcao pura que recebe plugin+file+frontmatter e retorna config. O StateField chama ela no `create/update`. Separar matching de state management mantém o StateField limpo.

> **Debounce em multiplas camadas e necessario.** O v21 tem debounce em: (1) metadataCache → 500ms, (2) settings change → 500ms, (3) StateField update → 50ms, (4) user interaction check → 1s cooldown. Sem isso, cada keystroke causaria re-render do widget.

> **`window` como canal de comunicacao** entre Plugin e StateField e um hack necessario porque StateField.create() nao recebe argumentos customizados. O CM6 nao fornece um mecanismo limpo pra injetar dependencias em StateFields.

---

## Commit 22: Posicionamento (v22 — 2025-06-24 17:43)
**SHA:** `79bd067` | **Build:** success | **Gap: ~49 minutos desde v21**

### O que fez
- **mirrorState.ts expandido** (de 558 → 657 linhas): orphan cleanup, forced update handling reescrito, frontmatterHash, renderingPromises
- **main.ts melhorado** (de 194 → 238 linhas): orphan cleanup no setupEditor, onunload completo, config path corrigido
- **settings.ts expandido** (de 671 → 679 linhas): `updateAllEditors()` com setTimeout(100)
- **Config path corrigido**: `'.obsidian/plugins/sample-plugin/data.json'` → `manifest.id` dinamico

### Mudancas Chave

**1. Orphan Widget Cleanup**
Problema do v21: widgets antigos ficavam no DOM quando o estado mudava (ex: mudar posicao top→bottom deixava o widget top).
Solucao v22: `cleanOrphanWidgets(view)` — funcao que compara `data-widget-id` no DOM com o `widgetId` ativo no state. Remove qualquer widget cujo ID nao corresponde.
Chamado em 3 pontos: `toDOM()` do widget, `setupEditor()` do main, `onunload()` global.

**2. Forced Update Reescrito**
v21: forced update limpava TUDO e recriava (cache global clear).
v22: forced update **incondicional** — sempre recria widget com `generateWidgetId()`, mas limpa apenas caches do widget antigo (nao global). Adiciona:
- `lastForcedUpdateMap` — throttle de 1 forced update por segundo por arquivo
- `frontmatterHash` — hash do frontmatter pra detectar mudancas reais (evita re-render quando frontmatter nao mudou)
- `renderingPromises` — previne renders concorrentes no mesmo widget

**3. StateField agora retorna `MirrorFieldState`**
v21: `StateField.define<MirrorState>` + `mirrorDecorations` separado via `EditorView.decorations.compute()`
v22: `StateField.define<MirrorFieldState>` = `{ mirrorState: MirrorState, decorations: DecorationSet }`
- `decorations.map(tr.changes)` — mapeia decorations atraves de mudancas de texto (padrao CodeMarker)
- `provide: field => EditorView.decorations.from(field, state => state.decorations)` — fornece decorations diretamente

**Por que?** No v21, decorations eram recomputadas via `EditorView.decorations.compute()` que e chamado em TODA transacao. No v22, decorations sao mapeadas (`map(tr.changes)`) e so reconstruidas quando realmente necessario. Muito mais eficiente.

**4. onunload() Completo**
v21: limpava activeEditors e timeouts.
v22: 6 passos de cleanup:
1. Remove todos `.mirror-ui-widget` do DOM global
2. `StateEffect.reconfigure.of([])` em todos os editores — limpa extensions CM6
3. Chama `mirrorUICleanup()` global — limpa caches de widgets
4. Limpa activeEditors
5. Limpa timeouts
6. Deleta referencia global

**5. widgetId Logic Refinada**
v21: `generateWidgetId()` em qualquer mudanca de config.
v22: novo ID **apenas se posicao mudou** (`positionChanged ? generateWidgetId() : value.widgetId`). Evita recriacao desnecessaria quando so o template ou hideProps muda.

**6. Widget destroy() nao limpa cache**
v21: `destroy()` limpava `domCache` e `lastRenderedContent`.
v22: `destroy()` e no-op (comentado). Cache e mantido pra reuso. Garbage collection natural.

### Padroes CM6
- **`decorations.map(tr.changes)`** — CRUCIAL. Quando texto muda, as posicoes das decorations mudam. `map()` ajusta as posicoes automaticamente sem recalcular tudo. E o padrao idiomatico do CM6 (usado pelo CodeMarker e outros plugins oficiais).
- **`StateEffect.reconfigure.of([])`** — remove TODAS as extensions de um editor. Usado no onunload pra cleanup. Agressivo mas eficaz.
- **frontmatter region detection via `iterChangedRanges`** — em vez de re-parsear todo o YAML em cada keystroke, verifica se a mudanca esta dentro da regiao do frontmatter (`fromA <= frontmatterEndPos + 50`). Buffer de 50 chars pra cobrir edge cases.

### CSS Additions
- **`.mirror-position-bottom`** — `contain: layout style paint`, `pointer-events: none`, children com `pointer-events: auto`
- **`.mirror-position-top`** — `min-height: 100px` pra evitar layout shifts
- **`.cm-line:has(.mirror-ui-widget)`** — `display: block !important`, `min-height: auto` — forca a linha que contem o widget a ser block-level
- **`scroll-margin: 0; scroll-padding: 0;`** — previne scroll jumps quando widget aparece

### Erros / Anti-patterns
- **`StateEffect.reconfigure.of([])`** no onunload — remove TODAS as extensions, nao so as do Mirror Notes. Pode quebrar outros plugins CM6 que tenham extensions no mesmo editor.
- **`cleanOrphanWidgets` busca no DOM direto** — `view.dom.querySelectorAll('.mirror-ui-widget')` e O(n) no numero de widgets. Funcional pro caso de uso (poucos widgets) mas nao escala.
- **Console.log extensivo** — muitos logs de debug em producao. Deveria ser removido ou condicionado a um flag `DEBUG`.
- **Caches nunca sao limpos naturalmente** — `domCache`, `lastRenderedContent`, `widgetInstanceCache`, `fileDebounceMap`, `lastForcedUpdateMap` crescem indefinidamente durante a sessao. So limpam em forced update ou unload.
- **`contain: layout style paint` + `overflow: hidden` no `.mirror-ui-widget`** — pode cortar conteudo que precisa de overflow (dropdowns, tooltips, popups dentro do widget).

### Tabela de Evolucao (Era 4)

| Versao | Linhas (mirrorState) | Abordagem Widget | Debounce | Orphan Cleanup |
|--------|---------------------|-----------------|----------|----------------|
| v20 | 68 | ViewPlugin (DOM manual) | Nenhum | Nenhum |
| v21 | 558 | StateField + Decoration.compute() | 50ms + 500ms metadata | Nenhum |
| v22 | 657 | StateField + Decoration.map() + provide | 500ms + per-file + 1s forced | cleanOrphanWidgets() |

### Aprendizado
> **`decorations.map(tr.changes)` e fundamental pra performance.** No v21, decorations eram recalculadas em toda transacao. No v22, sao mapeadas — posicoes ajustadas automaticamente. So recalcula quando o estado realmente muda. E a diferenca entre O(n) por keystroke e O(1) na maioria dos casos.

> **Orphan widgets sao o pesadelo de plugins CM6.** Cada vez que o estado muda e um novo widget e criado, o antigo pode ficar no DOM. O v22 resolve com cleanup explicito em 3 pontos (toDOM, setupEditor, onunload). Sem isso, mudar posicao top→bottom deixava dois widgets visiveis.

> **`StateEffect.reconfigure.of([])` e uma arma nuclear.** Remove TODAS as extensions, nao so as suas. Use com cuidado no onunload — idealmente, deveria remover apenas as extensions que o plugin adicionou. Mas CM6 nao oferece uma API limpa pra "remover apenas minhas extensions".

> **Forced updates precisam de throttling.** Sem o `lastForcedUpdateMap` (1s cooldown), uma settings UI que chama `updateAllEditors()` em cada toggle causaria dezenas de forced updates por segundo. Cada forced update limpa caches e recria widgets — sem throttle, o editor trava.

> **49 minutos entre v21 e v22** — o dev encontrou os bugs de posicionamento testando v21 e corrigiu imediatamente. Mostra que demo vault + hot-reload permite ciclo de feedback ultra-rapido.

---

## Commit 23: Modularizacao (v23 — 2025-06-24 18:09)
**SHA:** `3551021` | **Build:** success | **Gap: ~26 minutos desde v22**

### O que fez
- **Split do monolito `mirrorState.ts`** em 4 modulos focados:
  - `mirrorTypes.ts` (22 linhas) — interfaces: `ApplicableMirrorConfig`, `MirrorState`, `MirrorFieldState`
  - `mirrorConfig.ts` (53 linhas) — `getApplicableConfig()` com override logic reescrita
  - `mirrorDecorations.ts` (100 linhas) — `buildDecorations()`, `cleanOrphanWidgets()`, `HideFrontmatterWidget`
  - `mirrorUtils.ts` (38 linhas) — `parseFrontmatter()`, `hashObject()`, `generateWidgetId()`
- **`mirrorWidget.ts` reescrito** (de 70 → 165 linhas) — agora contem `MirrorTemplateWidget` completo (antes estava em mirrorState.ts)
- **`mirrorState.ts` reduzido** (de 657 → 547 linhas) — ainda contem StateField + effects + caches + update logic
- **Pasta `backup/`** criada com copias pre-refactor de todos os arquivos (main.ts, settings.ts, mirrorState.ts, mirrorViewPlugin.ts, mirrorWidget.ts, styles.css, utils, refs)
- **`backup/README.md`** — README completo do plugin com features, installation, usage
- **main.ts cleanup** — removeu import de `MirrorState` (nao usado), moveu log pra dentro de `onload()`
- **parseFrontmatter melhorado** — agora processa listas YAML (linhas com `-`) adicionando ao array `tags`
- **HideFrontmatterWidget** — novo widget que usa `Decoration.replace()` pra esconder frontmatter (antes usava `Decoration.line` com `display: none`)

### Nova Estrutura de Arquivos
```
src/editor/
  mirrorTypes.ts       — interfaces (22 linhas)
  mirrorConfig.ts      — matching logic (53 linhas)
  mirrorDecorations.ts — decoration building + orphan cleanup (100 linhas)
  mirrorUtils.ts       — parsers + hash + ID generation (38 linhas)
  mirrorWidget.ts      — MirrorTemplateWidget (165 linhas)
  mirrorState.ts       — StateField + effects + update logic (547 linhas)
```

**Total src/editor/: 925 linhas** (vs 657 linhas monoliticas no v22)
- Aumento de ~40% em linhas mas agora cada modulo tem responsabilidade unica

### Mudancas de Logica

**1. Override Logic Reescrita (`mirrorConfig.ts`)**
v22: logica inline no StateField com `hasOverridingCustomMirror` check
v23: funcao separada com 4 passos claros:
1. Encontra custom mirror aplicavel
2. Verifica se global mirror esta ativo
3. **Logica de prioridade:**
   - Se global NAO tem "Replace custom Mirrors" → custom sempre vence
   - Se global TEM "Replace custom Mirrors" → so custom com `custom_settings_overide` vence
4. Se nenhum custom venceu, aplica global (se ativo)

**2. HideFrontmatterWidget — nova abordagem**
v22: `Decoration.line({ attributes: { style: 'display: none;' } })` — aplica `display: none` por LINHA
v23: `Decoration.replace({ widget: new HideFrontmatterWidget() })` — SUBSTITUI o range inteiro do frontmatter por um widget invisivel (`span` com `display: none`)

**Por que?** `Decoration.replace` e mais limpo porque remove o conteudo do DOM em vez de so esconder com CSS. Tambem evita problemas com lines que tem `display: none` mas ainda ocupam espaco no layout do CM6.

`HideFrontmatterWidget` implementa todos os metodos opcionais de WidgetType:
- `eq()` — singleton comparison
- `updateDOM()` → false (nunca precisa atualizar)
- `estimatedHeight` → 0 (nao ocupa espaco)
- `lineBreaks` → 0
- `ignoreEvent()` → true (nao processa eventos)
- `destroy()` — no-op

**3. Codigo Morto Mantido**
`mirrorState.ts` ainda contem:
- `getApplicableConfig2()` — versao antiga da funcao de matching (import da nova `getApplicableConfig` coexiste)
- `MirrorTemplateWidget` class duplicada — existe tanto em `mirrorState.ts` (versao v22) quanto em `mirrorWidget.ts` (versao nova)
- `parseFrontmatter()` e `hashObject()` duplicados — existem em `mirrorState.ts` E em `mirrorUtils.ts`
- `cleanOrphanWidgets` importado de `mirrorDecorations.ts` mas a secao original no mirrorState.ts esta vazia (comentarios restam)

O dev copiou funcoes pra novos modulos mas nao removeu as originais de `mirrorState.ts`. Refactoring incompleto.

**4. Widget Instance Cache via `(MirrorTemplateWidget as any).widgetInstanceCache`**
Em `mirrorDecorations.ts`, o cache e acessado via cast pra `any`:
```typescript
let widget = (MirrorTemplateWidget as any).widgetInstanceCache?.get?.(widgetId);
```
Mas `widgetInstanceCache` e declarado em `mirrorState.ts` como variavel local, nao como static de `MirrorTemplateWidget`. O cast `as any` mascara o fato de que a property NAO existe na classe. Funciona em runtime porque JavaScript nao valida property access em `any`, mas retorna `undefined`.

### Erros / Anti-patterns
- **Duplicacao massiva** — ~300 linhas de codigo duplicado entre modulos novos e mirrorState.ts. Funcoes existem em 2 lugares.
- **`getApplicableConfig2`** — funcao morta. A versao "2" e a antiga, a sem numero (de mirrorConfig.ts) e a nova. Mas o StateField importa a nova — a "2" e dead code.
- **`backup/` no repo** — 6,785 linhas adicionadas, maioria em copias de referencia. Em producao, isso estaria em `.gitignore` ou em branches separadas.
- **`(MirrorTemplateWidget as any).widgetInstanceCache`** — acessa property inexistente. Cache nao funciona como esperado — sempre cria novo widget.
- **parseFrontmatter com hardcoded `tags`** — lista YAML (linhas com `-`) sao sempre atribuidas a `result.tags`. Se o frontmatter tiver uma lista sob outra key (ex: `aliases:`), os itens vao parar em `tags`. Parser YAML ainda e ingênuo.
- **`MirrorTemplateWidget` em mirrorState.ts usa `cleanOrphanWidgets` importado** — cria circular dependency potencial (mirrorState → mirrorDecorations → mirrorState). Funciona porque o import e lazy no runtime, mas e um smell.

### Aprendizado
> **Modularizar e bom, mas precisa completar o refactoring.** O v23 extraiu funcoes pra modulos dedicados mas nao removeu os originais. Resultado: codigo duplicado, imports circulares potenciais, e confusao sobre qual versao esta ativa. A regra e simples: move + delete, nunca move + keep.

> **`Decoration.replace()` > `Decoration.line()` pra esconder conteudo.** Line decorations com `display: none` escondem visualmente mas o conteudo ainda existe no DOM do CM6 (afeta cursor, selection, etc). `Decoration.replace()` substitui o range por um widget — o CM6 trata como se o conteudo nao existisse.

> **26 minutos entre v22 e v23** — o dev esta em modo flow. 3 commits em ~1.5 horas (v21→v22→v23). Modularizacao feita "no embalo" da reescrita, sem pausar pra limpar o codigo antigo. Divida tecnica acumulada por velocidade.

> **Backup dirs no repo indicam medo de perder referencia.** Em vez de confiar no git (`git log`, `git diff`, `git show`), o dev copia arquivos pra `backup/`. Funciona como safety net mas polui o repo. O git JA e o backup.

---

## Commit 24: Fix YAML (v24 — 2025-06-24 21:24)
**SHA:** `d2fb6f8` | **Build:** success | **Gap: ~3 horas desde v23**

### O que fez
- **Settings toggle bug fix** — "Hide properties" e "Replace custom Mirrors" estavam com bindings TROCADOS:
  - "Hide properties" lia/escrevia `global_settings_overide` (errado) → agora usa `global_settings_hide_props` (certo)
  - "Replace custom Mirrors" lia/escrevia `global_settings_hide_props` (errado) → agora usa `global_settings_overide` (certo)
- **parseFrontmatter melhorado** (mirrorState.ts) — processa listas YAML (`- item`), usa `trimmedLine`, pula linhas vazias
- **mirrorConfig.ts reescrito** — override logic com 4 passos claros (identico ao que ja existia em mirrorConfig.ts no v23, agora sincronizado no mirrorState.ts tambem)
- **mirrorDecorations.ts expandido** (de 100 → 172 linhas) — `HideFrontmatterWidget` adicionado, `Decoration.replace()` pra esconder frontmatter, logica separada pra hideProps ativo vs inativo
- **Debug logging extensivo** — ~15 console.logs novos em mirrorWidget.ts e mirrorDecorations.ts
- **Demo notes**: `test-note.md` com test plan detalhado, `teste yaml.md` com YAML list syntax

### Bug dos Toggles Trocados
Este e um bug classico de copy-paste. No settings.ts do v21, os toggles "Hide properties" e "Replace custom Mirrors" foram criados em sequencia. O dev copiou o bloco do primeiro pra fazer o segundo, mas esqueceu de trocar as variaveis. Resultado: ativar "Hide properties" na verdade ativava override, e vice-versa.

**Impacto:** qualquer usuario que testasse o plugin desde v21 teria comportamento invertido nessas duas funcionalidades. O dev provavelmente so descobriu 3 horas depois (gap v23→v24) ao testar mais a fundo.

### Sincronizacao mirrorConfig.ts ↔ mirrorState.ts
No v23, `mirrorConfig.ts` tinha a override logic reescrita (4 passos), mas `mirrorState.ts` ainda tinha a versao antiga (`getApplicableConfig2`). No v24, ambos estao sincronizados. **Mas `getApplicableConfig2` (dead code) continua em mirrorState.ts** — refactoring ainda incompleto.

### HideFrontmatterWidget agora em mirrorDecorations.ts
No v23, `HideFrontmatterWidget` ja existia em mirrorDecorations.ts MAS `buildDecorations()` ainda usava `Decoration.line({ display: none })`. No v24, `buildDecorations()` finalmente usa `Decoration.replace({ widget: new HideFrontmatterWidget() })`.

A logica de posicionamento do widget agora e:
```
if (hideProps && hasFrontmatter):
  1. Decoration.replace(frontmatter range) → esconde frontmatter
  2. if position == 'top': widget DEPOIS do frontmatterEnd
  3. if position == 'bottom': widget no docLength
else:
  1. if position == 'top': widget no frontmatterEndPos
  2. if position == 'bottom': widget no docLength
```

### Known Bug (documentado no commit message)
**`filterProps` matching usa `===` que falha pra arrays.** Quando o frontmatter tem `tags: [tag1, tag2]`, o parser retorna `result.tags = ["tag1", "tag2"]`. Mas o matching faz `frontmatter[p.folder] === p.template` que compara array com string — sempre false. Pra filterProps funcionar com listas, precisaria de `Array.isArray` check + `.includes()`.

### Erros / Anti-patterns
- **Console.log duplicado em updateAllEditors** — `console.log('[MirrorNotes] Settings changed, forcing update on all editors')` aparece 2x (uma original, uma "temporaria" que ficou)
- **Dead code persistente** — `getApplicableConfig2()` e `MirrorTemplateWidget` duplicada em mirrorState.ts ainda nao foram removidos
- **~15 console.logs de debug adicionados** — poluicao de console em producao. Sem flag DEBUG pra controlar.
- **`(MirrorTemplateWidget as any).widgetInstanceCache`** — mesmo bug do v23, property inexistente acessada via `any`. Cache de widget NUNCA funciona.
- **parseFrontmatter hardcoda listas em `tags`** — bug do v23 nao corrigido. Qualquer lista YAML (aliases, cssclasses, etc) vai parar em `result.tags`.

### Aprendizado
> **Copy-paste de UI components causa bugs de binding.** Os toggles "Hide properties" e "Replace custom Mirrors" usaram o mesmo template de Setting. O dev trocou labels e descs mas esqueceu de trocar as variaveis no `setValue/onChange`. Prevencao: extrair cada toggle pra uma funcao separada com parametros tipados, em vez de copiar blocos inteiros.

> **Bugs de binding so aparecem em teste manual.** Compilacao TypeScript nao detecta que `global_settings_overide` esta no toggle errado — ambos sao `boolean`, tipos compativeis. So testando no Obsidian o dev percebeu que "Hide properties" escondia as properties erradas.

> **3 horas de gap (v23→v24) sugere sessao de teste mais profunda.** Os commits anteriores tinham gaps de 26-49 minutos (modo flow). 3 horas indica que o dev parou, testou no Obsidian, encontrou os bugs (toggles, YAML parsing), e voltou pra corrigir.

> **Decoration.replace com range e a forma correta de esconder frontmatter em CM6.** `builder.add(start, end, Decoration.replace({ widget }))` substitui o range INTEIRO por um widget invisivel. O cursor pula o range, selection nao inclui o conteudo, e o CM6 nao renderiza as linhas. E semanticamente correto — o conteudo "nao existe" pra fins de edicao.

---

## Commit 25: Fix hideProps — FINAL VERSION (v25 — 2025-06-24 23:04)
**SHA:** `e9964fc` | **Build:** success | **ULTIMO COMMIT DO PROJETO** | **Gap: ~1.5 horas desde v24**

### O que fez
- **Abandonou `Decoration.replace` pra hideProps** — substituiu por abordagem CSS via toggle de classe
- **Novo metodo `updateHidePropsForView(view)`** em main.ts — adiciona/remove classe `.mirror-hide-properties` no `.view-content`
- **`HideFrontmatterWidget` removido** de mirrorDecorations.ts (33 linhas deletadas)
- **buildDecorations simplificado** — de ~120 linhas com branching hideProps/nao-hideProps pra ~35 linhas lineares. Widget SEMPRE adicionado da mesma forma, independente de hideProps.
- **Console.log duplicado removido** de settings.ts (adicionado por engano no v24)
- **settings.ts integrado** — `updateAllEditors()` agora chama `updateHidePropsForView()` apos dispatch
- **onunload expandido** (7 passos) — novo passo: remove `.mirror-hide-properties` de todos os elementos
- **styles.css expandido** (+113 linhas) — CSS pra hideProps, frontmatter hider com `:has()`, fallbacks, force-hide rules
- **README.md reescrito** — documentacao completa do plugin (features, installation, usage, architecture)

### Mudanca Arquitetural: Decoration.replace → CSS Class Toggle

**O arco do hideProps (v21→v25):**
1. **v21:** `Decoration.line({ attributes: { style: 'display: none' } })` — esconde por linha, CSS inline
2. **v23-v24:** `Decoration.replace({ widget: new HideFrontmatterWidget() })` — substitui range inteiro por widget invisivel
3. **v25:** CSS class toggle via `.mirror-hide-properties .metadata-container { display: none }` — abordagem Obsidian-native

**Por que o dev abandonou Decoration.replace?** O commit message diz: "was causing conflicts with widgets". Quando `Decoration.replace` esconde o frontmatter, ele muda as posicoes de TUDO depois dele no documento. Se o widget template esta posicionado "depois do frontmatter" (position: top), a posicao do widget muda quando o frontmatter e escondido/mostrado, causando flicker e widgets duplicados.

**A solucao CSS e elegante mas incompleta:**
```css
.view-content.mirror-hide-properties .metadata-container {
  display: none !important;
}
```
`.metadata-container` e o elemento do Obsidian que renderiza o frontmatter em Reading/Live Preview mode. Esconder ele via CSS nao afeta o CM6 — nenhuma decoration precisa mudar, nenhuma posicao recalcula.

**Known bug (documentado no commit):** O seletor CSS depende da presenca de `.metadata-container` no DOM. Em Source mode do Obsidian, o frontmatter e renderizado inline no editor (`.cm-line` elements), nao em `.metadata-container`. Entao hideProps funciona em Live Preview mas NAO em Source mode.

### updateHidePropsForView — como funciona
```typescript
updateHidePropsForView(view: MarkdownView) {
  const fieldState = cm.state.field(mirrorStateField, false);
  const shouldHide = fieldState.mirrorState.enabled && fieldState.mirrorState.config?.hideProps;
  const viewContent = view.containerEl.querySelector('.view-content');
  if (shouldHide) viewContent.classList.add('mirror-hide-properties');
  else viewContent.classList.remove('mirror-hide-properties');
}
```
Chamado em 4 pontos:
1. `metadataCache.on('changed')` — quando YAML muda
2. `vault.on('modify')` no data.json — quando settings mudam
3. `setupEditor()` com setTimeout(100) — quando editor e configurado
4. `updateAllEditors()` em settings.ts — quando qualquer setting muda

### CSS: 3 abordagens tentadas no mesmo arquivo
O styles.css do v25 tem TRES abordagens diferentes pra esconder frontmatter, indicando experimentacao:

**1. `:has()` com `data-lines` (CSS puro, nao usado no JS):**
```css
.cm-editor:has(.mirror-frontmatter-hider[data-lines="5"]) .cm-line:nth-of-type(-n+5) {
  display: none !important;
}
```
Gera regras pra 3-10 linhas. Ideia: inserir um widget com `data-lines` e deixar CSS esconder as primeiras N linhas. **Nao implementado no JS** — CSS existe mas nada cria `.mirror-frontmatter-hider`.

**2. Classe por linha (fallback sem `:has()`):**
```css
.cm-line.mirror-hidden-frontmatter-line {
  display: none !important;
}
```
**Tambem nao implementado no JS** — nenhum codigo adiciona essa classe.

**3. `.metadata-container` (a que funciona):**
```css
.view-content.mirror-hide-properties .metadata-container {
  display: none !important;
}
```
Unica abordagem conectada ao JS via `updateHidePropsForView()`.

As abordagens 1 e 2 sao residuos de experimentacao — o dev tentou varias formas e commitou todas.

### Simplificacao do buildDecorations
v24: 2 caminhos (hideProps ativo vs inativo), cada um com top/bottom
v25: 1 caminho unico — sempre top ou bottom, sem considerar hideProps

```typescript
// v25 — limpo
if (config.position === 'top') {
  builder.add(topPos, topPos, Decoration.widget({ widget, block: true, side: 0 }));
} else if (config.position === 'bottom') {
  builder.add(docLength, docLength, Decoration.widget({ widget, block: true, side: 1 }));
}
```

Sem `HideFrontmatterWidget`, sem `Decoration.replace`, sem branching. O unico papel de `buildDecorations` agora e posicionar o widget template.

### Erros / Anti-patterns
- **CSS dead code** — ~70 linhas de CSS pra abordagens nao implementadas (`:has()` + `data-lines`, `.mirror-hidden-frontmatter-line`, `.cm-widget.cm-replace`)
- **`.cm-line:not(.mirror-hidden-frontmatter-line) { display: block !important }`** — forca TODAS as linhas a serem `display: block`. Pode quebrar linhas especiais do CM6 que usam outros displays.
- **Known bug nao corrigido** — hideProps nao funciona em Source mode. O commit documenta isso mas nao resolve.
- **Dead code em mirrorState.ts** — `getApplicableConfig2`, `MirrorTemplateWidget` duplicada, `parseFrontmatter/hashObject` duplicados. NUNCA foram limpos desde v23.
- **`(MirrorTemplateWidget as any).widgetInstanceCache`** — bug do v23, still broken. Cache retorna undefined.
- **Todos os console.logs de debug do v24 permanecem** — nenhum removido.

### Tabela Final de Evolucao (Era 4 completa)

| Versao | Data | Linhas (editor/) | Focus | Gap |
|--------|------|-------------------|-------|-----|
| v20 | Jun 24 01:27 | 311 | CM6 skeleton (StateField + ViewPlugin + WidgetType) | 220 dias |
| v21 | Jun 24 16:54 | 1,523 | Settings + v1.1.0, ViewPlugin→Decorations | 15h |
| v22 | Jun 24 17:43 | 1,611 | Posicionamento, orphan cleanup, forced update | 49min |
| v23 | Jun 24 18:09 | 925* | Modularizacao (split em 6 arquivos) | 26min |
| v24 | Jun 24 21:24 | ~1,000 | Fix YAML, fix toggles, Decoration.replace | 3h |
| v25 | Jun 24 23:04 | ~900 | Fix hideProps, CSS approach, FINAL | 1.5h |

*v23 conta apenas os modulos novos, sem o dead code em mirrorState.ts

**Era 4 inteira em 1 dia** — 6 commits de 01:27 a 23:04 (~22 horas). O dev fez o rewrite completo, settings, posicionamento, modularizacao, e 2 rounds de bugfix em um unico dia.

### Estado Final do Plugin (v25)

**Funcionalidades:**
- Template rendering via CM6 Decoration.widget (top ou bottom)
- Settings UI com global mirror + custom mirrors (file/folder/property filters)
- Template variable substitution (`{{key}}` → frontmatter value)
- hideProps via CSS class toggle (funciona em Live Preview, nao em Source mode)
- File/folder/YAML autocomplete nos settings

**Arquitetura:**
- `main.ts` → lifecycle, event listeners, hideProps CSS toggle
- `settings.ts` → PluginSettingTab com UI completa
- `src/editor/mirrorState.ts` → StateField + effects + update logic (+ dead code)
- `src/editor/mirrorWidget.ts` → MirrorTemplateWidget (WidgetType)
- `src/editor/mirrorDecorations.ts` → buildDecorations (simplificado)
- `src/editor/mirrorConfig.ts` → getApplicableConfig (matching logic)
- `src/editor/mirrorTypes.ts` → interfaces
- `src/editor/mirrorUtils.ts` → parsers + hash (nao importado pelo mirrorState)

**Divida tecnica nao resolvida:**
- ~300 linhas de dead code em mirrorState.ts
- parseFrontmatter hardcoda listas em `tags`
- widgetInstanceCache broken (any cast)
- ~30 console.logs de debug
- ~70 linhas de CSS morto
- hideProps nao funciona em Source mode
- backup/ dir com 6,785 linhas

### Aprendizado
> **Decoration.replace conflita com Decoration.widget quando ambos afetam a mesma regiao.** Esconder frontmatter via `replace` muda as posicoes de TUDO depois. Se um widget esta posicionado relativo ao frontmatter end, ele se move quando o replace e aplicado/removido. CSS class toggle evita isso porque nao afeta o estado do CM6.

> **A hierarquia de abordagens pra esconder conteudo no Obsidian:**
> 1. CSS em `.metadata-container` (mais simples, so Live Preview)
> 2. `Decoration.replace` (mais correto, mas conflita com outros decorations)
> 3. `Decoration.line` com `display: none` (fragil, conteudo ainda existe no DOM)
> 4. CSS `:has()` com data attributes (elegante mas nao implementado)
> O dev tentou todas e acabou na mais simples.

> **6 commits em 22 horas = prototipagem acelerada.** O v20 comecou com 311 linhas e o v25 terminou com ~900 (+ dead code). O pico foi v21 com 1,523 linhas. O arco mostra: construir rapido (v20-v21), estabilizar (v22-v23), debuggar (v24-v25). A divida tecnica acumulada e o preco da velocidade.

> **O plugin funciona mas nao esta production-ready.** Dead code, bugs conhecidos, CSS morto, console.logs — tudo indica que e um MVP funcional. O dev priorizou "funciona" sobre "limpo". Pra publicar no community plugins, precisaria de um round de cleanup.
