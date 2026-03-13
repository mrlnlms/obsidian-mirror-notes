---
name: Backlinks v40 — resolvido
description: Solucao final do timing bug backlinkInDocument — two-layer check (API gate + DOM truth via children.length)
type: project
---

## Resolvido na v40

### Problema
`backlinkInDocument` NAO e reativo pra abas abertas no Obsidian:
- Toggle ON → config muda, DOM nao atualiza (precisa close+reopen)
- Toggle OFF → config muda, DOM nao atualiza (conteudo continua visivel)
- Plugin ON/OFF (`core-plugins.json`) E reativo — Obsidian adiciona/remove elementos imediatamente

### Solucao: two-layer check

1. **`isDomTargetVisible` (API gate)**: so checa `bl.enabled` (plugin ON/OFF). NAO checa `backlinkInDocument`
2. **`resolveTarget` (DOM truth)**: `backlinks.children.length > 0` — verifica conteudo real

### Anatomia do `.embedded-backlinks`
- Plugin ON + backlinkInDocument ON + aba reaberta: `children = [DIV.nav-header, DIV.backlink-pane]`
- Plugin ON + qualquer estado + aba NAO reaberta: `children = []` (shell vazio)
- Plugin OFF: elemento nao existe no DOM

### Bug adicional corrigido: .cm-sizer fallback
- `below-backlinks` caia no `.cm-sizer` quando `.embedded-backlinks` existia mas tava vazio
- Fix: `.cm-sizer` so ativa quando `!backlinks` (elemento nao existe), nao quando vazio

### vault.on('raw')
- `backlink.json` removido do listener — reagir e inutil (DOM nao muda)
- So `core-plugins.json` trigga `refreshAllEditors`

### Tentativas que falharam (referencia)
1. `offsetHeight` — sempre 0 no browser real por layout reasons
2. querySelector bypass (checar DOM quando API diz OFF) — `.embedded-backlinks` sempre existe quando plugin ON
3. `backlinkInDocument` na API — dessincronizado com DOM real

**Why:** backlinkInDocument e a unica config do Obsidian que NAO e reativa pra abas abertas. inline-title e propertiesInDocument sao reativos (CSS display:none).

**How to apply:** Quando lidar com elementos do Obsidian que dependem de config: checar se a config e reativa. Se nao for, usar DOM truth (children, computed style) em vez de API.
