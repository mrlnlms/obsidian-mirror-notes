import { Plugin, MarkdownView, WorkspaceLeaf, Notice } from 'obsidian';
import { StateEffect } from "@codemirror/state";
import { mirrorStateField, forceMirrorUpdateEffect, mirrorPluginFacet, filePathFacet, viewIdFacet, cleanupMirrorCaches } from './src/editor/mirrorState';
import { MirrorUIPluginSettings, DEFAULT_SETTINGS, MirrorUISettingsTab } from './settings';
import { Logger } from './src/dev/logger';
import { registerMirrorCodeBlock } from './src/rendering/codeBlockProcessor';
import { registerInsertMirrorBlock } from './src/commands/insertMirrorBlock';
import { SourceDependencyRegistry } from './src/rendering/sourceDependencyRegistry';
import { TemplateDependencyRegistry } from './src/rendering/templateDependencyRegistry';
import { TIMING } from './src/editor/timingConfig';
import { clearConfigCache } from './src/editor/mirrorConfig';
import { MirrorPosition } from './src/editor/mirrorTypes';
import { mirrorMarginPanelPlugin } from './src/editor/marginPanelExtension';
import { cleanupAllDomMirrors, getViewId } from './src/rendering/domInjector';
import { clearRenderCache } from './src/rendering/templateRenderer';
import { updateSettingsPaths as updatePaths } from './src/utils/settingsPaths';
import { getEditorView, getVaultBasePath, openSettings, openSettingsTab, rerenderPreview } from './src/utils/obsidianInternals';
import { applyViewOverrides } from './src/editor/viewOverrides';
import { setupDomPosition } from './src/rendering/domPositionManager';
import { handleTemplateChange, clearTemplateChangeTimeout } from './src/rendering/templateChangeHandler';
import { rebuildKnownTemplatePaths, checkDeletedTemplates } from './src/settings/settingsHelpers';

export default class MirrorUIPlugin extends Plugin {
  settings: MirrorUIPluginSettings;
  sourceDeps = new SourceDependencyRegistry();
  templateDeps = new TemplateDependencyRegistry();
  /** Position overrides when DOM injection falls back to CM6 */
  positionOverrides = new Map<string, MirrorPosition>();
  private settingsUpdateDebounce: NodeJS.Timeout | null = null;
  private crossNoteTimeouts = new Map<string, NodeJS.Timeout>();
  /** Set precomputado de template paths usados nos settings (atualizado em loadSettings/saveSettings) */
  knownTemplatePaths = new Set<string>();
  /** Cached Obsidian config values — only refresh editors when these actually change */
  private lastObsidianConfig = { showInlineTitle: true, propertiesInDocument: 'visible', backlinkEnabled: false };
  /** Track last known view mode per file — only react to actual mode changes */
  lastViewMode = new Map<string, string>();

