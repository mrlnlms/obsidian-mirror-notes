import { describe, it, expect } from 'vitest';
import { calcPanelStyle } from '../src/editor/marginPanelExtension';

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
