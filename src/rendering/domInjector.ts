import { MarkdownView, App } from "obsidian";
import MirrorUIPlugin from "../../main";
import { ApplicableMirrorConfig, MirrorPosition, DOM_POSITIONS } from "../editor/mirrorTypes";
import { renderMirrorTemplate } from "./templateRenderer";
import { Logger } from "../dev/logger";

// Selectors for native Obsidian DOM elements
const SELECTOR_INLINE_TITLE = '.inline-title';
const SELECTOR_METADATA_CONTAINER = '.metadata-container';
const SELECTOR_EMBEDDED_BACKLINKS = '.embedded-backlinks';
// Reading View selectors (inside .markdown-preview-sizer)
const SELECTOR_RV_SIZER = '.markdown-preview-sizer';
const SELECTOR_RV_FRONTMATTER = '.el-pre.mod-frontmatter';
const SELECTOR_RV_MOD_HEADER = '.mod-header';
const SELECTOR_RV_MOD_FOOTER = '.mod-footer';

// Track injected containers per view for cleanup
const injectedContainers = new Map<string, HTMLElement>();

/** Unique key for a DOM injection (per file + position) */
function injectionKey(filePath: string, position: MirrorPosition): string {
  return `dom-${filePath}-${position}`;
}

/** Check if a DOM position's target element is actually visible based on Obsidian settings.
 *  Obsidian hides elements via CSS (display:none), never removes from DOM. */
export function isDomTargetVisible(app: App, position: MirrorPosition): boolean {
  switch (position) {
    case 'above-title':
      // @ts-ignore — getConfig not in official typings
      return !!app.vault.getConfig("showInlineTitle");
    case 'above-properties':
    case 'below-properties':
      // @ts-ignore
      return app.vault.getConfig("propertiesInDocument") !== "hidden";
    case 'above-backlinks':
    case 'below-backlinks': {
      // Only check plugin ON/OFF. backlinkInDocument is NOT reactive for open tabs
      // (config changes immediately but DOM only updates on tab close+reopen).
      // Actual content presence is checked in resolveTarget via children.length.
      // @ts-ignore — internalPlugins not in official typings
      const bl = (app as any).internalPlugins?.plugins?.['backlink'];
      return !!bl?.enabled;
    }
    default:
      return true;
  }
}

/** Resolve the target element and insertion method for a DOM position */
export function resolveTarget(
  viewContent: HTMLElement,
  position: MirrorPosition,
  app?: App
): { target: HTMLElement; method: 'before' | 'after' | 'appendChild' } | null {
  // If Obsidian setting hides the target, treat as not found (trigger fallback)
  if (app && !isDomTargetVisible(app, position)) return null;

  switch (position) {
    case 'above-title': {
      const title = viewContent.querySelector(SELECTOR_INLINE_TITLE) as HTMLElement;
      if (title) return { target: title, method: 'before' };
      return null; // fallback
    }
    case 'above-properties': {
      const meta = viewContent.querySelector(SELECTOR_METADATA_CONTAINER) as HTMLElement;
      if (meta) return { target: meta, method: 'before' };
      return null;
    }
    case 'below-properties': {
      const meta = viewContent.querySelector(SELECTOR_METADATA_CONTAINER) as HTMLElement;
      if (meta) return { target: meta, method: 'after' };
      return null;
    }
    case 'above-backlinks': {
      const backlinks = viewContent.querySelector(SELECTOR_EMBEDDED_BACKLINKS) as HTMLElement;
      // Two-layer check (v40): isDomTargetVisible gates on plugin ON/OFF,
      // children.length gates on actual rendered content.
      // children = [] when backlinkInDocument OFF or not yet populated (timing).
      // Retry in setupDomPosition handles the timing case.
      if (backlinks && backlinks.children.length > 0) return { target: backlinks, method: 'before' };
      return null;
    }
    case 'below-backlinks': {
      const backlinks = viewContent.querySelector(SELECTOR_EMBEDDED_BACKLINKS) as HTMLElement;
      if (backlinks && backlinks.children.length > 0) return { target: backlinks, method: 'after' };
      return null;
    }
    case 'top': {
      // Reading View only — in Live Preview, CM6 widget handles this.
      // .markdown-preview-sizer only exists inside .markdown-reading-view.
      const sizer = viewContent.querySelector(SELECTOR_RV_SIZER);
      if (!sizer) return null;
      // Insert after frontmatter block if visible, otherwise after mod-header
      const frontmatter = sizer.querySelector(SELECTOR_RV_FRONTMATTER) as HTMLElement;
      if (frontmatter) return { target: frontmatter, method: 'after' };
      const header = sizer.querySelector(SELECTOR_RV_MOD_HEADER) as HTMLElement;
      if (header) return { target: header, method: 'after' };
      return null;
    }
    case 'bottom': {
      // Reading View only — insert before .mod-footer (always last child of sizer).
      const sizer = viewContent.querySelector(SELECTOR_RV_SIZER);
      if (!sizer) return null;
      const footer = sizer.querySelector(SELECTOR_RV_MOD_FOOTER) as HTMLElement;
      if (footer) return { target: footer, method: 'before' };
      // Fallback: append to sizer
      return { target: sizer as HTMLElement, method: 'appendChild' };
    }
    default:
      return null;
  }
}

