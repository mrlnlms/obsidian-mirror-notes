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

export class Component {
  addChild() {}
  removeChild() {}
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

export class PluginSettingTab {}
export class Setting {}
export class Notice {}
export class WorkspaceLeaf {}

export class App {
  vault: any = {};
  workspace: any = {};
  metadataCache: any = {};
}
