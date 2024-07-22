import { App, Editor, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, MirrorUIPluginSettings, MirrorUISettingsTab } from './settings';

export default class MirrorUIPlugin extends Plugin {
    settings: MirrorUIPluginSettings;
	stopBuild: boolean;

    async onload() {
        console.log('[Mirror Notes] v13 loaded — SettingModel1');

        await this.loadSettings();
        this.addSettingTab(new MirrorUISettingsTab(this.app, this));


        this.registerEvent(this.app.workspace.on('file-open', await this.noteOpen.bind(this)));
        this.registerEvent(this.app.workspace.on('active-leaf-change', await this.activeNoteChange.bind(this)));
        this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				const leaves = this.app.workspace.getLeavesOfType("markdown");

				//Wait for the DOM to update before loading the preview mode apps
				setTimeout(() => {
					//loadPreviewModeApps(leaves);
                    this.noteLayoutChange(leaves.values);
                    console.log(leaves);

                    console.log(" ");
				}, 2);
			})
		);

         // verify criteria to show
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

    /**
     *
     * Começa aqui a refatoração.
     *
     *
     */

    async noteOpen() {      //(file: TFile)

        console.log("file-open")

        console.log("Quando usuário com 2 abas em uma leaf, troca de arquivo (+ active-leaf-change)")
        // console.log("Note Open")
        // console.log(this)
        console.log("----------------------------")
    }

    async activeNoteChange(file: Object) {

        console.log("active-leaf-change")
        // console.log("Mudou a Leaf - Focou em outra nota?")
        // console.log("Clicou file nav?")
        // console.log(this)
        console.log("Quando usuário com 2 abas em uma leaf, troca de arquivo por aba ou focus (+ file-open)")
        console.log("Quando usuário interage com browser de arquivos")
        console.log("----------------------------")

    }
    async noteLayoutChange(file: Object) {
		//console.log("applyMirrorPlugin(live_mode_note: string, preview_mode_note: string))")
        console.log("Layout-change")
        // console.log(this)
        console.log("-----  ****  ------");
    }

    async editorDrop(){
        console.log("editor-drop")
        // console.log(this)
        console.log("----------------------------")
    }




	async applyMirrorPlugin(live_mode_note: string, preview_mode_note: string) {
        console.log("applyMirrorPlugin(live_mode_note: string, preview_mode_note: string))")
        console.log("Aplicando Mirror Plugin?")
        //console.log(file.basename)
    }
    async rerender() {
		console.log("rerender()")
	}
    async eventLayoutChange(file_target: TFile) {
        console.log("eventLayoutChange(file_target: TFile)")
        console.log("Layout Change")
    }

    async addToolbarToActiveLeaf(file: TFile, file_target: TFile) {
        console.log("addToolbarToActiveLeaf(file: TFile, file_target: TFile)")
        console.log("Adicionou Toolbar na Active Leaf")
    }

    async removeToolbarFromActiveLeaf() {
        console.log("removeToolbarFromActiveLeaf()")
        console.log("Removeu")
    }

}
