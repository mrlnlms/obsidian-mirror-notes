import MirrorUIPlugin from "../../main";
import { TFile } from "obsidian";
import { ApplicableMirrorConfig, MirrorPosition } from "./mirrorTypes";
import { hashObject } from "./mirrorUtils";
import { CustomMirror, MirrorUIPluginSettings, DEFAULT_VIEW_OVERRIDES, ViewOverrides } from "../settings/types";
import { Logger } from '../dev/logger';

// =================================================================================
// CACHE + INDEX
// =================================================================================

// Cache de config por arquivo (ativado v27)
const configCache = new Map<string, { config: ApplicableMirrorConfig | null, frontmatterHash: string }>();

// Index de mirrors por file/folder (lazy build, invalidado com cache)
interface MirrorIndex {
  byFile: Map<string, CustomMirror>;        // filename → primeiro mirror ativo
  byFolder: string[];                        // folders ordenados por tamanho desc
  folderToMirror: Map<string, CustomMirror>; // folder path → mirror
}

let mirrorIndex: MirrorIndex | null = null;

function buildMirrorIndex(settings: MirrorUIPluginSettings): MirrorIndex {
  const byFile = new Map<string, CustomMirror>();
  const folderToMirror = new Map<string, CustomMirror>();

  for (const mirror of settings.customMirrors) {
    if (!mirror.enable_custom_live_preview_mode || !mirror.custom_settings_live_preview_note) continue;

    for (const f of mirror.filterFiles) {
      if (f.folder && !byFile.has(f.folder)) {
        byFile.set(f.folder, mirror);
      } else if (f.folder && byFile.has(f.folder)) {
        Logger.warn(`Mirror conflict: "${mirror.name}" discarded for file "${f.folder}" (already claimed by "${byFile.get(f.folder)!.name}")`);
      }
    }
    for (const f of mirror.filterFolders) {
      if (f.folder && !folderToMirror.has(f.folder)) {
        folderToMirror.set(f.folder, mirror);
      } else if (f.folder && folderToMirror.has(f.folder)) {
        Logger.warn(`Mirror conflict: "${mirror.name}" discarded for folder "${f.folder}" (already claimed by "${folderToMirror.get(f.folder)!.name}")`);
      }
    }
  }

  // Ordenar folders por tamanho desc — "projects/sub/" matcha antes de "projects/"
  const byFolder = Array.from(folderToMirror.keys()).sort((a, b) => b.length - a.length);

  return { byFile, byFolder, folderToMirror };
}

export function clearConfigCache(): void {
  configCache.clear();
  mirrorIndex = null;
}

// =================================================================================
// MATCHING
// =================================================================================

/** Resolve viewOverrides com fallback pra legacy hide_props */
function resolveViewOverrides(overrides: ViewOverrides | undefined, legacyHideProps: boolean): ViewOverrides {
  if (overrides) return { ...overrides, hideProps: overrides.hideProps || legacyHideProps };
  return { ...DEFAULT_VIEW_OVERRIDES, hideProps: legacyHideProps };
}

function configFromMirror(mirror: CustomMirror): ApplicableMirrorConfig {
  const viewOverrides = resolveViewOverrides(mirror.custom_view_overrides, mirror.custom_settings_hide_props);
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
  frontmatter: any
): ApplicableMirrorConfig | null {
  if (!file) return null;

  // Cache hit: se frontmatter nao mudou, retornar config cacheada
  const fmHash = hashObject(frontmatter);
  const cached = configCache.get(file.path);
  if (cached && cached.frontmatterHash === fmHash) {
    return cached.config;
  }

  const settings = plugin.settings;

  // Rebuild index se necessario (lazy)
  if (!mirrorIndex) {
    mirrorIndex = buildMirrorIndex(settings);
  }

  // 1. Encontrar custom mirror aplicavel via index
  let matchedMirror: CustomMirror | null = null;

  // File match: O(1)
  const fileMirror = mirrorIndex.byFile.get(file.name);
  if (fileMirror) {
    matchedMirror = fileMirror;
  }

  // Folder match: O(depth) — folders ordenados por especificidade
  if (!matchedMirror) {
    for (const folder of mirrorIndex.byFolder) {
      if (file.path.startsWith(folder)) {
        matchedMirror = mirrorIndex.folderToMirror.get(folder)!;
        break;
      }
    }
  }

  // Props match: itera mirrors com filterProps (precisa do frontmatter, nao indexavel)
  if (!matchedMirror) {
    for (const mirror of settings.customMirrors) {
      if (!mirror.enable_custom_live_preview_mode || !mirror.custom_settings_live_preview_note) continue;
      const hasPropMatch = mirror.filterProps.some(p => {
        if (!p.folder) return false;
        const val = frontmatter[p.folder];
        if (val === undefined) return false;
        // Exact match (string, number)
        if (val === p.template) return true;
        // Boolean: frontmatter `true`/`false` vs settings string "true"/"false"
        if (typeof val === 'boolean') return String(val) === p.template;
        // Array: check if any element matches (e.g. tags: [a, b] matches "a")
        if (Array.isArray(val)) return val.some(item => String(item) === p.template);
        // Coerce to string for other types
        return String(val) === p.template;
      });
      if (hasPropMatch) {
        matchedMirror = mirror;
        break;
      }
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
    const globalOverrides = resolveViewOverrides(settings.global_view_overrides, settings.global_settings_hide_props);
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
  if (result && plugin.positionOverrides.has(file.path)) {
    const override = plugin.positionOverrides.get(file.path)!;
    Logger.log(`Applying position override for ${file.path}: ${result.position} → ${override}`);
    result = { ...result, position: override };
  }

  return result;
}
