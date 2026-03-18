import { waitForPlugin, openFile, getActiveFile, waitForElement } from 'obsidian-plugin-e2e';
import { S, NOTES, MARKERS } from '../helpers/mirror.js';

describe('smoke', () => {
  it('plugin loads and is available', async () => {
    await waitForPlugin('mirror-notes', 20000);
    const isLoaded = await browser.execute(() => {
      const plugin = (window as any).app.plugins.plugins['mirror-notes'];
      return !!plugin && !!plugin.settings;
    });
    expect(isLoaded).toBe(true);
  });

  it('can open a file and mirrors render', async () => {
    await openFile(NOTES.basic);
    const active = await getActiveFile();
    expect(active).toBe(NOTES.basic);
    await waitForElement(S.top, 10000);
  });

  it('editor is visible and widget has content', async () => {
    const editorExists = await browser.$(S.cmContent).isExisting();
    expect(editorExists).toBe(true);
    const el = await browser.$(S.top);
    const html = await el.getHTML();
    expect(html).toContain(MARKERS.top);
  });
});
