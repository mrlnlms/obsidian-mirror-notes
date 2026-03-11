import { App, Setting } from "obsidian";
import { FolderTemplate, CustomMirror } from "./types";
import { FileSuggest, FolderSuggest, YamlPropertySuggest } from "../suggesters/file-suggest";
import { addPathValidation } from "./pathValidator";

type FilterType = 'filterFiles' | 'filterFolders' | 'filterProps';

interface FilterBuilderOptions {
    app: App;
    card: HTMLElement;
    customMirror: CustomMirror;
    mirrorIndex: number;
    filterType: FilterType;
    title: string;
    description: string;
    addButtonTooltip: string;
    onSave: () => void;
    onRedisplay: () => void;
}

function arraymove(arr: any[], fromIndex: number, toIndex: number): void {
    const element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
}

export function buildFilterSection(options: FilterBuilderOptions): void {
    const {
        app, card, customMirror, filterType,
        title, description, addButtonTooltip,
        onSave, onRedisplay
    } = options;

    const filterArray = customMirror[filterType];

    new Setting(card)
        .setName(title)
        .setDesc(description)
        .addExtraButton((cb) => {
            cb.setIcon("any-key")
                .setTooltip(addButtonTooltip)
                .onClick(() => {
                    filterArray.push({ folder: "", template: "" });
                    onSave();
                    onRedisplay();
                });
        });

    filterArray.forEach((_entry: FolderTemplate, index2: number) => {
        const folderSelection = card.createEl("div", { cls: "global-note-selection-setting" });

        if (filterType === 'filterProps') {
            buildPropsRow(app, folderSelection, customMirror, filterType, index2, onSave, onRedisplay);
        } else {
            buildSimpleRow(app, folderSelection, customMirror, filterType, index2, onSave, onRedisplay);
        }
    });
}

function buildSimpleRow(
    app: App,
    container: HTMLElement,
    customMirror: CustomMirror,
    filterType: FilterType,
    index2: number,
    onSave: () => void,
    onRedisplay: () => void
): void {
    const filterArray = customMirror[filterType];
    const SuggestClass = filterType === 'filterFolders' ? FolderSuggest : FileSuggest;
    const validationType = filterType === 'filterFolders' ? 'folder' as const : 'filename' as const;

    const s = new Setting(container)
        .addSearch((cb) => {
            new SuggestClass(app, cb.inputEl);
            cb.setPlaceholder("placeholder")
                .setValue(filterArray[index2].folder)
                .onChange((new_folder) => {
                    filterArray[index2].folder = new_folder;
                    onSave();
                });
            // @ts-ignore
            cb.containerEl.addClass("mirror-search-input");
        });

    addMoveDeleteButtons(s, filterArray, index2, onSave, onRedisplay);
    s.infoEl.remove();
    addPathValidation(app, container, filterArray[index2].folder, validationType);
}

function buildPropsRow(
    app: App,
    container: HTMLElement,
    customMirror: CustomMirror,
    filterType: FilterType,
    index2: number,
    onSave: () => void,
    onRedisplay: () => void
): void {
    const filterArray = customMirror[filterType];

    const s = new Setting(container)
        .addSearch((cb) => {
            new YamlPropertySuggest(app, cb.inputEl);
            cb.setPlaceholder("Select a YAML property")
                .setValue(filterArray[index2].folder)
                .onChange((new_folder) => {
                    filterArray[index2].folder = new_folder;
                    onSave();
                });
            // @ts-ignore
            cb.containerEl.addClass("mirror-search-input");
        });

    s.addSearch((cb) => {
        new YamlPropertySuggest(app, cb.inputEl);
        cb.setPlaceholder("Type or select a value.")
            .setValue(filterArray[index2].template)
            .onChange((new_folder) => {
                filterArray[index2].template = new_folder;
                onSave();
            });
        // @ts-ignore
        cb.containerEl.addClass("mirror-search-input");
    });

    addMoveDeleteButtons(s, filterArray, index2, onSave, onRedisplay);
    s.infoEl.remove();
}

function addMoveDeleteButtons(
    s: Setting,
    filterArray: Array<FolderTemplate>,
    index2: number,
    onSave: () => void,
    onRedisplay: () => void
): void {
    s.addExtraButton((cb) => {
        cb.setIcon("up-chevron-glyph")
            .setTooltip("Move up")
            .onClick(() => {
                if (index2 > 0) {
                    arraymove(filterArray, index2, index2 - 1);
                }
                onSave();
                onRedisplay();
            });
    })
    .addExtraButton((cb) => {
        cb.setIcon("down-chevron-glyph")
            .setTooltip("Move down")
            .onClick(() => {
                arraymove(filterArray, index2, index2 + 1);
                onSave();
                onRedisplay();
            });
    })
    .addExtraButton((cb) => {
        cb.setIcon("cross")
            .setTooltip("Delete")
            .onClick(() => {
                filterArray.splice(index2, 1);
                onSave();
                onRedisplay();
            });
    });
}
