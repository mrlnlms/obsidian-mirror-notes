import { AbstractInputSuggest, App, debounce } from 'obsidian';

const DEBOUNCE_MS = 150;

export abstract class DebouncedInputSuggest<T> extends AbstractInputSuggest<T> {
  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.limit = 100;
  }

  getSuggestions(query: string): Promise<T[]> {
    return new Promise((resolve) => {
      this.debouncedGetSuggestions(query, resolve);
    });
  }

  private debouncedGetSuggestions = debounce(
    (query: string, resolve: (results: T[]) => void) => {
      resolve(this.getFilteredSuggestions(query));
    },
    DEBOUNCE_MS,
    true
  );

  abstract getFilteredSuggestions(query: string): T[];
  abstract renderSuggestion(item: T, el: HTMLElement): void;
  abstract selectSuggestion(item: T, evt: MouseEvent | KeyboardEvent): void;
}
