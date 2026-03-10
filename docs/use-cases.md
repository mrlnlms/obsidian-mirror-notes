# Mirror Notes — Casos de Uso (v25)

Guia pratico do que funciona, como testar, e o que esta quebrado.

---

## O que funciona

### 1. Template global em todas as notas

**Setup:**
1. Settings → ativar Global Mirror
2. Ativar Live Preview Mode
3. Selecionar um template (ex: `templates/test-template.md`)
4. Posicao: top ou bottom

**Resultado:** Toda nota aberta em Live Preview exibe o template no topo/rodape.

**Testar:** Abrir qualquer nota no vault → o widget deve aparecer.

---

### 2. Template customizado por propriedade YAML

**Setup:**
1. Settings → criar Custom Mirror
2. Em Filter Props, adicionar: key `type`, value `project`
3. Selecionar template e posicao

**Resultado:** So notas com `type: project` no frontmatter exibem o template.

**Testar:**
```yaml
---
type: project
---
```
Abrir essa nota → widget aparece. Abrir nota sem `type: project` → widget nao aparece.

---

### 3. Template customizado por pasta

**Setup:**
1. Settings → Custom Mirror
2. Em Filter Folders, adicionar a pasta (ex: `Projects/`)
3. Selecionar template

**Resultado:** Todas as notas dentro de `Projects/` exibem o template.

**Testar:** Criar nota dentro e fora da pasta, comparar.

---

### 4. Template customizado por nome de arquivo

**Setup:**
1. Settings → Custom Mirror
2. Em Filter Files, adicionar o path completo (ex: `minha-nota.md`)
3. Selecionar template

**Resultado:** So aquela nota especifica exibe o template.

---

### 5. Substituicao de variaveis {{var}}

**Setup:** Template com placeholders:
```markdown
## Dashboard
**Projeto:** {{title}}
**Status:** {{status}}
**Prioridade:** {{priority}}
```

**Nota:**
```yaml
---
title: Website Redesign
status: in-progress
priority: high
---
```

**Resultado:** O widget renderiza com os valores reais do frontmatter:
- `{{title}}` → "Website Redesign"
- `{{status}}` → "in-progress"
- `{{priority}}` → "high"

**Testar:** Mudar o valor de `status` no frontmatter → o widget atualiza automaticamente (~500ms).

---

### 6. Prioridade custom vs global

**Setup:**
1. Global mirror ativo com template A
2. Custom mirror com filtro `type: project` e template B
3. Toggle override no custom mirror

**Resultado:** Notas com `type: project` usam template B (custom). Demais notas usam template A (global).

**Testar:** Abrir nota com e sem `type: project`, verificar qual template aparece.

---

### 7. Atualizacao em tempo real

**Como funciona:**
- Editar frontmatter → widget re-renderiza apos ~500ms
- Mudar settings → todos os editores abertos atualizam imediatamente
- Trocar de aba → widget reconstroi em 25ms

**Testar:** Com nota aberta, editar `title: X` → `title: Y`. Widget deve refletir a mudanca.

---

## O que NAO funciona (bugs v25)

### Hide Properties (QUEBRADO)

**Sintoma:** Toggle "Hide Properties" esta ligado mas o frontmatter continua visivel.

**Causa:** `updateHidePropsForView()` adiciona a classe CSS `.mirror-hide-properties` corretamente (visivel nos logs do console), mas o seletor `.mirror-hide-properties .metadata-container { display: none }` nao bate com a estrutura DOM atual do Obsidian.

**Como reproduzir:**
1. Settings → ativar Hide Properties
2. Abrir nota com mirror ativo
3. Frontmatter continua visivel
4. Console mostra: `[MirrorNotes] Hiding properties for: ...`

---

### Filtro por listas YAML (QUEBRADO)

**Sintoma:** filterProps nao funciona quando o valor YAML e uma lista.

**Causa:** Matching usa `===` (string vs array = sempre false).

**Como reproduzir:**
```yaml
---
tags:
  - project
  - active
---
```
Custom mirror com filter `tags` = `project` → NAO funciona.

**Workaround:** Usar propriedades de valor unico: `type: project` em vez de listas.

---

### parseFrontmatter ignora keys de listas (QUEBRADO)

**Sintoma:** Todas as listas YAML sao jogadas em `result.tags`, independente da key.

**Como reproduzir:**
```yaml
---
categories:
  - science
authors:
  - Alice
tags:
  - research
---
```
O parser retorna: `{ tags: ["science", "Alice", "research"] }` — perde `categories` e `authors`.

**Impacto:** Variaveis `{{categories}}` e `{{authors}}` nao funcionam em templates.

---

## Configuracao atual (data.json)

O plugin esta configurado com:
- Global mirror: **ativo**, template `templates/test-template.md`, posicao top
- Hide properties: ativo (mas quebrado)
- 1 custom mirror: filtra `type: project`, template `templates/s.md`

---

## Checklist de teste rapido

- [ ] Abrir nota qualquer → widget global aparece no topo?
- [ ] Abrir nota com `type: project` → custom mirror aparece?
- [ ] Editar frontmatter → widget atualiza em tempo real?
- [ ] Trocar de aba → widget reconstroi?
- [ ] {{var}} substitui valores do frontmatter?
- [ ] Hide Properties → frontmatter some? (esperado: NAO, bug conhecido)
- [ ] Filtro com tags lista → funciona? (esperado: NAO, bug conhecido)
