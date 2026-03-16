---
title: Teste Categories v41
categories:
  - active
  - project
---

# Teste 5 — filterProps com array em chave diferente de tags

Este teste valida o bug que foi corrigido. O parser antigo colocava TODAS as listas em `result.tags`, independente da chave. Agora o metadataCache retorna arrays na chave correta.

## O que deve acontecer
O mirror "v41: Categories Filter" deve aparecer porque `categories` contem `project`.

## Checklist
- [x] Mirror aparece (callout com "CATEGORIES MATCH")
- [x] Remover `project` de categories — mirror some
- [x] Adicionar `project` de volta — mirror reaparece
