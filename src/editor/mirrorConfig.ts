import MirrorUIPlugin from "../../main";
import { TFile } from "obsidian";
import { ApplicableMirrorConfig } from "./mirrorTypes";
import { mirrorStateField } from "./mirrorState";
import { hashObject } from "./mirrorUtils";
import { Logger } from '../logger';

// Cache de config por arquivo (ativado v27 — era dead code em mirrorState.ts)
const configCache = new Map<string, { config: ApplicableMirrorConfig | null, frontmatterHash: string }>();

export function clearConfigCache(): void {
  configCache.clear();
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

  // 1. Primeiro, verificar se há custom mirrors aplicáveis
  let applicableCustomMirror: ApplicableMirrorConfig | null = null;
  
  for (const mirror of settings.customMirrors) {
    const hasFileMatch = mirror.filterFiles.some(f => f.folder && f.folder === file.name);
    const hasFolderMatch = mirror.filterFolders.some(f => f.folder && file.path.startsWith(f.folder));
    const hasPropMatch = mirror.filterProps.some(p => p.folder && frontmatter[p.folder] === p.template);

    if (hasFileMatch || hasFolderMatch || hasPropMatch) {
      if (mirror.enable_custom_live_preview_mode && mirror.custom_settings_live_preview_note) {
        applicableCustomMirror = {
          templatePath: mirror.custom_settings_live_preview_note,
          position: mirror.custom_settings_live_preview_pos as 'top' | 'bottom' | 'left' | 'right',
          hideProps: mirror.custom_settings_hide_props
        };
        break;
      }
    }
  }

  // 2. Verificar se global mirror está ativo
  const globalMirrorActive = settings.global_settings && 
                            settings.enable_global_live_preview_mode && 
                            settings.global_settings_live_preview_note;

  // 3. LÓGICA DE PRIORIDADE
  let result: ApplicableMirrorConfig | null = null;

  if (applicableCustomMirror) {
    // Se global NÃO tem "Replace custom Mirrors" → Custom sempre vence
    if (!settings.global_settings_overide) {
      result = applicableCustomMirror;
    } else {
      // Se global TEM "Replace custom Mirrors" → Só custom com override vence
      const customMirror = settings.customMirrors.find(mirror => {
        const hasFileMatch = mirror.filterFiles.some(f => f.folder && f.folder === file.name);
        const hasFolderMatch = mirror.filterFolders.some(f => f.folder && file.path.startsWith(f.folder));
        const hasPropMatch = mirror.filterProps.some(p => p.folder && frontmatter[p.folder] === p.template);
        return (hasFileMatch || hasFolderMatch || hasPropMatch) &&
               mirror.enable_custom_live_preview_mode &&
               mirror.custom_settings_live_preview_note;
      });

      if (customMirror && customMirror.custom_settings_overide) {
        result = applicableCustomMirror; // Custom com override vence
      }
    }
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