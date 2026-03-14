---
title: Fallback No Backlinks
type: fallback-test
tags:
  - test
  - fallback
---

# Teste de Fallback — Backlinks desabilitados

Este mirror esta configurado como `above-backlinks`, mas se os backlinks estiverem **desabilitados**, o `.embedded-backlinks` nao existira no DOM.

**Esperado:** fallback para `bottom` (CM6 bottom).

Para testar:
1. Habilite "Backlinks in document" → callout deve aparecer acima dos backlinks
2. Desabilite "Backlinks in document" → reabra a nota → callout deve aparecer no bottom (CM6)
