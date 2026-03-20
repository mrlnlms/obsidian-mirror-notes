// Stubs das classes do Obsidian — evita import errors nos testes

export class TFile {
  path: string;
  name: string;
  constructor(path = '', name = '') {
    this.path = path;
    this.name = name;
  }
}

export class TAbstractFile {
  path = '';
}

export class TFolder extends TAbstractFile {
  name: string;
  constructor(path = '', name = '') {
    super();
    this.path = path;
    this.name = name;
  }
}

export class Component {
  private unloadCallbacks: Array<() => void> = [];
  addChild() {}
  removeChild() {}
  register(cb: () => void) {
    this.unloadCallbacks.push(cb);
  }
  unload() {
    for (const cb of this.unloadCallbacks) cb();
    this.unloadCallbacks = [];
  }
}

export class MarkdownRenderChild extends Component {
  containerEl: HTMLElement;
  constructor(el: HTMLElement) {
    super();
    this.containerEl = el;
  }
}

export class MarkdownView {
  file: TFile | null = null;
  containerEl: HTMLElement = document.createElement('div');
  editor: any = null;
}

export const MarkdownRenderer = {
  renderMarkdown: async (content: string, el: HTMLElement, _sourcePath: string, _component: any) => {
    el.innerHTML = content;
  },
};

export class Plugin {
  app: any;
  manifest: any = { id: 'obsidian-mirror-notes' };
  addSettingTab() {}
  registerEvent() {}
  registerDomEvent() {}
  loadData() { return Promise.resolve({}); }
  saveData() { return Promise.resolve(); }
}

// Polyfill Obsidian's createEl on HTMLElement prototype (jsdom doesn't have it)
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.createEl) {
  (HTMLElement.prototype as any).createEl = function (
    tag: string,
    options?: { text?: string; cls?: string; attr?: Record<string, string> }
  ) {
    const el = document.createElement(tag);
    if (options?.text) el.textContent = options.text;
    if (options?.cls) el.className = options.cls;
    if (options?.attr) {
      for (const [k, v] of Object.entries(options.attr)) {
        el.setAttribute(k, v);
      }
    }
    this.appendChild(el);
    return el;
  };
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

export class PluginSettingTab {}
export class Setting {}
export class Notice {}
export class WorkspaceLeaf {}

export class App {
  vault: any = {};
  workspace: any = {};
  metadataCache: any = {};
}

export class AbstractInputSuggest<T> {
  protected app: App;
  protected inputEl: HTMLInputElement;
  limit: number = 100;
  constructor(app: App, inputEl: HTMLInputElement) {
    this.app = app;
    this.inputEl = inputEl;
  }
  setValue(_value: string) {}
  close() {}
  getSuggestions(_query: string): T[] | Promise<T[]> { return []; }
  renderSuggestion(_item: T, _el: HTMLElement): void {}
  selectSuggestion(_item: T, _evt: MouseEvent | KeyboardEvent): void {}
}

export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  _timeout: number,
  _resetTimer?: boolean
): (...args: T) => void {
  return fn;
}
