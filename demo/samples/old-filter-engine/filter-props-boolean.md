---
title: FilterProps Boolean Test
type: task
completed: true
tags:
  - test
  - boolean-test
---

# Teste filterProps — Boolean matching

Esta nota tem `completed: true` (boolean YAML).

O mirror "FilterProps Boolean" esta configurado pra filtrar por `completed` = `true`.

**Esperado:** O callout deve aparecer, provando que `String(true) === "true"` funciona.

Antes do fix (v32): falharia porque `true === "true"` retorna false.
