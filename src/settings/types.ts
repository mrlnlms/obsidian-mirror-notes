export interface FolderTemplate {
    folder: string;
    template: string;
}

export interface MirrorUIPluginSettings {
    enable_getting_started: boolean;
    debug_logging: boolean;
    global_settings: boolean;
    enable_global_live_preview_mode: boolean;
    global_settings_live_preview_note: string;
    global_settings_live_preview_pos: string;
    enable_global_preview_mode: boolean;
    global_settings_preview_note: string;
    global_settings_preview_pos: string;
    global_settings_overide: boolean;
    global_settings_hide_props: boolean;
    global_show_container_border: boolean;
    auto_update_paths: boolean;
    customMirrors: Array<CustomMirror>;
}

export interface CustomMirror {
    id: string;
    name: string;
    openview: boolean;
    enable_custom_live_preview_mode: boolean;
    custom_settings_live_preview_note: string;
    custom_settings_live_preview_pos: string;
    enable_custom_preview_mode: boolean;
    custom_settings_preview_note: string;
    custom_settings_preview_pos: string;
    custom_settings_overide: boolean;
    custom_settings_hide_props: boolean;
    custom_show_container_border: boolean;
    custom_auto_update_paths: boolean;
    filterFiles: Array<FolderTemplate>;
    filterFolders: Array<FolderTemplate>;
    filterProps: Array<FolderTemplate>;
}

export const DEFAULT_SETTINGS: MirrorUIPluginSettings = {
    enable_getting_started: true,
    debug_logging: false,
    global_settings: false,
    enable_global_live_preview_mode: false,
    global_settings_live_preview_note: "",
    global_settings_live_preview_pos: "top",
    enable_global_preview_mode: false,
    global_settings_preview_note: "",
    global_settings_preview_pos: "top",
    global_settings_overide: false,
    global_settings_hide_props: false,
    global_show_container_border: true,
    auto_update_paths: true,
    customMirrors: []
};

export function createDefaultCustomMirror(index: number): CustomMirror {
    return {
        id: crypto.randomUUID(),
        name: `Mirror ${index + 1}`,
        openview: true,
        enable_custom_live_preview_mode: false,
        custom_settings_live_preview_note: "",
        custom_settings_live_preview_pos: "top",
        enable_custom_preview_mode: false,
        custom_settings_preview_note: "",
        custom_settings_preview_pos: "top",
        custom_settings_overide: false,
        custom_settings_hide_props: false,
        custom_show_container_border: true,
        custom_auto_update_paths: true,
        filterFiles: [],
        filterFolders: [],
        filterProps: [],
    };
}
