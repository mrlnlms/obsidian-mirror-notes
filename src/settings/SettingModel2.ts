import MyPlugin from "../main";
import { App, ButtonComponent, ExtraButtonComponent, Notice, PluginSettingTab, Setting } from "obsidian";
//import { FolderSuggest } from "./suggesters/FolderSuggester";
//import { FileSuggest, FileSuggestMode } from "./suggesters/FileSuggester";
//import { arraymove } from "utils/Utils";
import { FileSuggest, FolderSuggest, YamlPropertySuggest } from "../utils/file-suggest";

export interface FolderTemplate {
    folder: string;
    template: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
    templates_folder: '',
    enable_folder_templates: true,
    folder_templates: [{ folder: "", template: "" }],
    user_scripts_folder: "",

    enable_getting_started: true,
    enable_global_settings: false,
    enable_global_live_preview_mode: false,
    enable_global_preview_mode: false,
    enable_custom_settings: false,

    filter_files: [{ folder: "", template: "" }],
    filter_folders: [{ folder: "", template: "" }],
    filter_props: [{ folder: "", template: "" }],
    filter_props_values: [{ folder: "", template: "" }],
    custom_items: [] // Adicione este campo
    
}

export interface MyPluginSettings {
    
	// apagar?
    mySetting: string;
    templates_folder: string;
    enable_folder_templates: boolean;
    folder_templates: Array<FolderTemplate>;
    user_scripts_folder: string;

    enable_getting_started: boolean;
    enable_global_settings: boolean;
    enable_global_live_preview_mode: boolean;
    enable_global_preview_mode: boolean;
    enable_custom_settings: boolean;

    filter_files: Array<FolderTemplate>;
    filter_folders: Array<FolderTemplate>;
    filter_props: Array<FolderTemplate>;
    filter_props_values: Array<FolderTemplate>;
    //@ts-ignore
    custom_items: Array<CustomItem>; // Adicione este campo
}

export class SampleSettingTab extends PluginSettingTab {
    
	constructor(private plugin: MyPlugin) {
        //@ts-ignore
		super(app, plugin);
	}

    display(): void {
        const {containerEl} = this;
		containerEl.empty();
        
        //this.add_header_settings();
        this.add_gettingStarted_banner();
        
        this.add_global_mirror();
        
        // cria uma linha separadora 
        this.containerEl.createEl("hr",{cls: "mirror-separator"});

        this.add_custom_mirrors();
    
        //this.add_custom_mirrors();

        /**
         *** Reset Settings
         *
         */
        new Setting(containerEl)
			.addButton( (button) => {
				button.setButtonText('Reset settings');
				button.onClick(() => {
					/* new ConfirmationModal({
						plugin: this.plugin,
						title: 'Please confirm',
						message: 'Revert to default settings for Ink plugin?',
						confirmLabel: 'Reset settings',
						confirmAction: async () => {
							await this.plugin.resetSettings();
							this.display();
						} */
					})
                    //.open();
				})
			
        //this.add_folder_templates_setting();
            
    }

/**
 * Aqui começa as funções principais, blocadas (banner, global, custom)
 * 
 */

    add_gettingStarted_banner():void{

        if(this.plugin.settings.enable_getting_started){
            const banner = this.containerEl.createEl("div", { cls: "mirror-plugin-banner" });
            banner.createEl("h1", { text: "👋 Getting Started with Mirror Notes Plugin"});
            banner.createEl("p",{text:'Mirror Notes propõe uma nova forma de pensar o uso de templates dentro do Obsidian, possibilitando definir um único template para um grupo definido de notas, ou seja, alterando o template, as notas relacionadas serão atualizadas automaticamente.'})
            const dismiss = banner.createEl("button",{text:'Dismiss'})
            dismiss.onclick = () => {
                this.plugin.settings.enable_getting_started = false;
                this.plugin.saveSettings();
                this.display();
            };
            this.containerEl.createEl("br")
        }
    }

