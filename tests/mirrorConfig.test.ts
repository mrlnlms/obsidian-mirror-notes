import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApplicableConfig, clearConfigCache } from '../src/editor/mirrorConfig';
import { createFakePlugin, createCustomMirror } from './mocks/pluginFactory';
import { TFile } from 'obsidian';

// Silence Logger
vi.mock('../src/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

function makeTFile(path: string): TFile {
  const f = new TFile();
  f.path = path;
  f.name = path.split('/').pop() || '';
  return f;
}

describe('getApplicableConfig', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  it('returns null when file is null', () => {
    const plugin = createFakePlugin();
    expect(getApplicableConfig(plugin, null, {})).toBeNull();
  });

  it('returns null when no mirror matches', () => {
    const plugin = createFakePlugin();
    const file = makeTFile('random/nota.md');
    expect(getApplicableConfig(plugin, file, {})).toBeNull();
  });

  // ---- File match ----
  it('matches by filename (filterFiles)', () => {
    const mirror = createCustomMirror({
      filterFiles: [{ folder: 'nota.md', template: '' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('projects/nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config).not.toBeNull();
    expect(config!.templatePath).toBe('templates/test.md');
  });

  // ---- Folder match ----
  it('matches by folder (filterFolders)', () => {
    const mirror = createCustomMirror({
      filterFolders: [{ folder: 'projects/', template: '' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('projects/nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config).not.toBeNull();
  });

  it('deeper folder wins over shallower (specificity)', () => {
    const mirrorShallow = createCustomMirror({
      id: 'shallow',
      custom_settings_live_preview_note: 'templates/shallow.md',
      filterFolders: [{ folder: 'projects/', template: '' }],
    });
    const mirrorDeep = createCustomMirror({
      id: 'deep',
      custom_settings_live_preview_note: 'templates/deep.md',
      filterFolders: [{ folder: 'projects/sub/', template: '' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirrorShallow, mirrorDeep] },
    });
    const file = makeTFile('projects/sub/nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config!.templatePath).toBe('templates/deep.md');
  });

  // ---- Props match ----
  it('matches by property string value', () => {
    const mirror = createCustomMirror({
      filterFiles: [],
      filterFolders: [],
      filterProps: [{ folder: 'type', template: 'project' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { type: 'project' });
    expect(config).not.toBeNull();
  });

  it('matches property with array value (e.g. tags)', () => {
    const mirror = createCustomMirror({
      filterFiles: [],
      filterFolders: [],
      filterProps: [{ folder: 'tags', template: 'project' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { tags: ['a', 'project'] });
    expect(config).not.toBeNull();
  });

  it('matches property with boolean value', () => {
    const mirror = createCustomMirror({
      filterFiles: [],
      filterFolders: [],
      filterProps: [{ folder: 'completed', template: 'true' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { completed: true });
    expect(config).not.toBeNull();
  });

  // ---- Priority: file > folder > props ----
  it('file match wins over folder match', () => {
    const mirrorFile = createCustomMirror({
      id: 'file',
      custom_settings_live_preview_note: 'templates/file.md',
      filterFiles: [{ folder: 'nota.md', template: '' }],
    });
    const mirrorFolder = createCustomMirror({
      id: 'folder',
      custom_settings_live_preview_note: 'templates/folder.md',
      filterFolders: [{ folder: 'projects/', template: '' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirrorFile, mirrorFolder] },
    });
    const file = makeTFile('projects/nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config!.templatePath).toBe('templates/file.md');
  });

  // ---- Global mirror ----
  it('applies global mirror when no custom matches', () => {
    const plugin = createFakePlugin({
      settings: {
        ...createFakePlugin().settings,
        global_settings: true,
        enable_global_live_preview_mode: true,
        global_settings_live_preview_note: 'templates/global.md',
        global_settings_live_preview_pos: 'bottom',
        global_settings_hide_props: false,
      },
    });
    const file = makeTFile('any-note.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config).not.toBeNull();
    expect(config!.templatePath).toBe('templates/global.md');
    expect(config!.position).toBe('bottom');
  });

  it('global override active + custom without override → global wins', () => {
    const mirror = createCustomMirror({
      custom_settings_overide: false,
      filterFiles: [{ folder: 'nota.md', template: '' }],
    });
    const plugin = createFakePlugin({
      settings: {
        ...createFakePlugin().settings,
        global_settings: true,
        enable_global_live_preview_mode: true,
        global_settings_live_preview_note: 'templates/global.md',
        global_settings_overide: true,
        customMirrors: [mirror],
      },
    });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config!.templatePath).toBe('templates/global.md');
  });

  it('global override active + custom with override → custom wins', () => {
    const mirror = createCustomMirror({
      custom_settings_overide: true,
      custom_settings_live_preview_note: 'templates/custom.md',
      filterFiles: [{ folder: 'nota.md', template: '' }],
    });
    const plugin = createFakePlugin({
      settings: {
        ...createFakePlugin().settings,
        global_settings: true,
        enable_global_live_preview_mode: true,
        global_settings_live_preview_note: 'templates/global.md',
        global_settings_overide: true,
        customMirrors: [mirror],
      },
    });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config!.templatePath).toBe('templates/custom.md');
  });

  // ---- Position overrides ----
  it('applies position override from positionOverrides map', () => {
    const mirror = createCustomMirror({
      custom_settings_live_preview_pos: 'above-title',
      filterFiles: [{ folder: 'nota.md', template: '' }],
    });
    const overrides = new Map([['nota.md', 'top' as const]]);
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
      positionOverrides: overrides,
    });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config!.position).toBe('top');
  });

  // ---- Cache hit ----
  it('returns cached config when frontmatter hash unchanged', () => {
    const mirror = createCustomMirror({
      custom_settings_live_preview_note: 'templates/original.md',
      filterFiles: [{ folder: 'cached.md', template: '' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    const file = makeTFile('cached.md');
    const fm = { title: 'Test' };

    // First call — populates cache
    const config1 = getApplicableConfig(plugin, file, fm);
    expect(config1!.templatePath).toBe('templates/original.md');

    // Mutate settings between calls (should NOT affect result due to cache)
    plugin.settings.customMirrors[0].custom_settings_live_preview_note = 'templates/changed.md';

    // Second call — same frontmatter hash → cache hit
    const config2 = getApplicableConfig(plugin, file, fm);
    expect(config2!.templatePath).toBe('templates/original.md');
  });

  // ---- Priority: folder > props ----
  it('folder match wins over props match', () => {
    const mirrorFolder = createCustomMirror({
      id: 'folder-mirror',
      custom_settings_live_preview_note: 'templates/folder.md',
      filterFolders: [{ folder: 'projects/', template: '' }],
    });
    const mirrorProps = createCustomMirror({
      id: 'props-mirror',
      custom_settings_live_preview_note: 'templates/props.md',
      filterProps: [{ folder: 'type', template: 'project' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirrorFolder, mirrorProps] },
    });
    const file = makeTFile('projects/nota.md');

    const config = getApplicableConfig(plugin, file, { type: 'project' });
    expect(config!.templatePath).toBe('templates/folder.md');
  });

  // ---- Disabled mirror ignored ----
  it('disabled mirror is skipped even with matching filterProps', () => {
    const mirror = createCustomMirror({
      enable_custom_live_preview_mode: false,
      filterProps: [{ folder: 'type', template: 'project' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { type: 'project' });
    expect(config).toBeNull();
  });
});
