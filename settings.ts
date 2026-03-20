import MirrorUIPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { Logger } from './src/dev/logger';
import { buildGlobalSection } from './src/settings/globalSection';
import { buildCustomMirrorsSection } from './src/settings/customCards';

// Re-export types for backwards compatibility (consumers import from './settings')
export type { FolderTemplate, MirrorUIPluginSettings, CustomMirror, Condition, ConditionType, ConditionLogic } from './src/settings/types';
export { DEFAULT_SETTINGS, DEFAULT_VIEW_OVERRIDES } from './src/settings/types';

export class MirrorUISettingsTab extends PluginSettingTab {
    plugin: MirrorUIPlugin;
    constructor(app: App, plugin: MirrorUIPlugin) {
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
            banner.createEl("h1", { text: "Getting Started with Mirror Notes Plugin"});
            banner.createEl("p",{text:'Mirror Notes introduces a new way to think about templates in Obsidian. Define a single template for a group of notes — when you update the template, all linked notes update automatically.'})
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
        mirrorSettings_main.createEl("h1", {text:"Mirror Plugin Settings"})

        // DEV-ONLY TOGGLE: descomentar o if (__DEV__) pra esconder este toggle
        // da interface em builds de producao. Enquanto estiver comentado, o toggle
        // aparece sempre — mas o logger e no-op em prod (metodos retornam early).
        // if (__DEV__) {
        new Setting(mirrorSettings_main)
            .setName("Debug logging")
            .setDesc("Write logs to debug.log for troubleshooting.")
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.debug_logging)
                    .onChange((value) => {
                        this.plugin.settings.debug_logging = value;
                        this.plugin.saveSettings();
                        Logger.setEnabled(value);
                    });
            });
        // }

        const globalSettings = mirrorSettings_main.createEl("div", {cls: "mirror-settings-global-settings"});
        const customSettings = mirrorSettings_main.createEl("div", {cls: "mirror-settings-custom-settings"});

        const onSave = () => this.plugin.saveSettings();
        const onRedisplay = () => this.display();

        buildGlobalSection({ app: this.app, plugin: this.plugin, container: globalSettings, onSave, onRedisplay });
        buildCustomMirrorsSection({ app: this.app, plugin: this.plugin, container: customSettings, onSave, onRedisplay });

        globalSettings.createEl("hr",{cls: "mirror-separator"});

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
}
