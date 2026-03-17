import { Setting } from 'obsidian';
import type { ViewOverrides } from './types';

interface ViewOverridesUIOptions {
    container: HTMLElement;
    getOverrides: () => ViewOverrides;
    ensureOverrides: () => ViewOverrides;
    onSave: () => void;
}

/** Build the View Overrides settings section (heading + hideProps + readableLineLength + showInlineTitle).
 *  Used by both global mirror and per-custom-mirror sections. */
export function addViewOverridesSection(options: ViewOverridesUIOptions): void {
    const { container, getOverrides, ensureOverrides, onSave } = options;

    new Setting(container)
        .setName("View overrides")
        .setDesc("Override Obsidian display settings for pages matched by this mirror.")
        .setHeading();

    const overrides = getOverrides();

    new Setting(container)
        .setName("Hide properties")
        .setDesc("Hide the properties panel on matched pages.")
        .addToggle((cb) => {
            cb.setValue(overrides.hideProps)
            .onChange((value) => {
                ensureOverrides().hideProps = value;
                onSave();
            });
        });

    new Setting(container)
        .setName("Readable line length")
        .setDesc("Override readable line length. Inherit = use Obsidian setting.")
        .addDropdown((dd) => {
            dd.addOption("inherit", "Inherit")
              .addOption("on", "Force ON")
              .addOption("off", "Force OFF")
              .setValue(overrides.readableLineLength === true ? "on" : overrides.readableLineLength === false ? "off" : "inherit")
              .onChange((value) => {
                  ensureOverrides().readableLineLength = value === "on" ? true : value === "off" ? false : null;
                  onSave();
              });
        });

    new Setting(container)
        .setName("Show inline title")
        .setDesc("Override inline title visibility. Inherit = use Obsidian setting.")
        .addDropdown((dd) => {
            dd.addOption("inherit", "Inherit")
              .addOption("on", "Force ON")
              .addOption("off", "Force OFF")
              .setValue(overrides.showInlineTitle === true ? "on" : overrides.showInlineTitle === false ? "off" : "inherit")
              .onChange((value) => {
                  ensureOverrides().showInlineTitle = value === "on" ? true : value === "off" ? false : null;
                  onSave();
              });
        });
}
