---
cssClass: banner
---

# `$= dv.current().title`
> [!multi-column|no-wrap]

> [!blank|float-left]
> ![](https://m.media-amazon.com/images/M/MV5BZjE0MjBkNWMtOGUzZS00MzMyLTgwYjgtNTBkZWQ5YWRlMmM1XkEyXkFqcGc@._V1_SX300.jpg)
> > [!blank] Stats
> > ⭐ **Rating**: `$= dv.current().onlineRating`/10  
> > ⏱️ **Duration**: `$= dv.current().duration`  
> > 📅 **Years**: `$= dv.current().year`

> [!blank|dw8]
> > [!info] Main Info
> > ### `$= dv.current().type` | `$= dv.current().airing ? "🟢 Airing" : "🔴 Finished"`
> > 
> > `$= dv.current().plot`
> >
> > ### Cast
> > `$= dv.current().actors.join(" • ")`
> >
> > ### Genres
> > `$= dv.current().genres.join(" • ")`
> >
> > ### Writers
> > `$= dv.current().writer.join(" • ")`
> 
> > [!info]- Additional Info
> > - **Started**: `$= dv.current().airedFrom`
> > - **Ended**: `$= dv.current().airedTo`
> > - **Episodes**: `$= dv.current().episodes`
> > - **Source**: `$= dv.current().dataSource`
> > - **IMDB**: `$= dv.current().url`

---