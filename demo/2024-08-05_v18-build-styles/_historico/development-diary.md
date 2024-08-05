---
aliases:
  - Assuntos
  - Mais um
date: 2024-07-09
---
# Assuntos tratados
---
#### O que queremos aprofundar aqui?

- [ ] Compreender a manipulação do editor;
	- Matriz de posições;
	- Interações do mouse e tradução de posições;


- [ ] **Iniciar a exploração do uso dos Settings**

- [ ] Rodar o plugin dentro de condições (pasta, yaml etc)
- [ ] Abrir sidebar;


--- 

# Notas

Quando se aciona um comando com um texto selecionado, o comportamento visual do obsidian desmarcar o texto selecionado. Isso poderia ser melhorado pensando na experiência de uso e facilitar o desenvolvimento de plugins que precisam deste tipo de feedback visual.

Não parece haver um jeito simples e fácil de conseguir contornar o problema da seleção automatica ao clicar em elementos HTML. A ultima tentativa será incluir um evento de clique em cima do span que chame alguma função e tente então mexer nessa maldita seleção.

A possível solução para o problema foi usar o stop.propagation(). Finalmente consegui chegar no resultado esperado!! 


---
Historia do plugin / my development hobby / 

Desde quando comecei a explorar o uso do obsidian, pela facilidade com scripts, comecei a me aprofundar bastante na customização das coisas e entender os limites da ferramenta. Nesta época, comecei manipulando os templates, automatizações e workflows dentro do Obsidian, e muito dessas atividades foram possíveis por meio de plugins, sendo majoritariamente Dataview e Templater, que possibilita codificam em javascript e fazer o programa acessar tais scripts e executá-los no ambiente do obsidian ou em notas. 

Com o tempo, fui sentindo a necessidade de manipular o programa de forma mais profunda e a necessidade de aprender como desenvolver plugins começou a surgir como interesse. Comecei então a voltar a olhar alguns vídeos e entender o ambiente de desenvolvimento e setup básico para conseguir desenvolver um plugin para Obsidian.

Basicamente, precisei entender como instalar o Node.js, como funcionam repositórios e git-hub, revisar e aprender conceitos de javascript e OOP, para poder programar o script em TypeScript. Entender como trabalhar com a API do Obsidian, bem por cima sobre API do CodeMirror (acabei não usando até agora). Por fim, mexer em ferramentas mais utilitarias como o terminal do mac e seus comandos e um editor, que no meu caso o VS Code. [Veja aqui os plugins para VSCode].

Bom, o que você queria manipular no Obsidian para você precisar fazer um plugin?

Inicialmente eu estive trabalhando por um tempo no projeto de organização de dados de forma estruturada usando Notion. Nele eu tenho tabelas composta por muitos registros (cada uma referente a uma coisa especifica (ex. pessoas, projetos etc)), mas não populava suas respectivas páginas (desta forma só usavá mesmo o modo de visualização dos dados ou metadados.). Para ter essa visualização no Obsidian testei alguns plugins como Projects, Loon, ou mesmo o dataview. Porém, para você ter essa mesma visão, você precisa ter um arquivo .md para cada registro desse. E nesse caso, eu não necessariamente queria isso, apesar de útil - no sentido de poder inserir dados no formato .md.e ser open.

Quando abrimos alguma página referente a algum registro, a página exibe as propriedades e a nota em si. Essa interface é muito similar a interface que temos no Obsidian. 

[Imagem com as duas telas]

Como eu tenho uma premissa de tirar esse tipo de informação de produtos ou serviços online, quero transferir para o Obsidian esses registros e principalmente seus metadados e transforma-los no formato YAML.

Porém, essa visualização das informações da nota / arquivo não é muito atrativa, e a edição atual do produto nestes campos não é algo muito interessante. Neste caso se assemelha o Notion, mas sua UX é muito melhor (principalmente por campos de select etc).

Bom, tendo essa ideia em mente, minha primeira ideia de plugin foi transpor as informações do YAML de forma mais visual no corpo da nota. Existem várias soluções para isso, por exemplo criar um template ao criar um arquivo, preenchendo variáveis com base em informações do YAML. 
Apesar dessa abordagem ser muito popular, uma coisa que você pode notar é que o conteúdo do arquivo é duplicado. Um outro ponto de vista aqui seria eliminar o YAML e usar o conteúdo direto no corpo da nota, formatado. Porém, na minha abordagem quero ter uma tipagem e padronização dos dados dos meus registros, sem que se torne uma tarefa chata ou manual demais. 
Para preencher campos que eu chamo aqui de manual demais, no sentido de ter que de fato escrever e não ter um preenchimento mais automatizado, preenche-las no YAML pode ser um pouco frustrante e ruim de visualizar ou editar. Para esse problema temos um plugin chamado MetaBind. Este plugin possibilita você criar campos inline no corpo do .md, que renderiza elementos HTML linkados a alguma YAML key. Ou seja, eu crio um campo de text-area referente a key about, e o texto inserido atualiza o YAML, ao mesmo tempo que exibe tal informação. É como se a página se torna-se um formulário, e este é o único problema. Nesta visualização, você não vê a página limpa com o conteúdo, um modo leitura adequado. 

