# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v10 — v1 Final Clean

Final version of Era 1. Cleans up v9's debug-heavy approach by scoping DOM queries to the leaf's `view.containerEl` instead of global `document.querySelector`. The `removeToolbar` method now takes a `leaf` parameter for proper scoping. A new `handleLeafChange` validates views before toolbar injection. Debug `Notice` popups are removed. Dead code (`teste()`) is gone. A new `onActiveFileLeafChange` handler is added for file-level change detection. Event listeners are reduced from three (`file-open`, `layout-change`, `active-leaf-change`) to two `active-leaf-change` registrations (one for `onActiveFileLeafChange`, one for `addToolbar`).

This is the first version to include `_historico` files — development milestone documents from Era 1.

### What works
- Two `active-leaf-change` event listeners driving toolbar injection
- YAML frontmatter check for `type: project`
- Mode detection via `view.getMode()` with routing to different template files
- Toolbar injection below `.metadata-container` scoped to `view.containerEl`
- Toolbar removal scoped per-leaf via `removeToolbar(leaf)`
- Duplicate toolbar guard via `view.containerEl.querySelector(".project-toolbar")`
- Sidebar view (`MirrorUIView`) registered and openable via ribbon icon
- Commands: "Decorate Titles" (appends emoji to headings), "Peek into the dark" (time-gated)
- Settings tab loaded in `onload()`

### What doesn't work yet
- Template files (`templates/ui-live_preview_mode.md`, `templates/ui-preview-mode.md`) must exist in the vault or `vault.adapter.read()` throws ENOENT
- `onActiveFileLeafChange` returns a bound function reference instead of calling it — effectively a no-op
- `handleLeafChange` is defined but never called (dead code candidate)
- `mylayout` method is dead code
- Two `active-leaf-change` registrations means `addToolbar` fires twice per leaf change
- Settings tab still has no config options
- Commented-out code still present in `handleLeafChange`

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
