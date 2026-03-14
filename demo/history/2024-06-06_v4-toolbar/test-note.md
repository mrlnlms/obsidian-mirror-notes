---
type: project
---

# V4 — ProjectToolbarPlugin + MarkdownRenderer

Major step. Class renamed to `ProjectToolbarPlugin`. First use of Obsidian's `MarkdownRenderer.render()` API.

## What's new
- Class: `ProjectToolbarPlugin` (was `MyCustomPlugin`)
- Three events registered: `file-open`, `layout-change`, `active-leaf-change`
- Uses `MarkdownRenderer.render()` to render markdown content into toolbar div
- Type check fixed: now checks `type === "project"` (singular, correct!)
- `removeToolbar()` method for cleanup
- Notice "AHA" on type match

## What works
- YAML detection with correct `type: project`
- Toolbar div prepended to active leaf
- MarkdownRenderer renders hardcoded string "marlon\n leticia \n livia"
- Cleanup on non-project notes

## What doesn't
- Renders hardcoded string, not template file content
- Toolbar positioning is basic (prepend to containerEl)
- Template path referenced but not loaded yet
