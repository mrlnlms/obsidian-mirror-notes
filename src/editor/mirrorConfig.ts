import MirrorUIPlugin from "../../main";
import { TFile } from "obsidian";
import { ApplicableMirrorConfig } from "./mirrorTypes";
import { mirrorStateField } from "./mirrorState";
import { hashObject } from "./mirrorUtils";
import { CustomMirror, MirrorUIPluginSettings } from "../../settings";
import { Logger } from '../logger';

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
      }
    }
    for (const f of mirror.filterFolders) {
      if (f.folder && !folderToMirror.has(f.folder)) {
        folderToMirror.set(f.folder, mirror);
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

function configFromMirror(mirror: CustomMirror): ApplicableMirrorConfig {
  return {
    templatePath: mirror.custom_settings_live_preview_note,
    position: mirror.custom_settings_live_preview_pos as 'top' | 'bottom' | 'left' | 'right',
    hideProps: mirror.custom_settings_hide_props
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
      const hasPropMatch = mirror.filterProps.some(p => p.folder && frontmatter[p.folder] === p.template);
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
    if (!settings.global_settings_overide) {
      // Global NÃO tem "Replace custom Mirrors" → Custom sempre vence
      result = configFromMirror(matchedMirror);
    } else if (matchedMirror.custom_settings_overide) {
      // Global TEM override, mas custom tambem → Custom vence
      result = configFromMirror(matchedMirror);
    }
    // else: global override ativo e custom nao tem override → cai pro global abaixo
  }

  // 4. Se chegou aqui sem result, aplicar global mirror (se ativo)
  if (!result && globalMirrorActive) {
    Logger.log(`Global mirror applied to: ${file.path}, frontmatter:`, frontmatter);
    result = {
      templatePath: settings.global_settings_live_preview_note,
      position: settings.global_settings_live_preview_pos as 'top' | 'bottom' | 'left' | 'right',
      hideProps: settings.global_settings_hide_props
    };
  }

  if (!result) {
    Logger.log(`No mirror applied to: ${file.path}, globalActive: ${globalMirrorActive}`);
  }

  // Cachear resultado
  configCache.set(file.path, { config: result, frontmatterHash: fmHash });
  return result;
}
