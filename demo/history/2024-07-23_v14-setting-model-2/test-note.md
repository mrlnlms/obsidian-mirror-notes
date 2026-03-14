---
mirror: true
template: header-nav
version: v14
---

# v14 Test Note — SettingModel2

This note tests v14 of Mirror Notes — the massive SettingModel2 (31KB).

## What SettingModel2 adds over SettingModel1
- Getting Started banner with dismiss functionality
- Global Mirror Settings section with toggle header
- Custom Mirror Settings with card-based UI
- Filter by Filename, Filter by Folder path, Filter by Properties
- Custom mirror cards with move up/down, collapse, edit, reset, delete buttons
- Live Preview Mode + Preview Mode template selection per mirror
- Replace Mirror toggle (global vs custom override logic)
- `custom_items` array in settings for dynamic card management
- Stats description sections with "Add New Mirror" button
- Property value pairing for YAML filter (key + value fields)

## Settings fields added
- `enable_getting_started` (boolean)
- `enable_global_settings` (boolean)
- `enable_global_live_preview_mode` (boolean)
- `enable_global_preview_mode` (boolean)
- `enable_custom_settings` (boolean)
- `filter_files` (FolderTemplate[])
- `filter_folders` (FolderTemplate[])
- `filter_props` (FolderTemplate[])
- `filter_props_values` (FolderTemplate[])
- `custom_items` (CustomItem[])
