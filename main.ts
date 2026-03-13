import { Plugin, MarkdownView, WorkspaceLeaf, Notice } from 'obsidian';
import { StateEffect } from "@codemirror/state";
import { mirrorStateField, forceMirrorUpdateEffect, mirrorPluginFacet, filePathFacet, cleanupMirrorCaches } from './src/editor/mirrorState';
import { MirrorUIPluginSettings, DEFAULT_SETTINGS, MirrorUISettingsTab } from './settings';
import { Logger } from './src/logger';
import { registerMirrorCodeBlock } from './src/rendering/codeBlockProcessor';
import { registerInsertMirrorBlock } from './src/commands/insertMirrorBlock';
import { SourceDependencyRegistry } from './src/rendering/sourceDependencyRegistry';
import { TemplateDependencyRegistry } from './src/rendering/templateDependencyRegistry';
import { TIMING } from './src/editor/timingConfig';
import { clearConfigCache, getApplicableConfig } from './src/editor/mirrorConfig';
import { MirrorPosition } from './src/editor/mirrorTypes';
import { mirrorMarginPanelPlugin } from './src/editor/marginPanelExtension';
import { isDomPosition, injectDomMirror, removeAllDomMirrors, cleanupAllDomMirrors } from './src/rendering/domInjector';
import { updateSettingsPaths as updatePaths } from './src/utils/settingsPaths';
import { getEditorView, getVaultBasePath, openSettings, openSettingsTab, rerenderPreview } from './src/utils/obsidianInternals';

