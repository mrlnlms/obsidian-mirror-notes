import { describe, it, expect } from 'vitest';
import { updateSettingsPaths } from '../src/utils/settingsPaths';
import { DEFAULT_SETTINGS, MirrorUIPluginSettings, CustomMirror } from '../settings';

function makeSettings(overrides?: Partial<MirrorUIPluginSettings>): MirrorUIPluginSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function makeMirror(overrides?: Partial<CustomMirror>): CustomMirror {
  return {
    id: 'test',
    name: 'Test',
    openview: true,
    enable_custom_live_preview_mode: true,
    custom_settings_live_preview_note: '',
    custom_settings_live_preview_pos: 'top',
    enable_custom_preview_mode: false,
    custom_settings_preview_note: '',
    custom_settings_preview_pos: 'top',
    custom_settings_overide: false,
    custom_settings_hide_props: false,
    custom_auto_update_paths: true,
    filterFiles: [],
    filterFolders: [],
    filterProps: [],
    ...overrides,
  };
}

describe('updateSettingsPaths', () => {
  it('updates global LP template path on rename', () => {
    const settings = makeSettings({
      global_settings_live_preview_note: 'old.md',
    });

    const result = updateSettingsPaths(settings, 'old.md', 'new.md');

    expect(result.changed).toBe(true);
    expect(result.globalAffected).toBe(true);
    expect(settings.global_settings_live_preview_note).toBe('new.md');
  });

  it('updates global preview template path on rename', () => {
    const settings = makeSettings({
      global_settings_preview_note: 'templates/old.md',
    });

    const result = updateSettingsPaths(settings, 'templates/old.md', 'templates/new.md');

    expect(result.changed).toBe(true);
    expect(result.globalAffected).toBe(true);
    expect(settings.global_settings_preview_note).toBe('templates/new.md');
  });

  it('updates custom mirror template path on rename', () => {
    const mirror = makeMirror({
      custom_settings_live_preview_note: 'old.md',
    });
    const settings = makeSettings({ customMirrors: [mirror] });

    const result = updateSettingsPaths(settings, 'old.md', 'new.md');

    expect(result.changed).toBe(true);
    expect(result.mirrorIndices).toEqual([0]);
    expect(mirror.custom_settings_live_preview_note).toBe('new.md');
  });

  it('updates folder paths with prefix match', () => {
    const mirror = makeMirror({
      custom_settings_live_preview_note: 'projects/template.md',
      filterFolders: [{ folder: 'projects/', template: '' }],
    });
    const settings = makeSettings({ customMirrors: [mirror] });

    const result = updateSettingsPaths(settings, 'projects', 'work');

    expect(result.changed).toBe(true);
    expect(mirror.custom_settings_live_preview_note).toBe('work/template.md');
    expect(mirror.filterFolders[0].folder).toBe('work/');
  });

  it('updates filterFiles filename on rename', () => {
    const mirror = makeMirror({
      filterFiles: [{ folder: 'nota.md', template: '' }],
    });
    const settings = makeSettings({ customMirrors: [mirror] });

    const result = updateSettingsPaths(settings, 'projects/nota.md', 'projects/renamed.md');

    expect(result.changed).toBe(true);
    expect(mirror.filterFiles[0].folder).toBe('renamed.md');
  });

  it('skips mirror with custom_auto_update_paths: false', () => {
    const mirror = makeMirror({
      custom_auto_update_paths: false,
      custom_settings_live_preview_note: 'old.md',
    });
    const settings = makeSettings({ customMirrors: [mirror] });

    const result = updateSettingsPaths(settings, 'old.md', 'new.md');

    expect(result.changed).toBe(false);
    expect(mirror.custom_settings_live_preview_note).toBe('old.md');
  });

  it('skips everything when global auto_update_paths is false', () => {
    const settings = makeSettings({
      auto_update_paths: false,
      global_settings_live_preview_note: 'old.md',
    });

    const result = updateSettingsPaths(settings, 'old.md', 'new.md');

    expect(result.changed).toBe(false);
    expect(settings.global_settings_live_preview_note).toBe('old.md');
  });

  it('returns correct mirrorIndices for multiple affected mirrors', () => {
    const mirror0 = makeMirror({ id: 'm0', custom_settings_live_preview_note: 'other.md' });
    const mirror1 = makeMirror({ id: 'm1', custom_settings_live_preview_note: 'old.md' });
    const mirror2 = makeMirror({ id: 'm2', custom_settings_preview_note: 'old.md' });
    const settings = makeSettings({ customMirrors: [mirror0, mirror1, mirror2] });

    const result = updateSettingsPaths(settings, 'old.md', 'new.md');

    expect(result.changed).toBe(true);
    expect(result.mirrorIndices).toEqual([1, 2]);
  });

  it('returns unchanged when paths do not match', () => {
    const settings = makeSettings({
      global_settings_live_preview_note: 'unrelated.md',
      customMirrors: [makeMirror({ custom_settings_live_preview_note: 'other.md' })],
    });

    const result = updateSettingsPaths(settings, 'old.md', 'new.md');

    expect(result.changed).toBe(false);
    expect(result.mirrorIndices).toEqual([]);
    expect(result.globalAffected).toBe(false);
  });

  it('updates both global and custom when same template is shared', () => {
    const mirror = makeMirror({
      custom_settings_live_preview_note: 'shared.md',
    });
    const settings = makeSettings({
      global_settings_live_preview_note: 'shared.md',
      customMirrors: [mirror],
    });

    const result = updateSettingsPaths(settings, 'shared.md', 'renamed.md');

    expect(result.changed).toBe(true);
    expect(result.globalAffected).toBe(true);
    expect(result.mirrorIndices).toEqual([0]);
    expect(settings.global_settings_live_preview_note).toBe('renamed.md');
    expect(mirror.custom_settings_live_preview_note).toBe('renamed.md');
  });

  it('does not update filterFiles when filename stays the same (folder move)', () => {
    const mirror = makeMirror({
      filterFiles: [{ folder: 'nota.md', template: '' }],
    });
    const settings = makeSettings({ customMirrors: [mirror] });

    // Moving file to different folder, same filename
    const result = updateSettingsPaths(settings, 'projects/nota.md', 'archive/nota.md');

    // filterFiles stores filename only — 'nota.md' didn't change
    expect(mirror.filterFiles[0].folder).toBe('nota.md');
    // No mirror change from filterFiles (may still change from template paths)
    expect(result.mirrorIndices).toEqual([]);
  });
});
