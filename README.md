# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v6 — MirrorUIPlugin Class Born

Major milestone. Definitive class name, settings, sidebar view, ribbon icons, commands.

### What works
- Settings load/save, Notice with plugin name
- Ribbon icons (eye, file), commands (Decorate, Peek)
- Custom sidebar view registered
- Template file reading attempt

### What doesn't work yet
- Settings tab commented out
- Template rendering experimental
- Toolbar shows hardcoded "MARLON"

### Architecture
- `src/main.ts` — `MirrorUIPlugin` class
- `src/settings.ts` — `mirrorSeetingsTab`
- `src/view.ts` — `MirrorUIView` sidebar

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
