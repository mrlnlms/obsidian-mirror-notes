# Mirror Notes — Backlog

Features, melhorias e bugs extraidos da visao original do produto e do estado atual (v25).

## Bugs (v25)

- [ ] **Hide Properties nao funciona** — CSS selector `.mirror-hide-properties .metadata-container` nao bate com o DOM do Obsidian atual
- [ ] **filterProps falha com listas YAML** — matching usa `===` (string vs array = sempre false). So valores simples funcionam
- [ ] **parseFrontmatter hardcoda listas em tags** — linhas com `-` sao jogadas em `result.tags` ignorando a key real

## Features — Interface

- [ ] Menu contextual para gestao rapida de espelhos (right-click em nota → adicionar/remover mirror)
- [ ] Painel de status mostrando espelhos ativos na nota atual
- [ ] Busca e filtros dentro da lista de espelhos no settings
- [ ] Posicionamento left/right (hoje so top/bottom)
- [ ] **Suporte a Reading View** — mirrors so funcionam em Live Preview (CM6). Reading View nao renderiza nenhum widget. Limitacao arquitetural da Era 4.

## Features — Gestao

- [ ] Sistema de templates pre-configurados (starter configs para casos comuns)
- [ ] Exportacao/importacao de configuracoes (compartilhar setups entre vaults)
- [ ] Dashboard de uso com estatisticas de espelhamento (quantas notas cada mirror atinge)
- [ ] Historico de mudancas em notas espelho

## Bugs (v25.1 — investigando)

- [ ] **Widget some ao digitar rapido no meta-bind** — CM6 remove o widget DOM do `.cm-content` durante DOM sync quando meta-bind edita YAML rapidamente. Confirmado via MutationObserver: parent é `cm-content cm-lineWrapping`. StateField mantem decorations, mas CM6 nao chama `toDOM()` novamente. Causa raiz: CM6 re-renderiza regiao do frontmatter e descarta block widget adjacente sem re-inserir.

## Melhorias Tecnicas

- [ ] Performance para vaults grandes (cache de frontmatter, lazy matching)
- [ ] Validacao avancada de configuracoes (detectar templates inexistentes, filtros vazios)
- [ ] Sistema de logs para debugging (toggle no settings)
- [ ] **Remover `window.mirrorUIPluginInstance`** — hack global expondo a instancia do plugin. Substituir por acesso via `app.plugins.plugins['mirror-notes']` ou API propria
- [ ] **Fix `StateEffect.reconfigure([])` no onunload** — remove TODAS as extensoes CM6 do editor, nao so as do mirror. Deveria remover apenas as extensoes registradas pelo plugin
- [ ] **Debounce/delay hardcoded** — valores fixos (25ms file-open, 500ms metadata, 1000ms inatividade) podem nao funcionar em vaults grandes/lentos. Considerar tornar configuravel ou usar heuristicas adaptativas
- [ ] **Atualizar dependencias** — pacotes defasados desde 2022-2023:
  - Seguro (patch/minor): `@codemirror/state` 6.5.2→6.5.4, `@codemirror/view` 6.37→6.39, `obsidian` 1.8→1.12, `tslib` 2.4→2.8
  - Requer teste (major): `typescript` 4.7→5.9, `esbuild` 0.17→0.27, `eslint` plugins 5→8, `@types/node` 16→25, `builtin-modules` 3→5
  - Mover `@codemirror/state` e `@codemirror/view` de dependencies para devDependencies (Obsidian ja fornece em runtime, ter em dependencies causa duplicacao)

## Integracao

- [x] Suporte a Dataview queries dentro de templates — funciona via MarkdownRenderer (testado v25.1)
- [ ] Suporte a Meta Bind inputs dentro de templates — em teste (v25.1)
- [ ] Compatibilidade com Templater syntax
- [ ] API para outros plugins interagirem com mirrors

---

Origem: features extraidas do README-v18 (visao de produto da Era 2) + bugs documentados da v25 + revisao tecnica completa do projeto (v22-v25).
