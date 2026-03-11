import { Plugin, MarkdownView, WorkspaceLeaf, Notice } from 'obsidian';
import { StateEffect } from "@codemirror/state";
import { mirrorStateField, forceMirrorUpdateEffect, mirrorPluginFacet, cleanupMirrorCaches } from './src/editor/mirrorState';
// Recovery desabilitado (v25.2) — fix de decoration mapping resolve o problema
// import { mirrorRecoveryPlugin } from './src/editor/mirrorViewPlugin';
import { MirrorUIPluginSettings, DEFAULT_SETTINGS, MirrorUISettingsTab } from './settings';
import { Logger } from './src/logger';
import { registerMirrorCodeBlock } from './src/rendering/codeBlockProcessor';
import { registerInsertMirrorBlock } from './src/commands/insertMirrorBlock';
import { SourceDependencyRegistry } from './src/rendering/sourceDependencyRegistry';
import { TIMING } from './src/editor/timingConfig';
import { clearConfigCache } from './src/editor/mirrorConfig';

export default class MirrorUIPlugin extends Plugin {
  settings: MirrorUIPluginSettings;
  sourceDeps = new SourceDependencyRegistry();
  private activeEditors: Map<string, boolean> = new Map();
  private settingsUpdateDebounce: NodeJS.Timeout | null = null;
  private crossNoteTimeout: NodeJS.Timeout | null = null;

