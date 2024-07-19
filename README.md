# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v11 — Settings Evolution Start (Era 2)

Start of Era 2. Complete architecture rewrite — the Era 1 toolbar injection system is replaced by a new settings-focused plugin from the settingsPlugin codebase. This version introduces a full settings tab UI with dynamic form elements and a YAML property suggestion system.

### What works
- Settings tab (`MirrorUISettingsTab`) with dynamic add/remove of template settings
- Each setting has: LivePreview Template path, Preview Template path, YAML Attribute, YAML Value
- YAML attribute field has a click-to-suggest modal (`SuggestionModal`) that reads all frontmatter properties from the vault's metadata cache
- Settings reordering with up/down chevron buttons
- Delete button per setting entry
- Settings persistence via `loadData()`/`saveData()`
- `resetSettings()` method to restore defaults
- Three event listeners registered: `file-open`, `active-leaf-change`, `layout-change`
- Console logging for all event handlers (debug stubs)

### What doesn't work yet
- Event handlers are stubs — they log to console but don't do anything functional
- No toolbar injection (Era 1's toolbar system was removed)
- No sidebar view (Era 1's `MirrorUIView` is gone)
- No commands registered
- No ribbon icons
- `SuggestionModal` injects inline `<style>` into `document.head` on every open (accumulates)
- `SuggestionModal` uses a basic `Modal` instead of Obsidian's `SuggestModal` — no keyboard navigation
- `stopBuild` property declared but never used
- `editorDrop`, `applyMirrorPlugin`, `rerender`, `eventLayoutChange`, `addToolbarToActiveLeaf`, `removeToolbarFromActiveLeaf` are all dead code stubs
- `noteLayoutChange` receives `leaves.values` (a function reference) instead of actual values

### Architecture
- `src/main.ts` — `MirrorUIPlugin` (new architecture, event stubs)
- `src/settings.ts` — `MirrorUISettingsTab` + `SuggestionModal` (YAML suggest)

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
