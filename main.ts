import { Plugin, MarkdownView, WorkspaceLeaf, Notice } from 'obsidian';
import { StateEffect } from "@codemirror/state";
import { mirrorStateField, forceMirrorUpdateEffect, mirrorPluginFacet, filePathFacet, viewIdFacet, cleanupMirrorCaches } from './src/editor/mirrorState';
import { MirrorUIPluginSettings, DEFAULT_SETTINGS, DEFAULT_VIEW_OVERRIDES, MirrorUISettingsTab } from './settings';
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
import { getEditorView, getVaultBasePath, getVaultConfig, getViewMode, openSettings, openSettingsTab, rerenderPreview } from './src/utils/obsidianInternals';
import { applyViewOverrides } from './src/editor/viewOverrides';
import { setupDomPosition } from './src/rendering/domPositionManager';
import { handleTemplateChange, clearTemplateChangeTimeout } from './src/rendering/templateChangeHandler';
import { rebuildKnownTemplatePaths, checkDeletedTemplates } from './src/settings/settingsHelpers';
import { snapshotObsidianConfig, registerConfigWatcher, resetConfigSnapshot } from './src/utils/obsidianConfigMonitor';
import { clearSetupCooldowns } from './src/rendering/domPositionManager';
import { registerModeSwitchDetector } from './src/utils/modeSwitchDetector';

export default class MirrorUIPlugin extends Plugin {
  settings: MirrorUIPluginSettings;
  sourceDeps = new SourceDependencyRegistry();
  templateDeps = new TemplateDependencyRegistry();
  /** Position overrides when DOM injection falls back to CM6 */
  positionOverrides = new Map<string, MirrorPosition>();
  private settingsUpdateDebounce: NodeJS.Timeout | null = null;
  private metadataUpdateTimeouts = new Map<string, NodeJS.Timeout>();
  private crossNoteTimeouts = new Map<string, NodeJS.Timeout>();
  /** Set precomputado de template paths usados nos settings (atualizado em loadSettings/saveSettings) */
  knownTemplatePaths = new Set<string>();
  /** Track last known view mode per view — keyed by viewId:filePath for per-pane isolation */
  lastViewMode = new Map<string, string>();
  /** Track fire-and-forget timers for cleanup on unload */
  pendingTimers = new Set<NodeJS.Timeout>();
  private cleanupModeSwitch: (() => void) | null = null;
  private isUnloaded = false;

