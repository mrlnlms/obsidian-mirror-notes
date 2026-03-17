import MirrorUIPlugin from "../../main";
import { TFile } from "obsidian";
import { ApplicableMirrorConfig, MirrorPosition } from "./mirrorTypes";
import { hashObject } from "./mirrorUtils";
import { Condition, ConditionLogic, CustomMirror, DEFAULT_VIEW_OVERRIDES } from "../settings/types";
import { Logger } from '../dev/logger';

// =================================================================================
// CACHE + INDEX
// =================================================================================

// Cache de config por arquivo (ativado v27)
const configCache = new Map<string, { config: ApplicableMirrorConfig | null, frontmatterHash: string }>();

export function clearConfigCache(): void {
  configCache.clear();
}

// =================================================================================
// CONDITION EVALUATION
// =================================================================================

export function evaluateCondition(
  condition: Condition,
  file: TFile,
  frontmatter: any
): boolean {
  let result = false;
  switch (condition.type) {
    case 'file':
      result = file.path === condition.fileName || file.name === condition.fileName;
      break;
    case 'folder': {
      // Ensure trailing slash to prevent "projects" matching "projects-archive/"
      const folder = condition.folderPath?.endsWith('/') ? condition.folderPath : condition.folderPath + '/';
      result = !!condition.folderPath && file.path.startsWith(folder);
      break;
    }
    case 'property': {
      if (!condition.propertyName) break;
      const val = frontmatter?.[condition.propertyName];
      if (val === undefined) break;
      if (!condition.propertyValue) { result = true; break; }
      if (val === condition.propertyValue) { result = true; break; }
      if (typeof val === 'boolean') { result = String(val) === condition.propertyValue; break; }
      if (Array.isArray(val)) { result = val.some((item: any) => String(item) === condition.propertyValue); break; }
      result = String(val) === condition.propertyValue;
      break;
    }
  }
  return condition.negated ? !result : result;
}

export function evaluateConditions(
  conditions: Condition[],
  logic: ConditionLogic,
  file: TFile,
  frontmatter: any
): boolean {
  if (conditions.length === 0) return false;
  const check = (c: Condition) => evaluateCondition(c, file, frontmatter);
  return logic === 'all' ? conditions.every(check) : conditions.some(check);
}

// =================================================================================
// MATCHING
// =================================================================================

function configFromMirror(mirror: CustomMirror, viewMode?: string): ApplicableMirrorConfig {
  const isPreview = viewMode === 'preview';
  const usePreview = isPreview && mirror.enable_custom_preview_mode && !!mirror.custom_settings_preview_note;
  const viewOverrides = mirror.custom_view_overrides ?? { ...DEFAULT_VIEW_OVERRIDES };
  return {
    templatePath: usePreview ? mirror.custom_settings_preview_note : mirror.custom_settings_live_preview_note,
    position: (usePreview ? mirror.custom_settings_preview_pos : mirror.custom_settings_live_preview_pos) as MirrorPosition,
    hideProps: viewOverrides.hideProps,
    showContainer: mirror.custom_show_container_border,
    viewOverrides,
  };
}

// Função para determinar a configuração aplicável para a nota atual
export function getApplicableConfig(
  plugin: MirrorUIPlugin,
  file: TFile | null,
  frontmatter: any,
  viewId?: string,
  viewMode?: string
): ApplicableMirrorConfig | null {
  if (!file) return null;

  // Cache hit: se frontmatter nao mudou, retornar config cacheada
  // Cache key inclui viewMode — LP e RV podem ter templates diferentes
  const fmHash = hashObject(frontmatter);
  const cacheKey = `${file.path}:${viewMode ?? 'source'}`;
  const cached = configCache.get(cacheKey);
  if (cached && cached.frontmatterHash === fmHash) {
    return cached.config;
  }

  const settings = plugin.settings;

  // 1. Encontrar custom mirror aplicavel via conditions
  let matchedMirror: CustomMirror | null = null;

  const isPreviewMode = viewMode === 'preview';
  for (const mirror of settings.customMirrors) {
    // Mirror so matcha se tem template pro modo atual — sem fallback entre modos
    const hasLP = mirror.enable_custom_live_preview_mode && !!mirror.custom_settings_live_preview_note;
    const hasRV = mirror.enable_custom_preview_mode && !!mirror.custom_settings_preview_note;
    if (isPreviewMode ? !hasRV : !hasLP) continue;
    if (mirror.conditions.length === 0) continue;
    if (evaluateConditions(mirror.conditions, mirror.conditionLogic, file, frontmatter)) {
      matchedMirror = mirror;
      break;
    }
  }

  // 2. Verificar se global mirror está ativo pro modo atual — sem fallback entre modos
  const globalHasLP = settings.enable_global_live_preview_mode && !!settings.global_settings_live_preview_note;
  const globalHasRV = settings.enable_global_preview_mode && !!settings.global_settings_preview_note;
  const globalMirrorActive = settings.global_settings && (isPreviewMode ? globalHasRV : globalHasLP);

  // 3. LÓGICA DE PRIORIDADE (sem iteracao duplicada — matchedMirror ja tem a referencia)
  let result: ApplicableMirrorConfig | null = null;

  if (matchedMirror) {
    if (!globalMirrorActive || !settings.global_settings_overide) {
      // Global desabilitado OU sem "Replace custom Mirrors" → Custom sempre vence
      result = configFromMirror(matchedMirror, viewMode);
    } else if (matchedMirror.custom_settings_overide) {
      // Global ativo COM override, mas custom tambem tem override → Custom vence
      result = configFromMirror(matchedMirror, viewMode);
    }
    // else: global ativo com override e custom sem override → cai pro global abaixo
  }

  // 4. Se chegou aqui sem result, aplicar global mirror (se ativo)
  if (!result && globalMirrorActive) {
    Logger.log(`Global mirror applied to: ${file.path}, frontmatter:`, frontmatter);
    const isPreview = viewMode === 'preview';
    const useGlobalPreview = isPreview && globalHasRV;
    const globalOverrides = settings.global_view_overrides ?? { ...DEFAULT_VIEW_OVERRIDES };
    result = {
      templatePath: useGlobalPreview ? settings.global_settings_preview_note : settings.global_settings_live_preview_note,
      position: (useGlobalPreview ? settings.global_settings_preview_pos : settings.global_settings_live_preview_pos) as MirrorPosition,
      hideProps: globalOverrides.hideProps,
      showContainer: settings.global_show_container_border,
      viewOverrides: globalOverrides,
    };
  }

  if (!result) {
    Logger.log(`No mirror applied to: ${file.path}, globalActive: ${globalMirrorActive}`);
  }

  // Cachear config base (sem override — override e estado runtime, nao deve poluir cache)
  configCache.set(cacheKey, { config: result, frontmatterHash: fmHash });

  // Apply position override (DOM fallback → CM6) — depois do cache
  // Key includes viewId when available (per-view override isolation)
  const overrideKey = viewId ? `${viewId}:${file.path}` : file.path;
  if (result && plugin.positionOverrides.has(overrideKey)) {
    const override = plugin.positionOverrides.get(overrideKey)!;
    Logger.log(`Applying position override for ${file.path} [${viewId ?? 'no-view'}]: ${result.position} → ${override}`);
    result = { ...result, position: override };
  }

  return result;
}
