import { StateField, StateEffect, EditorState, Transaction, Facet } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import MirrorUIPlugin from '../../main';
import { MirrorFieldState, MirrorState } from "./mirrorTypes";
import { MirrorTemplateWidget } from "./mirrorWidget";
import { clearRenderCache } from "../rendering/templateRenderer";
import { buildDecorations } from "./decorationBuilder";
import { getApplicableConfig, clearConfigCache } from "./mirrorConfig";
import { TIMING } from "./timingConfig";
import { extractRawYaml, hashObject, generateWidgetId } from "./mirrorUtils";
import { TFile } from "obsidian";
import { Logger } from '../logger';

// =================================================================================
// INTERFACES E TIPOS
// =================================================================================

export const mirrorPluginFacet = Facet.define<MirrorUIPlugin, MirrorUIPlugin | null>({
  combine: values => values[0] ?? null
});

/** Facet que armazena o filePath do arquivo deste editor (setado por setupEditor) */
export const filePathFacet = Facet.define<string, string>({
  combine: values => values[0] ?? ''
});

// Effects
export const updateTemplateEffect = StateEffect.define<{templatePath: string}>();
export const toggleWidgetEffect = StateEffect.define<boolean>();
export const forceMirrorUpdateEffect = StateEffect.define<void>();

// =================================================================================
// STATE FIELD — HELPERS
// =================================================================================
/** Busca frontmatter do metadataCache do Obsidian (fonte unica de verdade) */
function getMetadataCacheFrontmatter(plugin: MirrorUIPlugin, filePath: string): Record<string, any> {
  const file = plugin.app.vault.getAbstractFileByPath(filePath);
  if (!file || !(file instanceof TFile)) return {};
  return plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
}

const fileDebounceMap = new Map<string, number>();
const lastForcedUpdateMap = new Map<string, number>();

/** Check if a forced update was requested in this transaction */
function hasForcedUpdate(tr: Transaction): boolean {
  for (const effect of tr.effects) {
    if (effect.is(forceMirrorUpdateEffect)) return true;
  }
  return false;
}

/** Detect if any change in the transaction touches the frontmatter region */
function detectFrontmatterChange(tr: Transaction, docText: string): boolean {
  let frontmatterEndPos = 0;
  const frontmatterMatch = docText.match(/^---\n[\s\S]*?\n---/);
  if (frontmatterMatch) {
    frontmatterEndPos = frontmatterMatch[0].length;
  }

  let changeInFrontmatterRegion = false;
  tr.changes.iterChangedRanges((fromA, _toA) => {
    if (fromA <= frontmatterEndPos + 50) {
      changeInFrontmatterRegion = true;
    }
  });
  return changeInFrontmatterRegion;
}

