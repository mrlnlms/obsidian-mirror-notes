# v24 — Fix YAML

**Date:** 2025-06-24
**SHA:** c980923
**Previous:** v23 (fe45a42) — Modularizacao

## Changes

### YAML Frontmatter Parser Fix (`src/editor/mirrorState.ts`)
- Improved `parseFrontmatter()` to handle YAML list items (lines starting with `-`)
- Lists are now parsed into arrays (e.g., `tags` field)
- Uses `trimmedLine` instead of raw `line` for more robust parsing
- Skips empty lines in frontmatter

### Settings Toggle Bug Fix (`settings.ts`)
- Fixed swapped toggle bindings: "Hide properties" was bound to `global_settings_overide` and vice versa
- "Hide properties" now correctly reads/writes `global_settings_hide_props`
- "Replace custom Mirrors" now correctly reads/writes `global_settings_overide`
- Fixed indentation on `saveSettings()` call

### Mirror Config Priority Logic Rewrite (`src/editor/mirrorConfig.ts`)
- Rewrote priority logic for custom vs global mirrors
- New flow: find applicable custom mirror first, then evaluate priority rules
- If global has "Replace custom Mirrors" OFF: custom always wins
- If global has "Replace custom Mirrors" ON: only custom with override wins
- Global mirror applied as fallback when no custom mirror takes precedence

### Frontmatter Hiding with Decoration.replace (`src/editor/mirrorDecorations.ts`)
- Added `HideFrontmatterWidget` class using `Decoration.replace` instead of per-line `display: none`
- When `hideProps` is active, frontmatter is replaced with a hidden span
- Widget placement adjusted: added after frontmatter end when position is `top`
- Separated logic for hideProps active vs inactive paths
- Added extensive debug logging

### Widget Debug Logging (`src/editor/mirrorWidget.ts`)
- Added console.log statements for widget creation, caching, template loading, and rendering

## Test Plan

- [ ] Open a note with YAML frontmatter containing list items (e.g., `tags:` with `- tag1`, `- tag2`)
- [ ] Verify frontmatter is parsed correctly (check console logs)
- [ ] Toggle "Hide properties" in settings — verify it hides/shows frontmatter
- [ ] Toggle "Replace custom Mirrors" — verify it controls global vs custom priority
- [ ] Test with a custom mirror that has `custom_settings_overide` ON when global override is also ON
- [ ] Verify widget renders at correct position (top/bottom) when hideProps is active
- [ ] Version log: `[Mirror Notes] v24 loaded — Fix YAML`
