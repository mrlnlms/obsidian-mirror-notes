import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleTemplateChange, clearTemplateChangeTimeout } from '../src/rendering/templateChangeHandler';
import { TIMING } from '../src/editor/timingConfig';

// Mock mirrorState (needed by handleTemplateChange's iterateAllLeaves path)
vi.mock('../src/editor/mirrorState', () => ({
  mirrorStateField: Symbol('mirrorStateField'),
  forceMirrorUpdateEffect: { of: vi.fn() },
}));

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

vi.mock('../src/utils/obsidianInternals', () => ({
  getEditorView: vi.fn(() => null),
}));

function createMockPlugin(templateCallbackMap: Record<string, Array<() => void>>) {
  return {
    templateDeps: {
      getDependentCallbacks: vi.fn((path: string) => templateCallbackMap[path] ?? []),
    },
    knownTemplatePaths: new Set(Object.keys(templateCallbackMap)),
    app: {
      workspace: {
        iterateAllLeaves: vi.fn(),
      },
    },
  } as any;
}

describe('handleTemplateChange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearTemplateChangeTimeout();
  });

  afterEach(() => {
    clearTemplateChangeTimeout();
    vi.useRealTimers();
  });

  it('fires callback after debounce', () => {
    const cb = vi.fn();
    const plugin = createMockPlugin({ 'templates/a.md': [cb] });

    handleTemplateChange(plugin, 'templates/a.md');
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TIMING.METADATA_CHANGE_DEBOUNCE);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('concurrent changes to DIFFERENT templates fire both callbacks', () => {
    const cbA = vi.fn();
    const cbB = vi.fn();
    const plugin = createMockPlugin({
      'templates/a.md': [cbA],
      'templates/b.md': [cbB],
    });

    // Both changes within the debounce window
    handleTemplateChange(plugin, 'templates/a.md');
    handleTemplateChange(plugin, 'templates/b.md');

    // Neither should have fired yet
    expect(cbA).not.toHaveBeenCalled();
    expect(cbB).not.toHaveBeenCalled();

    // Advance past debounce — BOTH should fire
    vi.advanceTimersByTime(TIMING.METADATA_CHANGE_DEBOUNCE);
    expect(cbA).toHaveBeenCalledTimes(1);
    expect(cbB).toHaveBeenCalledTimes(1);
  });

  it('rapid changes to SAME template debounce correctly (only last fires)', () => {
    const cb = vi.fn();
    const plugin = createMockPlugin({ 'templates/a.md': [cb] });

    handleTemplateChange(plugin, 'templates/a.md');
    vi.advanceTimersByTime(200); // partial
    handleTemplateChange(plugin, 'templates/a.md');
    vi.advanceTimersByTime(200); // partial — first timeout was cleared
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TIMING.METADATA_CHANGE_DEBOUNCE);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('clearTemplateChangeTimeout cancels pending timers', () => {
    const cb = vi.fn();
    const plugin = createMockPlugin({ 'templates/a.md': [cb] });

    handleTemplateChange(plugin, 'templates/a.md');
    clearTemplateChangeTimeout();

    vi.advanceTimersByTime(TIMING.METADATA_CHANGE_DEBOUNCE * 2);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does NOT execute callbacks that were unregistered during debounce window', () => {
    const cb = vi.fn();
    const callbackMap: Record<string, Array<() => void>> = { 'templates/a.md': [cb] };
    const plugin = createMockPlugin(callbackMap);

    // Override getDependentCallbacks to return live state of callbackMap
    plugin.templateDeps.getDependentCallbacks = vi.fn((path: string) => callbackMap[path] ?? []);

    handleTemplateChange(plugin, 'templates/a.md');

    // Simulate: block destroyed during debounce window (callback removed from registry)
    callbackMap['templates/a.md'] = [];

    vi.advanceTimersByTime(TIMING.METADATA_CHANGE_DEBOUNCE);

    // Callback should NOT have been called — it was unregistered before timeout fired
    expect(cb).not.toHaveBeenCalled();
  });

  it('rejecting callback does not prevent other callbacks from running', async () => {
    const cbGood = vi.fn();
    const cbBad = vi.fn().mockRejectedValue(new Error('render failed'));
    const plugin = createMockPlugin({ 'templates/a.md': [cbBad, cbGood] });

    handleTemplateChange(plugin, 'templates/a.md');
    vi.advanceTimersByTime(TIMING.METADATA_CHANGE_DEBOUNCE);

    // Let the microtask queue flush so Promise.resolve(cb()).catch() settles
    await vi.advanceTimersByTimeAsync(0);

    expect(cbBad).toHaveBeenCalledTimes(1);
    expect(cbGood).toHaveBeenCalledTimes(1);
  });

  it('skips template with no callbacks and not in knownTemplatePaths', () => {
    const plugin = createMockPlugin({});
    plugin.knownTemplatePaths = new Set(); // empty

    // Should not throw, and iterateAllLeaves should not be called
    handleTemplateChange(plugin, 'templates/unknown.md');
    vi.advanceTimersByTime(TIMING.METADATA_CHANGE_DEBOUNCE);

    expect(plugin.app.workspace.iterateAllLeaves).not.toHaveBeenCalled();
  });
});
