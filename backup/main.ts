import { Plugin, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import { StateEffect } from "@codemirror/state";
import { mirrorStateField, toggleWidgetEffect, MirrorState, forceMirrorUpdateEffect } from './src/editor/mirrorState';
import { MirrorUIPluginSettings, DEFAULT_SETTINGS, MirrorUISettingsTab } from './settings';

export default class MirrorUIPlugin extends Plugin {
  settings: MirrorUIPluginSettings;
  private activeEditors: Map<string, boolean> = new Map();
  private settingsUpdateDebounce: NodeJS.Timeout | null = null;

  async onload() {
    console.log('Loading MirrorUI Plugin');
    (window as any).mirrorUIPluginInstance = this;
    await this.loadSettings();
    
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
          // Delay menor para melhor responsividade
          setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              this.setupEditor(view);
            }
          }, 25);
        }
      })
    );

    // Configurar ao mudar de aba
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
        if (leaf?.view instanceof MarkdownView) {
          setTimeout(() => {
            this.setupEditor(leaf.view as MarkdownView);
          }, 25);
        }
      })
    );

    // Configurar editores já abertos
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof MarkdownView && leaf.view.file) {
        this.setupEditor(leaf.view);
      }
    });

    // Registrar a aba de configurações
    this.addSettingTab(new MirrorUISettingsTab(this.app, this));

    // Sincronizar com metadataCache de forma mais conservadora
    let metadataUpdateTimeout: NodeJS.Timeout | null = null;
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file && file.path === activeView.file.path) {
          // @ts-ignore
          const cm = activeView.editor.cm;
          if (cm) {
            // Cancelar timeout anterior se existir
            if (metadataUpdateTimeout) {
              clearTimeout(metadataUpdateTimeout);
            }
            
            // Aguardar muito mais tempo para estabilizar
            metadataUpdateTimeout = setTimeout(() => {
              // Só forçar update se realmente necessário e não estiver digitando
              const now = Date.now();
              const lastInteraction = this.getLastUserInteraction();
              
              // Muito mais conservador: 1 segundo desde última interação
              if (now - lastInteraction > 1000) {
                console.log('[MirrorNotes] Metadata changed, updating mirror');
                cm.dispatch({
                  effects: forceMirrorUpdateEffect.of()
                });
              } else {
                console.log('[MirrorNotes] Metadata changed but user is active, skipping update');
              }
              
              metadataUpdateTimeout = null;
            }, 500); // Aumentado para 500ms
          }
        }
      })
    );
    
    // Listener para mudanças nas configurações com debounce maior
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.path === `.obsidian/plugins/${this.manifest.id}/data.json`) {
          // Configurações mudaram, usar debounce para evitar múltiplas atualizações
          if (this.settingsUpdateDebounce) {
            clearTimeout(this.settingsUpdateDebounce);
          }
          
          this.settingsUpdateDebounce = setTimeout(() => {
            console.log('[MirrorNotes] Settings changed, updating all editors');
            this.app.workspace.iterateAllLeaves(leaf => {
              if (leaf.view instanceof MarkdownView && leaf.view.file) {
                // @ts-ignore
                const cm = leaf.view.editor?.cm;
                if (cm) {
                  cm.dispatch({
                    effects: forceMirrorUpdateEffect.of()
                  });
                }
              }
            });
            this.settingsUpdateDebounce = null;
          }, 500); // 500ms de debounce para configurações
        }
      })
    );

    // Registrar eventos de interação do usuário para tracking
    this.registerDomEvent(document, 'keydown', () => {
      this.updateLastUserInteraction();
    });
    
    this.registerDomEvent(document, 'mousedown', () => {
      this.updateLastUserInteraction();
    });
  }

  private lastUserInteraction = Date.now();

  private updateLastUserInteraction() {
    this.lastUserInteraction = Date.now();
  }

  private getLastUserInteraction(): number {
    return this.lastUserInteraction;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async resetSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    await this.saveSettings();
  }

  setupEditor(view: MarkdownView) {
    const file = view.file;
    if (!file) return;

    // @ts-ignore
    const cm = view.editor.cm;
    if (!cm) return;

    // Verificar se já tem a extensão
    const hasOurExtension = cm.state.field(mirrorStateField, false);
    
    if (!hasOurExtension) {
      // Limpar qualquer widget órfão antes de adicionar novo
      const editorEl = cm.dom;
      if (editorEl) {
        editorEl.querySelectorAll('.mirror-ui-widget').forEach((widget: Element) => {
          console.log('[MirrorNotes] Removing orphan widget');
          widget.remove();
        });
      }
      
      cm.dispatch({
        effects: StateEffect.appendConfig.of([
          mirrorStateField
        ])
      });
    }
  }

  onunload() {
    console.log('[MirrorNotes] Unloading plugin...');
    
    // 1. Limpar todos os widgets DOM antes de descarregar
    document.querySelectorAll('.mirror-ui-widget').forEach(widget => {
      widget.remove();
    });
    
    // 2. Remover extensões do CodeMirror de TODOS os editores
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof MarkdownView) {
        // @ts-ignore
        const cm = leaf.view.editor?.cm;
        if (cm) {
          // Tentar remover a extensão se possível
          try {
            // Forçar uma atualização vazia para limpar decorations
            cm.dispatch({
              effects: StateEffect.reconfigure.of([])
            });
          } catch (e) {
            console.error('[MirrorNotes] Error cleaning editor:', e);
          }
        }
      }
    });
    
    // 3. Limpar caches globais
    if ((window as any).mirrorUICleanup) {
      (window as any).mirrorUICleanup();
    }
    
    // 4. Limpar referências
    this.activeEditors.clear();
    
    // 5. Limpar timeouts
    if (this.settingsUpdateDebounce) {
      clearTimeout(this.settingsUpdateDebounce);
    }
    
    // 6. Limpar referência global
    delete (window as any).mirrorUIPluginInstance;
    
    console.log('[MirrorNotes] Plugin unloaded successfully');
  }
}

// Exportar para usar no plugin
export { toggleWidgetEffect } from './src/editor/mirrorState';