import { WidgetType, EditorView } from "@codemirror/view";
import { MirrorState, ApplicableMirrorConfig } from "./mirrorTypes";
import MirrorUIPlugin from "../../main";
import { Logger } from '../logger';
import { renderMirrorTemplate } from '../rendering/templateRenderer';

// Caches especificos do CM6 widget
export class MirrorTemplateWidget extends WidgetType {
  public static domCache = new Map<string, HTMLElement>();
  public static widgetInstanceCache = new Map<string, MirrorTemplateWidget>();

  constructor(
    private plugin: MirrorUIPlugin,
    private state: MirrorState,
    private config: ApplicableMirrorConfig,
    private widgetId: string
  ) {
    super();
  }

  getCacheKey(): string {
    return `${this.widgetId}-${this.config.position}`;
  }

  toDOM(view: EditorView): HTMLElement {
    // A função cleanOrphanWidgets(view) deve ser importada de mirrorDecorations.ts depois
    // cleanOrphanWidgets(view);

    const cacheKey = this.getCacheKey();
    let container = MirrorTemplateWidget.domCache.get(cacheKey);

    Logger.log(`Widget toDOM - cacheKey: ${cacheKey}, hasContainer: ${!!container}`);

    if (!container) {
      Logger.log(`Creating new widget container for: ${cacheKey}`);
      container = document.createElement("div");
      container.className = `mirror-ui-widget elemento-geral mirror-position-${this.config.position}`;
      container.setAttribute("data-widget-id", this.widgetId);
      container.setAttribute("data-position", this.config.position);
      container.setAttribute("contenteditable", "false");
      container.style.cssText = `
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
        position: relative;
        min-height: 100px;
        width: 100%;
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
        pointer-events: none;
      `;
      if (this.config.position === "bottom") {
        container.style.cssText += `
          margin-top: 30px !important;
          margin-bottom: 20px !important;
          clear: both;
          display: block;
        `;
      }
      container.addEventListener("mousedown", (e) => {
        if (e.target !== container) {
          e.stopPropagation();
        } else {
          e.preventDefault();
        }
      });
      MirrorTemplateWidget.domCache.set(cacheKey, container);
      container.innerHTML = `<div style="text-align: center; opacity: 0.5;">Loading template...</div>`;
    }

    this.updateContentIfNeeded(container, view);
    return container;
  }

  async updateContentIfNeeded(container: HTMLElement, view: EditorView) {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) return;

    await renderMirrorTemplate({
      plugin: this.plugin,
      templatePath: this.config.templatePath,
      variables: this.state.frontmatter || {},
      sourcePath: activeFile.path,
      container,
      cacheKey: this.getCacheKey()
    });
  }

  eq(other: WidgetType): boolean {
    if (!(other instanceof MirrorTemplateWidget)) return false;
    const otherWidget = other as MirrorTemplateWidget;
    return this.widgetId === otherWidget.widgetId &&
      this.config.templatePath === otherWidget.config.templatePath &&
      this.config.position === otherWidget.config.position;
  }

  destroy() {
    // Não limpar cache imediatamente
  }
}