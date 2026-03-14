---
type: project
version: v11
date: 2024-07-19
era: 2
title: Settings Evolution Start
---

# v11 — settings.ts + YAMLSuggest

Start of Era 2: Settings Evolution. This version replaces Era 1's entire architecture with the settingsPlugin codebase — a fresh plugin focused on building a proper settings UI.

## What changed from v10

Complete rewrite. Era 1's toolbar injection system (`addToolbar`, `removeToolbar`, `handleLeafChange`, sidebar view) is replaced by a new architecture focused on settings and template configuration.

### New architecture
- **settings.ts**: Full settings tab with `MirrorUISettingsTab` — dynamic form for folder template settings (templateName, templatePath, yamlAttribute, yamlValue)
- **YAMLSuggest**: `SuggestionModal` class inside settings.ts — reads all YAML frontmatter properties from the vault's metadata cache and presents them as clickable suggestions when the YAML attribute field is clicked
- **main.ts**: New plugin class registering `file-open`, `active-leaf-change`, and `layout-change` events with console logging stubs
- **No more view.ts**: The sidebar view from Era 1 is gone

### Settings UI features
- Add/remove template settings dynamically
- Move settings up/down with chevron buttons
- LivePreview Template and Preview Template text fields
- YAML Property field with click-to-suggest from vault metadata
- YAML Property Value text field
- Custom CSS for suggestion modal

## Testing
1. Open Obsidian developer console (Ctrl+Shift+I)
2. Verify `[Mirror Notes] v11 loaded — settings.ts + YAMLSuggest` appears
3. Open plugin settings — you should see the template form
4. Click the YAML attribute field — if vault has frontmatter, suggestions should appear
5. Add/remove settings, reorder with chevrons
