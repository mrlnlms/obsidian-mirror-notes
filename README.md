# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v3 — YAML Frontmatter Detection

Complete rewrite. Checks YAML frontmatter on file-open and conditionally renders a custom element.

### What works
- Reads YAML frontmatter via `metadataCache`
- Conditional rendering when `type: projects` matches
- Cleanup when switching notes

### What doesn't work yet
- Type check uses `projects` (plural) — won't match `type: project`
- Yellow bar is raw DOM, not Obsidian's design system
- No template loading
- Button has no icon

### Architecture
- Single file: `src/main.ts`
- Class: `MyCustomPlugin extends Plugin`
- Event: `file-open` → check YAML → render or cleanup

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
