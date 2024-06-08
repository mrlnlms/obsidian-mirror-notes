import { App, MarkdownView, Plugin, Notice, TFile, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';

import { mirrorSeetingsTab } from './settings';
import { MIRROR_UI_VIEW_TYPE, MirrorUIView } from './view';

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
    async onActiveFileLeafChange(leaf:any){
        console.log("onActiveFileLeafChange")
        const activeFile = leaf?.view?.file;
        if(activeFile){
            console.log("1 :) "+leaf?.view)
            return this.addToolbar.bind(this);
        } else {
            console.log("2 :) "+activeFile)
            //this.addToolbar.bind(this);
        }
        
        //await this.handleLeafChange(leaf);
        console.log("onActiveFileLeafChange -- FIMMM")
    }
    async onload() {
        console.log('[Mirror Notes] v10 loaded — v1 final');

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.onActiveFileLeafChange.bind(this))
        );
       
        this.registerEvent(
            
            //this.app.workspace.on('active-leaf-change', await this.handleLeafChange.bind(this))
            this.app.workspace.on('active-leaf-change', this.addToolbar.bind(this))
        );
       
        
        await this.loadSettings();

        this.registerView(MIRROR_UI_VIEW_TYPE, (leaf) => new MirrorUIView(leaf));

        new Notice("Opening " + this.settings.myPluginName + "!");

        this.addRibbonIcon("eye", this.settings.myPluginName, () => { new Notice("Triggering " + this.settings.myPluginName + ".") });
        this.addRibbonIcon("file", this.settings.myPluginName, () => {
            this.openView();
        });

        this.addCommand({
            id: "decorate",
            name: "Decorate Titles",
            editorCallback: (editor) => {
                const value = editor
                    .getValue()
                    .replace(/^\#(.*)$/gm, (match) => match + " 😀");

                editor.setValue(value);
                new Notice(value);
            },
        });

        this.addCommand({
            id: "Peek",
            name: "Peek into the dark",
            checkCallback: (checking) => {
                const isPastDark = new Date().getHours() >= 23;

                if (isPastDark) {
                    if (!checking) {
                        new Notice("Booo!");
                    }
                    return true;
                }
                return false;
            },
        });

        this.addSettingTab(new mirrorSeetingsTab(this.app, this));
    }
    async mylayout(leaf: WorkspaceLeaf){
        console.log("layout-change");
    }
    async onunload() {
        new Notice("Closing Mirror Preview Plugin!")
    }

    openView() {
        this.app.workspace.detachLeavesOfType(MIRROR_UI_VIEW_TYPE);
        const leaf = this.app.workspace.getRightLeaf(false);

        if (leaf) leaf.setViewState({
            type: MIRROR_UI_VIEW_TYPE,
        })
    }

    async handleLeafChange(leaf: WorkspaceLeaf) {
        //await this.removeToolbar(leaf);
        // Valida se o leaf é um MarkdownView antes de chamar addToolbar
        if (leaf.view instanceof MarkdownView) {
            console.log("AAAAA")   
            await this.removeToolbar(leaf);
            this.addToolbar(leaf);
        } else{
            
            //this.addToolbar(leaf);
            console.log("BBBBBB")
        }
        //this.addToolbar(leaf);
        
    }

    async addToolbar(leaf: WorkspaceLeaf) {
       if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;
        
        const view = leaf.view as MarkdownView;
        console.log("KD: "+ view)
        const file = view.file;
        if (!file) return;
    
        // Remove qualquer toolbar existente
        await this.removeToolbar(leaf);
    
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.type === "project") {
            const toolbar = document.createElement("div");
            toolbar.className = "project-toolbar";
    
            // Verifica se já existe uma toolbar com a classe específica
            if (view.containerEl.querySelector(".project-toolbar")) return;
    
            const mode = view.getMode();
            let temps = "templates/ui-live_preview_mode.md";
    
            if (mode === "preview") {
                temps = "templates/ui-live_preview-mode.md";
            } else if (mode === "source") {
                temps = "templates/ui-preview-mode.md";
            }
    
            let corpodocs = view.containerEl.querySelector(".metadata-container");
            if (corpodocs) {
                const mdFilePath = temps;
                const fileContents = await this.app.vault.adapter.read(mdFilePath);
                const mdContainer = document.createElement("div");
                toolbar.append(mdContainer);
    
                MarkdownRenderer.render(
                    this.app,
                    fileContents,
                    mdContainer,
                    file.path,
                    this
                );
    
                corpodocs.append(toolbar);
            }
        }
    }
    

    async removeToolbar(leaf: WorkspaceLeaf) {
        if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;

        const view = leaf.view as MarkdownView;
        const existingToolbar = view.containerEl.querySelector(".project-toolbar");
        if (existingToolbar) existingToolbar.remove();
    }
}
