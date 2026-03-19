import { MarkdownView } from 'obsidian';
import { forceMirrorUpdateEffect } from '../editor/mirrorState';
import { computeMirrorRuntimeDecision } from '../editor/mirrorDecision';
import { isDomPosition, injectDomMirror, removeAllDomMirrors, removeOtherDomMirrors, getViewId, disconnectObserversByPrefix } from './domInjector';
import { Logger } from '../dev/logger';
import { traceMirrorDecision } from '../editor/mirrorUtils';
import { getEditorView, getViewMode } from '../utils/obsidianInternals';
import { TIMING } from '../editor/timingConfig';
import type MirrorUIPlugin from '../../main';

/** Helper to build positionOverrides key (per-view isolation) */
export function positionOverrideKey(viewId: string, filePath: string): string {
  return `${viewId}:${filePath}`;
}

/** Cooldown: skip redundant setupDomPosition calls within SETUP_COOLDOWN ms for the same view+file.
 *  Observer re-injection fires instantly; event handlers (file-open, active-leaf-change)
 *  fire 25-50ms later for the same view — the second call is wasted work.
 *  Observer callbacks (isMutationRecovery) bypass the cooldown but reset the timer. */
const lastSetupTime = new Map<string, number>();

/** Clear cooldown cache (called on plugin unload) */
export function clearSetupCooldowns(): void {
  lastSetupTime.clear();
}

export async function setupDomPosition(
  plugin: MirrorUIPlugin, view: MarkdownView,
  isRetry = false, isMutationRecovery = false
) {
  const file = view.file;
  if (!file) return;

  const viewId = getViewId(view.containerEl);
  const overrideKey = positionOverrideKey(viewId, file.path);

  // Cooldown guard: skip if we just ran for this view+file (observer + event overlap).
  // Mutation recovery (observer callback) always passes — it detected real container removal.
  if (!isRetry && !isMutationRecovery) {
    const now = Date.now();
    const last = lastSetupTime.get(overrideKey);
    if (last && (now - last) < TIMING.SETUP_COOLDOWN) {
      traceMirrorDecision({
        file: file.path,
        viewId,
        event: 'cooldown-skip',
        reason: `${now - last}ms ago`,
      });
      return;
    }
  }
  lastSetupTime.set(overrideKey, Date.now());

  // Clear stale template dependency callbacks from previous file in this view.
  // Without this, navigating nota-A → nota-B leaves nota-A's callback registered;
  // editing the template would inject nota-A's frontmatter into nota-B's view.
  plugin.templateDeps.unregisterByPrefix(`dom-${viewId}-`);
  disconnectObserversByPrefix(`dom-${viewId}-`);

  // Always clear override first so getApplicableConfig reads the original position.
  // Without this, a stale 'bottom' override from a previous fallback would persist
  // and prevent above-backlinks from being re-evaluated as a DOM position.
  plugin.positionOverrides.delete(overrideKey);

  const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
  const viewMode = getViewMode(view);

  // Use central decision for engine resolution
  const decision = computeMirrorRuntimeDecision(plugin, file, frontmatter, viewId, viewMode);
  const config = decision.config;

  // DOM injection needed when engine is 'dom' (includes RV + CM6 positions)
  // Note: positionOverride was deleted at line 64, so decision.engine reflects the BASE position
  if (!config || decision.engine !== 'dom') {
    removeAllDomMirrors(viewId, file.path);
    return;
  }

  // Only remove containers for OTHER positions (e.g. position changed in settings).
  // Keep current position's container — injectDomMirror reuses it, avoiding race
  // condition where removeAll destroys a container mid-async-render.
  removeOtherDomMirrors(viewId, file.path, config.position);

  // Callback for MutationObserver: re-inject when Obsidian destroys the container.
  // isMutationRecovery=true bypasses cooldown (real removal, not duplicate event).
  const reInject = () => {
    if (view.file) setupDomPosition(plugin, view, false, true);
  };

  let actualPos = await injectDomMirror(plugin, view, config, frontmatter, reInject);

  // Se fallback retornou outra posicao DOM, re-injetar nessa posicao
  if (actualPos !== config.position && isDomPosition(actualPos)) {
    const retryConfig = { ...config, position: actualPos };
    actualPos = await injectDomMirror(plugin, view, retryConfig, frontmatter, reInject);
  }

  // Registrar dependencia de template (re-render quando template muda)
  const blockKey = `dom-${viewId}-${file.path}-${config.position}`;
  plugin.templateDeps.register(config.templatePath, blockKey, async () => {
    const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
    let pos = await injectDomMirror(plugin, view, config, fm, reInject);
    if (pos !== config.position && isDomPosition(pos)) {
      pos = await injectDomMirror(plugin, view, { ...config, position: pos }, fm, reInject);
    }
  });

  Logger.log(`DOM injection result: ${config.position} → ${actualPos} for ${file.path} [${viewId}]`);

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
        plugin.scheduleTimer(async () => {
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
