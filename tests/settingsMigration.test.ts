import { describe, it, expect } from 'vitest';
import { migrateSettings } from '../src/settings/migration';

describe('migrateSettings', () => {
  it('migrates global_settings_overide → global_settings_override', () => {
    const oldData = {
      global_settings_overide: true,
      customMirrors: [],
    };
    const result = migrateSettings(oldData);
    expect(result.global_settings_override).toBe(true);
    expect(result).not.toHaveProperty('global_settings_overide');
  });

  it('migrates custom_settings_overide in each mirror', () => {
    const oldData = {
      customMirrors: [
        { id: 'abc', name: 'Test', custom_settings_overide: true },
        { id: 'def', name: 'Test 2', custom_settings_overide: false },
      ],
    };
    const result = migrateSettings(oldData);
    expect(result.customMirrors[0].custom_settings_override).toBe(true);
    expect(result.customMirrors[0]).not.toHaveProperty('custom_settings_overide');
    expect(result.customMirrors[1].custom_settings_override).toBe(false);
  });

  it('no-ops if data already uses correct field names', () => {
    const newData = {
      global_settings_override: false,
      customMirrors: [{ id: 'x', custom_settings_override: true }],
    };
    const result = migrateSettings(newData);
    expect(result.global_settings_override).toBe(false);
    expect(result.customMirrors[0].custom_settings_override).toBe(true);
  });

  it('preserves all other settings untouched', () => {
    const oldData = {
      global_settings_overide: true,
      debug_logging: true,
      global_settings: false,
      customMirrors: [],
    };
    const result = migrateSettings(oldData);
    expect(result.debug_logging).toBe(true);
    expect(result.global_settings).toBe(false);
  });

  it('handles empty object gracefully (fresh install)', () => {
    const result = migrateSettings({});
    expect(result).not.toHaveProperty('global_settings_overide');
    expect(result).not.toHaveProperty('global_settings_override');
  });

  it('handles missing customMirrors', () => {
    const oldData = { global_settings_overide: true };
    const result = migrateSettings(oldData);
    expect(result.global_settings_override).toBe(true);
  });
});
