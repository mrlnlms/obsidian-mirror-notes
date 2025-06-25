import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { MirrorState } from "./mirrorTypes";
import MirrorUIPlugin from "../../main";
import { MirrorTemplateWidget } from "./mirrorWidget";
import { getApplicableConfig } from "./mirrorConfig";
import { mirrorStateField } from "./mirrorState";

// Widget para esconder o frontmatter
class HideFrontmatterWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.style.display = 'none';
    return span;
  }

  eq(other: WidgetType): boolean {
    return other instanceof HideFrontmatterWidget;
  }

  updateDOM(dom: HTMLElement): boolean {
    return false; // Não precisa atualizar
  }

  get estimatedHeight(): number {
    return 0;
  }

  get lineBreaks(): number {
    return 0;
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(dom: HTMLElement): void {
    // Não precisa fazer nada
  }
}

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

    // Se hideProps está ativo, NÃO adicionar o widget no top
    // porque ele vai conflitar com o frontmatter oculto
    if (config.hideProps && hasFrontmatter && frontmatterEndLine > 0) {
      console.log(`[MirrorNotes] Hiding frontmatter: lines 1-${frontmatterEndLine}, position: ${config.position}`);
      
      // Esconder o frontmatter primeiro
      const frontmatterStart = doc.line(1).from;
      const frontmatterEnd = doc.line(frontmatterEndLine).to;
      
      builder.add(
        frontmatterStart,
        frontmatterEnd,
        Decoration.replace({
          widget: new HideFrontmatterWidget()
        })
      );

      // Se a posição é 'top', adicionar o widget DEPOIS do frontmatter
      if (config.position === 'top') {
        console.log(`[MirrorNotes] Adding widget after frontmatter at position: ${frontmatterEnd}`);
        builder.add(
          frontmatterEnd,
          frontmatterEnd,
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
    } else {
      console.log(`[MirrorNotes] Normal behavior - hideProps: ${config.hideProps}, hasFrontmatter: ${hasFrontmatter}, position: ${config.position}`);
      // Comportamento normal quando hideProps está desativado
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
    }
  } catch (e) {
    console.error('[MirrorNotes] Error building decorations:', e);
    return Decoration.none;
  }
  return builder.finish();
} 