De toda forma, sua nota YAML ficaria com conteúdos e diversos códigos dependentes de um plugin. Mesmo no caso de usar templates, sua nota poderia então ter os dados no YAML (visualização ruim, melhor padronização), no YAML e no corpo da nota (redundante), só no corpo (falta de padrão para os mesmo tipos de notas). 
No nosso caso a escolha foi por usar o YAML. Ali seria as informações importantes e que devem ser padronizadas entre todas as notas do mesmo tipo. O plugin [Metadata Menu] ajuda muito a padronizar os atributos de cada tipo de nota (podemos transportar do Notion caso exista tabelas lá.)

Voltando, como a escolha foi YAML, não teremos esse mesmo conteúdo escrito na nota, porém eu quero visualizar como se ele estivesse. E aqui que chegamos no Gap. Primeiramente tentei usar `dataview.load.io();` de um arquivo .md que criei como template. Nele, ao carregar o arquivo em load.io, ele lê os atributos do yaml que o chamou, e exibe formatado. Perceba que neste tempate não temos yaml no momento. 

Isso resolve boa parte do problema, mas meu perfeccionismo e um pouco de toc me deixou coçando. Como eu faço para retirar essas 3 linhas de todo arquivo de nota que eu tenho no meu obsidian? Isso não é legal ao meu ver, além da dependencia com o plugin. Meu objetivo foi então descobrir como exibir as informações assim como tenoh como resultado de load.io, mas sem preencher o conteúdo da nota, renderizando o yaml apenas no editor, de forma formatada (via templates). 

Neste sentido, outra feature se mostrou relevante: ter um template para a visualização em live-preview para refletir o YAML via MetaBind. Ou seja, cria uma página editável para o usuário que ao editar, manipula o YAML. E outro template para o preview-mode, que possa mostrar os dados do yaml de forma mais formatada e visual. 

Esse foi o gap: Exibir o conteúdo do yaml por meio de templates que são carregados na página de forma "virtual", tais formatações não estão no arquivo, são apenas dados do yaml. Assim, eu posso tomar notas de forma livre sem padrão após o YAML.


Este plugin permite você ter arquivos .md com informações padronizadas no yaml e ainda ter formas visuais dessas informações e edição em conjunto com outros plugins como metabind. Você escolhe os criterios para o plugin executar (ex. type: projects), seleciona o template para live e preview modes. Desta forma você pode criar diversos pares de templates para cada tipo de arquivo padronizado que você tiver no seu vault. 

Esse foi o meu primeiro desafio e introdução ao ambiente de desenvolvimento do Node.js, typescript etc.

Se você é uma pessoa... esse plugin é pra vc..

---

Passado algum tempo, eu vim pensando na possibilidade de fazer análise de dados qualitativa dentro do obsidian. Eu penso que o ambiente principal do produto é o editor, e pesquisas qualitativas são em grande maioria composta por conteúdo textual. A análise de dados qualitativa pode ser feitas de diversas formas. Uma abordagem tradicional nas ciências sociais são as análises do discurso e de conteúdo. Tais métodos geralmente utilizam de codificação do conteúdo. Ferramentas como NVivo e MaxQDA são populares neste contexto. 

Essas ferramentas possibilitam a criação de códigos. Tais códigos representam uma unidade de significado e você utiliza-os em diversos trechos, por exemplo de transcrições de entrevistas e entre transcrições. Ou seja, diversos participantes podem receber as mesmas codificações em diversas partes do conteúdo. 
Em alguns casos, um trecho pode conter mais de um código. 

Neste softwares, o trecho codificado fica ==highlited==, podendo escolher a cor e editar as tags, ou mesmo remover. Perceba que aqui estamos lidando com um tipo de interação direta com um editor, e por isso penso ser um ambiente interessante para testar a criação de um plugin com este proposito. 

Sei que tem muitas outras coisas que esse software fazem, mas aqui pretendo inicialmente possibilitar a codificação de textos no formato .md.

Meu foco principal inicial foi criar a interface do usuário, que basicamente é um menu que é aberto ao selecionar um trecho de texto. Este menu foi customizado para o trabalho de codificação (apesar de buscar usar os componentes do obsidian ao maximo, por exemplo Menu o comp neste plugin). Primeiro, adicionei um campo de texto onde o usuário pode criar tags de forma rápida e simples e aplicar ao trecho instantaneamente. Este item se torna uma opção com um toggle ligado, abaixo neste mesmo menu, que continua aberto e com o texto selecionado. Se eu clicar nesta nova opção com toggle, ele desliga e a tag é removida da seleção. A cada tag criada no campo de texto, a lista de itens exibe a nova tag por ordem de criação ([futuramente por uso ao abrir em nova seleção]). Limitei a 5 itens de tag neste menu [configurar isso em settings].
Abaixo, temos uma opção add new tag, que abre um popup onde adiciona uma nova tag (mas com mais opções de preenchimentos como descrição, cor), add existing tags (abre um popup para escolher varias) e remove tags, e por fim remove All, que limpa todas as tags do arquivo.
Esses codigos estou usando atributos html span dentro do MD para poder highlight ele. esses itens .

[Vai precisar criar no campo de texto uma busca pra ficar maluco!]

E isso foi o que fiz até o momento. Agora o proximo passo vai ser fazer a gestão e exibição das tags, e a estratégia de exibiçnao dos trechos, links e visualização dos dados. -> ==Ponto Critico!.==

Acabei escrevendo sobre o que estou desenvolvendo mas não sobre a motivação. A motivação é ter uma ferramenta open-source para fazer este trabalho mas com uma UX excelente, pelo menos em termos de codificação de texto. 

