import { vi } from 'vitest';
import { DEFAULT_SETTINGS, CustomMirror, DEFAULT_VIEW_OVERRIDES } from '../../settings';
import MirrorUIPlugin from '../../main';
import { TFile } from 'obsidian';

export function createFakePlugin(overrides?: Partial<any>) {
  return {
    app: {
      vault: {
        getAbstractFileByPath: (path: string) => {
          if (!path) return null;
          const file = new TFile();
          file.path = path;
          file.name = path.split('/').pop() || '';
          return file;
        },
        cachedRead: async () => '# {{title}}\n\nConteudo do template',
        getConfig: (key: string) => {
          const defaults: Record<string, any> = {
            showInlineTitle: true,
            propertiesInDocument: 'visible',
            readableLineLength: true,
          };
          return defaults[key];
        },
      },
      workspace: { getActiveFile: () => ({ path: 'test.md' }) },
      metadataCache: { getFileCache: () => null },
      internalPlugins: {
        plugins: {
          backlink: { enabled: true, instance: { options: { backlinkInDocument: true } } },
        },
      },
    },
    settings: { ...DEFAULT_SETTINGS },
    positionOverrides: new Map(),
    openSettingsToField: vi.fn(),
    ...overrides,
  } as unknown as MirrorUIPlugin;
}

export function createCustomMirror(overrides?: Partial<CustomMirror>): CustomMirror {
  return {
    id: 'test-mirror',
    name: 'Test Mirror',
    openview: true,
    enable_custom_live_preview_mode: true,
    custom_settings_live_preview_note: 'templates/test.md',
    custom_settings_live_preview_pos: 'top',
    enable_custom_preview_mode: false,
    custom_settings_preview_note: '',
    custom_settings_preview_pos: 'top',
    custom_settings_overide: false,
    custom_view_overrides: { ...DEFAULT_VIEW_OVERRIDES },
    custom_show_container_border: true,
    custom_auto_update_paths: true,
    conditions: [],
    conditionLogic: 'any',
    ...overrides,
  };
}
