import { describe, it, expect } from 'vitest';
import { parseBlockContent, MirrorBlockConfig } from '../src/rendering/blockParser';

describe('parseBlockContent', () => {
  it('parses template-only block', () => {
    const result = parseBlockContent('template: path/to/template.md');
    expect(result).toEqual({
      templatePath: 'path/to/template.md',
      sourcePath: undefined,
      inlineVars: {},
    });
  });

  it('parses template + source', () => {
    const result = parseBlockContent('template: t.md\nsource: s.md');
    expect(result).toEqual({
      templatePath: 't.md',
      sourcePath: 's.md',
      inlineVars: {},
    });
  });

  it('parses inline variables', () => {
    const result = parseBlockContent('template: t.md\ntitle: My Title\nstatus: active');
    expect(result).toEqual({
      templatePath: 't.md',
      sourcePath: undefined,
      inlineVars: { title: 'My Title', status: 'active' },
    });
  });

  it('handles values with colons (e.g. URLs)', () => {
    const result = parseBlockContent('template: t.md\nurl: https://example.com:8080/path');
    expect(result).toEqual({
      templatePath: 't.md',
      sourcePath: undefined,
      inlineVars: { url: 'https://example.com:8080/path' },
    });
  });

  it('trims whitespace from keys and values', () => {
    const result = parseBlockContent('  template :  t.md  \n  source :  s.md  ');
    expect(result).toEqual({
      templatePath: 't.md',
      sourcePath: 's.md',
      inlineVars: {},
    });
  });

  it('ignores blank lines', () => {
    const result = parseBlockContent('template: t.md\n\n\nsource: s.md\n');
    expect(result).toEqual({
      templatePath: 't.md',
      sourcePath: 's.md',
      inlineVars: {},
    });
  });

  it('returns error for empty content', () => {
    const result = parseBlockContent('');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Empty mirror block');
  });

  it('returns error for whitespace-only content', () => {
    const result = parseBlockContent('   \n  \n  ');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Empty mirror block');
  });

  it('returns error for line without colon', () => {
    const result = parseBlockContent('template t.md');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Invalid syntax');
  });

  it('returns error for missing key', () => {
    const result = parseBlockContent(': value');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Missing key');
  });

  it('returns error when template field is missing', () => {
    const result = parseBlockContent('source: s.md\ntitle: Hello');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Missing required field: template');
  });

  it('handles template with empty value', () => {
    const result = parseBlockContent('template: ');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Missing required field: template');
  });

  it('parses full block with all field types', () => {
    const content = `template: templates/mirror.md
source: notes/project.md
title: My Project
priority: high
count: 5`;
    const result = parseBlockContent(content) as MirrorBlockConfig;
    expect(result.templatePath).toBe('templates/mirror.md');
    expect(result.sourcePath).toBe('notes/project.md');
    expect(result.inlineVars).toEqual({
      title: 'My Project',
      priority: 'high',
      count: '5',
    });
  });
});
