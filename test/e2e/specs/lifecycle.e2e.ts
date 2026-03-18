import { waitForPlugin, openFile, waitForElement } from 'obsidian-plugin-e2e';
import { S, NOTES, MARKERS, countMirrorWidgets, disablePlugin, enablePlugin } from '../helpers/mirror.js';

describe('plugin lifecycle', () => {
  it('cold start: plugin loads and renders mirrors on first file open', async () => {
    await waitForPlugin('mirror-notes', 20000);
    await openFile(NOTES.basic);
    await waitForElement(S.top, 15000);
    const html = await (await browser.$(S.top)).getHTML();
    expect(html).toContain(MARKERS.top);
  });

  it('plugin unload cleans all DOM mirrors', async () => {
    await openFile(NOTES.allPositions);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(3000);
    const beforeCount = await countMirrorWidgets();
    expect(beforeCount).toBeGreaterThan(0);
    await disablePlugin();
    const afterCount = await countMirrorWidgets();
    expect(afterCount).toBe(0);
    const overrideClasses = await browser.execute(() => {
      const classes = ['mirror-hide-properties', 'mirror-force-inline-title', 'mirror-hide-inline-title'];
      return classes.filter(cls => document.querySelector(`.${cls}`) !== null);
    });
    expect(overrideClasses.length).toBe(0);
  });

  it('plugin re-enable restores mirrors', async () => {
    await enablePlugin();
    await openFile(NOTES.basic);
    await browser.pause(1000);
    await openFile(NOTES.allPositions);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(3000);
    const count = await countMirrorWidgets();
    expect(count).toBeGreaterThan(0);
  });

  it('no orphan widgets after navigating between files', async () => {
    await openFile(NOTES.allPositions);
    await waitForElement(S.aboveTitle, 10000);
    await browser.pause(2000);
    await openFile(NOTES.noMirror);
    await browser.pause(3000);
    const orphanCount = await browser.execute(() => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      if (!leaf) return 0;
      return leaf.querySelectorAll('.mirror-ui-widget').length;
    });
    expect(orphanCount).toBe(0);
  });
});
