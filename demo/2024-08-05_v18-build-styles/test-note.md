---
type: test
version: v18
date: 2024-08-05
title: "v18 — Build + styles"
---

# v18 — Build + styles

Last version of Era 2. Adds `styles.css` with actual plugin styling.

## What changed
- **styles.css**: Real CSS replacing the placeholder. Includes styles for:
  - `.headers-toggleing` — flex layout for header toggles
  - `.project-toolbar` — floating toolbar styling
  - `.full-width-input` — full-width input fields
  - `.mirror-reset` — reset button spacing
  - `.search-input-container` — search input layout
  - `.global-note-selection-setting` — global note selection
  - `.mirror-settings-custom-settings` — custom settings spacing
  - `.mirror-plugin-banner` — banner card styling
  - `.mirror-card` — general card styling
  - `.global-mirror-settings` — global settings container
  - `.mirror-separator` — dotted separator
  - `.mirror-accordion` — accordion/details styling with callout colors

## _historico files
- `banner-test-note.md` — banner CSS class test note (from `Resolver o problema do nome.md`)
- `type-project-test.md` — project type test note (from `Untitled 6.md`)

## Era 2 summary
Era 2 (v11-v18) covered:
- v11: Settings.ts + YAMLSuggest.ts
- v12: utils/ autocomplete
- v13-v16: SettingModels evolution
- v17: Settings.ts final (crash fix)
- v18: Build + styles (this version)
