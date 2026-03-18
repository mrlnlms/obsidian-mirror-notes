/**
 * Migrate legacy settings field names.
 * v53: overide → override (typo fix)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateSettings(data: any): any {
  if (!data || typeof data !== 'object') return data;

  // Global level: global_settings_overide → global_settings_override
  if ('global_settings_overide' in data) {
    data.global_settings_override = data.global_settings_overide;
    delete data.global_settings_overide;
  }

  // Per-mirror: custom_settings_overide → custom_settings_override
  if (Array.isArray(data.customMirrors)) {
    for (const mirror of data.customMirrors) {
      if ('custom_settings_overide' in mirror) {
        mirror.custom_settings_override = mirror.custom_settings_overide;
        delete mirror.custom_settings_overide;
      }
    }
  }

  return data;
}
