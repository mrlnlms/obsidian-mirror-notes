import { App, PluginSettingTab, Setting, TFile, TFolder, Modal } from 'obsidian';
import MirrorUIPlugin from './main';
import { YAMLSuggester } from 'YAMLSuggest';

export interface FolderTemplateSetting {
    templateName: string;
    templatePath: string;
    yamlAttribute: string;
    yamlValue: string;
}

export interface MirrorUIPluginSettings {
    folderTemplates: FolderTemplateSetting[];
}

export const DEFAULT_SETTINGS: MirrorUIPluginSettings = {
    folderTemplates: [],
};

export class MirrorUISettingsTab extends PluginSettingTab {
    plugin: MirrorUIPlugin;

    constructor(app: App, plugin: MirrorUIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getFolders(): TFolder[] {
        return this.app.vault.getAllLoadedFiles().filter(file => file instanceof TFolder) as TFolder[];
    }

    getFiles(): TFile[] {
        return this.app.vault.getAllLoadedFiles().filter(file => file instanceof TFile) as TFile[];
    }

    getYAMLProperties(): string[] {
        const files = this.app.vault.getAllLoadedFiles().filter(file => file instanceof TFile) as TFile[];
        const properties = new Set<string>();

        files.forEach(file => {
            const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
            if (frontmatter) {
                Object.keys(frontmatter).forEach(key => properties.add(key));
            }
        });

        return Array.from(properties);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Insira o template que deseja sincronizar' });
        containerEl.createEl('h3', { text: 'Descreva o atributo YAML e seu valor para relacionar com este template.' });

        const addNewSetting = () => {
            const settingData: FolderTemplateSetting = { templateName: '', templatePath: '', yamlAttribute: '', yamlValue: '' };
            this.plugin.settings.folderTemplates.push(settingData);
            this.plugin.saveSettings();
            this.addSettingElement(containerEl, settingData);
        };

        if (!this.plugin.settings.folderTemplates) {
            console.error('folderTemplates is null or undefined');
            this.plugin.settings.folderTemplates = [];
        }

        this.plugin.settings.folderTemplates.forEach(settingData => {
            if (settingData) {
                this.addSettingElement(containerEl, settingData);
            } else {
                console.error('Encountered null or undefined settingData');
            }
        });

        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('Add New')
                .setCta()
                .onClick(addNewSetting));
    }

