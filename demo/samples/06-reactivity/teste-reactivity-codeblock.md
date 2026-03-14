---
title: Nota com Code Block
status: local
priority: baixa
---

# Teste Reatividade — Code Block Mirror

## Bloco 1: sem source (usa frontmatter DESTA nota)

```mirror
template: templates/mirror/reactivity-template.md
```

## Bloco 2: com source (usa frontmatter de OUTRA nota)

```mirror
template: templates/mirror/reactivity-template.md
source: teste-reactivity-source.md
```

## O que testar

- **Bloco 1**: edite o frontmatter DESTA nota → deve atualizar
- **Bloco 2**: abra `teste-reactivity-source.md` ao lado e edite o frontmatter de la → deve atualizar ao vivo (cross-note)
- Edite o **template** (reactivity-template.md) → nenhum bloco atualiza ate recarregar


--

Vou testar aqui rapidinho pra ver como fica isso aqui na digitação que é a forma que eu digitao...

.. marmonas 