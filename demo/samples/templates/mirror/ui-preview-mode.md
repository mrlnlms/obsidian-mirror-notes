---
cssclasses: []
mosxbanner: 
title: Titulo
aliases:
  - ssss
---



[[banner-alan-wake.png|banner-icon]]

`$= dv.current().mosxbanner`
*`$= dv.current().file.name`*


# `$= dv.current().aliases[0]`

`$= dv.current().date`

`$=  '![['+dv.current().mosxbanner.path.replace('.png', '.png|'+ dv.current().cssclasses)+']]'`

`$=  '![['+dv.current().mosxbanner.path.replace('.png', '.png|banner-icon]]')`