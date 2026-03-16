import MirrorUIPlugin from '../../main';
import { MarkdownView, TFile } from 'obsidian';
import { DEFAULT_SETTINGS } from '../../settings';

type Callback = (...args: any[]) => void;

class EventBus {
  private listeners = new Map<string, Set<Callback>>();

  on(event: string, cb: Callback) {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(cb);
    return () => set?.delete(cb);
  }

  trigger(event: string, ...args: any[]) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) cb(...args);
  }
}

function makeTFile(path: string): TFile {
  const file = new TFile();
  file.path = path;
  file.name = path.split('/').pop() || '';
  return file;
}

export function createMarkdownView(filePath: string): MarkdownView {
  const view = new MarkdownView();
  view.file = makeTFile(filePath);
  view.containerEl = document.createElement('div');
  view.containerEl.className = 'markdown-view';

  const viewContent = document.createElement('div');
  viewContent.className = 'view-content';
  view.containerEl.appendChild(viewContent);

  return view;
}

export function createFakeEditorView(options: {
  plugin: MirrorUIPlugin;
  mirrorState: any;
  scrollDOM?: HTMLElement;
}) {
  const scrollDOM = options.scrollDOM ?? document.createElement('div');
  return {
    scrollDOM,
    state: {
      field: () => ({ mirrorState: options.mirrorState }),
      facet: () => options.plugin,
    },
  };
}

export function createIntegrationHarness(options?: {
  activeFilePath?: string;
  files?: Record<string, string>;
  frontmatter?: Record<string, Record<string, any>>;
}) {
  const workspaceBus = new EventBus();
  const vaultBus = new EventBus();
  const metadataBus = new EventBus();

  const files = new Map<string, string>(Object.entries(options?.files ?? {}));
  const frontmatter = new Map<string, Record<string, any>>(Object.entries(options?.frontmatter ?? {}));
  let activeFilePath = options?.activeFilePath ?? null;

  const plugin = {
    app: {
      vault: {
        getAbstractFileByPath: (path: string) => {
          if (!path) return null;
          return makeTFile(path);
        },
        cachedRead: async (file: TFile) => files.get(file.path) ?? '',
        getConfig: (key: string) => {
          const defaults: Record<string, any> = {
            showInlineTitle: true,
            propertiesInDocument: 'visible',
            readableLineLength: true,
          };
          return defaults[key];
        },
        on: (event: string, cb: Callback) => vaultBus.on(event, cb),
        trigger: (event: string, ...args: any[]) => vaultBus.trigger(event, ...args),
      },
      workspace: {
        getActiveFile: () => activeFilePath ? makeTFile(activeFilePath) : null,
        on: (event: string, cb: Callback) => workspaceBus.on(event, cb),
        trigger: (event: string, ...args: any[]) => workspaceBus.trigger(event, ...args),
        iterateAllLeaves: () => {},
        onLayoutReady: (cb: Callback) => cb(),
      },
      metadataCache: {
        getFileCache: (file: TFile) => ({ frontmatter: frontmatter.get(file.path) ?? null }),
        on: (event: string, cb: Callback) => metadataBus.on(event, cb),
        trigger: (event: string, ...args: any[]) => metadataBus.trigger(event, ...args),
      },
      internalPlugins: {
        plugins: {
          backlink: { enabled: true, instance: { options: { backlinkInDocument: true } } },
        },
      },
    },
    settings: { ...DEFAULT_SETTINGS },
    positionOverrides: new Map(),
    registerEvent: () => {},
    addSettingTab: () => {},
    registerMarkdownCodeBlockProcessor: () => {},
    registerDomEvent: () => {},
    addCommand: () => {},
    registerEditorExtension: () => {},
    openSettingsToField: () => {},
  } as unknown as MirrorUIPlugin;

  return {
    plugin,
    setActiveFile(path: string | null) {
      activeFilePath = path;
    },
    setFileContent(path: string, content: string) {
      files.set(path, content);
    },
    setFrontmatter(path: string, data: Record<string, any>) {
      frontmatter.set(path, data);
    },
    createView: createMarkdownView,
  };
}
