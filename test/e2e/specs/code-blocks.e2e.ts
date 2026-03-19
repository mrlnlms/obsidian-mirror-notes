import { openFile } from 'obsidian-e2e-visual-test-kit';
import { NOTES, MARKERS, toggleReadingView, getViewMode } from '../helpers/mirror.js';

describe('code block processor', () => {
  it('renders mirror code block with correct template content', async () => {
    await openFile(NOTES.codeBlock);
    await browser.pause(5000);
    const exists = await browser.execute(() =>
      !!document.querySelector('.mirror-code-block')
    );
    expect(exists).toBe(true);
    const hasMarker = await browser.execute((marker: string) => {
      const block = document.querySelector('.mirror-code-block');
      return block ? block.innerHTML.includes(marker) : false;
    }, MARKERS.codeBlock);
    expect(hasMarker).toBe(true);
  });

  it('resolves variables from current note frontmatter', async () => {
    // Continues from previous test (same file open)
    const hasTitle = await browser.execute(() => {
      const block = document.querySelector('.mirror-code-block');
      return block ? block.innerHTML.includes('Code Block Test') : false;
    });
    expect(hasTitle).toBe(true);
  });

  it('renders code block in Reading View', async () => {
    await toggleReadingView();
    await browser.pause(3000);
    const mode = await getViewMode();
    expect(mode).toBe('preview');
    const hasMarker = await browser.execute((marker: string) => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      return leaf ? leaf.innerHTML.includes(marker) : false;
    }, MARKERS.codeBlock);
    expect(hasMarker).toBe(true);
    await toggleReadingView();
    await browser.pause(2000);
  });

  it('code block with source reference resolves source frontmatter', async () => {
    await openFile(NOTES.codeBlockSource);
    await browser.pause(5000);
    // source: notes/code-block.md → source fm overrides current
    // source has title: "Code Block Test", current has title: "Source Note"
    const hasSourceTitle = await browser.execute(() => {
      const block = document.querySelector('.mirror-code-block');
      return block ? block.innerHTML.includes('Code Block Test') : false;
    });
    expect(hasSourceTitle).toBe(true);
  });

  it('shows border when global_show_container_border is true', async () => {
    await openFile(NOTES.codeBlock);
    await browser.pause(5000);
    const hasStyledClass = await browser.execute(() => {
      const block = document.querySelector('.mirror-code-block');
      return block ? block.classList.contains('mirror-container-styled') : false;
    });
    expect(hasStyledClass).toBe(true);
  });
});
