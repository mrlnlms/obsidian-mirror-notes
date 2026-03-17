import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerModeSwitchDetector } from '../src/utils/modeSwitchDetector';
import { MarkdownView } from 'obsidian';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

const getViewModeMock = vi.fn();
const getViewIdMock = vi.fn();
const applyViewOverridesMock = vi.fn();
const setupDomPositionMock = vi.fn();

vi.mock('../src/utils/obsidianInternals', () => ({
  getViewMode: (...args: any[]) => getViewModeMock(...args),
}));

vi.mock('../src/rendering/domInjector', () => ({
  getViewId: (...args: any[]) => getViewIdMock(...args),
}));

vi.mock('../src/editor/viewOverrides', () => ({
  applyViewOverrides: (...args: any[]) => applyViewOverridesMock(...args),
}));

vi.mock('../src/rendering/domPositionManager', () => ({
  setupDomPosition: (...args: any[]) => setupDomPositionMock(...args),
}));

function makeView(filePath: string) {
  const view = new MarkdownView();
  view.file = { path: filePath, name: filePath.split('/').pop() || '' } as any;
  view.containerEl = document.createElement('div');
  return view;
}

describe('modeSwitchDetector', () => {
  let plugin: any;
  let layoutChangeCallback: (() => void) | null;
  let activeView: MarkdownView | null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    layoutChangeCallback = null;
    activeView = null;

    plugin = {
      app: {
        workspace: {
          on: vi.fn((event: string, cb: () => void) => {
            if (event === 'layout-change') layoutChangeCallback = cb;
            return {};
          }),
          getActiveViewOfType: vi.fn(() => activeView),
        },
      },
      registerEvent: vi.fn(),
      lastViewMode: new Map<string, string>(),
      setupEditor: vi.fn(),
    };

    registerModeSwitchDetector(plugin);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('LP→RV triggers setupDomPosition + applyViewOverrides but NOT setupEditor', () => {
    const view = makeView('test.md');
    activeView = view;
    getViewModeMock.mockReturnValue('preview');
    getViewIdMock.mockReturnValue('v1');
    plugin.lastViewMode.set('v1:test.md', 'source');

    layoutChangeCallback!();
    vi.advanceTimersByTime(50);

    expect(setupDomPositionMock).toHaveBeenCalledTimes(1);
    expect(setupDomPositionMock).toHaveBeenCalledWith(plugin, view);
    expect(applyViewOverridesMock).toHaveBeenCalledTimes(1);
    expect(applyViewOverridesMock).toHaveBeenCalledWith(plugin, view);
    expect(plugin.setupEditor).not.toHaveBeenCalled();
  });

  it('RV→LP triggers setupEditor + setupDomPosition + applyViewOverrides', () => {
    const view = makeView('test.md');
    activeView = view;
    getViewModeMock.mockReturnValue('source');
    getViewIdMock.mockReturnValue('v1');
    plugin.lastViewMode.set('v1:test.md', 'preview');

    layoutChangeCallback!();
    vi.advanceTimersByTime(50);

    expect(plugin.setupEditor).toHaveBeenCalledTimes(1);
    expect(plugin.setupEditor).toHaveBeenCalledWith(view);
    expect(setupDomPositionMock).toHaveBeenCalledTimes(1);
    expect(applyViewOverridesMock).toHaveBeenCalledTimes(1);
  });

  it('same mode triggers nothing', () => {
    const view = makeView('test.md');
    activeView = view;
    getViewModeMock.mockReturnValue('source');
    getViewIdMock.mockReturnValue('v1');
    plugin.lastViewMode.set('v1:test.md', 'source');

    layoutChangeCallback!();
    vi.advanceTimersByTime(50);

    expect(plugin.setupEditor).not.toHaveBeenCalled();
    expect(setupDomPositionMock).not.toHaveBeenCalled();
    expect(applyViewOverridesMock).not.toHaveBeenCalled();
  });

  it('no active view triggers nothing', () => {
    activeView = null;

    layoutChangeCallback!();
    vi.advanceTimersByTime(50);

    expect(getViewModeMock).not.toHaveBeenCalled();
    expect(setupDomPositionMock).not.toHaveBeenCalled();
  });

  it('debounce: 3 rapid layout-change events produce only 1 handler execution', () => {
    const view = makeView('test.md');
    activeView = view;
    getViewModeMock.mockReturnValue('preview');
    getViewIdMock.mockReturnValue('v1');
    plugin.lastViewMode.set('v1:test.md', 'source');

    // 3 rapid triggers with 10ms gaps
    layoutChangeCallback!();
    vi.advanceTimersByTime(10);
    layoutChangeCallback!();
    vi.advanceTimersByTime(10);
    layoutChangeCallback!();

    // Nothing fired yet (debounce pending)
    expect(setupDomPositionMock).not.toHaveBeenCalled();

    // Advance 50ms after last trigger
    vi.advanceTimersByTime(50);

    expect(setupDomPositionMock).toHaveBeenCalledTimes(1);
    expect(applyViewOverridesMock).toHaveBeenCalledTimes(1);
  });

  it('per-view isolation: different views track modes independently', () => {
    // First trigger: view-1, LP→RV
    const view1 = makeView('file1.md');
    activeView = view1;
    getViewModeMock.mockReturnValue('preview');
    getViewIdMock.mockReturnValue('v1');
    plugin.lastViewMode.set('v1:file1.md', 'source');

    layoutChangeCallback!();
    vi.advanceTimersByTime(50);
    expect(setupDomPositionMock).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();

    // Second trigger: view-2, RV→LP
    const view2 = makeView('file2.md');
    activeView = view2;
    getViewModeMock.mockReturnValue('source');
    getViewIdMock.mockReturnValue('v2');
    plugin.lastViewMode.set('v2:file2.md', 'preview');

    layoutChangeCallback!();
    vi.advanceTimersByTime(50);
    expect(setupDomPositionMock).toHaveBeenCalledTimes(1);

    // Both views tracked independently
    expect(plugin.lastViewMode.get('v1:file1.md')).toBe('preview');
    expect(plugin.lastViewMode.get('v2:file2.md')).toBe('source');
  });
});
