import { App, PluginSettingTab } from "obsidian";

export class mirrorSeetingsTab extends PluginSettingTab {
    constructor(app: App, plugin: any) {
        super(app, plugin);
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Mirror UI Settings" });
    }
}
