import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApplicableConfig, clearConfigCache, evaluateCondition, evaluateConditions } from '../src/editor/mirrorConfig';
import { createFakePlugin, createCustomMirror } from './mocks/pluginFactory';
import { TFile } from 'obsidian';
import { Condition } from '../src/settings/types';

// Silence Logger
vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

function makeTFile(path: string): TFile {
  const f = new TFile();
  f.path = path;
  f.name = path.split('/').pop() || '';
  return f;
}

// =================================================================================
// evaluateCondition (unit tests)
// =================================================================================

describe('evaluateCondition', () => {
  const file = makeTFile('projects/nota.md');

  it('matches file by name', () => {
    const cond: Condition = { type: 'file', negated: false, fileName: 'nota.md' };
    expect(evaluateCondition(cond, file, {})).toBe(true);
  });

  it('does not match wrong filename', () => {
    const cond: Condition = { type: 'file', negated: false, fileName: 'other.md' };
    expect(evaluateCondition(cond, file, {})).toBe(false);
  });

  it('matches folder by prefix', () => {
    const cond: Condition = { type: 'folder', negated: false, folderPath: 'projects/' };
    expect(evaluateCondition(cond, file, {})).toBe(true);
  });

  it('does not match wrong folder', () => {
    const cond: Condition = { type: 'folder', negated: false, folderPath: 'archive/' };
    expect(evaluateCondition(cond, file, {})).toBe(false);
  });

  it('does not match sibling folder with same prefix (projects vs projects-archive)', () => {
    const cond: Condition = { type: 'folder', negated: false, folderPath: 'projects' };
    const siblingFile = makeTFile('projects-archive/old-note.md');
    expect(evaluateCondition(cond, siblingFile, {})).toBe(false);
  });

  it('folder match works with or without trailing slash', () => {
    const withSlash: Condition = { type: 'folder', negated: false, folderPath: 'projects/' };
    const withoutSlash: Condition = { type: 'folder', negated: false, folderPath: 'projects' };
    expect(evaluateCondition(withSlash, file, {})).toBe(true);
    expect(evaluateCondition(withoutSlash, file, {})).toBe(true);
  });

  it('matches property string value', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'type', propertyValue: 'project' };
    expect(evaluateCondition(cond, file, { type: 'project' })).toBe(true);
  });

  it('matches property with boolean true', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'published', propertyValue: 'true' };
    expect(evaluateCondition(cond, file, { published: true })).toBe(true);
  });

  it('matches property with boolean false', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'archived', propertyValue: 'false' };
    expect(evaluateCondition(cond, file, { archived: false })).toBe(true);
  });

  it('matches property with number', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'priority', propertyValue: '5' };
    expect(evaluateCondition(cond, file, { priority: 5 })).toBe(true);
  });

  it('matches property with array (e.g. tags)', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'tags', propertyValue: 'project' };
    expect(evaluateCondition(cond, file, { tags: ['a', 'project'] })).toBe(true);
  });

  it('does not match array under wrong key', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'categories', propertyValue: 'project' };
    expect(evaluateCondition(cond, file, { tags: ['project'] })).toBe(false);
  });

  it('matches property existence when propertyValue is empty', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'status', propertyValue: '' };
    expect(evaluateCondition(cond, file, { status: 'anything' })).toBe(true);
  });

  it('does not match property existence when property missing', () => {
    const cond: Condition = { type: 'property', negated: false, propertyName: 'status', propertyValue: '' };
    expect(evaluateCondition(cond, file, {})).toBe(false);
  });

  // ---- Negation ----
  it('negation inverts file match', () => {
    const cond: Condition = { type: 'file', negated: true, fileName: 'nota.md' };
    expect(evaluateCondition(cond, file, {})).toBe(false);
  });

  it('negation inverts file non-match', () => {
    const cond: Condition = { type: 'file', negated: true, fileName: 'other.md' };
    expect(evaluateCondition(cond, file, {})).toBe(true);
  });

  it('negation inverts property match', () => {
    const cond: Condition = { type: 'property', negated: true, propertyName: 'status', propertyValue: 'draft' };
    expect(evaluateCondition(cond, file, { status: 'draft' })).toBe(false);
    expect(evaluateCondition(cond, file, { status: 'active' })).toBe(true);
  });
});

// =================================================================================
// evaluateConditions (AND/OR logic)
// =================================================================================

