import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Decoration } from '@codemirror/view';
import { MirrorState, ApplicableMirrorConfig } from '../src/editor/mirrorTypes';

// =================================================================================
// MOCKS
// =================================================================================

vi.mock('../src/editor/mirrorWidget', () => ({
  MirrorTemplateWidget: {
    domCache: new Map(),
  },
}));
vi.mock('../src/rendering/templateRenderer', () => ({
  renderMirrorTemplate: vi.fn(),
  clearRenderCache: vi.fn(),
  clearAllRenderChildren: vi.fn(),
  clearRenderingPromises: vi.fn(),
}));
vi.mock('../src/editor/decorationBuilder', () => ({
  buildDecorations: vi.fn(),
}));
vi.mock('../src/editor/mirrorConfig', () => ({
  getApplicableConfig: vi.fn(),
  clearConfigCache: vi.fn(),
}));
vi.mock('../src/editor/mirrorDecision', () => ({
  computeMirrorRuntimeDecision: vi.fn(),
}));
vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  detectFrontmatterChange,
  handleConfigChange,
  hasForcedUpdate,
  fileDebounceMap,
  lastForcedUpdateMap,
  cleanupMirrorCaches,
  forceMirrorUpdateEffect,
} from '../src/editor/mirrorState';
import { MirrorTemplateWidget } from '../src/editor/mirrorWidget';
import { clearRenderCache } from '../src/rendering/templateRenderer';
import { buildDecorations } from '../src/editor/decorationBuilder';
import { computeMirrorRuntimeDecision } from '../src/editor/mirrorDecision';
import { StateEffect } from '@codemirror/state';

// =================================================================================
// HELPERS
// =================================================================================

function mockTransaction(changedRanges: Array<{ fromA: number; toA: number }>) {
  return {
    changes: {
      iterChangedRanges(callback: (fromA: number, toA: number) => void) {
        for (const range of changedRanges) {
          callback(range.fromA, range.toA);
        }
      },
    },
  } as any;
}

function makeMirrorState(overrides: Partial<MirrorState> = {}): MirrorState {
  return {
    enabled: true,
    config: {
      templatePath: 'templates/test.md',
      position: 'top',
      hideProps: false,
      showContainer: true,
      viewOverrides: { hideProps: false, readableLineLength: 'inherit', showInlineTitle: 'inherit' },
    },
    frontmatter: { title: 'Test' },
    frontmatterHash: 'hash-123',
    widgetId: 'widget-abc',
    filePath: 'test.md',
    lastDocText: '---\ntitle: Test\n---\nContent',
    ...overrides,
  };
}

function mockTransactionWithState(viewId = 'view-1') {
  return {
    state: {
      facet: () => viewId,
    },
  } as any;
}

// =================================================================================
// detectFrontmatterChange
// =================================================================================

describe('detectFrontmatterChange', () => {
  const docWithFrontmatter = '---\ntitle: Hello\ntags: test\n---\nBody content here';
  const docWithoutFrontmatter = 'No frontmatter here\nJust content';
  const docIncomplete = '---\ntitle: Hello\nNo closing delimiter';

  it('returns true when change is inside frontmatter region', () => {
    // Frontmatter is "---\ntitle: Hello\ntags: test\n---" = 33 chars
    const tr = mockTransaction([{ fromA: 5, toA: 10 }]);
    expect(detectFrontmatterChange(tr, docWithFrontmatter)).toBe(true);
  });

  it('returns true when change is within buffer zone (frontmatterEnd + 50)', () => {
    // frontmatterEndPos = 33, buffer = 33+50 = 83
    const tr = mockTransaction([{ fromA: 80, toA: 82 }]);
    expect(detectFrontmatterChange(tr, docWithFrontmatter)).toBe(true);
  });

  it('returns false when change is past frontmatter+50 buffer', () => {
    // frontmatterEndPos = 33, buffer = 83, change at 100
    const tr = mockTransaction([{ fromA: 100, toA: 110 }]);
    expect(detectFrontmatterChange(tr, docWithFrontmatter)).toBe(false);
  });

  it('returns true when no frontmatter (frontmatterEndPos=0, buffer=50) and change within 50', () => {
    const tr = mockTransaction([{ fromA: 10, toA: 20 }]);
    expect(detectFrontmatterChange(tr, docWithoutFrontmatter)).toBe(true);
  });

  it('returns true if ANY range overlaps frontmatter region', () => {
    const tr = mockTransaction([
      { fromA: 200, toA: 210 }, // outside
      { fromA: 5, toA: 10 },   // inside
    ]);
    expect(detectFrontmatterChange(tr, docWithFrontmatter)).toBe(true);
  });

  it('returns false when no changed ranges', () => {
    const tr = mockTransaction([]);
    expect(detectFrontmatterChange(tr, docWithFrontmatter)).toBe(false);
  });

  it('treats incomplete frontmatter (no closing ---) as frontmatterEndPos=0', () => {
    // No valid frontmatter match, so frontmatterEndPos=0, buffer=50
    // Change at position 60 is past the buffer
    const tr = mockTransaction([{ fromA: 60, toA: 70 }]);
    expect(detectFrontmatterChange(tr, docIncomplete)).toBe(false);
  });
});

