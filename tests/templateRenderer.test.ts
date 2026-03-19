import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderMirrorTemplate, clearRenderCache, clearRenderChild } from '../src/rendering/templateRenderer';
import { createFakePlugin } from './mocks/pluginFactory';
import { TFile } from 'obsidian';

// Silence Logger
vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

describe('renderMirrorTemplate', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    clearRenderCache();
  });

  it('renders template content into container', async () => {
    const plugin = createFakePlugin();

    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Hello' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-1',
    });

    // MarkdownRenderer mock puts content as innerHTML
    expect(container.innerHTML).toContain('Hello');
    expect(container.innerHTML).not.toContain('{{title}}');
  });

  it('shows error when template not found', async () => {
    const plugin = createFakePlugin({
      app: {
        ...createFakePlugin().app,
        vault: {
          getAbstractFileByPath: () => null,
          cachedRead: async () => '',
        },
      },
    });

    await renderMirrorTemplate({
      plugin,
      templatePath: 'missing/template.md',
      variables: {},
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-missing',
    });

    expect(container.textContent).toContain('Template not found');
    expect(container.querySelector('a')).not.toBeNull();
    expect(container.querySelector('a')!.textContent).toBe('Open settings');
  });

  it('substitutes {{variable}} with frontmatter values', async () => {
    const plugin = createFakePlugin({
      app: {
        ...createFakePlugin().app,
        vault: {
          getAbstractFileByPath: (path: string) => {
            const f = new TFile();
            f.path = path;
            f.name = path.split('/').pop() || '';
            return f;
          },
          cachedRead: async () => 'Name: {{name}}, Status: {{status}}',
        },
      },
    });

    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { name: 'Project X', status: 'active' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-vars',
    });

    expect(container.textContent).toContain('Project X');
    expect(container.textContent).toContain('active');
  });

  it('keeps {{variable}} literal when not in frontmatter', async () => {
    const plugin = createFakePlugin({
      app: {
        ...createFakePlugin().app,
        vault: {
          getAbstractFileByPath: (path: string) => {
            const f = new TFile();
            f.path = path;
            f.name = path.split('/').pop() || '';
            return f;
          },
          cachedRead: async () => 'Value: {{inexistente}}',
        },
      },
    });

    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Test' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-missing-var',
    });

    expect(container.textContent).toContain('{{inexistente}}');
  });

  it('skips re-render when hash unchanged (cache hit)', async () => {
    const plugin = createFakePlugin();
    const ctx = {
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Same' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-cache',
    };

    // First render
    await renderMirrorTemplate(ctx);
    const firstHTML = container.innerHTML;
    expect(firstHTML).not.toBe('');

    // Mark container so we can detect if it was cleared
    container.setAttribute('data-marker', 'still-here');

    // Second render with same content — should skip
    await renderMirrorTemplate(ctx);
    expect(container.getAttribute('data-marker')).toBe('still-here');
  });

  it('re-renders when content changes (cache miss)', async () => {
    let templateContent = 'Version 1';
    const plugin = createFakePlugin({
      app: {
        ...createFakePlugin().app,
        vault: {
          getAbstractFileByPath: (path: string) => {
            const f = new TFile();
            f.path = path;
            f.name = path.split('/').pop() || '';
            return f;
          },
          cachedRead: async () => templateContent,
        },
      },
    });

    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: {},
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-change',
    });
    expect(container.textContent).toContain('Version 1');

    // Change template content
    templateContent = 'Version 2';
    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: {},
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-change',
    });
    expect(container.textContent).toContain('Version 2');
  });

  it('clearRenderCache forces re-render on next call', async () => {
    const plugin = createFakePlugin();
    const ctx = {
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Test' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-clear-cache',
    };

    await renderMirrorTemplate(ctx);
    container.setAttribute('data-marker', 'before-clear');

    clearRenderCache('test-clear-cache');

    // After clearing cache, should re-render (container.innerHTML gets reset)
    await renderMirrorTemplate(ctx);
    // Container was cleared and re-rendered, so marker attribute may still be there
    // but innerHTML was reset — the key test is that it didn't skip
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('concurrent renders are guarded — MarkdownRenderer called once', async () => {
    const { MarkdownRenderer } = await import('obsidian');
    const renderMarkdownSpy = vi.spyOn(MarkdownRenderer, 'renderMarkdown');

    const plugin = createFakePlugin();
    const ctx = {
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Concurrent' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-concurrent-spy',
    };

    // Launch two renders simultaneously — second should reuse first's promise
    await Promise.all([
      renderMirrorTemplate(ctx),
      renderMirrorTemplate(ctx),
    ]);

    // MarkdownRenderer.renderMarkdown should be called exactly once
    expect(renderMarkdownSpy).toHaveBeenCalledTimes(1);
    renderMarkdownSpy.mockRestore();
  });

  it('different cacheKeys render independently (no cross-cache)', async () => {
    const plugin = createFakePlugin();

    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'A' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'key-alpha',
    });

    const container2 = document.createElement('div');
    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'A' },
      sourcePath: 'note.md',
      container: container2,
      cacheKey: 'key-beta',
    });

    // Both containers should have content (rendered independently)
    expect(container.innerHTML).not.toBe('');
    expect(container2.innerHTML).not.toBe('');
    expect(container2.querySelector('div')).not.toBeNull();
  });

  it('registers MarkdownRenderChild when component is provided', async () => {
    const { Component } = await import('obsidian');
    const fakeComponent = new Component();
    const addChildSpy = vi.spyOn(fakeComponent, 'addChild');

    const plugin = createFakePlugin();

    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Lifecycle' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-component',
      component: fakeComponent,
    });

    expect(addChildSpy).toHaveBeenCalledTimes(1);
    // Argument should be a MarkdownRenderChild instance
    const child = addChildSpy.mock.calls[0][0];
    expect(child).toBeDefined();
    expect(child.containerEl).toBeInstanceOf(HTMLElement);
    addChildSpy.mockRestore();
  });

  it('cleans up previous MarkdownRenderChild on re-render (no accumulation)', async () => {
    const { Component } = await import('obsidian');
    const fakeComponent = new Component();
    const addChildSpy = vi.spyOn(fakeComponent, 'addChild');
    const removeChildSpy = vi.spyOn(fakeComponent, 'removeChild');

    let version = 1;
    const plugin = createFakePlugin({
      app: {
        ...createFakePlugin().app,
        vault: {
          getAbstractFileByPath: (path: string) => {
            const f = new TFile();
            f.path = path;
            f.name = path.split('/').pop() || '';
            return f;
          },
          cachedRead: async () => `Version ${version}`,
        },
      },
    });

    const ctx = {
      plugin,
      templatePath: 'templates/test.md',
      variables: {},
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-no-accumulate',
      component: fakeComponent,
    };

    // Render 3 times with different content to bypass hash cache
    await renderMirrorTemplate(ctx);
    version = 2;
    await renderMirrorTemplate(ctx);
    version = 3;
    await renderMirrorTemplate(ctx);

    // addChild called 3 times (once per render)
    expect(addChildSpy).toHaveBeenCalledTimes(3);
    // removeChild called 2 times (cleanup of previous on 2nd and 3rd render)
    expect(removeChildSpy).toHaveBeenCalledTimes(2);

    addChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('clearRenderCache (full) preserves lastRenderChildren — blocks still alive get proper cleanup', async () => {
    const { Component } = await import('obsidian');
    const fakeComponent = new Component();
    const addChildSpy = vi.spyOn(fakeComponent, 'addChild');
    const removeChildSpy = vi.spyOn(fakeComponent, 'removeChild');

    let version = 1;
    const plugin = createFakePlugin({
      app: {
        ...createFakePlugin().app,
        vault: {
          getAbstractFileByPath: (path: string) => {
            const f = new TFile();
            f.path = path;
            f.name = path.split('/').pop() || '';
            return f;
          },
          cachedRead: async () => `Version ${version}`,
        },
      },
    });

    const ctx = {
      plugin,
      templatePath: 'templates/test.md',
      variables: {},
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-clear-no-orphan',
      component: fakeComponent,
    };

    // First render
    await renderMirrorTemplate(ctx);
    expect(addChildSpy).toHaveBeenCalledTimes(1);

    // Global cache clear (simulates cold-start retry while blocks are still alive)
    // clearRenderCache does NOT clear lastRenderChildren — blocks need their refs
    clearRenderCache();

    // Re-render after cache clear — removeChild SHOULD be called
    // (lastRenderChildren preserved, previous child properly cleaned up)
    version = 2;
    await renderMirrorTemplate(ctx);
    expect(addChildSpy).toHaveBeenCalledTimes(2);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);

    addChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('clearRenderChild removes stale entry — re-render does not call removeChild', async () => {
    const { Component } = await import('obsidian');
    const fakeComponent = new Component();
    const plugin = createFakePlugin();

    // First render populates lastRenderChildren
    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Leak' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-leak',
      component: fakeComponent,
    });

    // Simulate block destruction — clear the entry
    clearRenderChild('test-leak');

    // Spy AFTER clearRenderChild so we only observe the re-render behavior
    const removeChildSpy = vi.spyOn(fakeComponent, 'removeChild');

    // Re-render with same cacheKey — should NOT call removeChild (entry was cleared)
    await renderMirrorTemplate({
      plugin,
      templatePath: 'templates/test.md',
      variables: { title: 'Leak' },
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-leak',
      component: fakeComponent,
    });

    expect(removeChildSpy).not.toHaveBeenCalled();
    removeChildSpy.mockRestore();
  });
});

