# Mirror Notes Plugin

A powerful Obsidian plugin that displays dynamic templates in your notes based on frontmatter properties. Change a YAML value, and the rendered content updates automatically — no manual copy-paste, no stale templates.

## Features

- **Dynamic Template Injection**: Automatically display templates in your notes based on YAML frontmatter
- **Multiple Mirror Configurations**: Create custom mirrors for different types of notes
- **Flexible Filtering**: Filter by file name, folder path, or YAML properties
- **Template Variables**: Use `{{variable}}` syntax to inject frontmatter values into templates
- **Position Control**: Place templates at the top or bottom of your notes
- **Hide Properties Option**: Optionally hide the frontmatter section in notes with mirrors
- **Live Preview Support**: Works seamlessly in Obsidian's Live Preview mode
- **Performance Optimized**: Intelligent caching and debouncing for smooth editing

## Installation

### Manual Installation
1. Download the latest release from the [GitHub releases page](https://github.com/mrlnlms/mirror-notes/releases)
2. Extract the files to your vault's `.obsidian/plugins/mirror-notes/` folder
3. Reload Obsidian
4. Enable the plugin in Settings > Community Plugins

## Usage

### Basic Setup

1. Create a template file (e.g., `templates/project-template.md`)
2. Open Mirror Notes settings
3. Create a new mirror configuration
4. Set up filters (by file, folder, or property)
5. Select your template file
6. Choose the position (top or bottom)

### Example

Create a template at `templates/project-dashboard.md`:
```markdown
## Project Dashboard

**Project:** {{title}}
**Status:** {{status}}
**Priority:** {{priority}}

### Quick Actions
- [ ] Review progress
- [ ] Update timeline
- [ ] Check dependencies
```

Configure a mirror to show this template in all notes with `type: project` in their frontmatter.

Your project notes will automatically display the dashboard:
```markdown
---
title: Website Redesign
type: project
status: in-progress
priority: high
---

# Project Content

Your regular note content here...
```

## Use Cases

### Reusable Content Blocks
Share common sections across related notes. Create a "Research Methodology" template and filter by `type: research` — every research note gets the methodology section automatically. Update the template once, every note reflects the change.

### Project Dashboards
Add status dashboards to project notes. Filter by folder (`Projects/`) or property (`type: project`) and inject a template with `{{status}}`, `{{deadline}}`, `{{owner}}` variables pulled from each note's frontmatter.

### Hierarchical Organization
Different templates for different categories:
```
Global Mirror       → Company header (all notes)
  └── type: thesis  → Thesis template (overrides global)
  └── type: article → Article template (overrides global)
  └── status: draft → Draft warning banner
```
Custom mirrors override global ones when configured with the override toggle.

### Academic Workflows
Maintain consistent structure across thesis chapters, articles, and reading notes. Each note type gets its own template with the right fields, checklists, and structure — all driven by a single YAML property.

## Configuration

### Global Mirror
- Enable a template that appears in all notes
- Can be overridden by custom mirrors

### Custom Mirrors
Create multiple mirrors with different configurations:
- **Filter by File**: Target specific file names
- **Filter by Folder**: Apply to all notes in a folder
- **Filter by Properties**: Match YAML frontmatter values

### Settings
- **Position**: Top or Bottom of the note
- **Hide Properties**: Hide the frontmatter section
- **Override**: Control mirror priority (custom vs global)

## Known Issues (v25)

- **Hide Properties not working**: The CSS-based approach (`updateHidePropsForView()` adds `.mirror-hide-properties` class) fires correctly but the CSS selector does not match the current Obsidian DOM structure. Frontmatter remains visible.
- **YAML list filtering broken**: `filterProps` matching uses strict equality (`===`), which fails for array values like `tags: [tag1, tag2]`. Only simple string properties work (e.g., `type: projects`).
- **parseFrontmatter hardcodes lists to tags**: All YAML list items (lines starting with `-`) are pushed to `result.tags` regardless of the actual property key.

## Development

### How It Works

Mirror Notes uses CodeMirror 6 extensions to inject content directly into the editor. A **StateField** parses the document's frontmatter and matches it against configured filters. When a match is found, a **ViewPlugin** creates decorations, and a **WidgetType** renders the template markdown with `{{variable}}` substitution from the note's frontmatter values. The plugin never modifies the note's content — it only adds visual elements to the editor DOM.

### Architecture

```
main.ts                          — Plugin lifecycle, CM6 setup, hideProps
settings.ts                      — Settings tab (global/custom mirrors, filters)
src/editor/mirrorState.ts        — CM6 StateField + StateEffects + parseFrontmatter
src/editor/mirrorViewPlugin.ts   — CM6 ViewPlugin (widget rendering)
src/editor/mirrorWidget.ts       — CM6 WidgetType (template + {{var}} substitution)
src/editor/mirrorConfig.ts       — Configuration + filter matching logic
src/editor/mirrorDecorations.ts  — Decoration builder
src/editor/mirrorTypes.ts        — Shared type definitions
src/editor/mirrorUtils.ts        — Editor utility functions
styles.css                       — Plugin styles + hideProps CSS
```

### Building from Source
```bash
git clone https://github.com/mrlnlms/mirror-notes
npm install
npm run build    # production build
npm run dev      # watch mode
```

## Version History

25 versions across 4 development eras. See [docs/CHANGELOG.md](docs/CHANGELOG.md) for the full history.

| Era | Period | Summary |
|-----|--------|---------|
| Era 1: Prototype Sprint | Jun 2024 | v1-v10 — First working prototype |
| Era 2: Settings Evolution | Jul-Aug 2024 | v11-v18 — Settings UI, autocomplete, build system |
| Era 3: CSS | Nov 2024 | v19 — Styles rewrite |
| Era 4: CM6 Rewrite | Jun 2025 | v20-v25 — Full CodeMirror 6 rewrite (current) |

## Support

- **Issues**: [GitHub Issues](https://github.com/mrlnlms/mirror-notes/issues)
- **Source**: [GitHub](https://github.com/mrlnlms/mirror-notes)

## License

MIT License - see [LICENSE](LICENSE) for details.
