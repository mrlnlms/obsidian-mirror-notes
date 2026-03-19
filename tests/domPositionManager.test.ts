import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { positionOverrideKey, clearSetupCooldowns, setupDomPosition } from '../src/rendering/domPositionManager';
import { getApplicableConfig } from '../src/editor/mirrorConfig';
import { injectDomMirror, removeAllDomMirrors, getViewId } from '../src/rendering/domInjector';
import { getViewMode } from '../src/utils/obsidianInternals';
import { traceMirrorDecision } from '../src/editor/mirrorUtils';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../src/editor/mirrorUtils', () => ({
  traceMirrorDecision: vi.fn(),
}));
vi.mock('../src/editor/mirrorState', () => ({
  forceMirrorUpdateEffect: { of: vi.fn() },
}));
vi.mock('../src/editor/mirrorConfig', () => ({
  getApplicableConfig: vi.fn(),
}));
vi.mock('../src/rendering/domInjector', () => ({
  isDomPosition: vi.fn((pos: string) =>
    ['above-title', 'above-properties', 'below-properties', 'above-backlinks', 'below-backlinks'].includes(pos)
  ),
  injectDomMirror: vi.fn(async () => 'above-title'),
  removeAllDomMirrors: vi.fn(),
  removeOtherDomMirrors: vi.fn(),
  getViewId: vi.fn(() => 'view-1'),
  disconnectObserversByPrefix: vi.fn(),
}));
vi.mock('../src/utils/obsidianInternals', () => ({
  getEditorView: vi.fn(),
  getViewMode: vi.fn(() => 'source'),
}));
vi.mock('../src/rendering/templateRenderer', () => ({
  renderMirrorTemplate: vi.fn(),
}));

function makeView(filePath = 'test.md') {
  return {
    file: { path: filePath, name: filePath.split('/').pop() },
    containerEl: document.createElement('div'),
  } as any;
}

function makePlugin() {
  return {
    app: { metadataCache: { getFileCache: () => ({ frontmatter: {} }) } },
    positionOverrides: new Map(),
    templateDeps: { register: vi.fn(), unregisterByPrefix: vi.fn() },
  } as any;
}

function makeConfig(position = 'above-title') {
  return {
    position,
    templatePath: 'templates/mirror.md',
    hideProps: false,
    showContainer: true,
    viewOverrides: { readableLineLength: null, showInlineTitle: null },
  };
}

describe('positionOverrideKey', () => {
  it('combines viewId:filePath', () => {
    expect(positionOverrideKey('view-1', 'notes/test.md')).toBe('view-1:notes/test.md');
  });

  it('handles empty viewId', () => {
    expect(positionOverrideKey('', 'test.md')).toBe(':test.md');
  });
});

describe('clearSetupCooldowns', () => {
  it('does not throw', () => {
    expect(() => clearSetupCooldowns()).not.toThrow();
  });
});

describe('setupDomPosition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    clearSetupCooldowns();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls removeAllDomMirrors when config is null', async () => {
    vi.mocked(getApplicableConfig).mockReturnValue(null as any);
    vi.mocked(getViewId).mockReturnValue('view-1');

    await setupDomPosition(makePlugin(), makeView());

    expect(removeAllDomMirrors).toHaveBeenCalledWith('view-1', 'test.md');
  });

  it('calls removeAllDomMirrors when position is CM6-only in Live Preview', async () => {
    vi.mocked(getApplicableConfig).mockReturnValue(makeConfig('top') as any);
    vi.mocked(getViewMode).mockReturnValue('source' as any);
    vi.mocked(getViewId).mockReturnValue('view-1');

    await setupDomPosition(makePlugin(), makeView());

    expect(removeAllDomMirrors).toHaveBeenCalledWith('view-1', 'test.md');
  });

  it('injects DOM when position is above-title', async () => {
    vi.mocked(getApplicableConfig).mockReturnValue(makeConfig('above-title') as any);
    vi.mocked(getViewId).mockReturnValue('view-1');
    vi.mocked(injectDomMirror).mockResolvedValue('above-title' as any);

    await setupDomPosition(makePlugin(), makeView());

    expect(injectDomMirror).toHaveBeenCalled();
  });

  it('injects DOM for CM6 position in Reading View', async () => {
    vi.mocked(getApplicableConfig).mockReturnValue(makeConfig('top') as any);
    vi.mocked(getViewMode).mockReturnValue('preview' as any);
    vi.mocked(getViewId).mockReturnValue('view-1');
    vi.mocked(injectDomMirror).mockResolvedValue('top' as any);

    await setupDomPosition(makePlugin(), makeView());

    expect(injectDomMirror).toHaveBeenCalled();
  });

  it('skips when cooldown is active', async () => {
    vi.mocked(getApplicableConfig).mockReturnValue(makeConfig('above-title') as any);
    vi.mocked(getViewId).mockReturnValue('view-1');
    vi.mocked(injectDomMirror).mockResolvedValue('above-title' as any);

    const plugin = makePlugin();
    const view = makeView();

    await setupDomPosition(plugin, view);
    vi.clearAllMocks();

    vi.advanceTimersByTime(50);
    await setupDomPosition(plugin, view);

    expect(getApplicableConfig).not.toHaveBeenCalled();
    expect(traceMirrorDecision).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'cooldown-skip' }),
    );
  });

  it('bypasses cooldown for mutation recovery', async () => {
    vi.mocked(getApplicableConfig).mockReturnValue(makeConfig('above-title') as any);
    vi.mocked(getViewId).mockReturnValue('view-1');
    vi.mocked(injectDomMirror).mockResolvedValue('above-title' as any);

    const plugin = makePlugin();
    const view = makeView();

    await setupDomPosition(plugin, view);
    vi.clearAllMocks();

    vi.mocked(getApplicableConfig).mockReturnValue(makeConfig('above-title') as any);
    vi.mocked(injectDomMirror).mockResolvedValue('above-title' as any);

    vi.advanceTimersByTime(50);
    await setupDomPosition(plugin, view, false, true);

    expect(getApplicableConfig).toHaveBeenCalled();
  });

  it('does nothing when view has no file', async () => {
    const view = { file: null, containerEl: document.createElement('div') } as any;

    await setupDomPosition(makePlugin(), view);

    expect(getApplicableConfig).not.toHaveBeenCalled();
  });
});
