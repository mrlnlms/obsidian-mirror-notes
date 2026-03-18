import { App, Setting } from 'obsidian';
import { DEFAULT_VIEW_OVERRIDES } from './types';
import { addModeToggle } from './settingsUI';
import { addViewOverridesSection } from './viewOverridesUI';
import type MirrorUIPlugin from '../../main';

interface GlobalSectionOptions {
    app: App;
    plugin: MirrorUIPlugin;
    container: HTMLElement;
    onSave: () => void;
    onRedisplay: () => void;
}

/** Build the Global Mirror settings section */
export function buildGlobalSection(options: GlobalSectionOptions): void {
    const { app, plugin, container, onSave, onRedisplay } = options;
    const settings = plugin.settings;

    new Setting(container)
        .setName("Global Mirror")
        .setDesc("If ON, the selected files will be mirrored in all notes in this vault.")
        .addToggle((cb) => {
            cb.setValue(settings.global_settings)
                .onChange((value) => {
                    settings.global_settings = value;
                    onSave();
                    onRedisplay();
                });
        })
        .setClass("toggle-header");

    if (!settings.global_settings) return;

    const globalMirrorSettings = container.createEl("div", { cls: "global-mirror-settings" });

    // Live Preview Mode
    addModeToggle({
        app,
        container: globalMirrorSettings,
        name: "Live Preview Mode Template Mirror Note",
        desc: "Select a note to show in Live Preview Mode.",
        enabled: settings.enable_global_live_preview_mode,
        onToggle: (value) => { settings.enable_global_live_preview_mode = value; },
        noteValue: settings.global_settings_live_preview_note,
        onNoteChange: (value) => { settings.global_settings_live_preview_note = value; },
        posValue: settings.global_settings_live_preview_pos,
        onPosChange: (value) => { settings.global_settings_live_preview_pos = value; },
        onSave,
        onRedisplay,
    });

    // Preview Mode
    addModeToggle({
        app,
        container: globalMirrorSettings,
        name: "Preview Mode Template Mirror Note.",
        desc: "Select a note to show in Preview Mode.",
        enabled: settings.enable_global_preview_mode,
        onToggle: (value) => { settings.enable_global_preview_mode = value; },
        noteValue: settings.global_settings_preview_note,
        onNoteChange: (value) => { settings.global_settings_preview_note = value; },
        posValue: settings.global_settings_preview_pos,
        onPosChange: (value) => { settings.global_settings_preview_pos = value; },
        onSave,
        onRedisplay,
    });

    // View Overrides
    addViewOverridesSection({
        container: globalMirrorSettings,
        getOverrides: () => settings.global_view_overrides ?? { ...DEFAULT_VIEW_OVERRIDES },
        ensureOverrides: () => {
            if (!settings.global_view_overrides) {
                settings.global_view_overrides = { ...DEFAULT_VIEW_OVERRIDES };
            }
            return settings.global_view_overrides;
        },
        onSave,
    });

    new Setting(globalMirrorSettings)
        .setName("Show container border")
        .setDesc("Display a subtle background and border around mirrored content.")
        .addToggle((cb) => {
            cb.setValue(settings.global_show_container_border)
            .onChange((value) => {
                settings.global_show_container_border = value;
                onSave();
                onRedisplay();
            });
        })
        .setClass("toggle-header");

    new Setting(globalMirrorSettings)
        .setName("Replace custom Mirrors")
        .setDesc("By default, custom mirrors take priority over the global mirror. Enable this to let the global mirror override custom mirrors, unless a custom mirror explicitly opts out.")
        .addToggle((cb) => {
            cb.setValue(settings.global_settings_override)
            .onChange((value) => {
                settings.global_settings_override = value;
                onSave();
                onRedisplay();
            });
        })
        .setClass("toggle-header");

    new Setting(globalMirrorSettings)
        .setName("Auto-update paths on rename")
        .setDesc("Automatically update template and filter paths when files or folders are renamed.")
        .addToggle((cb) => {
            cb.setValue(settings.auto_update_paths)
            .onChange((value) => {
                settings.auto_update_paths = value;
                onSave();
            });
        })
        .setClass("toggle-header");
}
