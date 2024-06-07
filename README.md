# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v4 — ProjectToolbarPlugin + MarkdownRenderer

First use of `MarkdownRenderer.render()`. Toolbar appears on `type: project` notes.

### What works
- YAML detection: `type: project` (singular, correct)
- Toolbar div rendered via MarkdownRenderer
- Three events: file-open, layout-change, active-leaf-change
- Cleanup on non-project notes

### What doesn't work yet
- Renders hardcoded string, not template file
- Toolbar positioning is basic
- No settings, no view class

### Architecture
- Single file: `src/main.ts`
- Class: `ProjectToolbarPlugin extends Plugin`
- Uses: `MarkdownRenderer.render()`, `metadataCache`

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
