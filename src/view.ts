import { ItemView, Setting } from "obsidian";

export const MIRROR_UI_VIEW_TYPE = "mirror-ui-view";

export class MirrorUIView extends ItemView{
    getViewType(): string {
        return "mirror-ui-view";
    }
    getDisplayText(): string {
        return "Mirror UI Title - Emergency Contact";
    }
    

    async onOpen(){
        
        const { contentEl } = this;
        contentEl.createEl("h1", {text:"Emergeny contact"})

        new Setting(contentEl).setName("Ghostbusters").addButton(item => {
            item.setButtonText("Call");
        });
    }
};
