import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Notice } from 'obsidian';
import { rebuildKnownTemplatePaths, checkDeletedTemplates } from '../src/settings/settingsHelpers';
import { createFakePlugin, createCustomMirror } from './mocks/pluginFactory';

// Mock Obsidian's createEl on DocumentFragment (Obsidian monkey-patches this)
const origCreateFragment = Document.prototype.createDocumentFragment;

beforeEach(() => {
  vi.spyOn(document, 'createDocumentFragment').mockImplementation(function (this: Document) {
    const frag = origCreateFragment.call(this);
    (frag as any).createEl = (tag: string, opts?: any) => {
      const el = document.createElement(tag);
      if (opts?.text) el.textContent = opts.text;
      if (opts?.attr) {
        for (const [k, v] of Object.entries(opts.attr)) {
          el.setAttribute(k, v as string);
        }
      }
      frag.appendChild(el);
      return el;
    };
    return frag;
  });
});

// Spy on Notice constructor to verify notifications
const NoticeSpy = vi.fn();
vi.mock('obsidian', async (importOriginal) => {
  const mod = await importOriginal<typeof import('obsidian')>();
  return {
    ...mod,
    Notice: class extends mod.Notice {
      constructor(...args: any[]) {
        super(...args);
        NoticeSpy(...args);
      }
    },
  };
});

beforeEach(() => {
  NoticeSpy.mockClear();
});

describe('rebuildKnownTemplatePaths', () => {
  it('collects global LP and preview template paths', () => {
    const plugin = createFakePlugin();
    plugin.knownTemplatePaths = new Set();
    plugin.settings.global_settings_live_preview_note = 'templates/global-lp.md';
    plugin.settings.global_settings_preview_note = 'templates/global-rv.md';
    plugin.settings.customMirrors = [];

    rebuildKnownTemplatePaths(plugin);

    expect(plugin.knownTemplatePaths).toContain('templates/global-lp.md');
    expect(plugin.knownTemplatePaths).toContain('templates/global-rv.md');
  });

  it('collects custom mirror template paths', () => {
    const plugin = createFakePlugin();
    plugin.knownTemplatePaths = new Set();
    plugin.settings.global_settings_live_preview_note = '';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [
      createCustomMirror({
        custom_settings_live_preview_note: 'templates/m1-lp.md',
        custom_settings_preview_note: 'templates/m1-rv.md',
      }),
      createCustomMirror({
        custom_settings_live_preview_note: 'templates/m2-lp.md',
        custom_settings_preview_note: '',
      }),
    ];

    rebuildKnownTemplatePaths(plugin);

    expect(plugin.knownTemplatePaths).toContain('templates/m1-lp.md');
    expect(plugin.knownTemplatePaths).toContain('templates/m1-rv.md');
    expect(plugin.knownTemplatePaths).toContain('templates/m2-lp.md');
    expect(plugin.knownTemplatePaths.has('')).toBe(false);
  });

  it('clears previous paths before rebuilding', () => {
    const plugin = createFakePlugin();
    plugin.knownTemplatePaths = new Set(['stale/path.md']);
    plugin.settings.global_settings_live_preview_note = 'templates/fresh.md';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [];

    rebuildKnownTemplatePaths(plugin);

    expect(plugin.knownTemplatePaths.has('stale/path.md')).toBe(false);
    expect(plugin.knownTemplatePaths).toContain('templates/fresh.md');
  });

  it('handles empty settings (no templates configured)', () => {
    const plugin = createFakePlugin();
    plugin.knownTemplatePaths = new Set();
    plugin.settings.global_settings_live_preview_note = '';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [];

    rebuildKnownTemplatePaths(plugin);

    expect(plugin.knownTemplatePaths.size).toBe(0);
  });
});

describe('checkDeletedTemplates', () => {
  it('creates Notice when global LP template is deleted', () => {
    const plugin = createFakePlugin();
    plugin.settings.global_settings_live_preview_note = 'templates/global.md';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [];

    checkDeletedTemplates(plugin, 'templates/global.md');

    expect(NoticeSpy).toHaveBeenCalledTimes(1);
    const frag = NoticeSpy.mock.calls[0][0] as DocumentFragment;
    expect(frag.textContent).toContain('templates/global.md');
  });

  it('creates Notice when global preview template is deleted', () => {
    const plugin = createFakePlugin();
    plugin.settings.global_settings_live_preview_note = '';
    plugin.settings.global_settings_preview_note = 'templates/preview.md';
    plugin.settings.customMirrors = [];

    checkDeletedTemplates(plugin, 'templates/preview.md');

    expect(NoticeSpy).toHaveBeenCalledTimes(1);
    const frag = NoticeSpy.mock.calls[0][0] as DocumentFragment;
    expect(frag.textContent).toContain('preview template');
  });

  it('creates Notice with mirror name when custom LP template is deleted', () => {
    const plugin = createFakePlugin();
    plugin.settings.global_settings_live_preview_note = '';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [
      createCustomMirror({ name: 'Mirror A', custom_settings_live_preview_note: 'templates/m1.md' }),
      createCustomMirror({ name: 'Mirror B', custom_settings_live_preview_note: 'templates/m2.md' }),
    ];

    checkDeletedTemplates(plugin, 'templates/m2.md');

    expect(NoticeSpy).toHaveBeenCalledTimes(1);
    const frag = NoticeSpy.mock.calls[0][0] as DocumentFragment;
    expect(frag.textContent).toContain('Mirror B');
  });

  it('click handler calls openSettingsToField with mirror index', () => {
    const plugin = createFakePlugin();
    plugin.settings.global_settings_live_preview_note = '';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [
      createCustomMirror({ custom_settings_preview_note: 'templates/rv.md' }),
    ];

    checkDeletedTemplates(plugin, 'templates/rv.md');

    const frag = NoticeSpy.mock.calls[0][0] as DocumentFragment;
    const link = frag.querySelector('a') as HTMLAnchorElement;
    link.click();

    expect(plugin.openSettingsToField).toHaveBeenCalledWith('templates/rv.md', [0]);
  });

  it('does nothing when deleted path matches no template', () => {
    const plugin = createFakePlugin();
    plugin.settings.global_settings_live_preview_note = 'templates/a.md';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [];

    checkDeletedTemplates(plugin, 'templates/unrelated.md');

    expect(NoticeSpy).not.toHaveBeenCalled();
  });

  it('creates multiple Notices when path matches both global and custom', () => {
    const plugin = createFakePlugin();
    plugin.settings.global_settings_live_preview_note = 'templates/shared.md';
    plugin.settings.global_settings_preview_note = '';
    plugin.settings.customMirrors = [
      createCustomMirror({ custom_settings_live_preview_note: 'templates/shared.md' }),
    ];

    checkDeletedTemplates(plugin, 'templates/shared.md');

    expect(NoticeSpy).toHaveBeenCalledTimes(2);
  });
});