  async onload() {
    await this.loadSettings();

    Logger.init(getVaultBasePath(this.app));
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
        Logger.log(`[event] file-open: ${file?.path ?? '(null)'}`);
        if (file) {
          setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              // @ts-ignore — getMode not in official typings
              this.lastViewMode.set(file.path, view.getMode?.() ?? 'unknown');
              this.setupEditor(view);
              setupDomPosition(this, view);
            }
          }, TIMING.EDITOR_SETUP_DELAY);
        }
      })
    );

    // Configurar ao mudar de aba
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
        const viewFile = (leaf?.view instanceof MarkdownView) ? (leaf.view as MarkdownView).file?.path : null;
        Logger.log(`[event] active-leaf-change: ${viewFile ?? '(non-markdown or null)'}`);
        if (leaf?.view instanceof MarkdownView) {
          setTimeout(() => {
            this.setupEditor(leaf.view as MarkdownView);
            setupDomPosition(this, leaf.view as MarkdownView);
          }, TIMING.EDITOR_SETUP_DELAY);
        }
      })
    );

    // Re-processar mirrors quando settings visuais do Obsidian mudam (inline title, properties)
    // css-change nao cobre config changes; monitorar app.json via vault raw event
    // @ts-ignore — getConfig not in official typings
    this.lastObsidianConfig.showInlineTitle = !!this.app.vault.getConfig("showInlineTitle");
    // @ts-ignore
    this.lastObsidianConfig.propertiesInDocument = this.app.vault.getConfig("propertiesInDocument") || 'visible';
    // @ts-ignore — internalPlugins not in official typings
    const blInit = (this.app as any).internalPlugins?.plugins?.['backlink'];
    this.lastObsidianConfig.backlinkEnabled = !!blInit?.enabled;
    this.registerEvent(
      // @ts-ignore — 'raw' event not in typings but fires for all file changes including .obsidian/
      this.app.vault.on('raw', (path: string) => {
        if (path === '.obsidian/app.json') {
          // @ts-ignore
          const showTitle = !!this.app.vault.getConfig("showInlineTitle");
          // @ts-ignore
          const propsMode = this.app.vault.getConfig("propertiesInDocument") || 'visible';
          if (showTitle === this.lastObsidianConfig.showInlineTitle &&
              propsMode === this.lastObsidianConfig.propertiesInDocument) return;
          this.lastObsidianConfig.showInlineTitle = showTitle;
          this.lastObsidianConfig.propertiesInDocument = propsMode;
          Logger.log(`[config-change] showInlineTitle=${showTitle}, propertiesInDocument=${propsMode}`);
          this.refreshAllEditors();
        }
        if (path === '.obsidian/core-plugins.json') {
          // Only react to plugin ON/OFF — backlinkInDocument is NOT reactive for open tabs
          // (Obsidian only updates the DOM on tab close+reopen for that setting)
          // @ts-ignore — internalPlugins not in official typings
          const bl = (this.app as any).internalPlugins?.plugins?.['backlink'];
          const enabled = !!bl?.enabled;
          if (enabled === this.lastObsidianConfig.backlinkEnabled) return;
          this.lastObsidianConfig.backlinkEnabled = enabled;
          Logger.log(`[config-change] backlink=${enabled}`);
          this.refreshAllEditors();
        }
      })
    );

    // Detectar mode switch (LP ↔ RV) — layout-change e o unico evento que dispara.
    // Trailing debounce 50ms: getMode() pode oscilar durante a transicao do Obsidian.
    // Esperar estabilizar evita renders cascateados sem delay perceptivel.
    let layoutDebounce: NodeJS.Timeout | null = null;
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        if (layoutDebounce) clearTimeout(layoutDebounce);
        layoutDebounce = setTimeout(() => {
          layoutDebounce = null;
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (!view || !view.file) return;
          // @ts-ignore — getMode not in official typings
          const currentMode = view.getMode?.() ?? 'unknown';
          const lastMode = this.lastViewMode.get(view.file.path);
          if (currentMode === lastMode) return;
          this.lastViewMode.set(view.file.path, currentMode);
          Logger.log(`[mode-switch] ${lastMode} -> ${currentMode} for ${view.file.path}`);
          // Em RV nao chamar setupEditor — CM6 dispatch pode causar layout-change cascata
          if (currentMode !== 'preview') {
            this.setupEditor(view);
          }
          setupDomPosition(this, view);
        }, 50);
      })
    );

    // Registrar code block processor (```mirror ... ```)
    registerMirrorCodeBlock(this);

    // Registrar comando + menu contextual para inserir blocos mirror
    registerInsertMirrorBlock(this);

    // Configurar editores ja abertos e re-renderizar code blocks apos layout pronto
    this.app.workspace.onLayoutReady(() => {
      const leaves: string[] = [];
      this.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
          leaves.push(leaf.view.file.path);
          this.setupEditor(leaf.view);
          setupDomPosition(this, leaf.view);
          rerenderPreview(leaf.view);
        }
      });
      Logger.log(`[event] onLayoutReady: ${leaves.length} markdown leaves [${leaves.join(', ')}]`);
      // Cold start retry: MarkdownRenderer pode não popular o DOM na primeira tentativa.
      // Backlinks também podem não ter children ainda. Re-renderiza DOM mirrors após delay.
      setTimeout(() => {
        Logger.log('[event] cold-start-retry (1s)');
        this.app.workspace.iterateAllLeaves(leaf => {
          if (leaf.view instanceof MarkdownView && leaf.view.file) {
            clearRenderCache();
            setupDomPosition(this, leaf.view);
          }
        });
      }, 1000);
    });

    // Registrar a aba de configuracoes
    this.addSettingTab(new MirrorUISettingsTab(this.app, this));

    // Sincronizar com metadataCache de forma mais conservadora
    let metadataUpdateTimeout: NodeJS.Timeout | null = null;
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        // Branch 1: arquivo ativo — atualizar mirrors da nota sendo editada
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file && file.path === activeView.file.path) {
          if (metadataUpdateTimeout) {
            clearTimeout(metadataUpdateTimeout);
          }

          metadataUpdateTimeout = setTimeout(() => {
            // DOM injection + hideProps: sempre seguro (nao toca no CM6)
            setupDomPosition(this, activeView);
            applyViewOverrides(this, activeView);

            // CM6 forced update: sempre dispatchar (Properties UI edita YAML sem gerar
            // CM6 transactions, entao o StateField nao auto-detecta. O proprio StateField
            // ja tem throttle 1/sec e debounce 500ms internos)
            Logger.log('Metadata changed, forcing CM6 update');
            const cm = getEditorView(activeView);
            if (cm) {
              cm.dispatch({
                effects: forceMirrorUpdateEffect.of()
              });
            }

            metadataUpdateTimeout = null;
          }, TIMING.METADATA_CHANGE_DEBOUNCE);
        }

        // Branch 2: cross-note — source externo mudou, re-render blocos dependentes
        const callbacks = this.sourceDeps.getDependentCallbacks(file.path);
        if (callbacks.length > 0) {
          const existing = this.crossNoteTimeouts.get(file.path);
          if (existing) clearTimeout(existing);
          this.crossNoteTimeouts.set(file.path, setTimeout(() => {
            Logger.log(`Cross-note refresh: ${callbacks.length} block(s) depend on ${file.path}`);
            for (const cb of callbacks) {
              cb();
            }
            this.crossNoteTimeouts.delete(file.path);
          }, TIMING.METADATA_CHANGE_DEBOUNCE));
        }

        // Branch 3: template mudou — re-render todos mirrors que usam esse template
        handleTemplateChange(this, file.path);
      })
    );

    // Listener para mudancas nas configuracoes e templates
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.path === `.obsidian/plugins/${this.manifest.id}/data.json`) {
          if (this.settingsUpdateDebounce) {
            clearTimeout(this.settingsUpdateDebounce);
          }

          this.settingsUpdateDebounce = setTimeout(() => {
            Logger.log('Settings changed, updating all editors');
            clearConfigCache();
            this.app.workspace.iterateAllLeaves(leaf => {
              if (leaf.view instanceof MarkdownView && leaf.view.file) {
                const cm = getEditorView(leaf.view as MarkdownView);
                if (cm) {
                  cm.dispatch({
                    effects: forceMirrorUpdateEffect.of()
                  });
                  applyViewOverrides(this, leaf.view as MarkdownView);
                  setupDomPosition(this, leaf.view as MarkdownView);
                }
              }
            });
            this.settingsUpdateDebounce = null;
          }, TIMING.SETTINGS_FILE_DEBOUNCE);
          return;
        }

        // Template content changed (vault.on('modify') cobre body changes que metadataCache pode nao disparar)
        handleTemplateChange(this, file.path);
      })
    );

    // Atualizar paths nos settings quando arquivos/pastas sao renomeados
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        const result = this.updateSettingsPaths(oldPath, file.path);
        if (result.changed) {
          Logger.log(`Settings paths updated: ${oldPath} -> ${file.path}`);
          const frag = document.createDocumentFragment();
          frag.createEl('span', { text: `Mirror Notes: paths updated (${oldPath.split('/').pop()} -> ${file.path.split('/').pop()}). ` });
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
        checkDeletedTemplates(this, file.path);
      })
    );

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    rebuildKnownTemplatePaths(this);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    rebuildKnownTemplatePaths(this);
    this.refreshAllEditors();
  }

  /** Atualiza todos os editores abertos com config fresca (chamado apos saveSettings) */
  private async refreshAllEditors() {
    clearConfigCache();
    this.positionOverrides.clear();
    // Collect all open markdown leaves
    const views: MarkdownView[] = [];
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof MarkdownView && leaf.view.file) {
        views.push(leaf.view as MarkdownView);
      }
    });
    // Pass 1: resolve DOM positions and set overrides (async)
    for (const view of views) {
      await setupDomPosition(this, view);
    }
    // Pass 2: dispatch CM6 updates (reads overrides set in pass 1)
    for (const view of views) {
      const cm = getEditorView(view);
      if (cm) {
        cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
        applyViewOverrides(this, view);
      }
    }
  }

  async resetSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    await this.saveSettings();
  }

  public openSettingsToField(targetValue: string, mirrorIndices?: number[]): void {
    if (mirrorIndices) {
      for (const idx of mirrorIndices) {
        if (this.settings.customMirrors[idx]) {
          this.settings.customMirrors[idx].openview = true;
        }
      }
      this.saveSettings();
    }

    openSettings(this.app);
    openSettingsTab(this.app, this.manifest.id);

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

  private updateSettingsPaths(oldPath: string, newPath: string) {
    return updatePaths(this.settings, oldPath, newPath);
  }

  setupEditor(view: MarkdownView) {
    const file = view.file;
    if (!file) return;

    const cm = getEditorView(view);
    if (!cm) return;

    const hasOurExtension = cm.state.field(mirrorStateField, false);

    if (!hasOurExtension) {
      Logger.log(`setupEditor: adding StateField for ${file.path}`);
      const editorEl = cm.dom;
      if (editorEl) {
        editorEl.querySelectorAll('.mirror-ui-widget').forEach((widget: Element) => {
          Logger.log('Removing orphan widget');
          widget.remove();
        });
      }

      const viewId = getViewId(view.containerEl);
      cm.dispatch({
        effects: StateEffect.appendConfig.of([
          mirrorPluginFacet.of(this),
          filePathFacet.of(file.path),
          viewIdFacet.of(viewId),
          mirrorStateField,
          mirrorMarginPanelPlugin
        ])
      });
    } else {
      return; // StateField already present, nothing to do
    }

    setTimeout(() => {
      applyViewOverrides(this, view);
    }, TIMING.HIDE_PROPS_DELAY);
  }

  onunload() {
    Logger.log('Unloading plugin...');

    document.querySelectorAll('.mirror-ui-widget').forEach(widget => {
      widget.remove();
    });

    const overrideClasses = [
      'mirror-hide-properties', 'mirror-force-inline-title', 'mirror-hide-inline-title'
    ];
    for (const cls of overrideClasses) {
      document.querySelectorAll(`.${cls}`).forEach(el => el.classList.remove(cls));
    }
    // Restore Obsidian's readable line width to match global setting
    // @ts-ignore — getConfig not in official typings
    const globalReadable = !!this.app.vault.getConfig("readableLineLength");
    document.querySelectorAll('.markdown-source-view').forEach(el => {
      el.classList.toggle('is-readable-line-width', globalReadable);
    });

    cleanupAllDomMirrors();
    cleanupMirrorCaches();

    this.positionOverrides.clear();
    this.lastViewMode.clear();
    this.sourceDeps.clear();
    this.templateDeps.clear();

    if (this.settingsUpdateDebounce) {
      clearTimeout(this.settingsUpdateDebounce);
    }
    for (const t of this.crossNoteTimeouts.values()) clearTimeout(t);
    this.crossNoteTimeouts.clear();
    clearTemplateChangeTimeout();

    Logger.log('Plugin unloaded successfully');
    Logger.destroy();
  }
}

export { toggleWidgetEffect } from './src/editor/mirrorState';
