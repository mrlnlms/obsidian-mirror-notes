import { App, DropdownComponent, Setting } from 'obsidian';
import { FileSuggest } from '../suggesters/file-suggest';
import { addPathValidation } from './pathValidator';
import { addSearchClass } from '../utils/obsidianInternals';

/** Position dropdown options with visual labels */
export function addPositionOptions(dropdown: DropdownComponent): DropdownComponent {
    dropdown.addOption("above-title", "Above title (DOM)");
    dropdown.addOption("top", "Top / Below properties (CM6, DOM fallback)");
    dropdown.addOption("above-properties", "Above properties (DOM)");
    dropdown.addOption("below-properties", "[deprecated → use Top] Below properties (DOM)");
    dropdown.addOption("above-backlinks", "Bottom / Above backlinks (DOM, CM6 fallback)");
    dropdown.addOption("bottom", "[deprecated → use Bottom/Above backlinks] Bottom (CM6 only)");
    dropdown.addOption("below-backlinks", "Below backlinks (DOM, CM6 fallback)");
    dropdown.addOption("left", "Left margin (CM6 panel)");
    dropdown.addOption("right", "Right margin (CM6 panel)");
    return dropdown;
}

export interface ModeToggleOptions {
    app: App;
    container: HTMLElement;
    name: string;
    desc: string;
    enabled: boolean;
    onToggle: (value: boolean) => void;
    noteValue: string;
    onNoteChange: (value: string) => void;
    posValue: string;
    onPosChange: (value: string) => void;
    onSave: () => void;
    onRedisplay: () => void;
}

/** Reusable mode toggle component: header toggle + file picker + position dropdown.
 *  Used for both Live Preview and Preview Mode in global and custom mirrors. */
export function addModeToggle(opts: ModeToggleOptions): void {
    new Setting(opts.container)
        .setName(opts.name)
        .setDesc(opts.desc)
        .setClass("toogle-header")
        .addToggle((cb) => {
            cb.setValue(opts.enabled)
                .onChange((value) => {
                    opts.onToggle(value);
                    opts.onSave();
                    opts.onRedisplay();
                });
        });

    if (!opts.enabled) return;

    const noteSetting = opts.container.createEl("div", { cls: "global-note-selection-setting" });
    new Setting(noteSetting)
        .addSearch((cb) => {
            new FileSuggest(opts.app, cb.inputEl);
            cb.setPlaceholder("ex. folder/note-mirror.md")
                .setValue(opts.noteValue)
                .onChange((value) => {
                    opts.onNoteChange(value);
                    opts.onSave();
                });
            addSearchClass(cb, "full-width-input");
        })
        .addDropdown((cb: DropdownComponent) => {
            addPositionOptions(cb);
            cb.setValue(opts.posValue);
            cb.onChange(async (value) => {
                opts.onPosChange(value);
                opts.onSave();
            });
        })
        .infoEl.remove();
    addPathValidation(opts.app, noteSetting, opts.noteValue, 'file');
}
