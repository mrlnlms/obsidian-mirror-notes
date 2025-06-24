import { StateField, StateEffect, EditorState, RangeSetBuilder, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import MirrorUIPlugin from '../../main';
import { TFile, MarkdownRenderer } from 'obsidian';
import { CustomMirror } from '../../settings';

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
  lastDocText?: string; // Cache do texto do documento para detectar mudanças reais
}

// Effects
export const updateTemplateEffect = StateEffect.define<{templatePath: string}>();
export const toggleWidgetEffect = StateEffect.define<boolean>();
export const forceMirrorUpdateEffect = StateEffect.define<void>();

// Cache global para evitar recriação
const widgetInstanceCache = new Map<string, MirrorTemplateWidget>();

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
// WIDGETS
// =================================================================================
class BottomSpacerWidget extends WidgetType {
  toDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'mirror-bottom-spacer';
    div.style.cssText = `
      height: 30px;
      width: 100%;
      display: block;
      clear: both;
      user-select: none;
      pointer-events: none;
    `;
    return div;
  }
  
  eq(other: WidgetType): boolean {
    return other instanceof BottomSpacerWidget;
  }
}

export class MirrorTemplateWidget extends WidgetType {
  public static domCache = new Map<string, HTMLElement>();
  public static lastRenderedContent = new Map<string, string>();
  
  constructor(
    private plugin: MirrorUIPlugin,
    private state: any,
    private config: ApplicableMirrorConfig,
    private widgetId: string
  ) {
    super();
  }

  getCacheKey(): string {
    return `${this.widgetId}-${this.config.position}`;
  }

