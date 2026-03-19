import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractRawYaml, hashObject, generateWidgetId, resolveVariable, traceMirrorDecision } from '../src/editor/mirrorUtils';
import { buildContainerClasses } from '../src/editor/mirrorTypes';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));
import { Logger } from '../src/dev/logger';

// =============================================================================
// extractRawYaml
// =============================================================================

describe('extractRawYaml', () => {
  it('extracts raw YAML between delimiters', () => {
    const content = '---\ntitle: My Note\ntype: project\n---\nBody text';
    expect(extractRawYaml(content)).toBe('title: My Note\ntype: project');
  });

  it('returns empty string when no frontmatter', () => {
    const content = 'Just a regular note\nWith some text';
    expect(extractRawYaml(content)).toBe('');
  });

  it('returns empty string without --- delimiters', () => {
    const content = 'title: fake\ntype: not-frontmatter';
    expect(extractRawYaml(content)).toBe('');
  });

  it('returns empty string for empty frontmatter block', () => {
    const content = '---\n\n---\nBody';
    // Regex matches the newline between delimiters
    expect(extractRawYaml(content)).toBe('');
  });

  it('preserves exact content including whitespace and special chars', () => {
    const content = '---\ntags:\n  - alpha\n  - beta\ncompleted: true\n---';
    expect(extractRawYaml(content)).toBe('tags:\n  - alpha\n  - beta\ncompleted: true');
  });

  it('preserves colons in values', () => {
    const content = '---\nurl: https://example.com\n---';
    expect(extractRawYaml(content)).toBe('url: https://example.com');
  });

  it('handles multiline YAML values', () => {
    const content = '---\ndescription: |\n  line one\n  line two\n---\nBody';
    expect(extractRawYaml(content)).toBe('description: |\n  line one\n  line two');
  });
});

// =============================================================================
// hashObject
// =============================================================================

describe('hashObject', () => {
  it('produces same hash for same object (deterministic)', () => {
    const obj = { title: 'Test', type: 'project' };
    expect(hashObject(obj)).toBe(hashObject({ title: 'Test', type: 'project' }));
  });

  it('produces same hash regardless of key order', () => {
    const a = { title: 'Test', type: 'project' };
    const b = { type: 'project', title: 'Test' };
    expect(hashObject(a)).toBe(hashObject(b));
  });

  it('produces consistent hash for empty object', () => {
    expect(hashObject({})).toBe(hashObject({}));
  });

  it('produces different hashes for different objects', () => {
    const a = { title: 'Test' };
    const b = { title: 'Different' };
    expect(hashObject(a)).not.toBe(hashObject(b));
  });

  it('produces different hashes when keys differ', () => {
    const a = { title: 'Test' };
    const b = { name: 'Test' };
    expect(hashObject(a)).not.toBe(hashObject(b));
  });

  it('produces consistent hash for strings', () => {
    expect(hashObject('title: Test')).toBe(hashObject('title: Test'));
  });

  it('produces different hashes for different strings', () => {
    expect(hashObject('title: A')).not.toBe(hashObject('title: B'));
  });

  it('returns deterministic value for null', () => {
    expect(hashObject(null)).toBe('0');
    expect(hashObject(null)).toBe(hashObject(null));
  });

  it('returns deterministic value for undefined', () => {
    expect(hashObject(undefined)).toBe('0');
  });
});

// =============================================================================
// generateWidgetId
// =============================================================================

describe('generateWidgetId', () => {
  it('starts with mirror-widget- prefix', () => {
    expect(generateWidgetId()).toMatch(/^mirror-widget-/);
  });

  it('generates unique ids on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateWidgetId()));
    expect(ids.size).toBe(100);
  });

  it('contains timestamp and random suffix', () => {
    const id = generateWidgetId();
    const parts = id.split('-');
    // mirror-widget-<timestamp>-<random>
    expect(parts.length).toBe(4);
    expect(Number(parts[2])).toBeGreaterThan(0);
    expect(parts[3].length).toBe(9);
  });
});

// =============================================================================
// Integration: hash detection + stale metadataCache scenario
// =============================================================================

describe('hash detection with stale cache', () => {
  it('raw YAML hash detects change even when metadataCache has not updated yet', () => {
    // Simula o cenario: user editou frontmatter no editor, mas metadataCache ainda tem valores antigos
    const docV1 = '---\nstatus: draft\npriority: 3\n---\nBody';
    const docV2 = '---\nstatus: done\npriority: 3\n---\nBody';

    const hashV1 = hashObject(extractRawYaml(docV1));
    const hashV2 = hashObject(extractRawYaml(docV2));

    // Hash da string bruta detecta a mudanca imediatamente
    expect(hashV1).not.toBe(hashV2);

    // metadataCache ainda retorna frontmatter antigo (stale)
    const staleFrontmatter = { status: 'draft', priority: 3 };

    // O hash stale e consistente consigo mesmo (nao causa falso positivo)
    const staleHash = hashObject(extractRawYaml(docV1));
    expect(staleHash).toBe(hashV1);

    // Quando metadataCache atualiza, frontmatter fresco esta disponivel
    const freshFrontmatter = { status: 'done', priority: 3 };

    // Os dois frontmatters sao diferentes (convergencia apos cache update)
    expect(staleFrontmatter.status).not.toBe(freshFrontmatter.status);
  });

  it('identical YAML content produces same hash (no false positive)', () => {
    const doc = '---\ntitle: Test\ntags:\n  - alpha\n---\nBody';

    // Duas chamadas com mesmo conteudo = mesmo hash = nenhum reprocessamento
    expect(hashObject(extractRawYaml(doc))).toBe(hashObject(extractRawYaml(doc)));
  });
});

