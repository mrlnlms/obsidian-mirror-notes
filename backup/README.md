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

## Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/obsidian-mirror-notes/issues)
- **Discussions**: Join the conversation on the [Obsidian Forum](https://forum.obsidian.md)
- **Updates**: Follow development on [GitHub](https://github.com/yourusername/obsidian-mirror-notes)

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Thanks to the Obsidian team for the excellent plugin API
- Inspired by the Templater and MetaEdit plugins
- Community feedback and contributions