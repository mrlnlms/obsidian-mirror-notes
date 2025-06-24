import { StateField, StateEffect, EditorState, RangeSetBuilder, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import MirrorUIPlugin from '../../main';
import { TFile, MarkdownRenderer } from 'obsidian';
import { CustomMirror } from 'settings';

// =================================================================================
// INTERFACES E TIPOS
// =================================================================================
interface ApplicableMirrorConfig {
  templatePath: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  hideProps: boolean;
}

export interface MirrorState {
  enabled: boolean;
  config: ApplicableMirrorConfig | null;
  frontmatter: any;
  widgetId: string;
  lastDocText?: string;
  frontmatterHash?: string; // Hash do frontmatter para detectar mudanças reais
  lastContentHash?: string; // Hash do conteúdo do template para evitar re-renderização
}

// Effects
export const updateTemplateEffect = StateEffect.define<{templatePath: string}>();
export const toggleWidgetEffect = StateEffect.define<boolean>();
export const forceMirrorUpdateEffect = StateEffect.define<void>();

// Cache global mais persistente
const widgetInstanceCache = new Map<string, MirrorTemplateWidget>();
const configCache = new Map<string, { config: ApplicableMirrorConfig | null, frontmatterHash: string }>();

// =================================================================================
// LÓGICA DE MATCHING
// =================================================================================
function getApplicableConfig(plugin: MirrorUIPlugin, file: TFile | null, frontmatter: any): ApplicableMirrorConfig | null {
    if (!file) return null;

    const settings = plugin.settings;

    // 1. Check Custom Mirrors
    for (const mirror of settings.customMirrors) {
        const hasFileMatch = mirror.filterFiles.some(f => f.folder && f.folder === file.name);
        const hasFolderMatch = mirror.filterFolders.some(f => f.folder && file.path.startsWith(f.folder));
        const hasPropMatch = mirror.filterProps.some(p => p.folder && frontmatter[p.folder] === p.template);

        if (hasFileMatch || hasFolderMatch || hasPropMatch) {
            if (mirror.enable_custom_live_preview_mode && mirror.custom_settings_live_preview_note) {
                return {
                    templatePath: mirror.custom_settings_live_preview_note,
                    position: mirror.custom_settings_live_preview_pos as 'top' | 'bottom' | 'left' | 'right',
                    hideProps: mirror.custom_settings_hide_props
                };
            }
        }
    }

    // 2. Check Global Mirror
    if (settings.global_settings && settings.enable_global_live_preview_mode && settings.global_settings_live_preview_note) {
        const hasOverridingCustomMirror = settings.customMirrors.some(mirror => {
            const hasMatch = mirror.filterFiles.some(f => f.folder && f.folder === file.name) ||
                           mirror.filterFolders.some(f => f.folder && file.path.startsWith(f.folder)) ||
                           mirror.filterProps.some(p => p.folder && frontmatter[p.folder] === p.template);
            
            return hasMatch && mirror.custom_settings_overide && settings.global_settings_overide;
        });

        if (!hasOverridingCustomMirror) {
            return {
                templatePath: settings.global_settings_live_preview_note,
                position: settings.global_settings_live_preview_pos as 'top' | 'bottom' | 'left' | 'right',
                hideProps: settings.global_settings_hide_props
            };
        }
    }

    return null;
}

// =================================================================================
// LIMPEZA DE WIDGETS ÓRFÃOS
// =================================================================================
function cleanOrphanWidgets(view: EditorView) {
    const activeWidgetIds = new Set<string>();
    
    // Coletar IDs de widgets ativos do estado
    const fieldState = view.state.field(mirrorStateField, false);
    if (fieldState && fieldState.mirrorState.widgetId) {
        activeWidgetIds.add(fieldState.mirrorState.widgetId);
    }
    
    // Remover widgets que não estão no estado ativo
    view.dom.querySelectorAll('.mirror-ui-widget').forEach((widget: Element) => {
        const widgetId = widget.getAttribute('data-widget-id');
        if (widgetId && !activeWidgetIds.has(widgetId)) {
            console.log(`[MirrorNotes] Removing orphan widget: ${widgetId}`);
            widget.remove();
        }
    });
}

// =================================================================================
// WIDGETS
// =================================================================================

export class MirrorTemplateWidget extends WidgetType {
  public static domCache = new Map<string, HTMLElement>();
  public static lastRenderedContent = new Map<string, string>();
  public static renderingPromises = new Map<string, Promise<void>>();
  
  constructor(
    private plugin: MirrorUIPlugin,
    private state: MirrorState, // Agora recebe MirrorState diretamente
    private config: ApplicableMirrorConfig,
    private widgetId: string
  ) {
    super();
  }

  getCacheKey(): string {
    return `${this.widgetId}-${this.config.position}`;
  }

  toDOM(view: EditorView): HTMLElement {
    // Limpar widgets órfãos antes de criar novo
    cleanOrphanWidgets(view);
    
    const cacheKey = this.getCacheKey();
    
    // Tentar reutilizar DOM existente
    let container = MirrorTemplateWidget.domCache.get(cacheKey);
    
    if (!container) {
      // Criar novo container apenas se não existir
      container = document.createElement('div');
      container.className = `mirror-ui-widget elemento-geral mirror-position-${this.config.position}`;
      container.setAttribute('data-widget-id', this.widgetId);
      container.setAttribute('data-position', this.config.position);
      container.setAttribute('contenteditable', 'false');
      
      // CSS base
      container.style.cssText = `
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
        position: relative;
        min-height: 100px;
        width: 100%;
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
        pointer-events: none;
      `;
      
      // CSS específico para bottom
      if (this.config.position === 'bottom') {
        container.style.cssText += `
          margin-top: 30px !important;
          margin-bottom: 20px !important;
          clear: both;
          display: block;
        `;
      }
      
      // Permitir interação com conteúdo interno
      container.addEventListener('mousedown', (e) => {
        if (e.target !== container) {
          e.stopPropagation();
        } else {
          e.preventDefault();
        }
      });
      
      // Guardar no cache
      MirrorTemplateWidget.domCache.set(cacheKey, container);
      
      // Loading inicial
      container.innerHTML = `<div style="text-align: center; opacity: 0.5;">Loading template...</div>`;
    }
    
    // Renderizar conteúdo assíncronamente apenas se mudou
    this.updateContentIfNeeded(container, view);
    
    return container;
  }

  async updateContentIfNeeded(container: HTMLElement, view: EditorView) {
    const cacheKey = this.getCacheKey();
    
    // Verificar se já está renderizando para evitar renders concorrentes
    if (MirrorTemplateWidget.renderingPromises.has(cacheKey)) {
      return MirrorTemplateWidget.renderingPromises.get(cacheKey);
    }

    const renderPromise = this.doUpdateContent(container, view);
    MirrorTemplateWidget.renderingPromises.set(cacheKey, renderPromise);
    
    try {
      await renderPromise;
    } finally {
      MirrorTemplateWidget.renderingPromises.delete(cacheKey);
    }
  }

  private async doUpdateContent(container: HTMLElement, view: EditorView) {
    try {
      const templateFile = this.plugin.app.vault.getAbstractFileByPath(this.config.templatePath);
      
      if (!templateFile || !(templateFile instanceof TFile)) {
        const errorMsg = `Template not found: ${this.config.templatePath}`;
        if (container.innerHTML !== `<div style="color: var(--text-error);">${errorMsg}</div>`) {
          container.innerHTML = `<div style="color: var(--text-error);">${errorMsg}</div>`;
        }
        return;
      }
      
      const templateContent = await this.plugin.app.vault.read(templateFile);
      
      // Processar variáveis
      let processedContent = templateContent;
      if (this.state.frontmatter && Object.keys(this.state.frontmatter).length > 0) {
        processedContent = templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return this.state.frontmatter[key] || match;
        });
      }
      
      // Criar hash do conteúdo para verificar mudanças
      const contentHash = this.simpleHash(processedContent);
      
      // Verificar se o conteúdo mudou
      const cacheKey = this.getCacheKey();
      const lastContent = MirrorTemplateWidget.lastRenderedContent.get(cacheKey);
      
      if (lastContent === contentHash) {
        return; // Conteúdo não mudou, não re-renderizar
      }
      
      // Atualizar cache
      MirrorTemplateWidget.lastRenderedContent.set(cacheKey, contentHash);
      
      // Renderizar novo conteúdo
      container.innerHTML = '';
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'pointer-events: auto;';
      container.appendChild(contentDiv);

      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (activeFile) {
        await MarkdownRenderer.renderMarkdown(
          processedContent,
          contentDiv,
          activeFile.path,
          this.plugin
        );
      }
    } catch (error) {
      console.error('Error rendering template:', error);
      container.innerHTML = `<div style="color: var(--text-error);">Error: ${error}</div>`;
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  eq(other: WidgetType): boolean {
    if (!(other instanceof MirrorTemplateWidget)) return false;
    
    const otherWidget = other as MirrorTemplateWidget;
    // Widgets são iguais se têm o mesmo ID e configuração
    return this.widgetId === otherWidget.widgetId && 
           this.config.templatePath === otherWidget.config.templatePath &&
           this.config.position === otherWidget.config.position;
  }
  
  destroy() {
    // NÃO limpar cache imediatamente - deixar para garbage collection natural
    // const cacheKey = this.getCacheKey();
    // MirrorTemplateWidget.domCache.delete(cacheKey);
    // MirrorTemplateWidget.lastRenderedContent.delete(cacheKey);
  }
}

// =================================================================================
// STATE FIELD
// =================================================================================
let lastUpdateTime = 0;
const UPDATE_DEBOUNCE = 500; // Aumentado para 500ms - mais conservador
const fileDebounceMap = new Map<string, number>(); // Debounce por arquivo
const lastForcedUpdateMap = new Map<string, number>(); // Track forced updates por arquivo

// 🔥 NOVO: StateField para rastrear decorations separadamente (inspirado no CodeMarker)
interface MirrorFieldState {
  mirrorState: MirrorState;
  decorations: DecorationSet;
}

export const mirrorStateField = StateField.define<MirrorFieldState>({
  create(state: EditorState): MirrorFieldState {
    const plugin = (window as any).mirrorUIPluginInstance as MirrorUIPlugin;
    const file = plugin?.app.workspace.getActiveFile();
    const frontmatter = parseFrontmatter(state.doc.toString());
    const frontmatterHash = hashObject(frontmatter);
    const config = getApplicableConfig(plugin, file, frontmatter);

    const mirrorState = {
      enabled: !!config,
      config: config,
      frontmatter: frontmatter,
      frontmatterHash: frontmatterHash,
      widgetId: generateWidgetId(),
      lastDocText: state.doc.toString()
    };

    // Criar decorations iniciais
    const decorations = buildDecorations(state, mirrorState, plugin);

    return {
      mirrorState,
      decorations
    };
  },

  update(fieldState: MirrorFieldState, tr: Transaction): MirrorFieldState {
    const { mirrorState: value } = fieldState;
    
    // 🔥 IMPORTANTE: Mapear decorations através das mudanças (como o CodeMarker faz!)
    let decorations = fieldState.decorations.map(tr.changes);

    // 1. Verificar se foi um update forçado (só aceitar se for realmente necessário)
    let forcedUpdate = false;
    for (const effect of tr.effects) {
        if (effect.is(forceMirrorUpdateEffect)) {
            forcedUpdate = true;
            break;
        }
    }

    // 2. Se o documento não mudou e não foi forçado, manter estado
    if (!tr.docChanged && !forcedUpdate) {
        return fieldState; // Retornar fieldState completo
    }

    const plugin = (window as any).mirrorUIPluginInstance as MirrorUIPlugin;
    const file = plugin?.app.workspace.getActiveFile();
    const filePath = file?.path || 'unknown';
    const docText = tr.state.doc.toString();
    const now = Date.now(); // Declarar aqui no início

    // 3. Se foi um forced update, verificar se é muito frequente
    if (forcedUpdate) {
        const lastForcedUpdate = lastForcedUpdateMap.get(filePath) || 0;
        if (now - lastForcedUpdate < 1000) { // Não aceitar forced updates mais de 1x por segundo
            console.log(`[MirrorNotes] Forced update ignored - too frequent (${now - lastForcedUpdate}ms ago)`);
            return fieldState;
        }
        lastForcedUpdateMap.set(filePath, now);
    }

    // 5. Debounce específico por arquivo (mais agressivo)
    const lastFileUpdate = fileDebounceMap.get(filePath) || 0;
    if (!forcedUpdate && now - lastFileUpdate < UPDATE_DEBOUNCE) {
        return fieldState;
    }
    
    // 6. Verificar se realmente precisamos processar esta mudança
    let changeInFrontmatterRegion = false;
    let frontmatterEndPos = 0;
    
    // Encontrar onde termina o frontmatter
    const frontmatterMatch = docText.match(/^---\n[\s\S]*?\n---/);
    if (frontmatterMatch) {
      frontmatterEndPos = frontmatterMatch[0].length;
    }
    
    // Se houve mudança no documento, verificar se afeta frontmatter
    if (tr.docChanged) {
      tr.changes.iterChangedRanges((fromA, toA) => {
        if (fromA <= frontmatterEndPos + 50) { // +50 chars de buffer
          changeInFrontmatterRegion = true;
        }
      });
      
      // Se não há mudança na região do frontmatter, apenas atualizar lastDocText
      if (!changeInFrontmatterRegion && !forcedUpdate) {
        const newMirrorState = { ...value, lastDocText: docText };
        return { mirrorState: newMirrorState, decorations };
      }
    }
    
    // 7. Verificar se o frontmatter realmente mudou
    const newFrontmatter = parseFrontmatter(docText);
    const newFrontmatterHash = hashObject(newFrontmatter);
    
    if (newFrontmatterHash === value.frontmatterHash && !forcedUpdate) {
        // Frontmatter não mudou e não foi forçado, apenas atualizar lastDocText
        const newMirrorState = { ...value, lastDocText: docText };
        return { mirrorState: newMirrorState, decorations };
    }
    
    // Atualizar debounce só se vamos realmente processar
    fileDebounceMap.set(filePath, now);
    
    // 🔥 8. TRATAMENTO ESPECIAL PARA FORCED UPDATE
    if (forcedUpdate) {
        console.log(`[MirrorNotes] Forced update - recreating widget unconditionally`);
        
        // Recarregar configuração SEMPRE em forced update
        const freshConfig = getApplicableConfig(plugin, file, value.frontmatter || newFrontmatter);
        
        // Log para debug
        console.log(`[MirrorNotes] Forced update config:`, {
            oldPosition: value.config?.position,
            newPosition: freshConfig?.position,
            oldTemplate: value.config?.templatePath,
            newTemplate: freshConfig?.templatePath
        });
        
        const newMirrorState = {
            enabled: !!freshConfig,
            config: freshConfig,
            frontmatter: value.frontmatter || newFrontmatter, // Manter frontmatter existente se não mudou
            frontmatterHash: value.frontmatterHash || newFrontmatterHash,
            widgetId: generateWidgetId(), // Novo ID força recriação total
            lastDocText: docText
        };
        
        // Limpar cache do widget antigo
        const fileWidgets = Array.from(widgetInstanceCache.keys()).filter(key => key.includes(value.widgetId));
        fileWidgets.forEach(key => {
            widgetInstanceCache.delete(key);
        });
        
        // Limpar DOM caches também
        MirrorTemplateWidget.domCache.clear();
        MirrorTemplateWidget.lastRenderedContent.clear();
        
        // Reconstruir decorations
        const newDecorations = buildDecorations(tr.state, newMirrorState, plugin);
        
        return {
            mirrorState: newMirrorState,
            decorations: newDecorations
        };
    }
    
    // 9. Verificar se a configuração mudou (caminho normal, não-forçado)
    const config = getApplicableConfig(plugin, file, newFrontmatter);
    
    const enabledChanged = value.enabled !== !!config;
    const positionChanged = value.config?.position !== config?.position;
    const templateChanged = value.config?.templatePath !== config?.templatePath;
    const hidePropsChanged = value.config?.hideProps !== config?.hideProps;
    
    // 10. Só criar novo widget se realmente necessário
    if (enabledChanged || positionChanged || templateChanged || hidePropsChanged) {
        console.log(`[MirrorNotes] Creating new widget - enabled:${enabledChanged}, pos:${positionChanged}, template:${templateChanged}, hideProps:${hidePropsChanged}`);
        
        // Limpar cache apenas se for mudança significativa
        if (enabledChanged || positionChanged || templateChanged) {
          const fileWidgets = Array.from(widgetInstanceCache.keys()).filter(key => key.includes(value.widgetId));
          fileWidgets.forEach(key => {
            widgetInstanceCache.delete(key);
          });
        }
        
        const newMirrorState = {
            enabled: !!config,
            config: config,
            frontmatter: newFrontmatter,
            frontmatterHash: newFrontmatterHash,
            widgetId: positionChanged ? generateWidgetId() : value.widgetId, // Novo ID apenas se posição mudou
            lastDocText: docText
        };
        
        // Reconstruir decorations
        const newDecorations = buildDecorations(tr.state, newMirrorState, plugin);
        
        return {
            mirrorState: newMirrorState,
            decorations: newDecorations
        };
    }
    
    // 11. Apenas frontmatter mudou, manter mesmo widget mas atualizar dados
    const newMirrorState = {
        ...value,
        frontmatter: newFrontmatter,
        frontmatterHash: newFrontmatterHash,
        lastDocText: docText
    };
    
    return {
        mirrorState: newMirrorState,
        decorations
    };
  },
  
  // 🔥 NOVO: Fornecer decorations via facet (como o CodeMarker faz)
  provide: field => EditorView.decorations.from(field, state => state.decorations)
});

// =================================================================================
// BUILD DECORATIONS (movido para função separada)
// =================================================================================
function buildDecorations(state: EditorState, mirrorState: MirrorState, plugin: MirrorUIPlugin): DecorationSet {
  const { enabled, config, widgetId, frontmatterHash } = mirrorState;

  if (!enabled || !config) {
    return Decoration.none;
  }

  console.log(`[MirrorNotes] Building decorations for position: ${config.position}`);

  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  const docLength = doc.length;
  
  // Encontrar posição do frontmatter
  let frontmatterEndPos = 0;
  let frontmatterEndLine = 0;
  let hasFrontmatter = false;
  
  const firstLine = doc.line(1);
  if (firstLine.text === '---') {
    hasFrontmatter = true;
    for (let i = 2; i <= doc.lines; i++) {
      const line = doc.line(i);
      if (line.text === '---') {
        frontmatterEndLine = i;
        frontmatterEndPos = line.to + 1;
        break;
      }
    }
  }
  
  try {
    // Reutilizar widget existente baseado no widgetId
    let widget = widgetInstanceCache.get(widgetId);
    if (!widget) {
      widget = new MirrorTemplateWidget(plugin, mirrorState, config, widgetId);
      widgetInstanceCache.set(widgetId, widget);
    }
    
    if (config.position === 'top') {
      const topPos = Math.min(frontmatterEndPos, docLength);
      
      builder.add(
        topPos,
        topPos,
        Decoration.widget({
          widget: widget,
          block: true,
          side: 0
        })
      );
      
    } else if (config.position === 'bottom') {
      // 🔥 Para bottom: sempre inserir no final absoluto
      builder.add(
        docLength,
        docLength,
        Decoration.widget({
          widget: widget,
          block: true,
          side: 1 // Widget aparece DEPOIS da posição
        })
      );
    }
    
    // Esconder propriedades se configurado
    if (config.hideProps && hasFrontmatter && frontmatterEndLine > 0) {
      for (let lineNum = 1; lineNum <= frontmatterEndLine && lineNum <= doc.lines; lineNum++) {
        const line = doc.line(lineNum);
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: { style: 'display: none;' }
          })
        );
      }
    }
    
  } catch (e) {
    console.error('[MirrorNotes] Error building decorations:', e);
    return Decoration.none;
  }

  return builder.finish();
}

// =================================================================================
// HELPERS
// =================================================================================
function parseFrontmatter(content: string): any {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  try {
    const yaml = match[1];
    const result: any = {};
    
    yaml.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) {
          result[key] = value.replace(/^[\"']|[\"']$/g, '');
        }
      }
    });
    
    return result;
  } catch (e) {
    return {};
  }
}

function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function generateWidgetId(): string {
  return `mirror-widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Limpar caches quando módulo for descarregado
if ((window as any).mirrorUICleanup) {
  (window as any).mirrorUICleanup();
}

(window as any).mirrorUICleanup = () => {
  widgetInstanceCache.clear();
  MirrorTemplateWidget.domCache.clear();
  MirrorTemplateWidget.lastRenderedContent.clear();
  fileDebounceMap.clear();
  lastForcedUpdateMap.clear();
};