/** Handle a forced update: invalidate cache, compare configs, rebuild if needed */
function handleForcedUpdate(
  tr: Transaction,
  value: MirrorState,
  decorations: any,
  plugin: MirrorUIPlugin,
  file: any,
  docText: string,
  newFrontmatter: Record<string, any>,
  newFrontmatterHash: string
): MirrorFieldState {
  clearConfigCache();
  const freshConfig = getApplicableConfig(plugin, file, newFrontmatter || value.frontmatter);

  const configChanged =
    (!!freshConfig) !== value.enabled ||
    freshConfig?.position !== value.config?.position ||
    freshConfig?.templatePath !== value.config?.templatePath ||
    freshConfig?.hideProps !== value.config?.hideProps ||
    freshConfig?.showContainer !== value.config?.showContainer ||
    freshConfig?.viewOverrides?.readableLineLength !== value.config?.viewOverrides?.readableLineLength ||
    freshConfig?.viewOverrides?.showInlineTitle !== value.config?.viewOverrides?.showInlineTitle;

  if (!configChanged) {
    Logger.log('Forced update — config unchanged, rebuilding with fresh content');
    // Limpar caches deste widget pra forcar re-render (ex: template content mudou)
    const oldCacheKey = `${value.widgetId}-${value.config?.position}`;
    clearRenderCache(oldCacheKey);
    MirrorTemplateWidget.domCache.delete(oldCacheKey);
    const newWidgetId = generateWidgetId();
    clearWidgetCaches(value.widgetId);

    const newState: MirrorState = {
      ...value,
      frontmatter: newFrontmatter || value.frontmatter,
      frontmatterHash: newFrontmatterHash || value.frontmatterHash,
      widgetId: newWidgetId,
      lastDocText: docText
    };

    return {
      mirrorState: newState,
      decorations: buildDecorations(tr.state, newState, plugin)
    };
  }

  Logger.log('Forced update — config changed, recreating widget', {
    oldPosition: value.config?.position,
    newPosition: freshConfig?.position,
    oldTemplate: value.config?.templatePath,
    newTemplate: freshConfig?.templatePath
  });

  const newMirrorState: MirrorState = {
    enabled: !!freshConfig,
    config: freshConfig,
    frontmatter: newFrontmatter || value.frontmatter,
    frontmatterHash: newFrontmatterHash || value.frontmatterHash,
    widgetId: generateWidgetId(),
    filePath: value.filePath,
    lastDocText: docText
  };

  clearWidgetCaches(value.widgetId);
  const oldCacheKey = `${value.widgetId}-${value.config?.position}`;
  MirrorTemplateWidget.domCache.delete(oldCacheKey);
  clearRenderCache(oldCacheKey);

  return {
    mirrorState: newMirrorState,
    decorations: buildDecorations(tr.state, newMirrorState, plugin)
  };
}

/** Handle normal (non-forced) config change */
function handleConfigChange(
  tr: Transaction,
  value: MirrorState,
  plugin: MirrorUIPlugin,
  file: any,
  docText: string,
  newFrontmatter: Record<string, any>,
  newFrontmatterHash: string
): MirrorFieldState | null {
  const config = getApplicableConfig(plugin, file, newFrontmatter);

  const enabledChanged = value.enabled !== !!config;
  const positionChanged = value.config?.position !== config?.position;
  const templateChanged = value.config?.templatePath !== config?.templatePath;
  const hidePropsChanged = value.config?.hideProps !== config?.hideProps;
  const containerChanged = value.config?.showContainer !== config?.showContainer;
  const overridesChanged =
    value.config?.viewOverrides?.readableLineLength !== config?.viewOverrides?.readableLineLength ||
    value.config?.viewOverrides?.showInlineTitle !== config?.viewOverrides?.showInlineTitle;

  if (!enabledChanged && !positionChanged && !templateChanged && !hidePropsChanged && !containerChanged && !overridesChanged) {
    return null; // No config change
  }

  Logger.log(`Creating new widget - enabled:${enabledChanged}, pos:${positionChanged}, template:${templateChanged}, hideProps:${hidePropsChanged}, container:${containerChanged}, overrides:${overridesChanged}`);

  if (enabledChanged || positionChanged || templateChanged) {
    clearWidgetCaches(value.widgetId);
  }

  const newMirrorState: MirrorState = {
    enabled: !!config,
    config: config,
    frontmatter: newFrontmatter,
    frontmatterHash: newFrontmatterHash,
    widgetId: positionChanged ? generateWidgetId() : value.widgetId,
    filePath: value.filePath,
    lastDocText: docText
  };

  return {
    mirrorState: newMirrorState,
    decorations: buildDecorations(tr.state, newMirrorState, plugin)
  };
}

/** Clear widget instance cache entries for a specific widgetId */
function clearWidgetCaches(widgetId: string): void {
  const fileWidgets = Array.from(MirrorTemplateWidget.widgetInstanceCache.keys())
    .filter(key => key.includes(widgetId));
  fileWidgets.forEach(key => {
    MirrorTemplateWidget.widgetInstanceCache.delete(key);
  });
}

// =================================================================================
// STATE FIELD
// =================================================================================

