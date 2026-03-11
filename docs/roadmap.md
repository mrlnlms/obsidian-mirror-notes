# Mirror Notes — Roadmap

## Concluido: v29 — Dependency Update + Insert Mirror Block + Cleanup

- [x] Deps atualizadas: TS 4.7→5.9, esbuild 0.17→0.25, ESLint 9 flat config, obsidian pinado
- [x] codemirror movido pra devDeps, tsconfig modernizado (ES2018)
- [x] `window.mirrorUIPluginInstance` → `mirrorPluginFacet` (Facet CM6)
- [x] `StateEffect.reconfigure([])` removido do onunload
- [x] Insert Mirror Block — modal + command palette + right-click menu
- [x] Limpeza: 22 unused imports/vars, dead code removido
- [x] Script `npm run lint` adicionado

## Concluido: v28.1 — Clickable Error in Renderer

- [x] Link "Open settings" no erro "Template not found" (widget + code block)
- [x] `openSettingsToField` publico pra uso pelo renderer
- [x] `pointer-events: auto` no errorDiv (CM6 widget bloqueia eventos por default)

## Concluido: v28 — Rename-Aware Settings + Inline Validation

- [x] `vault.on('rename')` — auto-update de paths nos settings
- [x] `vault.on('delete')` — Notice clicavel avisando template quebrado
- [x] Toggle global + per-mirror pra controlar auto-update
- [x] Notice com "Open settings" → expande mirror colapsado, scroll + focus
- [x] Inline path validation em todos os campos de path/folder/filename
- [x] Validacao no render + blur do input

## Concluido: v27 — Performance, Timing, Cleanup

- [x] Centralizar constantes de timing em timingConfig.ts
- [x] Ativar configCache em mirrorConfig.ts (cache por file.path + frontmatterHash)
- [x] cachedRead para templates (vault.cachedRead em vez de vault.read)
- [x] Unificar iterateAllLeaves no startup (uma passada so no onLayoutReady)
- [x] Substituir window.mirrorUIPluginInstance por mirrorPluginFacet (Facet CM6)
- [x] Remover StateEffect.reconfigure([]) do onunload
- [x] Remover window.mirrorUICleanup (export normal)

## Concluido: v26 — Code Block Processor

- [x] `registerMarkdownCodeBlockProcessor("mirror")` — Reading View + Live Preview
- [x] Rendering compartilhado (templateRenderer.ts)
- [x] Sintaxe: template, source, variaveis inline
- [x] MarkdownRenderChild para lifecycle correto
- [x] onLayoutReady para notas ja abertas

## Proximo: Benchmark VirtualNotes + Redesign Settings

Bloco unico que resolve bugs, adiciona posicoes DOM, e redesenha settings. Ver [backlog.md](backlog.md) para detalhes completos.

1. Benchmark VirtualNotes vs MirrorNotes (settings, posicoes, condicionais)
2. Redesign settings (bugs Hide Properties/filterProps/parseFrontmatter entram aqui)
3. Implementar posicoes DOM (acima/abaixo titulo, acima/abaixo properties)

## Independentes (qualquer momento)

- [ ] Import/Export de configuracoes (precisa user-flow)
- [ ] Sistema de templates pre-configurados (starter configs)
- [ ] Dashboard de uso
- [ ] Documentacao de uso do code block processor
- [ ] Reatividade cross-note (quando `source: outra-nota.md` muda, re-renderizar)
