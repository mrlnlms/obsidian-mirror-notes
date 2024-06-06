# Mirror Notes

Obsidian plugin that loads dynamic templates into notes based on YAML frontmatter.

## Status: v1 — Skeleton

This is the very first version. The plugin loads and shows a Notice, but doesn't do anything useful yet.

### What works
- Plugin loads successfully
- Shows "Opening Mirror Preview Plugin!" Notice on load
- Has stub methods for future functionality

### What doesn't work yet
- No template injection
- No YAML detection
- No UI elements
- File event listeners are commented out

### Architecture
- Single file: `src/main.ts`
- Class: `MyPlugin extends Plugin`
- Entry point: `onload()` → shows Notice

## Development

```bash
npm install
npm run build    # production build
npm run dev      # watch mode
```