  toDOM(view: EditorView): HTMLElement {
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
      
      // Verificar se o conteúdo mudou
      const cacheKey = this.getCacheKey();
      const lastContent = MirrorTemplateWidget.lastRenderedContent.get(cacheKey);
      
      if (lastContent === processedContent) {
        return; // Conteúdo não mudou, não re-renderizar
      }
      
      // Atualizar cache
      MirrorTemplateWidget.lastRenderedContent.set(cacheKey, processedContent);
      
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

  eq(other: WidgetType): boolean {
    if (!(other instanceof MirrorTemplateWidget)) return false;
    
    const otherWidget = other as MirrorTemplateWidget;
    // Widgets são iguais se têm o mesmo ID
    return this.widgetId === otherWidget.widgetId;
  }
  
  destroy() {
    // Limpar cache quando widget for destruído
    const cacheKey = this.getCacheKey();
    MirrorTemplateWidget.domCache.delete(cacheKey);
    MirrorTemplateWidget.lastRenderedContent.delete(cacheKey);
  }
}

// =================================================================================
// STATE FIELD
// =================================================================================
let lastUpdateTime = 0;
const UPDATE_DEBOUNCE = 50; // 50ms debounce

export const mirrorStateField = StateField.define<MirrorState>({
  create(state: EditorState): MirrorState {
    const plugin = (window as any).mirrorUIPluginInstance as MirrorUIPlugin;
    const file = plugin?.app.workspace.getActiveFile();
    const frontmatter = parseFrontmatter(state.doc.toString());
    const config = getApplicableConfig(plugin, file, frontmatter);

    return {
      enabled: !!config,
      config: config,
      frontmatter: frontmatter,
      widgetId: generateWidgetId(),
      lastDocText: state.doc.toString()
    };
  },

  update(value: MirrorState, tr: Transaction): MirrorState {
    // 1. Verificar se foi um update forçado
    for (const effect of tr.effects) {
        if (effect.is(forceMirrorUpdateEffect)) {
            const plugin = (window as any).mirrorUIPluginInstance as MirrorUIPlugin;
            const file = plugin?.app.workspace.getActiveFile();
            const cache = file ? plugin?.app.metadataCache.getFileCache(file) : null;
            const newFrontmatter = cache?.frontmatter || parseFrontmatter(tr.state.doc.toString());
            const config = getApplicableConfig(plugin, file, newFrontmatter);
            
            console.log(`[MirrorNotes] Forced update - creating new widget`);
            
            // Limpar caches ao forçar update
            widgetInstanceCache.clear();
            MirrorTemplateWidget.domCache.clear();
            MirrorTemplateWidget.lastRenderedContent.clear();
            
            return {
                enabled: !!config,
                config: config,
                frontmatter: newFrontmatter,
                widgetId: generateWidgetId(),
                lastDocText: tr.state.doc.toString()
            };
        }
    }

    // 2. Se o documento não mudou, manter estado
    if (!tr.docChanged) {
        return value;
    }

    // Debounce para evitar muitas atualizações
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_DEBOUNCE) {
        return value;
    }
    lastUpdateTime = now;

    const docText = tr.state.doc.toString();
    
    // 3. Verificar rapidamente se a mudança pode afetar o widget
    let possibleFrontmatterChange = false;
    tr.changes.iterChangedRanges((fromA, toA) => {
        // Se mudança nas primeiras 20 linhas, pode ser frontmatter
        if (fromA < 500) { // ~20 linhas
            possibleFrontmatterChange = true;
        }
    });
    
    if (!possibleFrontmatterChange) {
        // Mudança muito abaixo, não pode afetar frontmatter
        return { ...value, lastDocText: docText };
    }
    
    // 4. Verificar se o conteúdo realmente mudou (não apenas posição do cursor)
    if (docText === value.lastDocText) {
        return value;
    }

    // 5. Verificar se a mudança afeta o frontmatter
    const frontmatterMatch = docText.match(/^---\n[\s\S]*?\n---/);
    
    if (!frontmatterMatch) {
        // Sem frontmatter, apenas atualizar lastDocText
        return { ...value, lastDocText: docText };
    }
    
    // Verificar se alguma mudança tocou a região do frontmatter
    let changeInFrontmatter = false;
    tr.changes.iterChangedRanges((fromA, toA) => {
        if (fromA < frontmatterMatch[0].length) {
            changeInFrontmatter = true;
        }
    });
    
    if (!changeInFrontmatter) {
        // Mudança fora do frontmatter, apenas atualizar lastDocText
        return { ...value, lastDocText: docText };
    }
    
    // 6. Frontmatter pode ter mudado, verificar
    const newFrontmatter = parseFrontmatter(docText);
    if (JSON.stringify(newFrontmatter) === JSON.stringify(value.frontmatter)) {
        // Frontmatter não mudou realmente
        return { ...value, lastDocText: docText };
    }
    
    // 7. Verificar se a configuração mudou
    const plugin = (window as any).mirrorUIPluginInstance as MirrorUIPlugin;
    const file = plugin?.app.workspace.getActiveFile();
    const config = getApplicableConfig(plugin, file, newFrontmatter);
    
    const enabledChanged = value.enabled !== !!config;
    const positionChanged = value.config?.position !== config?.position;
    const templateChanged = value.config?.templatePath !== config?.templatePath;
    const hidePropsChanged = value.config?.hideProps !== config?.hideProps;
    
    if (enabledChanged || positionChanged || templateChanged || hidePropsChanged) {
        console.log(`[MirrorNotes] Config changed - creating new widget`);
        
        // Limpar cache ao mudar configuração
        widgetInstanceCache.clear();
        MirrorTemplateWidget.domCache.clear();
        MirrorTemplateWidget.lastRenderedContent.clear();
        
        return {
            enabled: !!config,
            config: config,
            frontmatter: newFrontmatter,
            widgetId: generateWidgetId(),
            lastDocText: docText
        };
    }
    
    // 8. Apenas frontmatter mudou, manter mesmo widget
    return {
        ...value,
        frontmatter: newFrontmatter,
        lastDocText: docText
    };
  }
});

// =================================================================================
// DECORATIONS com cache agressivo
// =================================================================================
let lastWidgetId: string | null = null;
let lastDecorations: DecorationSet | null = null;

export const mirrorDecorations = EditorView.decorations.compute([mirrorStateField], state => {
  const { enabled, config, widgetId } = state.field(mirrorStateField);

  if (!enabled || !config) {
    // Limpar cache se desabilitado
    lastWidgetId = null;
    lastDecorations = null;
    return Decoration.none;
  }

  // Se o widgetId não mudou, retornar decorações em cache
  if (widgetId === lastWidgetId && lastDecorations) {
    return lastDecorations;
  }
  
  console.log(`[MirrorNotes] Building new decorations for widget: ${widgetId}`);

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

  const plugin = (window as any).mirrorUIPluginInstance;
  
  try {
    // Criar ou reutilizar widget
    let widget = widgetInstanceCache.get(widgetId);
    if (!widget) {
      widget = new MirrorTemplateWidget(plugin, state.field(mirrorStateField), config, widgetId);
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
      // Adicionar espaçador
      builder.add(
        docLength,
        docLength,
        Decoration.widget({
          widget: new BottomSpacerWidget(),
          side: 1,
          block: true
        })
      );
      
      // Adicionar widget principal
      builder.add(
        docLength,
        docLength,
        Decoration.widget({
          widget: widget,
          block: true,
          side: 1
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

  const decorations = builder.finish();
  
  // Guardar no cache
  lastWidgetId = widgetId;
  lastDecorations = decorations;
  
  return decorations;
});

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
};