import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { mirrorStateField, mirrorPluginFacet } from "./mirrorState";
import { MARGIN_POSITIONS } from "./mirrorTypes";
import { renderMirrorTemplate } from "../rendering/templateRenderer";
import { Logger } from "../logger";

const PANEL_WIDTH = 250;

/**
 * Basic margin panel ViewPlugin — injects a div into scrollDOM
 * positioned to the left or right of the editor content.
 *
 * v32: Simplified version. No line numbers detection, no readable-line-width handling.
 * Uses contentDOM.offsetLeft for basic positioning.
 */
export const mirrorMarginPanelPlugin = ViewPlugin.fromClass(class {
  private panel: HTMLElement | null = null;
  private side: 'left' | 'right' | null = null;
  private lastCacheKey: string | null = null;

  constructor(private view: EditorView) {
    this.checkAndBuild();
  }

  update(update: ViewUpdate) {
    const fieldState = update.view.state.field(mirrorStateField, false);
    const config = fieldState?.mirrorState?.config;

    if (!config || !MARGIN_POSITIONS.includes(config.position)) {
      this.destroy();
      return;
    }

    // Rebuild only if position/config changed or geometry changed (not on every keystroke)
    const newSide = config.position as 'left' | 'right';
    if (newSide !== this.side || update.geometryChanged) {
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
    const cacheKey = `margin-${side}-${config.templatePath}`;

    // Reuse existing panel if same config
    if (this.panel && this.panel.isConnected && this.side === side && this.lastCacheKey === cacheKey) {
      this.updatePosition(side);
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

    const contentLeft = this.view.contentDOM.offsetLeft;

    if (side === 'left') {
      // Position to the left of content area
      const leftPos = Math.max(0, contentLeft - PANEL_WIDTH - 20);
      this.panel.style.left = `${leftPos}px`;
      this.panel.style.right = '';
    } else {
      // Position to the right of content area
      const contentRight = contentLeft + this.view.contentDOM.offsetWidth;
      this.panel.style.left = `${contentRight + 20}px`;
      this.panel.style.right = '';
    }
  }

  private async renderContent(mirrorState: any, config: any, cacheKey: string) {
    if (!this.panel) return;

    const plugin = this.view.state.facet(mirrorPluginFacet);
    if (!plugin) return;

    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) return;

    await renderMirrorTemplate({
      plugin,
      templatePath: config.templatePath,
      variables: mirrorState.frontmatter || {},
      sourcePath: activeFile.path,
      container: this.panel,
      cacheKey
    });
  }

  private removePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      this.side = null;
      this.lastCacheKey = null;
    }
  }

  destroy() {
    this.removePanel();
  }
});
