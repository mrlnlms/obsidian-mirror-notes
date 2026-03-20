import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mirrorMarginPanelPlugin } from '../../src/editor/marginPanelExtension';
import { createFakeEditorView, createIntegrationHarness } from '../mocks/integrationHarness';

const { renderMirrorTemplateMock } = vi.hoisted(() => ({
  renderMirrorTemplateMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/rendering/templateRenderer', () => ({
  renderMirrorTemplate: renderMirrorTemplateMock,
}));

describe('margin panel integration', () => {
  beforeEach(() => {
    renderMirrorTemplateMock.mockClear();
  });

  it('isolates cache keys when two panes use the same template path', async () => {
    const harness = createIntegrationHarness({
      activeFilePath: 'notes/B.md',
      frontmatter: {
        'notes/A.md': { title: 'Pane A' },
        'notes/B.md': { title: 'Pane B' },
      },
    });

    const sharedConfig = {
      position: 'left',
      templatePath: 'templates/shared.md',
      showContainer: true,
    };

    const paneA = createFakeEditorView({
      plugin: harness.plugin,
      mirrorState: {
        enabled: true,
        frontmatter: { title: 'Pane A' },
        filePath: 'notes/A.md',
        config: sharedConfig,
      },
    });

    const paneB = createFakeEditorView({
      plugin: harness.plugin,
      mirrorState: {
        enabled: true,
        frontmatter: { title: 'Pane B' },
        filePath: 'notes/B.md',
        config: sharedConfig,
      },
    });

    mirrorMarginPanelPlugin.create(paneA as any);
    mirrorMarginPanelPlugin.create(paneB as any);
    await Promise.resolve();

    expect(renderMirrorTemplateMock).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = renderMirrorTemplateMock.mock.calls;
    expect(firstCall[0].cacheKey).not.toBe(secondCall[0].cacheKey);
    expect(firstCall[0].sourcePath).toBe('notes/A.md');
    expect(secondCall[0].sourcePath).toBe('notes/B.md');
  });

  it('uses the owning view file instead of the global active file in multi-pane scenarios', async () => {
    const harness = createIntegrationHarness({
      activeFilePath: 'notes/B.md',
      frontmatter: {
        'notes/A.md': { title: 'Pane A' },
        'notes/B.md': { title: 'Pane B' },
      },
    });

    const mirrorState = {
      enabled: true,
      frontmatter: { title: 'Pane A' },
      filePath: 'notes/A.md',
      config: {
        position: 'left',
        templatePath: 'templates/test.md',
        showContainer: true,
      },
    };

    const editorView = createFakeEditorView({
      plugin: harness.plugin,
      mirrorState,
    });

    mirrorMarginPanelPlugin.create(editorView as any);
    await Promise.resolve();

    expect(renderMirrorTemplateMock).toHaveBeenCalledTimes(1);
    expect(renderMirrorTemplateMock.mock.calls[0][0].sourcePath).toBe('notes/A.md');
    expect(renderMirrorTemplateMock.mock.calls[0][0].cacheKey).toContain('notes/A.md');
  });

  it('does not change an existing pane context when the global active file changes later', async () => {
    const harness = createIntegrationHarness({
      activeFilePath: 'notes/A.md',
      frontmatter: {
        'notes/A.md': { title: 'Pane A' },
        'notes/B.md': { title: 'Pane B' },
      },
    });

    const editorView = createFakeEditorView({
      plugin: harness.plugin,
      mirrorState: {
        enabled: true,
        frontmatter: { title: 'Pane A' },
        filePath: 'notes/A.md',
        config: {
          position: 'left',
          templatePath: 'templates/test.md',
          showContainer: true,
        },
      },
    });

    const instance = mirrorMarginPanelPlugin.create(editorView as any);
    await Promise.resolve();

    harness.setActiveFile('notes/B.md');
    instance.update({
      view: editorView,
      geometryChanged: true,
    } as any);
    await Promise.resolve();

    expect(renderMirrorTemplateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourcePath: 'notes/A.md',
        cacheKey: expect.stringContaining('notes/A.md'),
      })
    );
  });

  it('stale render does not overwrite panel when cacheKey changes mid-render', async () => {
    // Simulate: render A starts (slow), cacheKey changes, render B starts (fast),
    // render B finishes, render A finishes — panel should show B's content, not A's.
    let resolveSlowRender: () => void;
    const slowRenderPromise = new Promise<void>(r => { resolveSlowRender = r; });

    let callCount = 0;
    renderMirrorTemplateMock.mockImplementation(async (ctx: { container: HTMLElement; cacheKey: string }) => {
      callCount++;
      if (callCount === 1) {
        // First render (old cacheKey) — slow, waits for manual resolve
        await slowRenderPromise;
        ctx.container.innerHTML = '<div>STALE-A</div>';
      } else {
        // Second render (new cacheKey) — fast, resolves immediately
        ctx.container.innerHTML = '<div>FRESH-B</div>';
      }
    });

    const scrollDOM = document.createElement('div');
    const harness = createIntegrationHarness({
      activeFilePath: 'notes/A.md',
      frontmatter: { 'notes/A.md': { title: 'Note A' } },
    });

    const editorView = createFakeEditorView({
      plugin: harness.plugin,
      mirrorState: {
        enabled: true,
        frontmatter: { title: 'Note A' },
        filePath: 'notes/A.md',
        widgetId: 'w1',
        config: {
          position: 'left',
          templatePath: 'templates/test.md',
          showContainer: false,
        },
      },
      scrollDOM,
    });

    // Create panel — starts slow render A with widgetId w1
    const instance = mirrorMarginPanelPlugin.create(editorView as any);
    // Let microtasks run but render A is still awaiting
    await Promise.resolve();

    // Now simulate widgetId change (frontmatter edit) — triggers fast render B
    const updatedView = createFakeEditorView({
      plugin: harness.plugin,
      mirrorState: {
        enabled: true,
        frontmatter: { title: 'Note A updated' },
        filePath: 'notes/A.md',
        widgetId: 'w2',
        config: {
          position: 'left',
          templatePath: 'templates/test.md',
          showContainer: false,
        },
      },
      scrollDOM,
    });

    instance.update({
      view: updatedView,
      geometryChanged: false,
    } as any);

    // Let render B complete
    await Promise.resolve();
    await Promise.resolve();

    // Now let stale render A complete
    resolveSlowRender!();
    await Promise.resolve();
    await Promise.resolve();

    // Panel should have FRESH-B content, not STALE-A
    const panel = scrollDOM.querySelector('.mirror-margin-panel');
    expect(panel).not.toBeNull();
    expect(panel!.innerHTML).toContain('FRESH-B');
    expect(panel!.innerHTML).not.toContain('STALE-A');

    instance.destroy();
  });

  it('can mount the margin panel with a reusable multi-pane harness', async () => {
    const harness = createIntegrationHarness({
      activeFilePath: 'notes/A.md',
      frontmatter: {
        'notes/A.md': { title: 'Pane A' },
      },
    });

    const scrollDOM = document.createElement('div');
    const editorView = createFakeEditorView({
      plugin: harness.plugin,
      mirrorState: {
        enabled: true,
        frontmatter: { title: 'Pane A' },
        filePath: 'notes/A.md',
        config: {
          position: 'right',
          templatePath: 'templates/test.md',
          showContainer: true,
        },
      },
      scrollDOM,
    });

    const instance = mirrorMarginPanelPlugin.create(editorView as any);
    await Promise.resolve();

    expect(scrollDOM.querySelector('.mirror-margin-panel')).not.toBeNull();
    expect(renderMirrorTemplateMock).toHaveBeenCalled();

    instance.destroy();
    expect(scrollDOM.querySelector('.mirror-margin-panel')).toBeNull();
  });
});