    add_global_mirror(){
        
        // Cria DIV para o header
        const global_container = this.containerEl.createEl("div", {cls: "global-container"});
        const global_comp = global_container.createEl("div", { cls: "headers-toggleing" });

        // Cria um header com toggle
        this.addToggleHeader(global_comp,"Global Mirror Settings", "enable_global_settings");
        
        // Se global settings === true;
        if(!this.plugin.settings.enable_global_settings) return;

        // Adiciona descrição da seção;
        this.addStatsDescr(global_container, true);

        // Cria DIV para agrupa as funções de Global Settings;
        const globalMirrorSettings = this.containerEl.createEl("div", { cls: "global-mirror-settings" });
        
        // Cria o componente de seleção de notas que serão espelhadas;
        this.createSelectionMirrorNotes(globalMirrorSettings)
        this.replaceMirror(globalMirrorSettings)
    }

    add_custom_mirrors(){
        
        const custom_container = this.containerEl.createEl("div", {cls: "custom-container"});
        const global_comp = custom_container.createEl("div", { cls: "headers-toggleing" });
        this.addToggleHeader(global_comp,"👋 Custom Mirror Settings", "enable_custom_settings"); //HTML Element, Title and Setting Variable
        
        // Verificar se o toggle é true;
        if(!this.plugin.settings.enable_custom_settings){
            return;
        }
        
        this.addStatsDescr(custom_container);

        const cards = custom_container.createEl("div", { cls: "mirror-plugin-cards" });
        this.addCustomSettingCards(cards, 'custom_items');
    }

