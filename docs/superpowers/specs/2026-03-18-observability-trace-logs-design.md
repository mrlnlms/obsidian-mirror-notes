# Observability Level 1: Decision Trace Logs

## Problema

O fluxo de decisao de runtime (qual mirror? qual engine? qual posicao? fallback?) esta espalhado em 5 arquivos com 11 pontos de decisao. 6 sao logados, 5 sao silenciosos. Os logs existentes sao operacionais ("Loading template: X", "layout-change fired") — nao mostram o fluxo de decisao completo.

Debugar "por que o mirror sumiu?" exige juntar pecas de mirrorConfig, domPositionManager, mirrorState, domInjector e templateRenderer. Isso custa tempo tanto pro humano quanto pro LLM em sessoes de debug.

## Decisao de design

**Logger existente com prefixo `[trace]` filtravel.**

- Usa `Logger.log('[trace] ...')` — mesmo Logger, mesmo toggle (`debug_logging`), mesmo `__DEV__` guard
- Prefixo `[trace]` padronizado pra filtrar: `grep '\[trace\]' debug.log`
- Zero mudanca no settings UI, zero nova dependencia
- Logs existentes ficam como estao — traces sao adicao, nao substituicao

## Formato do trace

```
[trace] <file> [<viewId>] <event> → mirror="<name>" pos=<requested> engine=<dom|cm6|none>
[trace] <file> [<viewId>] <event> → mirror="<name>" pos=<requested>→<actual> (fallback) engine=<cm6>
[trace] <file> [<viewId>] <event> → no match
[trace] <file> [<viewId>] forced-update → config changed: position, templatePath
[trace] <file> [<viewId>] render-skip → content unchanged (cache hit)
[trace] <file> [<viewId>] cooldown-skip → 45ms ago
```

## Componente: `traceMirrorDecision()`

Funcao pura em `src/editor/mirrorUtils.ts`. Recebe objeto tipado, formata e loga.

```typescript
interface TraceDecision {
  file: string;
  viewId?: string;
  event: string;
  mirror?: string | null;
  position?: { requested: string; actual?: string };
  engine?: 'dom' | 'cm6' | 'margin' | 'none';
  reason?: string;
}

export function traceMirrorDecision(d: TraceDecision): void {
  const view = d.viewId ? ` [${d.viewId}]` : '';
  let msg = `[trace] ${d.file}${view} ${d.event}`;

  if (d.mirror === null || d.mirror === undefined) {
    msg += ' → no match';
  } else {
    msg += ` → mirror="${d.mirror}"`;
  }

  if (d.position) {
    const { requested, actual } = d.position;
    if (actual && actual !== requested) {
      msg += ` pos=${requested}→${actual} (fallback)`;
    } else {
      msg += ` pos=${requested}`;
    }
  }

  if (d.engine) msg += ` engine=${d.engine}`;
  if (d.reason) msg += ` [${d.reason}]`;

  Logger.log(msg);
}
```

## Pontos de insercao (5)

| # | Arquivo | Local | O que loga |
|---|---------|-------|------------|
| 1 | `mirrorConfig.ts` | Apos `getApplicableConfig()` resolver | Qual mirror matchou (nome + condicao) ou "no match" |
| 2 | `domPositionManager.ts` | Apos `injectDomMirror()` retornar | Posicao pedida vs real, fallback sim/nao, engine |
| 3 | `mirrorState.ts` | No forced update quando config muda | Quais campos mudaram (position, templatePath, etc) |
| 4 | `domPositionManager.ts` | No cooldown skip | Quanto tempo desde ultimo setup |
| 5 | `templateRenderer.ts` | No cache hit (render skipped) | "content unchanged" |

## Publico-alvo

- **LLM (Claude, Codex):** consumidor principal. Em sessoes de debug, `grep '[trace]' debug.log` da o fluxo de decisao completo sem poluicao dos logs operacionais
- **Humano:** mesmo filtro, mesma utilidade. Especialmente util durante desenvolvimento do margin panel (proximo epico)

## Testes

- `traceMirrorDecision` e funcao pura — testes unitarios verificam formato de saida
- Testes de integracao existentes nao quebram (traces sao adicao)
- E2E nao afetado (Logger e no-op em prod)

## O que NAO muda

- `src/dev/logger.ts` — zero alteracao
- Settings UI — zero alteracao (mesmo `debug_logging` toggle)
- Logs existentes — ficam como estao
- Performance — `Logger.log` ja tem early return quando debug off
