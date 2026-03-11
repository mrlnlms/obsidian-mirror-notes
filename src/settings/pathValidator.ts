import { App, TFile } from "obsidian";

type ValidationType = 'file' | 'folder' | 'filename';

export function addPathValidation(
    app: App,
    container: HTMLElement,
    value: string,
    type: ValidationType
): void {
    const settingItem = container.querySelector('.setting-item') as HTMLElement;
    const target = settingItem || container;

    const warningEl = target.createEl('div', { cls: 'mirror-path-warning' });
    warningEl.style.display = 'none';

    const checkExists = (val: string): boolean => {
        if (!val) return false;
        if (type === 'file') return !!app.vault.getAbstractFileByPath(val);
        if (type === 'folder') {
            const f = app.vault.getAbstractFileByPath(val);
            return !!f && !(f instanceof TFile);
        }
        return app.vault.getFiles().some(f => f.name === val);
    };

    const showWarning = (val: string) => {
        warningEl.textContent = type === 'filename'
            ? `File "${val}" not found in vault`
            : type === 'folder'
            ? `Folder "${val}" not found in vault`
            : `Template "${val}" not found in vault`;
        warningEl.style.display = '';
    };

    const validate = (val: string) => {
        if (!val) { warningEl.style.display = 'none'; return; }
        if (!checkExists(val)) { showWarning(val); } else { warningEl.style.display = 'none'; }
    };

    validate(value);

    const inputEl = container.querySelector('input') as HTMLInputElement;
    if (inputEl) {
        inputEl.addEventListener('blur', () => validate(inputEl.value));
        inputEl.addEventListener('input', () => {
            if (inputEl.value && checkExists(inputEl.value)) {
                warningEl.style.display = 'none';
            }
        });
    }
}
