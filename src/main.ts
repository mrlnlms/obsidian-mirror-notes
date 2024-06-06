import { Plugin, MarkdownView } from 'obsidian';

export default class MyPlugin extends Plugin {
    private toolbarEl: HTMLDivElement | null = null;

    onload() {
        console.log('[Mirror Notes] v2 loaded — Ribbon button + tooltip');
        this.addToolbar();
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.onActiveLeafChange.bind(this))
        );
    }

    addToolbar() {
        this.toolbarEl = document.querySelector('.workspace-ribbon-left');
        if (!this.toolbarEl) return;

        this.addToolbarIcon();
    }

    addToolbarIcon() {
        if (!this.toolbarEl) return;

        const button = this.addIcon('Custom Tool', 'Click me', 'mdi-information-variant');
        button.addEventListener('click', () => {
            this.insertCustomBlock();
        });
        this.toolbarEl.appendChild(button);
    }

    insertCustomBlock() {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf || !activeLeaf.view) return;
	
		const view = activeLeaf.view;
		if (!(view instanceof MarkdownView)) return;
	
		const markdownView = view as MarkdownView;
		const file = markdownView.file;
		if (!file) return;
	
		const container = markdownView.containerEl.querySelector('.markdown-preview-view') || markdownView.containerEl.querySelector('.markdown-source-view');
	
		if (container && !container.querySelector('.custom-block')) {
			const customBlock = document.createElement('div');
			customBlock.className = 'custom-block';
			customBlock.innerText = 'MARLON BRANDON';
	
			const header = container.querySelector('h1');
			if (header && header.parentElement) {
				header.parentElement.insertBefore(customBlock, header.nextSibling);
			} else {
				container.appendChild(customBlock);
			}
		}
	}
	

    onActiveLeafChange() {
        if (this.toolbarEl) {
            this.toolbarEl.innerHTML = '';
            this.addToolbarIcon();
        }
    }

    addIcon(label: string, tooltip: string, icon: string): HTMLDivElement {
        const button = document.createElement('div');
        button.className = 'toolbar-icon';
        button.innerHTML = `<span class="mdi ${icon}" aria-hidden="true"></span>`;
        button.setAttribute('aria-label', tooltip);
        button.setAttribute('title', tooltip);
        button.setAttribute('role', 'button');
        button.setAttribute('aria-haspopup', 'true');
        button.setAttribute('aria-expanded', 'false');
        button.appendChild(document.createTextNode(label));
        this.addHoverTooltip(button, label);
        return button;
    }

    addHoverTooltip(el: HTMLElement, text: string) {
        const tooltip = this.createTooltip(text);
        el.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });
        el.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }

    createTooltip(text: string): HTMLElement {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.style.display = 'none';
        tooltip.innerText = text;
        document.body.appendChild(tooltip);
        return tooltip;
    }
}
