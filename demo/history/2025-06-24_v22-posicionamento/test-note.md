# v22 — Posicionamento

## Changes in this version

- **Relative positioning**: Widget positioning now works relative to editor lines
- **Orphan widget cleanup**: Cleans up orphan widgets on editor setup and unload
- **Improved onunload**: Properly removes all widgets and reconfigures CodeMirror on unload
- **Settings reactivity**: All setting changes now trigger `forceMirrorUpdateEffect` via `updateAllEditors()`
- **Fixed settings path**: Plugin config path now uses `manifest.id` instead of hardcoded `sample-plugin`
- **Forced update handling**: Forced updates now unconditionally recreate widgets with fresh config
- **Position bug fix**: `global_settings_preview_pos` renamed to `global_settings_live_preview_pos` for consistency

## Files changed

- `main.ts` — orphan widget cleanup, improved onunload, fixed config path
- `settings.ts` — `updateAllEditors()` method, `forceMirrorUpdateEffect` on every setting change
- `src/editor/mirrorState.ts` — `cleanOrphanWidgets()`, forced update special handling, widget ID logic
- `README.md` — minor punctuation fix

## Testing

1. Open a note with a mirror configured
2. Change the mirror position in settings (top/bottom/left/right)
3. Verify the widget moves immediately without needing to reopen the note
4. Disable/enable the plugin and verify no orphan widgets remain
5. Check the console for `[MirrorNotes]` log messages during position changes
