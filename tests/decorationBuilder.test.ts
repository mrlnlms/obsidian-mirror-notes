import { describe, it, expect, vi } from 'vitest';
import { Decoration } from '@codemirror/view';
import { buildDecorations } from '../src/editor/decorationBuilder';
import type { MirrorState, ApplicableMirrorConfig, MirrorPosition } from '../src/editor/mirrorTypes';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../src/rendering/templateRenderer', () => ({
  renderMirrorTemplate: vi.fn(),
}));

// --- helpers ---

interface MockLine { text: string; from: number; to: number }

function mockEditorState(lines: string[]) {
  const lineObjects: MockLine[] = [];
  let offset = 0;
  for (const text of lines) {
    lineObjects.push({ text, from: offset, to: offset + text.length });
    offset += text.length + 1; // +1 for newline
  }
  const totalLength = offset > 0 ? offset - 1 : 0; // remove trailing newline

  return {
    doc: {
      length: totalLength,
      lines: lines.length,
      line(n: number) {
        if (n < 1 || n > lineObjects.length) throw new RangeError(`Line ${n} out of range`);
        return lineObjects[n - 1];
      },
    },
  } as any;
}

function makeConfig(overrides: Partial<ApplicableMirrorConfig> = {}): ApplicableMirrorConfig {
  return {
    templatePath: 'templates/test.md',
    position: 'top',
    hideProps: false,
    showContainer: false,
    viewOverrides: {} as any,
    ...overrides,
  };
}

function makeMirrorState(overrides: Partial<MirrorState> = {}): MirrorState {
  return {
    enabled: true,
    config: makeConfig(),
    frontmatter: {},
    widgetId: 'test-widget',
    filePath: 'note.md',
    frontmatterHash: 'abc123',
    ...overrides,
  };
}

const dummyPlugin = {} as any;

function collectDecorations(result: any) {
  const items: { from: number; to: number }[] = [];
  result.between(0, 1e9, (from: number, to: number) => {
    items.push({ from, to });
  });
  return items;
}

// --- tests ---

describe('buildDecorations', () => {
  it('returns Decoration.none when enabled is false', () => {
    const state = mockEditorState(['hello']);
    const ms = makeMirrorState({ enabled: false });
    const result = buildDecorations(state, ms, dummyPlugin);
    expect(result).toBe(Decoration.none);
  });

  it('returns Decoration.none when config is null', () => {
    const state = mockEditorState(['hello']);
    const ms = makeMirrorState({ config: null });
    const result = buildDecorations(state, ms, dummyPlugin);
    expect(result).toBe(Decoration.none);
  });

  it('places top widget after frontmatter', () => {
    const lines = ['---', 'title: Test', '---', 'Content here'];
    const state = mockEditorState(lines);
    const ms = makeMirrorState({ config: makeConfig({ position: 'top' }) });
    const result = buildDecorations(state, ms, dummyPlugin);
    const items = collectDecorations(result);
    expect(items).toHaveLength(1);
    // frontmatter ends at line 3 "---": from=16, to=19, so endPos = 19+1 = 20
    const expectedPos = state.doc.line(3).to + 1;
    expect(items[0].from).toBe(expectedPos);
  });

  it('handles no frontmatter (top position at 0)', () => {
    const lines = ['No frontmatter here', 'Second line'];
    const state = mockEditorState(lines);
    const ms = makeMirrorState({ config: makeConfig({ position: 'top' }) });
    const result = buildDecorations(state, ms, dummyPlugin);
    const items = collectDecorations(result);
    expect(items).toHaveLength(1);
    // frontmatterEndPos stays 0, Math.min(0, docLength) = 0
    expect(items[0].from).toBe(0);
  });

  it('places bottom widget at docLength', () => {
    const lines = ['---', 'key: val', '---', 'Body text'];
    const state = mockEditorState(lines);
    const ms = makeMirrorState({ config: makeConfig({ position: 'bottom' }) });
    const result = buildDecorations(state, ms, dummyPlugin);
    const items = collectDecorations(result);
    expect(items).toHaveLength(1);
    expect(items[0].from).toBe(state.doc.length);
  });

  it('returns Decoration.none on error (broken config.position getter)', () => {
    const state = mockEditorState(['hello']);
    // config.position is read inside the try block (line 36/48 in source).
    // A getter that throws on the second access triggers the catch path.
    let posAccess = 0;
    const brokenConfig = {
      ...makeConfig({ position: 'top' }),
      get position(): any {
        posAccess++;
        // First access is in Logger.log (line 13), second is the if-chain (line 36)
        if (posAccess >= 2) throw new Error('corrupt position');
        return 'top';
      },
    };
    const ms = makeMirrorState({ config: brokenConfig as any });
    const result = buildDecorations(state, ms, dummyPlugin);
    expect(result).toBe(Decoration.none);
  });

  it('skips non-CM6 positions like above-title', () => {
    const lines = ['Some content'];
    const state = mockEditorState(lines);
    const ms = makeMirrorState({ config: makeConfig({ position: 'above-title' as MirrorPosition }) });
    const result = buildDecorations(state, ms, dummyPlugin);
    const items = collectDecorations(result);
    expect(items).toHaveLength(0);
  });
});
