import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isDomPosition, isDomTargetVisible, resolveTarget, getFallbackPosition,
  injectDomMirror, removeDomMirror, removeAllDomMirrors, removeOtherDomMirrors,
  cleanupAllDomMirrors, getViewId, resetViewIdCounter,
  setupContainerObserver, disconnectObserver, disconnectObserversByPrefix,
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
  /** Reading View structure: .markdown-preview-sizer with mod-header, frontmatter, content, mod-footer */
  readingView?: boolean;
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
  if (options.readingView) {
    const readingView = document.createElement('div');
    readingView.className = 'markdown-reading-view';
    const previewView = document.createElement('div');
    previewView.className = 'markdown-preview-view markdown-rendered';
    const sizer = document.createElement('div');
    sizer.className = 'markdown-preview-sizer markdown-preview-section';
    // Reading View DOM: pusher → mod-header → frontmatter → content → mod-footer
    const pusher = document.createElement('div');
    pusher.className = 'markdown-preview-pusher';
    sizer.appendChild(pusher);
    const modHeader = document.createElement('div');
    modHeader.className = 'mod-header mod-ui';
    modHeader.textContent = 'Title + Properties header';
    sizer.appendChild(modHeader);
    const frontmatter = document.createElement('div');
    frontmatter.className = 'el-pre mod-frontmatter mod-ui';
    frontmatter.textContent = 'test: reading-view';
    sizer.appendChild(frontmatter);
    const content = document.createElement('div');
    content.className = 'el-h1';
    content.textContent = 'Heading';
    sizer.appendChild(content);
    const modFooter = document.createElement('div');
    modFooter.className = 'mod-footer mod-ui';
    sizer.appendChild(modFooter);
    previewView.appendChild(sizer);
    readingView.appendChild(previewView);
    div.appendChild(readingView);
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

  it('below-backlinks with populated backlinks → after', () => {
    const vc = createViewContent({ backlinks: true }); // has .backlink-pane child
    const result = resolveTarget(vc, 'below-backlinks');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('after');
    expect(result!.target.className).toBe('embedded-backlinks');
  });

  it('below-backlinks without .embedded-backlinks → null', () => {
    const vc = createViewContent({});
    expect(resolveTarget(vc, 'below-backlinks')).toBeNull();
  });

  it('below-backlinks with empty shell (children = 0) → null', () => {
    const vc = document.createElement('div');
    vc.className = 'view-content';
    const emptyBacklinks = document.createElement('div');
    emptyBacklinks.className = 'embedded-backlinks';
    vc.appendChild(emptyBacklinks);

    const app = {
      vault: { getConfig: () => undefined },
      internalPlugins: { plugins: { backlink: { enabled: true, instance: { options: { backlinkInDocument: true } } } } },
    } as any;
    expect(resolveTarget(vc, 'below-backlinks', app)).toBeNull();
  });

  it('below-backlinks returns null when plugin OFF', () => {
    const vc = createViewContent({ backlinks: true });
    const app = {
      vault: { getConfig: () => undefined },
      internalPlugins: { plugins: { backlink: { enabled: false, instance: null } } },
    } as any;
    expect(resolveTarget(vc, 'below-backlinks', app)).toBeNull();
  });

  it('below-backlinks DOM injects when element has children (real content)', () => {
    const vc = createViewContent({ backlinks: true }); // has .backlink-pane child
    const app = {
      vault: { getConfig: () => undefined },
      internalPlugins: { plugins: { backlink: { enabled: true, instance: { options: { backlinkInDocument: false } } } } },
    } as any;
    const result = resolveTarget(vc, 'below-backlinks', app);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('after');
  });

  it('top → null when no Reading View sizer (Live Preview)', () => {
    const vc = createViewContent({ title: true, properties: true });
    expect(resolveTarget(vc, 'top')).toBeNull();
  });

  it('bottom → null when no Reading View sizer (Live Preview)', () => {
    const vc = createViewContent({ title: true, properties: true });
    expect(resolveTarget(vc, 'bottom')).toBeNull();
  });

  // --- Reading View positions ---

  it('top in Reading View → after frontmatter', () => {
    const vc = createViewContent({ readingView: true });
    const result = resolveTarget(vc, 'top');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('after');
    expect(result!.target.className).toContain('mod-frontmatter');
  });

  it('top in Reading View without frontmatter → after mod-header', () => {
    const vc = createViewContent({ readingView: true });
    // Remove frontmatter element
    const fm = vc.querySelector('.el-pre.mod-frontmatter');
    fm?.remove();
    const result = resolveTarget(vc, 'top');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('after');
    expect(result!.target.className).toContain('mod-header');
  });

  it('bottom in Reading View → before mod-footer', () => {
    const vc = createViewContent({ readingView: true });
    const result = resolveTarget(vc, 'bottom');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('before');
    expect(result!.target.className).toContain('mod-footer');
  });

  it('bottom in Reading View without mod-footer → appendChild to sizer', () => {
    const vc = createViewContent({ readingView: true });
    const footer = vc.querySelector('.mod-footer');
    footer?.remove();
    const result = resolveTarget(vc, 'bottom');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('appendChild');
    expect(result!.target.className).toContain('markdown-preview-sizer');
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
// getViewId
// =============================================================================

describe('getViewId', () => {
  beforeEach(() => {
    resetViewIdCounter();
  });

  it('returns stable id for same element', () => {
    const el = document.createElement('div');
    const id1 = getViewId(el);
    const id2 = getViewId(el);
    expect(id1).toBe(id2);
  });

  it('returns different ids for different elements', () => {
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    expect(getViewId(el1)).not.toBe(getViewId(el2));
  });

  it('ids follow v0, v1, v2 pattern', () => {
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    expect(getViewId(el1)).toBe('v0');
    expect(getViewId(el2)).toBe('v1');
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
    resetViewIdCounter();
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

  it('calls renderMirrorTemplate with correct cacheKey including viewId', async () => {
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
    // cacheKey now includes viewId
    const viewId = getViewId(view.containerEl);
    expect(callArgs.cacheKey).toBe(`dom-${viewId}-note-inject-5.md-above-title`);
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
    resetViewIdCounter();
  });

  it('removes container from DOM and internal map', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true });
    const view = createFakeView('note-remove-1.md', vc);
    const viewId = getViewId(view.containerEl);
    const config = makeConfig('above-title');

    await injectDomMirror(plugin, view, config, {});
    expect(vc.querySelector('.mirror-dom-injection')).not.toBeNull();

    removeDomMirror(viewId, 'note-remove-1.md', 'above-title');

    expect(vc.querySelector('.mirror-dom-injection')).toBeNull();
  });

  it('is safe to call for non-existent key', () => {
    expect(() => removeDomMirror('v99', 'nonexistent.md', 'above-title')).not.toThrow();
  });
});

// =============================================================================
// removeAllDomMirrors
// =============================================================================

describe('removeAllDomMirrors', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
    resetViewIdCounter();
  });

  it('removes all containers for a view + file (multiple positions)', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true, properties: true });
    const view = createFakeView('note-removeall.md', vc);
    const viewId = getViewId(view.containerEl);

    await injectDomMirror(plugin, view, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view, makeConfig('below-properties'), {});
    expect(vc.querySelectorAll('.mirror-dom-injection').length).toBe(2);

    removeAllDomMirrors(viewId, 'note-removeall.md');

    expect(vc.querySelectorAll('.mirror-dom-injection').length).toBe(0);
  });
});

