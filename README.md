# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v16 — finalmente.ts (Era 2)

KEY milestone: the settings model is **finally wired into main.ts**. After three parallel explorations (SettingModel1-3), `finalmente.ts` ("finally" in Portuguese) is the settings file that actually gets imported and used by main.ts. This version also replaces the stub event handlers in main.ts with the full implementation from the Era 2 source.

### What changed in v16
- New `src/settings/finalmente.ts` — the settings model that finally works (59KB, wired into main.ts)
- `src/main.ts` completely rewritten — stubs replaced with full implementation from Era 2 source
- main.ts now imports `{ DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab }` from `./settings/finalmente`
- `scriptTeste()` — core mirror evaluation logic (global vs custom, with override support)
- `isFileName()`, `isFolder()`, `isProp()` — filter matching against active file
- `applyMirrorPlugin()` — applies mirror content based on view mode (live preview vs reading)
- `rerender()` — forces re-render of all markdown views (toggle source/preview to refresh)
- `eventLayoutChange()` — handles layout changes, manages toolbar lifecycle
- `addToolbarToActiveLeaf()` — renders mirror note content into toolbar div, injects CSS classes from frontmatter
- `removeToolbarFromActiveLeaf()` — cleanup with cssClassesMap tracking
- `cssClassesMap: Map<string, string[]>` — tracks injected CSS classes per file for proper cleanup
- `src/settings.ts` — still exists but no longer imported by main.ts (superseded by finalmente.ts)

### What works
- Settings tab (`SampleSettingTab` from finalmente.ts) fully wired into main.ts
- Getting Started banner with dismiss functionality
- Global Mirror toggle — applies mirror to all notes in vault
- Custom Mirrors — card-based UI with per-mirror configuration
- Per-mirror settings: Live Preview template, Preview template, position (top/bottom/left/right)
- Multi-criteria filtering: by filename (`FileSuggest`), folder path (`FolderSuggest`), YAML property+value (`YamlPropertySuggest`)
- Card management: add, delete, reorder (up/down), collapse/expand
- Hide properties toggle per mirror
- Replace custom mirrors toggle (global override behavior)
- Reset settings button
- `layout-change` event triggers `scriptTeste()` which evaluates all mirrors
- Mirror content rendered via `MarkdownRenderer.render()` into `.project-toolbar` div
- CSS class injection from mirror target's frontmatter (`cssClass`/`cssclass`/`cssClasses`/`cssclasses`)
- Special `banner` class handling — only applied if source file has `mosxbanner` property
- Toolbar lifecycle management (add/remove with DOM queries)
- Settings persistence via `loadData()`/`saveData()`
- `resetSettings()` method to restore defaults
- `TextInputSuggest<T>` autocomplete system with keyboard navigation
- SettingModel1-3 still present as historical snapshots

### What doesn't work yet
- No sidebar view (Era 1's `MirrorUIView` is gone)
- No commands registered
- No ribbon icons
- No styles.css — CSS classes referenced (e.g. `mirror-plugin-banner`, `mirror-card`, `mirror-settings_main`) but no stylesheet
- `src/settings.ts` (v11 settings) is now dead code — superseded but not removed
- finalmente.ts uses `@ts-ignore` on `super(app, plugin)` constructor call
- finalmente.ts `addCustomSettingCards` uses `settingKey` variable in template literal but it comes from outer scope
- `eventFileOpen` and `eventActiveLeafChange` are defined but commented out in event registration
- Typo preserved from original: `"Open fhaile has the property"` in `isProp()`
- `stopBuild` flag logic can miss cases (set to true after first match, preventing subsequent matches)

### Architecture
- `src/main.ts` — `MirrorUIPlugin` (fully wired with finalmente.ts, full implementation)
- `src/settings.ts` — `MirrorUISettingsTab` + `SuggestionModal` (v11 settings, now dead code)
- `src/settings/finalmente.ts` — `SampleSettingTab` + `MyPluginSettings` + `CustomMirror` (ACTIVE, wired)
- `src/settings/SettingModel1.ts` — `SampleSettingTab` + `MyPluginSettings` (historical, not wired)
- `src/settings/SettingModel2.ts` — `SampleSettingTab` + extended `MyPluginSettings` (historical, not wired)
- `src/settings/SettingModel3.ts` — `SampleSettingTab` snapshot (historical, not wired)
- `src/utils/suggest.ts` — `Suggest<T>` (internal) + `TextInputSuggest<T>` (exported abstract)
- `src/utils/file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`
- `src/utils/utils.ts` — `wrapAround()` helper

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
