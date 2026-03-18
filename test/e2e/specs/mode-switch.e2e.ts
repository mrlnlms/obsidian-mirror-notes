import { openFile, waitForElement, assertDomState } from 'obsidian-plugin-e2e';
import { S, NOTES, MARKERS, toggleReadingView, getViewMode } from '../helpers/mirror.js';

describe('mode switch (LP ↔ RV)', () => {
  before(async () => {
    await openFile(NOTES.dualTemplate);
    await waitForElement(S.top, 10000);
  });

  it('starts in Live Preview with LP template', async () => {
    const mode = await getViewMode();
    expect(mode).toBe('source');
    await assertDomState(S.top, {
      visible: true,
      innerHTML: { contains: [MARKERS.lpDual], notContains: [MARKERS.rvDual] },
    });
  });

  it('switches to Reading View and shows RV template', async () => {
    await toggleReadingView();
    await browser.pause(3000);

    // In RV, mirror renders via DOM injection — check active leaf for RV marker
    const hasRvTemplate = await browser.execute((marker: string) => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      if (!leaf) return false;
      const mirrors = leaf.querySelectorAll('.mirror-ui-widget, .mirror-dom-injection');
      return Array.from(mirrors).some(m => m.innerHTML.includes(marker));
    }, MARKERS.rvDual);
    expect(hasRvTemplate).toBe(true);
  });

  it('switches back to LP and restores LP template', async () => {
    await toggleReadingView();
    await browser.pause(3000);

    // Back in LP — check for LP marker in mirrors
    const hasLpTemplate = await browser.execute((marker: string) => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      if (!leaf) return false;
      const mirrors = leaf.querySelectorAll('.mirror-ui-widget, .mirror-dom-injection');
      return Array.from(mirrors).some(m => m.innerHTML.includes(marker));
    }, MARKERS.lpDual);
    expect(hasLpTemplate).toBe(true);
  });

  it('no leaked override classes after mode switch', async () => {
    const overrideClasses = await browser.execute(() => {
      const viewContent = document.querySelector('.workspace-leaf.mod-active .view-content');
      if (!viewContent) return [];
      return ['mirror-hide-properties', 'mirror-force-inline-title', 'mirror-hide-inline-title']
        .filter(cls => viewContent.classList.contains(cls));
    });
    expect(overrideClasses.length).toBe(0);
  });
});
