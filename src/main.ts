import { App, Editor, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from './settings/finalmente';

export default class MirrorUIPlugin extends Plugin {
    settings: MyPluginSettings;
	stopBuild: boolean;
    cssClassesMap: Map<string, string[]> = new Map();

    async onload() {
        console.log('[Mirror Notes] v16 loaded — finalmente.ts');

        await this.loadSettings();
        this.addSettingTab(new SampleSettingTab(this.app, this));
		//this.addSettingTab(new MirrorUISettingsTab(this.app, this));

        //this.registerEvent(this.app.workspace.on('active-leaf-change', this.eventActiveLeafChange.bind(this)));
        //this.registerEvent(this.app.workspace.on('file-open', await this.eventFileOpen.bind(this)));
        //this.registerEvent(this.app.workspace.on('layout-change', await this.scriptTeste.bind(this)));
        this.registerEvent(this.app.workspace.on('layout-change',() => {
            //const leaves = this.app.workspace.getLeavesOfType("markdown");

            //Wait for the DOM to update before loading the preview mode apps
            setTimeout(() => {
                //loadPreviewModeApps(leaves);
                this.scriptTeste();
                //console.log(leaves);

                //console.log(" ");
            }, 5);
        })
    );
        // verify criteria to show
    }
    async eventFileOpen(file: TFile) {
        new Notice("Open File");
        await this.removeToolbarFromActiveLeaf();
        await this.addToolbarToActiveLeaf(file, file);

    }
    async eventActiveLeafChange(file: TFile) {
        new Notice("#####-2 eventActiveLeafChange");

        const activeLeaf = this.app.workspace.getLeaf();
        if (!activeLeaf) return;

        const view = activeLeaf.view as MarkdownView;
        if (!view) return;

        let corpodocs = view.containerEl.querySelector(".project-toolbar");
        if (corpodocs) return;
        if (file !== undefined){
            //await this.removeToolbarFromActiveLeaf();
            //await this.addToolbarToActiveLeaf(file, file);
            this.scriptTeste()
        }

    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async resetSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS);
        await this.saveSettings();
    }

    onunload() {}

    scriptTeste() {
		this.removeToolbarFromActiveLeaf();
		this.stopBuild = false;
        if (this.settings.global_settings) {
            console.log("Global!");
            if (this.settings.customMirrors && this.settings.customMirrors.length > 0) {
                console.log("Mas tem Custom Mirrors");

                let hasOverride = this.settings.customMirrors.some(mirror => mirror.custom_settings_overide);
                if (hasOverride) {
                    console.log("... com override");
                    this.settings.customMirrors.forEach(mirror => {
                        mirror.filterFiles.forEach(file => {
                            if (file.folder) {
                                if (this.isFileName(file.folder)) {
                                    this.applyMirrorPlugin(mirror.custom_settings_live_preview_note, mirror.custom_settings_preview_note);
                                    this.stopBuild = true;
                                }
                            }
                        });

                        mirror.filterFolders.forEach(folder => {
                            if (folder.folder) {
                                if (this.isFolder(folder.folder)) {
                                    this.applyMirrorPlugin(mirror.custom_settings_live_preview_note, mirror.custom_settings_preview_note);
                                    this.stopBuild = true;
                                }
                            }
                        });

                        mirror.filterProps.forEach(prop => {
                            if (prop.template) {
                                if (this.isProp(prop.folder, prop.template)) {
                                    this.applyMirrorPlugin(mirror.custom_settings_live_preview_note, mirror.custom_settings_preview_note);
                                    this.stopBuild = true;
                                }
                            }
                        });
                    });
                } else {
                    console.log("Mas NAO tem Custom Mirrors com override");
                }
            } else {
                console.log("NAO tem Custom Mirrors");
            }
        } else {
            console.log("Nao e Global!");
            if (this.settings.customMirrors && this.settings.customMirrors.length > 0) {
                console.log("Possui Custom Mirrors");
                this.settings.customMirrors.forEach(mirror => {
                    mirror.filterFiles.forEach(file => {
                        if (file.folder) {
                            if (this.isFileName(file.folder)) {
                                this.applyMirrorPlugin(mirror.custom_settings_live_preview_note, mirror.custom_settings_preview_note);
                                this.stopBuild = true;
                            }
                        }
                    });

                    mirror.filterFolders.forEach(folder => {
                        if (folder.folder) {
                            if (this.isFolder(folder.folder)) {
                                this.applyMirrorPlugin(mirror.custom_settings_live_preview_note, mirror.custom_settings_preview_note);
                                this.stopBuild = true;
                            }
                        }
                    });

                    mirror.filterProps.forEach(prop => {
                        if (prop.template) {
                            if (this.isProp(prop.folder, prop.template)) {
                                this.applyMirrorPlugin(mirror.custom_settings_live_preview_note, mirror.custom_settings_preview_note);
                                this.stopBuild = true;
                            }
                        }
                    });
                });
            } else {
                console.log("NAO tem Custom Mirrors");
            }
        }
        console.log("******************");
    }

    isFileName(filename: string) {
        const openFile = this.app.workspace.getActiveFile();
        if (openFile && openFile.path === filename) {
            console.log("Filename matches the open file:", filename);
            return true;
        } else {
            console.log("Filename does not match the open file:", filename);
            return false;
        }
    }

    isFolder(folder: string) {
        const openFile = this.app.workspace.getActiveFile();
        if (openFile && openFile.path.startsWith(folder)) {
            console.log("Open file is in the folder:", folder);
            return true;
        } else {
            console.log("Open file is not in the folder:", folder);
            return false;
        }
    }

    isProp(prop: string, value: string) {
        const openFile = this.app.workspace.getActiveFile();
        if (openFile) {
            const props = this.app.metadataCache.getFileCache(openFile)?.frontmatter;
            if (props && props[prop] !== undefined) {
                if (props[prop] === value) {
                    console.log(`Open file has the property ${prop} with value ${value}`);
                    return true;
                } else {
                    console.log(`Open fhaile has the property ${prop}, but with a different value: ${props[prop]}`);
                    return false;
                }
            } else {
                console.log(`Open file does not have the property ${prop}`);
                return false;
            }
        } else {
            console.log("No file is open.");
            return false;
        }
    }
	async applyMirrorPlugin(live_mode_note: string, preview_mode_note: string) {
		if(!this.stopBuild){


			console.log("applyMirrorPlugin!!!!");

			const editor = this.app.workspace.getActiveViewOfType(MarkdownView);
			const isLivePreviewMode = editor instanceof MarkdownView && editor.getMode() === 'source';
			const isPreviewMode = editor instanceof MarkdownView && editor.getMode() === 'preview';

			if (isLivePreviewMode) {
				if (live_mode_note === "") {
					console.log("Live Preview Note is empty. Aborted.");
					return;
				} else {
					console.log("Executing in Live Preview Mode with note:", live_mode_note);
					const file = this.app.vault.getAbstractFileByPath(live_mode_note);
					if (file instanceof TFile) {
                        //await this.rerender();
						await this.eventLayoutChange(file);
					} else {
						console.log("File not found or is not a TFile:", live_mode_note);
					}
				}
			} else if (isPreviewMode) {
				if (preview_mode_note === "") {
					console.log("Preview Note is empty. Aborted.");
					return;
				} else {
					console.log("Executing in Preview Mode with note:", preview_mode_note);
					const file = this.app.vault.getAbstractFileByPath(preview_mode_note);
					if (file instanceof TFile) {

                        await this.rerender();
                        await this.eventLayoutChange(file);
                        await this.rerender();
                        // await this.rerender();
                        // refresh.
                        /* if (state.mode === 'preview') {
                            // Temporarily switch to Editing view and back to Reading view
                            // to avoid Properties to be hidden
                            state.mode = 'source';
                            await view.setState(state, { history: false });
                            state.mode = 'preview';
                            await view.setState(state, { history: false });
                        } */
                        //this.rerender();
					} else {
						console.log("File not found or is not a TFile:", preview_mode_note);
					}
				}
			}
			this.stopBuild = true;
	}

        console.log(live_mode_note);
        console.log(preview_mode_note);
    }
    async rerender() {
		//this.manager.forgetHistory();

		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
            console.log("RERERERNDERR")
			const view = leaf.view as MarkdownView;
			const state = view.getState();
            console.log("AAAA: "+ state.mode)
			const eState = view.getEphemeralState();
			view.previewMode.rerender(true);
			const editor = view.editor;
			editor.setValue(editor.getValue());
			if (state.mode === 'preview') {
				// Temporarily switch to Editing view and back to Reading view
				// to avoid Properties to be hidden
				state.mode = 'source';
				await view.setState(state, { history: false });
				state.mode = 'preview';
				await view.setState(state, { history: false });
			}
			view.setEphemeralState(eState);
		}
	}
    async eventLayoutChange(file_target: TFile) {
        new Notice("Layout Change");
        new Notice(file_target.path);

        const activeLeaf = this.app.workspace.getLeaf();
        if (activeLeaf) {
            const view = activeLeaf.view as MarkdownView;
            if (view) {
                const file = view.file;
                if (file) {
                    let corpodocs = view.containerEl.querySelector(".metadata-container");
                    const existingToolbar = corpodocs?.querySelector(".project-toolbar");

                    // Remove toolbar if it exists
                    if (existingToolbar) {
                        //existingToolbar.remove();
                        await this.removeToolbarFromActiveLeaf();
                        await this.addToolbarToActiveLeaf(file, file_target);
                    }

                    // Add toolbar
                    await this.addToolbarToActiveLeaf(file, file_target);
                }
            }
        }
    }

    async addToolbarToActiveLeaf(file: TFile, file_target: TFile) {
        const activeLeaf = this.app.workspace.getLeaf();
		if (!activeLeaf) return;

		const view = activeLeaf.view as MarkdownView;
		if (!view) return;

        let corpodocs = view.containerEl.querySelector(".metadata-container");
		if (corpodocs?.querySelector(".project-toolbar")){
            console.log("PASSOU")
        } else {
            console.log("NAO PASSOU")
        }
        const toolbar = document.createElement("div");
        toolbar.className = "project-toolbar";
        console.log(file_target)
        const fileContents = await this.app.vault.adapter.read(file_target.path);


        let note2 = view.containerEl.querySelector(".markdown-source-view");
        let note = view.containerEl.querySelector(".markdown-preview-view");
        //note?.addClasses(["daily","monday"])
        /* note?.addClass("banner")
        note2?.addClass("banner") */

        //corpodocs?.createEl("span", fileContents)
        //await MarkdownRenderer.renderMarkdown(fileContents, toolbar, file.path, this);
		await MarkdownRenderer.render(this.app,fileContents,toolbar,file.path,this);
        console.log("###############");
        //

        //const openFile = this.app.workspace.getActiveFile();
        //if (openFile) {

        // Definindo as possiveis chaves de propriedades que procuramos
        const cssKeys = ['cssClass', 'cssclass', 'cssClasses', 'cssclasses'];

        // Array para armazenar os valores das classes CSS
        let cssClasses: string[] = [];

        // Verifica se o frontmatter existe
        const props = this.app.metadataCache.getFileCache(file_target)?.frontmatter;
        if (props) {
            for (const key of cssKeys) {
                if (props[key]) {
                    let values: string[] = [];

                    // Verifica se o valor e uma string
                    if (typeof props[key] === 'string') {
                        // Separa por virgula e remove espacos em branco
                        values = props[key].split(',').map((value: string) => value.trim());
                    } else if (Array.isArray(props[key])) {
                        // Se for um array, assume que cada elemento e uma string de classe
                        values = props[key].map((value: any) => String(value).trim());
                    }

                    cssClasses = cssClasses.concat(values);
                }
            }
            // Verifica se deve incluir a classe 'banner'
            const props2 = this.app.metadataCache.getFileCache(file)?.frontmatter;
            if (!props2) return;
            const mosxbanner = props2["mosxbanner"];
            if (cssClasses.includes("banner") && !mosxbanner) {
                // Remove 'banner' se 'mosxbanner' nao estiver presente ou nao tiver valor
                new Notice("Removendo classe 'banner' porque 'mosxbanner' nao esta presente ou nao tem valor.");
                console.log("Removendo classe 'banner' porque 'mosxbanner' nao esta presente ou nao tem valor.");
                cssClasses = cssClasses.filter(cssClass => cssClass !== "banner");
            }
        }
        new Notice(">>"+cssClasses);

        // Armazena o array cssClasses no Map associado ao caminho do arquivo
        this.cssClassesMap.set(file.path, cssClasses);

        console.log(cssClasses);
        console.log("###############");
        cssClasses.forEach(cssClass => {
            note?.addClass(cssClass);
            note2?.addClass(cssClass);
        });
        //console.log(file.path);
        //console.log("<<<>>>");
        //await MarkdownRenderer.renderMarkdown(fileContents, toolbar, file.path, this);
		//@ts-ignore
        corpodocs?.append(toolbar);
        //corpodocs?.prepend

    }

    async removeToolbarFromActiveLeaf() {
        console.log("C H A M O U U U U 11")
        const activeLeaf = this.app.workspace.getLeaf();
        if (!activeLeaf) return;
        console.log("C H A M O U U U U 22")
        const view = activeLeaf.view as MarkdownView;
        if (!view) return;
        console.log("C H A M O U U U U 33")
        let corpodocs = view.containerEl.querySelector(".metadata-container");
        const existingToolbar = corpodocs?.querySelector(".project-toolbar");

        let note2 = view.containerEl.querySelector(".markdown-source-view");
        let note = view.containerEl.querySelector(".markdown-preview-view");


        //note?.removeClass("banner")
        //note2?.removeClass("banner")


       // Remover todas as classes CSS possiveis
        if (this.cssClassesMap.size > 0) {
            this.cssClassesMap.forEach((cssClasses, filePath) => {
                if (cssClasses) {
                    console.log("CSS Classes encontradas para remocao:", cssClasses);
                    cssClasses.forEach(cssClass => {
                        console.log("-->> Removendo: " + cssClass);
                        note?.removeClass(cssClass);
                        note2?.removeClass(cssClass);
                    });
                }
            });
             // Limpa o Map para evitar carregar dados de uma pagina para outra
            this.cssClassesMap.clear();
        }

        //note?.addClasses(["daily","monday"])

        if (existingToolbar) {
            console.log("C H A M O U U U U 444")
            existingToolbar.remove();

        }
    }

}
