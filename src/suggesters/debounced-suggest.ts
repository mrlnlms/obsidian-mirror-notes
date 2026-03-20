import { AbstractInputSuggest, App, debounce } from 'obsidian';

const DEBOUNCE_MS = 150;

export abstract class DebouncedInputSuggest<T> extends AbstractInputSuggest<T> {
  protected inputEl: HTMLInputElement;

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.inputEl = inputEl;
    this.limit = 100;
  }

  /** setValue + trigger input event so Setting.onChange fires */
  protected setValueAndNotify(value: string): void {
    this.setValue(value);
    this.inputEl.trigger('input');
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