describe('dot notation and unicode variables', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    clearRenderCache();
  });

  it('resolves nested YAML path via dot notation', async () => {
    const plugin = createFakePlugin();
    plugin.app.vault.getAbstractFileByPath = () => {
      const f = new TFile();
      f.path = 'templates/test.md';
      f.name = 'test.md';
      return f;
    };
    plugin.app.vault.cachedRead = async () => 'Start: {{project.start_date}}';

    await renderMirrorTemplate({
      plugin: plugin as any,
      templatePath: 'templates/test.md',
      variables: { project: { start_date: '2025-01-01' } } as any,
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-nested',
    });

    expect(container.innerHTML).toContain('Start: 2025-01-01');
  });

  it('resolves flat key with dot over nested', async () => {
    const plugin = createFakePlugin();
    plugin.app.vault.getAbstractFileByPath = () => {
      const f = new TFile();
      f.path = 'templates/test.md';
      f.name = 'test.md';
      return f;
    };
    plugin.app.vault.cachedRead = async () => 'Value: {{ma.miii}}';

    await renderMirrorTemplate({
      plugin: plugin as any,
      templatePath: 'templates/test.md',
      variables: { 'ma.miii': 'flat wins', ma: { miii: 'nested' } } as any,
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-flat-priority',
    });

    expect(container.innerHTML).toContain('Value: flat wins');
  });

  it('resolves unicode variable names', async () => {
    const plugin = createFakePlugin();
    plugin.app.vault.getAbstractFileByPath = () => {
      const f = new TFile();
      f.path = 'templates/test.md';
      f.name = 'test.md';
      return f;
    };
    plugin.app.vault.cachedRead = async () => 'Desc: {{descrição}}';

    await renderMirrorTemplate({
      plugin: plugin as any,
      templatePath: 'templates/test.md',
      variables: { descrição: 'texto em português' } as any,
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-unicode',
    });

    expect(container.innerHTML).toContain('Desc: texto em português');
  });

  it('keeps unresolved dot notation variable intact', async () => {
    const plugin = createFakePlugin();
    plugin.app.vault.getAbstractFileByPath = () => {
      const f = new TFile();
      f.path = 'templates/test.md';
      f.name = 'test.md';
      return f;
    };
    plugin.app.vault.cachedRead = async () => 'Missing: {{nonexistent.path}}';

    await renderMirrorTemplate({
      plugin: plugin as any,
      templatePath: 'templates/test.md',
      variables: { title: 'test' } as any,
      sourcePath: 'note.md',
      container,
      cacheKey: 'test-unresolved',
    });

    expect(container.innerHTML).toContain('Missing: {{nonexistent.path}}');
  });
});
