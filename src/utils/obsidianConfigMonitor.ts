import { App } from 'obsidian';
import { getVaultConfig, getBacklinkPlugin, onVaultRaw } from './obsidianInternals';
import { Logger } from '../dev/logger';
import type MirrorUIPlugin from '../../main';

interface ObsidianVisualConfig {
  showInlineTitle: boolean;
  propertiesInDocument: string;
  backlinkEnabled: boolean;
}

const lastConfig: ObsidianVisualConfig = {
  showInlineTitle: true,
  propertiesInDocument: 'visible',
  backlinkEnabled: false,
};

/** Take initial snapshot of Obsidian's visual config values */
export function snapshotObsidianConfig(app: App): void {
  lastConfig.showInlineTitle = !!getVaultConfig(app, "showInlineTitle");
  lastConfig.propertiesInDocument = getVaultConfig(app, "propertiesInDocument") || 'visible';
  lastConfig.backlinkEnabled = !!getBacklinkPlugin(app)?.enabled;
}

/** Register vault 'raw' listener to detect visual config changes.
 *  Calls onConfigChange when showInlineTitle, propertiesInDocument, or backlink toggle changes. */
export function registerConfigWatcher(
  plugin: MirrorUIPlugin,
  onConfigChange: () => void
): void {
  plugin.registerEvent(
    onVaultRaw(plugin.app.vault, (path: string) => {
      if (path === '.obsidian/app.json') {
        const showTitle = !!getVaultConfig(plugin.app, "showInlineTitle");
        const propsMode = getVaultConfig(plugin.app, "propertiesInDocument") || 'visible';
        if (showTitle === lastConfig.showInlineTitle &&
            propsMode === lastConfig.propertiesInDocument) return;
        lastConfig.showInlineTitle = showTitle;
        lastConfig.propertiesInDocument = propsMode;
        Logger.log(`[config-change] showInlineTitle=${showTitle}, propertiesInDocument=${propsMode}`);
        onConfigChange();
      }
      if (path === '.obsidian/core-plugins.json') {
        const enabled = !!getBacklinkPlugin(plugin.app)?.enabled;
        if (enabled === lastConfig.backlinkEnabled) return;
        lastConfig.backlinkEnabled = enabled;
        Logger.log(`[config-change] backlink=${enabled}`);
        onConfigChange();
      }
    })
  );
}
