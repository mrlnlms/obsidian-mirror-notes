import { describe, it, expect } from 'vitest';
import { parseFrontmatter, hashObject } from '../src/editor/mirrorUtils';

// =============================================================================
// parseFrontmatter
// =============================================================================

describe('parseFrontmatter', () => {
  it('parses normal key: value pairs', () => {
    const content = '---\ntitle: My Note\ntype: project\n---\nBody text';
    const result = parseFrontmatter(content);
    expect(result).toEqual({ title: 'My Note', type: 'project' });
  });

  it('removes quotes from values', () => {
    const content = '---\ntitle: "Quoted Title"\nauthor: \'Single Quoted\'\n---';
    const result = parseFrontmatter(content);
    expect(result.title).toBe('Quoted Title');
    expect(result.author).toBe('Single Quoted');
  });

  it('returns empty object for empty frontmatter', () => {
    const content = '---\n---\nBody';
    const result = parseFrontmatter(content);
    expect(result).toEqual({});
  });

  it('returns empty object when no frontmatter present', () => {
    const content = 'Just a regular note\nWith some text';
    const result = parseFrontmatter(content);
    expect(result).toEqual({});
  });

  it('returns empty object for content without --- delimiters', () => {
    const content = 'title: fake\ntype: not-frontmatter';
    const result = parseFrontmatter(content);
    expect(result).toEqual({});
  });

  // BUG DOCUMENTADO: listas YAML sempre vao pra result.tags independente da key
  it('puts all list items into result.tags regardless of key (known bug)', () => {
    const content = '---\ncategories:\n- cat1\n- cat2\n---';
    const result = parseFrontmatter(content);
    // Comportamento atual (bug): lista vai pra tags, nao pra categories
    expect(result.tags).toEqual(['cat1', 'cat2']);
    expect(result.categories).toBeUndefined();
    // TODO: comportamento esperado seria result.categories = ['cat1', 'cat2']
  });

  it('returns boolean as string', () => {
    const content = '---\ncompleted: true\narchived: false\n---';
    const result = parseFrontmatter(content);
    expect(result.completed).toBe('true');
    expect(result.archived).toBe('false');
  });

  it('returns number as string', () => {
    const content = '---\npriority: 5\nweight: 0.8\n---';
    const result = parseFrontmatter(content);
    expect(result.priority).toBe('5');
    expect(result.weight).toBe('0.8');
  });

  it('ignores lines without colon', () => {
    const content = '---\ntitle: Valid\njust-a-line\n---';
    const result = parseFrontmatter(content);
    expect(result).toEqual({ title: 'Valid' });
  });

  it('handles key with empty value (no value after colon)', () => {
    const content = '---\ntitle: \ntype: project\n---';
    const result = parseFrontmatter(content);
    // Empty value after colon — key is ignored because value.trim() is empty
    expect(result.title).toBeUndefined();
    expect(result.type).toBe('project');
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
});
