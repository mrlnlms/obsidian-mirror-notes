import { describe, it, expect, vi, beforeEach } from 'vitest';
import { snapshotObsidianConfig, registerConfigWatcher } from '../src/utils/obsidianConfigMonitor';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

const getVaultConfigMock = vi.fn();
const getBacklinkPluginMock = vi.fn();
let rawCallback: ((path: string) => void) | null = null;

vi.mock('../src/utils/obsidianInternals', () => ({
  getVaultConfig: (...args: any[]) => getVaultConfigMock(...args),
  getBacklinkPlugin: (...args: any[]) => getBacklinkPluginMock(...args),
  onVaultRaw: vi.fn((_vault: any, cb: (path: string) => void) => {
    rawCallback = cb;
    return {};
  }),
}));

function createMockPlugin() {
  return {
    app: { vault: {} },
    registerEvent: vi.fn(),
  } as any;
}

describe('obsidianConfigMonitor', () => {
  let plugin: any;
  let onConfigChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    rawCallback = null;
    onConfigChange = vi.fn();
    plugin = createMockPlugin();

    // Default config values
    getVaultConfigMock.mockImplementation((_app: any, key: string) => {
      if (key === 'showInlineTitle') return true;
      if (key === 'propertiesInDocument') return 'visible';
      return undefined;
    });
    getBacklinkPluginMock.mockReturnValue({ enabled: false });

    // Snapshot initial state + register watcher
    snapshotObsidianConfig(plugin.app);
    registerConfigWatcher(plugin, onConfigChange);
  });

  it('snapshot reads initial values correctly', () => {
    // Config hasn't changed — rawCallback with same values should NOT fire
    rawCallback!('.obsidian/app.json');
    expect(onConfigChange).not.toHaveBeenCalled();

    rawCallback!('.obsidian/core-plugins.json');
    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it('fires callback when showInlineTitle changes', () => {
    // Change showInlineTitle from true to false
    getVaultConfigMock.mockImplementation((_app: any, key: string) => {
      if (key === 'showInlineTitle') return false;
      if (key === 'propertiesInDocument') return 'visible';
      return undefined;
    });

    rawCallback!('.obsidian/app.json');
    expect(onConfigChange).toHaveBeenCalledTimes(1);
  });

  it('fires callback when propertiesInDocument changes', () => {
    getVaultConfigMock.mockImplementation((_app: any, key: string) => {
      if (key === 'showInlineTitle') return true;
      if (key === 'propertiesInDocument') return 'hidden';
      return undefined;
    });

    rawCallback!('.obsidian/app.json');
    expect(onConfigChange).toHaveBeenCalledTimes(1);
  });

  it('fires callback when backlink enabled changes', () => {
    // Backlink was false (snapshot), now it's true
    getBacklinkPluginMock.mockReturnValue({ enabled: true });

    rawCallback!('.obsidian/core-plugins.json');
    expect(onConfigChange).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire when config is unchanged', () => {
    // All values identical to snapshot
    rawCallback!('.obsidian/app.json');
    rawCallback!('.obsidian/core-plugins.json');
    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it('ignores unrelated paths', () => {
    rawCallback!('.obsidian/workspace.json');
    rawCallback!('.obsidian/plugins/something/data.json');
    rawCallback!('notes/test.md');
    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it('updates lastConfig after detecting change (no double-fire)', () => {
    // First change: showInlineTitle true → false
    getVaultConfigMock.mockImplementation((_app: any, key: string) => {
      if (key === 'showInlineTitle') return false;
      if (key === 'propertiesInDocument') return 'visible';
      return undefined;
    });

    rawCallback!('.obsidian/app.json');
    expect(onConfigChange).toHaveBeenCalledTimes(1);

    // Second trigger with same (now false) value — should NOT fire again
    rawCallback!('.obsidian/app.json');
    expect(onConfigChange).toHaveBeenCalledTimes(1);
  });
});
