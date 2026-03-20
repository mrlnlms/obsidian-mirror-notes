import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OVERRIDES } from '../src/settings/types';

// Mock heavy deps that main.ts imports
vi.mock('@codemirror/state', () => ({
  StateEffect: { appendConfig: { of: vi.fn() } },
  StateField: { define: vi.fn(() => Symbol('field')) },
  Facet: { define: vi.fn(() => ({ of: vi.fn() })) },
}));
vi.mock('../src/editor/mirrorState', () => ({
  mirrorStateField: Symbol('mirrorStateField'),
  forceMirrorUpdateEffect: { of: vi.fn() },
  mirrorPluginFacet: { of: vi.fn() },
  filePathFacet: { of: vi.fn() },
  viewIdFacet: { of: vi.fn() },
  cleanupMirrorCaches: vi.fn(),
  toggleWidgetEffect: Symbol('toggleWidgetEffect'),
}));
vi.mock('../src/rendering/codeBlockProcessor', () => ({ registerMirrorCodeBlock: vi.fn() }));
vi.mock('../src/commands/insertMirrorBlock', () => ({ registerInsertMirrorBlock: vi.fn() }));
vi.mock('../src/rendering/sourceDependencyRegistry', () => ({
  SourceDependencyRegistry: vi.fn(() => ({ clear: vi.fn(), getDependentCallbacks: vi.fn(() => []) })),
}));
vi.mock('../src/editor/mirrorConfig', () => ({ clearConfigCache: vi.fn(), getApplicableConfig: vi.fn() }));
vi.mock('../src/rendering/domInjector', () => ({
  cleanupAllDomMirrors: vi.fn(), getViewId: vi.fn().mockReturnValue('v0'), resetViewIdCounter: vi.fn(),
}));
vi.mock('../src/editor/marginPanelExtension', () => ({ mirrorMarginPanelPlugin: Symbol('marginPanel') }));
vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));
vi.mock('../settings', async () => {
  const actual = await vi.importActual('../settings');
  return { ...actual, MirrorUISettingsTab: vi.fn() };
});

import MirrorUIPlugin from '../main';

