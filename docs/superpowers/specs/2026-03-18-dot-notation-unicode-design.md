# Template Variables: Dot Notation + Unicode

## Problema

O regex de variaveis `{{nome}}` no templateRenderer.ts so aceita `[\w-]+` (ASCII + hifen). Isso impede:
- Dot notation: `{{project_info.dates.start_date}}` nao matcha
- Unicode: `{{descrição}}` nao matcha
- Chaves com ponto literal: `{{ma.miii}}` nao matcha

O Obsidian aceita chaves com pontos como propriedade flat valida (`ma.miii: valor` no YAML vira property real no vault). Isso cria ambiguidade: `{{ma.miii}}` pode ser chave flat OU acesso nested.

## Decisao de design

**Flat first, nested fallback:**
1. `frontmatter["ma.miii"]` existe? → usa (respeita property literal do Obsidian)
2. Nao? → tenta `frontmatter["ma"]["miii"]` (acesso nested, como Dataview faz)
3. Nao? → mantem `{{ma.miii}}` intacto no render (comportamento atual)

Isso cobre:
- Chaves flat com ponto (`ma.miii: valor`) — caso 1
- YAML nested (`project_info: { dates: { start_date: "2025-01-01" } }`) — caso 2
- Props que nao existem → ficam visiveis pro usuario corrigir — caso 3

## Escopo

### Arquivo novo: nenhum

### Arquivos modificados

**`src/editor/mirrorUtils.ts`** — adicionar `resolveVariable(key, variables)`
```typescript
export function resolveVariable(key: string, variables: Record<string, any>): string | undefined {
  // 1. Flat first — chave literal (ex: "ma.miii")
  const flat = variables[key];
  if (flat != null) return String(flat);

  // 2. Nested fallback — path com pontos (ex: "project_info.dates.start_date")
  if (key.includes('.')) {
    const segments = key.split('.');
    let current: any = variables;
    for (const seg of segments) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[seg];
    }
    if (current != null) return String(current);
  }

  return undefined;
}
```

**`src/rendering/templateRenderer.ts:82`** — expandir regex + usar `resolveVariable`

De:
```typescript
processedContent = templateContent.replace(/\{\{([\w-]+)\}\}/g, (match, key) => {
  const val = variables[key];
  return val != null ? String(val) : match;
});
```

Para:
```typescript
processedContent = templateContent.replace(/\{\{([\w\p{L}\p{N}.-]+)\}\}/gu, (match, key) => {
  const val = resolveVariable(key, variables);
  return val !== undefined ? val : match;
});
```

### Testes

**`tests/mirrorUtils.test.ts`** — adicionar suite `resolveVariable`:
- Chave flat simples (`title` → valor)
- Chave flat com ponto (`ma.miii` → valor quando existe flat)
- Path nested (`project_info.dates.start_date` → valor nested)
- Flat tem prioridade sobre nested (mesma chave existe nos dois → flat ganha)
- Path nested inexistente → undefined
- Path nested com valor falsy (`count: 0`, `done: false` → "0", "false")
- Path nested com segmento null no meio → undefined
- Chave sem ponto → comportamento identico ao atual

**`tests/templateRenderer.test.ts`** — adicionar casos:
- Template com `{{descrição}}` (unicode)
- Template com `{{project.status}}` (dot notation nested)
- Template com `{{ma.miii}}` (flat key com ponto)
- Template com prop inexistente → mantem `{{prop}}` intacto

**E2E** (opcional, pos-implementacao): criar nota no test vault com frontmatter nested e template que usa dot notation.

## O que NAO muda

- Comportamento pra `{{title}}`, `{{status}}` — identico
- Code block processor — converge no mesmo `replace()` do templateRenderer
- Settings, config, positions — zero impacto
- Props inexistentes — `{{prop}}` fica visivel no render (comportamento atual)

## Verificacao

1. Testes unitarios passam (resolveVariable + templateRenderer)
2. 267 testes existentes continuam passando
3. 25 E2E specs continuam passando
4. Teste manual: abrir nota do vault notion-projects com template que usa `{{project_info.dates.start_date}}`
