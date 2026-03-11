import { StateField, StateEffect, EditorState, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import MirrorUIPlugin from '../../main';
import { ApplicableMirrorConfig, MirrorState, MirrorFieldState } from "./mirrorTypes";
import { MirrorTemplateWidget } from "./mirrorWidget";
import { clearRenderCache } from "../rendering/templateRenderer";
import { buildDecorations, cleanOrphanWidgets } from "./mirrorDecorations";
import { getApplicableConfig } from "./mirrorConfig";
import { parseFrontmatter, hashObject, generateWidgetId } from "./mirrorUtils";
import { Logger } from '../logger';

// =================================================================================
// INTERFACES E TIPOS
// =================================================================================

// Effects
export const updateTemplateEffect = StateEffect.define<{templatePath: string}>();
export const toggleWidgetEffect = StateEffect.define<boolean>();
export const forceMirrorUpdateEffect = StateEffect.define<void>();
// widgetRecoveryEffect — desabilitado (v25.2), ver mirrorViewPlugin.ts
// export const widgetRecoveryEffect = StateEffect.define<void>();

// Cache de config por arquivo
const configCache = new Map<string, { config: ApplicableMirrorConfig | null, frontmatterHash: string }>();

// =================================================================================
// STATE FIELD
// =================================================================================
let lastUpdateTime = 0;
const UPDATE_DEBOUNCE = 500; // Aumentado para 500ms - mais conservador
const fileDebounceMap = new Map<string, number>(); // Debounce por arquivo
const lastForcedUpdateMap = new Map<string, number>(); // Track forced updates por arquivo

// 🔥 NOVO: StateField para rastrear decorations separadamente (inspirado no CodeMarker)
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

    // Recovery desabilitado (v25.2) — fix de decoration mapping resolve o problema
    // Ver mirrorViewPlugin.ts para referencia da implementacao original

    const plugin = (window as any).mirrorUIPluginInstance as MirrorUIPlugin;

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

    const file = plugin?.app.workspace.getActiveFile();
    const filePath = file?.path || 'unknown';
    const docText = tr.state.doc.toString();
    const now = Date.now();

    // 3. Se foi um forced update, verificar se é muito frequente
    if (forcedUpdate) {
        const lastForcedUpdate = lastForcedUpdateMap.get(filePath) || 0;
        if (now - lastForcedUpdate < 1000) { // Não aceitar forced updates mais de 1x por segundo
            Logger.log(`Forced update ignored - too frequent (${now - lastForcedUpdate}ms ago)`);
            return { mirrorState: value, decorations };
        }
        lastForcedUpdateMap.set(filePath, now);
    }

    // 5. Debounce específico por arquivo (mais agressivo)
    const lastFileUpdate = fileDebounceMap.get(filePath) || 0;
    if (!forcedUpdate && now - lastFileUpdate < UPDATE_DEBOUNCE) {
        return { mirrorState: value, decorations };
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
        // Recarregar configuração
        const freshConfig = getApplicableConfig(plugin, file, newFrontmatter || value.frontmatter);

        // Verificar se a config realmente mudou (template, position, hideProps, enabled)
        const configChanged =
            (!!freshConfig) !== value.enabled ||
            freshConfig?.position !== value.config?.position ||
            freshConfig?.templatePath !== value.config?.templatePath ||
            freshConfig?.hideProps !== value.config?.hideProps;

        if (!configChanged) {
            // Config não mudou — só frontmatter values mudaram (ex: meta-bind editou YAML)
            // NÃO recriar widget, só atualizar dados internos
            Logger.log('Forced update — config unchanged, keeping widget alive');
            const newMirrorState = {
                ...value,
                frontmatter: newFrontmatter || value.frontmatter,
                frontmatterHash: newFrontmatterHash || value.frontmatterHash,
                lastDocText: docText
            };
            return { mirrorState: newMirrorState, decorations };
        }

        // Config mudou de verdade — recriar widget
        Logger.log('Forced update — config changed, recreating widget', {
            oldPosition: value.config?.position,
            newPosition: freshConfig?.position,
            oldTemplate: value.config?.templatePath,
            newTemplate: freshConfig?.templatePath
        });

        const newMirrorState = {
            enabled: !!freshConfig,
            config: freshConfig,
            frontmatter: newFrontmatter || value.frontmatter,
            frontmatterHash: newFrontmatterHash || value.frontmatterHash,
            widgetId: generateWidgetId(),
            lastDocText: docText
        };

        // Limpar cache do widget antigo
        const fileWidgets = Array.from(MirrorTemplateWidget.widgetInstanceCache.keys()).filter(key => key.includes(value.widgetId));
        fileWidgets.forEach(key => {
            MirrorTemplateWidget.widgetInstanceCache.delete(key);
        });

        // Limpar DOM caches também
        MirrorTemplateWidget.domCache.clear();
        clearRenderCache();

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
        Logger.log(`Creating new widget - enabled:${enabledChanged}, pos:${positionChanged}, template:${templateChanged}, hideProps:${hidePropsChanged}`);
        
        // Limpar cache apenas se for mudança significativa
        if (enabledChanged || positionChanged || templateChanged) {
          const fileWidgets = Array.from(MirrorTemplateWidget.widgetInstanceCache.keys()).filter(key => key.includes(value.widgetId));
          fileWidgets.forEach(key => {
            MirrorTemplateWidget.widgetInstanceCache.delete(key);
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
// CLEANUP
// =================================================================================
if ((window as any).mirrorUICleanup) {
  (window as any).mirrorUICleanup();
}

(window as any).mirrorUICleanup = () => {
  MirrorTemplateWidget.widgetInstanceCache.clear();
  MirrorTemplateWidget.domCache.clear();
  clearRenderCache();
  fileDebounceMap.clear();
  lastForcedUpdateMap.clear();
};