  async onload() {
    await this.loadSettings();

    // Init logger
    // @ts-ignore — basePath exists at runtime
    Logger.init(this.app.vault.adapter.basePath);
    Logger.setEnabled(this.settings.debug_logging);
    Logger.log('v25 loaded');
    
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
          }, TIMING.EDITOR_SETUP_DELAY);
        }
      })
    );

    // Configurar ao mudar de aba
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
        if (leaf?.view instanceof MarkdownView) {
          setTimeout(() => {
            this.setupEditor(leaf.view as MarkdownView);
          }, TIMING.EDITOR_SETUP_DELAY);
        }
      })
    );

    // Registrar code block processor (```mirror ... ```)
    registerMirrorCodeBlock(this);

    // Registrar comando + menu contextual para inserir blocos mirror
    registerInsertMirrorBlock(this);

    // Configurar editores ja abertos e re-renderizar code blocks apos layout pronto
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
          this.setupEditor(leaf.view);
          // @ts-ignore — previewMode existe em runtime
          leaf.view.previewMode?.rerender(true);
        }
      });
    });

    // Registrar a aba de configurações
    this.addSettingTab(new MirrorUISettingsTab(this.app, this));

    // Sincronizar com metadataCache de forma mais conservadora
    let metadataUpdateTimeout: NodeJS.Timeout | null = null;
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        // Branch 1: arquivo ativo (CM6 widgets)
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file && file.path === activeView.file.path) {
          // @ts-ignore
          const cm = activeView.editor.cm;
          if (cm) {
            if (metadataUpdateTimeout) {
              clearTimeout(metadataUpdateTimeout);
            }

            metadataUpdateTimeout = setTimeout(() => {
              const now = Date.now();
              const lastInteraction = this.getLastUserInteraction();

              if (now - lastInteraction > TIMING.USER_INACTIVITY_THRESHOLD) {
                Logger.log('Metadata changed, updating mirror');
                cm.dispatch({
                  effects: forceMirrorUpdateEffect.of()
                });
                this.updateHidePropsForView(activeView);
              } else {
                Logger.log('Metadata changed but user is active, skipping update');
              }

              metadataUpdateTimeout = null;
            }, TIMING.METADATA_CHANGE_DEBOUNCE);
          }
        }

        // Branch 2: cross-note — source externo mudou, re-render blocos dependentes
        const callbacks = this.sourceDeps.getDependentCallbacks(file.path);
        if (callbacks.length > 0) {
          if (this.crossNoteTimeout) {
            clearTimeout(this.crossNoteTimeout);
          }
          this.crossNoteTimeout = setTimeout(() => {
            Logger.log(`Cross-note refresh: ${callbacks.length} block(s) depend on ${file.path}`);
            for (const cb of callbacks) {
              cb();
            }
            this.crossNoteTimeout = null;
          }, TIMING.METADATA_CHANGE_DEBOUNCE);
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
            Logger.log('Settings changed, updating all editors');
            clearConfigCache();
            this.app.workspace.iterateAllLeaves(leaf => {
              if (leaf.view instanceof MarkdownView && leaf.view.file) {
                // @ts-ignore
                const cm = leaf.view.editor?.cm;
                if (cm) {
                  cm.dispatch({
                    effects: forceMirrorUpdateEffect.of()
                  });
                  // Atualizar hideProps também
                  this.updateHidePropsForView(leaf.view as MarkdownView);
                }
              }
            });
            this.settingsUpdateDebounce = null;
          }, TIMING.SETTINGS_FILE_DEBOUNCE);
        }
      })
    );

    // Atualizar paths nos settings quando arquivos/pastas sao renomeados
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        const result = this.updateSettingsPaths(oldPath, file.path);
        if (result.changed) {
          Logger.log(`Settings paths updated: ${oldPath} → ${file.path}`);
          const frag = document.createDocumentFragment();
          frag.createEl('span', { text: `Mirror Notes: paths updated (${oldPath.split('/').pop()} → ${file.path.split('/').pop()}). ` });
          const link = frag.createEl('a', { text: 'Open settings', attr: { style: 'cursor: pointer; text-decoration: underline;' } });
          link.addEventListener('click', () => {
            this.openSettingsToField(file.path, result.mirrorIndices.length > 0 ? result.mirrorIndices : undefined);
          });
          new Notice(frag, 8000);
          this.saveSettings();
          clearConfigCache();
        }
      })
    );

    // Notificar quando template referenciado e deletado
    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        this.checkDeletedTemplates(file.path);
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

  public openSettingsToField(targetValue: string, mirrorIndices?: number[]): void {
    // Expandir mirrors afetados se colapsados
    if (mirrorIndices) {
      for (const idx of mirrorIndices) {
        if (this.settings.customMirrors[idx]) {
          this.settings.customMirrors[idx].openview = true;
        }
      }
      this.saveSettings();
    }

    // @ts-ignore
    this.app.setting.open();
    // @ts-ignore
    this.app.setting.openTabById(this.manifest.id);

    setTimeout(() => {
      const container = document.querySelector('.mirror-settings_main');
      if (!container) return;
      for (const input of Array.from(container.querySelectorAll('input'))) {
        if ((input as HTMLInputElement).value === targetValue) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (input as HTMLInputElement).focus();
          break;
        }
      }
    }, 250);
  }

  private updateSettingsPaths(oldPath: string, newPath: string): { changed: boolean; mirrorIndices: number[]; globalAffected: boolean } {
    const result = { changed: false, mirrorIndices: [] as number[], globalAffected: false };
    if (!this.settings.auto_update_paths) return result;

    const s = this.settings;

    const replacePath = (current: string): string | null => {
      if (!current) return null;
      if (current === oldPath) return newPath;
      if (current.startsWith(oldPath + '/')) return newPath + current.slice(oldPath.length);
      return null;
    };

    // Global template paths
    const g1 = replacePath(s.global_settings_live_preview_note);
    if (g1 !== null) { s.global_settings_live_preview_note = g1; result.changed = true; result.globalAffected = true; }

    const g2 = replacePath(s.global_settings_preview_note);
    if (g2 !== null) { s.global_settings_preview_note = g2; result.changed = true; result.globalAffected = true; }

    // Custom mirrors (respeita per-mirror toggle)
    for (let i = 0; i < s.customMirrors.length; i++) {
      const mirror = s.customMirrors[i];
      if (mirror.custom_auto_update_paths === false) continue;

      let mirrorAffected = false;

      const c1 = replacePath(mirror.custom_settings_live_preview_note);
      if (c1 !== null) { mirror.custom_settings_live_preview_note = c1; mirrorAffected = true; }

      const c2 = replacePath(mirror.custom_settings_preview_note);
      if (c2 !== null) { mirror.custom_settings_preview_note = c2; mirrorAffected = true; }

      // filterFiles — compara filename, nao path completo
      const oldName = oldPath.split('/').pop();
      const newName = newPath.split('/').pop();
      if (oldName && newName && oldName !== newName) {
        for (const f of mirror.filterFiles) {
          if (f.folder === oldName) { f.folder = newName; mirrorAffected = true; }
        }
      }

      // filterFolders — compara prefixo de path
      for (const f of mirror.filterFolders) {
        const r = replacePath(f.folder);
        if (r !== null) { f.folder = r; mirrorAffected = true; }
      }

      if (mirrorAffected) {
        result.changed = true;
        result.mirrorIndices.push(i);
      }
    }

    return result;
  }

  private checkDeletedTemplates(deletedPath: string): void {
    const s = this.settings;

    const notify = (msg: string, mirrorIndex?: number) => {
      const frag = document.createDocumentFragment();
      frag.createEl('span', { text: msg + ' ' });
      const link = frag.createEl('a', { text: 'Open settings', attr: { style: 'cursor: pointer; text-decoration: underline;' } });
      link.addEventListener('click', () => {
        this.openSettingsToField(deletedPath, mirrorIndex !== undefined ? [mirrorIndex] : undefined);
      });
      new Notice(frag, 10000);
    };

    if (s.global_settings_live_preview_note === deletedPath) {
      notify(`Mirror Notes: global template "${deletedPath}" was deleted.`);
    }
    if (s.global_settings_preview_note === deletedPath) {
      notify(`Mirror Notes: global preview template "${deletedPath}" was deleted.`);
    }

    for (let i = 0; i < s.customMirrors.length; i++) {
      const mirror = s.customMirrors[i];
      if (mirror.custom_settings_live_preview_note === deletedPath) {
        notify(`Mirror Notes: template "${deletedPath}" used by "${mirror.name}" was deleted.`, i);
      }
      if (mirror.custom_settings_preview_note === deletedPath) {
        notify(`Mirror Notes: preview template "${deletedPath}" used by "${mirror.name}" was deleted.`, i);
      }
    }
  }

  // Método para atualizar o estado do hideProps
  updateHidePropsForView(view: MarkdownView) {
    if (!view || !view.file) return;
    
    // @ts-ignore
    const cm = view.editor?.cm;
    if (!cm) return;
    
    const fieldState = cm.state.field(mirrorStateField, false);
    if (!fieldState) return;
    
    const { mirrorState } = fieldState;
    const shouldHide = mirrorState.enabled && mirrorState.config?.hideProps;
    
    // Encontrar o container correto
    const viewContent = view.containerEl.querySelector('.view-content');
    if (!viewContent) return;
    
    if (shouldHide) {
      Logger.log(`Hiding properties for: ${view.file.path}`);
      viewContent.classList.add('mirror-hide-properties');
    } else {
      viewContent.classList.remove('mirror-hide-properties');
    }
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
      Logger.log(`setupEditor: adding StateField for ${file.path}`);
      // Limpar qualquer widget órfão antes de adicionar novo
      const editorEl = cm.dom;
      if (editorEl) {
        editorEl.querySelectorAll('.mirror-ui-widget').forEach((widget: Element) => {
          Logger.log('Removing orphan widget');
          widget.remove();
        });
      }

      cm.dispatch({
        effects: StateEffect.appendConfig.of([
          mirrorPluginFacet.of(this),
          mirrorStateField
          // mirrorRecoveryPlugin — desabilitado (v25.2)
        ])
      });
    } else {
      Logger.log(`setupEditor: StateField already present for ${file.path}, skipping`);
    }
    
    // Atualizar estado do hideProps
    setTimeout(() => {
      this.updateHidePropsForView(view);
    }, TIMING.HIDE_PROPS_DELAY);
  }

  onunload() {
    Logger.log('Unloading plugin...');
    
    // 1. Limpar todos os widgets DOM antes de descarregar
    document.querySelectorAll('.mirror-ui-widget').forEach(widget => {
      widget.remove();
    });
    
    // 2. Remover classes de hideProps
    document.querySelectorAll('.mirror-hide-properties').forEach(el => {
      el.classList.remove('mirror-hide-properties');
    });
    
    // 3. Limpar caches globais
    cleanupMirrorCaches();

    // 4. Limpar referências
    this.activeEditors.clear();

    // 5. Limpar registry de dependencias cross-note
    this.sourceDeps.clear();

    // 6. Limpar timeouts
    if (this.settingsUpdateDebounce) {
      clearTimeout(this.settingsUpdateDebounce);
    }
    if (this.crossNoteTimeout) {
      clearTimeout(this.crossNoteTimeout);
    }
    
    Logger.log('Plugin unloaded successfully');
    Logger.destroy();
  }
}

// Exportar para usar no plugin
export { toggleWidgetEffect } from './src/editor/mirrorState';