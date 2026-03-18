import { describe, it, expect } from 'vitest';
import { createDefaultCustomMirror, sanitizeMirrorName } from '../src/settings/types';

describe('sanitizeMirrorName', () => {
  it('trims whitespace', () => {
    expect(sanitizeMirrorName('  My Mirror  ', 0)).toBe('My Mirror');
  });

  it('returns input when non-empty after trim', () => {
    expect(sanitizeMirrorName('Custom Name', 3)).toBe('Custom Name');
  });

  it('falls back to Mirror N+1 for empty string', () => {
    expect(sanitizeMirrorName('', 0)).toBe('Mirror 1');
    expect(sanitizeMirrorName('', 4)).toBe('Mirror 5');
  });

  it('falls back to Mirror N+1 for whitespace-only', () => {
    expect(sanitizeMirrorName('   ', 2)).toBe('Mirror 3');
  });
});

describe('createDefaultCustomMirror', () => {
  it('generates sequential names', () => {
    const m0 = createDefaultCustomMirror(0);
    const m1 = createDefaultCustomMirror(1);
    expect(m0.name).toBe('Mirror 1');
    expect(m1.name).toBe('Mirror 2');
  });

  it('name is mutable and preserves id', () => {
    const mirror = createDefaultCustomMirror(0);
    const originalId = mirror.id;
    mirror.name = 'My Custom Name';
    expect(mirror.name).toBe('My Custom Name');
    expect(mirror.id).toBe(originalId);
  });
});
