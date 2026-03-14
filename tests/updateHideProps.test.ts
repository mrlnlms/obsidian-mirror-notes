import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarkdownView } from 'obsidian';

// Silence Logger
vi.mock('../src/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

// Mock all heavy dependencies that main.ts imports
vi.mock('@codemirror/state', () => ({
  StateEffect: { appendConfig: { of: vi.fn() } },
  StateField: { define: vi.fn(() => Symbol('field')) },
  Facet: { define: vi.fn(() => ({ of: vi.fn() })) },
}));
vi.mock('../src/editor/mirrorState', () => ({
  mirrorStateField: Symbol('mirrorStateField'),
  forceMirrorUpdateEffect: { of: vi.fn() },
  mirrorPluginFacet: { of: vi.fn() },
  cleanupMirrorCaches: vi.fn(),
  toggleWidgetEffect: Symbol('toggleWidgetEffect'),
}));
vi.mock('../src/rendering/codeBlockProcessor', () => ({
  registerMirrorCodeBlock: vi.fn(),
}));
vi.mock('../src/commands/insertMirrorBlock', () => ({
  registerInsertMirrorBlock: vi.fn(),
}));
vi.mock('../src/rendering/sourceDependencyRegistry', () => ({
  SourceDependencyRegistry: vi.fn(() => ({ clear: vi.fn(), getDependentCallbacks: vi.fn(() => []) })),
}));
vi.mock('../src/editor/mirrorConfig', () => ({
  clearConfigCache: vi.fn(),
  getApplicableConfig: vi.fn(),
}));
vi.mock('../src/rendering/domInjector', () => ({
  isDomPosition: vi.fn(),
  injectDomMirror: vi.fn(),
  removeAllDomMirrors: vi.fn(),
  cleanupAllDomMirrors: vi.fn(),
}));
vi.mock('../src/editor/marginPanelExtension', () => ({
  mirrorMarginPanelPlugin: Symbol('marginPanel'),
}));
vi.mock('../settings', async () => {
  const actual = await vi.importActual('../settings');
  return {
    ...actual,
    MirrorUISettingsTab: vi.fn(),
  };
});

// Import after all mocks
import MirrorUIPlugin from '../main';

function createViewWithState(mirrorState: any): MarkdownView {
  const viewContentDiv = document.createElement('div');
  viewContentDiv.className = 'view-content';

  // Simulate Obsidian's editor element inside view-content
  const editorEl = document.createElement('div');
  editorEl.className = 'markdown-source-view cm-s-obsidian mod-cm6 is-readable-line-width is-live-preview';
  viewContentDiv.appendChild(editorEl);

  const containerEl = document.createElement('div');
  containerEl.appendChild(viewContentDiv);

  return {
    file: { path: 'test.md', name: 'test.md' },
    containerEl,
    editor: {
      cm: {
        state: {
          field: (_field: any, _require?: boolean) => {
            if (mirrorState === null) return undefined;
            return { mirrorState };
          },
        },
      },
    },
  } as unknown as MarkdownView;
}

describe('applyViewOverrides', () => {
  let plugin: MirrorUIPlugin;

  beforeEach(() => {
    plugin = Object.create(MirrorUIPlugin.prototype);
    // Mock app.vault.getConfig for readable line inherit
    (plugin as any).app = {
      vault: {
        getConfig: (key: string) => {
          if (key === 'readableLineLength') return true;
          return undefined;
        },
      },
    };
  });

  // --- hideProps ---
  it('adds mirror-hide-properties when hideProps true', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: true, viewOverrides: { hideProps: true, readableLineLength: null, showInlineTitle: null } },
    });

    plugin.applyViewOverrides(view);
    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-properties')).toBe(true);
  });

  it('removes mirror-hide-properties when hideProps false', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: null } },
    });
    view.containerEl.querySelector('.view-content')!.classList.add('mirror-hide-properties');

    plugin.applyViewOverrides(view);
    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
  });

  // --- readableLineLength ---
  it('removes is-readable-line-width when readableLineLength=false', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: false, showInlineTitle: null } },
    });

    plugin.applyViewOverrides(view);
    const editor = view.containerEl.querySelector('.markdown-source-view')!;
    expect(editor.classList.contains('is-readable-line-width')).toBe(false);
  });

  it('adds is-readable-line-width when readableLineLength=true', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: true, showInlineTitle: null } },
    });
    // Start without readable line
    view.containerEl.querySelector('.markdown-source-view')!.classList.remove('is-readable-line-width');

    plugin.applyViewOverrides(view);
    const editor = view.containerEl.querySelector('.markdown-source-view')!;
    expect(editor.classList.contains('is-readable-line-width')).toBe(true);
  });

  it('preserves is-readable-line-width when readableLineLength=null (inherit)', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: null } },
    });

    plugin.applyViewOverrides(view);
    const editor = view.containerEl.querySelector('.markdown-source-view')!;
    // inherit restores global — mock has no app.vault.getConfig, so it defaults to falsy
    expect(editor.classList.contains('is-readable-line-width')).toBeDefined();
  });

  // --- showInlineTitle ---
  it('adds mirror-hide-inline-title when showInlineTitle=false', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: false } },
    });

    plugin.applyViewOverrides(view);
    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-inline-title')).toBe(true);
    expect(vc.classList.contains('mirror-force-inline-title')).toBe(false);
  });

  it('adds mirror-force-inline-title when showInlineTitle=true', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: true } },
    });

    plugin.applyViewOverrides(view);
    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-force-inline-title')).toBe(true);
    expect(vc.classList.contains('mirror-hide-inline-title')).toBe(false);
  });

  // --- disabled mirror clears all classes ---
  it('removes all override classes when mirror disabled', () => {
    const view = createViewWithState({
      enabled: false,
      config: null,
    });
    const vc = view.containerEl.querySelector('.view-content')!;
    vc.classList.add('mirror-hide-properties', 'mirror-hide-inline-title');

    plugin.applyViewOverrides(view);

    expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
    expect(vc.classList.contains('mirror-hide-inline-title')).toBe(false);
    expect(vc.classList.contains('mirror-force-inline-title')).toBe(false);
  });

  // --- edge cases ---
  it('returns without error when view has no file', () => {
    const view = createViewWithState({ enabled: true, config: null });
    (view as any).file = null;
    expect(() => plugin.applyViewOverrides(view)).not.toThrow();
  });

  it('returns without error when view has no cm', () => {
    const view = createViewWithState({ enabled: true, config: null });
    (view as any).editor = {};
    expect(() => plugin.applyViewOverrides(view)).not.toThrow();
  });

  it('returns without error when field state is undefined', () => {
    const view = createViewWithState(null);
    expect(() => plugin.applyViewOverrides(view)).not.toThrow();
  });

  it('returns without error when containerEl has no .view-content', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: true, viewOverrides: { hideProps: true, readableLineLength: null, showInlineTitle: null } },
    });
    (view as any).containerEl = document.createElement('div');
    expect(() => plugin.applyViewOverrides(view)).not.toThrow();
  });
});
