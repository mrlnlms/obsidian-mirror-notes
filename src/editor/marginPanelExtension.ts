import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { mirrorStateField, mirrorPluginFacet } from "./mirrorState";
import { MirrorState, ApplicableMirrorConfig, MARGIN_POSITIONS } from "./mirrorTypes";
import { renderMirrorTemplate } from "../rendering/templateRenderer";

export const PANEL_WIDTH = 250;

/** Build cache key for margin panel — includes widgetId so content changes trigger re-render */
export function marginPanelCacheKey(filePath: string, side: string, templatePath: string, widgetId: string): string {
  return `margin-${filePath}-${side}-${templatePath}-${widgetId}`;
}

/** Pure positioning logic — returns CSS style props for the panel */
export function calcPanelStyle(side: 'left' | 'right'): { left?: string; right?: string } {
  if (side === 'left') {
    return { left: '0px' };
  }
  return { right: '0px' };
}

/**
 * Margin panel ViewPlugin — injects a div into scrollDOM
 * positioned flush left or right against the scroll container edges.
 *
 * Uses ResizeObserver for responsive repositioning.
 */
export const mirrorMarginPanelPlugin = ViewPlugin.fromClass(class {
  private panel: HTMLElement | null = null;
  private side: 'left' | 'right' | null = null;
  private lastCacheKey: string | null = null;
  private lastWidgetId: string | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private renderGeneration = 0;

  constructor(private view: EditorView) {
    this.checkAndBuild();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.panel && this.side) {
        this.updatePosition(this.side);
      }
    });
    this.resizeObserver.observe(this.view.scrollDOM);
  }

  update(update: ViewUpdate) {
    const fieldState = update.view.state.field(mirrorStateField, false);
    const config = fieldState?.mirrorState?.config;

    if (!config || !MARGIN_POSITIONS.includes(config.position)) {
      // removePanel (not destroy) — preserve ResizeObserver across position changes.
      // If config changes back to margin later, checkAndBuild() recreates the panel
      // and the observer (still watching scrollDOM) repositions it on next resize.
      this.removePanel();
      return;
    }

    const newSide = config.position as 'left' | 'right';
    const widgetIdChanged = fieldState.mirrorState.widgetId !== this.lastWidgetId;
    // Rebuild on side change, geometry change, or content change (frontmatter/template edit)
    if (newSide !== this.side || update.geometryChanged || widgetIdChanged) {
      this.checkAndBuild();
    }
  }

  private checkAndBuild() {
    const fieldState = this.view.state.field(mirrorStateField, false);
    if (!fieldState) return;

    const { mirrorState } = fieldState;
    if (!mirrorState.enabled || !mirrorState.config) {
      this.removePanel();
      return;
    }

    const { config } = mirrorState;
    if (!MARGIN_POSITIONS.includes(config.position)) {
      this.removePanel();
      return;
    }

    const side = config.position as 'left' | 'right';
    const cacheKey = marginPanelCacheKey(mirrorState.filePath, side, config.templatePath, mirrorState.widgetId);
    this.lastWidgetId = mirrorState.widgetId;

    // Reuse existing panel if same config + same content (widgetId changes on frontmatter/template edits)
    if (this.panel && this.panel.isConnected && this.side === side && this.lastCacheKey === cacheKey) {
      this.updatePosition(side);
      return;
    }

    // Content changed — re-render in existing panel if position didn't change
    if (this.panel && this.panel.isConnected && this.side === side && this.lastCacheKey !== cacheKey) {
      this.lastCacheKey = cacheKey;
      this.renderContent(mirrorState, config, cacheKey);
      return;
    }

    this.removePanel();
    this.side = side;
    this.lastCacheKey = cacheKey;

    // Create panel element
    const panel = document.createElement('div');
    const classes = ['mirror-margin-panel', `mirror-margin-${side}`];
    if (config.showContainer) classes.push('mirror-container-styled');
    panel.className = classes.join(' ');
    panel.setAttribute('contenteditable', 'false');
    panel.style.position = 'absolute';
    panel.style.top = '0';
    panel.style.width = `${PANEL_WIDTH}px`;
    panel.style.minHeight = '100px';
    panel.style.zIndex = '1';

    this.panel = panel;

    // Insert into scrollDOM
    const scrollDOM = this.view.scrollDOM;
    scrollDOM.style.position = 'relative';
    scrollDOM.insertBefore(panel, scrollDOM.firstChild);

    this.updatePosition(side);
    this.renderContent(mirrorState, config, cacheKey);
  }

  private updatePosition(side: 'left' | 'right') {
    if (!this.panel) return;

    const style = calcPanelStyle(side);
    this.panel.style.left = style.left ?? '';
    this.panel.style.right = style.right ?? '';
  }

  private async renderContent(mirrorState: MirrorState, config: ApplicableMirrorConfig, cacheKey: string) {
    if (!this.panel) return;

    const plugin = this.view.state.facet(mirrorPluginFacet);
    if (!plugin) return;

    const sourcePath = mirrorState.filePath;
    if (!sourcePath) return;

    // Bump generation before starting async render. If another render starts
    // while we're awaiting, our generation becomes stale and we skip the DOM write.
    const gen = ++this.renderGeneration;

    // Render into a detached container so stale renders never touch the real panel
    const offscreen = document.createElement('div');

    await renderMirrorTemplate({
      plugin,
      templatePath: config.templatePath,
      variables: mirrorState.frontmatter || {},
      sourcePath,
      container: offscreen,
      cacheKey
    });

    // Only commit to the real panel if we're still the latest render
    if (gen === this.renderGeneration && this.panel) {
      this.panel.innerHTML = '';
      while (offscreen.firstChild) {
        this.panel.appendChild(offscreen.firstChild);
      }
    }
  }

  private removePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      this.side = null;
      this.lastCacheKey = null;
      this.lastWidgetId = null;
    }
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.removePanel();
  }
});
