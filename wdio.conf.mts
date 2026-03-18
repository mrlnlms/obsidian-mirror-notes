import { createConfig } from 'obsidian-e2e-visual-test-kit';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load E2E settings to inject at runtime (wdio-obsidian-service copies
// the workbench data.json from pluginDir, overwriting our curated config)
const e2eSettings = JSON.parse(
  readFileSync(resolve('test/e2e/helpers/e2e-settings.json'), 'utf-8')
);

export const config = createConfig({
  pluginId: 'mirror-notes',
  pluginDir: '.',
  vault: 'test/e2e/vaults/visual',
  specs: [
    'test/e2e/specs/smoke.e2e.ts',
    'test/e2e/specs/positions.e2e.ts',
    'test/e2e/specs/mode-switch.e2e.ts',
    'test/e2e/specs/lifecycle.e2e.ts',
    'test/e2e/specs/visual-baselines.e2e.ts',
  ],
  screenshotDir: 'test/e2e/screenshots',
  timeout: 90000,
  overrides: {
    before: async function () {
      // Wait for plugin to load, then replace settings with E2E config
      await browser.waitUntil(
        async () => browser.execute((id: string) => !!(window as any).app?.plugins?.plugins?.[id], 'mirror-notes'),
        { timeout: 20000 }
      );
      await browser.execute((pluginId: string, settings: any) => {
        const plugin = (window as any).app.plugins.plugins[pluginId];
        if (plugin) {
          plugin.settings = settings;
          plugin.saveSettings();
        }
      }, 'mirror-notes', e2eSettings);
      await browser.pause(2000);
    },
  },
});
