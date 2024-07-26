---
type: project
---

# V17 — Settings.ts Final (731 lines)

The definitive settings module. After the Models 1-3 and finalmente.ts iterations, this is the clean, final version: `Settings.ts` at 731 lines. All the experimentation consolidated into production-ready settings code.

## What's new
- **Settings.ts replaces all previous models** — clean rewrite, 731 lines
- **Full CustomMirror system** — per-mirror configuration for templates, positioning, property hiding
- **Folder + file + property filters** per mirror
- **Live preview and preview mode** template support per mirror
- **Clean UI** — dropdown selectors, toggle switches, organized sections

## Architectural significance
This is the "final answer" to the settings architecture. Models 1-3 explored different approaches, finalmente.ts consolidated them, and Settings.ts is the polished result. From this point, settings code is stable.

## Visible changes
- Console: `v17 loaded`
- Settings tab should be fully functional with all mirror configuration options
- No visual changes to the main editor — settings are internal configuration
