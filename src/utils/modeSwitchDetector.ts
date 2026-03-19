import { MarkdownView } from 'obsidian';
import { getViewMode } from './obsidianInternals';
import { getViewId } from '../rendering/domInjector';
import { Logger } from '../dev/logger';
import { applyViewOverrides } from '../editor/viewOverrides';
import { setupDomPosition } from '../rendering/domPositionManager';
import type MirrorUIPlugin from '../../main';

/** Register layout-change listener to detect LP <-> RV mode switches.
 *  Uses trailing debounce (50ms) because getMode() can oscillate during transition. */
export function registerModeSwitchDetector(plugin: MirrorUIPlugin): () => void {
  let layoutDebounce: NodeJS.Timeout | null = null;
  plugin.registerEvent(
    plugin.app.workspace.on('layout-change', () => {
      if (layoutDebounce) clearTimeout(layoutDebounce);
      layoutDebounce = setTimeout(() => {
        layoutDebounce = null;
        const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) return;
        const currentMode = getViewMode(view);
        const vid = getViewId(view.containerEl);
        const modeKey = `${vid}:${view.file.path}`;
        const lastMode = plugin.lastViewMode.get(modeKey);
        if (currentMode === lastMode) return;
        plugin.lastViewMode.set(modeKey, currentMode);
        Logger.log(`[mode-switch] ${lastMode} -> ${currentMode} for ${view.file.path}`);
        // Em RV nao chamar setupEditor — CM6 dispatch pode causar layout-change cascata
        if (currentMode !== 'preview') {
          plugin.setupEditor(view);
        }
        setupDomPosition(plugin, view);
        // Re-evaluate overrides on mode switch — dual-template may change applicable config
        applyViewOverrides(plugin, view);
      }, 50);
    })
  );
  return () => {
    if (layoutDebounce) clearTimeout(layoutDebounce);
  };
}
