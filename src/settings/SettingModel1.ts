import MirrorUIPlugin from "../main";
import { App, ButtonComponent, Notice, PluginSettingTab, Setting } from "obsidian";
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
    user_scripts_folder: ""
}

export interface MyPluginSettings {
    
	// apagar?
    mySetting: string;
    templates_folder: string;
    enable_folder_templates: boolean;
    folder_templates: Array<FolderTemplate>;
    user_scripts_folder: string;
}

export class SampleSettingTab extends PluginSettingTab {
    
	constructor(private plugin: MirrorUIPlugin) {
        //@ts-ignore
		super(app, plugin);
	}
    display(): void {
        const {containerEl} = this;
		containerEl.empty();
        this.add_header_settings();
        this.add_folder_templates_setting();
            
    }

    add_header_settings():void{
        this.containerEl.createEl('h1', { text: '💎 Mirror Notes into Notes' });
        const descHeading = document.createDocumentFragment();
        descHeading.append(
            "Permite inserir uma nota existente em outra nota",
            descHeading.createEl("p", { text: " " }),
            "Criar notas com cabeçalhos, menus de navegação ou qualquer conteúdo fixo que precisa ser reutilizado em várias notas sem a necessidade de replicar o conteúdo dentro do arquivo.",
            descHeading.createEl("br"),
            "Templater will fill the empty file with the specified template.",
            descHeading.createEl("br", { text: " " }),
        );
        //new Setting(this.containerEl).setDesc(descHeading);
        this.containerEl.createEl('p',{text: descHeading});
    }

    add_folder_templates_setting(): void {
         this.containerEl.createEl("h2", { text: "My Mirrors" });
        //new Setting(this.containerEl).setName("My Mirrors").setHeading(); 

        const descHeading = document.createDocumentFragment();
        descHeading.append(
            "Create a Mirror to some files filtered by folders, tags and/or (yaml)properties ",
            descHeading.createEl("strong", { text: "empty " }),
            "Global Mirror will be used at all notes in the vault, but not global mirrors will be replace this settings.",
            descHeading.createEl("br"),
            "If you want to the global settings replace all the other Mirrors, toggle Global Replacemnt.",
            descHeading.createEl("br"),
            "The deepest match is used. A global default template would be defined on the root ",
            descHeading.createEl("code", { text: "/" }),
            "."
        );
        new Setting(this.containerEl)
            .setName("Add new")
            .setDesc(descHeading)
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional folder template")
                    .setButtonText("+")
                    .setCta()
                    .onClick(() => {
                        this.plugin.settings.folder_templates.push({
                            folder: "",
                            template: "",
                        });
                        this.plugin.saveSettings();
                        this.display();
                    });
            });

        //new Setting(this.containerEl).setDesc(descHeading);

        const descUseNewFileTemplate = document.createDocumentFragment();
        descUseNewFileTemplate.append(
            "When enabled Templater will make use of the folder templates defined below."
        );

        new Setting(this.containerEl)
        .setName("Enable folder templates")
        .setDesc("Sei la.") //descUseNewFileTemplate)
        .addToggle((toggle) => {
            toggle
                .setValue(this.plugin.settings.enable_folder_templates)
                .onChange((use_new_file_templates) => {
                    this.plugin.settings.enable_folder_templates = use_new_file_templates;
                    this.plugin.saveSettings();
                    // Force refresh
                    this.display();
                });
        });

        if (!this.plugin.settings.enable_folder_templates) {
            return;
        }

        new Setting(this.containerEl)
            .setName("Add new")
            .setDesc("Add new folder template")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional folder template")
                    .setButtonText("+")
                    .setCta()
                    .onClick(() => {
                        this.plugin.settings.folder_templates.push({
                            folder: "",
                            template: "",
                        });
                        this.plugin.saveSettings();
                        this.display();
                    });
            });

            this.plugin.settings.folder_templates.forEach(
                (folder_template, index) => {
                    const s = new Setting(this.containerEl)
                        .addSearch((cb) => {
                            //new FolderSuggest(cb.inputEl);
                            //new FileSuggest(this.app, cb.inputEl);
                            new FolderSuggest(this.app, cb.inputEl);
                            cb.setPlaceholder("Folder")
                                .setValue(folder_template.folder)
                                .onChange((new_folder) => {
                                    if (
                                        new_folder &&
                                        this.plugin.settings.folder_templates.some(
                                            (e) => e.folder == new_folder
                                        )
                                    ) {
                                        //log_error(
                                        //    new Notice("This folder already has a template associated with it"
                                        //    )
                                        //);
                                        return;
                                    }
    
                                    this.plugin.settings.folder_templates[
                                        index
                                    ].folder = new_folder;
                                    this.plugin.saveSettings();
                                });
                            // @ts-ignore
                            cb.containerEl.addClass("templater_search");
                        })
                        .addSearch((cb) => {
                            //new FileSuggest(this.app, cb.inputEl);
                            new YamlPropertySuggest(this.app, cb.inputEl);
                            /* new FileSuggest(
                                cb.inputEl,
                                this.plugin,
                                FileSuggestMode.TemplateFiles
                                new FileSuggest(app, inputEl);
                            ); */
                            cb.setPlaceholder("Template")
                                .setValue(folder_template.template)
                                .onChange((new_template) => {
                                    this.plugin.settings.folder_templates[
                                        index
                                    ].template = new_template;
                                    this.plugin.saveSettings();
                                });
                            // @ts-ignore
                            cb.containerEl.addClass("templater_search");
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("up-chevron-glyph")
                                .setTooltip("Move up")
                                .onClick(() => {
                                    /* arraymove(
                                        this.plugin.settings.folder_templates,
                                        index,
                                        index - 1
                                    ); */
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("down-chevron-glyph")
                                .setTooltip("Move down")
                                .onClick(() => {
                                    /* arraymove(
                                        this.plugin.settings.folder_templates,
                                        index,
                                        index + 1
                                    ); */
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        })
                        .addExtraButton((cb) => {
                            cb.setIcon("cross")
                                .setTooltip("Delete")
                                .onClick(() => {
                                    this.plugin.settings.folder_templates.splice(
                                        index,
                                        1
                                    );
                                    this.plugin.saveSettings();
                                    this.display();
                                });
                        });
                    s.infoEl.remove();
                }
            );
        
    }
}


		