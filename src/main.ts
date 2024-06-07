

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

    //app: App;
    
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
        console.log('[Mirror Notes] v9 loaded — Full routing + debug');

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
        

        await this.loadSettings();

        this.registerView(MIRROR_UI_VIEW_TYPE, (leaf)=> new MirrorUIView(leaf));

        // 1) Mensagem de abertura do plugin após seu carregamento.
        new Notice("Opening "+this.settings.myPluginName+"!")

        // 2) Adicionando um botão no Riboon (Menu lateral esquerdo);
        this.addRibbonIcon("eye",this.settings.myPluginName,() => {new Notice("Triggering "+this.settings.myPluginName+".")});
        this.addRibbonIcon("file",this.settings.myPluginName,() => {
            this.openView();
        });

        // 3) Adiciona um comando com uma condicional, só exibe se for mais de 23hrs.
        this.addCommand(
            {
                id: "decorate",
                name: "Decorate Titles",
                editorCallback: (editor) => {
                    const value = editor
                        .getValue()
                        .replace(/^\#(.*)$/gm,(match) => match + " 😀");

                    editor.setValue(value);
                    new Notice(value);
                },
            }
        );


        // 3.1) Adiciona um comando com função callback do editor, e não 
        this.addCommand(
            {
                id: "Peek",
                name: "Peek into the dark",
                checkCallback: (checking) => {
                    const isPastDark = new Date().getHours() >= 23;

                if(isPastDark){
                    if(!checking){
                        new Notice("Booo!");
                    }
                    return true;
                }
                    return false;
                },
        });

        this.addSettingTab(new mirrorSeetingsTab(this.app,this));
  }


    async onunload() {
        new Notice("Closing Mirror Preview Plugin!")
        //this.registerEvent(
        //this.app.workspace.on('active-leaf-change', this.onFileOpen.bind(this))
        //);
    }

    openView(){
        this.app.workspace.detachLeavesOfType(MIRROR_UI_VIEW_TYPE);
        const leaf = this.app.workspace.getRightLeaf(false);
        //const leaf = this.app.workspace.getActiveFile();

        if(leaf) leaf.setViewState({
            type: MIRROR_UI_VIEW_TYPE,
        })
    }

    async teste(leaf: any) {
        new Notice("LALALALLALALALALALALALL")
        console.log(typeof(leaf));
        //this.removeToolbar();

    }
    async addToolbar(leaf: WorkspaceLeaf) {
        await this.removeToolbar()
        new Notice("Starting Add Toolbar")
        //if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;
        //const activeLeaf = this.app.workspace.activeLeaf;
        //const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        //if (!activeLeaf) return;
        
        //const view = leaf.view as MarkdownView;
        //const view = activeLeaf as MarkdownView;
        
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;
        console.log("Minha view: "+ view.file?.name);
        const file = view.file;
        if (!file) return;
        console.log("O ARQuivo: "+ file.name);
        
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        
        if (frontmatter?.type === "project") {
            //view.containerEl.querySelector('.markdown-source-view')
            
            // Cria um novo elemento HTML para a barra de ferramentas
            const toolbar = activeDocument.createElement("div");
            //let embedBlock = toolbar.createEl("h1",{text: "MARLON"});
            //toolbar.innerHTML =  await this.app.vault.adapter.read("templates/ui-live_preview-mode.md");//"Barra de Ferramentas";
            //toolbar.className = "project-toolbar, cm-contentContainer";
            toolbar.className = "project-toolbar";

            // Remove a barra de ferramentas existente, se houver
            //this.removeToolbar();
           
            
            
            //let marlon = "marlon\n leticia \n livia";//activeLeaf.view;
            
            //const book = view.containerEl.createEl("div");
            //book.createEl("div", { text: "How to Take Smart Notes" });
            //book.createEl("small", { text: "Sönke Ahrens & Marlon Lemes" });
            
            //activeLeaf.containerEl.append(book);

            //MarkdownRenderer.render(this.app, book, toolbar,"templates/ui-live_preview-mode.md",this);
            //book.className = "project-toolbar";
            //let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
            
            //let embedBlock = activeDocument.createEl("h1",{text: "MARLON"});
            //embedBlock.addClass('project-toolbar');
            //embedBlock.setAttribute('data-tbar-position', "0");
            //currentView?.containerEl.append(book);
			 //activeDocument ? activeDocument.querySelector('.cm-contentContainer')?.prepend(embedBlock) : undefined
            //activeLeaf ? activeDocument.querySelector('.cm-contentContainer')?.prepend(embedBlock) : undefined

             
            
            //prepend
            //activeLeaf.containerEl.querySelector()

            
            
            //activeLeaf.view.containerEl.prepend(toolbar);

            const mode = view.getMode();
            //new Notice(mode);
            
            let temps = "templates/ui-live_preview_mode.md";
            
            if (mode === "preview") {
                new Notice(mode);
                temps = "templates/ui-live_preview-mode.md";
            } else if (mode === "source") {
                new Notice(mode);
                temps = "templates/ui-preview-mode.md";
            }
            
            new Notice(">>>>>>>>>>>>>>"+temps);

            let corpodocs = document.querySelector(".metadata-container"); //metadata-container, //.cm-contentContainer
            if(corpodocs){

                console.log("corpodocs:::  "+ corpodocs.getAttr)

                new Notice("Encontrou .metadata-container (abaixo das propriredades");
                //corpodocs.prepend(toolbar);
                
                //const mdFilePath = "templates/_ui-management.md";
                const mdFilePath = temps;//"templates/ui-preview-mode.md";
                const fileContents = await this.app.vault.adapter.read(mdFilePath);
                console.log("mdFilePath::: "+ mdFilePath)
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
                await this.removeToolbar();
                corpodocs.append(toolbar);
            }


        } else {

            // Remove a barra de ferramentas se o arquivo não for do tipo projeto
            await this.removeToolbar()
        }
    }
    async removeToolbar() {
        // Remove a barra de ferramentas, se existir
        const existingToolbar = document.querySelector(".project-toolbar");
        if (existingToolbar) existingToolbar.remove();
    }
    
}