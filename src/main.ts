import { MarkdownView, Plugin } from 'obsidian';

export default class MyCustomPlugin extends Plugin {
    private customElement: HTMLDivElement | null = null;

    async onload() {
        console.log('[Mirror Notes] v3 loaded — YAML type check');
        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (file && file.extension === 'md') {
                    const yaml = this.app.metadataCache.getFileCache(file)?.frontmatter;
                    if (yaml && yaml.type === 'projects') {
                        this.renderCustomElement();
                    } else {
                        this.cleanupCustomElement();
                    }
                }
            })
        );
    }

    private renderCustomElement() {
        if (this.customElement) return;

        this.customElement = document.createElement('div');
        this.customElement.classList.add('cMenuModalBar');
        this.customElement.style.width = '100%';
        this.customElement.style.backgroundColor = 'yellow';
        
        const button = document.createElement('button');
        button.classList.add('cMenuModalBar');
        button.setAttribute('title', 'Open Note Toolbar');
        button.setAttribute('aria-label', 'Open Note Toolbar');
        // Adicione aqui o ícone do seu botão, se necessário
        // setIcon(button, this.settings.icon);

        this.customElement.appendChild(button);

        // Adicione o elemento personalizado à visualização de Markdown
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            const containerEl = view.containerEl;
            containerEl.appendChild(this.customElement);
        }
    }

    private cleanupCustomElement() {
        if (this.customElement && this.customElement.parentNode) {
            this.customElement.parentNode.removeChild(this.customElement);
            this.customElement = null;
            console.log("heeh")
        }
    }
}
