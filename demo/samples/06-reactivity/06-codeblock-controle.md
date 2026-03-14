---
title: Teste CodeBlock Controle v41
status: ok
priority: 9
type: controle-NUDE
---

# Teste 6 — Code block (caminho que NAO mudou)

Este teste confirma que code blocks continuam funcionando. O caminho de code blocks ja usava metadataCache antes, entao nao deve ter mudado nada.

```mirror
template: templates/mirror/v41-variables.md
```

## Checklist
- [x] Code block renderiza com variaveis corretas
- [x] Editar frontmatter — code block atualiza
- [x] Trocar pra Reading View — continua funcionando
