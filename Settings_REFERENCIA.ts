import MyPlugin from "main";
import { App, ButtonComponent, DropdownComponent, PluginSettingTab, Setting } from "obsidian";
import { FileSuggest, FolderSuggest, YamlPropertySuggest } from "utils/file-suggest";

export interface FolderTemplate {
    folder: string;
    template: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {

    enable_getting_started: true,

    global_settings: false,
    enable_global_live_preview_mode: false,
    global_settings_live_preview_note: "",
    global_settings_live_preview_pos: "top",
    enable_global_preview_mode: false,
    global_settings_preview_note: "",
    global_settings_preview_pos: "top",
    global_settings_overide: false,
    global_settings_hide_props: false,
    customMirrors: [] // Utilizar objeto para armazenar os dados dos cards
}

export interface MyPluginSettings {

    enable_getting_started: boolean;

    global_settings: boolean;
    enable_global_live_preview_mode: boolean;
    global_settings_live_preview_note: string;
    global_settings_live_preview_pos: string;
    enable_global_preview_mode: boolean;
    global_settings_preview_note: string;
    global_settings_preview_pos: string;
    global_settings_overide: boolean;
    global_settings_hide_props: boolean;

    customMirrors: Array<CustomMirror>; // Utilizar objeto para armazenar os dados dos cards
}

export interface CustomMirror {

    id: string;
    name: string;
    openview: boolean;
    
    enable_custom_live_preview_mode: boolean;
    custom_settings_live_preview_note: string;
    custom_settings_live_preview_pos: string;

    enable_custom_preview_mode: boolean;
    custom_settings_preview_note: string;
    custom_settings_preview_pos: string;

    custom_settings_overide: boolean;
    custom_settings_hide_props: boolean;

    filterFiles: Array<FolderTemplate>;  // array com diversos nomes de arquivos
    filterFolders: Array<FolderTemplate>; // array com diversos paths 
    filterProps: Array<FolderTemplate>;
}

export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;
    constructor(app: App, plugin: MyPlugin) {
        //@ts-ignore
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        
        this.add_gettingStarted_banner();
        this.add_mirror_settings();
    }

