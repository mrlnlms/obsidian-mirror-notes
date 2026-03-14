---
type: project
---

# v8 Mode Detection Test

This note tests the mode detection feature introduced in v8. The plugin now uses `view.getMode()` to detect whether the active view is in "preview" or "source" mode and displays a Notice with the current mode. The event handler has been refactored into a new `eventTests` method that replaces the previous `addToolbar` binding in the workspace event listeners.
