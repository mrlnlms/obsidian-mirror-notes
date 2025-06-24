import { WidgetType, EditorView } from "@codemirror/view";
import { MarkdownRenderer, TFile } from 'obsidian';
import MirrorUIPlugin from '../../main';

export class MirrorWidget extends WidgetType {
  constructor(
    private plugin: MirrorUIPlugin,
    private file: TFile,
    private templatePath: string,
    private position: 'top' | 'bottom'
  ) {
    super();
  }

  eq(other: MirrorWidget): boolean {
    return this.templatePath === other.templatePath && 
           this.position === other.position;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mirror-ui-widget';
    container.contentEditable = 'false';
    
    // Por enquanto, vamos só mostrar um texto
    container.innerHTML = `
      <div style="background: var(--background-secondary); 
                  padding: 10px; 
                  border-radius: 5px; 
                  margin: 10px 0;">
        🚀 Template Widget: ${this.templatePath}
      </div>
    `;
    
    // TODO: Implementar renderização async do template
     this.renderTemplate(container);
    
    return container;
  }

async renderTemplate(container: HTMLElement) {
  try {
    // Converter o path para TFile
    const templateFile = this.plugin.app.vault.getAbstractFileByPath(this.templatePath);
    
    if (!templateFile || !(templateFile instanceof TFile)) {
      container.innerHTML = `<div style="color: red;">Template not found: ${this.templatePath}</div>`;
      return;
    }
    
    const template = await this.plugin.app.vault.read(templateFile);
    
    await MarkdownRenderer.renderMarkdown(
      template, 
      container,
      this.file.path,
      this.plugin
    );
    
    // TODO: Conectar eventos do meta-bind
    // this.connectInteractiveElements(container);
  } catch (error) {
    container.innerHTML = `<div style="color: red;">Error loading template: ${error}</div>`;
  }
}

  ignoreEvent(): boolean {
    return false;
  }
}