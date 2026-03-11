import { App, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";

/**
 * Wrappers for Obsidian internal APIs that lack type definitions.
 * Centralizes @ts-ignore in one file instead of spreading across the codebase.
 */

/** Get CM6 EditorView from a MarkdownView */
export function getEditorView(view: MarkdownView): EditorView | null {
    // @ts-ignore — editor.cm exists at runtime but not in types
    return view.editor?.cm ?? null;
}

/** Get vault base path (filesystem) */
export function getVaultBasePath(app: App): string {
    // @ts-ignore — basePath exists at runtime on FileSystemAdapter
    return app.vault.adapter.basePath;
}

/** Open the Obsidian settings panel */
export function openSettings(app: App): void {
    // @ts-ignore — app.setting exists at runtime
    app.setting.open();
}

/** Open a specific settings tab by plugin ID */
export function openSettingsTab(app: App, tabId: string): void {
    // @ts-ignore — app.setting exists at runtime
    app.setting.openTabById(tabId);
}

/** Trigger rerender on a MarkdownView's preview mode */
export function rerenderPreview(view: MarkdownView): void {
    // @ts-ignore — previewMode exists at runtime
    view.previewMode?.rerender(true);
}

/** Add a CSS class to a search component container */
export function addSearchClass(cb: any, className: string): void {
    // @ts-ignore — containerEl exists on SearchComponent at runtime
    cb.containerEl.addClass(className);
}
