import { waitForPlugin } from 'obsidian-plugin-e2e';

const PLUGIN_ID = 'mirror-notes';

export const S = {
  widget: '.mirror-ui-widget',
  domInjection: '.mirror-dom-injection',
  aboveTitle: '[data-position="above-title"]',
  aboveProperties: '[data-position="above-properties"]',
  belowProperties: '[data-position="below-properties"]',
  aboveBacklinks: '[data-position="above-backlinks"]',
  belowBacklinks: '[data-position="below-backlinks"]',
  top: '.mirror-ui-widget[data-position="top"]',
  bottom: '.mirror-ui-widget[data-position="bottom"]',
  posAboveTitle: '.mirror-position-above-title',
  posAboveProps: '.mirror-position-above-properties',
  posBelowProps: '.mirror-position-below-properties',
  posAboveBacklinks: '.mirror-position-above-backlinks',
  posBelowBacklinks: '.mirror-position-below-backlinks',
  posTop: '.mirror-position-top',
  posBottom: '.mirror-position-bottom',
  activeLeaf: '.workspace-leaf.mod-active',
  cmContent: '.workspace-leaf.mod-active .cm-content',
  inlineTitle: '.workspace-leaf.mod-active .inline-title',
} as const;

export const NOTES = {
  basic: 'notes/basic.md',
  posAboveTitle: 'notes/pos-above-title.md',
  posAboveProperties: 'notes/pos-above-properties.md',
  posBelowProperties: 'notes/pos-below-properties.md',
  posAboveBacklinks: 'notes/pos-above-backlinks.md',
  posBelowBacklinks: 'notes/pos-below-backlinks.md',
  posCm6Top: 'notes/pos-cm6-top.md',
  posCm6Bottom: 'notes/pos-cm6-bottom.md',
  dualTemplate: 'notes/dual-template.md',
  noMirror: 'notes/no-mirror.md',
} as const;

export const MARKERS = {
  aboveTitle: 'E2E-ABOVE-TITLE',
  aboveProps: 'E2E-ABOVE-PROPS',
  belowProps: 'E2E-BELOW-PROPS',
  aboveBacklinks: 'E2E-ABOVE-BACKLINKS',
  belowBacklinks: 'E2E-BELOW-BACKLINKS',
  top: 'E2E-TOP',
  bottom: 'E2E-BOTTOM',
  lpDual: 'E2E-LP-TEMPLATE',
  rvDual: 'E2E-RV-TEMPLATE',
} as const;

/**
 * Replace plugin settings entirely (not merge).
 * Needed because wdio-obsidian-service copies data.json from pluginDir,
 * overwriting the vault's pre-baked config with the workbench's.
 */
export async function loadE2EConfig(settings: Record<string, unknown>): Promise<void> {
  await waitForPlugin(PLUGIN_ID);
  await browser.execute((pluginId: string, cfg: Record<string, unknown>) => {
    const plugin = (window as any).app.plugins.plugins[pluginId];
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
    plugin.settings = cfg;
    plugin.saveSettings();
  }, PLUGIN_ID, settings);
  await browser.pause(3000);
}

export async function injectMirrorConfig(overrides: Record<string, unknown>): Promise<void> {
  await waitForPlugin(PLUGIN_ID);
  await browser.execute((pluginId: string, cfg: Record<string, unknown>) => {
    const plugin = (window as any).app.plugins.plugins[pluginId];
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
    Object.assign(plugin.settings, cfg);
    plugin.saveSettings();
  }, PLUGIN_ID, overrides);
  await browser.pause(3000);
}

export async function countMirrorWidgets(): Promise<number> {
  return browser.execute(() => document.querySelectorAll('.mirror-ui-widget').length);
}

export async function countWidgetsByPosition(position: string): Promise<number> {
  return browser.execute((pos: string) => document.querySelectorAll(`[data-position="${pos}"]`).length, position);
}

export async function toggleReadingView(): Promise<void> {
  await browser.executeObsidianCommand('editor:toggle-source');
  await browser.pause(2000);
}

export async function getViewMode(): Promise<string> {
  return browser.execute(() => {
    const leaf = document.querySelector('.workspace-leaf.mod-active');
    if (!leaf) return 'unknown';
    // In Reading View, .markdown-reading-view is visible (no display:none)
    const rv = leaf.querySelector('.markdown-reading-view');
    if (rv && (rv as HTMLElement).offsetParent !== null) return 'preview';
    return 'source';
  });
}

export async function disablePlugin(): Promise<void> {
  await browser.execute((id: string) => (window as any).app.plugins.disablePlugin(id), PLUGIN_ID);
  await browser.pause(2000);
}

export async function enablePlugin(): Promise<void> {
  await browser.execute((id: string) => (window as any).app.plugins.enablePlugin(id), PLUGIN_ID);
  await browser.pause(3000);
}
