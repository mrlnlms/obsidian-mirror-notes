# Mirror Notes Plugin

A powerful Obsidian plugin that displays dynamic templates in your notes based on frontmatter properties. Change a YAML value, and the rendered content updates automatically — no manual copy-paste, no stale templates.

## Features

- **Dynamic Template Injection**: Automatically display templates in your notes based on YAML frontmatter
- **Multiple Mirror Configurations**: Create custom mirrors for different types of notes
- **Flexible Filtering**: Filter by file name, folder path, or YAML properties
- **Template Variables**: Use `{{variable}}` syntax to inject frontmatter values into templates
- **Position Control**: Place templates at the top or bottom of your notes
- **Hide Properties Option**: Optionally hide the frontmatter section in notes with mirrors
- **Inline Mirror Blocks**: Embed templates anywhere with ` ```mirror``` ` code blocks — works in Live Preview and Reading View
- **Cross-Note Reactivity**: Mirror blocks with `source:` update automatically when the source note's frontmatter changes — even across split views
- **Insert Command**: Right-click menu and command palette entry with file autocomplete
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

### Inline Mirror Blocks

You can also embed mirrors directly in any note using code blocks — no settings required:

````markdown
```mirror
template: templates/project-dashboard.md
```
````

The block renders the template using the current note's frontmatter for `{{variable}}` substitution.

#### Syntax

| Key | Required | Description |
|-----|----------|-------------|
| `template` | Yes | Path to the template file in your vault |
| `source` | No | Path to another note to pull frontmatter from (defaults to current note) |
| Any other key | No | Inline variable overrides |

#### Full example

````markdown
```mirror
template: templates/project-card.md
source: projects/website-redesign.md
status: completed
```
````

Variable resolution order: `inline overrides > source frontmatter > current note frontmatter`.

#### Inserting via menu

Right-click in the editor or use the command palette (`Cmd/Ctrl+P` → **Insert mirror block**) to open a dialog with file autocomplete for template and source paths.

#### Settings mirrors vs inline blocks

| | Settings mirrors | Inline blocks |
|---|---|---|
| **Scope** | Applied automatically to matching notes | Only where you place the block |
| **Configuration** | Plugin settings UI | Written directly in the note |
| **Works in** | Live Preview (CM6 widget) | Live Preview + Reading View |
| **Best for** | Consistent templates across many notes | One-off embeds, mixed layouts |

Both use the same rendering engine and `{{variable}}` syntax.

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

Mirror Notes operates in two modes with a shared rendering engine:

1. **Settings mirrors** (Live Preview): CodeMirror 6 extensions inject content into the editor. A StateField parses frontmatter and matches it against configured filters. When matched, a WidgetType renders the template with `{{variable}}` substitution.

2. **Inline code blocks** (Live Preview + Reading View): A `registerMarkdownCodeBlockProcessor` handles ` ```mirror``` ` blocks, parsing `template:`, `source:`, and inline variables, then rendering through the same template engine.

The plugin never modifies the note's content — it only adds visual elements to the editor DOM.

### Architecture

```
main.ts                                    — Plugin lifecycle, CM6 setup, code block, hideProps
settings.ts                                — Settings tab UI (delegates to builders)
src/settings/types.ts                      — Interfaces, defaults, CustomMirror
src/settings/filterBuilder.ts              — Reusable filter UI builder (files/folders/props)
src/settings/pathValidator.ts              — Inline path validation for settings inputs
src/commands/insertMirrorBlock.ts          — Insert mirror block command + modal
src/rendering/templateRenderer.ts          — Shared rendering engine (CM6 + code block)
src/rendering/codeBlockProcessor.ts        — Code block processor (```mirror```) + cross-note deps
src/rendering/blockParser.ts               — Key:value parser for code blocks
src/rendering/domInjector.ts               — DOM position engine (above-title, properties, backlinks)
src/rendering/sourceDependencyRegistry.ts  — Cross-note dependency tracking
src/editor/mirrorState.ts                  — CM6 StateField + StateEffects
src/editor/mirrorWidget.ts                 — CM6 WidgetType (delegates to templateRenderer)
src/editor/mirrorConfig.ts                 — Configuration + filter matching logic
src/editor/decorationBuilder.ts            — CM6 Decoration builder
src/editor/mirrorTypes.ts                  — Shared type definitions
src/editor/mirrorUtils.ts                  — parseFrontmatter, hashObject, generateWidgetId
src/editor/timingConfig.ts                 — Centralized timing constants
src/editor/marginPanelExtension.ts         — Left/right margin panels (ViewPlugin)
src/suggesters/suggest.ts                  — TextInputSuggest base class (Popper-based)
src/suggesters/file-suggest.ts             — FileSuggest, FolderSuggest, YamlPropertySuggest
src/utils/obsidianInternals.ts             — Typed wrappers for Obsidian internal APIs
src/utils/settingsPaths.ts                 — Auto-update paths on file/folder rename
src/logger.ts                              — Logger with toggle via settings
styles.css                                 — Plugin styles + hideProps + code block CSS
```

### Building from Source
```bash
git clone https://github.com/mrlnlms/mirror-notes
npm install
npm run build    # production build
npm run dev      # watch mode
```

## Version History

33 versions across 5 development eras. See [docs/CHANGELOG.md](docs/CHANGELOG.md) for the full history.

| Era | Period | Summary |
|-----|--------|---------|
| Era 1: Prototype Sprint | Jun 2024 | v1-v10 — First working prototype |
| Era 2: Settings Evolution | Jul-Aug 2024 | v11-v18 — Settings UI, autocomplete, build system |
| Era 3: CSS | Nov 2024 | v19 — Styles rewrite |
| Era 4: CM6 Rewrite | Jun 2025 | v20-v25 — Full CodeMirror 6 rewrite |
| Era 5: Code Blocks + Polish | Mar 2026 | v26-v33 — Inline mirror blocks, shared renderer, rename-aware settings, cross-note reactivity, position engine, structural refactor |

## Support

- **Issues**: [GitHub Issues](https://github.com/mrlnlms/mirror-notes/issues)
- **Source**: [GitHub](https://github.com/mrlnlms/mirror-notes)

## License

MIT License - see [LICENSE](LICENSE) for details.
