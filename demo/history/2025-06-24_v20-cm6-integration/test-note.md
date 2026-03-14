---
type: project
title: CM6 Integration Test
status: active
---

# v20 — CM6 Integration Test

This version marks the **start of Era 4**: a complete architectural rewrite using CodeMirror 6.

## What Changed

- **Complete rewrite**: All Era 3 settings/utils code removed
- **New CM6 architecture**: `src/editor/` with StateField, ViewPlugin, WidgetType
- **mirrorState.ts**: StateField for managing mirror state (enabled, templatePath, frontmatter)
- **mirrorViewPlugin.ts**: ViewPlugin that renders template widgets above the editor
- **mirrorWidget.ts**: WidgetType for inline template rendering
- **Frontmatter detection**: Parses YAML to detect `type: project` notes
- **Template rendering**: Loads and renders markdown templates with variable substitution

## Testing

1. Open this note in Obsidian with the plugin enabled
2. The `type: project` frontmatter should trigger the mirror widget
3. A template widget should appear above the editor content
4. The close button (x) should dismiss the widget

## Architecture

```
main.ts              — Plugin entry, editor setup, CM6 extension registration
src/editor/
  mirrorState.ts     — StateField + StateEffects for mirror state management
  mirrorViewPlugin.ts — ViewPlugin that creates/updates/removes the widget DOM
  mirrorWidget.ts    — WidgetType for inline decoration (alternative approach)
```
