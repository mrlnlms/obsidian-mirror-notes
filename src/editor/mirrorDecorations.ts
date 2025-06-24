import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { MirrorState } from "./mirrorTypes";
import MirrorUIPlugin from "../../main";
import { MirrorTemplateWidget } from "./mirrorWidget";
import { getApplicableConfig } from "./mirrorConfig";
import { mirrorStateField } from "./mirrorState";

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
      console.log(`[MirrorNotes] Removing orphan widget: ${widgetId}`);
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
  console.log(`[MirrorNotes] Building decorations for position: ${config.position}`);
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  const docLength = doc.length;

  // Encontrar posição do frontmatter
  let frontmatterEndPos = 0;
  let frontmatterEndLine = 0;
  let hasFrontmatter = false;
  const firstLine = doc.line(1);
  if (firstLine.text === '---') {
    hasFrontmatter = true;
    for (let i = 2; i <= doc.lines; i++) {
      const line = doc.line(i);
      if (line.text === '---') {
        frontmatterEndLine = i;
        frontmatterEndPos = line.to + 1;
        break;
      }
    }
  }

  try {
    let widget = (MirrorTemplateWidget as any).widgetInstanceCache?.get?.(widgetId);
    if (!widget) {
      widget = new MirrorTemplateWidget(plugin, mirrorState, config, widgetId);
      if ((MirrorTemplateWidget as any).widgetInstanceCache) {
        (MirrorTemplateWidget as any).widgetInstanceCache.set(widgetId, widget);
      }
    }
    if (config.position === 'top') {
      const topPos = Math.min(frontmatterEndPos, docLength);
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
    if (config.hideProps && hasFrontmatter && frontmatterEndLine > 0) {
      for (let lineNum = 1; lineNum <= frontmatterEndLine && lineNum <= doc.lines; lineNum++) {
        const line = doc.line(lineNum);
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: { style: 'display: none;' }
          })
        );
      }
    }
  } catch (e) {
    console.error('[MirrorNotes] Error building decorations:', e);
    return Decoration.none;
  }
  return builder.finish();
} 