import { TAbstractFile, TFile, TFolder } from "obsidian";

import { TextInputSuggest } from "./suggest";

export class FileSuggest extends TextInputSuggest<TFile> {
  getSuggestions(inputStr: string): TFile[] {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    const files: TFile[] = [];
    const lowerCaseInputStr = inputStr.toLowerCase();

    abstractFiles.forEach((file: TAbstractFile) => {
      if (
        file instanceof TFile &&
        file.extension === "md" &&
        file.path.toLowerCase().contains(lowerCaseInputStr)
      ) {
        files.push(file);
      }
    });

    return files;
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TFile): void {
    this.inputEl.value = file.path;
    this.inputEl.trigger("input");
    this.close();
  }
}

export class FolderSuggest extends TextInputSuggest<TFolder> {
  getSuggestions(inputStr: string): TFolder[] {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    const folders: TFolder[] = [];
    const lowerCaseInputStr = inputStr.toLowerCase();

    abstractFiles.forEach((folder: TAbstractFile) => {
      if (
        folder instanceof TFolder &&
        folder.path.toLowerCase().contains(lowerCaseInputStr)
      ) {
        folders.push(folder);
      }
    });

    return folders;
  }

  renderSuggestion(file: TFolder, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TFolder): void {
    this.inputEl.value = file.path;
    this.inputEl.trigger("input");
    this.close();
  }
}

export class YamlPropertySuggest extends TextInputSuggest<string> {
  getSuggestions(inputStr: string): string[] {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    const properties: Set<string> = new Set();
    const lowerCaseInputStr = inputStr.toLowerCase();

    abstractFiles.forEach((file: TAbstractFile) => {
      if (file instanceof TFile && file.extension === "md") {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache && cache.frontmatter) {
          Object.keys(cache.frontmatter).forEach(key => {
            if (key.toLowerCase().includes(lowerCaseInputStr)) {
              properties.add(key);
            }
          });
        }
      }
    });

    return Array.from(properties);
  }

  renderSuggestion(property: string, el: HTMLElement): void {
    el.setText(property);
  }

  selectSuggestion(property: string): void {
    this.inputEl.value = property;
    this.inputEl.trigger("input");
    this.close();
  }
}