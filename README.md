# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v9 — Full Routing + Debug

Re-enables the original `addToolbar` event flow with full routing logic and extensive debug logging. The `eventTests` method from v8 is removed. The sidebar view, ribbon icons, and commands are all re-enabled. Template routing now switches between `ui-live_preview_mode.md` and `ui-preview-mode.md` based on the active view mode.

### What works
- Three workspace events (`file-open`, `layout-change`, `active-leaf-change`) driving `addToolbar`
- YAML frontmatter check for `type: project`
- Mode detection via `view.getMode()` with routing to different template files
- Toolbar injection below `.metadata-container` with `MarkdownRenderer.render()`
- Toolbar removal (`removeToolbar`) called before re-adding and on non-project files
- Sidebar view (`MirrorUIView`) registered and openable via ribbon icon
- Commands: "Decorate Titles" (appends emoji to headings), "Peek into the dark" (time-gated)
- Settings tab loaded in `onload()`

### What doesn't work yet
- `addToolbar` parameter is typed as `WorkspaceLeaf` but `file-open` emits `TFile | null` — type mismatch causes potential runtime errors
- Template files (`templates/ui-live_preview_mode.md`, `templates/ui-preview-mode.md`) must exist in the vault or `vault.adapter.read()` throws ENOENT
- `removeToolbar` is called twice in succession within `addToolbar` (once at top, once before append) — redundant
- Toolbar duplication possible due to race conditions between the three event listeners
- Excessive `Notice` popups on every event fire (debug leftovers)
- `teste()` method is dead code
- Lots of commented-out experimental code
- Settings tab still has no config options

### Architecture
- `src/main.ts` — `MirrorUIPlugin`
- `src/settings.ts` — `mirrorSeetingsTab` (basic stub)
- `src/view.ts` — `MirrorUIView` sidebar

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
