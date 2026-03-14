
## {{title}}

`= this.title`

```dataviewjs
dv.paragraph(dv.current().title)
```


**Status:** `INPUT[inlineSelect(option(backlog), option(in progress), option(done), option(cancelled)):status]`

**Priority:** `INPUT[slider(addLabels, minValue(1), maxValue(5)):priority]`

**Due:** `INPUT[datePicker:due]`

**Tags:**
```meta-bind
INPUT[multiSelect(option(work), option(personal), option(important), option(urgent)):tags]
```

**Progress:**
```meta-bind
INPUT[progressBar(minValue(0), maxValue(100)):progress]
```

**Notes:**
```meta-bind
INPUT[textArea(class(meta-bind-full-width)):notes]
```
