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

describe('updateHidePropsForView', () => {
  let plugin: MirrorUIPlugin;

  beforeEach(() => {
    plugin = Object.create(MirrorUIPlugin.prototype);
  });

  it('adds mirror-hide-properties when enabled + hideProps true', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: true },
    });

    plugin.updateHidePropsForView(view);

    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-properties')).toBe(true);
  });

  it('removes class when enabled + hideProps false', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: false },
    });
    view.containerEl.querySelector('.view-content')!.classList.add('mirror-hide-properties');

    plugin.updateHidePropsForView(view);

    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
  });

  it('removes class when mirror disabled', () => {
    const view = createViewWithState({
      enabled: false,
      config: null,
    });
    view.containerEl.querySelector('.view-content')!.classList.add('mirror-hide-properties');

    plugin.updateHidePropsForView(view);

    const vc = view.containerEl.querySelector('.view-content')!;
    expect(vc.classList.contains('mirror-hide-properties')).toBe(false);
  });

  it('returns without error when view has no file', () => {
    const view = createViewWithState({ enabled: true, config: null });
    (view as any).file = null;

    expect(() => plugin.updateHidePropsForView(view)).not.toThrow();
  });

  it('returns without error when view has no cm', () => {
    const view = createViewWithState({ enabled: true, config: null });
    (view as any).editor = {};

    expect(() => plugin.updateHidePropsForView(view)).not.toThrow();
  });

  it('returns without error when field state is undefined', () => {
    const view = createViewWithState(null);

    expect(() => plugin.updateHidePropsForView(view)).not.toThrow();
  });

  it('returns without error when containerEl has no .view-content', () => {
    const view = createViewWithState({
      enabled: true,
      config: { templatePath: 'x.md', position: 'top', hideProps: true },
    });
    // Replace containerEl with one that has no .view-content child
    (view as any).containerEl = document.createElement('div');

    expect(() => plugin.updateHidePropsForView(view)).not.toThrow();
  });
});
