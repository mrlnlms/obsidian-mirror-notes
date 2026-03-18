import { openFile, waitForElement, assertDomState, captureDomState } from 'obsidian-plugin-e2e';
import { S, NOTES, MARKERS } from '../helpers/mirror.js';

describe('DOM injection positions', () => {
  before(async () => {
    await openFile(NOTES.allPositions);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(3000);
  });

  it('above-title renders with correct position and content', async () => {
    await assertDomState(S.aboveTitle, {
      visible: true,
      childCount: { min: 1 },
      classList: { contains: ['mirror-ui-widget', 'mirror-dom-injection', 'mirror-position-above-title'] },
      dataAttributes: { 'data-position': 'above-title' },
      innerHTML: { contains: [MARKERS.aboveTitle] },
    });
  });

  it('above-properties renders with correct position and content', async () => {
    await assertDomState(S.aboveProperties, {
      visible: true,
      classList: { contains: ['mirror-dom-injection', 'mirror-position-above-properties'] },
      dataAttributes: { 'data-position': 'above-properties' },
      innerHTML: { contains: [MARKERS.aboveProps] },
    });
  });

  it('below-properties renders with correct position and content', async () => {
    await assertDomState(S.belowProperties, {
      visible: true,
      classList: { contains: ['mirror-dom-injection', 'mirror-position-below-properties'] },
      dataAttributes: { 'data-position': 'below-properties' },
      innerHTML: { contains: [MARKERS.belowProps] },
    });
  });

  it('above-backlinks renders with correct position and content', async () => {
    const el = await browser.$(S.aboveBacklinks);
    if (await el.isExisting()) {
      await el.scrollIntoView();
      await browser.pause(500);
    }
    await assertDomState(S.aboveBacklinks, {
      visible: true,
      classList: { contains: ['mirror-dom-injection', 'mirror-position-above-backlinks'] },
      dataAttributes: { 'data-position': 'above-backlinks' },
      innerHTML: { contains: [MARKERS.aboveBacklinks] },
    });
  });

  it('below-backlinks renders with correct position and content', async () => {
    await assertDomState(S.belowBacklinks, {
      visible: true,
      classList: { contains: ['mirror-dom-injection', 'mirror-position-below-backlinks'] },
      dataAttributes: { 'data-position': 'below-backlinks' },
      innerHTML: { contains: [MARKERS.belowBacklinks] },
    });
  });
});

describe('CM6 widget positions', () => {
  before(async () => {
    await openFile(NOTES.topBottom);
    await waitForElement(S.top, 10000);
    await browser.pause(2000);
  });

  it('top widget renders as CM6 widget with correct attributes', async () => {
    await assertDomState(S.top, {
      visible: true,
      classList: { contains: ['mirror-ui-widget', 'mirror-position-top'] },
      dataAttributes: { 'data-position': 'top' },
      innerHTML: { contains: [MARKERS.top] },
    });
    const snapshots = await captureDomState(S.top);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(snapshots[0].attributes['data-widget-id']).toBeDefined();
    expect(snapshots[0].attributes['data-widget-id']).toContain('mirror-widget-');
  });

  it('bottom widget renders as CM6 widget with correct attributes', async () => {
    const el = await browser.$(S.bottom);
    if (await el.isExisting()) {
      await el.scrollIntoView();
      await browser.pause(500);
    }
    await assertDomState(S.bottom, {
      visible: true,
      classList: { contains: ['mirror-ui-widget', 'mirror-position-bottom'] },
      dataAttributes: { 'data-position': 'bottom' },
      innerHTML: { contains: [MARKERS.bottom] },
    });
  });

  it('note with no matching mirrors has no widgets', async () => {
    await openFile(NOTES.noMirror);
    await browser.pause(3000);
    const count = await browser.execute(() => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      if (!leaf) return 0;
      return leaf.querySelectorAll('.mirror-ui-widget').length;
    });
    expect(count).toBe(0);
  });
});