// =================================================================================
// handleConfigChange
// =================================================================================

describe('handleConfigChange', () => {
  const fakePlugin = {} as any;
  const fakeFile = { path: 'test.md', name: 'test.md' } as any;
  const docText = '---\ntitle: Test\n---\nContent';
  const frontmatter = { title: 'Test' };
  const fmHash = 'hash-456';

  beforeEach(() => {
    vi.mocked(buildDecorations).mockReturnValue(Decoration.none);
  });

  it('returns null when config is identical', () => {
    const state = makeMirrorState();
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: state.config,
      engine: 'cm6',
      requestedPosition: state.config?.position ?? null,
      resolvedPosition: state.config?.position ?? null,
      fallbackApplied: false,
      reason: 'test',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).toBeNull();
  });

  it('detects enabled change (config becomes null)', () => {
    const state = makeMirrorState();
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: null,
      engine: 'none',
      requestedPosition: null,
      resolvedPosition: null,
      fallbackApplied: false,
      reason: 'no matching mirror',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).not.toBeNull();
    expect(result!.mirrorState.enabled).toBe(false);
  });

  it('detects position change and generates NEW widgetId', () => {
    const state = makeMirrorState();
    const newConfig: ApplicableMirrorConfig = {
      ...state.config!,
      position: 'bottom',
    };
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: newConfig,
      engine: 'cm6',
      requestedPosition: newConfig.position,
      resolvedPosition: newConfig.position,
      fallbackApplied: false,
      reason: 'test',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).not.toBeNull();
    expect(result!.mirrorState.config?.position).toBe('bottom');
    expect(result!.mirrorState.widgetId).not.toBe(state.widgetId);
  });

  it('detects templatePath change', () => {
    const state = makeMirrorState();
    const newConfig: ApplicableMirrorConfig = {
      ...state.config!,
      templatePath: 'templates/other.md',
    };
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: newConfig,
      engine: 'cm6',
      requestedPosition: newConfig.position,
      resolvedPosition: newConfig.position,
      fallbackApplied: false,
      reason: 'test',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).not.toBeNull();
    expect(result!.mirrorState.config?.templatePath).toBe('templates/other.md');
  });

  it('detects hideProps change and preserves widgetId', () => {
    const state = makeMirrorState();
    const newConfig: ApplicableMirrorConfig = {
      ...state.config!,
      hideProps: true,
    };
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: newConfig,
      engine: 'cm6',
      requestedPosition: newConfig.position,
      resolvedPosition: newConfig.position,
      fallbackApplied: false,
      reason: 'test',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).not.toBeNull();
    expect(result!.mirrorState.config?.hideProps).toBe(true);
    // hideProps is not a position change, widgetId preserved
    expect(result!.mirrorState.widgetId).toBe(state.widgetId);
  });

  it('detects viewOverrides change', () => {
    const state = makeMirrorState();
    const newConfig: ApplicableMirrorConfig = {
      ...state.config!,
      viewOverrides: { hideProps: false, readableLineLength: 'on', showInlineTitle: 'inherit' },
    };
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: newConfig,
      engine: 'cm6',
      requestedPosition: newConfig.position,
      resolvedPosition: newConfig.position,
      fallbackApplied: false,
      reason: 'test',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).not.toBeNull();
  });

  it('preserves widgetId when only showContainer changes (non-position field)', () => {
    const state = makeMirrorState();
    const newConfig: ApplicableMirrorConfig = {
      ...state.config!,
      showContainer: false,
    };
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: newConfig,
      engine: 'cm6',
      requestedPosition: newConfig.position,
      resolvedPosition: newConfig.position,
      fallbackApplied: false,
      reason: 'test',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).not.toBeNull();
    expect(result!.mirrorState.widgetId).toBe(state.widgetId);
  });

  it('generates new widgetId specifically when position changes', () => {
    const state = makeMirrorState();
    const newConfig: ApplicableMirrorConfig = {
      ...state.config!,
      position: 'above-title',
    };
    vi.mocked(computeMirrorRuntimeDecision).mockReturnValue({
      config: newConfig,
      engine: 'cm6',
      requestedPosition: newConfig.position,
      resolvedPosition: newConfig.position,
      fallbackApplied: false,
      reason: 'test',
    });
    const tr = mockTransactionWithState();

    const result = handleConfigChange(tr, state, fakePlugin, fakeFile, docText, frontmatter, fmHash);
    expect(result).not.toBeNull();
    expect(result!.mirrorState.widgetId).not.toBe(state.widgetId);
  });
});

