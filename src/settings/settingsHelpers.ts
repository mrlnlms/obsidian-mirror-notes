import { Notice } from 'obsidian';
import type MirrorUIPlugin from '../../main';

export function rebuildKnownTemplatePaths(plugin: MirrorUIPlugin) {
  plugin.knownTemplatePaths.clear();
  const s = plugin.settings;
  if (s.global_settings_live_preview_note) plugin.knownTemplatePaths.add(s.global_settings_live_preview_note);
  if (s.global_settings_preview_note) plugin.knownTemplatePaths.add(s.global_settings_preview_note);
  for (const m of s.customMirrors) {
    if (m.custom_settings_live_preview_note) plugin.knownTemplatePaths.add(m.custom_settings_live_preview_note);
    if (m.custom_settings_preview_note) plugin.knownTemplatePaths.add(m.custom_settings_preview_note);
  }
}

export function checkDeletedTemplates(plugin: MirrorUIPlugin, deletedPath: string): void {
  const s = plugin.settings;

  const notify = (msg: string, mirrorIndex?: number) => {
    const frag = document.createDocumentFragment();
    frag.createEl('span', { text: msg + ' ' });
    const link = frag.createEl('a', { text: 'Open settings', attr: { style: 'cursor: pointer; text-decoration: underline;' } });
    link.addEventListener('click', () => {
      plugin.openSettingsToField(deletedPath, mirrorIndex !== undefined ? [mirrorIndex] : undefined);
    });
    new Notice(frag, 10000);
  };

  if (s.global_settings_live_preview_note === deletedPath) {
    notify(`Mirror Notes: global template "${deletedPath}" was deleted.`);
  }
  if (s.global_settings_preview_note === deletedPath) {
    notify(`Mirror Notes: global preview template "${deletedPath}" was deleted.`);
  }

  for (let i = 0; i < s.customMirrors.length; i++) {
    const mirror = s.customMirrors[i];
    if (mirror.custom_settings_live_preview_note === deletedPath) {
      notify(`Mirror Notes: template "${deletedPath}" used by "${mirror.name}" was deleted.`, i);
    }
    if (mirror.custom_settings_preview_note === deletedPath) {
      notify(`Mirror Notes: preview template "${deletedPath}" used by "${mirror.name}" was deleted.`, i);
    }
  }
}
