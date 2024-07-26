# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v17 — Settings.ts final (Era 2)

**Fixes the settings crash from v16.** The final, polished settings file `Settings.ts` replaces `finalmente.ts`. After the SettingModel 1-3 explorations and finalmente.ts consolidation, `Settings.ts` is the clean, production-ready result at 732 lines. The constructor bug is fixed: `SampleSettingTab(app: App, plugin: MyPlugin)` now correctly accepts 2 parameters, matching the `new SampleSettingTab(this.app, this)` call in main.ts.

### What changed in v17
- New `src/settings/Settings.ts` — the final settings module (732 lines), replaces finalmente.ts as the active import
- `src/main.ts` import changed from `./settings/finalmente` to `./settings/Settings`
- Version log: `[Mirror Notes] v17 loaded — Settings.ts final`
- Constructor fix: `constructor(app: App, plugin: MyPlugin)` with proper `super(app, plugin)` call (still has `@ts-ignore` but now matches the 2-param call in main.ts)
- Same interfaces exported: `FolderTemplate`, `MyPluginSettings`, `CustomMirror`, `SampleSettingTab`, `DEFAULT_SETTINGS`
- `src/settings/finalmente.ts` — still exists but no longer imported (superseded by Settings.ts)
- Demo: `_historico/html-prototype.html` — HTML prototype from original `teste.html` (InDrive project note layout)
- Demo: `test-note.md` — v17 test note

### What works
- Settings tab (`SampleSettingTab` from Settings.ts) fully wired into main.ts — **no more crash on settings open**
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
- SettingModel1-3 and finalmente.ts still present as historical snapshots

### What doesn't work yet
- No sidebar view (Era 1's `MirrorUIView` is gone)
- No commands registered
- No ribbon icons
- No styles.css — CSS classes referenced (e.g. `mirror-plugin-banner`, `mirror-card`, `mirror-settings_main`) but no stylesheet
- `src/settings.ts` (v11 settings) is now dead code — superseded but not removed
- Settings.ts still uses `@ts-ignore` on `super(app, plugin)` constructor call
- `addCustomSettingCards` uses `settingKey` variable in template literal but it comes from outer scope
- `eventFileOpen` and `eventActiveLeafChange` are defined but commented out in event registration
- Typo preserved from original: `"Open fhaile has the property"` in `isProp()`
- `stopBuild` flag logic can miss cases (set to true after first match, preventing subsequent matches)

### Architecture
- `src/main.ts` — `MirrorUIPlugin` (fully wired with Settings.ts, full implementation)
- `src/settings.ts` — `MirrorUISettingsTab` + `SuggestionModal` (v11 settings, now dead code)
- `src/settings/Settings.ts` — `SampleSettingTab` + `MyPluginSettings` + `CustomMirror` (ACTIVE, wired)
- `src/settings/finalmente.ts` — `SampleSettingTab` + `MyPluginSettings` + `CustomMirror` (historical, superseded by Settings.ts)
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
