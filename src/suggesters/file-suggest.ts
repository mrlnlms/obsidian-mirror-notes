import { TFile, TFolder } from 'obsidian';
import { DebouncedInputSuggest } from './debounced-suggest';

export class FileSuggest extends DebouncedInputSuggest<TFile> {
  getFilteredSuggestions(query: string): TFile[] {
    const lower = query.toLowerCase();
    return this.app.vault.getAllLoadedFiles().filter(
      (f): f is TFile => f instanceof TFile && f.extension === 'md' && f.path.toLowerCase().includes(lower)
    );
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TFile): void {
    this.setValueAndNotify(file.path);
    this.close();
  }
}

export class FolderSuggest extends DebouncedInputSuggest<TFolder> {
  getFilteredSuggestions(query: string): TFolder[] {
    const lower = query.toLowerCase();
    return this.app.vault.getAllLoadedFiles().filter(
      (f): f is TFolder => f instanceof TFolder && f.path.toLowerCase().includes(lower)
    );
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder): void {
    this.setValueAndNotify(folder.path);
    this.close();
  }
}

export class YamlPropertySuggest extends DebouncedInputSuggest<string> {
  getFilteredSuggestions(query: string): string[] {
    const lower = query.toLowerCase();
    const properties = new Set<string>();
    for (const file of this.app.vault.getAllLoadedFiles()) {
      if (file instanceof TFile && file.extension === 'md') {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.frontmatter) {
          for (const key of Object.keys(cache.frontmatter)) {
            if (key.toLowerCase().includes(lower)) {
              properties.add(key);
            }
          }
        }
      }
    }
    return Array.from(properties);
  }

  renderSuggestion(property: string, el: HTMLElement): void {
    el.setText(property);
  }

  selectSuggestion(property: string): void {
    this.setValueAndNotify(property);
    this.close();
  }
}
