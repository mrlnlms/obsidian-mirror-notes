# Mirror Notes — Backlog

Trabalho tecnico a ser feito. Atualizado na v30.

## Benchmark + Redesign Settings

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

**Blocker resolvido (v29):** dependencias atualizadas.

## Posicionamento — Duas Engines

Implementacao apos o redesign de settings.

- **Engine CM6** (dentro do editor): top, bottom, inline (implementadas). **Side-by-side** (nota ao lado, como no Qualia Coding) — roadmap futuro
- **Engine DOM** (fora do editor): acima/abaixo do titulo, acima/abaixo das properties. Nenhuma implementada. CM6 nao alcanca esses elementos
- Referencia: plugin VirtualNotes
- Juntas as duas engines cobrem toda a anatomia de uma nota no Obsidian

## Melhorias Tecnicas

- [ ] **Refatorar suggester** — `utils/suggest.ts` (TextInputSuggest) e `utils/file-suggest.ts` (FileSuggest, FolderSuggest, YamlPropertySuggest) sao codigo copiado do Templater com restos. Revisar, limpar, e avaliar se da pra simplificar

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
