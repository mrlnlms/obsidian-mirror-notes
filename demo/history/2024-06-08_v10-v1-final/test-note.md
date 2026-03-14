---
type: project
---

# v10 — v1 Final Clean

The final version of Era 1. This version cleans up the toolbar injection flow by scoping DOM queries to `view.containerEl` instead of using global `document.querySelector`. The `removeToolbar` method now accepts a `leaf` parameter, and a new `handleLeafChange` method validates that the leaf contains a `MarkdownView` before calling `addToolbar`. Debug notices are removed in favor of `console.log` statements. A new `onActiveFileLeafChange` handler is added for file-level change detection. Dead code from v9 (`teste()` method) is removed.

This is the first version to include `_historico` files documenting the development milestones of Era 1.
