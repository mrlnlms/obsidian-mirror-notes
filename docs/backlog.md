# Mirror Notes — Backlog

Features, melhorias e bugs. Atualizado na v27.

## Bugs

- [ ] **Hide Properties nao funciona** — CSS selector `.mirror-hide-properties .metadata-container` nao bate com o DOM do Obsidian atual
- [ ] **filterProps falha com listas YAML** — matching usa `===` (string vs array = sempre false). So valores simples funcionam
- [ ] **parseFrontmatter hardcoda listas em tags** — linhas com `-` sao jogadas em `result.tags` ignorando a key real

## Bugs resolvidos

- [x] **Widget sumia ao digitar rapido no meta-bind** — Bug de decoration mapping nos early-returns do StateField.update(). Debounce retornava posicoes antigas. Fix: 2 linhas. Recovery comentado na v25.3 (nunca disparava). (v25.2)
- [x] **Dead code em mirrorState.ts** — `getApplicableConfig2()`, `MirrorTemplateWidget` duplicada, utils duplicados. Limpo na v25.3: modularizacao completada, widgetInstanceCache corrigido. (v25.3)

## Integracao com outros plugins

| Plugin | Syntax no template | Status | Notas |
|--------|-------------------|--------|-------|
| Dataview inline | `` `= this.campo` `` | Validado (v25.1) | Reativo via post-processor |
| DataviewJS | ` ```dataviewjs dv.current()``` ` | Validado (v25.2) | Reativo via post-processor |
| Meta-bind | `INPUT[text:campo]` | Validado (v25.2) | Leitura/escrita no frontmatter, sobrevive digitacao rapida |
| Templater | `<% tp.* %>` | Nao aplicavel | One-shot: processa na criacao da nota, nao reativo. Nao serve pra templates do Mirror Notes |
| Core Templates | — | Nao aplicavel | Mesmo caso do Templater: insercao estatica |
| `{{var}}` (nativo) | `{{nomeDoCampo}}` | Funciona | Syntax propria do Mirror Notes, substituicao via regex no mirrorWidget.ts |

**Caminhos pra frontmatter dinamico no widget:** `{{var}}` (nativo), Dataview inline, DataviewJS, Meta-bind. Templater e core templates nao servem (one-shot).

## Features — Interface

- [ ] Menu contextual para gestao rapida de espelhos (right-click em nota → adicionar/remover mirror)
- [ ] Painel de status mostrando espelhos ativos na nota atual
- [ ] Busca e filtros dentro da lista de espelhos no settings
- [ ] **Posicionamento flexivel** — left/right (hoje so top/bottom), acima das properties, acima dos backlinks. Envolve tanto CM6 (posicoes dentro do editor) quanto DOM (posicoes fora do `.cm-content`). Referencia: analise CM6 vs DOM no technical-notes.md
- [x] **Suporte a Reading View** — implementado via code block processor (v26). Blocos ` ```mirror ``` ` funcionam em Reading View e Live Preview. Mirrors via settings (CM6) continuam apenas Live Preview.

## Features — Gestao

- [ ] Sistema de templates pre-configurados (starter configs para casos comuns)
- [ ] Dashboard de uso com estatisticas de espelhamento (quantas notas cada mirror atinge)

## Melhorias Tecnicas

- [ ] Performance para vaults grandes (lazy matching, batch processing) — configCache e cachedRead implementados na v27
- [ ] Validacao avancada de configuracoes (detectar templates inexistentes, filtros vazios)
- [x] Sistema de logs para debugging (toggle no settings) — implementado na v25.2 (`src/logger.ts`, toggle `debug_logging` no settings)
- [x] **Remover `window.mirrorUIPluginInstance`** — substituido por `mirrorPluginFacet` (Facet CM6 idiomatico) na v27
- [x] **Fix `StateEffect.reconfigure([])` no onunload** — removido na v27. Nukava todas as extensoes CM6
- [x] **Debounce/delay hardcoded** — centralizado em `src/editor/timingConfig.ts` (v27). 8 constantes, 9 substituicoes em 3 arquivos
- [ ] **Atualizar dependencias** — pacotes defasados desde 2022-2023:
  - Seguro (patch/minor): `@codemirror/state` 6.5.2→6.5.4, `@codemirror/view` 6.37→6.39, `obsidian` 1.8→1.12, `tslib` 2.4→2.8
  - Requer teste (major): `typescript` 4.7→5.9, `esbuild` 0.17→0.27, `@types/node` 16→25
  - Mover `@codemirror/state` e `@codemirror/view` de dependencies para devDependencies (Obsidian ja fornece em runtime)

---

Origem: features extraidas do README-v18 (visao de produto) + bugs da v25 + revisao tecnica v22-v25 + validacao de integracoes v25.2.
