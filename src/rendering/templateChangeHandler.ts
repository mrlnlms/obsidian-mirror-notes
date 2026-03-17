import { MarkdownView } from 'obsidian';
import { mirrorStateField, forceMirrorUpdateEffect } from '../editor/mirrorState';
import { TIMING } from '../editor/timingConfig';
import { Logger } from '../dev/logger';
import { getEditorView } from '../utils/obsidianInternals';
import type MirrorUIPlugin from '../../main';

let templateUpdateTimeout: NodeJS.Timeout | null = null;

export function handleTemplateChange(plugin: MirrorUIPlugin, filePath: string) {
  const templateCbs = plugin.templateDeps.getDependentCallbacks(filePath);
  // Fast path: se nenhum callback E nao e template dos settings → skip
  if (templateCbs.length === 0 && !plugin.knownTemplatePaths.has(filePath)) return;

  if (templateUpdateTimeout) {
    clearTimeout(templateUpdateTimeout);
  }

  templateUpdateTimeout = setTimeout(() => {
    // Callbacks registrados (code blocks + DOM mirrors)
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
    templateUpdateTimeout = null;
  }, TIMING.METADATA_CHANGE_DEBOUNCE);
}

export function clearTemplateChangeTimeout() {
  if (templateUpdateTimeout) {
    clearTimeout(templateUpdateTimeout);
    templateUpdateTimeout = null;
  }
}
