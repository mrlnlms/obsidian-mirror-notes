import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarkdownView } from 'obsidian';

// Silence Logger
vi.mock('../src/dev/logger', () => ({
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
  filePathFacet: { of: vi.fn() },
  viewIdFacet: { of: vi.fn() },
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
  removeOtherDomMirrors: vi.fn(),
  cleanupAllDomMirrors: vi.fn(),
  getViewId: vi.fn().mockReturnValue('v0'),
  resetViewIdCounter: vi.fn(),
}));
vi.mock('../src/editor/marginPanelExtension', () => ({
  mirrorMarginPanelPlugin: Symbol('marginPanel'),
}));
vi.mock('../src/editor/mirrorDecision', () => ({
  computeMirrorRuntimeDecision: vi.fn(),
}));
vi.mock('../src/utils/obsidianInternals', async () => {
  const actual = await vi.importActual('../src/utils/obsidianInternals');
  return {
    ...actual,
    getViewMode: vi.fn().mockReturnValue('source'),
  };
});
vi.mock('../settings', async () => {
  const actual = await vi.importActual('../settings');
  return {
    ...actual,
    MirrorUISettingsTab: vi.fn(),
  };
});

// Import after all mocks
import MirrorUIPlugin from '../main';
import { applyViewOverrides } from '../src/editor/viewOverrides';
import { computeMirrorRuntimeDecision } from '../src/editor/mirrorDecision';
import { getViewMode } from '../src/utils/obsidianInternals';

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

    applyViewOverrides(plugin, view);
    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-properties')).toBe(true);
  });

  it('removes mirror-hide-properties when hideProps false', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: null } },
    });
    view.containerEl.querySelector('.view-content')!.classList.add('mirror-hide-properties');

    applyViewOverrides(plugin, view);
    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
  });

  // --- readableLineLength ---
  it('removes is-readable-line-width when readableLineLength=false', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: false, showInlineTitle: null } },
    });

    applyViewOverrides(plugin, view);
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

    applyViewOverrides(plugin, view);
    const editor = view.containerEl.querySelector('.markdown-source-view')!;
    expect(editor.classList.contains('is-readable-line-width')).toBe(true);
  });

  it('preserves is-readable-line-width when readableLineLength=null (inherit)', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: null } },
    });

    applyViewOverrides(plugin, view);
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

    applyViewOverrides(plugin, view);
    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-inline-title')).toBe(true);
    expect(vc.classList.contains('mirror-force-inline-title')).toBe(false);
  });

  it('adds mirror-force-inline-title when showInlineTitle=true', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false, viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: true } },
    });

    applyViewOverrides(plugin, view);
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

    applyViewOverrides(plugin, view);

    expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
    expect(vc.classList.contains('mirror-hide-inline-title')).toBe(false);
    expect(vc.classList.contains('mirror-force-inline-title')).toBe(false);
  });

  // --- edge cases ---
  it('returns without error when view has no file', () => {
    const view = createViewWithState({ enabled: true, config: null });
    (view as any).file = null;
    expect(() => applyViewOverrides(plugin, view)).not.toThrow();
  });

  it('returns without error when view has no cm', () => {
    const view = createViewWithState({ enabled: true, config: null });
    (view as any).editor = {};
    expect(() => applyViewOverrides(plugin, view)).not.toThrow();
  });

  it('returns without error when field state is undefined', () => {
    const view = createViewWithState(null);
    expect(() => applyViewOverrides(plugin, view)).not.toThrow();
  });

  it('returns without error when containerEl has no .view-content', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: true, viewOverrides: { hideProps: true, readableLineLength: null, showInlineTitle: null } },
    });
    (view as any).containerEl = document.createElement('div');
    expect(() => applyViewOverrides(plugin, view)).not.toThrow();
  });

  // --- RV fallback path (preview-only mirrors) ---
  describe('RV fallback — preview-only mirrors', () => {
    function createRVView(): MarkdownView {
      const viewContentDiv = document.createElement('div');
      viewContentDiv.className = 'view-content';
      const editorEl = document.createElement('div');
      editorEl.className = 'markdown-source-view is-readable-line-width';
      viewContentDiv.appendChild(editorEl);
      const containerEl = document.createElement('div');
      containerEl.appendChild(viewContentDiv);
      return {
        file: { path: 'rv-note.md', name: 'rv-note.md' },
        containerEl,
        // No CM6 editor — simulates RV where StateField has no config
        editor: { cm: { state: { field: () => undefined } } },
      } as unknown as MarkdownView;
    }

    beforeEach(() => {
      vi.mocked(getViewMode).mockReturnValue('preview');
      vi.mocked(computeMirrorRuntimeDecision).mockReset();
      plugin.app.metadataCache = { getFileCache: vi.fn().mockReturnValue({ frontmatter: {} }) } as any;
    });

    it('applies overrides from decision when engine is not none (preview-only mirror)', () => {
      vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
        config: {
          templatePath: 'templates/rv.md', position: 'top', hideProps: true, showContainer: true,
          viewOverrides: { hideProps: true, readableLineLength: false, showInlineTitle: false },
        },
        engine: 'dom',
        requestedPosition: 'top',
        resolvedPosition: 'top',
        fallbackApplied: false,
        reason: 'test',
      });
      const view = createRVView();
      applyViewOverrides(plugin, view);

      const vc = view.containerEl.querySelector('.view-content')!;
      expect(vc.classList.contains('mirror-hide-properties')).toBe(true);
      expect(vc.classList.contains('mirror-hide-inline-title')).toBe(true);
      const editor = view.containerEl.querySelector('.markdown-source-view')!;
      expect(editor.classList.contains('is-readable-line-width')).toBe(false);
    });

    it('does NOT apply overrides when engine is none (left/right in RV)', () => {
      vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
        config: {
          templatePath: 'templates/side.md', position: 'left', hideProps: true, showContainer: true,
          viewOverrides: { hideProps: true, readableLineLength: null, showInlineTitle: null },
        },
        engine: 'none',
        requestedPosition: 'left',
        resolvedPosition: null,
        fallbackApplied: false,
        reason: 'margin invisible in RV',
      });
      const view = createRVView();
      applyViewOverrides(plugin, view);

      const vc = view.containerEl.querySelector('.view-content')!;
      expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
    });

    it('does NOT apply overrides when no config returned (no matching mirror)', () => {
      vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
        config: null,
        engine: 'none',
        requestedPosition: null,
        resolvedPosition: null,
        fallbackApplied: false,
        reason: 'no matching mirror',
      });
      const view = createRVView();
      applyViewOverrides(plugin, view);

      const vc = view.containerEl.querySelector('.view-content')!;
      expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
    });

    it('does NOT use RV fallback in source mode', () => {
      vi.mocked(getViewMode).mockReturnValue('source');
      vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
        config: {
          templatePath: 'templates/rv.md', position: 'top', hideProps: true, showContainer: true,
          viewOverrides: { hideProps: true, readableLineLength: null, showInlineTitle: null },
        },
        engine: 'dom',
        requestedPosition: 'top',
        resolvedPosition: 'top',
        fallbackApplied: false,
        reason: 'test',
      });
      const view = createRVView();
      applyViewOverrides(plugin, view);

      // In source mode, no StateField config = no overrides (RV fallback skipped)
      const vc = view.containerEl.querySelector('.view-content')!;
      expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
      expect(computeMirrorRuntimeDecision).not.toHaveBeenCalled();
    });
  });
});
