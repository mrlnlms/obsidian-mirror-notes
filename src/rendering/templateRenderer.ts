import { TFile, MarkdownRenderer, MarkdownRenderChild, Component } from "obsidian";
import MirrorUIPlugin from "../../main";
import { Logger } from '../dev/logger';
import { resolveVariable, traceMirrorDecision, hashObject } from '../editor/mirrorUtils';

export interface RenderContext {
  plugin: MirrorUIPlugin;
  templatePath: string;
  variables: Record<string, unknown>;
  sourcePath: string;
  container: HTMLElement;
  cacheKey: string;
  component?: Component;
}

// Caches compartilhados entre CM6 widget e code block processor
const lastRenderedContent = new Map<string, string>();
const renderingPromises = new Map<string, Promise<void>>();
/** Track last MarkdownRenderChild per code block to unload on re-render.
 *  Without this, each doRender() adds a new child to the component without
 *  removing the previous one, leaking detached DOM lifecycle handlers. */
const lastRenderChildren = new Map<string, MarkdownRenderChild>();

export async function renderMirrorTemplate(ctx: RenderContext): Promise<void> {
  const { cacheKey } = ctx;

  // Guard: ja renderizando este cache key?
  if (renderingPromises.has(cacheKey)) {
    return renderingPromises.get(cacheKey);
  }

  const renderPromise = doRender(ctx);
  renderingPromises.set(cacheKey, renderPromise);
  try {
    await renderPromise;
  } finally {
    renderingPromises.delete(cacheKey);
  }
}

async function doRender(ctx: RenderContext): Promise<void> {
  const { plugin, templatePath, variables, sourcePath, container, cacheKey } = ctx;

  try {
    Logger.log(`Loading template: ${templatePath}`);
    const templateFile = plugin.app.vault.getAbstractFileByPath(templatePath);
    if (!templateFile || !(templateFile instanceof TFile)) {
      const errorMsg = `Template not found: ${templatePath}`;
      Logger.error(errorMsg);

      container.innerHTML = '';
      const errorDiv = container.createEl('div', { cls: 'mirror-template-error' });
      errorDiv.style.cssText = 'color: var(--text-error); pointer-events: auto; user-select: text; -webkit-user-select: text;';
      errorDiv.createEl('span', { text: errorMsg + ' ' });
      const link = errorDiv.createEl('a', {
        text: 'Open settings',
        attr: { style: 'cursor: pointer; text-decoration: underline;' }
      });
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        plugin.openSettingsToField(templatePath);
      });
      return;
    }

    Logger.log(`Template file found: ${templateFile.path}`);
    const templateContent = await plugin.app.vault.cachedRead(templateFile);
    Logger.log(`Template content length: ${templateContent.length}`);

    let processedContent = templateContent;
    if (variables && Object.keys(variables).length > 0) {
      processedContent = templateContent.replace(/\{\{([\w\p{L}\p{N}.-]+)\}\}/gu, (match, key) => {
        const val = resolveVariable(key, variables);
        return val !== undefined ? val : match;
      });
    }

    const contentHash = hashObject(processedContent);
    const lastContent = lastRenderedContent.get(cacheKey);
    // Cache de hash so para CM6 widgets (container reusado). Code blocks (com component) sempre renderizam.
    if (!ctx.component && lastContent === contentHash && container.children.length > 0) {
      traceMirrorDecision({
        file: ctx.sourcePath,
        event: 'render-skip',
        reason: 'content unchanged',
      });
      Logger.log('Content unchanged and container has content, skipping render');
      return;
    }

    lastRenderedContent.set(cacheKey, contentHash);
    container.innerHTML = "";
    const contentDiv = document.createElement("div");
    contentDiv.className = "markdown-rendered";
    contentDiv.style.cssText = "pointer-events: auto;";
    container.appendChild(contentDiv);

    const component = ctx.component ?? plugin;

    Logger.log(`Rendering markdown for: ${sourcePath}`);
    await MarkdownRenderer.renderMarkdown(
      processedContent,
      contentDiv,
      sourcePath,
      component
    );

    // Registrar no lifecycle do Obsidian (necessario pro Reading View)
    if (ctx.component) {
      // Unload previous child to avoid accumulating detached lifecycle handlers
      const prev = lastRenderChildren.get(cacheKey);
      if (prev) {
        ctx.component.removeChild(prev);
      }
      const renderChild = new MarkdownRenderChild(contentDiv);
      ctx.component.addChild(renderChild);
      lastRenderChildren.set(cacheKey, renderChild);
    }

    Logger.log('Markdown rendered successfully');
  } catch (error) {
    Logger.error('Error rendering template:', error);
    container.innerHTML = '';
    const errDiv = container.createEl('div', { cls: 'mirror-template-error' });
    errDiv.style.color = 'var(--text-error)';
    errDiv.textContent = `Error: ${String(error)}`;
  }
}

export function clearRenderCache(cacheKey?: string): void {
  if (cacheKey) {
    lastRenderedContent.delete(cacheKey);
  } else {
    lastRenderedContent.clear();
    // lastRenderChildren NOT cleared here — cold-start retry calls clearRenderCache()
    // while blocks are still mounted. Clearing would orphan their lifecycle handlers.
    // Use clearAllRenderChildren() on plugin unload instead.
  }
}

/** Clear ALL lastRenderChildren entries. Only call on plugin unload
 *  when all blocks are being destroyed anyway. */
export function clearAllRenderChildren(): void {
  lastRenderChildren.clear();
}

/** Remove a specific entry from the lastRenderChildren map.
 *  Call this when a code block is destroyed to prevent memory leaks. */
export function clearRenderChild(cacheKey: string): void {
  lastRenderChildren.delete(cacheKey);
}
