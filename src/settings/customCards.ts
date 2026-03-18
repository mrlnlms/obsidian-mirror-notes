import { App, ButtonComponent, Setting } from 'obsidian';
import { createDefaultCustomMirror, DEFAULT_VIEW_OVERRIDES, sanitizeMirrorName } from './types';
import { addModeToggle } from './settingsUI';
import { addViewOverridesSection } from './viewOverridesUI';
import { buildConditionsSection } from './conditionBuilder';
import { arraymove } from '../utils/array';
import type MirrorUIPlugin from '../../main';

interface CustomCardsOptions {
    app: App;
    plugin: MirrorUIPlugin;
    container: HTMLElement;
    onSave: () => void;
    onRedisplay: () => void;
}

/** Build the Custom Mirrors section: header + search + card list */
export function buildCustomMirrorsSection(options: CustomCardsOptions): void {
    const { app, plugin, container, onSave, onRedisplay } = options;

    new Setting(container)
        .setName("Custom Mirrors")
        .setDesc("Select files to be shown in selected notes by properties, folders or filenames.")
        .addButton((button: ButtonComponent) => {
            button
                .setTooltip("Add additional folder template")
                .setButtonText("Add New Mirror")
                .setCta()
                .onClick(() => {
                    plugin.settings.customMirrors.push(
                        createDefaultCustomMirror(plugin.settings.customMirrors.length)
                    );
                    onSave();
                    onRedisplay();
                });
        });

    const searchContainer = container.createEl("div", { cls: "mirror-search-container" });
    new Setting(searchContainer)
        .setName("Search mirrors")
        .addSearch((cb) => {
            cb.setPlaceholder("Filter by name...")
                .onChange((value) => {
                    filterMirrorCards(plugin, cards, value);
                });
        });

    const cards = container.createEl("div", { cls: "mirror-plugin-cards" });
    buildCustomSettingCards({ app, plugin, container: cards, onSave, onRedisplay });
}

