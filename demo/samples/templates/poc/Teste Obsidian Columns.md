---
title: InDrive Problem Discovery
type: project
status: active
sector: mobility
method: ethnography
priority: 3
due: 2026-04-15
progress: 65
budget: 35000
team_size: 3
role: UX Researcher
company: inDrive
tags:
  - etnography
  - field-research
  - mobility
tools:
  - Google Sheets
  - Davinci Resolve
methods:
  - Customer Interviews
  - Design Thinking
description: Interface com equipe Try e com o cliente. Elaboracao e aprovacao de roteiro, moderacao de entrevistas, tabulacao e analise.
drive_link: https://drive.google.com/example
gmail_link: https://mail.google.com/example
---

# `VIEW[{title}][text]`

**Status:** `INPUT[inlineSelect(option(active), option(paused), option(done), option(cancelled)):status]` | **Tags:** `VIEW[{tags}][text]`

---

> [!col]
>> [!col-md|1]
>> ### Identity
>> | Campo | Valor |
>> |-------|-------|
>> | Role | `VIEW[{role}][text]` |
>> | Company | `VIEW[{company}][text]` |
>> | Sector | `INPUT[inlineSelect(option(mobility), option(health), option(finance), option(technology)):sector]` |
>> | Method | `INPUT[inlineSelect(option(ethnography), option(agile), option(design-thinking)):method]` |
>
>> [!col-md|1]
>> ### Metrics
>> | Campo | Valor |
>> |-------|-------|
>> | Priority | `INPUT[slider(addLabels, minValue(1), maxValue(5)):priority]` |
>> | Progress | `INPUT[progressBar(minValue(0), maxValue(100)):progress]` |
>> | Budget | `INPUT[number:budget]` |
>> | Team Size | `INPUT[number:team_size]` |
>> | Due | `INPUT[datePicker:due]` |
>
>> [!col-md|1]
>> ### Computed
>> | Campo | Valor |
>> |-------|-------|
>> | Cost/person | `VIEW[{budget} / {team_size}][math]` |
>> | Summary | `VIEW[{status} — P{priority}/5][text]` |
>> | Progress | `VIEW[{progress}%][text]` |

> [!col]
>> [!col-md|1]
>> ### Tools & Methods
>> **Tools:** `INPUT[inlineList:tools]`
>>
>> **Methods:** `INPUT[inlineList:methods]`
>
>> [!col-md|1]
>> ### Links & Tags
>> - Drive: `VIEW[{drive_link}][text]`
>> - Gmail: `VIEW[{gmail_link}][text]`
>> - Tags: `VIEW[{tags}][text]`

---

### Descricao

```meta-bind
INPUT[textArea(class(meta-bind-full-width)):description]
```

### Mirror inside template

```mirror
template: templates/poc/mini-summary.md
```

> **Summary:** `VIEW[{title} — {status} — Priority {priority}/5 — {progress}%][text]`


> [!multi-column|bordered]
>
>> [!col|20]
>>aqio
>
>
>> [!col|30]
>>aqui
>
>> [!col|50]
>>hjhjhkjhkhkh