    add_gettingStarted_banner(): void {
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

    add_mirror_settings(){
        const mirrorSettings_main = this.containerEl.createEl("div", {cls: "mirror-settings_main"});
        mirrorSettings_main.createEl("h1", {text:"🎛️ Mirror Plugin Settings"})
        const globalSettings = mirrorSettings_main.createEl("div", {cls: "mirror-settings-global-settings"}); //mirror-settings_global-settings
        const customSettings = mirrorSettings_main.createEl("div", {cls: "mirror-settings-custom-settings"}); //mirror-settings_global-settings

        new Setting(globalSettings)
            .setName("Global Mirror")
            .setDesc("If ON, the selected files will be mirrored in all notes in this vault.")
                .addToggle((cb) => {
                    cb.setValue(this.plugin.settings.global_settings)
                        .onChange((value) => {
                            this.plugin.settings.global_settings = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
                .setClass("toggle-header");
        
        
        if (this.plugin.settings.global_settings) {

            const globalMirrorSettings = globalSettings.createEl("div", { cls: "global-mirror-settings" });
            
            new Setting(globalMirrorSettings)
                .setName("Live Preview Mode Template Mirror Note")
                .setDesc(`Select a note to show in Live Preview Mode.`)
                .setClass("toogle-header")
                .addToggle((cb) => {
                    cb.setValue(this.plugin.settings.enable_global_live_preview_mode)
                        .onChange((value) => {
                            this.plugin.settings.enable_global_live_preview_mode = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
                
                
                if(this.plugin.settings.enable_global_live_preview_mode){
                    const noteSetting = globalMirrorSettings.createEl("div", { cls: "global-note-selection-setting" });
                    new Setting(noteSetting)
                        .addSearch((cb) => {
                            new FileSuggest(this.app, cb.inputEl);
                            
                            cb.setPlaceholder("ex. folder/note-mirror.md")
                                .setValue(this.plugin.settings.global_settings_live_preview_note)
                                .onChange((value) => {
                                    
                                    this.plugin.settings.global_settings_live_preview_note = value;
                                    this.plugin.saveSettings();
                                });
                            // @ts-ignore
                            cb.containerEl.addClass("full-width-input");
                            
                        })
                        .addDropdown((cb: DropdownComponent) => {
                            cb.addOption("top", "Top of note")
                            cb.addOption("bottom", "Bottom of note")
                            cb.addOption("left", "Left of note")
                            cb.addOption("right", "Right of note")
                            cb.setValue(this.plugin.settings.global_settings_preview_pos);
                            cb.onChange(async (value) => {
                                
                                this.plugin.settings.global_settings_preview_pos = value;
                                await this.plugin.saveSettings();
                                
                            });
                        })
                        .infoEl.remove();
                }

                new Setting(globalMirrorSettings)
                    .setName("Preview Mode Template Mirror Note.")
                    .setDesc(`Select a note to show in Preview Mode.`)
                    .setClass("toogle-header")
                    .addToggle((cb) => {
                        cb.setValue(this.plugin.settings.enable_global_preview_mode)
                            .onChange((value) => {
                                this.plugin.settings.enable_global_preview_mode = value;
                                this.plugin.saveSettings();
                                this.display();
                            });
                    });

                if(this.plugin.settings.enable_global_preview_mode){
                    const noteSetting = globalMirrorSettings.createEl("div", { cls: "global-note-selection-setting" });
                    new Setting(noteSetting)
                        .addSearch((cb) => {
                            new FileSuggest(this.app, cb.inputEl);
                            
                            cb.setPlaceholder("ex. folder/note-mirror.md")
                                .setValue(this.plugin.settings.global_settings_preview_note)
                                .onChange((value) => {
                                    
                                    this.plugin.settings.global_settings_preview_note = value;
                                    this.plugin.saveSettings();
                                });
                            // @ts-ignore
                            cb.containerEl.addClass("full-width-input");
                            
                        })
                        .addDropdown((cb: DropdownComponent) => {
                            cb.addOption("top", "Top of note")
                            cb.addOption("bottom", "Bottom of note")
                            cb.addOption("left", "Left of note")
                            cb.addOption("right", "Right of note")
                            cb.setValue(this.plugin.settings.global_settings_live_preview_pos);
                            cb.onChange(async (value) => {
                                this.plugin.settings.global_settings_live_preview_pos = value;
                                await this.plugin.saveSettings();
                            });
                        })
                        .infoEl.remove();
                }
                new Setting(globalMirrorSettings)
                    .setName("Hide properties")
                    .setDesc("If set ON, it hides the properties on the target pages.")
                    .addToggle((cb) => {
                        cb.setValue(this.plugin.settings.global_settings_overide)
                        .onChange((value) => {
                            this.plugin.settings.global_settings_overide = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                    }) 
                    .setClass("toogle-header");
                
                new Setting(globalMirrorSettings)
                    .setName("Replace custom Mirrors")
                    .setDesc("Por padrão, custom Mirrors sobrescrevem o global Mirror. Com esta opção, o plugin irá sobrescrever os custom Mirros, a menos que estes estejam setados para sobrecrever esta função.")
                    .addToggle((cb) => {
                        cb.setValue(this.plugin.settings.global_settings_hide_props)
                        .onChange((value) => {
                            this.plugin.settings.global_settings_hide_props = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                    })
                    .setClass("toogle-header");
        };
        
        new Setting(customSettings)
            .setName("Custom Mirrors")
            .setDesc("Select files to be shown in selected notes by properties, folders or filenames.")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional folder template")
                    .setButtonText("Add New Mirror")
                    .setCta()
                    .onClick(() => {
                        this.plugin.settings.customMirrors.push({
                            /* id: crypto.randomUUID(),
                            name: `Mirror ${this.plugin.settings.customMirrors.length + 1}`,
                            folder: "",
                            template: "",
                            filterFiles: [],
                            filterFolders: [],
                            filterProps: [],
                            filterPropsValues: [] */

                            
                            id: crypto.randomUUID(),
                            name: `Mirror ${this.plugin.settings.customMirrors.length + 1}`,
                            openview: true,

                            enable_custom_live_preview_mode: false,
                            custom_settings_live_preview_note: "",
                            custom_settings_live_preview_pos: "top",

                            enable_custom_preview_mode: false,
                            custom_settings_preview_note: "",
                            custom_settings_preview_pos: "top",

                            custom_settings_overide: false,
                            custom_settings_hide_props: false,

                            filterFiles: [],  // array com diversos nomes de arquivos
                            filterFolders: [], // array com diversos paths 
                            filterProps: [], // array de arrays [prop, value] => 
                            
                           
                            // [0] : new entry
                            // [0][0] : prop = projects
                            // [0][1] : value = projectname



                        });
                        this.plugin.saveSettings();
                        this.display();
                    });
            });
        globalSettings.createEl("hr",{cls: "mirror-separator"});

        const cards = customSettings.createEl("div", { cls: "mirror-plugin-cards" });
        this.addCustomSettingCards(cards, 'customMirrors');

        new Setting(mirrorSettings_main)
            .addButton( (button) => {
                button.setButtonText('Reset settings');
                button.onClick(async () => {
                    await this.plugin.resetSettings();
                    this.display();
                });
            })
            .setClass("mirror-reset");
    }

    addCustomSettingCards(container: HTMLElement, settingKey: keyof MyPluginSettings): void {
        const customMirrors = this.plugin.settings[settingKey] as Array<CustomMirror>;
        customMirrors.forEach((customMirror, index) => {
            const card = container.createEl("div", { cls: "mirror-card" });

            let dynamicIcon: string = "";
            if(!customMirrors[index].openview){
                dynamicIcon = "chevrons-up-down"
            } else {
                dynamicIcon = "chevrons-down-up"
                
            }
            
            new Setting(card)
                .setName(customMirror.name)
                .addExtraButton((cb) => {
                    cb.setIcon("up-chevron-glyph")
                        .setTooltip("Move up")
                        .onClick(() => {
                            this.arraymove(customMirrors, index, index - 1);
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("down-chevron-glyph")
                        .setTooltip("Move down")
                        .onClick(() => {
                            this.arraymove(customMirrors, index, index + 1);
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon(dynamicIcon)
                        .setTooltip("Colapse")
                        .onClick(() => {
                            customMirrors[index].openview = !customMirrors[index].openview;
                            this.display();
                        })
                })
                .addExtraButton((cb) => {
                    cb.setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            customMirrors.splice(index, 1);
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
            
            if(!customMirrors[index].openview) return;

            const globalMirrorSettings = card.createEl("div", { cls: "global-mirror-settings" });
            
            new Setting(globalMirrorSettings)
                .setName("Live Preview Mode Template Mirror Note")
                .setDesc(`Select a note to show in Live Preview Mode.`)
                .setClass("toogle-header")
                .addToggle((cb) => {
                    cb.setValue(customMirrors[index].enable_custom_live_preview_mode) 
                        .onChange((value) => {
                            customMirrors[index].enable_custom_live_preview_mode = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                })
            
            if(customMirrors[index].enable_custom_live_preview_mode){
                const noteSetting = globalMirrorSettings.createEl("div", { cls: "global-note-selection-setting" });
                new Setting(noteSetting)
                    .addSearch((cb) => {

                        new FileSuggest(this.app, cb.inputEl);
                        
                        cb.setPlaceholder("ex. folder/note-mirror.md")
                            .setValue(customMirrors[index].custom_settings_live_preview_note) 
                            .onChange((value) => {
                                customMirrors[index].custom_settings_live_preview_note = value;
                                this.plugin.saveSettings();
                            });
                        // @ts-ignore
                        cb.containerEl.addClass("full-width-input");
                        
                    })
                    .addDropdown((cb: DropdownComponent) => {
                        cb.addOption("top", "Top of note")
                        cb.addOption("bottom", "Bottom of note")
                        cb.addOption("left", "Left of note")
                        cb.addOption("right", "Right of note")
                        cb.setValue(customMirrors[index].custom_settings_live_preview_pos);
                        cb.onChange(async (value) => {
                            customMirrors[index].custom_settings_live_preview_pos = value;
                            await this.plugin.saveSettings();
                            
                        });
                    })
                    .infoEl.remove();
            }
            
            new Setting(globalMirrorSettings)
                .setName("Preview Mode Template Mirror Note.")
                .setDesc(`Select a note to show in Preview Mode.`)
                .setClass("toogle-header")
                .addToggle((cb) => {
                    cb.setValue(customMirrors[index].enable_custom_preview_mode) 
                        .onChange((value) => {
                            
                            customMirrors[index].enable_custom_preview_mode = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
            const noteSetting = globalMirrorSettings.createEl("div", { cls: "global-note-selection-setting" });
            if (customMirrors[index].enable_custom_preview_mode){
                
                new Setting(noteSetting)
                    .addSearch((cb) => {
                        new FileSuggest(this.app, cb.inputEl);
                        
                        cb.setPlaceholder("ex. folder/note-mirror.md")
                            .setValue(customMirrors[index].custom_settings_preview_note) 
                            .onChange((value) => {

                                customMirrors[index].custom_settings_preview_note = value;
                                this.plugin.saveSettings();
                            });
                        // @ts-ignore
                        cb.containerEl.addClass("full-width-input");
                        
                    })
                    .addDropdown((cb: DropdownComponent) => {
                        cb.addOption("top", "Top of note")
                        cb.addOption("bottom", "Bottom of note")
                        cb.addOption("left", "Left of note")
                        cb.addOption("right", "Right of note")
                        cb.setValue(customMirrors[index].custom_settings_preview_pos);
                        cb.onChange(async (value) => {
                            customMirrors[index].custom_settings_preview_pos = value;
                            await this.plugin.saveSettings();
                        });
                    })
                    .infoEl.remove();
            }
            new Setting(card)
                .setName("Filter by Filename")
                .setDesc("If there are diferent files with the same filename, both are will be considered in the filter. Ex. ./note.md and ./folder/note.md.")
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                        .setTooltip("Add New Filename")
                        .onClick(() => {
                            //console.log(customMirrors[index].filterFiles)
                            customMirrors[index].filterFiles.push({
                                folder: "",
                                template: "",
                            })
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
            customMirrors[index].filterFiles.forEach((folder_template, index2) => {
            //folderTemplates.forEach((folder_template, index) => {
                const folderSelection = card.createEl("div", { cls: "global-note-selection-setting" });
                const s = new Setting(folderSelection)
                    .addSearch((cb) => {

                        new FileSuggest(this.app, cb.inputEl);
                        
                        cb.setPlaceholder("placeholder")
                            .setValue(customMirrors[index].filterFiles[index2].folder)
                            .onChange((new_folder) => {
                                customMirrors[index].filterFiles[index2].folder= new_folder;
                                this.plugin.saveSettings();
                            });
                        //@ts-ignore
                        cb.inputEl.id = `input-${settingKey}-${index}`;
                        //@ts-ignore
                        cb.containerEl.addClass("templater_search");
                    });
                    s.addExtraButton((cb) => {
                        cb.setIcon("up-chevron-glyph")
                            .setTooltip("Move up")
                            .onClick(() => {
                                if(index2 > 0){
                                    this.arraymove(customMirrors[index].filterFiles, index2, index2 - 1);
                                }
                                this.plugin.saveSettings();
                                this.display();
                            });
                    })
                    .addExtraButton((cb) => {
                        cb.setIcon("down-chevron-glyph")
                            .setTooltip("Move down")
                            .onClick(() => {
                                this.arraymove(customMirrors[index].filterFiles, index2, index2 + 1);
                                this.plugin.saveSettings();
                                this.display();
                            });
                    })
                    .addExtraButton((cb) => {
                        cb.setIcon("cross")
                            .setTooltip("Delete")
                            .onClick(() => {
                                customMirrors[index].filterFiles.splice(index2, 1);
                                this.plugin.saveSettings();
                                this.display();
                            });
                    });
                    s.infoEl.remove();
            })

            
            new Setting(card)
                .setName("Filter by Folder path")
                .setDesc("Arquivos globais estão sendo pegos assim por folder path.")
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                    .setTooltip("Add New Folder")
                    .onClick(() => {
                        customMirrors[index].filterFolders.push({
                            folder: "",
                            template: "",
                        });
                        this.plugin.saveSettings();
                        this.display();
                    });
                });

                customMirrors[index].filterFolders.forEach((folder_template, index2) => {
                    const folderSelection = card.createEl("div", { cls: "global-note-selection-setting" });
                    const s = new Setting(folderSelection)
                        .addSearch((cb) => {

                            new FolderSuggest(this.app, cb.inputEl);

                            cb.setPlaceholder("placeholder")
                                .setValue(customMirrors[index].filterFolders[index2].folder)
                                .onChange((new_folder) => {
                                      /* if (new_folder && customMirrors.some((e) => e.folder === new_folder)) {
                                        new Notice("This folder already has a template associated with it");
                                        return;
                                    } */
                                    customMirrors[index].filterFolders[index2].folder= new_folder;
                                    this.plugin.saveSettings();
                                });
                            //@ts-ignore
                            cb.containerEl.addClass("templater_search");
                        });
                        s.addExtraButton((cb) => {
                            cb.setIcon("up-chevron-glyph")
                                .setTooltip("Move up")
                                .onClick(() => {
                                    if(index2 > 0){
                                        this.arraymove(customMirrors[index].filterFolders, index2, index2 - 1);
                                    }
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("down-chevron-glyph")
                                .setTooltip("Move down")
                                .onClick(() => {
                                    this.arraymove(customMirrors[index].filterFolders, index2, index2 + 1);
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("cross")
                                .setTooltip("Delete")
                                .onClick(() => {

                                    customMirrors[index].filterFolders.splice(index2, 1);
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        });
                        s.infoEl.remove();
                });
            
            new Setting(card)
                .setName("Filter by Properties")
                .setDesc("Arquivos globais estão sendo pegos assim por folder path.")
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                        .setTooltip("Add New Property")
                        .onClick(() => {
                            customMirrors[index].filterProps.push({
                                folder: "",
                                template: "",
                            });
                            
                            this.plugin.saveSettings();
                            this.display();
                        });
                });

            customMirrors[index].filterProps.forEach((folder_template, index2) => {
                const folderSelection = card.createEl("div", { cls: "global-note-selection-setting" });
                const s = new Setting(folderSelection)
                    .addSearch((cb) => {

                        new YamlPropertySuggest(this.app, cb.inputEl);
                            cb.setPlaceholder("Select a YAML property")
                                .setValue(customMirrors[index].filterProps[index2].folder)
                                .onChange((new_folder) => {
                                      /* if (new_folder && customMirrors.some((e) => e.folder === new_folder)) {
                                        new Notice("This folder already has a template associated with it");
                                        return;
                                    } */
                                    customMirrors[index].filterProps[index2].folder= new_folder;
                                    this.plugin.saveSettings();
                                });
                            //@ts-ignore
                            cb.inputEl.id = `input-${settingKey}-${index}`;
                            //@ts-ignore
                            const clearButton = cb.containerEl.querySelector(".search-input-clear-button");
                             if (clearButton) {
                                clearButton.addEventListener("click", () => {
                                    //@ts-ignore
                                    this.clearAdjacentField(customMirrors[index].filterProps, index2);
                                });
                            }
                            //@ts-ignore
                            cb.containerEl.addClass("templater_search");
                        });
                        s.addSearch((cb) => {
                            new YamlPropertySuggest(this.app, cb.inputEl);
                            cb.setPlaceholder("Type or select a value.")
                                .setValue(customMirrors[index].filterProps[index2].template)
                                .onChange((new_folder) => {
                                    
                                    customMirrors[index].filterProps[index2].template= new_folder;
                                    this.plugin.saveSettings();
                                });
                            //@ts-ignore
                            cb.containerEl.addClass("templater_search");

                            // ### Parte importante para encontrar o campo correlato e apagar a informação;;
                            cb.inputEl.id = `input-filter_props_values-${index2}`;

                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("up-chevron-glyph")
                                .setTooltip("Move up")
                                .onClick(() => {

                                    if(index2 > 0){
                                        this.arraymove(customMirrors[index].filterProps, index2, index2 - 1);
                                        this.plugin.saveSettings();
                                        this.display();
                                    }
                                    
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("down-chevron-glyph")
                                .setTooltip("Move down")
                                .onClick(() => {

                                    this.arraymove(customMirrors[index].filterProps, index2, index2 + 1);
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("cross")
                                .setTooltip("Delete")
                                .onClick(() => {

                                    customMirrors[index].filterProps.splice(index2, 1);
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        });
                        s.infoEl.remove();
                });
                new Setting(card)
                    .setName("Hide properties")
                    .setDesc("If set ON, it hides the properties on the target pages.")
                    .addToggle((cb) => {
                        cb.setValue(customMirrors[index].custom_settings_hide_props)
                        .onChange((value) => {

                            customMirrors[index].custom_settings_hide_props = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                    }) 
                    .setClass("toogle-header");
                
                new Setting(card)
                    .setName("Replace global mirror overide")
                    .setDesc("Se o global mirror estiver com a opção de sobrescrever as custom mirrors, este botão se habilitado ignora a substituição para este mirror.")
                    .addToggle((cb) => {
                        cb
                            .setValue(customMirrors[index].custom_settings_overide)
                            .onChange((value) => {
                                customMirrors[index].custom_settings_overide = value;
                                this.plugin.saveSettings();
                                this.display();
                            });
                    })
                    .setClass("toogle-header");
        });
    }

/**
 * Utils Functions
 * 
 * 
 */

    clearAdjacentField(filterPropsValues: Array<FolderTemplate>, index: number): void {
        const adjacentInput = document.querySelector(`#input-filter_props_values-${index}`) as HTMLInputElement;
        if (adjacentInput) {
            adjacentInput.value = "";
            filterPropsValues[index].folder = "";
            this.plugin.saveSettings();
        }
    }
    
    arraymove(arr: any[], fromIndex: number, toIndex: number): void {
        const element = arr[fromIndex];
        arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, element);
    }
}