import { TFile, MarkdownRenderer, MarkdownRenderChild, Component } from "obsidian";
import MirrorUIPlugin from "../../main";
import { Logger } from '../logger';

export interface RenderContext {
  plugin: MirrorUIPlugin;
  templatePath: string;
  variables: Record<string, string>;
  sourcePath: string;
  container: HTMLElement;
  cacheKey: string;
  component?: Component;
}

// Caches compartilhados entre CM6 widget e code block processor
const lastRenderedContent = new Map<string, string>();
const renderingPromises = new Map<string, Promise<void>>();

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

export async function renderMirrorTemplate(ctx: RenderContext): Promise<void> {
  const { plugin, templatePath, variables, sourcePath, container, cacheKey } = ctx;

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
      processedContent = templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    }

    const contentHash = simpleHash(processedContent);
    const lastContent = lastRenderedContent.get(cacheKey);
    // Cache de hash so para CM6 widgets (container reusado). Code blocks (com component) sempre renderizam.
    if (!ctx.component && lastContent === contentHash && container.children.length > 0) {
      Logger.log('Content unchanged and container has content, skipping render');
      return;
    }

    lastRenderedContent.set(cacheKey, contentHash);
    container.innerHTML = "";
    const contentDiv = document.createElement("div");
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
      const renderChild = new MarkdownRenderChild(contentDiv);
      ctx.component.addChild(renderChild);
    }

    Logger.log('Markdown rendered successfully');
  } catch (error) {
    Logger.error('Error rendering template:', error);
    container.innerHTML = `<div style="color: var(--text-error);">Error: ${error}</div>`;
  }
}

export function clearRenderCache(cacheKey?: string): void {
  if (cacheKey) {
    lastRenderedContent.delete(cacheKey);
  } else {
    lastRenderedContent.clear();
  }
}
