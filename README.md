# Mirror Notes Plugin

Um plugin para Obsidian que renderiza templates dinamicos dentro do editor usando CodeMirror 6.

## Versao Atual: v21 — Settings + v1.1.0 (Era 4)

**Settings tab retorna com arquitetura CM6.** Plugin rebatizado de `sample-plugin` para `mirror-notes` v1.1.0.

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
- **v21: Settings + v1.1.0** -- Settings tab com CM6!
  - manifest.json rebatizado: `sample-plugin` -> `mirror-notes` v1.1.0
  - settings.ts completo: MirrorUIPluginSettings, DEFAULT_SETTINGS, MirrorUISettingsTab
  - utils/file-suggest.ts e utils/suggest.ts para autocomplete
  - YAMLSuggest.ts para sugestoes de propriedades YAML
  - utils.ts com funcoes utilitarias (wrapAround)
  - metadataCache integration com debounce conservador (500ms)
  - User interaction tracking (evita updates enquanto digita)
  - forceMirrorUpdateEffect para atualizacoes forcadas do estado
  - Editor setup simplificado (mirrorDecorations removido — agora via StateField)
  - Delays reduzidos de 50ms para 25ms (melhor responsividade)
  - Arquivos de referencia: Settings_REFERENCIA.ts, styles_REFERENCIA.css, main_REF.js
  - Nova dependencia: @popperjs/core para posicionamento
  - styles.css expandido significativamente (347 linhas de mudancas)

## Estrutura do Projeto (v21)

```
main.ts                       # Plugin principal — setup CM6 + settings + metadata sync
settings.ts                   # Settings tab completo (631 linhas)
YAMLSuggest.ts                # Sugestoes de propriedades YAML
utils.ts                      # Funcoes utilitarias
utils/
  file-suggest.ts             # FileSuggest, FolderSuggest, YamlPropertySuggest
  suggest.ts                  # Base suggest abstraction
src/
  editor/
    mirrorState.ts            # StateField + StateEffects + forceMirrorUpdateEffect
    mirrorViewPlugin.ts       # ViewPlugin — widget DOM
    mirrorWidget.ts           # WidgetType — decoracao inline
Settings_REFERENCIA.ts        # Arquivo de referencia
styles_REFERENCIA.css         # Arquivo de referencia
main_REF.js                   # Arquivo de referencia (build compilado)
styles.css                    # Estilos CM6 (expandido)
manifest.json                 # mirror-notes v1.1.0
package.json                  # +@popperjs/core
esbuild.config.mjs            # CM6 externals configurados
```

## Desenvolvimento

```bash
npm install
npm run dev     # hot reload
npm run build   # producao
```
