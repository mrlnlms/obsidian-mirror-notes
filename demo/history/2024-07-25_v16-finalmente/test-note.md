---
mirror-test: v16-finalmente
cssClass: banner
type: project
---

# v16 — finalmente.ts

This version represents a KEY milestone: the settings model is **finally wired into main.ts**.

## What changed

- `finalmente.ts` — the settings UI that "finally works" (Portuguese: "finalmente" = "finally")
- `main.ts` — completely rewritten with full implementation:
  - `scriptTeste()` — the core logic that evaluates custom mirrors
  - `isFileName()`, `isFolder()`, `isProp()` — filter matching functions
  - `applyMirrorPlugin()` — applies mirror based on view mode (live preview vs reading)
  - `rerender()` — forces re-render of markdown views
  - `eventLayoutChange()` — handles layout changes with toolbar
  - `addToolbarToActiveLeaf()` — injects rendered mirror content + CSS classes
  - `removeToolbarFromActiveLeaf()` — cleanup with CSS class map tracking

## Architecture

Settings (finalmente.ts) defines:
- `MyPluginSettings` — full settings interface with global + custom mirrors
- `CustomMirror` — per-mirror config (filters by file, folder, YAML props)
- `SampleSettingTab` — complete settings UI with cards, toggles, file/folder/YAML suggest

Main.ts now:
- Imports from finalmente.ts (not the old settings.ts)
- Uses `layout-change` event with `scriptTeste()` as the entry point
- Supports global mirror (apply to all notes) vs custom mirrors (filter-based)
- Handles CSS class injection from mirror target frontmatter
- Manages toolbar lifecycle (add/remove with DOM queries)

## Previous versions (parallel explorations)
- v13: SettingModel1 — basic structure
- v14: SettingModel2 — expanded UI
- v15: SettingModel3 — refined settings (checkpoint)
- v16: finalmente.ts — **the one that actually gets wired in!**
