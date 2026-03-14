
> [!abstract] {{title}}
> **Status:** `INPUT[inlineSelect(option(active), option(paused), option(done)):status]`
> **Priority:** `INPUT[inlineSelect(option(low), option(medium), option(high)):priority]`
>
> {{description}}

```dataview
TABLE WITHOUT ID
  file.name AS "Related",
  status AS "Status"
FROM "{{folder}}"
WHERE type = "{{type}}" AND file.name != this.file.name
LIMIT 5
```
