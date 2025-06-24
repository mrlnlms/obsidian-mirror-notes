---
mirror: "[[template-mirror]]"
mirror_pos: top
type: project
---

# Test Note — v21 Settings + v1.1.0

This note tests the v21 release which introduces:

## Changes in v21
- **Settings tab**: Full plugin settings UI via `MirrorUISettingsTab`
- **Version bump to v1.1.0**: manifest.json updated with proper plugin identity
- **manifest.json rebranding**: id changed from `sample-plugin` to `mirror-notes`, name to `Mirror Notes`
- **New settings.ts**: Complete settings infrastructure with `MirrorUIPluginSettings`, `DEFAULT_SETTINGS`, custom mirrors
- **New utils/**: `file-suggest.ts` and `suggest.ts` for autocomplete in settings
- **New YAMLSuggest.ts**: YAML property suggestions
- **New utils.ts**: Utility functions (wrapAround)
- **metadataCache integration**: Conservative sync with debounce (500ms)
- **User interaction tracking**: Prevents updates while user is actively typing
- **forceMirrorUpdateEffect**: New effect for forced mirror state updates
- **Editor setup simplified**: Removed mirrorDecorations (now provided by StateField)
- **Responsiveness**: Delays reduced from 50ms to 25ms
- **Reference files**: Settings_REFERENCIA.ts, styles_REFERENCIA.css, main_REF.js added
- **@popperjs/core**: New dependency for positioning

## Settings Interface
The plugin now has a full settings tab with:
- Global mirror settings (live preview + reading mode)
- Custom mirror configurations per folder/property
- File/folder suggestions with autocomplete
- Hide properties option
- Position control (top/bottom)
