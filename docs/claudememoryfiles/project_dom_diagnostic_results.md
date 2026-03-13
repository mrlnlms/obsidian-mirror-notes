---
name: DOM diagnostic — inline-title e metadata-container
description: Resultados do diagnostic v38 — Obsidian nunca remove .inline-title/.metadata-container do DOM, so esconde via CSS. API pra checar settings.
type: project
---

## Resultados DOM Diagnostic (2026-03-12)

Obsidian **nunca remove** `.inline-title` nem `.metadata-container` do DOM. Independente do setting, o `querySelector` sempre retorna o elemento. A diferenca e so `display:none` vs `display:block`.

### Tabela de resultados

| Setting | `.inline-title` | `.metadata-container` |
|---|---|---|
| Inline title ON | display:block, offsetH=31 | Sempre presente |
| Inline title OFF | display:none, offsetH=0 | Sempre presente |
| Properties visible (com YAML) | — | display:block, offsetH=117, children=3 |
| Properties hidden / sem YAML | — | display:none, offsetH=0, children=3 |

### API para ler configs do vault

```ts
app.vault.getConfig("showInlineTitle")      // → boolean
app.vault.getConfig("propertiesInDocument")  // → "visible" | "hidden" | "source"
app.vault.getConfig("readableLineLength")    // → boolean
```

Keys sao as mesmas do `.obsidian/app.json`. Referencia: plugin `obsidian-query-control` usa `app.vault.getConfig()` em `search-renderer.ts:30`.

**Why:** O `resolveTarget()` em `domInjector.ts` usa `querySelector` pra achar targets DOM. Como os elementos sempre existem, o fallback nunca dispara — o mirror e injetado ao lado de um elemento invisivel.

**How to apply:** Usar `app.vault.getConfig()` no `resolveTarget` (ou antes de chamar) pra checar se o setting ta ativo antes de tentar injetar. Se `showInlineTitle === false`, tratar `above-title` como se o target nao existisse → trigger fallback pra CM6 top. Mesmo principio pra `propertiesInDocument === "hidden"` com `above-properties`/`below-properties`.
