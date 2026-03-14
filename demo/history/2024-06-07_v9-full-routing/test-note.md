---
type: project
---

# v9 — Full Routing + Debug

Version 9 re-enables event-driven toolbar injection with full routing logic. The plugin now:

- Registers three workspace events: `file-open`, `layout-change`, `active-leaf-change`
- Detects frontmatter `type: project` and injects a toolbar below `.metadata-container`
- Routes to different template files based on view mode (`preview` vs `source`)
- Includes extensive `console.log` debug statements for tracing execution
- Removes the toolbar when navigating away from project-type files
- Re-adds the sidebar view (`MirrorUIView`) with ribbon icon
- Adds commands: "Decorate Titles" (emoji append) and "Peek into the dark" (time-gated)

This version represents the first attempt at combining all features into a single working flow.
