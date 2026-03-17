import MirrorUIPlugin from "../../main";
import { TFile } from "obsidian";
import { ApplicableMirrorConfig, MirrorPosition } from "./mirrorTypes";
import { hashObject } from "./mirrorUtils";
import { Condition, ConditionLogic, CustomMirror, MirrorUIPluginSettings, DEFAULT_VIEW_OVERRIDES, ViewOverrides } from "../settings/types";
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
    case 'folder':
      result = !!condition.folderPath && file.path.startsWith(condition.folderPath);
      break;
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

function configFromMirror(mirror: CustomMirror): ApplicableMirrorConfig {
  const viewOverrides = mirror.custom_view_overrides ?? { ...DEFAULT_VIEW_OVERRIDES };
  return {
    templatePath: mirror.custom_settings_live_preview_note,
    position: mirror.custom_settings_live_preview_pos as MirrorPosition,
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
  viewId?: string
): ApplicableMirrorConfig | null {
  if (!file) return null;

  // Cache hit: se frontmatter nao mudou, retornar config cacheada
  const fmHash = hashObject(frontmatter);
  const cached = configCache.get(file.path);
  if (cached && cached.frontmatterHash === fmHash) {
    return cached.config;
  }

  const settings = plugin.settings;

  // 1. Encontrar custom mirror aplicavel via conditions
  let matchedMirror: CustomMirror | null = null;

  for (const mirror of settings.customMirrors) {
    if (!mirror.enable_custom_live_preview_mode || !mirror.custom_settings_live_preview_note) continue;
    if (mirror.conditions.length === 0) continue;
    if (evaluateConditions(mirror.conditions, mirror.conditionLogic, file, frontmatter)) {
      matchedMirror = mirror;
      break;
    }
  }

  // 2. Verificar se global mirror está ativo
  const globalMirrorActive = settings.global_settings &&
                            settings.enable_global_live_preview_mode &&
                            settings.global_settings_live_preview_note;

  // 3. LÓGICA DE PRIORIDADE (sem iteracao duplicada — matchedMirror ja tem a referencia)
  let result: ApplicableMirrorConfig | null = null;

  if (matchedMirror) {
    if (!globalMirrorActive || !settings.global_settings_overide) {
      // Global desabilitado OU sem "Replace custom Mirrors" → Custom sempre vence
      result = configFromMirror(matchedMirror);
    } else if (matchedMirror.custom_settings_overide) {
      // Global ativo COM override, mas custom tambem tem override → Custom vence
      result = configFromMirror(matchedMirror);
    }
    // else: global ativo com override e custom sem override → cai pro global abaixo
  }

  // 4. Se chegou aqui sem result, aplicar global mirror (se ativo)
  if (!result && globalMirrorActive) {
    Logger.log(`Global mirror applied to: ${file.path}, frontmatter:`, frontmatter);
    const globalOverrides = settings.global_view_overrides ?? { ...DEFAULT_VIEW_OVERRIDES };
    result = {
      templatePath: settings.global_settings_live_preview_note,
      position: settings.global_settings_live_preview_pos as MirrorPosition,
      hideProps: globalOverrides.hideProps,
      showContainer: settings.global_show_container_border,
      viewOverrides: globalOverrides,
    };
  }

  if (!result) {
    Logger.log(`No mirror applied to: ${file.path}, globalActive: ${globalMirrorActive}`);
  }

  // Cachear config base (sem override — override e estado runtime, nao deve poluir cache)
  configCache.set(file.path, { config: result, frontmatterHash: fmHash });

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
