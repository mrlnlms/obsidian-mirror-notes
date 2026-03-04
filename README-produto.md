# Mirror Notes Plugin

A powerful Obsidian plugin that allows you to display dynamic templates in your notes based on frontmatter properties.

## Features

- **Dynamic Template Injection**: Automatically display templates in your notes based on YAML frontmatter
- **Multiple Mirror Configurations**: Create custom mirrors for different types of notes
- **Flexible Filtering**: Filter by file name, folder path, or YAML properties
- **Template Variables**: Use `{{variable}}` syntax to inject frontmatter values into templates
- **Position Control**: Place templates at the top or bottom of your notes
- **Hide Properties Option**: Optionally hide the frontmatter section in notes with mirrors
- **Live Preview Support**: Works seamlessly in Obsidian's Live Preview mode
- **Smart Position Tracking**: Bottom-positioned widgets now correctly follow text as you type
- **Performance Optimized**: Intelligent caching and debouncing for smooth editing experience.

## Installation

### From Obsidian Community Plugins (Coming Soon)
1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Search for "Mirror Notes"
4. Click Install, then Enable

### Manual Installation
1. Download the latest release from the GitHub releases page
2. Extract the files to your vault's `.obsidian/plugins/mirror-notes/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

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
## 📊 Project Dashboard

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
- **Override**: Control mirror priority

## Tips

- Use meaningful template names for easy management
- Test your filters with a few notes before applying broadly
- Templates update automatically when you change frontmatter values
- Use the {{variable}} syntax to create dynamic content

## Development

This plugin is built with:
- TypeScript
- Obsidian API
- CodeMirror 6

### Building from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-mirror-notes

# Install dependencies
npm install

# Build the plugin
npm run build

# For development with auto-reload
npm run dev
```

## Version History (v25 FINAL)

This plugin's development history spans 25 versions across 4 eras.

### Era 1: Prototype Sprint (Jun 6-8, 2024)
- **v1** (2024-06-06) — Skeleton: Notice, stubs
- **v2** (2024-06-06) — Ribbon button + tooltip
- **v3** (2024-06-06) — YAML type check
- **v4** (2024-06-06) — ProjectToolbarPlugin + MarkdownRenderer
- **v5** (2024-06-07) — cm-scroller targeting
- **v6** (2024-06-07) — MirrorUIPlugin class with settings, view, ribbon
- **v7** (2024-06-07) — Settings tab enabled
- **v8** (2024-06-07) — Mode detection
- **v9** (2024-06-07) — Full routing + debug
- **v10** (2024-06-08) — v1 final + first _historico files

### Era 2: Settings Evolution (Jul 19 - Aug 5, 2024)
- **v11** (2024-07-19) — settings.ts + YAMLSuggest
- **v12** (2024-07-20) — utils/ autocomplete
- **v13** (2024-07-22) — SettingModel1
- **v14** (2024-07-23) — SettingModel2 (31KB)
- **v15** (2024-07-24) — SettingModel3 (checkpoint)
- **v16** (2024-07-25) — finalmente.ts wired into main.ts
- **v17** (2024-07-26) — Settings.ts final (fixes constructor crash)
- **v18** (2024-08-05) — Build + styles.css

### Era 3: CSS (Nov 2024)
- **v19** (2024-11-16) — styles.css rewrite (grid layout)

### Era 4: CM6 Rewrite (Jun 24, 2025)
- **v20** (2025-06-24) — CM6 integration (full CodeMirror 6 rewrite)
- **v21** (2025-06-24) — Settings + v1.1.0
- **v22** (2025-06-24) — Posicionamento (widget positioning)
- **v23** (2025-06-24) — Modularizacao (code modularization)
- **v24** (2025-06-24) — Fix YAML (frontmatter parsing + config priority)
- **v25** (2025-06-24) — **Fix hideProps (FINAL VERSION)** — CSS-based property hiding

## Known Issues (v25)

- **Hide Properties not working**: The CSS-based approach (`updateHidePropsForView()` adds `.mirror-hide-properties` class) fires correctly (visible in console logs) but the CSS selector `.mirror-hide-properties .metadata-container { display: none }` does not match the current Obsidian DOM structure. Frontmatter remains visible even with the toggle enabled.
- **YAML list filtering broken**: `filterProps` matching uses strict equality (`===`), which fails for array values like `tags: [tag1, tag2]`. Only simple string properties work (e.g., `type: projects`).
- **parseFrontmatter hardcodes lists to tags**: All YAML list items (lines starting with `-`) are pushed to `result.tags` regardless of the actual property key.

## Support

- **Issues**: [GitHub Issues](https://github.com/mrlnlms/mirror-notes/issues)
- **Source**: [GitHub](https://github.com/mrlnlms/mirror-notes)

## License

MIT License - see LICENSE file for details