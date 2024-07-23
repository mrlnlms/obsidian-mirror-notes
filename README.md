# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v14 — SettingModel2 (Era 2)

The BIG settings model — `src/settings/SettingModel2.ts` at 31KB. Massive expansion of the settings UI with Getting Started banner, Global/Custom mirror sections, card-based custom mirrors, and multi-criteria filtering (filename, folder, YAML properties with key+value pairing). This is a parallel settings model (not wired into `main.ts`), evolving from SettingModel1.

### What changed in v14
- New `src/settings/SettingModel2.ts` — 31KB settings model with `SampleSettingTab` class
- Getting Started banner with dismiss button and persistent `enable_getting_started` toggle
- Global Mirror Settings section with toggle header (`enable_global_settings`)
- Custom Mirror Settings with card-based UI (`enable_custom_settings`)
- Filter by Filename (`filter_files`), Filter by Folder (`filter_folders`), Filter by Properties (`filter_props` + `filter_props_values`)
- Custom mirror cards with move up/down, collapse, edit, reset, delete buttons
- Live Preview Mode + Preview Mode template selection per mirror card
- Replace Mirror toggle (global vs custom override logic)
- `custom_items` array for dynamic card management with "Add New Mirror" button
- Property value pairing — YAML filter with key + value fields side by side
- `clearAdjacentField()` — clears the paired value field when clearing a property key
- `addToggleHeader()` — reusable toggle+heading component
- `addStatsDescr()` — section description with global/custom variants
- `replaceMirror()` — toggle for mirror override behavior
- `addTemplateSelection()` — generic template selection with toggle + conditional file picker
- `addSelectionField()` — reusable file search field with `FileSuggest`
- `addInputFilePath()` — dynamic filter rows with suggesters (`FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`)
- `addCustomSettingCards()` — card renderer for custom mirrors with full button bar
- Extended `MyPluginSettings` interface with 10+ new fields
- Extended `DEFAULT_SETTINGS` with defaults for all new fields

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
- `src/utils/suggest.ts` — `Suggest<T>` (internal) + `TextInputSuggest<T>` (exported abstract)
- `src/utils/file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`
- `src/utils/utils.ts` — `wrapAround()` helper

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
