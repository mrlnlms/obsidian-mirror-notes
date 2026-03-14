---
mirror: true
version: v15
date: 2024-07-24
title: SettingModel3 test note
type: project
---

# v15 — SettingModel3

Test note for v15 SettingModel3 port.

SettingModel3 is a snapshot of SettingModel2 with no functional changes — the files differ only by 2 blank lines prepended at the top. This represents an intermediate save point in the evolution of the settings model.

## What this version adds
- `src/settings/SettingModel3.ts` — third settings model snapshot (31KB, parallel/unwired)

## Architecture
- `src/main.ts` — `MirrorUIPlugin` (event stubs)
- `src/settings.ts` — `MirrorUISettingsTab` + `SuggestionModal` (active)
- `src/settings/SettingModel1.ts` — first alternative model (unwired)
- `src/settings/SettingModel2.ts` — second alternative model (unwired)
- `src/settings/SettingModel3.ts` — third alternative model (unwired)
- `src/utils/suggest.ts` — `TextInputSuggest<T>` autocomplete
- `src/utils/file-suggest.ts` — `FileSuggest`, `FolderSuggest`, `YamlPropertySuggest`
- `src/utils/utils.ts` — `wrapAround()` helper
