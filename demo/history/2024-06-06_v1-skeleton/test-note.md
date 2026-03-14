---
type: project
---

# V1 — Skeleton

First version of the Mirror Notes plugin. On load, displays a Notice: "Opening Mirror Preview Plugin!".

## What works
- Plugin loads and shows a Notice
- Has stub methods: `onFileOpen`, `insertCustomBlock` (not wired yet)
- `onunload` shows closing Notice

## What doesn't
- No visual UI — just the Notice on load
- File open events are commented out
- `insertCustomBlock` has hardcoded string, not reading templates yet

## How to test
- Open console (Cmd+Option+I): look for `[Mirror Notes] v1 loaded`
- You should see a Notice popup: "Opening Mirror Preview Plugin!"
