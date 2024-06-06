# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v2 — Ribbon Button Attempt

Second iteration. Trying to add a custom button to the left ribbon sidebar.

### What works
- Plugin loads
- Registers `active-leaf-change` event
- Attempts to add button to ribbon with click handler
- Click tries to insert a custom block after h1

### What doesn't work yet
- Custom `addIcon` conflicts with Obsidian's API
- MDI icons not available
- No YAML detection
- No template injection
- Tooltip implementation is raw HTML (no cleanup)

### Architecture
- Single file: `src/main.ts`
- Class: `MyPlugin extends Plugin`
- Methods: `addToolbar`, `addToolbarIcon`, `insertCustomBlock`, `addHoverTooltip`

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
