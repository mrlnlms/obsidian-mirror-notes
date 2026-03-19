import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveEngine, computeMirrorRuntimeDecision } from '../src/editor/mirrorDecision';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

vi.mock('../src/editor/mirrorConfig', () => ({
  getApplicableConfig: vi.fn(),
  clearConfigCache: vi.fn(),
}));

vi.mock('../src/editor/mirrorUtils', () => ({
  hashObject: vi.fn(() => 'hash'),
  traceMirrorDecision: vi.fn(),
}));

import { getApplicableConfig } from '../src/editor/mirrorConfig';

describe('resolveEngine', () => {
  it('DOM positions → dom engine', () => {
    expect(resolveEngine('above-title', 'source')).toBe('dom');
    expect(resolveEngine('above-properties', 'source')).toBe('dom');
    expect(resolveEngine('below-properties', 'source')).toBe('dom');
    expect(resolveEngine('above-backlinks', 'source')).toBe('dom');
    expect(resolveEngine('below-backlinks', 'source')).toBe('dom');
  });

  it('CM6 positions in Live Preview → cm6 engine', () => {
    expect(resolveEngine('top', 'source')).toBe('cm6');
    expect(resolveEngine('bottom', 'source')).toBe('cm6');
  });

  it('CM6 positions in Reading View → dom engine (no CM6 editor in RV)', () => {
    expect(resolveEngine('top', 'preview')).toBe('dom');
    expect(resolveEngine('bottom', 'preview')).toBe('dom');
  });

  it('margin positions → margin engine', () => {
    expect(resolveEngine('left', 'source')).toBe('margin');
    expect(resolveEngine('right', 'source')).toBe('margin');
  });
});

describe('computeMirrorRuntimeDecision', () => {
  const mockPlugin = {
    positionOverrides: new Map(),
    settings: {},
  } as any;

  const mockFile = { path: 'note.md', name: 'note.md' } as any;

  beforeEach(() => {
    mockPlugin.positionOverrides.clear();
    vi.mocked(getApplicableConfig).mockReset();
  });

  it('returns engine:none when no file', () => {
    const result = computeMirrorRuntimeDecision(mockPlugin, null, {}, 'v0', 'source');
    expect(result.engine).toBe('none');
    expect(result.reason).toBe('no file');
  });

  it('returns engine:none when no matching mirror', () => {
    vi.mocked(getApplicableConfig).mockReturnValue(null);
    const result = computeMirrorRuntimeDecision(mockPlugin, mockFile, {}, 'v0', 'source');
    expect(result.engine).toBe('none');
    expect(result.reason).toBe('no matching mirror');
  });

  it('returns correct engine for DOM position', () => {
    vi.mocked(getApplicableConfig).mockReturnValue({
      templatePath: 'templates/t.md', position: 'above-title',
      hideProps: false, showContainer: true, viewOverrides: {} as any,
    });
    const result = computeMirrorRuntimeDecision(mockPlugin, mockFile, {}, 'v0', 'source');
    expect(result.engine).toBe('dom');
    expect(result.requestedPosition).toBe('above-title');
    expect(result.fallbackApplied).toBe(false);
  });

  it('returns cm6 engine for top position in Live Preview', () => {
    vi.mocked(getApplicableConfig).mockReturnValue({
      templatePath: 'templates/t.md', position: 'top',
      hideProps: false, showContainer: true, viewOverrides: {} as any,
    });
    const result = computeMirrorRuntimeDecision(mockPlugin, mockFile, {}, 'v0', 'source');
    expect(result.engine).toBe('cm6');
  });

  it('returns dom engine for top position in Reading View', () => {
    vi.mocked(getApplicableConfig).mockReturnValue({
      templatePath: 'templates/t.md', position: 'top',
      hideProps: false, showContainer: true, viewOverrides: {} as any,
    });
    const result = computeMirrorRuntimeDecision(mockPlugin, mockFile, {}, 'v0', 'preview');
    expect(result.engine).toBe('dom');
  });

  it('applies position override and returns fallback engine', () => {
    vi.mocked(getApplicableConfig).mockReturnValue({
      templatePath: 'templates/t.md', position: 'above-backlinks',
      hideProps: false, showContainer: true, viewOverrides: {} as any,
    });
    mockPlugin.positionOverrides.set('v0:note.md', 'bottom');
    const result = computeMirrorRuntimeDecision(mockPlugin, mockFile, {}, 'v0', 'source');
    expect(result.engine).toBe('cm6');
    expect(result.requestedPosition).toBe('above-backlinks');
    expect(result.resolvedPosition).toBe('bottom');
    expect(result.fallbackApplied).toBe(true);
    expect(result.reason).toContain('fallback');
  });

  it('margin position returns margin engine', () => {
    vi.mocked(getApplicableConfig).mockReturnValue({
      templatePath: 'templates/t.md', position: 'left',
      hideProps: false, showContainer: true, viewOverrides: {} as any,
    });
    const result = computeMirrorRuntimeDecision(mockPlugin, mockFile, {}, 'v0', 'source');
    expect(result.engine).toBe('margin');
  });
});
