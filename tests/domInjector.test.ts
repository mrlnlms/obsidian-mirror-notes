import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isDomPosition, isDomTargetVisible, resolveTarget, getFallbackPosition,
  injectDomMirror, removeDomMirror, removeAllDomMirrors, cleanupAllDomMirrors,
} from '../src/rendering/domInjector';
import { renderMirrorTemplate } from '../src/rendering/templateRenderer';
import { MirrorPosition, ApplicableMirrorConfig } from '../src/editor/mirrorTypes';
import { MarkdownView } from 'obsidian';
import { createFakePlugin } from './mocks/pluginFactory';

// Silence Logger
vi.mock('../src/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

// Mock templateRenderer (avoid real rendering)
vi.mock('../src/rendering/templateRenderer', () => ({
  renderMirrorTemplate: vi.fn().mockResolvedValue(undefined),
}));

/** Helper: create a fake .view-content div with optional child elements */
function createViewContent(options: {
  title?: boolean;
  properties?: boolean;
  backlinks?: boolean;
  sizer?: boolean;
}): HTMLElement {
  const div = document.createElement('div');
  div.className = 'view-content';
  if (options.title) {
    const el = document.createElement('div');
    el.className = 'inline-title';
    el.textContent = 'Title';
    div.appendChild(el);
  }
  if (options.properties) {
    const el = document.createElement('div');
    el.className = 'metadata-container';
    el.textContent = 'props';
    div.appendChild(el);
  }
  if (options.backlinks) {
    const el = document.createElement('div');
    el.className = 'embedded-backlinks';
    // Add a child element to simulate actual backlinks content (e.g. .backlink-pane)
    const pane = document.createElement('div');
    pane.className = 'backlink-pane';
    el.appendChild(pane);
    div.appendChild(el);
  }
  if (options.sizer) {
    const el = document.createElement('div');
    el.className = 'cm-sizer';
    el.textContent = 'sizer';
    div.appendChild(el);
  }
  return div;
}

// =============================================================================
// isDomTargetVisible
// =============================================================================

describe('isDomTargetVisible', () => {
  function fakeApp(config: Record<string, any>, internalPlugins?: Record<string, any>) {
    return {
      vault: { getConfig: (key: string) => config[key] },
      internalPlugins: { plugins: internalPlugins || {} },
    } as any;
  }

  it('above-title visible when showInlineTitle is true', () => {
    expect(isDomTargetVisible(fakeApp({ showInlineTitle: true }), 'above-title')).toBe(true);
  });

  it('above-title hidden when showInlineTitle is false', () => {
    expect(isDomTargetVisible(fakeApp({ showInlineTitle: false }), 'above-title')).toBe(false);
  });

  it('above-properties visible when propertiesInDocument is "visible"', () => {
    expect(isDomTargetVisible(fakeApp({ propertiesInDocument: 'visible' }), 'above-properties')).toBe(true);
  });

  it('below-properties hidden when propertiesInDocument is "hidden"', () => {
    expect(isDomTargetVisible(fakeApp({ propertiesInDocument: 'hidden' }), 'below-properties')).toBe(false);
  });

  it('below-properties visible when propertiesInDocument is "source"', () => {
    expect(isDomTargetVisible(fakeApp({ propertiesInDocument: 'source' }), 'below-properties')).toBe(true);
  });

  it('backlinks visible when core plugin ON + backlinkInDocument ON', () => {
    const bl = { backlink: { enabled: true, instance: { options: { backlinkInDocument: true } } } };
    expect(isDomTargetVisible(fakeApp({}, bl), 'above-backlinks')).toBe(true);
    expect(isDomTargetVisible(fakeApp({}, bl), 'below-backlinks')).toBe(true);
  });

  it('backlinks hidden when core plugin OFF', () => {
    const bl = { backlink: { enabled: false, instance: null } };
    expect(isDomTargetVisible(fakeApp({}, bl), 'above-backlinks')).toBe(false);
    expect(isDomTargetVisible(fakeApp({}, bl), 'below-backlinks')).toBe(false);
  });

  it('backlinks visible when core plugin ON regardless of backlinkInDocument', () => {
    // isDomTargetVisible only checks plugin ON/OFF — actual content is checked in resolveTarget
    const bl = { backlink: { enabled: true, instance: { options: { backlinkInDocument: false } } } };
    expect(isDomTargetVisible(fakeApp({}, bl), 'above-backlinks')).toBe(true);
    expect(isDomTargetVisible(fakeApp({}, bl), 'below-backlinks')).toBe(true);
  });

  it('backlinks hidden when internalPlugins not available', () => {
    expect(isDomTargetVisible(fakeApp({}), 'above-backlinks')).toBe(false);
    expect(isDomTargetVisible(fakeApp({}), 'below-backlinks')).toBe(false);
  });

  it('CM6 positions always visible', () => {
    expect(isDomTargetVisible(fakeApp({}), 'top')).toBe(true);
    expect(isDomTargetVisible(fakeApp({}), 'bottom')).toBe(true);
  });
});

// =============================================================================
// isDomPosition
// =============================================================================

describe('isDomPosition', () => {
  it('returns true for DOM positions', () => {
    const domPositions: MirrorPosition[] = [
      'above-title', 'above-properties', 'below-properties',
      'above-backlinks', 'below-backlinks',
    ];
    for (const pos of domPositions) {
      expect(isDomPosition(pos)).toBe(true);
    }
  });

  it('returns false for CM6 positions', () => {
    expect(isDomPosition('top')).toBe(false);
    expect(isDomPosition('bottom')).toBe(false);
  });

  it('returns false for margin positions', () => {
    expect(isDomPosition('left')).toBe(false);
    expect(isDomPosition('right')).toBe(false);
  });
});

// =============================================================================
// resolveTarget
// =============================================================================

describe('resolveTarget', () => {
  it('above-title with .inline-title present → before', () => {
    const vc = createViewContent({ title: true });
    const result = resolveTarget(vc, 'above-title');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('before');
    expect(result!.target.className).toBe('inline-title');
  });

  it('above-title without .inline-title → null', () => {
    const vc = createViewContent({});
    expect(resolveTarget(vc, 'above-title')).toBeNull();
  });

  it('above-properties with .metadata-container → before', () => {
    const vc = createViewContent({ properties: true });
    const result = resolveTarget(vc, 'above-properties');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('before');
  });

  it('below-properties with .metadata-container → after', () => {
    const vc = createViewContent({ properties: true });
    const result = resolveTarget(vc, 'below-properties');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('after');
  });

  it('above-backlinks with .embedded-backlinks → before', () => {
    const vc = createViewContent({ backlinks: true });
    const result = resolveTarget(vc, 'above-backlinks');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('before');
  });

  it('below-backlinks without .embedded-backlinks but with .cm-sizer → appendChild', () => {
    const vc = createViewContent({ sizer: true });
    const result = resolveTarget(vc, 'below-backlinks');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('appendChild');
    expect(result!.target.className).toBe('cm-sizer');
  });

  it('below-backlinks without any fallback → null', () => {
    const vc = createViewContent({});
    expect(resolveTarget(vc, 'below-backlinks')).toBeNull();
  });

  it('CM6 position (top) → null (not a DOM position)', () => {
    const vc = createViewContent({ title: true, properties: true });
    expect(resolveTarget(vc, 'top')).toBeNull();
  });

  it('above-backlinks returns null when plugin OFF', () => {
    const vc = createViewContent({ backlinks: true });
    const app = {
      vault: { getConfig: () => undefined },
      internalPlugins: { plugins: { backlink: { enabled: false, instance: null } } },
    } as any;
    expect(resolveTarget(vc, 'above-backlinks', app)).toBeNull();
  });

  it('above-backlinks returns null when element exists but has no children (empty shell)', () => {
    // Simulates backlinkInDocument just toggled ON but DOM not updated yet
    const vc = document.createElement('div');
    vc.className = 'view-content';
    const emptyBacklinks = document.createElement('div');
    emptyBacklinks.className = 'embedded-backlinks';
    // No child elements — empty shell
    vc.appendChild(emptyBacklinks);

    const app = {
      vault: { getConfig: () => undefined },
      internalPlugins: { plugins: { backlink: { enabled: true, instance: { options: { backlinkInDocument: true } } } } },
    } as any;
    expect(resolveTarget(vc, 'above-backlinks', app)).toBeNull();
  });

  it('above-backlinks DOM injects when element has children (real content)', () => {
    const vc = createViewContent({ backlinks: true }); // has .backlink-pane child
    const app = {
      vault: { getConfig: () => undefined },
      internalPlugins: { plugins: { backlink: { enabled: true, instance: { options: { backlinkInDocument: false } } } } },
    } as any;
    // Even though API says OFF, element has children → DOM inject (not reactive yet)
    const result = resolveTarget(vc, 'above-backlinks', app);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('before');
  });
});

// =============================================================================
// getFallbackPosition
// =============================================================================

describe('getFallbackPosition', () => {
  it('above-title → above-properties (stays in DOM hierarchy)', () => {
    expect(getFallbackPosition('above-title')).toBe('above-properties');
  });

  it('above-properties → top', () => {
    expect(getFallbackPosition('above-properties')).toBe('top');
  });

  it('below-properties → top', () => {
    expect(getFallbackPosition('below-properties')).toBe('top');
  });

  it('above-backlinks → bottom', () => {
    expect(getFallbackPosition('above-backlinks')).toBe('bottom');
  });

  it('below-backlinks → bottom', () => {
    expect(getFallbackPosition('below-backlinks')).toBe('bottom');
  });
});

// =============================================================================
// Helpers for inject/remove/cleanup tests
// =============================================================================

function createFakeView(filePath: string, viewContent: HTMLElement): MarkdownView {
  const containerEl = document.createElement('div');
  containerEl.appendChild(viewContent);
  return {
    file: { path: filePath, name: filePath.split('/').pop() },
    containerEl,
  } as unknown as MarkdownView;
}

function makeConfig(position: MirrorPosition): ApplicableMirrorConfig {
  return { templatePath: 'templates/test.md', position, hideProps: false };
}

// =============================================================================
// injectDomMirror
// =============================================================================

describe('injectDomMirror', () => {
  const renderSpy = vi.mocked(renderMirrorTemplate);

  beforeEach(() => {
    cleanupAllDomMirrors();
    renderSpy.mockClear();
  });

  it('inserts container into DOM when target present, returns original position', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true });
    const view = createFakeView('note-inject-1.md', vc);
    const config = makeConfig('above-title');

    const result = await injectDomMirror(plugin, view, config, { title: 'Test' });

    expect(result).toBe('above-title');
    const injected = vc.querySelector('.mirror-dom-injection');
    expect(injected).not.toBeNull();
    expect(injected!.getAttribute('data-position')).toBe('above-title');
    // Container is before .inline-title
    const title = vc.querySelector('.inline-title')!;
    expect(title.previousElementSibling).toBe(injected);
  });

  it('returns fallback position when target not found, no container in DOM', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({}); // no .inline-title
    const view = createFakeView('note-inject-2.md', vc);
    const config = makeConfig('above-title');

    const result = await injectDomMirror(plugin, view, config, {});

    expect(result).toBe('above-properties'); // fallback stays in DOM hierarchy
    expect(vc.querySelector('.mirror-dom-injection')).toBeNull();
  });

  it('reuses existing container when already connected to document', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true });
    // Attach entire tree to document so isConnected=true for injected container
    const wrapper = document.createElement('div');
    wrapper.appendChild(vc);
    document.body.appendChild(wrapper);

    const view = { file: { path: 'note-inject-3.md', name: 'note-inject-3.md' }, containerEl: wrapper } as unknown as MarkdownView;
    const config = makeConfig('above-title');

    await injectDomMirror(plugin, view, config, { title: 'First' });
    await injectDomMirror(plugin, view, config, { title: 'Second' });

    // renderMirrorTemplate called 2x (content may differ)
    expect(renderSpy).toHaveBeenCalledTimes(2);
    // But only 1 container in DOM (reused, not duplicated)
    const containers = vc.querySelectorAll('.mirror-dom-injection');
    expect(containers.length).toBe(1);

    wrapper.remove();
  });

  it('below-properties without .metadata-container falls back to top', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({}); // no metadata-container
    const view = createFakeView('note-inject-4.md', vc);
    const config = makeConfig('below-properties');

    const result = await injectDomMirror(plugin, view, config, {});

    expect(result).toBe('top');
    expect(vc.querySelector('.mirror-dom-injection')).toBeNull();
  });

  it('calls renderMirrorTemplate with correct arguments', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true });
    const view = createFakeView('note-inject-5.md', vc);
    const config = makeConfig('above-title');
    const fm = { title: 'Hello' };

    await injectDomMirror(plugin, view, config, fm);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    const callArgs = renderSpy.mock.calls[0][0];
    expect(callArgs.plugin).toBe(plugin);
    expect(callArgs.templatePath).toBe('templates/test.md');
    expect(callArgs.variables).toBe(fm);
    expect(callArgs.sourcePath).toBe('note-inject-5.md');
    expect(callArgs.cacheKey).toBe('dom-note-inject-5.md-above-title');
  });

  it('returns config.position early when view has no file', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true });
    const view = createFakeView('x.md', vc);
    (view as any).file = null;
    const config = makeConfig('above-title');

    const result = await injectDomMirror(plugin, view, config, {});

    expect(result).toBe('above-title');
    expect(renderSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// removeDomMirror
// =============================================================================

describe('removeDomMirror', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
  });

  it('removes container from DOM and internal map', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true });
    const view = createFakeView('note-remove-1.md', vc);
    const config = makeConfig('above-title');

    await injectDomMirror(plugin, view, config, {});
    expect(vc.querySelector('.mirror-dom-injection')).not.toBeNull();

    removeDomMirror('note-remove-1.md', 'above-title');

    expect(vc.querySelector('.mirror-dom-injection')).toBeNull();
  });

  it('is safe to call for non-existent key', () => {
    expect(() => removeDomMirror('nonexistent.md', 'above-title')).not.toThrow();
  });
});