describe('DEFAULT_SETTINGS clone isolation', () => {
  let plugin: MirrorUIPlugin;

  beforeEach(() => {
    plugin = Object.create(MirrorUIPlugin.prototype);
    plugin.knownTemplatePaths = new Set();
    // Mock loadData to return empty (fresh install)
    plugin.loadData = vi.fn().mockResolvedValue(null);
    // Mock saveData
    plugin.saveData = vi.fn().mockResolvedValue(undefined);
    // Mock app for rebuildKnownTemplatePaths
    (plugin as any).app = {
      workspace: { iterateAllLeaves: vi.fn() },
      vault: { getConfig: vi.fn() },
    };
    (plugin as any).positionOverrides = new Map();
    (plugin as any).lastViewMode = new Map();
    (plugin as any).pendingTimers = new Set();
    (plugin as any).isUnloaded = false;
  });

  it('loadSettings does not pollute DEFAULT_SETTINGS.customMirrors', async () => {
    await plugin.loadSettings();

    // Mutate the plugin's settings (simulates UI adding a mirror)
    plugin.settings.customMirrors.push({
      id: 'test', name: 'Test', openview: false,
      enable_custom_live_preview_mode: true,
      custom_settings_live_preview_note: 'x.md',
      custom_settings_live_preview_pos: 'top',
      enable_custom_preview_mode: false,
      custom_settings_preview_note: '',
      custom_settings_preview_pos: 'top',
      custom_settings_override: false,
      custom_view_overrides: { ...DEFAULT_VIEW_OVERRIDES },
      custom_show_container_border: true,
      custom_auto_update_paths: true,
      conditions: [],
      conditionLogic: 'any',
    });

    // DEFAULT_SETTINGS must remain clean
    expect(DEFAULT_SETTINGS.customMirrors).toHaveLength(0);
  });

  it('loadSettings does not pollute DEFAULT_SETTINGS.global_view_overrides', async () => {
    await plugin.loadSettings();

    // Mutate view overrides (simulates UI toggle)
    plugin.settings.global_view_overrides.hideProps = true;

    // DEFAULT_SETTINGS must remain clean
    expect(DEFAULT_SETTINGS.global_view_overrides.hideProps).toBe(false);
  });

  it('normalizes customMirrors: null from corrupted data.json', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({ customMirrors: null });
    await plugin.loadSettings();

    expect(Array.isArray(plugin.settings.customMirrors)).toBe(true);
    expect(plugin.settings.customMirrors).toHaveLength(0);
  });

  it('normalizes customMirrors: {} (object instead of array) from corrupted data.json', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({ customMirrors: {} });
    await plugin.loadSettings();

    expect(Array.isArray(plugin.settings.customMirrors)).toBe(true);
    expect(plugin.settings.customMirrors).toHaveLength(0);
  });

  it('normalizes global_view_overrides: null from corrupted data.json', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({ global_view_overrides: null });
    await plugin.loadSettings();

    expect(plugin.settings.global_view_overrides).toBeDefined();
    expect(typeof plugin.settings.global_view_overrides).toBe('object');
    expect(plugin.settings.global_view_overrides.hideProps).toBe(false);
  });

  it('normalizes mirror with missing custom_view_overrides from corrupted data.json', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({
      customMirrors: [{
        id: 'test', name: 'Test', openview: false,
        enable_custom_live_preview_mode: true,
        custom_settings_live_preview_note: 'x.md',
        custom_settings_live_preview_pos: 'top',
        enable_custom_preview_mode: false,
        custom_settings_preview_note: '',
        custom_settings_preview_pos: 'top',
        custom_settings_override: false,
        custom_view_overrides: null,
        custom_show_container_border: true,
        custom_auto_update_paths: true,
      }],
    });
    await plugin.loadSettings();

    expect(plugin.settings.customMirrors[0].custom_view_overrides).toBeDefined();
    expect(plugin.settings.customMirrors[0].custom_view_overrides.hideProps).toBe(false);
  });

  it('normalizes mirror with missing conditions from pre-v46 data.json', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({
      customMirrors: [{
        id: 'old', name: 'Old Mirror', openview: false,
        enable_custom_live_preview_mode: true,
        custom_settings_live_preview_note: 'x.md',
        custom_settings_live_preview_pos: 'top',
        enable_custom_preview_mode: false,
        custom_settings_preview_note: '',
        custom_settings_preview_pos: 'top',
        custom_settings_override: false,
        custom_show_container_border: true,
        custom_auto_update_paths: true,
        // no conditions, no conditionLogic, no custom_view_overrides
      }],
    });
    await plugin.loadSettings();

    const mirror = plugin.settings.customMirrors[0];
    expect(Array.isArray(mirror.conditions)).toBe(true);
    expect(mirror.conditionLogic).toBe('any');
    expect(mirror.custom_view_overrides).toBeDefined();
  });

  it('resetSettings returns to clean defaults after mutations', async () => {
    await plugin.loadSettings();

    // Mutate
    plugin.settings.customMirrors.push({
      id: 'dirty', name: 'Dirty', openview: false,
      enable_custom_live_preview_mode: true,
      custom_settings_live_preview_note: 'dirty.md',
      custom_settings_live_preview_pos: 'top',
      enable_custom_preview_mode: false,
      custom_settings_preview_note: '',
      custom_settings_preview_pos: 'top',
      custom_settings_override: false,
      custom_view_overrides: { ...DEFAULT_VIEW_OVERRIDES },
      custom_show_container_border: true,
      custom_auto_update_paths: true,
      conditions: [],
      conditionLogic: 'any',
    });
    plugin.settings.global_view_overrides.hideProps = true;
    plugin.settings.debug_logging = true;

    // Reset
    await plugin.resetSettings();

    // Should be back to defaults
    expect(plugin.settings.customMirrors).toHaveLength(0);
    expect(plugin.settings.global_view_overrides.hideProps).toBe(false);
    expect(plugin.settings.debug_logging).toBe(false);

    // DEFAULT_SETTINGS still clean
    expect(DEFAULT_SETTINGS.customMirrors).toHaveLength(0);
  });

  it('coerces stringified boolean "false" to real false', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({ global_settings: "false" });
    await plugin.loadSettings();

    expect(plugin.settings.global_settings).toBe(false);
    expect(typeof plugin.settings.global_settings).toBe('boolean');
  });

  it('coerces stringified boolean "true" to real true', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({ global_show_container_border: "true" });
    await plugin.loadSettings();

    expect(plugin.settings.global_show_container_border).toBe(true);
    expect(typeof plugin.settings.global_show_container_border).toBe('boolean');
  });

  it('falls back invalid position to default "top"', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({
      global_settings_live_preview_pos: "bogus",
      global_settings_preview_pos: 42,
    });
    await plugin.loadSettings();

    expect(plugin.settings.global_settings_live_preview_pos).toBe('top');
    expect(plugin.settings.global_settings_preview_pos).toBe('top');
  });

  it('sanitizes per-mirror stringified booleans and invalid positions', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({
      customMirrors: [{
        id: 'test', name: 'Test', openview: false,
        enable_custom_live_preview_mode: "false",
        custom_settings_live_preview_note: 'x.md',
        custom_settings_live_preview_pos: "bogus",
        enable_custom_preview_mode: "true",
        custom_settings_preview_note: '',
        custom_settings_preview_pos: 'bottom',
        custom_settings_override: false,
        custom_view_overrides: { ...DEFAULT_VIEW_OVERRIDES },
        custom_show_container_border: "false",
        custom_auto_update_paths: true,
      }],
    });
    await plugin.loadSettings();

    const mirror = plugin.settings.customMirrors[0];
    expect(mirror.enable_custom_live_preview_mode).toBe(false);
    expect(mirror.enable_custom_preview_mode).toBe(true);
    expect(mirror.custom_settings_live_preview_pos).toBe('top'); // bogus → default
    expect(mirror.custom_settings_preview_pos).toBe('bottom'); // valid — kept
    expect(mirror.custom_show_container_border).toBe(false);
  });

  it('sanitizes stringified booleans inside global_view_overrides', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({
      global_view_overrides: { hideProps: "true", readableLineLength: "false", showInlineTitle: "null" },
    });
    await plugin.loadSettings();

    expect(plugin.settings.global_view_overrides.hideProps).toBe(true);
    expect(plugin.settings.global_view_overrides.readableLineLength).toBe(false);
    expect(plugin.settings.global_view_overrides.showInlineTitle).toBe(null);
  });

  it('sanitizes stringified booleans inside custom_view_overrides', async () => {
    plugin.loadData = vi.fn().mockResolvedValue({
      customMirrors: [{
        id: 'test', name: 'Test', openview: false,
        enable_custom_live_preview_mode: true,
        custom_settings_live_preview_note: 'x.md',
        custom_settings_live_preview_pos: 'top',
        enable_custom_preview_mode: false,
        custom_settings_preview_note: '',
        custom_settings_preview_pos: 'top',
        custom_settings_override: true,
        custom_view_overrides: { hideProps: "false", readableLineLength: "true", showInlineTitle: 42 },
        custom_show_container_border: true,
        custom_auto_update_paths: true,
      }],
    });
    await plugin.loadSettings();

    const vo = plugin.settings.customMirrors[0].custom_view_overrides;
    expect(vo.hideProps).toBe(false);
    expect(vo.readableLineLength).toBe(true);
    expect(vo.showInlineTitle).toBe(null); // invalid number → null fallback
  });
});
