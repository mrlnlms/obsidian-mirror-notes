import { WidgetType, EditorView } from "@codemirror/view";
import { TFile, MarkdownRenderer } from "obsidian";
import { MirrorState, ApplicableMirrorConfig } from "./mirrorTypes";
import MirrorUIPlugin from "../../main";
import { mirrorStateField, toggleWidgetEffect, forceMirrorUpdateEffect } from './mirrorState';

// Caches estáticos do widget
export class MirrorTemplateWidget extends WidgetType {
  public static domCache = new Map<string, HTMLElement>();
  public static lastRenderedContent = new Map<string, string>();
  public static renderingPromises = new Map<string, Promise<void>>();

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

    console.log(`[MirrorNotes] Widget toDOM - cacheKey: ${cacheKey}, hasContainer: ${!!container}`);

    if (!container) {
      console.log(`[MirrorNotes] Creating new widget container for: ${cacheKey}`);
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
    const cacheKey = this.getCacheKey();
    if (MirrorTemplateWidget.renderingPromises.has(cacheKey)) {
      return MirrorTemplateWidget.renderingPromises.get(cacheKey);
    }
    const renderPromise = this.doUpdateContent(container, view);
    MirrorTemplateWidget.renderingPromises.set(cacheKey, renderPromise);
    try {
      await renderPromise;
    } finally {
      MirrorTemplateWidget.renderingPromises.delete(cacheKey);
    }
  }

  private async doUpdateContent(container: HTMLElement, view: EditorView) {
    const cacheKey = this.getCacheKey();
    try {
      console.log(`[MirrorNotes] Loading template: ${this.config.templatePath}`);
      const templateFile = this.plugin.app.vault.getAbstractFileByPath(this.config.templatePath);
      if (!templateFile || !(templateFile instanceof TFile)) {
        const errorMsg = `Template not found: ${this.config.templatePath}`;
        console.error(`[MirrorNotes] ${errorMsg}`);
        if (container.innerHTML !== `<div style="color: var(--text-error);">${errorMsg}</div>`) {
          container.innerHTML = `<div style="color: var(--text-error);">${errorMsg}</div>`;
        }
        return;
      }
      console.log(`[MirrorNotes] Template file found: ${templateFile.path}`);
      const templateContent = await this.plugin.app.vault.read(templateFile);
      console.log(`[MirrorNotes] Template content length: ${templateContent.length}`);
      let processedContent = templateContent;
      if (this.state.frontmatter && Object.keys(this.state.frontmatter).length > 0) {
        processedContent = templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return this.state.frontmatter[key] || match;
        });
      }
      const contentHash = this.simpleHash(processedContent);
      const lastContent = MirrorTemplateWidget.lastRenderedContent.get(cacheKey);
      if (lastContent === contentHash) {
        console.log(`[MirrorNotes] Content unchanged, skipping render`);
        return;
      }
      MirrorTemplateWidget.lastRenderedContent.set(cacheKey, contentHash);
      container.innerHTML = "";
      const contentDiv = document.createElement("div");
      contentDiv.style.cssText = "pointer-events: auto;";
      container.appendChild(contentDiv);

      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (activeFile) {
        console.log(`[MirrorNotes] Rendering markdown for active file: ${activeFile.path}`);
        await MarkdownRenderer.renderMarkdown(
          processedContent,
          contentDiv,
          activeFile.path,
          this.plugin
        );
        console.log(`[MirrorNotes] Markdown rendered successfully`);
      }
    } catch (error) {
      console.error("Error rendering template:", error);
      container.innerHTML = `<div style="color: var(--text-error);">Error: ${error}</div>`;
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
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