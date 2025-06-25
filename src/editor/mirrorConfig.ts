import MirrorUIPlugin from "../../main";
import { TFile } from "obsidian";
import { ApplicableMirrorConfig } from "./mirrorTypes";
import { mirrorStateField } from "./mirrorState";

// Função para determinar a configuração aplicável para a nota atual
export function getApplicableConfig(
  plugin: MirrorUIPlugin,
  file: TFile | null,
  frontmatter: any
): ApplicableMirrorConfig | null {
  if (!file) return null;

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
  if (applicableCustomMirror) {
    // Se global NÃO tem "Replace custom Mirrors" → Custom sempre vence
    if (!settings.global_settings_overide) {
      return applicableCustomMirror;
    }
    
    // Se global TEM "Replace custom Mirrors" → Só custom com override vence
    if (settings.global_settings_overide) {
      // Encontrar o custom mirror aplicável para verificar seu override
      const customMirror = settings.customMirrors.find(mirror => {
        const hasFileMatch = mirror.filterFiles.some(f => f.folder && f.folder === file.name);
        const hasFolderMatch = mirror.filterFolders.some(f => f.folder && file.path.startsWith(f.folder));
        const hasPropMatch = mirror.filterProps.some(p => p.folder && frontmatter[p.folder] === p.template);
        return (hasFileMatch || hasFolderMatch || hasPropMatch) && 
               mirror.enable_custom_live_preview_mode && 
               mirror.custom_settings_live_preview_note;
      });
      
      if (customMirror && customMirror.custom_settings_overide) {
        return applicableCustomMirror; // Custom com override vence
      }
    }
  }

  // 4. Se chegou aqui, aplicar global mirror (se ativo)
  if (globalMirrorActive) {
    console.log(`[MirrorNotes] Global mirror applied to: ${file.path}, frontmatter:`, frontmatter);
    return {
      templatePath: settings.global_settings_live_preview_note,
      position: settings.global_settings_live_preview_pos as 'top' | 'bottom' | 'left' | 'right',
      hideProps: settings.global_settings_hide_props
    };
  }

  console.log(`[MirrorNotes] No mirror applied to: ${file.path}, globalActive: ${globalMirrorActive}`);
  return null;
} 