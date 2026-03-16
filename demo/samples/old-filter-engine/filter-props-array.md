---
title: FilterProps Array Test
type: project
status: active
tags:
  - test
  - mirror-test
  - project
priority: 5
completed: true
---

# Teste filterProps — Arrays e Booleans

Esta nota tem:
- `tags` como **array** (contendo "mirror-test")
- `completed` como **boolean** (true)
- `priority` como **number** (5)
- `type` como **string** ("project")

O mirror "FilterProps Test" esta configurado pra filtrar por `tags` = `mirror-test`.

**Esperado:** O callout deve aparecer, provando que o matching de arrays funciona.

Antes do fix (v32): falharia silenciosamente porque `["test","mirror-test","project"] === "mirror-test"` retorna false.