// =============================================================================
// removeOtherDomMirrors
// =============================================================================

describe('removeOtherDomMirrors', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
    resetViewIdCounter();
  });

  it('removes other positions but keeps the specified one', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true, properties: true });
    const view = createFakeView('note-other.md', vc);
    const viewId = getViewId(view.containerEl);

    await injectDomMirror(plugin, view, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view, makeConfig('below-properties'), {});
    expect(vc.querySelectorAll('.mirror-dom-injection').length).toBe(2);

    removeOtherDomMirrors(viewId, 'note-other.md', 'above-title');

    const remaining = vc.querySelectorAll('.mirror-dom-injection');
    expect(remaining.length).toBe(1);
    expect(remaining[0].getAttribute('data-position')).toBe('above-title');
  });
});

// =============================================================================
// cleanupAllDomMirrors
// =============================================================================

describe('cleanupAllDomMirrors', () => {
  it('removes containers from different files and views', async () => {
    cleanupAllDomMirrors(); // start clean
    resetViewIdCounter();
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

// =============================================================================
// Per-view isolation (same file in multiple panes)
// =============================================================================

describe('per-view isolation', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
    resetViewIdCounter();
  });

  it('same file in two panes → independent containers', async () => {
    const plugin = createFakePlugin();
    const vc1 = createViewContent({ title: true });
    const vc2 = createViewContent({ title: true });
    const view1 = createFakeView('shared.md', vc1);
    const view2 = createFakeView('shared.md', vc2);

    await injectDomMirror(plugin, view1, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view2, makeConfig('above-title'), {});

    // Both panes have their own container
    expect(vc1.querySelector('.mirror-dom-injection')).not.toBeNull();
    expect(vc2.querySelector('.mirror-dom-injection')).not.toBeNull();
  });

  it('removing from one view does not affect the other', async () => {
    const plugin = createFakePlugin();
    const vc1 = createViewContent({ title: true });
    const vc2 = createViewContent({ title: true });
    const view1 = createFakeView('shared.md', vc1);
    const view2 = createFakeView('shared.md', vc2);

    await injectDomMirror(plugin, view1, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view2, makeConfig('above-title'), {});

    const viewId1 = getViewId(view1.containerEl);
    removeDomMirror(viewId1, 'shared.md', 'above-title');

    expect(vc1.querySelector('.mirror-dom-injection')).toBeNull();
    expect(vc2.querySelector('.mirror-dom-injection')).not.toBeNull();
  });

  it('removeAllDomMirrors only cleans target view', async () => {
    const plugin = createFakePlugin();
    const vc1 = createViewContent({ title: true, properties: true });
    const vc2 = createViewContent({ title: true });
    const view1 = createFakeView('shared.md', vc1);
    const view2 = createFakeView('shared.md', vc2);

    await injectDomMirror(plugin, view1, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view1, makeConfig('below-properties'), {});
    await injectDomMirror(plugin, view2, makeConfig('above-title'), {});

    const viewId1 = getViewId(view1.containerEl);
    removeAllDomMirrors(viewId1, 'shared.md');

    expect(vc1.querySelectorAll('.mirror-dom-injection').length).toBe(0);
    expect(vc2.querySelector('.mirror-dom-injection')).not.toBeNull();
  });

  it('removeOtherDomMirrors scoped to single view', async () => {
    const plugin = createFakePlugin();
    const vc1 = createViewContent({ title: true, properties: true });
    const vc2 = createViewContent({ title: true });
    const view1 = createFakeView('shared.md', vc1);
    const view2 = createFakeView('shared.md', vc2);

    await injectDomMirror(plugin, view1, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view1, makeConfig('below-properties'), {});
    await injectDomMirror(plugin, view2, makeConfig('above-title'), {});

    const viewId1 = getViewId(view1.containerEl);
    removeOtherDomMirrors(viewId1, 'shared.md', 'above-title');

    // view1: only above-title kept
    const remaining1 = vc1.querySelectorAll('.mirror-dom-injection');
    expect(remaining1.length).toBe(1);
    expect(remaining1[0].getAttribute('data-position')).toBe('above-title');
    // view2: untouched
    expect(vc2.querySelector('.mirror-dom-injection')).not.toBeNull();
  });

  it('containers have unique data-mirror-key per view', async () => {
    const plugin = createFakePlugin();
    const vc1 = createViewContent({ title: true });
    const vc2 = createViewContent({ title: true });
    const view1 = createFakeView('shared.md', vc1);
    const view2 = createFakeView('shared.md', vc2);

    await injectDomMirror(plugin, view1, makeConfig('above-title'), {});
    await injectDomMirror(plugin, view2, makeConfig('above-title'), {});

    const key1 = vc1.querySelector('.mirror-dom-injection')!.getAttribute('data-mirror-key');
    const key2 = vc2.querySelector('.mirror-dom-injection')!.getAttribute('data-mirror-key');

    expect(key1).not.toBe(key2);
    expect(key1).toContain('shared.md');
    expect(key2).toContain('shared.md');
  });
});

// =============================================================================
// MutationObserver — auto re-injection when Obsidian destroys container
// =============================================================================

describe('setupContainerObserver', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
    resetViewIdCounter();
  });

  it('calls onRemoved when container is removed from parent', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const container = document.createElement('div');
    parent.appendChild(container);

    const onRemoved = vi.fn();
    setupContainerObserver('test-key-1', container, onRemoved);

    // Simulate Obsidian removing the container
    parent.removeChild(container);

    // MutationObserver fires asynchronously
    await new Promise(r => setTimeout(r, 0));

    expect(onRemoved).toHaveBeenCalledTimes(1);
    document.body.removeChild(parent);
  });

  it('does NOT call onRemoved when unrelated child is added', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const container = document.createElement('div');
    parent.appendChild(container);

    const onRemoved = vi.fn();
    setupContainerObserver('test-key-2', container, onRemoved);

    // Add unrelated child — container still connected
    const other = document.createElement('span');
    parent.appendChild(other);

    await new Promise(r => setTimeout(r, 0));

    expect(onRemoved).not.toHaveBeenCalled();
    document.body.removeChild(parent);
  });

  it('disconnects observer after triggering (no duplicate callbacks)', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const container = document.createElement('div');
    parent.appendChild(container);

    const onRemoved = vi.fn();
    setupContainerObserver('test-key-3', container, onRemoved);

    // Remove container
    parent.removeChild(container);
    await new Promise(r => setTimeout(r, 0));

    // Re-add and remove again — observer should be disconnected
    parent.appendChild(container);
    parent.removeChild(container);
    await new Promise(r => setTimeout(r, 0));

    expect(onRemoved).toHaveBeenCalledTimes(1);
    document.body.removeChild(parent);
  });

  it('replaces existing observer for same key', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    parent.appendChild(container1);
    parent.appendChild(container2);

    const onRemoved1 = vi.fn();
    const onRemoved2 = vi.fn();
    setupContainerObserver('test-key-4', container1, onRemoved1);
    setupContainerObserver('test-key-4', container2, onRemoved2);

    // Remove container1 — old observer should be disconnected
    parent.removeChild(container1);
    await new Promise(r => setTimeout(r, 0));
    expect(onRemoved1).not.toHaveBeenCalled();

    // Remove container2 — new observer should fire
    parent.removeChild(container2);
    await new Promise(r => setTimeout(r, 0));
    expect(onRemoved2).toHaveBeenCalledTimes(1);

    document.body.removeChild(parent);
  });

  it('does nothing when container has no parent', () => {
    const container = document.createElement('div');
    const onRemoved = vi.fn();
    // Should not throw
    setupContainerObserver('test-key-5', container, onRemoved);
  });
});

