import MirrorUIPlugin from '../main';
import { App, ButtonComponent, DropdownComponent, ExtraButtonComponent, Notice, PluginSettingTab, Setting } from "obsidian";
import { FileSuggest, FolderSuggest, YamlPropertySuggest } from '../utils/file-suggest';

export interface FolderTemplate {
    folder: string;
    template: string;
}

export interface CustomMirror {
    /* id: string;
    name: string;
    folder: string;
    template: string;
    filterFiles: Array<FolderTemplate>;
    filterFolders: Array<FolderTemplate>;
    filterProps: Array<FolderTemplate>;
    filterPropsValues: Array<FolderTemplate>; */

                            id: string;
                            name: string;
                            openview: boolean;
                            
                            enable_custom_live_preview_mode: boolean,
                            custom_settings_live_preview_note: string,
                            custom_settings_live_preview_pos: string,

                            enable_custom_preview_mode: boolean,
                            custom_settings_preview_note: string,
                            custom_settings_preview_pos: string,

                            custom_settings_overide: boolean,
                            custom_settings_hide_props: boolean

                            filterFiles: Array<FolderTemplate>;  // array com diversos nomes de arquivos
                            filterFolders: Array<FolderTemplate>; // array com diversos paths 
                            filterProps: Array<FolderTemplate>;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default',
    templates_folder: '',
    enable_folder_templates: true,
    folder_templates: [{ folder: "", template: "" }],
    user_scripts_folder: "",

    enable_getting_started: true,
    enable_global_settings: false,
    
    enable_custom_settings: false,

    filter_files: [{ folder: "", template: "" }],
    filter_folders: [{ folder: "", template: "" }],
    filter_props: [{ folder: "", template: "" }],
    filter_props_values: [{ folder: "", template: "" }],
    customMirrors: [], // Utilizar objeto para armazenar os dados dos cards

    global_settings: false,
    enable_global_live_preview_mode: false,
    global_settings_live_preview_note: "",
    global_settings_live_preview_pos: "top",
    enable_global_preview_mode: false,
    global_settings_preview_note: "",
    global_settings_preview_pos: "top",
    global_settings_overide: false,
    global_settings_hide_props: false
}

export interface MyPluginSettings {
    mySetting: string;
    templates_folder: string;
    enable_folder_templates: boolean;
    folder_templates: Array<FolderTemplate>;
    user_scripts_folder: string;

    enable_getting_started: boolean;
    enable_global_settings: boolean;
    enable_custom_settings: boolean;

    filter_files: Array<FolderTemplate>;
    filter_folders: Array<FolderTemplate>;
    filter_props: Array<FolderTemplate>;
    filter_props_values: Array<FolderTemplate>;
    customMirrors: Array<CustomMirror>; // Utilizar objeto para armazenar os dados dos cards

    global_settings: boolean;
    enable_global_live_preview_mode: boolean;
    global_settings_live_preview_note: string;
    global_settings_live_preview_pos: string;
    enable_global_preview_mode: boolean;
    global_settings_preview_note: string;
    global_settings_preview_pos: string;
    global_settings_overide: boolean;
    global_settings_hide_props: boolean;
}

export class SampleSettingTab extends PluginSettingTab {

