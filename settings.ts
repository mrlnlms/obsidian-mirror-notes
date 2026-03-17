import MirrorUIPlugin from "./main";
import { App, ButtonComponent, DropdownComponent, PluginSettingTab, Setting, MarkdownView } from "obsidian";
import { FileSuggest } from "./src/suggesters/file-suggest";
import { forceMirrorUpdateEffect } from './src/editor/mirrorState';
import { clearConfigCache } from './src/editor/mirrorConfig';
import { TIMING } from './src/editor/timingConfig';
import { Logger } from './src/dev/logger';
import { addPathValidation } from './src/settings/pathValidator';
import { buildConditionsSection } from './src/settings/conditionBuilder';
import { createDefaultCustomMirror } from './src/settings/types';
import { getEditorView, addSearchClass } from './src/utils/obsidianInternals';

// Re-export types for backwards compatibility (consumers import from './settings')
export type { FolderTemplate, MirrorUIPluginSettings, CustomMirror, Condition, ConditionType, ConditionLogic } from './src/settings/types';
export { DEFAULT_SETTINGS, DEFAULT_VIEW_OVERRIDES } from './src/settings/types';

/** Position dropdown options with visual labels */
function addPositionOptions(dropdown: DropdownComponent): DropdownComponent {
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

export class MirrorUISettingsTab extends PluginSettingTab {
    plugin: MirrorUIPlugin;
    constructor(app: App, plugin: MirrorUIPlugin) {
        //@ts-ignore
        super(app, plugin);
        this.plugin = plugin;
    }

    private updateAllEditors() {
        Logger.log('Settings changed, forcing update on all editors');
        Logger.log('Current settings:', this.plugin.settings);

        clearConfigCache();
        this.plugin.positionOverrides.clear();
        setTimeout(() => {
            this.plugin.app.workspace.iterateAllLeaves(leaf => {
                if (leaf.view instanceof MarkdownView && leaf.view.file) {
                    const cm = getEditorView(leaf.view as MarkdownView);
                    if (cm) {
                        cm.dispatch({
                            effects: forceMirrorUpdateEffect.of()
                        });
                        this.plugin.applyViewOverrides(leaf.view as MarkdownView);
                        this.plugin.setupDomPosition(leaf.view as MarkdownView);
                        Logger.log(`Updated editor for: ${(leaf.view as MarkdownView).file!.path}`);
                    }
                }
            });
        }, TIMING.SETTINGS_UPDATE_DELAY);
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
            banner.createEl("p",{text:'Mirror Notes propoe uma nova forma de pensar o uso de templates dentro do Obsidian, possibilitando definir um unico template para um grupo definido de notas, ou seja, alterando o template, as notas relacionadas serao atualizadas automaticamente.'})
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

        this.addGlobalMirrorSection(globalSettings);
        this.addCustomMirrorsSection(customSettings);

        globalSettings.createEl("hr",{cls: "mirror-separator"});

        new Setting(mirrorSettings_main)
            .addButton( (button) => {
                button.setButtonText('Reset settings');
                button.onClick(async () => {
                    await this.plugin.resetSettings();
                    this.display();
                    this.updateAllEditors();
                });
            })
            .setClass("mirror-reset");
    }

    private addGlobalMirrorSection(globalSettings: HTMLElement): void {
        new Setting(globalSettings)
            .setName("Global Mirror")
            .setDesc("If ON, the selected files will be mirrored in all notes in this vault.")
                .addToggle((cb) => {
                    cb.setValue(this.plugin.settings.global_settings)
                        .onChange((value) => {
                            this.plugin.settings.global_settings = value;
                            this.plugin.saveSettings();
                            this.display();
                            this.updateAllEditors();
                        });
                })
                .setClass("toggle-header");

        if (!this.plugin.settings.global_settings) return;

        const globalMirrorSettings = globalSettings.createEl("div", { cls: "global-mirror-settings" });

        // Live Preview Mode
        this.addModeToggle(globalMirrorSettings, {
            name: "Live Preview Mode Template Mirror Note",
            desc: "Select a note to show in Live Preview Mode.",
            enabled: this.plugin.settings.enable_global_live_preview_mode,
            onToggle: (value) => {
                this.plugin.settings.enable_global_live_preview_mode = value;
            },
            noteValue: this.plugin.settings.global_settings_live_preview_note,
            onNoteChange: (value) => {
                this.plugin.settings.global_settings_live_preview_note = value;
            },
            posValue: this.plugin.settings.global_settings_live_preview_pos,
            onPosChange: (value) => {
                this.plugin.settings.global_settings_live_preview_pos = value;
            },
        });

        // Preview Mode
        this.addModeToggle(globalMirrorSettings, {
            name: "Preview Mode Template Mirror Note.",
            desc: "Select a note to show in Preview Mode.",
            enabled: this.plugin.settings.enable_global_preview_mode,
            onToggle: (value) => {
                this.plugin.settings.enable_global_preview_mode = value;
            },
            noteValue: this.plugin.settings.global_settings_preview_note,
            onNoteChange: (value) => {
                this.plugin.settings.global_settings_preview_note = value;
            },
            posValue: this.plugin.settings.global_settings_preview_pos,
            onPosChange: (value) => {
                this.plugin.settings.global_settings_preview_pos = value;
            },
        });

        // --- View Overrides section ---
        new Setting(globalMirrorSettings)
            .setName("View overrides")
            .setDesc("Override Obsidian display settings for pages matched by this mirror.")
            .setHeading();

        const globalOverrides = this.plugin.settings.global_view_overrides ?? { hideProps: false, readableLineLength: null, showInlineTitle: null };

        new Setting(globalMirrorSettings)
            .setName("Hide properties")
            .setDesc("Hide the properties panel on matched pages.")
            .addToggle((cb) => {
                cb.setValue(globalOverrides.hideProps)
                .onChange((value) => {
                    if (!this.plugin.settings.global_view_overrides) {
                        this.plugin.settings.global_view_overrides = { hideProps: false, readableLineLength: null, showInlineTitle: null };
                    }
                    this.plugin.settings.global_view_overrides.hideProps = value;
                    this.plugin.saveSettings();
                    this.updateAllEditors();
                });
            });

        new Setting(globalMirrorSettings)
            .setName("Readable line length")
            .setDesc("Override readable line length. Inherit = use Obsidian setting.")
            .addDropdown((dd) => {
                dd.addOption("inherit", "Inherit")
                  .addOption("on", "Force ON")
                  .addOption("off", "Force OFF")
                  .setValue(globalOverrides.readableLineLength === true ? "on" : globalOverrides.readableLineLength === false ? "off" : "inherit")
                  .onChange((value) => {
                      if (!this.plugin.settings.global_view_overrides) {
                          this.plugin.settings.global_view_overrides = { hideProps: false, readableLineLength: null, showInlineTitle: null };
                      }
                      this.plugin.settings.global_view_overrides.readableLineLength = value === "on" ? true : value === "off" ? false : null;
                      this.plugin.saveSettings();
                      this.updateAllEditors();
                  });
            });

        new Setting(globalMirrorSettings)
            .setName("Show inline title")
            .setDesc("Override inline title visibility. Inherit = use Obsidian setting.")
            .addDropdown((dd) => {
                dd.addOption("inherit", "Inherit")
                  .addOption("on", "Force ON")
                  .addOption("off", "Force OFF")
                  .setValue(globalOverrides.showInlineTitle === true ? "on" : globalOverrides.showInlineTitle === false ? "off" : "inherit")
                  .onChange((value) => {
                      if (!this.plugin.settings.global_view_overrides) {
                          this.plugin.settings.global_view_overrides = { hideProps: false, readableLineLength: null, showInlineTitle: null };
                      }
                      this.plugin.settings.global_view_overrides.showInlineTitle = value === "on" ? true : value === "off" ? false : null;
                      this.plugin.saveSettings();
                      this.updateAllEditors();
                  });
            });

        new Setting(globalMirrorSettings)
            .setName("Show container border")
            .setDesc("Display a subtle background and border around mirrored content.")
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.global_show_container_border)
                .onChange((value) => {
                    this.plugin.settings.global_show_container_border = value;
                    this.plugin.saveSettings();
                    this.display();
                    this.updateAllEditors();
                });
            })
            .setClass("toogle-header");

        new Setting(globalMirrorSettings)
            .setName("Replace custom Mirrors")
            .setDesc("Por padrao, custom Mirrors sobrescrevem o global Mirror. Com esta opcao, o plugin ira sobrescrever os custom Mirros, a menos que estes estejam setados para sobrecrever esta funcao.")
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.global_settings_overide)
                .onChange((value) => {
                    this.plugin.settings.global_settings_overide = value;
                    this.plugin.saveSettings();
                    this.display();
                    this.updateAllEditors();
                });
            })
            .setClass("toogle-header");

        new Setting(globalMirrorSettings)
            .setName("Auto-update paths on rename")
            .setDesc("Automatically update template and filter paths when files or folders are renamed.")
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.auto_update_paths)
                .onChange((value) => {
                    this.plugin.settings.auto_update_paths = value;
                    this.plugin.saveSettings();
                });
            })
            .setClass("toogle-header");
    }

    private addModeToggle(container: HTMLElement, opts: {
        name: string;
        desc: string;
        enabled: boolean;
        onToggle: (value: boolean) => void;
        noteValue: string;
        onNoteChange: (value: string) => void;
        posValue: string;
        onPosChange: (value: string) => void;
    }): void {
        new Setting(container)
            .setName(opts.name)
            .setDesc(opts.desc)
            .setClass("toogle-header")
            .addToggle((cb) => {
                cb.setValue(opts.enabled)
                    .onChange((value) => {
                        opts.onToggle(value);
                        this.plugin.saveSettings();
                        this.display();
                        this.updateAllEditors();
                    });
            });

        if (!opts.enabled) return;

        const noteSetting = container.createEl("div", { cls: "global-note-selection-setting" });
        new Setting(noteSetting)
            .addSearch((cb) => {
                new FileSuggest(this.app, cb.inputEl);
                cb.setPlaceholder("ex. folder/note-mirror.md")
                    .setValue(opts.noteValue)
                    .onChange((value) => {
                        opts.onNoteChange(value);
                        this.plugin.saveSettings();
                        this.updateAllEditors();
                    });
                addSearchClass(cb, "full-width-input");
            })
            .addDropdown((cb: DropdownComponent) => {
                addPositionOptions(cb);
                cb.setValue(opts.posValue);
                cb.onChange(async (value) => {
                    opts.onPosChange(value);
                    await this.plugin.saveSettings();
                    this.updateAllEditors();
                });
            })
            .infoEl.remove();
        addPathValidation(this.app, noteSetting, opts.noteValue, 'file');
    }

    private addCustomMirrorsSection(customSettings: HTMLElement): void {
        new Setting(customSettings)
            .setName("Custom Mirrors")
            .setDesc("Select files to be shown in selected notes by properties, folders or filenames.")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional folder template")
                    .setButtonText("Add New Mirror")
                    .setCta()
                    .onClick(() => {
                        this.plugin.settings.customMirrors.push(
                            createDefaultCustomMirror(this.plugin.settings.customMirrors.length)
                        );
                        this.plugin.saveSettings();
                        this.display();
                    });
            });

        const searchContainer = customSettings.createEl("div", { cls: "mirror-search-container" });
        new Setting(searchContainer)
            .setName("Search mirrors")
            .addSearch((cb) => {
                cb.setPlaceholder("Filter by name...")
                    .onChange((value) => {
                        this.filterMirrorCards(cards, value);
                    });
            });

        const cards = customSettings.createEl("div", { cls: "mirror-plugin-cards" });
        this.addCustomSettingCards(cards);
    }

    private addCustomSettingCards(container: HTMLElement): void {
        const customMirrors = this.plugin.settings.customMirrors;
        customMirrors.forEach((customMirror, index) => {
            const card = container.createEl("div", { cls: "mirror-card" });

            const dynamicIcon = customMirrors[index].openview ? "chevrons-down-up" : "chevrons-up-down";

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
                            this.updateAllEditors();
                        });
                })
            if(!customMirrors[index].openview) return;

            const globalMirrorSettings = card.createEl("div", { cls: "global-mirror-settings" });

            // Live Preview Mode
            this.addModeToggle(globalMirrorSettings, {
                name: "Live Preview Mode Template Mirror Note",
                desc: "Select a note to show in Live Preview Mode.",
                enabled: customMirrors[index].enable_custom_live_preview_mode,
                onToggle: (value) => {
                    customMirrors[index].enable_custom_live_preview_mode = value;
                },
                noteValue: customMirrors[index].custom_settings_live_preview_note,
                onNoteChange: (value) => {
                    customMirrors[index].custom_settings_live_preview_note = value;
                },
                posValue: customMirrors[index].custom_settings_live_preview_pos,
                onPosChange: (value) => {
                    customMirrors[index].custom_settings_live_preview_pos = value;
                },
            });

            // Preview Mode
            this.addModeToggle(globalMirrorSettings, {
                name: "Preview Mode Template Mirror Note.",
                desc: "Select a note to show in Preview Mode.",
                enabled: customMirrors[index].enable_custom_preview_mode,
                onToggle: (value) => {
                    customMirrors[index].enable_custom_preview_mode = value;
                },
                noteValue: customMirrors[index].custom_settings_preview_note,
                onNoteChange: (value) => {
                    customMirrors[index].custom_settings_preview_note = value;
                },
                posValue: customMirrors[index].custom_settings_preview_pos,
                onPosChange: (value) => {
                    customMirrors[index].custom_settings_preview_pos = value;
                },
            });

            // Conditions section (unified filters with AND/OR logic)
            buildConditionsSection({
                app: this.app,
                card,
                customMirror: customMirrors[index],
                onSave: () => this.plugin.saveSettings(),
                onRedisplay: () => this.display(),
            });

            // --- View Overrides section ---
            new Setting(card)
                .setName("View overrides")
                .setDesc("Override Obsidian display settings for pages matched by this mirror.")
                .setHeading();

            const customOverrides = customMirrors[index].custom_view_overrides ?? { hideProps: false, readableLineLength: null, showInlineTitle: null };

            new Setting(card)
                .setName("Hide properties")
                .setDesc("Hide the properties panel on matched pages.")
                .addToggle((cb) => {
                    cb.setValue(customOverrides.hideProps)
                    .onChange((value) => {
                        if (!customMirrors[index].custom_view_overrides) {
                            customMirrors[index].custom_view_overrides = { hideProps: false, readableLineLength: null, showInlineTitle: null };
                        }
                        customMirrors[index].custom_view_overrides.hideProps = value;
                        this.plugin.saveSettings();
                        this.updateAllEditors();
                    });
                });

            new Setting(card)
                .setName("Readable line length")
                .setDesc("Override readable line length. Inherit = use Obsidian setting.")
                .addDropdown((dd) => {
                    dd.addOption("inherit", "Inherit")
                      .addOption("on", "Force ON")
                      .addOption("off", "Force OFF")
                      .setValue(customOverrides.readableLineLength === true ? "on" : customOverrides.readableLineLength === false ? "off" : "inherit")
                      .onChange((value) => {
                          if (!customMirrors[index].custom_view_overrides) {
                              customMirrors[index].custom_view_overrides = { hideProps: false, readableLineLength: null, showInlineTitle: null };
                          }
                          customMirrors[index].custom_view_overrides.readableLineLength = value === "on" ? true : value === "off" ? false : null;
                          this.plugin.saveSettings();
                          this.updateAllEditors();
                      });
                });

            new Setting(card)
                .setName("Show inline title")
                .setDesc("Override inline title visibility. Inherit = use Obsidian setting.")
                .addDropdown((dd) => {
                    dd.addOption("inherit", "Inherit")
                      .addOption("on", "Force ON")
                      .addOption("off", "Force OFF")
                      .setValue(customOverrides.showInlineTitle === true ? "on" : customOverrides.showInlineTitle === false ? "off" : "inherit")
                      .onChange((value) => {
                          if (!customMirrors[index].custom_view_overrides) {
                              customMirrors[index].custom_view_overrides = { hideProps: false, readableLineLength: null, showInlineTitle: null };
                          }
                          customMirrors[index].custom_view_overrides.showInlineTitle = value === "on" ? true : value === "off" ? false : null;
                          this.plugin.saveSettings();
                          this.updateAllEditors();
                      });
                });

            new Setting(card)
                .setName("Show container border")
                .setDesc("Display a subtle background and border around this mirror's content.")
                .addToggle((cb) => {
                    cb.setValue(customMirrors[index].custom_show_container_border)
                    .onChange((value) => {
                        customMirrors[index].custom_show_container_border = value;
                        this.plugin.saveSettings();
                        this.display();
                        this.updateAllEditors();
                    });
                })
                .setClass("toogle-header");
            new Setting(card)
                .setName("Replace global mirror overide")
                .setDesc("Se o global mirror estiver com a opcao de sobrescrever as custom mirrors, este botao se habilitado ignora a substituicao para este mirror.")
                .addToggle((cb) => {
                    cb
                        .setValue(customMirrors[index].custom_settings_overide)
                        .onChange((value) => {
                            customMirrors[index].custom_settings_overide = value;
                            this.plugin.saveSettings();
                            this.display();
                            this.updateAllEditors();
                        });
                })
                .setClass("toogle-header");
            new Setting(card)
                .setName("Auto-update paths on rename")
                .setDesc("Override the global setting for this mirror. If OFF, paths won't be updated when files are renamed.")
                .addToggle((cb) => {
                    cb.setValue(customMirrors[index].custom_auto_update_paths)
                    .onChange((value) => {
                        customMirrors[index].custom_auto_update_paths = value;
                        this.plugin.saveSettings();
                    });
                })
                .setClass("toogle-header");
        });
    }

    private filterMirrorCards(container: HTMLElement, query: string): void {
        const cards = container.querySelectorAll('.mirror-card');
        const lowerQuery = query.toLowerCase();
        let visibleCount = 0;
        cards.forEach((card, index) => {
            const mirror = this.plugin.settings.customMirrors[index];
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

    private arraymove(arr: any[], fromIndex: number, toIndex: number): void {
        const element = arr[fromIndex];
        arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, element);
    }
}
