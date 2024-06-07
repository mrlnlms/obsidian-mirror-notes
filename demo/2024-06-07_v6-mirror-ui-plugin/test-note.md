---
type: project
---

# V6 — MirrorUIPlugin Class Born

Major milestone. The definitive class `MirrorUIPlugin` appears. Plugin now has:
- Settings system (load/save from data.json)
- Custom sidebar view (`MirrorUIView`)
- Ribbon icons (eye + file)
- Commands (Decorate Titles, Peek into the dark)
- Template file reading attempt via `vault.adapter.read()`

## What's new
- Class: `MirrorUIPlugin` (definitive name)
- `settings.ts` — `mirrorSeetingsTab` class (basic settings tab)
- `view.ts` — `MirrorUIView` (custom sidebar view)
- Settings interface with `myPluginName`
- Two ribbon icons: eye (Notice) + file (opens sidebar view)
- Two commands: Decorate Titles (adds emoji to headings), Peek (after 23h only)
- Tries to read template file content and render via TFile API
- Targets `.metadata-container` for toolbar placement

## What works
- Plugin loads with Notice showing plugin name from settings
- Ribbon icons appear and respond to clicks
- Commands registered and functional
- Settings load/save infrastructure

## What doesn't
- Settings tab commented out (`//this.addSettingTab`)
- Template rendering is experimental — lots of commented code
- Toolbar still shows "MARLON" h1, not template content
- View is basic stub
