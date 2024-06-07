# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v8 — Mode Detection

New `eventTests` method uses `view.getMode()` to detect whether the editor is in source or preview mode. Events now route through this new handler instead of `addToolbar`. The old `addToolbar` method is kept but commented out of the event bindings.

### What works
- Mode detection via `view.getMode()` (displays mode in a Notice)
- YAML frontmatter check for `type: project`
- Template rendering into `.metadata-container`
- Settings tab, ribbon icons, commands, sidebar view

### What doesn't work yet
- `eventTests` crashes when `leaf` or `leaf.view` is undefined (missing null guards that `addToolbar` had)
- Template file `templates/ui-live_preview_mode.md` doesn't exist — causes ENOENT error
- Mode-based template switching is commented out (only default template path used)
- No toolbar cleanup (`removeToolbar` call is commented out in `eventTests`)
- Settings tab still has no config options
- Ribbon icons and commands removed from this version's onload

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
