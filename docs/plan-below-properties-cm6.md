# Plano: below-properties → CM6 top (preferencial)

Status: **pendente implementacao**
Origem: investigacao `.metadata-container` sem YAML (mar/2026)

## Contexto

Investigacao DOM confirmou que `.metadata-container` sempre existe no DOM do Obsidian (com ou sem YAML, com properties "hidden" ou "visible"). Isso elimina o cenario de fallback, mas revela que `below-properties` via DOM injection e desnecessario — CM6 `top` produz resultado visual identico com melhor performance e reatividade nativa.

Decisao arquitetural: **preferir CM6 sobre DOM sempre que possivel.** DOM so e obrigatorio para `above-properties` (CM6 nao alcanca acima do `.metadata-container`).

## Estrategia

Traduzir `below-properties` → CM6 `top` no ponto de decisao (`setupDomPosition`), sem alterar settings nem remover codigo DOM existente. O codigo DOM permanece como fallback encapsulado.

## Mudancas

### 1. `main.ts` — setupDomPosition: skip below-properties

No inicio de `setupDomPosition`, antes do `injectDomMirror`, interceptar `below-properties` e redirecionar pra CM6:

```typescript
// below-properties: preferir CM6 top (mesmo resultado visual, melhor reatividade)
if (config.position === 'below-properties') {
  removeAllDomMirrors(file.path);
  this.positionOverrides.set(file.path, 'top');
  const cm = getEditorView(view);
  if (cm) cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
  return;
}
```

**Por que aqui e nao em `getApplicableConfig`:** manter a traducao explicita e localizada. O config continua retornando `below-properties` (verdade do settings), e a decisao de redirecionar fica no ponto de acao.

### 2. `settings.ts` — atualizar label do dropdown

```typescript
// Antes:
dropdown.addOption("below-properties", "Below properties (DOM)");

// Depois:
dropdown.addOption("below-properties", "Below properties");
```

### 3. `src/editor/mirrorTypes.ts` — nenhuma mudanca

`below-properties` continua em `DOM_POSITIONS` — o codigo DOM existe e funciona, so nao e chamado no caminho preferencial.

### 4. Testes — sem quebra

Testes do `domInjector.test.ts` continuam validos (o domInjector ainda sabe fazer fallback). Nenhum teste quebra porque o intercept e no main.ts.

## O que NAO muda

- `above-properties` — continua DOM (obrigatorio)
- `above-title`, `above/below-backlinks` — continuam DOM
- Dropdown continua mostrando `below-properties` como opcao
- Codigo DOM para `below-properties` no `domInjector.ts` — intacto
- `mirrorTypes.ts` — `DOM_POSITIONS` array intacto

## Verificacao

1. Build: `npm run build` sem erros
2. Testes: `npm test` — todos passam
3. Manual no Obsidian:
   - Nota com mirror `below-properties` + YAML → widget aparece abaixo das properties (via CM6 top)
   - Nota com mirror `below-properties` sem YAML → widget aparece no topo (CM6 top)
   - Nota com mirror `above-properties` → widget aparece acima das properties (DOM injection, inalterado)
   - Editar frontmatter → reatividade funciona (CM6 nativo, sem depender de DOM re-injection)

## Arquivos tocados

- `main.ts` — ~5 linhas adicionadas no `setupDomPosition`
- `settings.ts` — 1 linha (label do dropdown)
