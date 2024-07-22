---
mirror: true
version: v13
date: 2024-07-22
---

# v13 - SettingModel1 Test

## What changed
- Added `src/settings/SettingModel1.ts` — first alternative settings model
- Uses Templater-style folder/template pairs with FolderSuggest and YamlPropertySuggest
- Introduces `MyPluginSettings` interface with `folder_templates`, `enable_folder_templates`, `templates_folder`
- `SampleSettingTab` class with header settings and folder template management UI
- Add/remove/reorder folder template entries with autocomplete suggesters

## Test checklist
- [x] Plugin loads without errors (check console for `[Mirror Notes] v13 loaded`)
- [x] Existing settings tab still works (main settings.ts unchanged)
- [x] SettingModel1.ts compiles without errors
- [ ] FolderSuggest and YamlPropertySuggest imports resolve correctly
