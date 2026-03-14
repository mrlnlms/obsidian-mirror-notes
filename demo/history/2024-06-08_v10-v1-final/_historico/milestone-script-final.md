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

    //this.registerEvent(this.app.workspace.on('active-leaf-change', this.eventActiveLeafChange.bind(this)));

    //this.registerEvent(this.app.workspace.on('file-open', await this.eventFileOpen.bind(this)));

    this.registerEvent(this.app.workspace.on('layout-change', await this.eventLayoutChange.bind(this)));

}

  

async eventActiveLeafChange(file: TFile) {

    // Remover o elemento ao mudar de folha

    //await this.removeToolbarFromActiveLeaf();

    console.log("#####-2 eventActiveLeafChange")

    const activeLeaf = this.app.workspace.getLeaf();

    if (!activeLeaf) return;

    const view = activeLeaf.view as MarkdownView;

    if (!view) return;

    //let corpodocs = view.containerEl.querySelector(".metadata-container");

    let corpodocs = view.containerEl.querySelector(".project-toolbar");

    corpodocs?.querySelectorAll(".project-toolbar");

    console.log("> ACTIVY LEAF CARALHO")

    console.log(file.name);

    console.log(corpodocs);

    if (corpodocs) return

    await this.removeToolbarFromActiveLeaf();

    //console.log("> ACTIVY LEAF CARALHO")

    //console.log(corpodocs);

    await this.addToolbarToActiveLeaf(file);

  

}

  

async eventFileOpen(file: TFile) {

    new Notice("Open File")

    //if(file === null) return;

        //console.log(leaf.view)

    await this.removeToolbarFromActiveLeaf();

    await this.addToolbarToActiveLeaf(file);

}

  

async eventLayoutChange(file2: TFile) {
    if(file2 === null) return;
    new Notice("Layout Change")

    // Remover e adicionar novamente o elemento ao mudar o layout da folha

    const activeLeaf = this.app.workspace.getLeaf();

    //const activeLeaf = this.app.workspace.activeLeaf;

    if (activeLeaf) {

        const view = activeLeaf.view as MarkdownView;

        if (view) {

            const file = view.file; // Corrigindo aqui

            if (file) {

                console.log("------")

                console.log(file.name)

                console.log("------")

                let corpodocs = view.containerEl.querySelector(".metadata-container");

  

                // Remover o elemento 'project-toolbar'

                const existingToolbar = corpodocs?.querySelector(".project-toolbar");

                if (existingToolbar) {

                    console.log("Encontrou .project-toolbar em : "+file.name)

                    await this.updateTollbarInActiveLeaf(file);

                    //await this.removeToolbarFromActiveLeaf();

                    //await this.addToolbarToActiveLeaf(file);

                } else {

                    console.log("NAO Encontrou .project-toolbar em : "+file.name)

                    //await this.updateTollbarInActiveLeaf2(file);

                    // Solução para adicionar manualmente o evento open-file, mas

                    // volta no problema de adicionar dois componentes nos arquivos.

                    // await this.triggerFileOpenEvent(file);

                    //await this.eventFileOpen(file);

                    await this.removeToolbarFromActiveLeaf();

                    await this.addToolbarToActiveLeaf(file);

                }  

                //await this.removeToolbarFromActiveLeaf();

                //await this.addToolbarToActiveLeaf(file);

                //await this.updateTollbarInActiveLeaf(file);

            }

        }

    }

}

  

    async updateTollbarInActiveLeaf(file: TFile){

        //console.log("##### updateTollbarInActiveLeaf")

        const activeLeaf = this.app.workspace.getLeaf();
        //const activeLeaf = this.app.workspace.activeLeaf;
        

        if (!activeLeaf) return;

        const view = activeLeaf.view as MarkdownView;
        if (!view) return;

        //let corpodocs = view.containerEl.querySelector(".metadata-container");

        let corpodocs = view.containerEl.querySelector(".project-toolbar");
        console.log("E X I S T E AAAAA-1")
        
        if (!corpodocs) return

        await this.removeToolbarFromActiveLeaf();

        console.log("E X I S T E AAAAA")

        await this.addToolbarToActiveLeaf(file);

    }

  

    // Função que adiciona o elemento na folha ativa
    async addToolbarToActiveLeaf(file: TFile) {

        //console.log("Debug: addToolbarToActiveLeaf - Iniciado");

        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;

        //console.log("Debug: Frontmatter - ", frontmatter);

        if (frontmatter?.type === "project") {

                const activeLeaf = this.app.workspace.activeLeaf;

                //console.log("Debug: Active Leaf - ", activeLeaf);

                if (!activeLeaf) {

                console.log("Debug: Active Leaf não encontrada");

                return;

                }

                const view = activeLeaf.view as MarkdownView;

                if (!view) {

                console.log("Debug: View não encontrada");

                return;

                }

                let corpodocs = view.containerEl.querySelector(".metadata-container");

                let marlon = view.containerEl.querySelector(".project-toolbar");

                console.log("Debug: Metadata Container - ", corpodocs);

                console.log("Debug: MARLONNN Container - ", marlon);

                //marlon.forEach((container, index) => {

                // console.log(`MARLON Container ${index + 1}:`, container);

                //});

                // Verificar se o elemento já foi adicionado

                if (corpodocs?.querySelector(".project-toolbar")) {

                console.log("Debug: Elemento já adicionado");

                return;

                }

                // Verificar se há mais de uma instância do elemento

                //const toolbars = corpodocs?.querySelectorAll(".project-toolbar");

                //if (toolbars && toolbars.length > 0) {

                // console.log(`Debug: ${toolbars.length} elementos 'project-toolbar' já adicionados`);

                // return;

                //}

                //console.log("Debug: Adicionando toolbar...");

                
                

                const mode = view.getMode();

                let temps = "templates/ui-live_preview-mode.md";

                if (mode === "preview") {

                temps = "templates/ui-preview-mode.md";

                } else if (mode === "source") {

                temps = "templates/ui-live_preview-mode.md";

                }

                

                // Adicionar o elemento 'project-toolbar'

                const toolbar = document.createElement("div");

                toolbar.className = "project-toolbar";

                const mdFilePath = temps;

                const fileContents = await this.app.vault.adapter.read(mdFilePath);

                const mdContainer = document.createElement("div");

                toolbar.append(mdContainer);

                await MarkdownRenderer.render(

                this.app,

                fileContents,

                mdContainer,

                file.path,

                this

                );

                

                corpodocs?.append(toolbar);

                console.log("Debug: Toolbar adicionada com sucesso");

        }

    }

    // Função que remove o elemento da folha ativa
    async removeToolbarFromActiveLeaf() {

    //console.log("CHAMADO -------- ")

    const activeLeaf = this.app.workspace.getLeaf();

    if (!activeLeaf) return;

    const view = activeLeaf.view as MarkdownView;

    if (!view) return;

        let corpodocs = view.containerEl.querySelector(".metadata-container");


        // Remover o elemento 'project-toolbar'

        const existingToolbar = corpodocs?.querySelector(".project-toolbar");

        if (existingToolbar) {

            existingToolbar.remove();

        }

    }

    // Função para disparar o evento manualmente
    async triggerFileOpenEvent(file: TFile) {

        await this.eventFileOpen(file);

    }
}