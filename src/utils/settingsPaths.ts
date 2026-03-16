import { MirrorUIPluginSettings } from "../settings/types";

export interface UpdatePathsResult {
  changed: boolean;
  mirrorIndices: number[];
  globalAffected: boolean;
}

/**
 * Update all template/filter paths in settings when a file or folder is renamed.
 * Pure function: mutates settings in-place and returns what changed.
 */
export function updateSettingsPaths(
  settings: MirrorUIPluginSettings,
  oldPath: string,
  newPath: string
): UpdatePathsResult {
  const result: UpdatePathsResult = { changed: false, mirrorIndices: [], globalAffected: false };
  if (!settings.auto_update_paths) return result;

  const replacePath = (current: string): string | null => {
    if (!current) return null;
    if (current === oldPath) return newPath;
    if (current.startsWith(oldPath + '/')) return newPath + current.slice(oldPath.length);
    return null;
  };

  // Global template paths
  const g1 = replacePath(settings.global_settings_live_preview_note);
  if (g1 !== null) { settings.global_settings_live_preview_note = g1; result.changed = true; result.globalAffected = true; }

  const g2 = replacePath(settings.global_settings_preview_note);
  if (g2 !== null) { settings.global_settings_preview_note = g2; result.changed = true; result.globalAffected = true; }

  // Custom mirrors (respeita per-mirror toggle)
  for (let i = 0; i < settings.customMirrors.length; i++) {
    const mirror = settings.customMirrors[i];
    if (mirror.custom_auto_update_paths === false) continue;

    let mirrorAffected = false;

    const c1 = replacePath(mirror.custom_settings_live_preview_note);
    if (c1 !== null) { mirror.custom_settings_live_preview_note = c1; mirrorAffected = true; }

    const c2 = replacePath(mirror.custom_settings_preview_note);
    if (c2 !== null) { mirror.custom_settings_preview_note = c2; mirrorAffected = true; }

    // conditions — atualizar paths por tipo
    const oldName = oldPath.split('/').pop();
    const newName = newPath.split('/').pop();
    for (const cond of mirror.conditions) {
      if (cond.type === 'file' && cond.fileName) {
        if (oldName && newName && oldName !== newName && cond.fileName === oldName) {
          cond.fileName = newName;
          mirrorAffected = true;
        }
      }
      if (cond.type === 'folder' && cond.folderPath) {
        const r = replacePath(cond.folderPath);
        if (r !== null) {
          cond.folderPath = r;
          mirrorAffected = true;
        }
      }
    }

    if (mirrorAffected) {
      result.changed = true;
      result.mirrorIndices.push(i);
    }
  }

  return result;
}
