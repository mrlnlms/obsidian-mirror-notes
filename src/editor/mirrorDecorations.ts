import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { MirrorState } from "./mirrorTypes";
import MirrorUIPlugin from "../../main";
import { MirrorTemplateWidget } from "./mirrorWidget";
import { mirrorStateField } from "./mirrorState";
import { Logger } from '../logger';

// Limpeza de widgets órfãos
export function cleanOrphanWidgets(view: EditorView) {
  const activeWidgetIds = new Set<string>();
  const fieldState = view.state.field(mirrorStateField, false);
  if (fieldState && fieldState.mirrorState.widgetId) {
    activeWidgetIds.add(fieldState.mirrorState.widgetId);
  }
  view.dom.querySelectorAll('.mirror-ui-widget').forEach((widget: Element) => {
    const widgetId = widget.getAttribute('data-widget-id');
    if (widgetId && !activeWidgetIds.has(widgetId)) {
      Logger.log(`Removing orphan widget: ${widgetId}`);
      widget.remove();
    }
  });
}

// Construção das decorations
export function buildDecorations(state: EditorState, mirrorState: MirrorState, plugin: MirrorUIPlugin): DecorationSet {
  const { enabled, config, widgetId } = mirrorState;
  if (!enabled || !config) {
    return Decoration.none;
  }
  Logger.log(`Building decorations for position: ${config.position}`);
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  const docLength = doc.length;

  // Encontrar posição do frontmatter
  let frontmatterEndPos = 0;
  const firstLine = doc.line(1);
  if (firstLine.text === '---') {
    for (let i = 2; i <= doc.lines; i++) {
      const line = doc.line(i);
      if (line.text === '---') {
        frontmatterEndPos = line.to + 1;
        break;
      }
    }
  }

  try {
    let widget = MirrorTemplateWidget.widgetInstanceCache.get(widgetId);
    if (!widget) {
      Logger.log(`Creating new widget instance for: ${widgetId}`);
      widget = new MirrorTemplateWidget(plugin, mirrorState, config, widgetId);
      MirrorTemplateWidget.widgetInstanceCache.set(widgetId, widget);
    } else {
      Logger.log(`Using cached widget instance for: ${widgetId}`);
    }

    // IMPORTANTE: Sempre adicionar o widget normalmente, independente de hideProps
    // O hideProps é tratado via CSS no main.ts
    if (config.position === 'top') {
      const topPos = Math.min(frontmatterEndPos, docLength);
      Logger.log(`Adding widget at top position: ${topPos}`);
      builder.add(
        topPos,
        topPos,
        Decoration.widget({
          widget: widget,
          block: true,
          side: 0
        })
      );
    } else if (config.position === 'bottom') {
      Logger.log('Adding widget at bottom');
      builder.add(
        docLength,
        docLength,
        Decoration.widget({
          widget: widget,
          block: true,
          side: 1
        })
      );
    }
  } catch (e) {
    Logger.error('Error building decorations:', e);
    return Decoration.none;
  }
  return builder.finish();
}