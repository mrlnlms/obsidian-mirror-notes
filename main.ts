import { Plugin, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import { StateEffect } from "@codemirror/state";
import { mirrorStateField, toggleWidgetEffect, MirrorState } from './src/editor/mirrorState';
import { createMirrorViewPlugin } from './src/editor/mirrorViewPlugin';

export default class MirrorUIPlugin extends Plugin {
  private activeEditors: Map<string, boolean> = new Map();

  async onload() {
    console.log('[Mirror Notes] v20 loaded — CM6 integration');
    
    // Configurar editores ao mudar
    this.registerEvent(
      this.app.workspace.on('editor-change', (editor, view) => {
        if (view instanceof MarkdownView && view.file) {
          this.setupEditor(view);
        }
      })
    );

    // Configurar ao abrir arquivos
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file) {
          // Pequeno delay para garantir que o editor está pronto
          setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              this.setupEditor(view);
            }
          }, 50);
        }
      })
    );

    // Configurar ao mudar de aba
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
        if (leaf?.view instanceof MarkdownView) {
          setTimeout(() => {
            this.setupEditor(leaf.view as MarkdownView);
          }, 50);
        }
      })
    );

    // Configurar editores já abertos
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof MarkdownView && leaf.view.file) {
        this.setupEditor(leaf.view);
      }
    });
  }

  setupEditor(view: MarkdownView) {
    const file = view.file;
    if (!file) return;

    // @ts-ignore
    const cm = view.editor.cm;
    if (!cm) return;

    // Verificar se já tem nossas extensões
    const hasOurExtension = cm.state.field(mirrorStateField, false);
    
    if (!hasOurExtension) {
      console.log('Adding extensions to editor for:', file.path);
      
      // Adicionar extensões
      cm.dispatch({
        effects: StateEffect.appendConfig.of([
          mirrorStateField,
          createMirrorViewPlugin(this)
        ])
      });
    }

    // Sempre verificar se deve mostrar o widget
    const cache = this.app.metadataCache.getFileCache(file);
    const shouldShow = cache?.frontmatter?.type === 'project';
    
    // Atualizar estado
    cm.dispatch({
      effects: toggleWidgetEffect.of(shouldShow)
    });
  }

  onunload() {
    this.activeEditors.clear();
  }
}

// Exportar para usar no plugin
export { toggleWidgetEffect } from './src/editor/mirrorState';