    addSettingElement(containerEl: HTMLElement, settingData: FolderTemplateSetting) {
        if (!settingData) {
            console.error('settingData is null or undefined');
            return;
        }

        const settingDiv = containerEl.createDiv({ cls: 'elemento-geral' });
        const formContent = settingDiv.createDiv({ cls: 'form-content' });
        const templateGroup = formContent.createDiv({ cls: 'templates' });

        // Nome do template
        const templateNameDiv = templateGroup.createDiv({ cls: 'campo' });
        templateNameDiv.createEl('label', { text: 'LivePreview Templates', attr: { for: 'templateName' } });
        new Setting(templateNameDiv)
            .addText(text => text
                .setPlaceholder('./templates/template.md')
                .setValue(settingData.templateName || '')
                .onChange(value => {
                    settingData.templateName = value;
                    this.plugin.saveSettings();
                }));

        // Seleciona arquivos template
        const templatePathDiv = templateGroup.createDiv({ cls: 'campo' });
        templatePathDiv.createEl('label', { text: 'Preview Template', attr: { for: 'templatePath' } });
        new Setting(templatePathDiv)
            .addText(text => text
                .setPlaceholder('./templates/template.md')
                .setValue(settingData.templatePath || '')
                .onChange(value => {
                    settingData.templatePath = value;
                    this.plugin.saveSettings();
                }));

        const yamlGroup = formContent.createDiv({ cls: 'yaml' });

        // Atributo YAML
        const yamlAttributeDiv = yamlGroup.createDiv({ cls: 'campo' });
        yamlAttributeDiv.createEl('label', { text: 'YAML Property', attr: { for: 'yamlAttribute' } });
        new Setting(yamlAttributeDiv)
            .addText(text => {
                text
                    .setPlaceholder('Atributo YAML')
                    .setValue(settingData.yamlAttribute || '')
                    .onChange(value => {
                        settingData.yamlAttribute = value;
                        this.plugin.saveSettings();
                    });

                // Adiciona um evento de clique para mostrar o suggester
                text.inputEl.addEventListener('click', () => {
                    const suggestions = this.getYAMLProperties(); // Função para obter as propriedades YAML
                    const filteredSuggestions = suggestions.filter(prop => prop.includes(text.getValue()));

                    if (filteredSuggestions.length > 0) {
                        new SuggestionModal(this.app, filteredSuggestions, text.inputEl).open();
                    }
                });
            });

        // Valor
        const yamlValueDiv = yamlGroup.createDiv({ cls: 'campo' });
        yamlValueDiv.createEl('label', { text: 'YAML Property Value', attr: { for: 'yamlValue' } });
        new Setting(yamlValueDiv)
            .addText(text => text
                .setPlaceholder('Valor')
                .setValue(settingData.yamlValue || '')
                .onChange(value => {
                    settingData.yamlValue = value;
                    this.plugin.saveSettings();
                }));

        // Botões de manipulação
        const buttonsDiv = settingDiv.createDiv({ cls: 'botoes' });
        new Setting(buttonsDiv)
            .addExtraButton(button => button
                .setIcon('up-chevron-glyph')
                .onClick(() => this.moveSetting(settingDiv, -1)))
            .addExtraButton(button => button
                .setIcon('down-chevron-glyph')
                .onClick(() => this.moveSetting(settingDiv, 1)))
            .addExtraButton(button => button
                .setIcon('cross')
                .onClick(() => {
                    settingDiv.remove();
                    const index = this.plugin.settings.folderTemplates.indexOf(settingData);
                    if (index > -1) {
                        this.plugin.settings.folderTemplates.splice(index, 1);
                        this.plugin.saveSettings();
                    }
                }));
    }

    moveSetting(settingDiv: HTMLElement, direction: number) {
        const containerEl = settingDiv.parentElement;
        //@ts-ignore
        const settingIndex = Array.from(containerEl.children).indexOf(settingDiv);
        const newIndex = settingIndex + direction;

        //@ts-ignore
        if (newIndex < 0 || newIndex >= containerEl.children.length) return;

        const parent = settingDiv.parentElement;
        if (parent) {
            parent.removeChild(settingDiv);
            parent.insertBefore(settingDiv, parent.children[newIndex]);

            const [settingData] = this.plugin.settings.folderTemplates.splice(settingIndex, 1);
            this.plugin.settings.folderTemplates.splice(newIndex, 0, settingData);
            this.plugin.saveSettings();
        }
    }
}

class SuggestionModal extends Modal {
    private suggestions: string[];
    private inputElement: HTMLInputElement;

    constructor(app: App, suggestions: string[], inputElement: HTMLInputElement) {
        super(app);
        this.suggestions = suggestions;
        this.inputElement = inputElement;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.suggestions.forEach(suggestion => {
            const item = contentEl.createDiv({ text: suggestion, cls: 'suggestion-item' });
            item.addEventListener('click', () => {
                this.inputElement.value = suggestion;
                this.close();
            });
        });

        // Estilizando o modal
        this.setStyle();
    }

    setStyle() {
        const { contentEl } = this;
        contentEl.addClass('custom-suggester');

        // Adicione estilos CSS conforme necessário
        const style = document.createElement('style');
        style.textContent = `
            .custom-suggester {
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                max-height: 200px;
                overflow-y: auto;
            }
            .suggestion-item {
                padding: 8px;
                cursor: pointer;
            }
            .suggestion-item:hover {
                background-color: #f0f0f0;
            }
        `;
        document.head.appendChild(style);
    }
}
