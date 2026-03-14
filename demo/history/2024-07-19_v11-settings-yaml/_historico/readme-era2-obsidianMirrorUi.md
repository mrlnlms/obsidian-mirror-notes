# Mirror UI – Plugin para Obsidian

## Visão Geral

O Mirror UI é um plugin para o Obsidian que permite inserir toolbars dinâmicas em notas, baseando-se em atributos YAML do frontmatter. Ele foi projetado para ser altamente customizável, permitindo que diferentes templates sejam exibidos conforme o tipo de nota ou outros atributos definidos pelo usuário.

Este documento serve tanto como manual de uso quanto como referência técnica detalhada para desenvolvedores e IAs que desejam entender, integrar ou evoluir o plugin.

---

## Funcionalidades

- **Toolbar dinâmica:** Insere uma barra de ferramentas personalizada em notas com atributos YAML específicos.
- **Templates configuráveis:** Permite associar diferentes templates Markdown a diferentes atributos/valores YAML.
- **Sugestão de propriedades YAML:** Ajuda o usuário a selecionar atributos YAML já existentes no vault.
- **Interface de configuração visual:** Adição, remoção e reordenação de templates via painel de configurações.
- **Arquitetura extensível:** Código modular, fácil de integrar com outros plugins ou expandir funcionalidades.

---

## Instalação

1. **Pré-requisitos:**  
   - Obsidian instalado (versão mínima 0.15.0)
   - Node.js v16 ou superior para desenvolvimento

2. **Instalação manual:**  
   - Clone ou copie este repositório para a pasta `.obsidian/plugins/obsidianMirrorUi` do seu vault.
   - Instale as dependências:
     ```bash
     npm install
     ```
   - Compile o plugin em modo desenvolvimento:
     ```bash
     npm run dev
     ```
   - Ative o plugin nas configurações do Obsidian.

3. **Estrutura esperada:**
   ```
   .obsidian/plugins/obsidianMirrorUi/
     main.js
     main.ts
     settings.ts
     styles.css
     manifest.json
     ...
   ```

---

## Exemplo de Uso

1. **Crie um template Markdown** (exemplo: `templates/ui-preview-mode.md`):
   ```markdown
   # Toolbar do Projeto
   - [ ] Tarefa 1
   - [ ] Tarefa 2
   ```

2. **Configure o plugin:**
   - Vá em "Configurações" > "Mirror UI"
   - Clique em "Add New" e preencha:
     - **LivePreview Templates:** `templates/ui-live_preview-mode.md`
     - **Preview Template:** `templates/ui-preview-mode.md`
     - **YAML Property:** `type`
     - **YAML Property Value:** `project`

3. **Adicione o atributo YAML na sua nota:**
   ```markdown
   ---
   type: project
   ---
   Conteúdo da nota...
   ```

4. **Abra a nota:**  
   A toolbar será exibida automaticamente no topo da área de metadados.

---

## Arquitetura e Implementação

### 1. main.ts – Núcleo do Plugin

Responsável por:

- Carregar e salvar configurações
- Registrar eventos do Obsidian (ex: mudança de layout)
- Gerenciar a inserção/remoção da toolbar nas notas

**Fluxo principal:**
- Ao carregar o plugin (`onload`), registra o painel de configurações e o evento de `layout-change`.
- Quando ocorre um `layout-change`, verifica se a nota ativa possui o atributo YAML configurado.
- Se sim, remove toolbars antigas e insere uma nova, renderizando o template Markdown correspondente.

**Trecho relevante:**
```typescript
async eventLayoutChange(file2: TFile) {
    new Notice("Layout Change");
    const activeLeaf = this.app.workspace.getLeaf();
    if (activeLeaf) {
        const view = activeLeaf.view as MarkdownView;
        if (view) {
            const file = view.file;
            if (file) {
                let corpodocs = view.containerEl.querySelector(".metadata-container");
                const existingToolbar = corpodocs?.querySelector(".project-toolbar");
                if (existingToolbar) {
                    await this.updateToolbarInActiveLeaf(file);
                } else {
                    await this.removeToolbarFromActiveLeaf();
                    await this.addToolbarToActiveLeaf(file);
                }
                await this.updateToolbarInActiveLeaf(file);
            }
        }
    }
}
```
- O método `addToolbarToActiveLeaf` lê o frontmatter da nota, verifica o atributo YAML e, se for do tipo correto, lê o template Markdown e o renderiza usando o `MarkdownRenderer` do Obsidian.

---