    constructor(private plugin: MirrorUIPlugin) {
        //@ts-ignore
        super(app, plugin);
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        
        this.add_gettingStarted_banner();
        this.add_mirror_settings();

        //this.add_global_mirror();
       //this.containerEl.createEl("hr",{cls: "mirror-separator"});
        //this.add_custom_mirrors();

        /* new Setting(containerEl)
            .addButton( (button) => {
                button.setButtonText('Reset settings');
                button.onClick(() => {
                    // Handle reset settings logic
                });
            }); */
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
        globalSettings.createEl("hr",{cls: "divider"});
        //this.add_custom_mirrors();
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
    add_global_mirror(): void {
        const global_container = this.containerEl.createEl("div", {cls: "global-container"});
        const global_comp = global_container.createEl("div", { cls: "headers-toggleing" });

        this.addToggleHeader(global_comp, "Global Mirror Settings", "enable_global_settings");

        if (!this.plugin.settings.enable_global_settings) return;

        this.addStatsDescr(global_container, true);

        const globalMirrorSettings = this.containerEl.createEl("div", { cls: "global-mirror-settings" });
        
        this.createSelectionMirrorNotes(globalMirrorSettings);
        this.replaceMirror(globalMirrorSettings);
    }

    add_custom_mirrors(): void {
        const custom_container = this.containerEl.createEl("div", {cls: "custom-container"});
        const global_comp = custom_container.createEl("div", { cls: "headers-toggleing" });
        this.addToggleHeader(global_comp, "👋 Custom Mirror Settings", "enable_custom_settings");
        
        if (!this.plugin.settings.enable_custom_settings) return;

        this.addStatsDescr(custom_container);

        const cards = custom_container.createEl("div", { cls: "mirror-plugin-cards" });
        this.addCustomSettingCards(cards, 'customMirrors');
    }

/**
 * 
 Aquii  ***************************************************************
 */

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
                /* .addText(text => text
                    .setPlaceholder("Enter mirror name")
                    .setValue(customMirror.name)
                    .onChange((value) => {
                        customMirror.name = value;
                        this.plugin.saveSettings();
                    })
                ) */
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
                            //console.log(customMirrors[index].openview)
                            customMirrors[index].openview = !customMirrors[index].openview;
                            this.display();
                            //console.log(customMirrors[index].openview)
                            /* this.arraymove(folderTemplates, index, index + 1);
                            if(settingKey === "filter_props"){
                                this.arraymove(this.plugin.settings.filter_props_values, index, index + 1);
                            }
                            this.plugin.saveSettings();
                            this.display(); */
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
                            //.setValue(customMirrors[index].custom_settings_preview_note)
                            .onChange((value) => {
                                customMirrors[index].custom_settings_live_preview_note = value;
                                //this.plugin.settings.global_settings_live_preview_note = value;
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
                            //this.plugin.settings.global_settings_preview_pos = value;
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
            //if(this.plugin.settings.enable_global_preview_mode){
                
                new Setting(noteSetting)
                    .addSearch((cb) => {
                        new FileSuggest(this.app, cb.inputEl);
                        
                        cb.setPlaceholder("ex. folder/note-mirror.md")
                            .setValue(customMirrors[index].custom_settings_preview_note) 
                            .onChange((value) => {
                                customMirrors[index].custom_settings_preview_note = value;
                                //this.plugin.settings.global_settings_preview_note = value;
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
                            //this.plugin.settings.global_settings_live_preview_pos = value;
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
                            console.log(customMirrors[index].filterFiles)
                            customMirrors[index].filterFiles.push({
                                folder: "",
                                template: "",
                            })
                            /* this.plugin.settings.filter_files.push({
                                folder: "",
                                template: "",
                            }); */
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
            customMirrors[index].filterFiles.forEach((folder_template, index2) => {
            //folderTemplates.forEach((folder_template, index) => {
                const folderSelection = card.createEl("div", { cls: "global-note-selection-setting" });
                const s = new Setting(folderSelection)
                    .addSearch((cb) => {
                        //new FolderSuggest(this.app, cb.inputEl);
                        new FileSuggest(this.app, cb.inputEl);
                       /*  let myPlaceholder: string;
                        if (settingKey === "filter_files") {
                            new FileSuggest(this.app, cb.inputEl);
                            myPlaceholder = "Select a file";
                        } else if (settingKey === "filter_folders") {
                            new FolderSuggest(this.app, cb.inputEl);
                            myPlaceholder = "Select a folder";
                        } else if (settingKey === "filter_props") {
                            new YamlPropertySuggest(this.app, cb.inputEl);
                            myPlaceholder = "Select a property";
                        } else {
                            myPlaceholder = "N/A";
                        } */
                        
                        cb.setPlaceholder("placeholder")
                            .setValue(customMirrors[index].filterFiles[index2].folder)
                            .onChange((new_folder) => {
                                  /* if (new_folder && customMirrors.some((e) => e.folder === new_folder)) {
                                    new Notice("This folder already has a template associated with it");
                                    return;
                                } */
                                customMirrors[index].filterFiles[index2].folder= new_folder;
                                this.plugin.saveSettings();
                            });
                        //@ts-ignore
                        cb.inputEl.id = `input-${settingKey}-${index}`;
                        //@ts-ignore
                        //const clearButton = cb.containerEl.querySelector(".search-input-clear-button");
                        /* if (clearButton) {
                            clearButton.addEventListener("click", () => {
                                //@ts-ignore
                                this.clearAdjacentField(filterPropsValues, index);
                            });
                        } */
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
                                
                                console.log(index2)
                                /* if (settingKey === "filter_props" && filterPropsValues) {
                                    this.arraymove(filterPropsValues, index, index - 1);
                                } */
                                this.plugin.saveSettings();
                                this.display();
                            });
                    })
                    .addExtraButton((cb) => {
                        cb.setIcon("down-chevron-glyph")
                            .setTooltip("Move down")
                            .onClick(() => {
                                this.arraymove(customMirrors[index].filterFiles, index2, index2 + 1);
                                console.log(index2)
                                /* if (settingKey === "filter_props" && filterPropsValues) {
                                    this.arraymove(filterPropsValues, index, index + 1);
                                } */
                                this.plugin.saveSettings();
                                this.display();
                            });
                    })
                    .addExtraButton((cb) => {
                        cb.setIcon("cross")
                            .setTooltip("Delete")
                            .onClick(() => {
                                customMirrors[index].filterFiles.splice(index2, 1);
                                /* if (settingKey === "filter_props" && filterPropsValues) {
                                    filterPropsValues.splice(index, 1);
                                } */
                                this.plugin.saveSettings();
                                this.display();
                            });
                    });
                    s.infoEl.remove();
            })

            const folderSelection = card.createEl("div", { cls: "global-note-selection-setting" });
            
            //folderTemplates.forEach((folder_template, index) => {
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
                            //new FolderSuggest(this.app, cb.inputEl);
                            new FolderSuggest(this.app, cb.inputEl);
                           /*  let myPlaceholder: string;
                            if (settingKey === "filter_files") {
                                new FileSuggest(this.app, cb.inputEl);
                                myPlaceholder = "Select a file";
                            } else if (settingKey === "filter_folders") {
                                new FolderSuggest(this.app, cb.inputEl);
                                myPlaceholder = "Select a folder";
                            } else if (settingKey === "filter_props") {
                                new YamlPropertySuggest(this.app, cb.inputEl);
                                myPlaceholder = "Select a property";
                            } else {
                                myPlaceholder = "N/A";
                            } */
                            
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
                            //cb.inputEl.id = `input-${settingKey}-${index}`;
                            //@ts-ignore
                            //const clearButton = cb.containerEl.querySelector(".search-input-clear-button");
                            /* if (clearButton) {
                                clearButton.addEventListener("click", () => {
                                    //@ts-ignore
                                    this.clearAdjacentField(filterPropsValues, index);
                                });
                            } */
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
                                    
                                    console.log(index2)
                                    /* if (settingKey === "filter_props" && filterPropsValues) {
                                        this.arraymove(filterPropsValues, index, index - 1);
                                    } */
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("down-chevron-glyph")
                                .setTooltip("Move down")
                                .onClick(() => {
                                    this.arraymove(customMirrors[index].filterFolders, index2, index2 + 1);
                                    console.log(index2)
                                    /* if (settingKey === "filter_props" && filterPropsValues) {
                                        this.arraymove(filterPropsValues, index, index + 1);
                                    } */
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("cross")
                                .setTooltip("Delete")
                                .onClick(() => {
                                    customMirrors[index].filterFolders.splice(index2, 1);
                                    /* if (settingKey === "filter_props" && filterPropsValues) {
                                        filterPropsValues.splice(index, 1);
                                    } */
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
                            /* this.plugin.settings.filter_props.push({
                                folder: "",
                                template: "",
                            }); */
                            
                            this.plugin.saveSettings();
                            this.display();
                        });
                });

            customMirrors[index].filterProps.forEach((folder_template, index2) => {
                const folderSelection = card.createEl("div", { cls: "global-note-selection-setting" });
                const s = new Setting(folderSelection)
                    .addSearch((cb) => {
                        //new FolderSuggest(this.app, cb.inputEl);
                        new YamlPropertySuggest(this.app, cb.inputEl);
                        /*  let myPlaceholder: string;
                        if (settingKey === "filter_files") {
                            new FileSuggest(this.app, cb.inputEl);
                            myPlaceholder = "Select a file";
                        } else if (settingKey === "filter_folders") {
                            new FolderSuggest(this.app, cb.inputEl);
                            myPlaceholder = "Select a folder";
                        } else if (settingKey === "filter_props") {
                            new YamlPropertySuggest(this.app, cb.inputEl);
                            myPlaceholder = "Select a property";
                        } else {
                            myPlaceholder = "N/A";
                        } */
                            
                            cb.setPlaceholder("placeholder")
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
                            cb.setPlaceholder("placeholder")
                                .setValue(customMirrors[index].filterProps[index2].template)
                                .onChange((new_folder) => {
                                      /* if (new_folder && customMirrors.some((e) => e.folder === new_folder)) {
                                        new Notice("This folder already has a template associated with it");
                                        return;
                                    } */
                                    customMirrors[index].filterProps[index2].template= new_folder;
                                    this.plugin.saveSettings();
                                });
                            //@ts-ignore
                            cb.containerEl.addClass("templater_search");
                            cb.inputEl.id = `input-filter_props_values-${index2}`;
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("up-chevron-glyph")
                                .setTooltip("Move up")
                                .onClick(() => {
                                    if(index2 > 0){
                                        this.arraymove(customMirrors[index].filterProps, index2, index2 - 1);
                                    }
                                    
                                    console.log(index2)
                                    /* if (settingKey === "filter_props" && filterPropsValues) {
                                        this.arraymove(filterPropsValues, index, index - 1);
                                    } */
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("down-chevron-glyph")
                                .setTooltip("Move down")
                                .onClick(() => {
                                    this.arraymove(customMirrors[index].filterProps, index2, index2 + 1);
                                    console.log(index2)
                                    /* if (settingKey === "filter_props" && filterPropsValues) {
                                        this.arraymove(filterPropsValues, index, index + 1);
                                    } */
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("cross")
                                .setTooltip("Delete")
                                .onClick(() => {
                                    customMirrors[index].filterProps.splice(index2, 1);
                                    /* if (settingKey === "filter_props" && filterPropsValues) {
                                        filterPropsValues.splice(index, 1);
                                    } */
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
                        cb.setValue(customMirrors[index].custom_settings_overide)
                        .onChange((value) => {
                            //this.plugin.settings.global_settings_overide = value;
                            customMirrors[index].custom_settings_overide = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                    }) 
                    .setClass("toogle-header");
                
                new Setting(card)
                    .setName("Replace custom Mirrors")
                    .setDesc("Por padrão, custom Mirrors sobrescrevem o global Mirror. Com esta opção, o plugin irá sobrescrever os custom Mirros, a menos que estes estejam setados para sobrecrever esta função.")
                    .addToggle((cb) => {
                        
                        cb.setValue(customMirrors[index].custom_settings_hide_props)
                        .onChange((value) => {
                            customMirrors[index].custom_settings_hide_props = value;
                            this.plugin.saveSettings();
                            this.display();
                        });
                    })
                    .setClass("toogle-header");
            //this.addInputFilePath(card, customMirror.filterFolders, "filter_folders");
            //this.createSelectionMirrorNotes(card, customMirror);
           // this.addInputFilePath(card, customMirror.filterFiles, "filter_files");
            //this.addInputFilePath(card, customMirror.filterFolders, "filter_folders");
            //this.addInputFilePath(card, customMirror.filterProps, "filter_props", customMirror.filterPropsValues);
        });
    }

    createSelectionMirrorNotes(container: HTMLElement, customMirror?: CustomMirror): void {
        //@ts-ignore
        this.addTemplateSelection(container, customMirror, "enable_global_live_preview_mode", "Live Preview Mode Template Mirror Note", "./Note Folder/example-note.md");
        //@ts-ignore
        this.addTemplateSelection(container, customMirror, "enable_global_preview_mode", "Preview Mode Template Mirror Note", "./Note Folder/example-note.md");
    }

    addTemplateSelection(container: HTMLElement, customMirror: CustomMirror, settingKey: string, name: string, placeholder: string): void {
        new Setting(container)
            .setName(name)
            .setDesc(`Select a note for ${name.toLowerCase()}.`)
            .setClass("toogle-header")
            .addToggle((cb) => {
                //@ts-ignore
                cb.setValue(customMirror[settingKey])
                    .onChange((value) => {
                        //@ts-ignore
                        customMirror[settingKey] = value;
                        this.plugin.saveSettings();
                        this.display();
                    });
            });
            //@ts-ignore
        if (customMirror[settingKey]) {
            const templateField = container.createEl("div", { cls: `${name.toLowerCase().replace(/ /g, "-")}-template-field` });
            this.addSelectionField(templateField, placeholder);
        }
    }

    addInputFilePath(container: HTMLElement, folderTemplates: Array<FolderTemplate>, settingKey: string, filterPropsValues?: Array<FolderTemplate>): void {
        folderTemplates.forEach((folder_template, index) => {
            const s = new Setting(container)
                .addSearch((cb) => {
                    let myPlaceholder: string;
                    if (settingKey === "filter_files") {
                        new FileSuggest(this.app, cb.inputEl);
                        myPlaceholder = "Select a file";
                    } else if (settingKey === "filter_folders") {
                        new FolderSuggest(this.app, cb.inputEl);
                        myPlaceholder = "Select a folder";
                    } else if (settingKey === "filter_props") {
                        new YamlPropertySuggest(this.app, cb.inputEl);
                        myPlaceholder = "Select a property";
                    } else {
                        myPlaceholder = "N/A";
                    }
                    cb.setPlaceholder(myPlaceholder)
                        .setValue(folder_template.folder)
                        .onChange((new_folder) => {
                            if (new_folder && folderTemplates.some((e) => e.folder === new_folder)) {
                                new Notice("This folder already has a template associated with it");
                                return;
                            }
                            folderTemplates[index].folder = new_folder;
                            this.plugin.saveSettings();
                        });
                    //@ts-ignore
                    cb.inputEl.id = `input-${settingKey}-${index}`;
                    //@ts-ignore
                    const clearButton = cb.containerEl.querySelector(".search-input-clear-button");
                    if (clearButton) {
                        clearButton.addEventListener("click", () => {
                            //@ts-ignore
                            this.clearAdjacentField(filterPropsValues, index);
                        });
                    }
                    //@ts-ignore
                    cb.containerEl.addClass("templater_search");
                });
                if (settingKey === "filter_props" && filterPropsValues) {
                    s.addSearch((cb) => {
                        let myPlaceholder = "Select a property value";
                        new YamlPropertySuggest(this.app, cb.inputEl);
                        cb.setPlaceholder(myPlaceholder)
                            .setValue(filterPropsValues[index].folder)
                            .onChange((new_folder) => {
                                if (new_folder && filterPropsValues.some((e) => e.folder === new_folder)) {
                                    new Notice("This folder already has a template associated with it");
                                    return;
                                }
                                filterPropsValues[index].folder = new_folder;
                                this.plugin.saveSettings();
                            });
                        cb.inputEl.id = `input-filter_props_values-${index}`;
                        //@ts-ignore
                        cb.containerEl.addClass("templater_search");
                    });
                }
                s.addExtraButton((cb) => {
                    cb.setIcon("up-chevron-glyph")
                        .setTooltip("Move up")
                        .onClick(() => {
                            this.arraymove(folderTemplates, index, index - 1);
                            if (settingKey === "filter_props" && filterPropsValues) {
                                this.arraymove(filterPropsValues, index, index - 1);
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
                            if (settingKey === "filter_props" && filterPropsValues) {
                                this.arraymove(filterPropsValues, index, index + 1);
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
                            if (settingKey === "filter_props" && filterPropsValues) {
                                filterPropsValues.splice(index, 1);
                            }
                            this.plugin.saveSettings();
                            this.display();
                        });
                });
                s.infoEl.remove();
            });
        }
        
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
        
        addToggleHeader<K extends keyof MyPluginSettings>(container: HTMLElement, title: string, settingPath: K): void {
            const global_header = container.createEl("div");
            global_header.createEl("h1", { text: title });
        
            if (typeof this.plugin.settings[settingPath] === "boolean") {
                new Setting(container)
                    .addToggle((cb) => {
                        cb.setValue(this.plugin.settings[settingPath] as boolean)
                            .onChange((value) => {
                                this.plugin.settings[settingPath] = value as MyPluginSettings[K];
                                this.plugin.saveSettings();
                                this.display();
                            });
                    })
                    .setClass("toggle-header");
            }
        }
        
        addStatsDescr(container: HTMLElement, globalComp: boolean = false): void {
            if (globalComp) {
                const globalDescription = container.createEl("div");
                new Setting(globalDescription)
                    .setDesc("Arquivos globais estão sendo pegos assim assado. TESTE");
            } else {
                const customDescription = this.containerEl.createEl("div");
                new Setting(container)
                    .setName("Add new")
                    .setDesc("Arquivos globais estão sendo pegos assim assado.")
                    .addButton((button: ButtonComponent) => {
                        button
                            .setTooltip("Add additional folder template")
                            .setButtonText("Add New Mirror")
                            .setCta()
                            .onClick(() => {
                                this.plugin.settings.customMirrors.push({
                                   /*  id: crypto.randomUUID(),
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
                                });
                                this.plugin.saveSettings();
                                this.display();
                            });
                    });
            }
        }
        
        replaceMirror(container: HTMLElement, globalComp: boolean = false): void {
            if (globalComp) {
                new Setting(container)
                    .setName("Replace custom Mirrors")
                    .setDesc("Por padrão, custom Mirrors sobrescrevem o global Mirror. Com esta opção, o plugin irá sobrescrever os custom Mirros, a menos que estes estejam setados para sobrecrever esta função.")
                    .addToggle((cb) => {})
                    .setClass("toogle-header");
            } else {
                new Setting(container)
                    .setName("Replace custom Mirrors")
                    .setDesc("Se TRUE, sobrescreve o mirror global setado como subrescrever")
                    .addToggle((cb) => {})
                    .setClass("toogle-header");
            }
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