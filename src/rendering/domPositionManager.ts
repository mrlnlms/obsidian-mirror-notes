import { MarkdownView } from 'obsidian';
import { forceMirrorUpdateEffect } from '../editor/mirrorState';
import { getApplicableConfig } from '../editor/mirrorConfig';
import { CM6_POSITIONS } from '../editor/mirrorTypes';
import { isDomPosition, injectDomMirror, removeAllDomMirrors, removeOtherDomMirrors, getViewId } from './domInjector';
import { Logger } from '../dev/logger';
import { getEditorView } from '../utils/obsidianInternals';
import type MirrorUIPlugin from '../../main';

/** Helper to build positionOverrides key (per-view isolation) */
export function positionOverrideKey(viewId: string, filePath: string): string {
  return `${viewId}:${filePath}`;
}

export async function setupDomPosition(plugin: MirrorUIPlugin, view: MarkdownView, isRetry = false) {
  const file = view.file;
  if (!file) return;

  const viewId = getViewId(view.containerEl);
  const overrideKey = positionOverrideKey(viewId, file.path);

  // --- DIAGNOSTIC: multi-pane container state (temporario) ---
  const viewContent = view.containerEl.querySelector('.view-content');
  const existingContainers = viewContent?.querySelectorAll('.mirror-dom-injection') ?? [];
  Logger.log(`[DIAG-pane] viewId=${viewId} file=${file.path} existingContainers=${existingContainers.length} containerEl.id=${view.containerEl.className?.substring(0, 40)}`);
  for (const c of Array.from(existingContainers)) {
    Logger.log(`[DIAG-pane]   container key=${c.getAttribute('data-mirror-key')} isConnected=${c.isConnected} pos=${c.getAttribute('data-position')}`);
  }
  // --- END DIAGNOSTIC ---

  // Clear stale template dependency callbacks from previous file in this view.
  // Without this, navigating nota-A → nota-B leaves nota-A's callback registered;
  // editing the template would inject nota-A's frontmatter into nota-B's view.
  plugin.templateDeps.unregisterByPrefix(`dom-${viewId}-`);

  // Always clear override first so getApplicableConfig reads the original position.
  // Without this, a stale 'bottom' override from a previous fallback would persist
  // and prevent above-backlinks from being re-evaluated as a DOM position.
  plugin.positionOverrides.delete(overrideKey);

  const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
  // @ts-ignore — getMode not in official typings
  const viewMode: string = view.getMode?.() ?? 'source';
  const isReadingView = viewMode === 'preview';
  const config = getApplicableConfig(plugin, file, frontmatter, viewId, viewMode);
  // In Reading View, CM6 doesn't render — top/bottom need DOM injection too
  const configPos = config?.position;
  const shouldInjectDom = (configPos && isDomPosition(configPos)) ||
                          (isReadingView && configPos && (CM6_POSITIONS as readonly string[]).includes(configPos));
  if (!config || !shouldInjectDom) {
    removeAllDomMirrors(viewId, file.path);
    return;
  }

  // Only remove containers for OTHER positions (e.g. position changed in settings).
  // Keep current position's container — injectDomMirror reuses it, avoiding race
  // condition where removeAll destroys a container mid-async-render.
  removeOtherDomMirrors(viewId, file.path, config.position);

  let actualPos = await injectDomMirror(plugin, view, config, frontmatter);

  // Se fallback retornou outra posicao DOM, re-injetar nessa posicao
  if (actualPos !== config.position && isDomPosition(actualPos)) {
    const retryConfig = { ...config, position: actualPos };
    actualPos = await injectDomMirror(plugin, view, retryConfig, frontmatter);
  }

  // Registrar dependencia de template (re-render quando template muda)
  const blockKey = `dom-${viewId}-${file.path}-${config.position}`;
  plugin.templateDeps.register(config.templatePath, blockKey, async () => {
    const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
    let pos = await injectDomMirror(plugin, view, config, fm);
    if (pos !== config.position && isDomPosition(pos)) {
      pos = await injectDomMirror(plugin, view, { ...config, position: pos }, fm);
    }
  });

  if (actualPos !== config.position) {
    // DOM target not found — fallback to CM6
    Logger.log(`DOM fallback: ${config.position} -> ${actualPos} for ${file.path} [${viewId}]`);
    plugin.positionOverrides.set(overrideKey, actualPos);
    const cm = getEditorView(view);
    if (cm) {
      cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
    }

    // Backlinks may not have populated yet (children.length === 0 by timing).
    // Retry with increasing delays to catch async population.
    // isRetry guard prevents exponential cascade: retries don't schedule more retries.
    if (!isRetry && (config.position === 'above-backlinks' || config.position === 'below-backlinks')) {
      for (const delay of [500, 1500, 3000]) {
        setTimeout(async () => {
          // Only retry if override is still active (not yet resolved by an earlier retry)
          if (plugin.positionOverrides.has(overrideKey)) {
            Logger.log(`Retrying DOM position ${config.position} for ${file.path} [${viewId}] (${delay}ms)`);
            plugin.positionOverrides.delete(overrideKey);
            await setupDomPosition(plugin, view, true);
          }
        }, delay);
      }
    }
  } else {
    // DOM injection succeeded — force CM6 to clear any stale widget
    // (setupEditor runs sync before setupDomPosition and may have created
    // a CM6 widget using a stale positionOverride from a previous fallback)
    const cm = getEditorView(view);
    if (cm) {
      cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
    }
  }
}
