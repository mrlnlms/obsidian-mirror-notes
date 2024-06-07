# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v5 — cm-scroller Targeting

Experimenting with `.cm-scroller` as toolbar container target.

### What works
- YAML detection, MarkdownRenderer rendering
- Tries `.cm-scroller` as target (CodeMirror's scroll container)

### What doesn't work yet
- Toolbar appended to cm-scroller AND prepended to containerEl (duplicate)
- removeToolbar() order bug (called after append)
- Still hardcoded content

### Architecture
- Single file: `src/main.ts`
- Class: `ProjectToolbarPlugin extends Plugin`

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
