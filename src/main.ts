

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
        console.log('[Mirror Notes] v6 loaded — MirrorUIPlugin class born');

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

        //this.addSettingTab(new mirrorSeetingsTab(this.app,this));
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
            //view.containerEl.querySelector('.markdown-source-view')
            
            // Cria um novo elemento HTML para a barra de ferramentas
            const toolbar = activeDocument.createElement("div");
            let embedBlock = toolbar.createEl("h1",{text: "MARLON"});
            //toolbar.innerHTML =  await this.app.vault.adapter.read("templates/ui-live_preview-mode.md");//"Barra de Ferramentas";
            toolbar.className = "project-toolbar";
        

            // Remove a barra de ferramentas existente, se houver
            this.removeToolbar();
           
            
            
            //let marlon = "marlon\n leticia \n livia";//activeLeaf.view;
            
            //const book = view.containerEl.createEl("div");
            //book.createEl("div", { text: "How to Take Smart Notes" });
            //book.createEl("small", { text: "Sönke Ahrens & Marlon Lemes" });
            
            //activeLeaf.containerEl.append(book);

            //MarkdownRenderer.render(this.app, book, toolbar,"templates/ui-live_preview-mode.md",this);
            //book.className = "project-toolbar";
            let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
            
            //let embedBlock = activeDocument.createEl("h1",{text: "MARLON"});
            //embedBlock.addClass('project-toolbar');
            //embedBlock.setAttribute('data-tbar-position', "0");
            //currentView?.containerEl.append(book);
			 //activeDocument ? activeDocument.querySelector('.cm-contentContainer')?.prepend(embedBlock) : undefined
            //activeLeaf ? activeDocument.querySelector('.cm-contentContainer')?.prepend(embedBlock) : undefined

             
            
            //prepend
            //activeLeaf.containerEl.querySelector()

            
            
            

            let corpodocs = document.querySelector(".metadata-container"); //metadata-container, //.cm-contentContainer
            if(corpodocs){
                new Notice("AHA");
                //corpodocs.prepend(toolbar);
                
                let conteudo = await this.app.vault.adapter.read("templates/ui-live_preview-mode.md");
                //let corpodocs;
                


                let file = this.app.vault.getAbstractFileByPath('templates/ui-live_preview-mode.md');

                
                if (file instanceof TFile) {
                    let conteudo = this.app.vault.read(file);
                    //this.app.vault.read(file).then(content => {
                    //    console.log(content);
                    //}).catch(error => {
                    //    console.error("Error reading the file:", error);
                    //});
                } else {
                    //console.error("The file is not an instance of TFile:", file);
                }
                //MarkdownRenderer.render(this.app, conteudo, corpodocs,"templates/ui-live_preview-mode.md",this);
                //MarkdownRenderer.render(this.app, file, corpodocs,"templates/ui-live_preview-mode.md",this);

                //corpodocs.append(content);
                //MarkdownRenderer.render(this.app, marlon, corpodocs,"templates/ui-live_preview-mode.md",this)
                
                //corpodocs.append(embedBlock);
            }


        } else {

            // Remove a barra de ferramentas se o arquivo não for do tipo projeto
            this.removeToolbar()
        }
    }
    removeToolbar() {
        // Remove a barra de ferramentas, se existir
        const existingToolbar = document.querySelector(".project-toolbar");
        if (existingToolbar) existingToolbar.remove();
    }
    
}