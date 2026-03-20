import { describe, it, expect, vi } from 'vitest';
import { TFile, TFolder, TAbstractFile } from 'obsidian';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), init: vi.fn(), setEnabled: vi.fn(), destroy: vi.fn() },
}));

// We test filtering logic directly since AbstractInputSuggest
// cannot be instantiated in jsdom (requires Obsidian runtime).

function makeTFile(path: string): TFile {
  const f = new TFile();
  f.path = path;
  f.name = path.split('/').pop() || '';
  Object.defineProperty(f, 'extension', { get: () => path.split('.').pop() || '' });
  return f;
}

function makeTFolder(path: string): TFolder {
  const f = new TFolder();
  f.path = path;
  f.name = path.split('/').pop() || '';
  return f;
}

// ============================================================
// FileSuggest filtering
// ============================================================

function filterFiles(files: TAbstractFile[], query: string): TFile[] {
  const lower = query.toLowerCase();
  return files.filter(
    (f): f is TFile => f instanceof TFile && f.extension === 'md' && f.path.toLowerCase().includes(lower)
  );
}

describe('FileSuggest filtering', () => {
  const files: TAbstractFile[] = [
    makeTFile('templates/dashboard.md'),
    makeTFile('templates/sidebar.md'),
    makeTFile('notes/daily.md'),
    makeTFile('assets/image.png'),
    makeTFolder('templates'),
    makeTFolder('notes'),
  ];

  it('filters .md files by path query', () => {
    const result = filterFiles(files, 'template');
    expect(result).toHaveLength(2);
    expect(result.map(f => f.path)).toEqual(['templates/dashboard.md', 'templates/sidebar.md']);
  });

  it('is case-insensitive', () => {
    const result = filterFiles(files, 'DAILY');
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('notes/daily.md');
  });

  it('excludes non-md files', () => {
    const result = filterFiles(files, 'image');
    expect(result).toHaveLength(0);
  });

  it('excludes folders', () => {
    const result = filterFiles(files, 'templates');
    expect(result.every(f => f instanceof TFile)).toBe(true);
  });

  it('returns all md files for empty query', () => {
    const result = filterFiles(files, '');
    expect(result).toHaveLength(3);
  });
});

// ============================================================
// FolderSuggest filtering
// ============================================================

function filterFolders(files: TAbstractFile[], query: string): TFolder[] {
  const lower = query.toLowerCase();
  return files.filter(
    (f): f is TFolder => f instanceof TFolder && f.path.toLowerCase().includes(lower)
  );
}

describe('FolderSuggest filtering', () => {
  const items: TAbstractFile[] = [
    makeTFolder('projects'),
    makeTFolder('projects/active'),
    makeTFolder('archive'),
    makeTFile('notes/daily.md'),
  ];

  it('filters folders by path query', () => {
    const result = filterFolders(items, 'project');
    expect(result).toHaveLength(2);
  });

  it('excludes files', () => {
    const result = filterFolders(items, 'daily');
    expect(result).toHaveLength(0);
  });

  it('returns all folders for empty query', () => {
    const result = filterFolders(items, '');
    expect(result).toHaveLength(3);
  });
});

// ============================================================
// YamlPropertySuggest filtering
// ============================================================

function filterProperties(allKeys: string[], query: string): string[] {
  const lower = query.toLowerCase();
  return allKeys.filter(key => key.toLowerCase().includes(lower));
}

describe('YamlPropertySuggest filtering', () => {
  const keys = ['title', 'tags', 'type', 'status', 'created', 'category'];

  it('filters by partial match', () => {
    expect(filterProperties(keys, 'ta')).toEqual(['tags', 'status']);
  });

  it('is case-insensitive', () => {
    expect(filterProperties(keys, 'TYPE')).toEqual(['type']);
  });

  it('returns all for empty query', () => {
    expect(filterProperties(keys, '')).toHaveLength(6);
  });
});
