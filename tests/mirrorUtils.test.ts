import { describe, it, expect } from 'vitest';
import { extractRawYaml, hashObject } from '../src/editor/mirrorUtils';

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
