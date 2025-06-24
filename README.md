# Mirror Notes Plugin

Um plugin para Obsidian que renderiza templates dinamicos dentro do editor usando CodeMirror 6.

## Versao Atual: v20 — CM6 Integration (Era 4)

**Era 4 comeca aqui.** Rewrite completo da arquitetura usando CodeMirror 6.

### Historico de Eras

#### Era 1: Skeleton (v1-v3)
- v1: Skeleton inicial do plugin
- v2: Ribbon button
- v3: YAML check

#### Era 2: Editor Integration (v4-v10)
- v4: Toolbar
- v5: CM scroller
- v6: Mirror UI plugin
- v7: Settings tab
- v8: Mode detection
- v9: Full routing
- v10: v1 final + primeiro _historico

#### Era 3: Settings Architecture (v11-v19)
- v11: settings.ts + YAMLSuggest.ts
- v12: utils/ autocomplete
- v13: SettingModel1
- v14: SettingModel2
- v15: SettingModel3
- v16: finalmente.ts
- v17: Settings.ts final
- v18: Build + styles
- v19: CSS update (Era 3 final)

#### Era 4: CM6 Rewrite (v20+)
- **v20: CM6 integration** -- Rewrite completo!
  - Todo o codigo de settings/utils da Era 3 removido
  - Nova arquitetura baseada em CodeMirror 6
  - StateField para gerenciamento de estado (mirrorState.ts)
  - ViewPlugin para renderizacao de widgets (mirrorViewPlugin.ts)
  - WidgetType para decoracoes inline (mirrorWidget.ts)
  - Deteccao de frontmatter `type: project`
  - Renderizacao de templates markdown com substituicao de variaveis

## Estrutura do Projeto (v20)

```
main.ts                       # Plugin principal — setup de editores CM6
src/
  editor/
    mirrorState.ts            # StateField + StateEffects
    mirrorViewPlugin.ts       # ViewPlugin — widget DOM acima do editor
    mirrorWidget.ts           # WidgetType — decoracao inline
styles.css                    # Estilos CM6 (animacoes, widgets)
manifest.json
package.json                  # +@codemirror/state, +@codemirror/view
esbuild.config.mjs            # CM6 externals configurados
```

## Desenvolvimento

```bash
npm install
npm run dev     # hot reload
npm run build   # producao
```