describe('disconnectObserver / disconnectObserversByPrefix', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
    resetViewIdCounter();
  });

  it('disconnectObserver prevents future callbacks', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const container = document.createElement('div');
    parent.appendChild(container);

    const onRemoved = vi.fn();
    setupContainerObserver('test-disc-1', container, onRemoved);
    disconnectObserver('test-disc-1');

    parent.removeChild(container);
    await new Promise(r => setTimeout(r, 0));

    expect(onRemoved).not.toHaveBeenCalled();
    document.body.removeChild(parent);
  });

  it('disconnectObserversByPrefix disconnects matching observers', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const c1 = document.createElement('div');
    const c2 = document.createElement('div');
    parent.appendChild(c1);
    parent.appendChild(c2);

    const cb1 = vi.fn();
    const cb2 = vi.fn();
    setupContainerObserver('dom-v0-file.md-top', c1, cb1);
    setupContainerObserver('dom-v0-file.md-bottom', c2, cb2);

    disconnectObserversByPrefix('dom-v0-');

    parent.removeChild(c1);
    parent.removeChild(c2);
    await new Promise(r => setTimeout(r, 0));

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
    document.body.removeChild(parent);
  });
});

describe('injectDomMirror with onContainerRemoved', () => {
  beforeEach(() => {
    cleanupAllDomMirrors();
    resetViewIdCounter();
    vi.mocked(renderMirrorTemplate).mockClear();
  });

  it('sets up observer when callback is provided', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ readingView: true });
    const view = createFakeView('obs-test.md', vc);
    document.body.appendChild(view.containerEl);

    const onRemoved = vi.fn();
    await injectDomMirror(plugin, view, makeConfig('top'), {}, onRemoved);

    const container = vc.querySelector('.mirror-dom-injection')!;
    expect(container).not.toBeNull();

    // Remove container from sizer (simulates Obsidian rebuild)
    container.parentElement!.removeChild(container);
    await new Promise(r => setTimeout(r, 0));

    expect(onRemoved).toHaveBeenCalledTimes(1);
    document.body.removeChild(view.containerEl);
  });

  it('does NOT set up observer when callback is omitted', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ title: true });
    const view = createFakeView('obs-test-2.md', vc);
    document.body.appendChild(view.containerEl);

    await injectDomMirror(plugin, view, makeConfig('above-title'), {});

    const container = vc.querySelector('.mirror-dom-injection')!;
    expect(container).not.toBeNull();

    // Remove — no callback to fire, should not throw
    container.parentElement!.removeChild(container);
    await new Promise(r => setTimeout(r, 0));

    document.body.removeChild(view.containerEl);
  });

  it('cleanup functions disconnect observers set via injectDomMirror', async () => {
    const plugin = createFakePlugin();
    const vc = createViewContent({ readingView: true });
    const view = createFakeView('obs-test-3.md', vc);
    document.body.appendChild(view.containerEl);

    const onRemoved = vi.fn();
    await injectDomMirror(plugin, view, makeConfig('top'), {}, onRemoved);

    const viewId = getViewId(view.containerEl);

    // Cleanup via removeAllDomMirrors — disconnects observer before removing container
    removeAllDomMirrors(viewId, 'obs-test-3.md');

    await new Promise(r => setTimeout(r, 0));
    expect(onRemoved).not.toHaveBeenCalled();

    document.body.removeChild(view.containerEl);
  });
});
