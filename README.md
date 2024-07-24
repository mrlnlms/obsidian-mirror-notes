# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v15 — SettingModel3 (Era 2)

Third settings model snapshot — `src/settings/SettingModel3.ts`. This is an intermediate save point identical to SettingModel2 except for 2 blank lines prepended at the top. Represents an incremental checkpoint in the evolution of the settings model, before further divergence in later versions.

### What changed in v15
- New `src/settings/SettingModel3.ts` — third settings model snapshot (31KB, parallel/unwired)
- Content identical to SettingModel2 with 2 blank lines added at top
- No functional changes — this is a save-point/checkpoint version

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
- `TextInputSuggest<T>` autocomplete system with keyboard navigation (ArrowUp/Down/Enter/Escape), Popper.js positioning, and click/mouseover support
- SettingModel1: `FolderSuggest` on folder search fields, `YamlPropertySuggest` on template search fields
- SettingModel2: Full settings UI with Getting Started banner, Global/Custom mirror sections
- SettingModel2: Card-based custom mirror management with CRUD operations
- SettingModel2: Multi-criteria filtering (filename, folder, YAML property+value)
- SettingModel2: `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest` wired into all filter inputs
- SettingModel2: Reusable components (`addToggleHeader`, `addTemplateSelection`, `addSelectionField`, `addInputFilePath`)
- SettingModel3: Identical to SettingModel2 (intermediate checkpoint)

### What doesn't work yet
- Event handlers are stubs — they log to console but don't do anything functional
- No toolbar injection (Era 1's toolbar system was removed)
- No sidebar view (Era 1's `MirrorUIView` is gone)
- No commands registered
- No ribbon icons
- `SuggestionModal` injects inline `<style>` into `document.head` on every open (accumulates)
- `SuggestionModal` uses a basic `Modal` instead of Obsidian's `SuggestModal` — no keyboard navigation
- SettingModel1 is not wired into `main.ts` — it exists as a parallel settings model, not yet replacing `settings.ts`
- SettingModel2 is not wired into `main.ts` — also a parallel settings model
- SettingModel3 is not wired into `main.ts` — also a parallel settings model (identical to Model2)
- SettingModel1 uses `@ts-ignore` on `super(app, plugin)` constructor call
- SettingModel2 uses `@ts-ignore` on `super(app, plugin)` constructor call
- SettingModel2: `CustomItem` type referenced in `@ts-ignore` comment but never defined (uses `FolderTemplate` at runtime)
- SettingModel2: Reset Settings button onClick handler has unclosed braces/incomplete logic
- SettingModel2: `addCustomSettingCards` always uses `custom_items.length - 1` for index (incorrect for multiple cards)
- SettingModel2: Some CSS classes referenced (e.g. `mirror-separator`, `mirror-plugin-banner`, `mirror-card`) but no styles.css yet
- `stopBuild` property declared but never used
- `editorDrop`, `applyMirrorPlugin`, `rerender`, `eventLayoutChange`, `addToolbarToActiveLeaf`, `removeToolbarFromActiveLeaf` are all dead code stubs
- `noteLayoutChange` receives `leaves.values` (a function reference) instead of actual values

### Architecture
- `src/main.ts` — `MirrorUIPlugin` (new architecture, event stubs)
- `src/settings.ts` — `MirrorUISettingsTab` + `SuggestionModal` (YAML suggest, active)
- `src/settings/SettingModel1.ts` — `SampleSettingTab` + `MyPluginSettings` (alternative model, not wired)
- `src/settings/SettingModel2.ts` — `SampleSettingTab` + extended `MyPluginSettings` (31KB, massive settings UI, not wired)
- `src/settings/SettingModel3.ts` — `SampleSettingTab` snapshot (identical to Model2, intermediate checkpoint, not wired)
- `src/utils/suggest.ts` — `Suggest<T>` (internal) + `TextInputSuggest<T>` (exported abstract)
- `src/utils/file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`
- `src/utils/utils.ts` — `wrapAround()` helper

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
