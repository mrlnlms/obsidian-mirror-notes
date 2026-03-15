---
title: "Bottom Unified Test"
status: active
tags:
  - bottom-test
---

# Cenario: Bottom unificado

Este teste valida a nova logica unificada de `bottom`.

- **Backlinks ON** → mirror deve aparecer como DOM acima dos backlinks
- **Backlinks OFF** → mirror deve aparecer como CM6 no fim do editor

## Checklist

- [ ] Com backlinks ON: mirror aparece ACIMA dos backlinks (DOM injection)
- [x] Com backlinks OFF: mirror aparece no FIM do editor (CM6 widget)
- [ ] Trocar backlinks ON/OFF: mirror reposiciona ao reabrir a nota
- [ ] Border visivel (container styled)

## Link pra gerar backlink

Mencione esta nota em outra pra ter backlinks: [[test-bottom-backlink-source]]
