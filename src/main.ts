

import { App, MarkdownView, Plugin, Notice, TFile, WorkspaceLeaf } from 'obsidian';


export default class MyPlugin extends Plugin {

  async onload() {
    console.log('[Mirror Notes] v1 loaded — Skeleton: Notice, stubs');

    // 1) Mensagem de abertura do plugin após seu carregamento.
    new Notice("Opening 👀 Mirror Preview Plugin!")


    // 2) Adicionando um botão no Riboon (Menu lateral esquerdo);
    //this.addRibbonIcon("eye",);
    // xxx
    //this.registerEvent(
      //this.app.workspace.on('active-leaf-change', this.onFileOpen.bind(this))
    //);
  }


  async onunload() {
    this.registerEvent(
      new Notice("Closing Mirror Preview Plugin!")
      //this.app.workspace.on('active-leaf-change', this.onFileOpen.bind(this))
    );
  }

  async onFileOpen(leaf: WorkspaceLeaf) {
    if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;

    const view = leaf.view as MarkdownView;
    const file = view.file;
    if (!file) return;

    const fileCache = this.app.metadataCache.getFileCache(file);
    if (fileCache && fileCache.frontmatter && fileCache.frontmatter.type === 'project') {
      this.insertCustomBlock(view);
    }
  }

  async insertCustomBlock(view: MarkdownView) {
	new Notice('RODOU!');
    const container = view.containerEl.querySelector('.markdown-preview-view') || view.containerEl.querySelector('.markdown-source-view');

    if (container && !container.querySelector('.custom-block')) {
      //const content = await this.app.vault.adapter.read("templates/_ui-management.md");
	  const content = "MARLON BRANDON";
      const customBlock = document.createElement('div');
      customBlock.className = 'custom-block';
      customBlock.innerHTML = content;

      container.appendChild(customBlock);
    }
  }
}

