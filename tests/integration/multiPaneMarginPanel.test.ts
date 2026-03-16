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
