---
mirror-type: test
version: v12
date: 2024-07-20
---

# v12 — utils/ autocomplete

## What changed
- Added `src/utils/` folder with extracted autocomplete utilities
- `suggest.ts` — `TextInputSuggest<T>` abstract class with Popper.js-based dropdown
- `file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest` concrete implementations
- `utils.ts` — `wrapAround()` helper for cycling through suggestion items
- Added `@popperjs/core` as a dependency

## Architecture
The autocomplete system is now modular:
- `Suggest<T>` (internal) handles keyboard navigation and selection
- `TextInputSuggest<T>` provides the input binding + Popper.js positioning
- Concrete classes (`FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`) implement `getSuggestions()`, `renderSuggestion()`, `selectSuggestion()`

## _historico
- `css-snippets-reference.md` — CSS reference document from original CSS.md

## Test
1. Open Obsidian with this vault
2. Check console for `[Mirror Notes] v12 loaded — utils/ autocomplete`
3. The utils/ autocomplete classes are available but not yet wired into settings UI