// =============================================================================
// removeAllDomMirrors
// =============================================================================

describe('removeAllDomMirrors', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
  });

  it('removes all containers for a file (multiple positions)', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true, properties: true });
    const view = createFakeView('note-removeall.md', vc);

    await injectDomMirror(plugin, view, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view, makeConfig('below-properties'), {});
    expect(vc.querySelectorAll('.mirror-dom-injection').length).toBe(2);

    removeAllDomMirrors('note-removeall.md');

    expect(vc.querySelectorAll('.mirror-dom-injection').length).toBe(0);
  });
});

// =============================================================================
// cleanupAllDomMirrors
// =============================================================================

describe('cleanupAllDomMirrors', () => {
  it('removes containers from different files', async () => {
    cleanupAllDomMirrors(); // start clean
    const plugin = createFakePlugin();

    const vc1 = createViewContent({ title: true });
    const view1 = createFakeView('file-a.md', vc1);
    await injectDomMirror(plugin, view1, makeConfig('above-title'), {});

    const vc2 = createViewContent({ properties: true });
    const view2 = createFakeView('file-b.md', vc2);
    await injectDomMirror(plugin, view2, makeConfig('above-properties'), {});

    expect(vc1.querySelector('.mirror-dom-injection')).not.toBeNull();
    expect(vc2.querySelector('.mirror-dom-injection')).not.toBeNull();

    cleanupAllDomMirrors();

    expect(vc1.querySelector('.mirror-dom-injection')).toBeNull();
    expect(vc2.querySelector('.mirror-dom-injection')).toBeNull();
  });
});