export default class MirrorUIPlugin extends Plugin {
  settings: MirrorUIPluginSettings;
  sourceDeps = new SourceDependencyRegistry();
  templateDeps = new TemplateDependencyRegistry();
  /** Position overrides when DOM injection falls back to CM6 */
  positionOverrides = new Map<string, MirrorPosition>();
  private activeEditors: Map<string, boolean> = new Map();
  private settingsUpdateDebounce: NodeJS.Timeout | null = null;
  private crossNoteTimeouts = new Map<string, NodeJS.Timeout>();
  private templateUpdateTimeout: NodeJS.Timeout | null = null;
  /** Set precomputado de template paths usados nos settings (atualizado em loadSettings/saveSettings) */
  private knownTemplatePaths = new Set<string>();
  /** Cached Obsidian config values — only refresh editors when these actually change */
  private lastObsidianConfig = { showInlineTitle: true, propertiesInDocument: 'visible', backlinkEnabled: false };

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
        if (file) {
          setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              this.setupEditor(view);
              this.setupDomPosition(view);
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
            this.setupDomPosition(leaf.view as MarkdownView);
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

    // Registrar code block processor (```mirror ... ```)
    registerMirrorCodeBlock(this);

    // Registrar comando + menu contextual para inserir blocos mirror
    registerInsertMirrorBlock(this);

    // Configurar editores ja abertos e re-renderizar code blocks apos layout pronto
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
          this.setupEditor(leaf.view);
          this.setupDomPosition(leaf.view);
          rerenderPreview(leaf.view);
        }
      });
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
            this.setupDomPosition(activeView);
            this.updateHidePropsForView(activeView);

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
        this.handleTemplateChange(file.path);
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
                  this.updateHidePropsForView(leaf.view as MarkdownView);
                  this.setupDomPosition(leaf.view as MarkdownView);
                }
              }
            });
            this.settingsUpdateDebounce = null;
          }, TIMING.SETTINGS_FILE_DEBOUNCE);
          return;
        }

        // Template content changed (vault.on('modify') cobre body changes que metadataCache pode nao disparar)
        this.handleTemplateChange(file.path);
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
        this.checkDeletedTemplates(file.path);
      })
    );

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.rebuildKnownTemplatePaths();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.rebuildKnownTemplatePaths();
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
      await this.setupDomPosition(view);
    }
    // Pass 2: dispatch CM6 updates (reads overrides set in pass 1)
    for (const view of views) {
      const cm = getEditorView(view);
      if (cm) {
        cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
        this.updateHidePropsForView(view);
      }
    }
  }

  private rebuildKnownTemplatePaths() {
    this.knownTemplatePaths.clear();
    const s = this.settings;
    if (s.global_settings_live_preview_note) this.knownTemplatePaths.add(s.global_settings_live_preview_note);
    if (s.global_settings_preview_note) this.knownTemplatePaths.add(s.global_settings_preview_note);
    for (const m of s.customMirrors) {
      if (m.custom_settings_live_preview_note) this.knownTemplatePaths.add(m.custom_settings_live_preview_note);
      if (m.custom_settings_preview_note) this.knownTemplatePaths.add(m.custom_settings_preview_note);
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

  updateHidePropsForView(view: MarkdownView) {
    if (!view || !view.file) return;

    const cm = getEditorView(view);
    if (!cm) return;

    const fieldState = cm.state.field(mirrorStateField, false);
    if (!fieldState) return;

    const { mirrorState } = fieldState;
    const shouldHide = mirrorState.enabled && mirrorState.config?.hideProps;

    const viewContent = view.containerEl.querySelector('.view-content');
    if (!viewContent) return;

    if (shouldHide) {
      Logger.log(`Hiding properties for: ${view.file.path}`);
      viewContent.classList.add('mirror-hide-properties');
    } else {
      viewContent.classList.remove('mirror-hide-properties');
    }
  }

  async setupDomPosition(view: MarkdownView) {
    const file = view.file;
    if (!file) return;

    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const config = getApplicableConfig(this, file, frontmatter);
    if (!config || !isDomPosition(config.position)) {
      removeAllDomMirrors(file.path);
      return;
    }

    this.positionOverrides.delete(file.path);
    removeAllDomMirrors(file.path);

    let actualPos = await injectDomMirror(this, view, config, frontmatter);

    // Se fallback retornou outra posicao DOM, re-injetar nessa posicao
    if (actualPos !== config.position && isDomPosition(actualPos)) {
      const retryConfig = { ...config, position: actualPos };
      actualPos = await injectDomMirror(this, view, retryConfig, frontmatter);
    }

    // Registrar dependencia de template (re-render quando template muda)
    const blockKey = `dom-${file.path}-${config.position}`;
    this.templateDeps.register(config.templatePath, blockKey, async () => {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      let pos = await injectDomMirror(this, view, config, fm);
      if (pos !== config.position && isDomPosition(pos)) {
        pos = await injectDomMirror(this, view, { ...config, position: pos }, fm);
      }
    });

    if (actualPos !== config.position) {
      Logger.log(`DOM fallback: ${config.position} -> ${actualPos} for ${file.path}`);
      this.positionOverrides.set(file.path, actualPos);
      const cm = getEditorView(view);
      if (cm) {
        cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
      }
    }
  }

  /** Dispara re-render de todos mirrors que dependem de um template path */
  private handleTemplateChange(filePath: string) {
    const templateCbs = this.templateDeps.getDependentCallbacks(filePath);
    // Fast path: se nenhum callback E nao e template dos settings → skip
    if (templateCbs.length === 0 && !this.knownTemplatePaths.has(filePath)) return;

    if (this.templateUpdateTimeout) {
      clearTimeout(this.templateUpdateTimeout);
    }

    this.templateUpdateTimeout = setTimeout(() => {
      // Callbacks registrados (code blocks + DOM mirrors)
      if (templateCbs.length > 0) {
        Logger.log(`Template refresh: ${templateCbs.length} mirror(s) depend on ${filePath}`);
        for (const cb of templateCbs) {
          cb();
        }
      }
      // CM6 widgets (settings-based) — iterateAllLeaves DENTRO do debounce
      this.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
          const cm = getEditorView(leaf.view as MarkdownView);
          if (!cm) return;
          const fieldState = cm.state.field(mirrorStateField, false);
          if (fieldState?.mirrorState?.config?.templatePath === filePath) {
            cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
          }
        }
      });
      this.templateUpdateTimeout = null;
    }, TIMING.METADATA_CHANGE_DEBOUNCE);
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

      cm.dispatch({
        effects: StateEffect.appendConfig.of([
          mirrorPluginFacet.of(this),
          filePathFacet.of(file.path),
          mirrorStateField,
          mirrorMarginPanelPlugin
        ])
      });
    } else {
      return; // StateField already present, nothing to do
    }

    setTimeout(() => {
      this.updateHidePropsForView(view);
    }, TIMING.HIDE_PROPS_DELAY);
  }

  onunload() {
    Logger.log('Unloading plugin...');

    document.querySelectorAll('.mirror-ui-widget').forEach(widget => {
      widget.remove();
    });

    document.querySelectorAll('.mirror-hide-properties').forEach(el => {
      el.classList.remove('mirror-hide-properties');
    });

    cleanupAllDomMirrors();
    cleanupMirrorCaches();

    this.activeEditors.clear();
    this.positionOverrides.clear();
    this.sourceDeps.clear();
    this.templateDeps.clear();

    if (this.settingsUpdateDebounce) {
      clearTimeout(this.settingsUpdateDebounce);
    }
    for (const t of this.crossNoteTimeouts.values()) clearTimeout(t);
    this.crossNoteTimeouts.clear();
    if (this.templateUpdateTimeout) {
      clearTimeout(this.templateUpdateTimeout);
    }

    Logger.log('Plugin unloaded successfully');
    Logger.destroy();
  }
}

export { toggleWidgetEffect } from './src/editor/mirrorState';
