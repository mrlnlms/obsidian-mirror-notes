import { MarkdownView } from 'obsidian';
import { mirrorStateField } from './mirrorState';
import { getApplicableConfig } from './mirrorConfig';
import { Logger } from '../dev/logger';
import { getEditorView } from '../utils/obsidianInternals';
import { getViewId } from '../rendering/domInjector';
import type MirrorUIPlugin from '../../main';
import type { ViewOverrides } from '../settings/types';

export function applyViewOverrides(plugin: MirrorUIPlugin, view: MarkdownView) {
  if (!view || !view.file) return;

  // Try CM6 StateField first (covers LP and LP+RV mirrors)
  let overrides: ViewOverrides | null = null;
  const cm = getEditorView(view);
  if (cm) {
    const fieldState = cm.state.field(mirrorStateField, false);
    if (fieldState?.mirrorState?.enabled) {
      overrides = fieldState.mirrorState.config?.viewOverrides ?? null;
    }
  }

  // Fallback: check RV config directly (covers preview-only mirrors where StateField has no config)
  // Only in preview mode — in source mode, no StateField config means no LP mirror, don't apply RV overrides
  // @ts-ignore — getMode not in official typings
  const viewMode: string = view.getMode?.() ?? 'source';
  if (!overrides && viewMode === 'preview' && view.file && plugin.app?.metadataCache) {
    const viewId = getViewId(view.containerEl);
    const frontmatter = plugin.app.metadataCache.getFileCache(view.file)?.frontmatter || {};
    const rvConfig = getApplicableConfig(plugin, view.file, frontmatter, viewId, viewMode);
    overrides = rvConfig?.viewOverrides ?? null;
  }

  const viewContent = view.containerEl.querySelector('.view-content');
  if (!viewContent) return;

  // hideProps: boolean (true = hide, false = inherit)
  const shouldHideProps = overrides?.hideProps ?? false;
  viewContent.classList.toggle('mirror-hide-properties', shouldHideProps);

  // readableLineLength: manipulate Obsidian's own is-readable-line-width class on the editor
  const rlOverride = overrides?.readableLineLength ?? null;
  const editorEl = viewContent.querySelector('.markdown-source-view');
  if (editorEl) {
    if (rlOverride !== null) {
      editorEl.classList.toggle('is-readable-line-width', rlOverride);
    } else {
      // inherit: restore Obsidian's global setting
      // @ts-ignore — getConfig not in official typings
      const globalReadable = !!plugin.app.vault.getConfig("readableLineLength");
      editorEl.classList.toggle('is-readable-line-width', globalReadable);
    }
  }

  // showInlineTitle: true = force show, false = force hide, null = inherit
  const titleOverride = overrides?.showInlineTitle ?? null;
  viewContent.classList.toggle('mirror-force-inline-title', titleOverride === true);
  viewContent.classList.toggle('mirror-hide-inline-title', titleOverride === false);

  if (overrides && (overrides.hideProps || rlOverride !== null || titleOverride !== null)) {
    Logger.log(`View overrides for ${view.file.path}: hideProps=${overrides.hideProps}, readableLine=${rlOverride}, inlineTitle=${titleOverride}`);
  }
}
