import { MarkdownView, App } from "obsidian";
import MirrorUIPlugin from "../../main";
import { ApplicableMirrorConfig, MirrorPosition, DOM_POSITIONS, buildContainerClasses } from "../editor/mirrorTypes";
import { renderMirrorTemplate } from "./templateRenderer";
import { Logger } from "../dev/logger";
import { getVaultConfig, getBacklinkPlugin } from "../utils/obsidianInternals";

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
// Track MutationObservers per container for auto re-injection
const injectionObservers = new Map<string, MutationObserver>();

// --- Per-view identification via WeakMap ---
// Each pane gets a unique viewId tied to its containerEl.
// WeakMap auto-cleans when the DOM element is garbage-collected (leaf closes).
const viewIds = new WeakMap<HTMLElement, string>();
let viewIdCounter = 0;

/** Get or create a stable identifier for a view pane (tied to its containerEl lifecycle) */
export function getViewId(containerEl: HTMLElement): string {
  let id = viewIds.get(containerEl);
  if (!id) {
    id = `v${viewIdCounter++}`;
    viewIds.set(containerEl, id);
  }
  return id;
}

/** Get viewId for a code block element by traversing up to the pane container.
 *  Falls back to 'default' when DOM traversal fails (tests, detached elements). */
export function getBlockViewId(el: HTMLElement): string {
  const leafContent = el.closest('.workspace-leaf-content') as HTMLElement | null;
  if (leafContent) return getViewId(leafContent);
  return 'default';
}

/** Reset viewId counter (for tests only) */
export function resetViewIdCounter(): void {
  viewIdCounter = 0;
}

/** Unique key for a DOM injection (per view + file + position) */
function injectionKey(viewId: string, filePath: string, position: MirrorPosition): string {
  return `dom-${viewId}-${filePath}-${position}`;
}

/** Check if a DOM position's target element is actually visible based on Obsidian settings.
 *  Obsidian hides elements via CSS (display:none), never removes from DOM. */
export function isDomTargetVisible(app: App, position: MirrorPosition): boolean {
  switch (position) {
    case 'above-title':
      return !!getVaultConfig(app, "showInlineTitle");
    case 'above-properties':
    case 'below-properties':
      return getVaultConfig(app, "propertiesInDocument") !== "hidden";
    case 'above-backlinks':
    case 'below-backlinks': {
      // Only check plugin ON/OFF. backlinkInDocument is NOT reactive for open tabs
      // (config changes immediately but DOM only updates on tab close+reopen).
      // Actual content presence is checked in resolveTarget via children.length.
      const bl = getBacklinkPlugin(app);
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

/** Setup a MutationObserver on the container's parent to detect removal by Obsidian.
 *  When the container is removed (isConnected becomes false), disconnects and calls onRemoved. */
export function setupContainerObserver(
  key: string,
  container: HTMLElement,
  onRemoved: () => void
): void {
  injectionObservers.get(key)?.disconnect();

  const parent = container.parentElement;
  if (!parent) return;

  const observer = new MutationObserver(() => {
    if (!container.isConnected) {
      observer.disconnect();
      injectionObservers.delete(key);
      Logger.log(`[observer] container removed from DOM, re-injecting [${key}]`);
      onRemoved();
    }
  });

  observer.observe(parent, { childList: true });
  injectionObservers.set(key, observer);
}

/** Disconnect a single container observer */
export function disconnectObserver(key: string): void {
  injectionObservers.get(key)?.disconnect();
  injectionObservers.delete(key);
}

/** Disconnect all observers matching a key prefix */
export function disconnectObserversByPrefix(prefix: string): void {
  for (const [key, obs] of injectionObservers) {
    if (key.startsWith(prefix)) {
      obs.disconnect();
      injectionObservers.delete(key);
    }
  }
}

/** Inject or update a mirror widget at a DOM position */
export async function injectDomMirror(
  plugin: MirrorUIPlugin,
  view: MarkdownView,
  config: ApplicableMirrorConfig,
  frontmatter: Record<string, unknown>,
  onContainerRemoved?: () => void
): Promise<MirrorPosition> {
  const file = view.file;
  if (!file) return config.position;

  const viewContent = view.containerEl.querySelector('.view-content') as HTMLElement;
  if (!viewContent) return config.position;

  const viewId = getViewId(view.containerEl);
  const key = injectionKey(viewId, file.path, config.position);
  const resolved = resolveTarget(viewContent, config.position, plugin.app);

  // If target element not found, return fallback position for CM6 to handle
  if (!resolved) {
    const fallback = getFallbackPosition(config.position);
    Logger.log(`DOM position "${config.position}" target not found, falling back to "${fallback}"`);
    // Clean up any existing container for this position
    removeDomMirror(viewId, file.path, config.position);
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
  container.className = `${buildContainerClasses(config.position, config.showContainer)} mirror-dom-injection`;

  // Insert at the right position
  const { target, method } = resolved;
  if (method === 'before') {
    target.parentElement?.insertBefore(container, target);
  } else if (method === 'after') {
    target.parentElement?.insertBefore(container, target.nextSibling);
  } else if (method === 'appendChild') {
    target.appendChild(container);
  }

  // Setup observer for auto re-injection when Obsidian destroys the container
  if (onContainerRemoved && container.parentElement) {
    setupContainerObserver(key, container, onContainerRemoved);
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

  Logger.log(`DOM mirror injected at "${config.position}" for ${file.path} [${viewId}]`);
  return config.position; // successful injection, no fallback needed
}

/** Remove a DOM-injected mirror container */
export function removeDomMirror(viewId: string, filePath: string, position: MirrorPosition): void {
  const key = injectionKey(viewId, filePath, position);
  disconnectObserver(key);
  const container = injectedContainers.get(key);
  if (container) {
    container.remove();
    injectedContainers.delete(key);
  }
}

/** Remove all DOM-injected mirrors for a specific view + file */
export function removeAllDomMirrors(viewId: string, filePath: string): void {
  const prefix = `dom-${viewId}-${filePath}-`;
  for (const [key, container] of injectedContainers) {
    if (key.startsWith(prefix)) {
      disconnectObserver(key);
      container.remove();
      injectedContainers.delete(key);
    }
  }
}

/** Remove DOM mirrors for a view + file EXCEPT the given position (avoids race condition with async render) */
export function removeOtherDomMirrors(viewId: string, filePath: string, keepPosition: MirrorPosition): void {
  const prefix = `dom-${viewId}-${filePath}-`;
  const keepKey = injectionKey(viewId, filePath, keepPosition);
  for (const [key, container] of injectedContainers) {
    if (key.startsWith(prefix) && key !== keepKey) {
      disconnectObserver(key);
      container.remove();
      injectedContainers.delete(key);
    }
  }
}

/** Clean up all DOM-injected mirrors (for plugin unload) */
export function cleanupAllDomMirrors(): void {
  for (const obs of injectionObservers.values()) {
    obs.disconnect();
  }
  injectionObservers.clear();
  for (const container of injectedContainers.values()) {
    container.remove();
  }
  injectedContainers.clear();
}
