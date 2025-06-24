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