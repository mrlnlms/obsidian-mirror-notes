---
cssclasses:
  - banner
mosxbanner: "[[image]]"
mosxicon: 
exampleProperty:
---

> [!none] 
> #project
> # 🖥️ `$= dv.current().aliases ? dv.current().aliases[0] : 'Add Aliases'`
> #etnography #field-research  `INPUT[inlineListSuggester(option(apple), option(banana), option(lemon)):tags]`

---

> [!none] <span></span> <span> ![[google_drive_original_button.png|25]] ![[google_drive_original_button.png|25]]</span>

---

```dataviewjs

// Seleciona o elemento específico com base no seletor completo
const calloutElement = document.querySelector('div[data-callout="cite"]');
dv.paragraph(`${calloutElement}`);

if (calloutElement) {
    let totalHeight = 0;
    
    // Itera sobre os elementos predecessores e soma as suas alturas
    let currentElement = calloutElement;
    
    while (currentElement.previousElementSibling) {
    
        const prevElement = currentElement.previousElementSibling;
        console.log(currentElement)
        console.log(prevElement)
        totalHeight += prevElement.offsetHeight || 0; // Garante que `offsetHeight` seja adicionado corretamente
        currentElement = prevElement;
    }
    
    // Aplica o valor de top na div pai do callout
    calloutElement.parentElement.style.position = 'absolute';
    calloutElement.parentElement.style.top = `${totalHeight}px`;
    
    // Exibe o valor total da altura calculada
    dv.paragraph(`Altura total calculada: ${totalHeight}px`);
} else {
    dv.paragraph(`Elemento 'div[data-callout="cite"]' não encontrado!`);
}


```


> [!summary]
> ss
> 


> [!cite] fefefe
> sss
> Que que ta rolando sera?







#### Methodology / Approach

> [!multi-column] multi-column-custom
> 
> >[!none] Methodology
> > Conduzimos uma imersão de seis semanas com a Tribo de Pricing para auxiliar no processo de discovery. Para isso, realizamos uma série de entrevistas com gestores de grandes contas para mapear o processo de construção de propostas comerciais neste segmento, com foco no uso da ferramenta Rentabilidade, consolidadas em um diagrama de **Jornada do Usuário**.
> > 
> > A partir das entrevistas, foi possível mapear as etapas deste processo, assim como as ações necessárias para os gestores executarem tal atividade, além de suas dores e barreiras neste processo. Por fim, uma lista de oportunidades e melhorias na ferramenta Rentabilidade foram propostas, visando direcionar o backlog da squad da ferramenta de Rentabilidade.
> > 
> > *O trabalho foi desenvolvido em parceria entre os times de CX, UX e da squad Rentabilidade da Tribo de Pricing.*
>
> > [!blank] 
> > > [!info]+ Project info
> > > 🗓️ From: May 13, 2024 
> > > 🏁 To: May 13, 2024
> > > ☼ Status: #inProgress
> > > > [!none]- Client[[Estapar]]
> > > > > Department: *Innovation*
> > > > > Sector: *Parking*
> > > 
> > > 
> > > > [!none]- Contract: [[Meiuca]]
> > > > > Contract: [[Senior PD @ Meiuca]]
> > > > > Role: [[UX Researcher]]
> > > > > Allocation: *Senior*
> > > > > Department/Team: [[Studio]]
> > > > [[Meiuca Design]]
> > > > > Sector: [[Design]] [[Consultancy]]
> > >
> > 
> > > [!warning] Warning
> > > > Methods:
> > > > Costumer Interviews
> > > > Design Thinking
> > > > Sector:
> > > > > Mobility














> 🗓️ From: May 13, 2024 
> 🏁 To: May 13, 2024
> ☼ Status: #inProgress
> → 
> 
> ---
> 
> Client: [[Estapar]]
> >Department: *Innovation*
> >Sector: *Parking*
> 
> Contract: [[Senior PD @ Meiuca]]
> > Role: [[UX Researcher]]
> > Allocation: *Senior*
> > Department/Team: [[Studio]]
 > >[[Meiuca Design]]
 > > > Sector: [[Design]] [[Consultancy]]
 > > > 

![[google_drive_original_button.png|18]] **People**:
- [[Adri]]
- [[Diana]]

### People:
- [[Adri]]
- [[Diana]]

---

#### Methodology / Approach

> [!multi-column]
> 
> >[!none] Methodology
> > Conduzimos uma imersão de seis semanas com a Tribo de Pricing para auxiliar no processo de discovery. Para isso, realizamos uma série de entrevistas com gestores de grandes contas para mapear o processo de construção de propostas comerciais neste segmento, com foco no uso da ferramenta Rentabilidade, consolidadas em um diagrama de **Jornada do Usuário**.
> > 
> > A partir das entrevistas, foi possível mapear as etapas deste processo, assim como as ações necessárias para os gestores executarem tal atividade, além de suas dores e barreiras neste processo. Por fim, uma lista de oportunidades e melhorias na ferramenta Rentabilidade foram propostas, visando direcionar o backlog da squad da ferramenta de Rentabilidade.
> > 
> > *O trabalho foi desenvolvido em parceria entre os times de CX, UX e da squad Rentabilidade da Tribo de Pricing.*
>
> > [!info]+ Project info
> > 🗓️ From: May 13, 2024 
> > 🏁 To: May 13, 2024
> > ☼ Status: #inProgress
> > > [!none]- Client[[Estapar]]
> >Department: *Innovation*
> >Sector: *Parking*
> > > balabl
> >
> >
> > > [!none]- Contract: [[Meiuca]]
> > > > Contract: [[Senior PD @ Meiuca]]
> > Role: [[UX Researcher]]
> > Allocation: *Senior*
> > Department/Team: [[Studio]]
 > >[[Meiuca Design]]
 > > > Sector: [[Design]] [[Consultancy]]
 > > > 
