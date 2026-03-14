import { App, MarkdownView, Plugin, Notice, TFile, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';

import { mirrorSeetingsTab } from 'settings';

  

interface MirrorUIPluginSettings {

myPluginName: string;

}

  

const DEFALT_SETTINGS: Partial<MirrorUIPluginSettings> = {

myPluginName: "👀 Mirror Preview Plugin",

}

  

export default class MirrorUIPlugin extends Plugin {

settings: MirrorUIPluginSettings;

  

async loadSettings() {

this.settings = Object.assign(

{},

DEFALT_SETTINGS,

await this.loadData()

);

}

  

async saveSettings() {

this.saveData(this.settings);

}

  

async onload() {

this.registerEvent(this.app.workspace.on('active-leaf-change', this.eventActiveLeafChange.bind(this)));

this.registerEvent(this.app.workspace.on('editor-change', this.eventEditorChange.bind(this)));

this.registerEvent(this.app.workspace.on('editor-drop', this.eventEditorDrop.bind(this)));

this.registerEvent(this.app.workspace.on('editor-menu', this.eventEditorMenu.bind(this)));

this.registerEvent(this.app.workspace.on('editor-paste', this.eventEditorPaste.bind(this)));

this.registerEvent(this.app.workspace.on('file-menu', this.eventFileMenu.bind(this)));

this.registerEvent(this.app.workspace.on('files-menu', this.eventFilesMenu.bind(this)));

this.registerEvent(this.app.workspace.on('file-open', this.eventFileOpen.bind(this)));

this.registerEvent(this.app.workspace.on('layout-change', this.eventLayoutChange.bind(this)));

this.registerEvent(this.app.workspace.on('resize', this.eventResize.bind(this)));

this.registerEvent(this.app.workspace.on('quick-preview', this.eventQuickPreview.bind(this)));

this.registerEvent(this.app.workspace.on('url-menu', this.eventUrlMenu.bind(this)));

this.registerEvent(this.app.workspace.on('window-close', this.eventWindowClose.bind(this)));

this.registerEvent(this.app.workspace.on('window-open', this.eventWindowOpen.bind(this)));

this.registerEvent(this.app.workspace.on('quit', this.eventQuit.bind(this)));

this.addRibbonIcon("eye", "Controle", () => {

console.log(" --------- ")

console.log(" ")

});

}

  

controle(txt: string) {

new Notice(txt);

console.log(txt);

}

  

async eventActiveLeafChange(leaf: any) {

this.controle("1) Active Leaf Change");

}

  

async eventEditorChange(leaf: any) {

this.controle("2) Editor Change");

}

  

async eventEditorDrop(leaf: any) {

this.controle("3) Editor Drop");

}

  

async eventEditorMenu(leaf: any) {

this.controle("4) Editor Menu");

}

  

async eventEditorPaste(leaf: any) {

this.controle("5) Editor Paste");

}

  

async eventFileMenu(leaf: any) {

this.controle("6) File Menu");

}

  

async eventFilesMenu(leaf: any) {

this.controle("7) FileS Menu");

}

  

async eventFileOpen(file: TFile) {

const activeLeaf = this.app.workspace.activeLeaf;

this.controle(`8) File Open - Active Leaf: ${activeLeaf ? activeLeaf.toString() : 'No active leaf'}`);

// Chame a função que adiciona o elemento na folha ativa

const mode = activeLeaf ? this.getViewMode(activeLeaf) : 'default';

if (activeLeaf) {

this.addElementToActiveLeaf(file, mode);

}

}

  

async eventLayoutChange(leaf: any) {

this.controle("9) Layout Change ");

const activeLeaf = this.app.workspace.activeLeaf;

if (activeLeaf) {

const view = activeLeaf.view as MarkdownView;

const file = view?.file;

const mode = this.getViewMode(activeLeaf);

if (file) {

this.addElementToActiveLeaf(file, mode);

}

}

}

  

async eventQuickPreview(leaf: any) {

this.controle("10) Quick Preview");

}

  

async eventResize(leaf: any) {

this.controle("11) Resize");

}

  

async eventUrlMenu(leaf: any) {

this.controle("12) URL Menu");

}

  

async eventWindowClose(leaf: any) {

this.controle("13) Window Close");

}

  

async eventWindowOpen(leaf: any) {

this.controle("14) Window Open");

}

  

async eventQuit(leaf: any) {

this.controle("15) Quit");

}

  

// Função que retorna o modo de visualização da folha ativa

getViewMode(leaf: WorkspaceLeaf): string {

const view = leaf.view as MarkdownView;

if (view) {

return view.getMode();

}

return "default";

}

  

// Função que adiciona o elemento na folha ativa

async addElementToActiveLeaf(file: TFile, mode: string) {

const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;

  

if (frontmatter?.type === "project") {

const activeLeaf = this.app.workspace.activeLeaf;

if (!activeLeaf) return;

  

const view = activeLeaf.view as MarkdownView;

if (!view) return;

  

let corpodocs = view.containerEl.querySelector(".metadata-container");

  

// Remove o elemento 'project-toolbar' existente, se houver

const existingToolbar = corpodocs?.querySelector(".project-toolbar");

if (existingToolbar) {

existingToolbar.remove();

}

  

// Determina o arquivo a ser carregado baseado no modo

let templatePath = "templates/ui-live_preview_mode.md"; // Caminho padrão

if (mode === "preview") {

templatePath = "templates/ui-live_preview-mode.md";

} else if (mode === "source") {

templatePath = "templates/ui-preview-mode.md";

}

  

// Adiciona o novo elemento 'project-toolbar'

const toolbar = document.createElement("div");

toolbar.className = "project-toolbar";

  

const fileContents = await this.app.vault.adapter.read(templatePath);

const mdContainer = document.createElement("div");

toolbar.append(mdContainer);

  

await MarkdownRenderer.renderMarkdown(

fileContents,

mdContainer,

file.path,

this

);

  

corpodocs?.append(toolbar);

}

}

}