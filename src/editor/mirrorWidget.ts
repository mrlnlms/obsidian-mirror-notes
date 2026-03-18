import { WidgetType, EditorView } from "@codemirror/view";
import { MirrorState, ApplicableMirrorConfig } from "./mirrorTypes";
import MirrorUIPlugin from "../../main";
import { Logger } from '../dev/logger';
import { renderMirrorTemplate } from '../rendering/templateRenderer';

// Caches especificos do CM6 widget
export class MirrorTemplateWidget extends WidgetType {
  public static domCache = new Map<string, HTMLElement>();
  public static widgetInstanceCache = new Map<string, MirrorTemplateWidget>();

  constructor(
    private plugin: MirrorUIPlugin,
    private state: MirrorState,
    private config: ApplicableMirrorConfig,
    private widgetId: string,
    private frontmatterHash: string
  ) {
    super();
  }

  getCacheKey(): string {
    return `${this.widgetId}-${this.config.position}`;
  }

  toDOM(view: EditorView): HTMLElement {
    // cleanOrphanWidgets removido (v33) — nunca era chamado

    const cacheKey = this.getCacheKey();
    let container = MirrorTemplateWidget.domCache.get(cacheKey);

    Logger.log(`Widget toDOM - cacheKey: ${cacheKey}, hasContainer: ${!!container}`);

    if (!container) {
      Logger.log(`Creating new widget container for: ${cacheKey}`);
      container = document.createElement("div");
      container.setAttribute("data-widget-id", this.widgetId);
      container.setAttribute("data-position", this.config.position);
      container.setAttribute("contenteditable", "false");
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

    // Atualizar classes sempre (showContainer pode mudar via settings)
    const classes = ['mirror-ui-widget', `mirror-position-${this.config.position}`];
    if (this.config.showContainer) classes.push('mirror-container-styled');
    container.className = classes.join(' ');

    // Fire-and-forget: toDOM must be synchronous (CM6 API), so async render
    // runs in background. "Loading template..." placeholder handles the interim.
    this.updateContentIfNeeded(container, view);
    return container;
  }

  async updateContentIfNeeded(container: HTMLElement, view: EditorView) {
    // Usar filePath armazenado no state — getActiveFile() retorna o painel ativo,
    // que pode ser outro arquivo (ex: template sendo editado em outro painel)
    const sourcePath = this.state.filePath;
    if (!sourcePath) return;

    await renderMirrorTemplate({
      plugin: this.plugin,
      templatePath: this.config.templatePath,
      variables: this.state.frontmatter || {},
      sourcePath,
      container,
      cacheKey: this.getCacheKey()
    });
  }

  eq(other: WidgetType): boolean {
    if (!(other instanceof MirrorTemplateWidget)) return false;
    const otherWidget = other as MirrorTemplateWidget;
    return this.widgetId === otherWidget.widgetId &&
      this.config.templatePath === otherWidget.config.templatePath &&
      this.config.position === otherWidget.config.position &&
      this.config.showContainer === otherWidget.config.showContainer &&
      this.frontmatterHash === otherWidget.frontmatterHash;
  }

  destroy() {
    // Não limpar cache imediatamente
  }
}