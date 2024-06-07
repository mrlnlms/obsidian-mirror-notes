import { App, MarkdownView, Plugin, Notice, TFile, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';

export default class ProjectToolbarPlugin extends Plugin {
    onload() {
        console.log('[Mirror Notes] v5 loaded — cm-scroller targeting');
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
    }

    async addToolbar(leaf: WorkspaceLeaf) {
        if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;
    
    
        // Obtém o painel ativo
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) return;
        const view = leaf.view as MarkdownView;
        const file = view.file;
        if (!file) return;
        // Verifica se o arquivo possui YAML do tipo projeto
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.type === "project") {
            //view.containerEl.querySelector('.markdown-source-view')
            
            // Cria um novo elemento HTML para a barra de ferramentas
            const toolbar = activeDocument.createElement("div");
            
            
            //toolbar.innerHTML =  await this.app.vault.adapter.read("templates/ui-live_preview-mode.md");//"Barra de Ferramentas";
            toolbar.className = "project-toolbar";
            
            let teste = document.body.querySelector(".cm-scroller")

            if(teste){
                new Notice("AHAHAAHA");
                teste.append(toolbar);
            }
            
            // Remove a barra de ferramentas existente, se houver
            this.removeToolbar();

            // Insere a barra de ferramentas na visualização do painel
            activeLeaf.view.containerEl.prepend(toolbar);


            let marlon = "marlon\n leticia \n livia";//activeLeaf.view;
            
            
            MarkdownRenderer.render(this.app, marlon, toolbar,"templates/ui-live_preview-mode.md",this);
            
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