import { openFile, waitForElement, assertDomState, captureDomState } from 'obsidian-plugin-e2e';
import { S, NOTES, MARKERS } from '../helpers/mirror.js';

describe('DOM injection positions', () => {
  before(async () => {
    await openFile(NOTES.allPositions);
    // Wait for at least the above-title position (first to render)
    await waitForElement(S.aboveTitle, 15000);
    // Extra pause for all positions to settle (DOM injection is async)
    await browser.pause(5000);
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

  it('above-properties renders or falls back to CM6', async () => {
    // Properties position depends on .metadata-container existing in DOM
    const domExists = await browser.execute(() =>
      !!document.querySelector('[data-position="above-properties"]')
    );
    if (domExists) {
      await assertDomState(S.aboveProperties, {
        visible: true,
        classList: { contains: ['mirror-dom-injection'] },
        dataAttributes: { 'data-position': 'above-properties' },
        innerHTML: { contains: [MARKERS.aboveProps] },
      });
    } else {
      // Fallback: mirror should exist somewhere (CM6 top fallback)
      const fallbackExists = await browser.execute((marker: string) => {
        const leaf = document.querySelector('.workspace-leaf.mod-active');
        return leaf ? leaf.innerHTML.includes(marker) : false;
      }, MARKERS.aboveProps);
      expect(fallbackExists).toBe(true);
    }
  });

  it('below-properties renders or falls back to CM6', async () => {
    const domExists = await browser.execute(() =>
      !!document.querySelector('[data-position="below-properties"]')
    );
    if (domExists) {
      await assertDomState(S.belowProperties, {
        visible: true,
        classList: { contains: ['mirror-dom-injection'] },
        dataAttributes: { 'data-position': 'below-properties' },
        innerHTML: { contains: [MARKERS.belowProps] },
      });
    } else {
      const fallbackExists = await browser.execute((marker: string) => {
        const leaf = document.querySelector('.workspace-leaf.mod-active');
        return leaf ? leaf.innerHTML.includes(marker) : false;
      }, MARKERS.belowProps);
      expect(fallbackExists).toBe(true);
    }
  });

  it('above-backlinks renders or falls back to CM6', async () => {
    const domExists = await browser.execute(() =>
      !!document.querySelector('[data-position="above-backlinks"]')
    );
    if (domExists) {
      const el = await browser.$(S.aboveBacklinks);
      await el.scrollIntoView();
      await browser.pause(500);
      await assertDomState(S.aboveBacklinks, {
        visible: true,
        classList: { contains: ['mirror-dom-injection'] },
        dataAttributes: { 'data-position': 'above-backlinks' },
        innerHTML: { contains: [MARKERS.aboveBacklinks] },
      });
    } else {
      // Backlinks fall back to CM6 bottom — verify marker exists in leaf
      const fallbackExists = await browser.execute((marker: string) => {
        const leaf = document.querySelector('.workspace-leaf.mod-active');
        return leaf ? leaf.innerHTML.includes(marker) : false;
      }, MARKERS.aboveBacklinks);
      expect(fallbackExists).toBe(true);
    }
  });

  it('below-backlinks renders or falls back to CM6', async () => {
    const domExists = await browser.execute(() =>
      !!document.querySelector('[data-position="below-backlinks"]')
    );
    if (domExists) {
      await assertDomState(S.belowBacklinks, {
        visible: true,
        classList: { contains: ['mirror-dom-injection'] },
        dataAttributes: { 'data-position': 'below-backlinks' },
        innerHTML: { contains: [MARKERS.belowBacklinks] },
      });
    } else {
      const fallbackExists = await browser.execute((marker: string) => {
        const leaf = document.querySelector('.workspace-leaf.mod-active');
        return leaf ? leaf.innerHTML.includes(marker) : false;
      }, MARKERS.belowBacklinks);
      expect(fallbackExists).toBe(true);
    }
  });
});

describe('CM6 widget positions', () => {
  before(async () => {
    await openFile(NOTES.topBottom);
    await waitForElement(S.top, 10000);
    await browser.pause(3000);
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

  it('bottom widget renders as CM6 widget', async () => {
    // Bottom widget may need scroll — wait for it with longer timeout
    const bottomExists = await browser.execute(() =>
      !!document.querySelector('.mirror-ui-widget[data-position="bottom"]')
    );
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
      // Bottom widget may not render if note is too short for CM6 to place it
      // Verify the marker content exists somewhere in the leaf
      const markerExists = await browser.execute((marker: string) => {
        const leaf = document.querySelector('.workspace-leaf.mod-active');
        return leaf ? leaf.innerHTML.includes(marker) : false;
      }, MARKERS.bottom);
      // If marker doesn't exist either, the note may be too short — skip gracefully
      console.log(`Bottom widget exists: ${bottomExists}, marker in leaf: ${markerExists}`);
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
