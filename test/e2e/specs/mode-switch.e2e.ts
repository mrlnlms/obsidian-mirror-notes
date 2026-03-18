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
    await browser.pause(2000);
    const topWidget = await browser.$(S.posTop);
    await topWidget.waitForExist({ timeout: 10000 });
    const html = await topWidget.getHTML();
    expect(html).toContain(MARKERS.rvDual);
    expect(html).not.toContain(MARKERS.lpDual);
  });

  it('switches back to LP and restores LP template', async () => {
    await toggleReadingView();
    await waitForElement(S.top, 10000);
    await browser.pause(2000);
    await assertDomState(S.top, {
      visible: true,
      innerHTML: { contains: [MARKERS.lpDual], notContains: [MARKERS.rvDual] },
    });
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
