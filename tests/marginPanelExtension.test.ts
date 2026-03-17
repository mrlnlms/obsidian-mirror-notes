import { describe, it, expect } from 'vitest';
import { calcPanelStyle, marginPanelCacheKey } from '../src/editor/marginPanelExtension';

describe('calcPanelStyle', () => {
  it('left panel: left=0, right unset', () => {
    const style = calcPanelStyle('left');
    expect(style.left).toBe('0px');
    expect(style.right).toBeUndefined();
  });

  it('right panel: right=0, left unset', () => {
    const style = calcPanelStyle('right');
    expect(style.right).toBe('0px');
    expect(style.left).toBeUndefined();
  });
});

describe('marginPanelCacheKey', () => {
  it('same inputs produce same key', () => {
    const a = marginPanelCacheKey('note.md', 'left', 'tpl.md', 'w1');
    const b = marginPanelCacheKey('note.md', 'left', 'tpl.md', 'w1');
    expect(a).toBe(b);
  });

  it('different widgetId produces different key (triggers re-render)', () => {
    const before = marginPanelCacheKey('note.md', 'left', 'tpl.md', 'widget-1');
    const after = marginPanelCacheKey('note.md', 'left', 'tpl.md', 'widget-2');
    expect(before).not.toBe(after);
  });

  it('different side produces different key', () => {
    const left = marginPanelCacheKey('note.md', 'left', 'tpl.md', 'w1');
    const right = marginPanelCacheKey('note.md', 'right', 'tpl.md', 'w1');
    expect(left).not.toBe(right);
  });

  it('different template produces different key', () => {
    const a = marginPanelCacheKey('note.md', 'left', 'tpl-a.md', 'w1');
    const b = marginPanelCacheKey('note.md', 'left', 'tpl-b.md', 'w1');
    expect(a).not.toBe(b);
  });
});