export const mirrorStateField = StateField.define<MirrorFieldState>({
  create(state: EditorState): MirrorFieldState {
    const plugin = state.facet(mirrorPluginFacet)!;
    const filePath = state.facet(filePathFacet);
    const file = filePath ? plugin?.app.vault.getAbstractFileByPath(filePath) as any : null;
    const frontmatterHash = hashObject(extractRawYaml(state.doc.toString()));
    const frontmatter = filePath ? getMetadataCacheFrontmatter(plugin, filePath) : {};
    const config = getApplicableConfig(plugin, file, frontmatter);

    const mirrorState: MirrorState = {
      enabled: !!config,
      config: config,
      frontmatter: frontmatter,
      frontmatterHash: frontmatterHash,
      widgetId: generateWidgetId(),
      filePath: filePath,
      lastDocText: state.doc.toString()
    };

    return {
      mirrorState,
      decorations: buildDecorations(state, mirrorState, plugin)
    };
  },

  update(fieldState: MirrorFieldState, tr: Transaction): MirrorFieldState {
    const { mirrorState: value } = fieldState;
    const decorations = fieldState.decorations.map(tr.changes);

    const plugin = tr.state.facet(mirrorPluginFacet)!;
    const forcedUpdate = hasForcedUpdate(tr);

    // If nothing changed and not forced, keep state
    if (!tr.docChanged && !forcedUpdate) {
      return fieldState;
    }

    // Usar filePath armazenado no state — getActiveFile() retorna o painel ativo,
    // que pode ser outro arquivo (ex: template sendo editado em outro painel)
    const file = plugin?.app.vault.getAbstractFileByPath(value.filePath) as any;
    const filePath = value.filePath || 'unknown';
    const docText = tr.state.doc.toString();
    const now = Date.now();

    // Throttle forced updates (max 1/sec)
    if (forcedUpdate) {
      const lastForcedUpdate = lastForcedUpdateMap.get(filePath) || 0;
      if (now - lastForcedUpdate < TIMING.FORCED_UPDATE_THROTTLE) {
        Logger.log(`Forced update ignored - too frequent (${now - lastForcedUpdate}ms ago)`);
        return { mirrorState: value, decorations };
      }
      lastForcedUpdateMap.set(filePath, now);
    }

    // Per-file debounce
    const lastFileUpdate = fileDebounceMap.get(filePath) || 0;
    if (!forcedUpdate && now - lastFileUpdate < TIMING.UPDATE_DEBOUNCE) {
      return { mirrorState: value, decorations };
    }

    // Skip if change is outside frontmatter region
    if (tr.docChanged && !forcedUpdate) {
      if (!detectFrontmatterChange(tr, docText)) {
        return { mirrorState: { ...value, lastDocText: docText }, decorations };
      }
    }

    // Check if frontmatter actually changed (hash da string YAML bruta)
    const newFrontmatterHash = hashObject(extractRawYaml(docText));

    if (newFrontmatterHash === value.frontmatterHash && !forcedUpdate) {
      return { mirrorState: { ...value, lastDocText: docText }, decorations };
    }

    // Valores do frontmatter via metadataCache (fonte unica de verdade)
    const newFrontmatter = getMetadataCacheFrontmatter(plugin, filePath);

    fileDebounceMap.set(filePath, now);

    // Forced update path
    if (forcedUpdate) {
      return handleForcedUpdate(tr, value, decorations, plugin, file, docText, newFrontmatter, newFrontmatterHash);
    }

    // Normal path: check if config changed
    const configResult = handleConfigChange(tr, value, plugin, file, docText, newFrontmatter, newFrontmatterHash);
    if (configResult) {
      return configResult;
    }

    // Frontmatter values changed — rebuild decorations pra widget receber dados frescos
    const updatedState: MirrorState = {
      ...value,
      frontmatter: newFrontmatter,
      frontmatterHash: newFrontmatterHash,
      lastDocText: docText
    };

    return {
      mirrorState: updatedState,
      decorations: buildDecorations(tr.state, updatedState, plugin)
    };
  },

  provide: field => EditorView.decorations.from(field, state => state.decorations)
});

// =================================================================================
// CLEANUP
// =================================================================================
export function cleanupMirrorCaches() {
  MirrorTemplateWidget.widgetInstanceCache.clear();
  MirrorTemplateWidget.domCache.clear();
  clearRenderCache();
  fileDebounceMap.clear();
  lastForcedUpdateMap.clear();
}
