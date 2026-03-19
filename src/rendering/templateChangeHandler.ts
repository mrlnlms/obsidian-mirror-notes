import { MarkdownView } from 'obsidian';
import { mirrorStateField, forceMirrorUpdateEffect } from '../editor/mirrorState';
import { TIMING } from '../editor/timingConfig';
import { Logger } from '../dev/logger';
import { getEditorView } from '../utils/obsidianInternals';
import type MirrorUIPlugin from '../../main';

/** Per-template debounce: each template gets its own timeout so concurrent
 *  changes to different templates don't cancel each other's callbacks. */
const templateUpdateTimeouts = new Map<string, NodeJS.Timeout>();

export function handleTemplateChange(plugin: MirrorUIPlugin, filePath: string) {
  // Fast path: se nenhum callback E nao e template dos settings → skip
  // Check at event time to avoid scheduling unnecessary timeouts
  const hasCallbacksNow = plugin.templateDeps.getDependentCallbacks(filePath).length > 0;
  if (!hasCallbacksNow && !plugin.knownTemplatePaths.has(filePath)) return;

  const existing = templateUpdateTimeouts.get(filePath);
  if (existing) clearTimeout(existing);

  templateUpdateTimeouts.set(filePath, setTimeout(() => {
    templateUpdateTimeouts.delete(filePath);
    // Re-query callbacks at execution time (not event time) — blocks may have been
    // destroyed during the debounce window, removing their callbacks from the registry.
    const templateCbs = plugin.templateDeps.getDependentCallbacks(filePath);
    if (templateCbs.length > 0) {
      Logger.log(`Template refresh: ${templateCbs.length} mirror(s) depend on ${filePath}`);
      for (const cb of templateCbs) {
        cb();
      }
    }
    // CM6 widgets (settings-based) — iterateAllLeaves DENTRO do debounce
    plugin.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof MarkdownView && leaf.view.file) {
        const cm = getEditorView(leaf.view as MarkdownView);
        if (!cm) return;
        const fieldState = cm.state.field(mirrorStateField, false);
        if (fieldState?.mirrorState?.config?.templatePath === filePath) {
          cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
        }
      }
    });
  }, TIMING.METADATA_CHANGE_DEBOUNCE));
}

export function clearTemplateChangeTimeout() {
  for (const t of templateUpdateTimeouts.values()) clearTimeout(t);
  templateUpdateTimeouts.clear();
}