  async onload() {
    await this.loadSettings();

    Logger.init(getVaultBasePath(this.app));
    Logger.setEnabled(this.settings.debug_logging);
    Logger.log('Mirror Notes loaded');

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
          this.scheduleTimer(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              const vid = getViewId(view.containerEl);
              this.lastViewMode.set(`${vid}:${file.path}`, getViewMode(view));
              this.setupEditor(view);
              setupDomPosition(this, view);
              applyViewOverrides(this, view);
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
          this.scheduleTimer(() => {
            this.setupEditor(leaf.view as MarkdownView);
            setupDomPosition(this, leaf.view as MarkdownView);
            applyViewOverrides(this, leaf.view as MarkdownView);
          }, TIMING.EDITOR_SETUP_DELAY);
        }
      })
    );

    // Re-processar mirrors quando settings visuais do Obsidian mudam (inline title, properties, backlinks)
    snapshotObsidianConfig(this.app);
    registerConfigWatcher(this, () => this.refreshAllEditors());

    // Detectar mode switch (LP ↔ RV) — layout-change com trailing debounce 50ms
    this.cleanupModeSwitch = registerModeSwitchDetector(this);

    // Registrar code block processor (```mirror ... ```)
    registerMirrorCodeBlock(this);

    // Registrar comando + menu contextual para inserir blocos mirror
    registerInsertMirrorBlock(this);

    // Configurar editores ja abertos e re-renderizar code blocks apos layout pronto
    // Guard: onLayoutReady is not cancellable — if plugin is disabled before layout is ready,
    // this callback still fires after onunload(). isUnloaded prevents work on dead instance.
    this.app.workspace.onLayoutReady(() => {
      if (this.isUnloaded) return;
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
      this.scheduleTimer(() => {
        Logger.log('[event] cold-start-retry (1s)');
        // Global clear needed: DOM mirror cacheKeys are internal to domPositionManager
        // and we can't enumerate which specific views failed on first render.
        // Trade-off: re-renders all mirrors but guarantees cold-start recovery.
        clearRenderCache();
        this.app.workspace.iterateAllLeaves(leaf => {
          if (leaf.view instanceof MarkdownView && leaf.view.file) {
            setupDomPosition(this, leaf.view);
          }
        });
      }, 1000);
    });

    // Registrar a aba de configuracoes
    this.addSettingTab(new MirrorUISettingsTab(this.app, this));

    // Sincronizar com metadataCache de forma mais conservadora
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        // Branch 1: atualizar TODOS os views da nota que mudou (multi-pane aware)
        // Per-file debounce — mudancas em A.md nao cancelam refresh de B.md
        const existingMeta = this.metadataUpdateTimeouts.get(file.path);
        if (existingMeta) clearTimeout(existingMeta);
        this.metadataUpdateTimeouts.set(file.path, setTimeout(() => {
          this.metadataUpdateTimeouts.delete(file.path);
          this.app.workspace.iterateAllLeaves(leaf => {
            if (!(leaf.view instanceof MarkdownView) || leaf.view.file?.path !== file.path) return;
            const view = leaf.view as MarkdownView;

            setupDomPosition(this, view);

            Logger.log('Metadata changed, forcing CM6 update');
            const cm = getEditorView(view);
            if (cm) {
              // Dispatch first — cm.dispatch is synchronous, updates StateField immediately.
              // applyViewOverrides reads from StateField, so it must run AFTER dispatch
              // to get the fresh config (avoids stale hideProps/inlineTitle from previous mirror).
              cm.dispatch({
                effects: forceMirrorUpdateEffect.of()
              });
            }
            applyViewOverrides(this, view);
          });
        }, TIMING.METADATA_CHANGE_DEBOUNCE));

        // Branch 2: cross-note — source externo mudou, re-render blocos dependentes
        // Check at event time to decide if we need a timeout at all
        if (this.sourceDeps.getDependentCallbacks(file.path).length > 0) {
          const existing = this.crossNoteTimeouts.get(file.path);
          if (existing) clearTimeout(existing);
          this.crossNoteTimeouts.set(file.path, setTimeout(() => {
            // Re-query at execution time — blocks may have been destroyed during debounce
            const callbacks = this.sourceDeps.getDependentCallbacks(file.path);
            if (callbacks.length > 0) {
              Logger.log(`Cross-note refresh: ${callbacks.length} block(s) depend on ${file.path}`);
              for (const cb of callbacks) {
                cb();
              }
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
            this.pendingTimers.delete(this.settingsUpdateDebounce);
          }

          this.settingsUpdateDebounce = this.scheduleTimer(async () => {
            Logger.log('Settings changed, reloading from disk');
            await this.loadSettings();
            Logger.setEnabled(this.settings.debug_logging);
            clearConfigCache();
            this.app.workspace.iterateAllLeaves(leaf => {
              if (leaf.view instanceof MarkdownView && leaf.view.file) {
                // DOM injection + overrides run for ALL views (including RV without CM6)
                setupDomPosition(this, leaf.view as MarkdownView);
                const cm = getEditorView(leaf.view as MarkdownView);
                if (cm) {
                  cm.dispatch({
                    effects: forceMirrorUpdateEffect.of()
                  });
                }
                applyViewOverrides(this, leaf.view as MarkdownView);
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
        // Clear stale templateDeps callbacks under old path — prevents memory leak
        // when templates are renamed. New callbacks are registered on next render cycle.
        this.templateDeps.unregisterTemplate(oldPath);
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
        // Clear templateDeps callbacks for deleted template — prevents stale callbacks
        this.templateDeps.unregisterTemplate(file.path);
        checkDeletedTemplates(this, file.path);
      })
    );

  }

  /** Schedule a timeout and track it for cleanup. Auto-removes on completion.
   *  Handles async callbacks safely — unhandled rejections are caught and logged. */
  scheduleTimer(fn: () => void | Promise<void>, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      if (this.isUnloaded) return;
      Promise.resolve(fn()).catch(err => Logger.error(`scheduleTimer callback failed: ${err}`));
    }, delay);
    this.pendingTimers.add(timer);
    return timer;
  }

  async loadSettings() {
    const raw = await this.loadData();
    // structuredClone prevents shallow-copy pollution of DEFAULT_SETTINGS
    // (customMirrors array and global_view_overrides object are nested)
    this.settings = Object.assign(structuredClone(DEFAULT_SETTINGS), raw ?? {});

    // Normalize fields that external sync/manual edits can corrupt to wrong types
    if (!Array.isArray(this.settings.customMirrors)) {
      this.settings.customMirrors = [];
    }
    if (!this.settings.global_view_overrides || typeof this.settings.global_view_overrides !== 'object' || Array.isArray(this.settings.global_view_overrides)) {
      this.settings.global_view_overrides = { ...DEFAULT_VIEW_OVERRIDES };
    }

    // Migration: ensure conditions fields exist on each mirror (pre-v46 data.json)
    for (const mirror of this.settings.customMirrors) {
      if (!mirror.conditions) mirror.conditions = [];
      if (!mirror.conditionLogic) mirror.conditionLogic = 'any';
      if (!mirror.custom_view_overrides || typeof mirror.custom_view_overrides !== 'object') {
        mirror.custom_view_overrides = { ...DEFAULT_VIEW_OVERRIDES };
      }
    }
    rebuildKnownTemplatePaths(this);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    rebuildKnownTemplatePaths(this);
    this.refreshAllEditors();
  }

  /** Remove entries from viewId-keyed Maps whose viewId no longer matches an open leaf */
  private pruneStaleViewEntries(activeViewIds: Set<string>): void {
    for (const map of [this.lastViewMode, this.positionOverrides]) {
      for (const key of map.keys()) {
        const viewId = key.split(':')[0];
        if (!activeViewIds.has(viewId)) {
          map.delete(key);
        }
      }
    }
  }

  /** Atualiza todos os editores abertos com config fresca (chamado apos saveSettings) */
  private async refreshAllEditors() {
    clearConfigCache();
    this.positionOverrides.clear();
    // Collect all open markdown leaves
    const views: MarkdownView[] = [];
    const activeViewIds = new Set<string>();
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof MarkdownView && leaf.view.file) {
        views.push(leaf.view as MarkdownView);
        activeViewIds.add(getViewId(leaf.view.containerEl));
      }
    });
    // Prune stale entries from per-view Maps (long session cleanup)
    this.pruneStaleViewEntries(activeViewIds);
    // Pass 1: resolve DOM positions and set overrides (async)
    for (const view of views) {
      await setupDomPosition(this, view);
    }
    // Pass 2: dispatch CM6 updates (reads overrides set in pass 1) + apply view overrides
    for (const view of views) {
      const cm = getEditorView(view);
      if (cm) {
        cm.dispatch({ effects: forceMirrorUpdateEffect.of() });
      }
      applyViewOverrides(this, view);
    }
  }

  async resetSettings() {
    this.settings = structuredClone(DEFAULT_SETTINGS);
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

    this.scheduleTimer(() => {
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

    this.scheduleTimer(() => {
      applyViewOverrides(this, view);
    }, TIMING.HIDE_PROPS_DELAY);
  }

  onunload() {
    this.isUnloaded = true;
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
    const globalReadable = !!getVaultConfig(this.app, "readableLineLength");
    document.querySelectorAll('.markdown-source-view').forEach(el => {
      el.classList.toggle('is-readable-line-width', globalReadable);
    });

    cleanupAllDomMirrors();
    cleanupMirrorCaches();
    clearSetupCooldowns();
    resetConfigSnapshot();

    this.positionOverrides.clear();
    this.lastViewMode.clear();
    this.sourceDeps.clear();
    this.templateDeps.clear();

    if (this.settingsUpdateDebounce) {
      clearTimeout(this.settingsUpdateDebounce);
    }
    for (const t of this.metadataUpdateTimeouts.values()) clearTimeout(t);
    this.metadataUpdateTimeouts.clear();
    for (const t of this.crossNoteTimeouts.values()) clearTimeout(t);
    this.crossNoteTimeouts.clear();
    clearTemplateChangeTimeout();

    // Cancel all fire-and-forget timers (backlinks retries, file-open, cold-start, etc.)
    for (const t of this.pendingTimers) clearTimeout(t);
    this.pendingTimers.clear();
    if (this.cleanupModeSwitch) this.cleanupModeSwitch();

    Logger.log('Plugin unloaded successfully');
    Logger.destroy();
  }
}

export { toggleWidgetEffect } from './src/editor/mirrorState';
