# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v12 — utils/ autocomplete (Era 2)

Extracted autocomplete utilities into a dedicated `src/utils/` folder. The `TextInputSuggest<T>` abstract class provides Popper.js-based dropdown positioning, and concrete implementations (`FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`) are ready to replace the basic `SuggestionModal` from v11.

### What changed in v12
- New `src/utils/suggest.ts` — `TextInputSuggest<T>` abstract class with `@popperjs/core` for dropdown positioning
- New `src/utils/file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest` concrete implementations
- New `src/utils/utils.ts` — `wrapAround()` helper for cycling through suggestion list items
- Added `@popperjs/core` as a dependency

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
- `TextInputSuggest<T>` autocomplete system with keyboard navigation (ArrowUp/Down/Enter/Escape), Popper.js positioning, and click/mouseover support — available but not yet wired into settings UI

### What doesn't work yet
- Event handlers are stubs — they log to console but don't do anything functional
- No toolbar injection (Era 1's toolbar system was removed)
- No sidebar view (Era 1's `MirrorUIView` is gone)
- No commands registered
- No ribbon icons
- `SuggestionModal` injects inline `<style>` into `document.head` on every open (accumulates)
- `SuggestionModal` uses a basic `Modal` instead of Obsidian's `SuggestModal` — no keyboard navigation
- The new `TextInputSuggest` system is not yet integrated into the settings UI (still using old `SuggestionModal`)
- `stopBuild` property declared but never used
- `editorDrop`, `applyMirrorPlugin`, `rerender`, `eventLayoutChange`, `addToolbarToActiveLeaf`, `removeToolbarFromActiveLeaf` are all dead code stubs
- `noteLayoutChange` receives `leaves.values` (a function reference) instead of actual values

### Architecture
- `src/main.ts` — `MirrorUIPlugin` (new architecture, event stubs)
- `src/settings.ts` — `MirrorUISettingsTab` + `SuggestionModal` (YAML suggest)
- `src/utils/suggest.ts` — `Suggest<T>` (internal) + `TextInputSuggest<T>` (exported abstract)
- `src/utils/file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`
- `src/utils/utils.ts` — `wrapAround()` helper

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
