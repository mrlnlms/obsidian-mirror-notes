---
type: project
---

# V5 — cm-scroller DOM Targeting

Experimenting with `.cm-scroller` as the target container for the toolbar.

## What's new
- Tries to find `.cm-scroller` element in the DOM
- Appends toolbar to cm-scroller if found (Notice "AHAHAAHA")
- Still falls back to prepending to containerEl

## What works
- Same YAML detection as v4
- Toolbar still renders via MarkdownRenderer
- New DOM target experiment: `.cm-scroller`

## What doesn't
- cm-scroller targeting is experimental — toolbar ends up in two places
- removeToolbar() called AFTER appending (order bug)
- Still renders hardcoded "marlon leticia livia"
