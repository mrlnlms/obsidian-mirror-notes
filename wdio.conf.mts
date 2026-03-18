import { createConfig } from 'obsidian-plugin-e2e';

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
});