### 2. settings.ts – Configuração e UI

Responsável por:

- Definir a interface de configuração do plugin
- Permitir ao usuário associar templates a atributos/valores YAML
- Sugerir propriedades YAML existentes ao usuário

**Estrutura dos dados:**
```typescript
export interface FolderTemplateSetting {
    templateName: string;   // Nome do template para live preview
    templatePath: string;   // Caminho do template para preview
    yamlAttribute: string;  // Nome do atributo YAML
    yamlValue: string;      // Valor do atributo YAML
}
```

**Exemplo de UI criada:**
- Campos para nome/caminho do template, atributo e valor YAML
- Botões para mover para cima/baixo e remover
- Sugestão automática de atributos YAML já existentes

**Trecho relevante:**
```typescript
addSettingElement(containerEl: HTMLElement, settingData: FolderTemplateSetting) {
    // ...criação dos campos...
    new Setting(yamlAttributeDiv)
        .addText(text => {
            text.setPlaceholder('Atributo YAML')
                .setValue(settingData.yamlAttribute || '')
                .onChange(value => {
                    settingData.yamlAttribute = value;
                    this.plugin.saveSettings();
                });
            text.inputEl.addEventListener('click', () => {
                const suggestions = this.getYAMLProperties();
                const filteredSuggestions = suggestions.filter(prop => prop.includes(text.getValue()));
                if (filteredSuggestions.length > 0) {
                    new SuggestionModal(this.app, filteredSuggestions, text.inputEl).open();
                }
            });
        });
    // ...
}
```

---

### 3. YAMLSuggest.ts – Sugestão de Propriedades YAML

Componente auxiliar para sugerir atributos YAML ao usuário durante a configuração.

- Monitora o input do usuário e exibe sugestões baseadas nos atributos YAML já presentes nas notas do vault.
- Cria um container de sugestões logo abaixo do campo de input.

**Trecho relevante:**
```typescript
onInput() {
    const suggestions = this.getProperties().filter(prop => prop.includes(this.inputEl.value));
    this.showSuggestions(suggestions);
}
```

---

### 4. view.ts – Exemplo de View Customizada

- Define uma view customizada (`MirrorUIView`) que pode ser usada para criar painéis ou abas extras no Obsidian.
- Não está integrada ao fluxo principal do plugin, mas serve como exemplo de extensão.

---

### 5. styles.css – Estilos

- Define o visual da toolbar e dos elementos da interface de configuração.
- Exemplo de classe para a toolbar:
```css
.project-toolbar {
    width: auto;
    height: auto;
    padding: 3px;
    display: grid;
    user-select: none;
    border-radius: 6px;
    /* ... */
}
```

---

### 6. obsidian-dataview.d.ts – Tipagem Dataview

- Fornece tipagem para integração futura com o plugin Dataview.
- Não há uso direto no código atual, mas pode ser utilizado para consultas dinâmicas em notas.

---

## Pontos de Customização e Extensão

- **Adicionar novos tipos de templates:**  
  Basta criar novos arquivos Markdown e associá-los a diferentes atributos/valores YAML nas configurações.
- **Integrar com outros plugins:**  
  O código é modular, permitindo fácil integração com plugins como Dataview, Templater, etc.
- **Expandir a toolbar:**  
  Modifique os templates Markdown para adicionar botões, checklists, links, etc.
- **Adicionar lógica condicional:**  
  Pode-se modificar o método `addToolbarToActiveLeaf` para suportar múltiplos atributos ou condições mais complexas.

---

## Observações Técnicas

- O plugin não altera o conteúdo das notas, apenas manipula o DOM da interface do Obsidian.
- O uso de eventos como `layout-change` garante que a toolbar seja atualizada sempre que necessário.
- O painel de configurações é totalmente customizado, não usando apenas os componentes padrão do Obsidian.
- O código está preparado para ser expandido, com separação clara entre lógica de UI, configuração e manipulação de notas.

---

## Sugestão para Integração com Outros Plugins

- Para unificar com outros plugins, centralize a lógica de leitura de atributos YAML e renderização de templates.
- Considere criar um serviço único de sugestão de propriedades YAML para todos os plugins.
- Padronize a interface de configuração para facilitar a manutenção e evolução.

---

## Conclusão

Este README serve como documentação completa do plugin Mirror UI, detalhando tanto o uso quanto a implementação. Ele pode ser usado como referência para integração, manutenção ou evolução do plugin, além de facilitar a comparação com outros plugins da mesma série.

