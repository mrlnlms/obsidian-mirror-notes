import { TextComponent, App } from 'obsidian';

export class YAMLSuggester {
    constructor(public inputEl: HTMLInputElement, private app: App, private getProperties: () => string[]) {
        this.inputEl.addEventListener('input', this.onInput.bind(this));
        this.inputEl.addEventListener('blur', this.onBlur.bind(this));
    }

    onInput() {
        const suggestions = this.getProperties().filter(prop => prop.includes(this.inputEl.value));
        this.showSuggestions(suggestions);
    }

    showSuggestions(suggestions: string[]) {
        let suggestionContainer = this.inputEl.nextElementSibling as HTMLElement;
        if (!suggestionContainer || !suggestionContainer.classList.contains('suggestion-container')) {
            suggestionContainer = document.createElement('div');
            suggestionContainer.classList.add('suggestion-container');
            suggestionContainer.style.position = 'absolute';
            suggestionContainer.style.background = 'white';
            suggestionContainer.style.border = '1px solid #ccc';
            suggestionContainer.style.zIndex = '1000';
            suggestionContainer.style.maxHeight = '200px';
            suggestionContainer.style.overflowY = 'auto';
            suggestionContainer.style.width = this.inputEl.offsetWidth + 'px';
            this.inputEl.parentNode?.insertBefore(suggestionContainer, this.inputEl.nextSibling);
        }

        suggestionContainer.innerHTML = '';

        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.textContent = suggestion;
            suggestionItem.style.padding = '8px';
            suggestionItem.style.cursor = 'pointer';
            suggestionItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.inputEl.value = suggestion;
                suggestionContainer.innerHTML = '';
            });
            suggestionContainer.appendChild(suggestionItem);
        });
    }

    onBlur() {
        setTimeout(() => {
            const suggestionContainer = this.inputEl.nextElementSibling as HTMLElement;
            if (suggestionContainer && suggestionContainer.classList.contains('suggestion-container')) {
                suggestionContainer.innerHTML = '';
            }
        }, 200);
    }
}
