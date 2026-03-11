# Mirror Notes — Backlog

Features, melhorias e bugs. Atualizado na v29.

## Proximo marco: Benchmark + Redesign Settings

Tudo abaixo converge num unico bloco de trabalho. O benchmark VirtualNotes vs MirrorNotes e o ponto de partida — nao pra copiar, mas pra definir escopo e fechar as lacunas antes de implementar posicoes DOM.

**O que o benchmark vai cobrir:**
- Mapear configs do VirtualNotes, cruzar com o que ja existe no MirrorNotes
- Gerar: (1) lista de funcionalidades (falta / existe / adaptar) e (2) layout do settings pra duas engines
- Avaliar melhor implementacao de DOM (posicoes fora do editor)
- Condicionais (vai surgir do benchmark)

**Bugs que entram nesse redesign** (nao sao itens isolados — sao sintomas do settings/config atual):
- **Hide Properties** — hack CSS atual (`.mirror-hide-properties .metadata-container`) nao funciona. Pode ter solucao melhor via API do Obsidian
- **filterProps falha com listas YAML** — matching usa `===` (string vs array = sempre false). Tratamento YAML inteiro pode mudar
- **parseFrontmatter hardcoda listas em tags** — linhas com `-` sao jogadas em `result.tags` ignorando a key real. Mesmo caso

**Features que entram nesse redesign:**
- Busca e filtros dentro da lista de espelhos no settings
- Posicionamento flexivel — duas engines:
  - **Engine CM6** (dentro do editor): top, bottom, inline (implementadas). **Side-by-side** (nota ao lado, como no Qualia Coding) — roadmap futuro
  - **Engine DOM** (fora do editor): acima/abaixo do titulo, acima/abaixo das properties. Nenhuma implementada. CM6 nao alcanca esses elementos
  - Referencia: plugin VirtualNotes
  - Juntas as duas engines cobrem toda a anatomia de uma nota no Obsidian

**Blocker resolvido (v29):** dependencias atualizadas — TS5, esbuild 0.25, ESLint 9 flat config, obsidian pinado, codemirror em devDeps, tsconfig ES2018.

**Resultado esperado:** apos o benchmark e redesign, o que sobra e "so" implementar as posicoes DOM.

## Features — Interface

- [x] **Menu contextual** — right-click + command palette → modal com FileSuggest pra template/source → insere bloco ` ```mirror ``` `. Implementado na v29 (`src/commands/insertMirrorBlock.ts`)
- [x] **Suporte a Reading View** — implementado via code block processor (v26). Blocos ` ```mirror ``` ` funcionam em Reading View e Live Preview. Mirrors via settings (CM6) continuam apenas Live Preview.

## Features — Gestao

- [ ] Sistema de templates pre-configurados (starter configs para casos comuns)
- [ ] Dashboard de uso com estatisticas de espelhamento (quantas notas cada mirror atinge)
- [ ] **Import/Export de configuracoes** — importar/exportar o array de MirrorConfig via JSON na UI do settings. Facilita backup, compartilhamento e migracao entre vaults. **Contexto UX:** o import faz mais sentido no onboarding (primeiro uso) — havia um banner dismissable no settings (ver commits antigos) que poderia incluir um CTA "importe do seu vault antigo". Forma de input a definir: upload de arquivo (verificar se Obsidian API permite), ou textarea pra colar o JSON do data.json. Export + Import + Reset tambem caberiam numa section colapsada no final do settings (tipo "Danger Zone" ou similar) pra operacoes destrutivas/avancadas. Precisa de user-flow mais bem pensado antes de implementar

## Melhorias Tecnicas

- [ ] **Refatorar suggester** — `utils/suggest.ts` (TextInputSuggest) e `utils/file-suggest.ts` (FileSuggest, FolderSuggest, YamlPropertySuggest) sao codigo copiado do Templater com restos. Revisar, limpar, e avaliar se da pra simplificar
- [x] Atualizar dependencias — resolvido na v29 (ver blocker acima)
- [ ] **Skill de scaffolding** — criar skill que gera estrutura base de plugin Obsidian com deps atualizadas, tsconfig moderno, eslint flat config, esbuild pronto. Evitar repetir o setup manual feito na v29

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

## Resolvidos

- [x] **Widget sumia ao digitar rapido no meta-bind** — fix de decoration mapping (v25.2)
- [x] **Dead code em mirrorState.ts** — modularizacao completada (v25.3)
- [x] **Suporte a Reading View** — code block processor (v26)
- [x] Performance para vaults grandes — configCache, cachedRead, mirror index (v27/v27.1)
- [x] Validacao de configuracoes — inline path validation nos settings (v28)
- [x] Sistema de logs para debugging (v25.2)
- [x] Remover `window.mirrorUIPluginInstance` — substituido por mirrorPluginFacet (v27)
- [x] Fix `StateEffect.reconfigure([])` no onunload (v27)
- [x] Debounce/delay hardcoded — centralizado em timingConfig.ts (v27)
- [x] Rename-aware settings — auto-update paths + notificacao de templates deletados (v28)
- [x] Inline path validation (v28)
- [x] Atualizar dependencias — TS5, esbuild 0.25, ESLint 9, obsidian pinado, codemirror devDeps, tsconfig ES2018 (v29)
- [x] Menu contextual — insert mirror block via right-click + command palette (v29)
- [x] Limpeza de codigo — 22 unused imports/vars removidos pelo linter novo (v29)

---

Origem: features extraidas do README-v18 (visao de produto) + bugs da v25 + revisao tecnica v22-v25 + validacao de integracoes v25.2.