> >
>




> 
> 


---

`$= dv.current().mosxbanner ? '![[' + dv.current().mosxbanner.path.replace('.png', '.png|banner') + ']]'  : 'Add Banner';`
🛢️🛢️📶𖠶𖠶☼
`$= dv.current().mosxicon ? '![[' + dv.current().mosxicon.path.replace('.png', '.png|banner') + '-icon]]'  : 'Add Icon';`

> [!multi-column|widee]
>
> > [!info|wide-2]
> > - **Role**: 
> >   - [[UX Researcher]]
> > - **Company**: 
> >   - [[Databases/company/inDrive|inDrive]]
> > - **Alocation**:
> >   - Freelancer
> >   - Pleno
> > - **Tools**:
> >   - Google Sheets
> >   - Davinci Resolve
>
> > [!warning|wide-2]
> > - **Methods**:
> >   - Costumer Interviews
> >   - Design Thinking
> > - **Sector**: 
> >   - Mobility


---



```meta-bind-button
label: Add New Banner
icon: image
hidden: true
class: banner-icon
tooltip: add a new banner
id: new-banner
style: plain
actions:
  - type: updateMetadata
    bindTarget: mosxbanner
    evaluate: false
    value: "[[image]]"

```

`BUTTON[new-banner]`


```meta-bind
INPUT[list:aliases]
```



```meta-bind
INPUT[imageSuggester(optionQuery("")):mosxbanner]
```



```meta-bind {.sobe}
INPUT[imageListSuggester(optionQuery("")):exampleProperty]
```
s


`INPUT[inlineSelect(option(apple), option(banana), option(lemon)):exampleProperty]`

`INPUT[inlineListSuggester(option(apple), option(banana), option(lemon)):exampleProperty]`


```dataview
LIST
FROM ""
WHERE date({{date:YYYY-MM-DD}}T23:59) - file.mtime <= dur(24 hours) and date({{date:YYYY-MM-DD}}T23:59) - file.mtime > dur(0 hours)
SORT file.mtime asc
```



> [!none]
> s
> 



```mermeid
graph TB
    A[Template com Componentes Dinâmicos] --> B[Mirror Notes Plugin]
    B --> C[Nota do Projeto 1]
    B --> D[Nota do Projeto 2]
    B --> E[Nota do Projeto N]
    C --> F[Propriedades YAML Específicas]
    D --> G[Propriedades YAML Específicas]
    E --> H[Propriedades YAML Específicas]
    F --> I[Componentes Interativos/Visualizações]
    G --> I
    H --> I
```





> [!note|widee]
> Este callout específico será wide, independentemente das configurações YAML da nota.
> 
> 

> 

> [!note]
> Este callout manterá a largura normal.

> 

> [!warning|widee]
> Este alerta também será wide.



# Introduction & Metadata

> [!multi-column|widee]
> 
> >[!none|fw6] Methodology
> > Conduzimos uma imersão de seis semanas com a Tribo de Pricing para auxiliar no processo de discovery. Para isso, realizamos uma série de entrevistas com gestores de grandes contas para mapear o processo de construção de propostas comerciais neste segmento, com foco no uso da ferramenta Rentabilidade, consolidadas em um diagrama de **Jornada do Usuário**.
> > 
> > A partir das entrevistas, foi possível mapear as etapas deste processo, assim como as ações necessárias para os gestores executarem tal atividade, além de suas dores e barreiras neste processo. Por fim, uma lista de oportunidades e melhorias na ferramenta Rentabilidade foram propostas, visando direcionar o backlog da squad da ferramenta de Rentabilidade.
> > 
> > *O trabalho foi desenvolvido em parceria entre os times de CX, UX e da squad Rentabilidade da Tribo de Pricing.*
>
> >[!blank|fw4]
> > > [!info]+ Project info
> > > 🗓️ From: May 13, 2024 
> > > 🏁 To: May 13, 2024
> > > ☼ Status: #inProgress
> > > > [!none]- Client[[Estapar]]
> > > > > Department: *Innovation*
> > > > > Sector: *Parking*
> > > 
> > > 
> > > > [!none]- Contract: [[Meiuca]]
> > > > > Contract: [[Senior PD @ Meiuca]]
> > > > > Role: [[UX Researcher]]
> > > > > Allocation: *Senior*
> > > > > Department/Team: [[Studio]]
> > > > [[Meiuca Design]]
> > > > > Sector: [[Design]] [[Consultancy]]
> > >
> > 
> > > [!warning] Warning
> > > > Methods:
> > > > Costumer Interviews
> > > > Design Thinking
> > > > Sector:
> > > > > Mobility

