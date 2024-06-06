---
type: project
---

# V2 — Ribbon Button + Tooltip

Second iteration. The plugin now tries to add a custom button to the left ribbon with a tooltip and click handler.

## What's new
- `addToolbar()` targets `.workspace-ribbon-left`
- `addToolbarIcon()` creates a button with MDI icon class
- `addHoverTooltip()` creates custom tooltip on hover
- `insertCustomBlock()` tries to insert "MARLON BRANDON" div after first h1
- `onActiveLeafChange` event listener registered

## What works
- Plugin loads
- Event listener for active leaf change is wired
- Click on button attempts to insert custom block

## What doesn't
- `addIcon` is a custom method, not Obsidian's API — may conflict
- MDI icons not available in Obsidian
- Tooltip is raw HTML appended to body — no cleanup on unload
- No Notice on load anymore (removed)