// =============================================================================
// resolveVariable
// =============================================================================

describe('resolveVariable', () => {
  it('resolves flat key', () => {
    expect(resolveVariable('title', { title: 'My Note' })).toBe('My Note');
  });

  it('resolves flat key with dot (literal property name)', () => {
    expect(resolveVariable('ma.miii', { 'ma.miii': 'flat value' })).toBe('flat value');
  });

  it('resolves nested path when flat key does not exist', () => {
    const vars = { project_info: { dates: { start_date: '2025-01-01' } } };
    expect(resolveVariable('project_info.dates.start_date', vars)).toBe('2025-01-01');
  });

  it('flat key takes priority over nested path', () => {
    const vars = {
      'ma.miii': 'flat wins',
      ma: { miii: 'nested loses' },
    };
    expect(resolveVariable('ma.miii', vars)).toBe('flat wins');
  });

  it('returns undefined when neither flat nor nested exists', () => {
    expect(resolveVariable('nonexistent.path', { title: 'test' })).toBeUndefined();
  });

  it('returns undefined when nested path hits null midway', () => {
    const vars = { a: { b: null } };
    expect(resolveVariable('a.b.c', vars as any)).toBeUndefined();
  });

  it('returns undefined when nested path hits non-object midway', () => {
    const vars = { a: { b: 'string' } };
    expect(resolveVariable('a.b.c', vars as any)).toBeUndefined();
  });

  it('converts falsy values to string (0, false)', () => {
    expect(resolveVariable('count', { count: 0 })).toBe('0');
    expect(resolveVariable('done', { done: false })).toBe('false');
  });

  it('converts nested falsy values to string', () => {
    const vars = { stats: { count: 0, done: false } };
    expect(resolveVariable('stats.count', vars)).toBe('0');
    expect(resolveVariable('stats.done', vars)).toBe('false');
  });

  it('returns undefined for null/undefined values', () => {
    expect(resolveVariable('empty', { empty: null })).toBeUndefined();
    expect(resolveVariable('missing', { missing: undefined })).toBeUndefined();
  });

  it('handles key without dots (same as flat lookup)', () => {
    expect(resolveVariable('title', { title: 'Test' })).toBe('Test');
    expect(resolveVariable('title', {})).toBeUndefined();
  });

  it('handles arrays in nested path', () => {
    const vars = { tags: ['a', 'b', 'c'] };
    expect(resolveVariable('tags', vars)).toBe('a,b,c');
  });

  it('handles deep nesting (3+ levels)', () => {
    const vars = { a: { b: { c: { d: 'deep' } } } };
    expect(resolveVariable('a.b.c.d', vars)).toBe('deep');
  });
});

// =============================================================================
// traceMirrorDecision
// =============================================================================

describe('traceMirrorDecision', () => {
  beforeEach(() => {
    vi.mocked(Logger.log).mockClear();
  });

  it('logs match with mirror name and position', () => {
    traceMirrorDecision({
      file: 'notes/project.md',
      viewId: 'v0',
      event: 'file-open',
      mirror: 'Project Card',
      position: { requested: 'above-title' },
      engine: 'dom',
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[trace] notes/project.md [v0] file-open → mirror="Project Card" pos=above-title engine=dom'
    );
  });

  it('logs no match', () => {
    traceMirrorDecision({
      file: 'notes/empty.md',
      viewId: 'v1',
      event: 'file-open',
      mirror: null,
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[trace] notes/empty.md [v1] file-open → no match'
    );
  });

  it('logs fallback with position change', () => {
    traceMirrorDecision({
      file: 'notes/test.md',
      viewId: 'v0',
      event: 'dom-injection',
      mirror: 'Test Mirror',
      position: { requested: 'above-backlinks', actual: 'bottom' },
      engine: 'cm6',
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[trace] notes/test.md [v0] dom-injection → mirror="Test Mirror" pos=above-backlinks→bottom (fallback) engine=cm6'
    );
  });

  it('logs with reason', () => {
    traceMirrorDecision({
      file: 'notes/test.md',
      event: 'cooldown-skip',
      reason: '45ms ago',
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[trace] notes/test.md cooldown-skip [45ms ago]'
    );
  });

  it('logs without viewId', () => {
    traceMirrorDecision({
      file: 'notes/test.md',
      event: 'render-skip',
      reason: 'content unchanged',
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[trace] notes/test.md render-skip [content unchanged]'
    );
  });

  it('logs forced update with changed fields', () => {
    traceMirrorDecision({
      file: 'notes/test.md',
      viewId: 'v0',
      event: 'forced-update',
      mirror: 'Test',
      reason: 'config changed: position, templatePath',
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[trace] notes/test.md [v0] forced-update → mirror="Test" [config changed: position, templatePath]'
    );
  });
});

// =============================================================================
// buildContainerClasses
// =============================================================================
describe('buildContainerClasses', () => {
  it('includes base class and position class', () => {
    expect(buildContainerClasses('top', false)).toBe('mirror-ui-widget mirror-position-top');
  });

  it('includes styled class when showContainer is true', () => {
    expect(buildContainerClasses('bottom', true)).toBe('mirror-ui-widget mirror-position-bottom mirror-container-styled');
  });
});