/** Render all custom mirror cards in the container */
function buildCustomSettingCards(options: CustomCardsOptions): void {
    const { app, plugin, container, onSave, onRedisplay } = options;
    const customMirrors = plugin.settings.customMirrors;

    customMirrors.forEach((customMirror, index) => {
        const card = container.createEl("div", { cls: "mirror-card" });

        const dynamicIcon = customMirrors[index].openview ? "chevrons-down-up" : "chevrons-up-down";

        new Setting(card)
            .addText((text) => {
                text.setValue(customMirror.name)
                    .setPlaceholder(`Mirror ${index + 1}`)
                    .onChange((value) => {
                        customMirrors[index].name = sanitizeMirrorName(value, index);
                    });
                text.inputEl.addClass('mirror-card-name-input');
                text.inputEl.addEventListener('blur', () => {
                    customMirrors[index].name = sanitizeMirrorName(text.inputEl.value, index);
                    text.inputEl.value = customMirrors[index].name;
                    onSave();
                });
            })
            .addExtraButton((cb) => {
                cb.setIcon("up-chevron-glyph")
                    .setTooltip("Move up")
                    .onClick(() => {
                        if (index > 0) {
                            arraymove(customMirrors, index, index - 1);
                            onSave();
                            onRedisplay();
                        }
                    });
            })
            .addExtraButton((cb) => {
                cb.setIcon("down-chevron-glyph")
                    .setTooltip("Move down")
                    .onClick(() => {
                        if (index < customMirrors.length - 1) {
                            arraymove(customMirrors, index, index + 1);
                            onSave();
                            onRedisplay();
                        }
                    });
            })
            .addExtraButton((cb) => {
                cb.setIcon(dynamicIcon)
                    .setTooltip("Colapse")
                    .onClick(() => {
                        customMirrors[index].openview = !customMirrors[index].openview;
                        onRedisplay();
                    })
            })
            .addExtraButton((cb) => {
                cb.setIcon("cross")
                    .setTooltip("Delete")
                    .onClick(() => {
                        customMirrors.splice(index, 1);
                        onSave();
                        onRedisplay();
                    });
            })
        if(!customMirrors[index].openview) return;

        const globalMirrorSettings = card.createEl("div", { cls: "global-mirror-settings" });

        // Live Preview Mode
        addModeToggle({
            app,
            container: globalMirrorSettings,
            name: "Live Preview Mode Template Mirror Note",
            desc: "Select a note to show in Live Preview Mode.",
            enabled: customMirrors[index].enable_custom_live_preview_mode,
            onToggle: (value) => { customMirrors[index].enable_custom_live_preview_mode = value; },
            noteValue: customMirrors[index].custom_settings_live_preview_note,
            onNoteChange: (value) => { customMirrors[index].custom_settings_live_preview_note = value; },
            posValue: customMirrors[index].custom_settings_live_preview_pos,
            onPosChange: (value) => { customMirrors[index].custom_settings_live_preview_pos = value; },
            onSave,
            onRedisplay,
        });

        // Preview Mode
        addModeToggle({
            app,
            container: globalMirrorSettings,
            name: "Preview Mode Template Mirror Note.",
            desc: "Select a note to show in Preview Mode.",
            enabled: customMirrors[index].enable_custom_preview_mode,
            onToggle: (value) => { customMirrors[index].enable_custom_preview_mode = value; },
            noteValue: customMirrors[index].custom_settings_preview_note,
            onNoteChange: (value) => { customMirrors[index].custom_settings_preview_note = value; },
            posValue: customMirrors[index].custom_settings_preview_pos,
            onPosChange: (value) => { customMirrors[index].custom_settings_preview_pos = value; },
            onSave,
            onRedisplay,
        });

        // Conditions section (unified filters with AND/OR logic)
        buildConditionsSection({
            app,
            card,
            customMirror: customMirrors[index],
            onSave,
            onRedisplay,
        });

        // View Overrides
        addViewOverridesSection({
            container: card,
            getOverrides: () => customMirrors[index].custom_view_overrides ?? { ...DEFAULT_VIEW_OVERRIDES },
            ensureOverrides: () => {
                if (!customMirrors[index].custom_view_overrides) {
                    customMirrors[index].custom_view_overrides = { ...DEFAULT_VIEW_OVERRIDES };
                }
                return customMirrors[index].custom_view_overrides;
            },
            onSave,
        });

        new Setting(card)
            .setName("Show container border")
            .setDesc("Display a subtle background and border around this mirror's content.")
            .addToggle((cb) => {
                cb.setValue(customMirrors[index].custom_show_container_border)
                .onChange((value) => {
                    customMirrors[index].custom_show_container_border = value;
                    onSave();
                    onRedisplay();
                });
            })
            .setClass("toggle-header");
        new Setting(card)
            .setName("Override global replacement")
            .setDesc("When the global mirror is set to replace custom mirrors, enabling this lets this mirror keep its own configuration.")
            .addToggle((cb) => {
                cb
                    .setValue(customMirrors[index].custom_settings_override)
                    .onChange((value) => {
                        customMirrors[index].custom_settings_override = value;
                        onSave();
                        onRedisplay();
                    });
            })
            .setClass("toggle-header");
        new Setting(card)
            .setName("Auto-update paths on rename")
            .setDesc("Override the global setting for this mirror. If OFF, paths won't be updated when files are renamed.")
            .addToggle((cb) => {
                cb.setValue(customMirrors[index].custom_auto_update_paths)
                .onChange((value) => {
                    customMirrors[index].custom_auto_update_paths = value;
                    onSave();
                });
            })
            .setClass("toggle-header");
    });
}

/** Filter custom mirror cards by name */
function filterMirrorCards(plugin: MirrorUIPlugin, container: HTMLElement, query: string): void {
    const cards = container.querySelectorAll('.mirror-card');
    const lowerQuery = query.toLowerCase();
    let visibleCount = 0;
    cards.forEach((card, index) => {
        const mirror = plugin.settings.customMirrors[index];
        const matches = !query || mirror.name.toLowerCase().includes(lowerQuery);
        (card as HTMLElement).style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
    });

    let emptyMsg = container.querySelector('.mirror-search-empty') as HTMLElement;
    if (visibleCount === 0 && query) {
        if (!emptyMsg) {
            emptyMsg = container.createEl('div', { cls: 'mirror-search-empty' });
        }
        emptyMsg.textContent = `No mirrors matching "${query}"`;
        emptyMsg.style.display = '';
    } else if (emptyMsg) {
        emptyMsg.style.display = 'none';
    }
}
