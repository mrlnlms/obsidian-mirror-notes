---
tags:
  - template
  - mirror-notes
---
<% tp.frontmatter.title %>
# {{title}}

**Type:** {{type}}

## All Vault Files

```dataview
TABLE file.mtime AS "Modified", file.size AS "Size"
FROM ""
SORT file.mtime DESC
```
