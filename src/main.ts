
import { App, MarkdownView, Plugin, Notice, TFile, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';
import { mirrorSeetingsTab } from './settings';
import { MIRROR_UI_VIEW_TYPE, MirrorUIView } from './view';

interface MirrorUIPluginSettings {
    myPluginName : string;
}

const DEFALT_SETTINGS: Partial<MirrorUIPluginSettings> = {
    myPluginName : "👀 Mirror Preview Plugin",
}

export default class MirrorUIPlugin extends Plugin {
    settings: MirrorUIPluginSettings;

    // Útil para quando você vai trabalhar com dados padrão e dados do usuários salvos nas configurações
    async loadSettings(){
        
        // isso tudo gera um novo objeto e evita de sobrescrever os valores padrão
        // ele pega um objeto zerado, substitui ele pelo default seetings, e se tiver algum dado
        // no json, ele carrega e subistitui.

        this.settings = Object.assign(
            {}, 
            DEFALT_SETTINGS, 
            await this.loadData()
        );
    }

    async saveSettings (){
        this.saveData(this.settings);
    }

    async onload() {
        console.log('[Mirror Notes] v8 loaded — Mode detection');

        await this.loadSettings();
        this.addSettingTab(new mirrorSeetingsTab(this.app,this));

        // 1) Mensagem de abertura do plugin após seu carregamento.
        new Notice("Opening "+this.settings.myPluginName+"!");

        /*
        // Registra os observadores para os eventos de abertura de arquivo e mudança de layout
        this.registerEvent(
            this.app.workspace.on("file-open", this.addToolbar.bind(this))
        );
        this.registerEvent(
            this.app.workspace.on("layout-change", this.addToolbar.bind(this))
        );
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.addToolbar.bind(this))
          );
        */
          this.registerEvent(
            this.app.workspace.on("file-open", this.eventTests.bind(this))
        );
        this.registerEvent(
            this.app.workspace.on("layout-change", this.eventTests.bind(this))
        );
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.eventTests.bind(this))
          );
    }
    async eventTests(leaf: WorkspaceLeaf){
        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeLeaf) return;
        const view = leaf.view as MarkdownView;
        const file = view.file;
        if (!file) return;
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.type === "project") {
            
            
            
        
            // Remove a barra de ferramentas existente, se houver
            //this.removeToolbar();
            const toolbar = activeDocument.createElement("div");
            toolbar.className = "project-toolbar";


            const mode = view.getMode();
            new Notice(mode);
            
            let mdFilePath = "templates/ui-live_preview_mode.md";
            /*
            if (mode === "preview") {
                new Notice(mode);
                mdFilePath = "templates/ui-live_preview_mode.md";
            } else if (mode === "source") {
                new Notice(mode);
                mdFilePath = "templates/ui-preivew-mode.md";
            }
                */

            let corpodocs = document.querySelector(".metadata-container"); //metadata-container, //.cm-contentContainer
            
            if(corpodocs){
                new Notice(mdFilePath);
                const fileContents = await this.app.vault.adapter.read(mdFilePath);

                
                const mdContainer = activeDocument.createElement("div");
                mdContainer.className = "project-toolbar";
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

        } else {
            // Remove a barra de ferramentas se o arquivo não for do tipo projeto
            //this.removeToolbar()
        }

    }
    async addToolbar(leaf: WorkspaceLeaf) {
        if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;
        //const activeLeaf = this.app.workspace.activeLeaf;
        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeLeaf) return;
        
        const view = leaf.view as MarkdownView;
        const file = view.file;
        
        if (!file) return;
        
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.type === "project") {
            
            // Cria um novo elemento HTML para a barra de ferramentas
            const toolbar = activeDocument.createElement("div");
            toolbar.className = "project-toolbar";
        
            // Remove a barra de ferramentas existente, se houver
            this.removeToolbar();
            let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);

            let corpodocs = document.querySelector(".metadata-container"); //metadata-container, //.cm-contentContainer
            if(corpodocs){
                new Notice("AHA");
                //corpodocs.prepend(toolbar);
                
                //const mdFilePath = "templates/_ui-management.md";
                const mdFilePath = "templates/_ui-management.md";
                const fileContents = await this.app.vault.adapter.read(mdFilePath);
                //const content = await this.app.vault.adapter.read(mdFilePath);
                //dv.el("div", content);
                //const mdContainer = document.createEl("div", fileContents);
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
        } else {
            // Remove a barra de ferramentas se o arquivo não for do tipo projeto
            this.removeToolbar()
        }
    }

    removeToolbar() {
        // Remove a barra de ferramentas, se existir
        const existingToolbar = document.querySelector(".project-toolbar");
        //if (existingToolbar) existingToolbar.remove();
        if (existingToolbar){
            new Notice("ACHOU!!!!!");
            existingToolbar.remove();
        }
    }
    
    async onunload() {
        new Notice("Closing Mirror Preview Plugin!")
        //this.registerEvent(
        //this.app.workspace.on('active-leaf-change', this.onFileOpen.bind(this))
        //);
    }

}