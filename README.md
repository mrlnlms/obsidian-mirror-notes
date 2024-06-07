# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v7 — Settings Tab Enabled

Settings tab now active. Shows "Mirror UI Settings" in Obsidian settings.

### What works
- Settings tab visible (empty, just heading)
- Ribbon icons, commands, YAML detection, sidebar view

### What doesn't work yet
- Settings tab has no config options
- Template rendering still experimental

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
