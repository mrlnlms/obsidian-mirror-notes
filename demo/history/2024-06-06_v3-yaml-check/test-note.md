---
type: projects
---

# V3 — YAML Frontmatter Detection

Complete rewrite. Now checks YAML frontmatter `type` field on file-open events.

## What's new
- Class renamed to `MyCustomPlugin`
- Uses `metadataCache.getFileCache(file)?.frontmatter` to read YAML
- Checks for `type: 'projects'` (note: plural, not "project")
- Renders a yellow bar with button when type matches
- Cleans up element when switching to non-matching note

## What works
- YAML frontmatter detection via metadataCache
- Conditional rendering based on type field
- Cleanup on file switch

## What doesn't
- Type check is `projects` (plural) — won't match `type: project` notes
- Yellow background bar is raw DOM, not Obsidian UI
- No template loading yet
- Button has no icon (commented out)
