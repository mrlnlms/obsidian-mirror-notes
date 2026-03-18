export interface FolderTemplate {
    folder: string;
    template: string;
}

export type ConditionType = 'file' | 'folder' | 'property';
export type ConditionLogic = 'any' | 'all';

export interface Condition {
    type: ConditionType;
    negated: boolean;
    fileName?: string;       // type=file
    folderPath?: string;     // type=folder
    propertyName?: string;   // type=property
    propertyValue?: string;  // type=property
}

/** Tri-state: true = force on, false = force off, null = inherit from Obsidian */
export type OverrideValue = boolean | null;

export interface ViewOverrides {
    hideProps: boolean;
    readableLineLength: OverrideValue;
    showInlineTitle: OverrideValue;
}

export const DEFAULT_VIEW_OVERRIDES: ViewOverrides = {
    hideProps: false,
    readableLineLength: null,
    showInlineTitle: null,
};

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
    global_settings_override: boolean;
    global_view_overrides: ViewOverrides;
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
    custom_settings_override: boolean;
    custom_view_overrides: ViewOverrides;
    custom_show_container_border: boolean;
    custom_auto_update_paths: boolean;
    conditions: Condition[];
    conditionLogic: ConditionLogic;
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
    global_settings_override: false,
    global_view_overrides: { ...DEFAULT_VIEW_OVERRIDES },
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
        custom_settings_override: false,
        custom_view_overrides: { ...DEFAULT_VIEW_OVERRIDES },
        custom_show_container_border: true,
        custom_auto_update_paths: true,
        conditions: [],
        conditionLogic: 'any',
    };
}

/** Sanitize mirror name input: trim whitespace, fallback to default if empty */
export function sanitizeMirrorName(input: string, index: number): string {
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : `Mirror ${index + 1}`;
}