    addTemplateSelection<T extends keyof MyPluginSettings>(container: HTMLElement, settingKey: T, name: string, placeholder: string): void {
        // Verifique se a chave de configuração corresponde a um valor booleano
        if (typeof this.plugin.settings[settingKey] === "boolean") {
            new Setting(container)
                .setName(name)
                .setDesc(`Selecione uma nota para ser espelhada no modo ${name.toLowerCase()}.`)
                .setClass("toogle-header")
                .addToggle((cb) => {
                    const currentValue = this.plugin.settings[settingKey] as boolean;
                    cb
                        .setValue(currentValue)
                        .onChange((value: boolean) => {
                            this.plugin.settings[settingKey] = value as MyPluginSettings[T];
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
    
            if (this.plugin.settings[settingKey] as boolean) {
                const templateField = container.createEl("div", { cls: `${name.toLowerCase().replace(/ /g, "-")}-template-field` });
                this.addSelectionField(templateField, placeholder);
            }
        } else {
            console.error(`Setting ${settingKey} is not a boolean.`);
        }
    }

    /**
     * Aqui comça as funções Gerenciadoras
     * 
     */

    

    addCustomSettingCards(container: HTMLElement, settingKey: keyof MyPluginSettings): void{
    //addInputFilePath(container: HTMLElement, settingKey: keyof MyPluginSettings): void {
        const cardsTemplate = this.plugin.settings[settingKey] as Array<FolderTemplate>;
        cardsTemplate.forEach((cardsTemplate, index) => {

        
            const customItemIndex = this.plugin.settings.custom_items.length - 1;
            const card = container.createEl("div", { cls: "mirror-card" });
            new Setting(card)
            .setName(`Custom Mirror ${customItemIndex + 1}`)
            .addExtraButton((cb) => {
                cb.setIcon("up-chevron-glyph")
                    .setTooltip("Move up")
                    .onClick(() => {
                        this.arraymove(Array(cardsTemplate), index, index - 1);
                        this.plugin.saveSettings();
                        this.display();
                    });
            })
            .addExtraButton((cb) => {
                cb.setIcon("down-chevron-glyph")
                    .setTooltip("Move down")
                    .onClick(() => {
                        this.arraymove(Array(cardsTemplate), index, index + 1);
                        this.plugin.saveSettings();
                        this.display();
                    });
            })
            .addExtraButton((cb) => {
                cb.setIcon("chevrons-down-up")
                    .setTooltip("Colapse")
                    .onClick(() => {
                        /* this.arraymove(folderTemplates, index, index + 1);
                        if(settingKey === "filter_props"){
                            this.arraymove(this.plugin.settings.filter_props_values, index, index + 1);
                        }
                        this.plugin.saveSettings();
                        this.display(); */
                    });
            })
            
            .addExtraButton((button: ExtraButtonComponent) => {
                button
                    .setTooltip("Delete this custom mirror")
                    //.setButtonText("x")
                    .setIcon("edit")
                    .onClick(()=>{
                        this.plugin.settings.custom_items.splice(customItemIndex, 1);
                        this.plugin.saveSettings();
                        //card.remove();
                    })
                    //.setCta()
                    //.onClick(() => {
                    //    this.plugin.settings.custom_items.push({
                    //        folder: "",
                    //        template: "",
                    //    });
                    //    this.plugin.save_settings();
                    //    this.display();
                    //});
            })

            .addExtraButton((button: ExtraButtonComponent) => {
                button
                    .setTooltip("Delete this custom mirror")
                    //.setButtonText("x")
                    .setIcon("reset")
                    .onClick(()=>{
                        this.plugin.settings.custom_items.splice(customItemIndex, 1);
                        this.plugin.saveSettings();
                        card.remove();
                    })
                    //.setCta()
                    //.onClick(() => {
                    //    this.plugin.settings.custom_items.push({
                    //        folder: "",
                    //        template: "",
                    //    });
                    //    this.plugin.save_settings();
                    //    this.display();
                    //});
            })

            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Delete this custom mirror")
                    .setButtonText("x")
                    .onClick(()=>{
                        this.plugin.settings.custom_items.splice(customItemIndex, 1);
                        
                        this.plugin.saveSettings();
                        
                        this.display();
                    })
                    //.setCta()
                    //.onClick(() => {
                    //    this.plugin.settings.folder_templates.push({
                    //        folder: "",
                    //        template: "",
                    //    });
                    //    this.plugin.save_settings();
                    //    this.display();
                    //});
            })

            //container.createEl("br");
            this.createSelectionMirrorNotes(card);
            /* new Setting(card)
                .setName("By Folder")
                .setDesc("Arquivos globais estão sendo pegos assim por folder path.")
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                        .setTooltip("Configure Hotkey")
                        .onClick(() => {
                            // TODO: Replace with future "official" way to do this
                            // @ts-ignore
                            //app.setting.openTabById("hotkeys");
                            // @ts-ignore
                            //const tab = app.setting.activeTab;
                            //tab.searchInputEl.value = "Templater: Insert";
                            //tab.updateHotkeyVisibility();
                        });
                }); */


            //const myFilters = card.createEl("div", { cls: "mirror-filters" });
            //const sectionEl = myFilters.createDiv('mirror-accordion');
            const accordionEl = card;//.createEl('details');
            //accordionEl.setAttr("open","");
            //myFilters.createEl('summary', { text: `Filters:` , cls:'mirror-acordion-summary'});
            
        
            //new Setting(accordionEl)
                //.setClass('ddc_ink_setting')
                //.setName('Slash Commands')
                //.setDesc(`Select the criteria de quais páginas que serão show Mirror-Files.`)

            // this.createSelectionMirrorNotes(card);
            new Setting(accordionEl)
                .setName("Filter by Filename")
                .setDesc("If there are diferent files with the same filename, both are will be considered in the filter. Ex. ./note.md and ./folder/note.md.")
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                        .setTooltip("Add New Filename")
                        .onClick(() => {
                            this.plugin.settings.filter_files.push({
                                folder: "",
                                template: "",
                            });
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
            
            //this.addInputFilePath(accordionEl);
            //this.addInputFilePath(accordionEl, 'filter_files');
            
            
                
            new Setting(accordionEl)
                .setName("Filter by Folder path")
                .setDesc("Arquivos globais estão sendo pegos assim por folder path.")
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                    .setTooltip("Add New Folder")
                    .onClick(() => {
                        this.plugin.settings.filter_folders.push({
                            folder: "",
                            template: "",
                        });
                        this.plugin.saveSettings();
                        this.display();
                    });
                });
            
            //this.addInputFilePath(accordionEl);
            this.addInputFilePath(accordionEl, 'filter_folders');
            
            
            new Setting(accordionEl)
                .setName("Filter by Properties")
                .setDesc("Arquivos globais estão sendo pegos assim por folder path.")
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                        .setTooltip("Add New Property")
                        .onClick(() => {
                            this.plugin.settings.filter_props.push({
                                folder: "",
                                template: "",
                            });
                            this.plugin.settings.filter_props_values.push({
                                folder: "",
                                template: "",
                            });
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
            
                this.addInputFilePath(accordionEl, 'filter_props');
            //this.addInputFilePath(accordionEl); // this.plugin.settings.filter_props
            this.replaceMirror(card);
        })
    }

    /**
     * Aqui começa as funções que chamam meus componentes customizados para o settings;
     * 
     */


    createSelectionMirrorNotes(container: HTMLElement): void {
        this.addTemplateSelection(container, "enable_global_live_preview_mode", "Live Preview Mode Template Mirror Note", "./Note Folder/example-note.md");
        this.addTemplateSelection(container, "enable_global_preview_mode", "Preview Mode Template Mirror Note", "./Note Folder/example-note.md");
    }
    

    addInputFilePath(container: HTMLElement, settingKey: keyof MyPluginSettings): void {
        const folderTemplates = this.plugin.settings[settingKey] as Array<FolderTemplate>;
        
    
        folderTemplates.forEach((folder_template, index) => {
            const s = new Setting(container)
                .addSearch((cb) => {
                    console.log(settingKey)
                    let myPlaceholder: string;
                    if(settingKey === "filter_files"){
                        new FileSuggest(this.app, cb.inputEl);
                        myPlaceholder = "Select a file to get your filename";

                    } else if(settingKey === "filter_folders"){
                        new FolderSuggest(this.app, cb.inputEl);
                        myPlaceholder = "Select a folder";

                    } else if(settingKey === "filter_props"){
                        new YamlPropertySuggest(this.app, cb.inputEl);
                        myPlaceholder = "Select a property";

                    } else {
                        myPlaceholder = "N/A";
                    }
                    //new FolderSuggest(this.app, cb.inputEl);
                    cb.setPlaceholder(myPlaceholder) //myPlaceholder
                        .setValue(folder_template.folder)
                        .onChange((new_folder) => {
                            if (
                                new_folder &&
                                folderTemplates.some((e) => e.folder === new_folder)
                            ) {
                                new Notice("This folder already has a template associated with it");
                                return;
                            }
    
                            folderTemplates[index].folder = new_folder;
                            this.plugin.saveSettings();
                        });
                    
                    // Adicionar um ID para facilitar a seleção
                    cb.inputEl.id = `input-${settingKey}-${index}`;

                    // Adicionar ouvinte ao botão de limpar
                    //@ts-ignore
                    const clearButton = cb.containerEl.querySelector(".search-input-clear-button");
                    if (clearButton) {
                        clearButton.addEventListener("click", () => {
                            //new Notice("Aha")
                            this.clearAdjacentField('filter_props_values', index);
                        });
                    }
                    // @ts-ignore
                    cb.containerEl.addClass("templater_search");
                })
                
                if(settingKey === "filter_props"){
                    let propValues = this.plugin.settings["filter_props_values"] as Array<FolderTemplate>;
                
                    
                    s.addSearch((cb) => {
                        console.log(settingKey)
                        let myPlaceholder: string;
                        new YamlPropertySuggest(this.app, cb.inputEl);
                        myPlaceholder = "Select a property value";
                        console.log(propValues,index)
                        cb.setPlaceholder(myPlaceholder) 
                            
                            .setValue(propValues[index].folder) //this.plugin.settings.filter_props_values
                            .onChange((new_folder) => {
                                if (
                                    new_folder &&
                                    propValues.some((e) => e.folder === new_folder)
                                ) {
                                    new Notice("This folder already has a template associated with it");
                                    return;
                                }
        
                                propValues[index].folder = new_folder;
                                
                                this.plugin.saveSettings();
                            });
                        // Adicionar um ID para facilitar a seleção
                        //cb.inputEl.id = `filter_props_values-${index}`;
                        cb.inputEl.id = `input-filter_props_values-${index}`
                        // @ts-ignore
                        cb.containerEl.addClass("templater_search");
                    })

                }
                s.addExtraButton((cb) => {
                    cb.setIcon("up-chevron-glyph")
                        .setTooltip("Move up")
                        .onClick(() => {
                            this.arraymove(folderTemplates, index, index - 1);
                            if(settingKey === "filter_props"){
                                this.arraymove(this.plugin.settings.filter_props_values, index, index - 1);
                            }
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("down-chevron-glyph")
                        .setTooltip("Move down")
                        .onClick(() => {
                            this.arraymove(folderTemplates, index, index + 1);
                            if(settingKey === "filter_props"){
                                this.arraymove(this.plugin.settings.filter_props_values, index, index + 1);
                            }
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            folderTemplates.splice(index, 1);
                            if(settingKey === "filter_props"){
                                this.plugin.settings.filter_props_values.splice(index, 1);
                            }
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
            s.infoEl.remove();
        });
    }

    // Função para limpar o campo ao lado
    
    clearAdjacentField(settingKey: keyof MyPluginSettings, index: number): void {
        const adjacentIndex = index; // ou outra lógica para determinar o campo ao lado
        const adjacentInput = document.querySelector(`#input-${settingKey}-${adjacentIndex}`) as HTMLInputElement;
        console.log(adjacentInput)
        console.log(`#input-${settingKey}-${adjacentIndex}`)
       

        if (adjacentInput) {
            adjacentInput.value = "";
            const folderTemplates = this.plugin.settings[settingKey] as Array<FolderTemplate>;
            folderTemplates[adjacentIndex].folder = "";
            this.plugin.saveSettings();
        }
    }

    arraymove(arr: any[], fromIndex: number, toIndex: number) {
        const element = arr[fromIndex];
        arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, element);
    }


    addToggleHeader<K extends keyof MyPluginSettings>(container: HTMLElement, title: string, settingPath: K): void {
        const global_header = container.createEl("div");
        global_header.createEl("h1", { text: title });

        if (typeof this.plugin.settings[settingPath] === "boolean") {
            new Setting(container)
                .addToggle((cb) => {
                    cb
                        .setValue(this.plugin.settings[settingPath] as boolean)
                        .onChange((value: boolean) => {
                            this.plugin.settings[settingPath] = value as MyPluginSettings[K];
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
                .setClass("toggle-header");
        }
    }

    addStatsDescr(container: HTMLElement, globalComp: boolean = false){
        if(globalComp){

            const globalDescription = container.createEl("div");
            new Setting(globalDescription)
                .setDesc("Arquivos globais estão sendo pegos assim assado. TESTE")

        } else {

            const customlDescription = this.containerEl.createEl("div");
            new Setting(container)
                .setName("Add new")
                .setDesc("Arquivos globais estão sendo pegos assim assado.")
                .addButton((button: ButtonComponent) => {
                    button
                        .setTooltip("Add additional folder template")
                        .setButtonText("Add New Mirror")
                        .setCta()
                        .onClick(() => {
                            
                            const cardsContainers = document.getElementsByClassName("mirror-plugin-cards");
                            if (cardsContainers.length > 0) {
                                console.log("---")
                                console.log(cardsContainers.length)
                                console.log("---")
                                this.plugin.settings.custom_items.push({ folder: "", template: "" });
                                this.plugin.saveSettings();
                                
                                for (let i = 0; i < cardsContainers.length; i++) {
                                    while (cardsContainers[i].firstChild) {
                                        //@ts-ignore
                                        cardsContainers[i].removeChild(cardsContainers[i].firstChild);
                                    }
                                }
                                
                                this.addCustomSettingCards(cardsContainers[0] as HTMLElement, 'custom_items');
                            } else {
                                console.error("Div 'mirror-plugin-cards' not found.");
                            }
                        });
            });
        }
    }

    replaceMirror(container: HTMLElement, globalComp: boolean = false){
        
        //container.createEl("br")

        if(globalComp){
            new Setting(container)
                .setName("Replace custom Mirrors")
                .setDesc("Por padrão, custom Mirrors sobrescrevem o global Mirror. Com esta opção, o plugin irá sobrescrever os custom Mirros, a menos que estes estejam setados para sobrecrever esta função.")
                .addToggle((cb) => {})
                .setClass("toogle-header")
        } else {
            new Setting(container)
                .setName("Replace custom Mirrors")
                .setDesc("Se TRUE, sobrescreve o mirror global setado como subrescrever")
                .addToggle((cb) => {})
                .setClass("toogle-header")
        }
        
    }

    /**
     * Aqui começa as funções que CONSTROEM meus componentes components
     * 
     */

    addLivePreviewSelection(container: HTMLElement){
        //const livePreviewModeTemplate = container.createEl("div", { cls: "livePreviewModeTemplate"});
        //const global_header = global_comp.createEl("div");
        //const globalDescription = this.containerEl.createEl("div");
        new Setting(container)
            .setName("Live Preview Mode Template Mirror Note")
            .setDesc("Selecione uma nota para ser espelhada no modo live preview mode.")
            .setClass("toogle-header")
            .addToggle((cb) => {
                cb
                    .setValue(this.plugin.settings.enable_global_live_preview_mode)
                    .onChange((value) => {
                        this.plugin.settings.enable_global_live_preview_mode = value;
                        this.plugin.saveSettings();
                        // Force refresh
                        this.display();
                    })
            })
        // Verificar se o toggle é true;
        if(this.plugin.settings.enable_global_live_preview_mode){
            const livePreviewModeTemplateField = container.createEl("div",{cls:"live-preview-mode-template-field"});
            this.addSelectionField(livePreviewModeTemplateField, "./Note Folder/example-note.md");
        }
    }

    addPreviewSelection(container: HTMLElement){
        new Setting(container)
                .setName("Preview Mode Template Mirror Note")
                .setDesc("Selecione uma nota para ser espelhada no modo preview mode.")
                .setClass("toogle-header")
                .addToggle((cb) => {
                    cb
                        .setValue(this.plugin.settings.enable_global_preview_mode)
                        .onChange((value) => {
                            this.plugin.settings.enable_global_preview_mode = value;
                            this.plugin.saveSettings();
                            // Force refresh
                            this.display();
                        })
                })
            

            // Verificar se o toggle é true;
            if(!this.plugin.settings.enable_global_preview_mode){
                return;
            }
                
            const previewModeTemplateField = container.createEl("div",{cls:"preview-mode-template-field"});
            new Setting(previewModeTemplateField)
                    //.setName("teste")
                    .addSearch((cb) => {
                        new FileSuggest(this.app, cb.inputEl);
                        //new YamlPropertySuggest(this.app, cb.inputEl);
                        
                        //cb.setPlaceholder("Template")
                            /* .setValue(folder_template.template)
                            .onChange((new_template) => {
                                this.plugin.settings.folder_templates[
                                    index
                                ].template = new_template;
                                this.plugin.saveSettings();
                            }); */
                        // @ts-ignore
                        cb.containerEl.addClass("mirror_search");
                    })
            
    }

    addSelectionField(container: HTMLElement, descr: string = ""){

        new Setting(container)
            //.setDesc(descr)
            .addSearch((cb) => {
                new FileSuggest(this.app, cb.inputEl);
                //new YamlPropertySuggest(this.app, cb.inputEl);
                
                cb.setPlaceholder(descr)
                    /* .setValue(folder_template.template)
                    .onChange((new_template) => {
                        this.plugin.settings.folder_templates[
                            index
                        ].template = new_template;
                        this.plugin.saveSettings();
                    }); */
                // @ts-ignore
                cb.containerEl.addClass("mirror_search");
            })
    }
}
