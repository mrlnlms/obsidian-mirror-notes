# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v13 — SettingModel1 (Era 2)

First alternative settings model iteration. Introduces `src/settings/SettingModel1.ts` — a Templater-inspired settings UI using folder/template pairs with `FolderSuggest` and `YamlPropertySuggest` autocomplete from `src/utils/`. This is a parallel settings model exploring a different UI pattern than the existing `src/settings.ts`.

### What changed in v13
- New `src/settings/SettingModel1.ts` — `SampleSettingTab` class with `MyPluginSettings` interface
- Templater-style folder/template pair management with add/remove/reorder
- Uses `FolderSuggest` and `YamlPropertySuggest` from `src/utils/file-suggest.ts` (wired into search inputs)
- Header section with plugin description
- Toggle to enable/disable folder templates
- `enable_folder_templates`, `templates_folder`, `folder_templates`, `user_scripts_folder` settings fields

### What works
- Settings tab (`MirrorUISettingsTab`) with dynamic add/remove of template settings
- Each setting has: LivePreview Template path, Preview Template path, YAML Attribute, YAML Value
- YAML attribute field has a click-to-suggest modal (`SuggestionModal`) — still uses the v11 basic modal
- Settings reordering with up/down chevron buttons
- Delete button per setting entry
- Settings persistence via `loadData()`/`saveData()`
- `resetSettings()` method to restore defaults
- Three event listeners registered: `file-open`, `active-leaf-change`, `layout-change`
- Console logging for all event handlers (debug stubs)
- `TextInputSuggest<T>` autocomplete system with keyboard navigation (ArrowUp/Down/Enter/Escape), Popper.js positioning, and click/mouseover support — now wired into SettingModel1's search inputs
- SettingModel1: `FolderSuggest` on folder search fields, `YamlPropertySuggest` on template search fields

### What doesn't work yet
- Event handlers are stubs — they log to console but don't do anything functional
- No toolbar injection (Era 1's toolbar system was removed)
- No sidebar view (Era 1's `MirrorUIView` is gone)
- No commands registered
- No ribbon icons
- `SuggestionModal` injects inline `<style>` into `document.head` on every open (accumulates)
- `SuggestionModal` uses a basic `Modal` instead of Obsidian's `SuggestModal` — no keyboard navigation
- SettingModel1 is not wired into `main.ts` — it exists as a parallel settings model, not yet replacing `settings.ts`
- SettingModel1 uses `@ts-ignore` on `super(app, plugin)` constructor call
- SettingModel1's `arraymove` calls are commented out — reorder buttons save but don't actually move entries
- `stopBuild` property declared but never used
- `editorDrop`, `applyMirrorPlugin`, `rerender`, `eventLayoutChange`, `addToolbarToActiveLeaf`, `removeToolbarFromActiveLeaf` are all dead code stubs
- `noteLayoutChange` receives `leaves.values` (a function reference) instead of actual values

### Architecture
- `src/main.ts` — `MirrorUIPlugin` (new architecture, event stubs)
- `src/settings.ts` — `MirrorUISettingsTab` + `SuggestionModal` (YAML suggest, active)
- `src/settings/SettingModel1.ts` — `SampleSettingTab` + `MyPluginSettings` (alternative model, not wired)
- `src/utils/suggest.ts` — `Suggest<T>` (internal) + `TextInputSuggest<T>` (exported abstract)
- `src/utils/file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`
- `src/utils/utils.ts` — `wrapAround()` helper

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
