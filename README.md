# Mirror Notes Plugin

Um plugin para Obsidian que renderiza templates dinamicos dentro do editor usando CodeMirror 6.

## Versao Atual: v23 — Modularizacao (Era 4)

**Modularizacao em arquivos menores e verificacao de performance.** Codigo refatorado para melhor organizacao.

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
  - Settings tab completo com configuracoes globais e customizadas
  - Plugin renomeado de sample-plugin para mirror-notes v1.1.0
  - manifest.json e package.json atualizados
- **v22: Posicionamento** -- Posicionamento relativo + settings reactivity
  - Limpeza de widgets orfaos (cleanOrphanWidgets)
  - onunload melhorado: remove widgets e reconfigura CodeMirror
  - Settings disparam forceMirrorUpdateEffect via updateAllEditors()
  - Path de config usa manifest.id em vez de hardcoded sample-plugin
  - Forced update recria widgets incondicionalmente com config fresca
  - Fix: global_settings_preview_pos -> global_settings_live_preview_pos
- **v23: Modularizacao** -- Refatoracao em arquivos menores + performance
  - Novo mirrorConfig.ts: constantes e configuracao extraidas
  - Novo mirrorDecorations.ts: logica de decoracoes extraida
  - Novo mirrorTypes.ts: definicoes de tipos compartilhados
  - Novo mirrorUtils.ts: funcoes utilitarias extraidas
  - mirrorState.ts simplificado com imports modulares
  - mirrorWidget.ts refatorado com helpers extraidos
  - Diretorio backup/ com copias de referencia pre-modularizacao
