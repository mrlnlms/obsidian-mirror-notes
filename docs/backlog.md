# Mirror Notes — Backlog

Features, melhorias e bugs. Atualizado na v25.3.

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
- [ ] Posicionamento left/right (hoje so top/bottom)
- [ ] **Suporte a Reading View** — mirrors so funcionam em Live Preview (CM6). Limitacao arquitetural. Pra Reading View seria necessario camada DOM separada (ver analise CM6 vs DOM no technical-notes.md)

## Features — Gestao

- [ ] Sistema de templates pre-configurados (starter configs para casos comuns)
- [ ] Exportacao/importacao de configuracoes (compartilhar setups entre vaults)
- [ ] Dashboard de uso com estatisticas de espelhamento (quantas notas cada mirror atinge)
- [ ] Historico de mudancas em notas espelho

## Melhorias Tecnicas

- [ ] Performance para vaults grandes (cache de frontmatter, lazy matching)
- [ ] Validacao avancada de configuracoes (detectar templates inexistentes, filtros vazios)
- [ ] Sistema de logs para debugging (toggle no settings)
- [ ] **Remover `window.mirrorUIPluginInstance`** — hack global. Substituir por `app.plugins.plugins['mirror-notes']` ou API propria
- [ ] **Fix `StateEffect.reconfigure([])` no onunload** — remove TODAS as extensoes CM6, nao so as do mirror
- [ ] **Debounce/delay hardcoded** — valores fixos (25ms, 500ms, 1000ms) podem nao funcionar em vaults grandes
- [ ] **Atualizar dependencias** — pacotes defasados desde 2022-2023:
  - Seguro (patch/minor): `@codemirror/state` 6.5.2→6.5.4, `@codemirror/view` 6.37→6.39, `obsidian` 1.8→1.12, `tslib` 2.4→2.8
  - Requer teste (major): `typescript` 4.7→5.9, `esbuild` 0.17→0.27, `@types/node` 16→25
  - Mover `@codemirror/state` e `@codemirror/view` de dependencies para devDependencies (Obsidian ja fornece em runtime)
- [ ] **Posicoes fora do .cm-content** — acima das properties, acima dos backlinks. Requer camada DOM (ver analise no technical-notes.md)

## Integracao — Futuro

- [ ] API para outros plugins interagirem com mirrors

---

Origem: features extraidas do README-v18 (visao de produto) + bugs da v25 + revisao tecnica v22-v25 + validacao de integracoes v25.2.
