import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
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
      console.log(`[MirrorNotes] Creating new widget instance for: ${widgetId}`);
      widget = new MirrorTemplateWidget(plugin, mirrorState, config, widgetId);
      if ((MirrorTemplateWidget as any).widgetInstanceCache) {
        (MirrorTemplateWidget as any).widgetInstanceCache.set(widgetId, widget);
      }
    } else {
      console.log(`[MirrorNotes] Using cached widget instance for: ${widgetId}`);
    }

    // IMPORTANTE: Sempre adicionar o widget normalmente, independente de hideProps
    // O hideProps é tratado via CSS no main.ts
    if (config.position === 'top') {
      const topPos = Math.min(frontmatterEndPos, docLength);
      console.log(`[MirrorNotes] Adding widget at top position: ${topPos}`);
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
      console.log(`[MirrorNotes] Adding widget at bottom`);
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
    console.error('[MirrorNotes] Error building decorations:', e);
    return Decoration.none;
  }
  return builder.finish();
}