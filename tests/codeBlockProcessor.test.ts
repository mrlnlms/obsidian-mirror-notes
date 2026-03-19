import { describe, it, expect, vi } from 'vitest';
import { TFile } from 'obsidian';
import { createFakePlugin } from './mocks/pluginFactory';
import { resolveVariables } from '../src/rendering/codeBlockProcessor';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('resolveVariables', () => {
  it('returns current note frontmatter when no source or inline vars', async () => {
    const plugin = createFakePlugin({
      app: {
        vault: {
          getAbstractFileByPath: (path: string) => {
            const file = new TFile();
            file.path = path;
            file.name = path.split('/').pop() || '';
            return file;
          },
        },
        metadataCache: {
          getFileCache: () => ({ frontmatter: { title: 'Current Note', status: 'draft' } }),
        },
      },
    });

    const result = await resolveVariables(plugin, {}, undefined, 'current.md');
    expect(result).toEqual({ title: 'Current Note', status: 'draft' });
  });

  it('source frontmatter overrides current frontmatter (same keys)', async () => {
    const plugin = createFakePlugin({
      app: {
        vault: {
          getAbstractFileByPath: (path: string) => {
            const file = new TFile();
            file.path = path;
            file.name = path.split('/').pop() || '';
            return file;
          },
        },
        metadataCache: {
          getFileCache: (file: any) => {
            if (file.path === 'source.md') {
              return { frontmatter: { title: 'Source Title', author: 'Source Author' } };
            }
            return { frontmatter: { title: 'Current Title', status: 'draft' } };
          },
        },
      },
    });

    const result = await resolveVariables(plugin, {}, 'source.md', 'current.md');
    expect(result).toEqual({ title: 'Source Title', status: 'draft', author: 'Source Author' });
  });

  it('inline vars override both source and current', async () => {
    const plugin = createFakePlugin({
      app: {
        vault: {
          getAbstractFileByPath: (path: string) => {
            const file = new TFile();
            file.path = path;
            file.name = path.split('/').pop() || '';
            return file;
          },
        },
        metadataCache: {
          getFileCache: (file: any) => {
            if (file.path === 'source.md') {
              return { frontmatter: { title: 'Source Title' } };
            }
            return { frontmatter: { title: 'Current Title' } };
          },
        },
      },
    });

    const result = await resolveVariables(plugin, { title: 'Inline Title' }, 'source.md', 'current.md');
    expect(result).toEqual({ title: 'Inline Title' });
  });

  it('handles missing source file gracefully (getAbstractFileByPath returns null)', async () => {
    const plugin = createFakePlugin({
      app: {
        vault: {
          getAbstractFileByPath: (path: string) => {
            if (path === 'missing.md') return null;
            const file = new TFile();
            file.path = path;
            file.name = path.split('/').pop() || '';
            return file;
          },
        },
        metadataCache: {
          getFileCache: () => ({ frontmatter: { title: 'Current Note' } }),
        },
      },
    });

    const result = await resolveVariables(plugin, {}, 'missing.md', 'current.md');
    expect(result).toEqual({ title: 'Current Note' });
  });

  it('handles missing frontmatter (getFileCache returns null)', async () => {
    const plugin = createFakePlugin({
      app: {
        vault: {
          getAbstractFileByPath: (path: string) => {
            const file = new TFile();
            file.path = path;
            file.name = path.split('/').pop() || '';
            return file;
          },
        },
        metadataCache: {
          getFileCache: () => null,
        },
      },
    });

    const result = await resolveVariables(plugin, { inline: 'value' }, 'source.md', 'current.md');
    expect(result).toEqual({ inline: 'value' });
  });

  it('full precedence chain: inline > source > current (all three with overlapping keys)', async () => {
    const plugin = createFakePlugin({
      app: {
        vault: {
          getAbstractFileByPath: (path: string) => {
            const file = new TFile();
            file.path = path;
            file.name = path.split('/').pop() || '';
            return file;
          },
        },
        metadataCache: {
          getFileCache: (file: any) => {
            if (file.path === 'source.md') {
              return { frontmatter: { shared: 'source', sourceOnly: 'src', bothSrcInline: 'source' } };
            }
            return { frontmatter: { shared: 'current', currentOnly: 'cur', bothSrcInline: 'current' } };
          },
        },
      },
    });

    const result = await resolveVariables(
      plugin,
      { shared: 'inline', bothSrcInline: 'inline', inlineOnly: 'inl' },
      'source.md',
      'current.md'
    );

    expect(result).toEqual({
      shared: 'inline',
      currentOnly: 'cur',
      sourceOnly: 'src',
      bothSrcInline: 'inline',
      inlineOnly: 'inl',
    });
  });
});
