# v25 — Fix hideProps (FINAL VERSION)

**Date:** 2025-06-24
**SHA:** e7c9405
**Previous:** v24 (c980923) — Fix YAML
**Status:** This is the FINAL version of the Mirror Notes plugin (v25 of 25).

## Changes

### CSS-based hideProps approach (`main.ts`)
- Removed the `Decoration.replace` approach for hiding frontmatter (was causing conflicts with widgets)
- New `updateHidePropsForView()` method adds/removes `mirror-hide-properties` CSS class on `.view-content`
- hideProps is now toggled via CSS (`display: none` on `.metadata-container`) instead of CodeMirror decorations
- Called on metadata change, layout change, editor setup (with 100ms delay), and settings change
- On plugin unload, all `mirror-hide-properties` classes are cleaned up

### Simplified decoration logic (`src/editor/mirrorDecorations.ts`)
- Removed `HideFrontmatterWidget` class entirely (was 33 lines)
- Removed dual code paths for hideProps active/inactive
- Widget is now always added the same way regardless of hideProps state
- Simplified from ~120 lines of branching logic to ~35 lines of clean code

### Settings integration (`settings.ts`)
- Removed duplicate log line
- Added `this.plugin.updateHidePropsForView(leaf.view)` call after dispatching force update
- Ensures hideProps CSS class updates immediately when toggling the setting

### New CSS rules (`styles.css`)
- Added `.mirror-hide-properties .metadata-container { display: none !important }` for the new approach
- Added `.mirror-frontmatter-hider` rules (CSS `:has()` selectors for line hiding)
- Added `.cm-widget.cm-replace` force-hide rules
- Added fallback `.mirror-hidden-frontmatter-line` class for browsers without `:has()` support
- Ensured `.mirror-ui-widget` remains visible when properties are hidden

### data.json defaults
- `global_settings_hide_props` changed to `true` (was `false`)
- Custom mirror position defaults changed to `top` (was `bottom`)
- Custom mirror `custom_settings_hide_props` changed to `true`

## Test Plan

- [ ] Open a note with frontmatter and a mirror configured
- [ ] Enable "Hide properties" — verify frontmatter metadata disappears
- [ ] Verify the mirror widget REMAINS visible when properties are hidden
- [ ] Disable "Hide properties" — verify frontmatter reappears
- [ ] Toggle setting multiple times rapidly — verify no visual glitches
- [ ] Check that bottom-positioned widgets still work with hideProps active
- [ ] Test with both global and custom mirrors
- [ ] Unload/reload plugin — verify `mirror-hide-properties` classes are properly cleaned up
- [ ] Version log: `[Mirror Notes] v25 loaded — Fix hideProps`