describe('evaluateConditions', () => {
  const file = makeTFile('projects/nota.md');
  const fm = { type: 'project', status: 'active' };

  const folderCond: Condition = { type: 'folder', negated: false, folderPath: 'projects/' };
  const propCond: Condition = { type: 'property', negated: false, propertyName: 'type', propertyValue: 'project' };
  const wrongPropCond: Condition = { type: 'property', negated: false, propertyName: 'type', propertyValue: 'article' };

  it('empty conditions returns false', () => {
    expect(evaluateConditions([], 'any', file, fm)).toBe(false);
    expect(evaluateConditions([], 'all', file, fm)).toBe(false);
  });

  it('OR logic: any matching condition is enough', () => {
    expect(evaluateConditions([folderCond, wrongPropCond], 'any', file, fm)).toBe(true);
  });

  it('OR logic: no match returns false', () => {
    expect(evaluateConditions([wrongPropCond], 'any', file, fm)).toBe(false);
  });

  it('AND logic: all conditions must match', () => {
    expect(evaluateConditions([folderCond, propCond], 'all', file, fm)).toBe(true);
  });

  it('AND logic: one failing condition returns false', () => {
    expect(evaluateConditions([folderCond, wrongPropCond], 'all', file, fm)).toBe(false);
  });

  it('AND + negation: folder IS projects/ AND status IS NOT draft', () => {
    const notDraft: Condition = { type: 'property', negated: true, propertyName: 'status', propertyValue: 'draft' };
    expect(evaluateConditions([folderCond, notDraft], 'all', file, fm)).toBe(true);

    const draftFm = { type: 'project', status: 'draft' };
    expect(evaluateConditions([folderCond, notDraft], 'all', file, draftFm)).toBe(false);
  });
});