/** Get the fallback position when the target element is hidden or doesn't exist */
export function getFallbackPosition(position: MirrorPosition): MirrorPosition {
  switch (position) {
    case 'above-title':
      return 'above-properties';
    case 'above-properties':
    case 'below-properties':
      return 'top';
    case 'above-backlinks':
    case 'below-backlinks':
      return 'bottom';
    default:
      return 'top';
  }
}

/** Check if a position is a DOM position */
export function isDomPosition(position: MirrorPosition): boolean {
  return DOM_POSITIONS.includes(position);
}

/** Inject or update a mirror widget at a DOM position */
export async function injectDomMirror(
  plugin: MirrorUIPlugin,
  view: MarkdownView,
  config: ApplicableMirrorConfig,
  frontmatter: Record<string, string>
): Promise<MirrorPosition> {
  const file = view.file;
  if (!file) return config.position;

  const viewContent = view.containerEl.querySelector('.view-content') as HTMLElement;
  if (!viewContent) return config.position;

  const key = injectionKey(file.path, config.position);
  const resolved = resolveTarget(viewContent, config.position, plugin.app);

  // If target element not found, return fallback position for CM6 to handle
  if (!resolved) {
    const fallback = getFallbackPosition(config.position);
    Logger.log(`DOM position "${config.position}" target not found, falling back to "${fallback}"`);
    // Clean up any existing container for this position
    removeDomMirror(file.path, config.position);
    return fallback;
  }

  // Reuse or create container
  let container = injectedContainers.get(key);
  if (!container || !container.isConnected) {
    container = document.createElement('div');
    container.setAttribute('data-mirror-key', key);
    container.setAttribute('data-position', config.position);
    container.setAttribute('contenteditable', 'false');
    injectedContainers.set(key, container);
  }

  // Atualizar classes sempre (showContainer pode mudar via settings)
  const classes = ['mirror-ui-widget', 'mirror-dom-injection', `mirror-position-${config.position}`];
  if (config.showContainer) classes.push('mirror-container-styled');
  container.className = classes.join(' ');

  // Insert at the right position
  const { target, method } = resolved;
  if (method === 'before') {
    target.parentElement?.insertBefore(container, target);
  } else if (method === 'after') {
    target.parentElement?.insertBefore(container, target.nextSibling);
  } else if (method === 'appendChild') {
    target.appendChild(container);
  }

  // Render template content
  await renderMirrorTemplate({
    plugin,
    templatePath: config.templatePath,
    variables: frontmatter,
    sourcePath: file.path,
    container,
    cacheKey: key
  });

  Logger.log(`DOM mirror injected at "${config.position}" for ${file.path}`);
  return config.position; // successful injection, no fallback needed
}

/** Remove a DOM-injected mirror container */
export function removeDomMirror(filePath: string, position: MirrorPosition): void {
  const key = injectionKey(filePath, position);
  const container = injectedContainers.get(key);
  if (container) {
    container.remove();
    injectedContainers.delete(key);
  }
}

/** Remove all DOM-injected mirrors for a file */
export function removeAllDomMirrors(filePath: string): void {
  for (const [key, container] of injectedContainers) {
    if (key.startsWith(`dom-${filePath}-`)) {
      container.remove();
      injectedContainers.delete(key);
    }
  }
}

/** Remove DOM mirrors for a file EXCEPT the given position (avoids race condition with async render) */
export function removeOtherDomMirrors(filePath: string, keepPosition: MirrorPosition): void {
  const keepKey = injectionKey(filePath, keepPosition);
  for (const [key, container] of injectedContainers) {
    if (key.startsWith(`dom-${filePath}-`) && key !== keepKey) {
      container.remove();
      injectedContainers.delete(key);
    }
  }
}

/** Clean up all DOM-injected mirrors (for plugin unload) */
export function cleanupAllDomMirrors(): void {
  for (const container of injectedContainers.values()) {
    container.remove();
  }
  injectedContainers.clear();
}
