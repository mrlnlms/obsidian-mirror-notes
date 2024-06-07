---
type: project
---

# V7 — Settings Tab Enabled

The settings tab is now uncommented and wired. You can see "Mirror UI Settings" in Obsidian settings.

## What's new
- `this.addSettingTab(new mirrorSeetingsTab(this.app, this))` — uncommented and active
- Settings tab shows "Mirror UI Settings" heading
- Template rendering now attempts to read file content and use MarkdownRenderer

## What works
- Settings tab visible in Obsidian Settings → Community Plugins
- All v6 features still work (ribbon, commands, YAML detection)

## What doesn't
- Settings tab is empty (just a heading, no config options)
- Template rendering still experimental
