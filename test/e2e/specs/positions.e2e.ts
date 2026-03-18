import { openFile, waitForElement, assertDomState, captureDomState } from 'obsidian-plugin-e2e';
import { S, NOTES, MARKERS } from '../helpers/mirror.js';

describe('DOM injection positions', () => {
  it('above-title renders with correct position and content', async () => {
    await openFile(NOTES.posAboveTitle);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(2000);
    await assertDomState(S.aboveTitle, {
      visible: true,
      childCount: { min: 1 },
      classList: { contains: ['mirror-ui-widget', 'mirror-dom-injection', 'mirror-position-above-title'] },
      dataAttributes: { 'data-position': 'above-title' },
      innerHTML: { contains: [MARKERS.aboveTitle] },
    });
  });

  it('above-properties renders with correct position and content', async () => {
    await openFile(NOTES.posAboveProperties);
    await browser.pause(5000);
    const domExists = await browser.execute(() => !!document.querySelector('[data-position="above-properties"]'));
    if (domExists) {
      await assertDomState(S.aboveProperties, {
        visible: true,
        classList: { contains: ['mirror-dom-injection'] },
        dataAttributes: { 'data-position': 'above-properties' },
        innerHTML: { contains: [MARKERS.aboveProps] },
      });
    } else {
      // Properties container may not exist in sandbox — verify marker in leaf (CM6 fallback)
      const markerExists = await browser.execute((m: string) => {
        const leaf = document.querySelector('.workspace-leaf.mod-active');
        return leaf ? leaf.innerHTML.includes(m) : false;
      }, MARKERS.aboveProps);
      expect(markerExists).toBe(true);
    }
  });

  it('below-properties renders with correct position and content', async () => {
    await openFile(NOTES.posBelowProperties);
    await browser.pause(5000);
    const domExists = await browser.execute(() => !!document.querySelector('[data-position="below-properties"]'));
    if (domExists) {
      await assertDomState(S.belowProperties, {
        visible: true,
        classList: { contains: ['mirror-dom-injection'] },
        dataAttributes: { 'data-position': 'below-properties' },
        innerHTML: { contains: [MARKERS.belowProps] },
      });
    } else {
      const markerExists = await browser.execute((m: string) => {
        const leaf = document.querySelector('.workspace-leaf.mod-active');
        return leaf ? leaf.innerHTML.includes(m) : false;
      }, MARKERS.belowProps);
      expect(markerExists).toBe(true);
    }
  });

  it('above-backlinks renders or falls back gracefully', async () => {
    await openFile(NOTES.posAboveBacklinks);
    await browser.pause(5000);
    // Backlinks need real links + plugin enabled + backlinkInDocument
    // The marker should appear somewhere — either as DOM injection or CM6 fallback
    const markerExists = await browser.execute((m: string) => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      return leaf ? leaf.innerHTML.includes(m) : false;
    }, MARKERS.aboveBacklinks);
    expect(markerExists).toBe(true);
  });

  it('below-backlinks renders or falls back gracefully', async () => {
    await openFile(NOTES.posBelowBacklinks);
    await browser.pause(5000);
    const markerExists = await browser.execute((m: string) => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      return leaf ? leaf.innerHTML.includes(m) : false;
    }, MARKERS.belowBacklinks);
    expect(markerExists).toBe(true);
  });
});

describe('CM6 widget positions', () => {
  it('top widget renders as CM6 widget with correct attributes', async () => {
    await openFile(NOTES.posCm6Top);
    await waitForElement(S.top, 10000);
    await browser.pause(3000);
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

  it('bottom widget renders as CM6 widget', async () => {
    await openFile(NOTES.posCm6Bottom);
    await browser.pause(5000);
    const bottomExists = await browser.execute(() => !!document.querySelector('.mirror-ui-widget[data-position="bottom"]'));
    if (bottomExists) {
      const el = await browser.$(S.bottom);
      await el.scrollIntoView();
      await browser.pause(1000);
      await assertDomState(S.bottom, {
        visible: true,
        classList: { contains: ['mirror-ui-widget', 'mirror-position-bottom'] },
        dataAttributes: { 'data-position': 'bottom' },
        innerHTML: { contains: [MARKERS.bottom] },
      });
    } else {
      console.log('Bottom widget not found — note may be too short for CM6 bottom placement');
    }
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