// =================================================================================
// getApplicableConfig (integration)
// =================================================================================

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
  it('matches by filename condition', () => {
    const mirror = createCustomMirror({
      conditions: [{ type: 'file', negated: false, fileName: 'nota.md' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('projects/nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config).not.toBeNull();
    expect(config!.templatePath).toBe('templates/test.md');
  });

  it('matches by full path condition', () => {
    const mirror = createCustomMirror({
      conditions: [{ type: 'file', negated: false, fileName: 'projects/nota.md' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });

    const fileMatch = makeTFile('projects/nota.md');
    expect(getApplicableConfig(plugin, fileMatch, {})).not.toBeNull();

    clearConfigCache();
    const fileNoMatch = makeTFile('archive/nota.md');
    expect(getApplicableConfig(plugin, fileNoMatch, {})).toBeNull();
  });

  // ---- Folder match ----
  it('matches by folder condition', () => {
    const mirror = createCustomMirror({
      conditions: [{ type: 'folder', negated: false, folderPath: 'projects/' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('projects/nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config).not.toBeNull();
  });

  it('first matching mirror wins (order matters)', () => {
    const mirrorA = createCustomMirror({
      id: 'a',
      custom_settings_live_preview_note: 'templates/a.md',
      conditions: [{ type: 'folder', negated: false, folderPath: 'projects/' }],
    });
    const mirrorB = createCustomMirror({
      id: 'b',
      custom_settings_live_preview_note: 'templates/b.md',
      conditions: [{ type: 'folder', negated: false, folderPath: 'projects/sub/' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirrorA, mirrorB] },
    });
    const file = makeTFile('projects/sub/nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config!.templatePath).toBe('templates/a.md');
  });

  // ---- Props match ----
  it('matches by property condition', () => {
    const mirror = createCustomMirror({
      conditions: [{ type: 'property', negated: false, propertyName: 'type', propertyValue: 'project' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { type: 'project' });
    expect(config).not.toBeNull();
  });

  it('matches property with array value (e.g. tags)', () => {
    const mirror = createCustomMirror({
      conditions: [{ type: 'property', negated: false, propertyName: 'tags', propertyValue: 'project' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { tags: ['a', 'project'] });
    expect(config).not.toBeNull();
  });

  it('matches property with boolean value', () => {
    const mirror = createCustomMirror({
      conditions: [{ type: 'property', negated: false, propertyName: 'completed', propertyValue: 'true' }],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { completed: true });
    expect(config).not.toBeNull();
  });

  // ---- AND/OR integration ----
  it('AND logic: folder + property both required', () => {
    const mirror = createCustomMirror({
      conditionLogic: 'all',
      conditions: [
        { type: 'folder', negated: false, folderPath: 'projects/' },
        { type: 'property', negated: false, propertyName: 'type', propertyValue: 'active' },
      ],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });

    // Both match
    expect(getApplicableConfig(plugin, makeTFile('projects/nota.md'), { type: 'active' })).not.toBeNull();

    // Only folder matches
    clearConfigCache();
    expect(getApplicableConfig(plugin, makeTFile('projects/nota.md'), { type: 'inactive' })).toBeNull();

    // Only property matches
    clearConfigCache();
    expect(getApplicableConfig(plugin, makeTFile('archive/nota.md'), { type: 'active' })).toBeNull();
  });

  it('OR logic: either condition is enough', () => {
    const mirror = createCustomMirror({
      conditionLogic: 'any',
      conditions: [
        { type: 'folder', negated: false, folderPath: 'projects/' },
        { type: 'property', negated: false, propertyName: 'type', propertyValue: 'active' },
      ],
    });
    const plugin = createFakePlugin({ settings: { ...createFakePlugin().settings, customMirrors: [mirror] } });

    // Only folder matches
    expect(getApplicableConfig(plugin, makeTFile('projects/nota.md'), {})).not.toBeNull();

    // Only property matches
    clearConfigCache();
    expect(getApplicableConfig(plugin, makeTFile('archive/nota.md'), { type: 'active' })).not.toBeNull();
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
      custom_settings_override: false,
      conditions: [{ type: 'file', negated: false, fileName: 'nota.md' }],
    });
    const plugin = createFakePlugin({
      settings: {
        ...createFakePlugin().settings,
        global_settings: true,
        enable_global_live_preview_mode: true,
        global_settings_live_preview_note: 'templates/global.md',
        global_settings_override: true,
        customMirrors: [mirror],
      },
    });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, {});
    expect(config!.templatePath).toBe('templates/global.md');
  });

  it('global override active + custom with override → custom wins', () => {
    const mirror = createCustomMirror({
      custom_settings_override: true,
      custom_settings_live_preview_note: 'templates/custom.md',
      conditions: [{ type: 'file', negated: false, fileName: 'nota.md' }],
    });
    const plugin = createFakePlugin({
      settings: {
        ...createFakePlugin().settings,
        global_settings: true,
        enable_global_live_preview_mode: true,
        global_settings_live_preview_note: 'templates/global.md',
        global_settings_override: true,
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
      conditions: [{ type: 'file', negated: false, fileName: 'nota.md' }],
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
      conditions: [{ type: 'file', negated: false, fileName: 'cached.md' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    const file = makeTFile('cached.md');
    const fm = { title: 'Test' };

    const config1 = getApplicableConfig(plugin, file, fm);
    expect(config1!.templatePath).toBe('templates/original.md');

    plugin.settings.customMirrors[0].custom_settings_live_preview_note = 'templates/changed.md';

    const config2 = getApplicableConfig(plugin, file, fm);
    expect(config2!.templatePath).toBe('templates/original.md');
  });

  // ---- Disabled mirror ----
  it('disabled mirror is skipped even with matching conditions', () => {
    const mirror = createCustomMirror({
      enable_custom_live_preview_mode: false,
      conditions: [{ type: 'property', negated: false, propertyName: 'type', propertyValue: 'project' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { type: 'project' });
    expect(config).toBeNull();
  });

  // ---- Empty conditions ----
  it('mirror with empty conditions does not match', () => {
    const mirror = createCustomMirror({ conditions: [] });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    const file = makeTFile('nota.md');

    const config = getApplicableConfig(plugin, file, { type: 'project' });
    expect(config).toBeNull();
  });

  // ---- Dual-template (viewMode) ----
  it('uses live_preview template when viewMode is source', () => {
    const mirror = createCustomMirror({
      enable_custom_live_preview_mode: true,
      custom_settings_live_preview_note: 'templates/lp.md',
      custom_settings_live_preview_pos: 'top',
      enable_custom_preview_mode: true,
      custom_settings_preview_note: 'templates/rv.md',
      custom_settings_preview_pos: 'bottom',
      conditions: [{ type: 'file', negated: false, fileName: 'dual.md' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    clearConfigCache();
    const config = getApplicableConfig(plugin, makeTFile('dual.md'), {}, undefined, 'source');
    expect(config!.templatePath).toBe('templates/lp.md');
    expect(config!.position).toBe('top');
  });

  it('uses preview template when viewMode is preview', () => {
    const mirror = createCustomMirror({
      enable_custom_live_preview_mode: true,
      custom_settings_live_preview_note: 'templates/lp.md',
      custom_settings_live_preview_pos: 'top',
      enable_custom_preview_mode: true,
      custom_settings_preview_note: 'templates/rv.md',
      custom_settings_preview_pos: 'bottom',
      conditions: [{ type: 'file', negated: false, fileName: 'dual.md' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    clearConfigCache();
    const config = getApplicableConfig(plugin, makeTFile('dual.md'), {}, undefined, 'preview');
    expect(config!.templatePath).toBe('templates/rv.md');
    expect(config!.position).toBe('bottom');
  });

  it('LP-only mirror does not match in preview mode (no fallback)', () => {
    const mirror = createCustomMirror({
      enable_custom_live_preview_mode: true,
      custom_settings_live_preview_note: 'templates/lp.md',
      enable_custom_preview_mode: false,
      custom_settings_preview_note: '',
      conditions: [{ type: 'file', negated: false, fileName: 'lp-only.md' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    clearConfigCache();
    const config = getApplicableConfig(plugin, makeTFile('lp-only.md'), {}, undefined, 'preview');
    expect(config).toBeNull();
  });

  it('mirror with only preview mode matches in preview but not source', () => {
    const mirror = createCustomMirror({
      enable_custom_live_preview_mode: false,
      custom_settings_live_preview_note: '',
      enable_custom_preview_mode: true,
      custom_settings_preview_note: 'templates/rv-only.md',
      conditions: [{ type: 'file', negated: false, fileName: 'rv-only.md' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    clearConfigCache();
    // In preview → uses preview template
    const rvConfig = getApplicableConfig(plugin, makeTFile('rv-only.md'), {}, undefined, 'preview');
    expect(rvConfig!.templatePath).toBe('templates/rv-only.md');
    // In source → RV-only mirror does not match (no LP template)
    clearConfigCache();
    const lpConfig = getApplicableConfig(plugin, makeTFile('rv-only.md'), {}, undefined, 'source');
    expect(lpConfig).toBeNull();
  });

  it('cache separates LP and RV for same file', () => {
    const mirror = createCustomMirror({
      enable_custom_live_preview_mode: true,
      custom_settings_live_preview_note: 'templates/lp.md',
      enable_custom_preview_mode: true,
      custom_settings_preview_note: 'templates/rv.md',
      conditions: [{ type: 'file', negated: false, fileName: 'cached-dual.md' }],
    });
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [mirror] },
    });
    clearConfigCache();
    const fm = { title: 'Test' };
    const lpConfig = getApplicableConfig(plugin, makeTFile('cached-dual.md'), fm, undefined, 'source');
    const rvConfig = getApplicableConfig(plugin, makeTFile('cached-dual.md'), fm, undefined, 'preview');
    expect(lpConfig!.templatePath).toBe('templates/lp.md');
    expect(rvConfig!.templatePath).toBe('templates/rv.md');
  });

  it('global mirror uses preview template in preview mode', () => {
    const plugin = createFakePlugin({
      settings: {
        ...createFakePlugin().settings,
        global_settings: true,
        enable_global_live_preview_mode: true,
        global_settings_live_preview_note: 'templates/global-lp.md',
        global_settings_live_preview_pos: 'top',
        enable_global_preview_mode: true,
        global_settings_preview_note: 'templates/global-rv.md',
        global_settings_preview_pos: 'bottom',
      },
    });
    clearConfigCache();
    const lpConfig = getApplicableConfig(plugin, makeTFile('any.md'), {}, undefined, 'source');
    expect(lpConfig!.templatePath).toBe('templates/global-lp.md');
    clearConfigCache();
    const rvConfig = getApplicableConfig(plugin, makeTFile('any.md'), {}, undefined, 'preview');
    expect(rvConfig!.templatePath).toBe('templates/global-rv.md');
    expect(rvConfig!.position).toBe('bottom');
  });

  // ---- Migration: pre-v46 mirrors without conditions field ----
  it('does not crash when mirror has no conditions field (pre-v46 migration)', () => {
    // Simulate a pre-v46 data.json where conditions/conditionLogic don't exist
    const legacyMirror = createCustomMirror({}) as any;
    delete legacyMirror.conditions;
    delete legacyMirror.conditionLogic;
    const plugin = createFakePlugin({
      settings: { ...createFakePlugin().settings, customMirrors: [legacyMirror] },
    });
    const file = makeTFile('nota.md');

    // Should not throw — mirror.conditions is undefined, line 114 must handle gracefully
    expect(() => getApplicableConfig(plugin, file, {})).not.toThrow();
    expect(getApplicableConfig(plugin, file, {})).toBeNull();
  });
});