// =================================================================================
// hasForcedUpdate
// =================================================================================

describe('hasForcedUpdate', () => {
  it('returns false with empty effects', () => {
    const tr = { effects: [] } as any;
    expect(hasForcedUpdate(tr)).toBe(false);
  });

  it('returns true with matching forceMirrorUpdateEffect', () => {
    const effect = forceMirrorUpdateEffect.of(undefined as any);
    const tr = { effects: [effect] } as any;
    expect(hasForcedUpdate(tr)).toBe(true);
  });

  it('returns false with non-matching effect', () => {
    const otherEffect = StateEffect.define<string>();
    const tr = { effects: [otherEffect.of('test')] } as any;
    expect(hasForcedUpdate(tr)).toBe(false);
  });
});

// =================================================================================
// debounce/throttle maps
// =================================================================================

describe('fileDebounceMap and lastForcedUpdateMap', () => {
  beforeEach(() => {
    fileDebounceMap.clear();
    lastForcedUpdateMap.clear();
  });

  it('start empty after clear', () => {
    expect(fileDebounceMap.size).toBe(0);
    expect(lastForcedUpdateMap.size).toBe(0);
  });

  it('track per-file timestamps in fileDebounceMap', () => {
    fileDebounceMap.set('file-a.md', 1000);
    fileDebounceMap.set('file-b.md', 2000);
    expect(fileDebounceMap.get('file-a.md')).toBe(1000);
    expect(fileDebounceMap.get('file-b.md')).toBe(2000);
    expect(fileDebounceMap.size).toBe(2);
  });

  it('track per-file timestamps in lastForcedUpdateMap', () => {
    lastForcedUpdateMap.set('file-a.md', 5000);
    lastForcedUpdateMap.set('file-b.md', 6000);
    expect(lastForcedUpdateMap.get('file-a.md')).toBe(5000);
    expect(lastForcedUpdateMap.get('file-b.md')).toBe(6000);
  });
});

// =================================================================================
// cleanupMirrorCaches
// =================================================================================

describe('cleanupMirrorCaches', () => {
  it('clears all caches', () => {
    // Populate caches
    MirrorTemplateWidget.domCache.set('key2', {} as any);
    fileDebounceMap.set('file.md', 1000);
    lastForcedUpdateMap.set('file.md', 2000);

    cleanupMirrorCaches();

    expect(MirrorTemplateWidget.domCache.size).toBe(0);
    expect(fileDebounceMap.size).toBe(0);
    expect(lastForcedUpdateMap.size).toBe(0);
    expect(vi.mocked(clearRenderCache)).toHaveBeenCalled();
  });
});
