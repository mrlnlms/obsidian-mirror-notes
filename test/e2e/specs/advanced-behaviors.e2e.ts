import { openFile, waitForElement } from 'obsidian-e2e-visual-test-kit';
import { S, NOTES, MARKERS } from '../helpers/mirror.js';

describe('multi-pane isolation', () => {
  it('two panes with different notes show correct mirrors', async () => {
    await openFile(NOTES.posAboveTitle);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(2000);

    await browser.execute(() => {
      (window as any).app.workspace.getLeaf('split');
    });
    await browser.pause(2000);

    await openFile(NOTES.posCm6Top);
    await browser.pause(5000);

    const totalWidgets = await browser.execute(() =>
      document.querySelectorAll('.mirror-ui-widget, .mirror-dom-injection').length
    );
    expect(totalWidgets).toBeGreaterThanOrEqual(2);

    const leftHasAboveTitle = await browser.execute((marker: string) => {
      const leaves = document.querySelectorAll('.workspace-leaf');
      for (const leaf of leaves) {
        if (leaf.innerHTML.includes(marker)) return true;
      }
      return false;
    }, MARKERS.aboveTitle);
    expect(leftHasAboveTitle).toBe(true);

    const rightHasTop = await browser.execute((marker: string) => {
      const active = document.querySelector('.workspace-leaf.mod-active');
      return active ? active.innerHTML.includes(marker) : false;
    }, MARKERS.top);
    expect(rightHasTop).toBe(true);
  });

  it('closing one pane does not affect the other', async () => {
    await browser.execute(() => {
      (window as any).app.workspace.activeLeaf.detach();
    });
    await browser.pause(3000);

    const remainingHasMarker = await browser.execute((marker: string) => {
      const active = document.querySelector('.workspace-leaf.mod-active');
      return active ? active.innerHTML.includes(marker) : false;
    }, MARKERS.aboveTitle);
    expect(remainingHasMarker).toBe(true);
  });

  it('navigating in one pane does not pollute the other', async () => {
    await openFile(NOTES.posAboveTitle);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(2000);

    await browser.execute(() => {
      (window as any).app.workspace.getLeaf('split');
    });
    await browser.pause(2000);

    await openFile(NOTES.posCm6Top);
    await browser.pause(5000);

    await openFile(NOTES.noMirror);
    await browser.pause(3000);

    const activeHasMirror = await browser.execute(() => {
      const active = document.querySelector('.workspace-leaf.mod-active');
      if (!active) return false;
      return active.querySelectorAll('.mirror-ui-widget, .mirror-dom-injection').length > 0;
    });
    expect(activeHasMirror).toBe(false);

    const otherHasMarker = await browser.execute((marker: string) => {
      const leaves = document.querySelectorAll('.workspace-leaf:not(.mod-active)');
      for (const leaf of leaves) {
        if (leaf.innerHTML.includes(marker)) return true;
      }
      return false;
    }, MARKERS.aboveTitle);
    expect(otherHasMarker).toBe(true);

    // Cleanup: close extra panes
    await browser.execute(() => {
      const workspace = (window as any).app.workspace;
      const leaves = workspace.getLeavesOfType('markdown');
      for (let i = leaves.length - 1; i > 0; i--) {
        leaves[i].detach();
      }
    });
    await browser.pause(2000);
  });

  it('same note with code block renders in both split panes', async () => {
    // Open note with code block in first pane
    await openFile(NOTES.codeBlock);
    await browser.pause(5000);

    // Verify code block rendered in first pane
    const firstPaneHasBlock = await browser.execute((marker: string) => {
      const active = document.querySelector('.workspace-leaf.mod-active');
      return active ? active.innerHTML.includes(marker) : false;
    }, MARKERS.codeBlock);
    expect(firstPaneHasBlock).toBe(true);

    // Create split pane
    await browser.execute(() => {
      (window as any).app.workspace.getLeaf('split');
    });
    await browser.pause(2000);

    // Open SAME note in new pane
    await openFile(NOTES.codeBlock);
    await browser.pause(5000);

    // Count total code blocks across all panes — should be 2
    const totalBlocks = await browser.execute(() =>
      document.querySelectorAll('.mirror-code-block').length
    );
    expect(totalBlocks).toBeGreaterThanOrEqual(2);

    // Verify both panes have the code block marker
    const allLeavesHaveMarker = await browser.execute((marker: string) => {
      const leaves = document.querySelectorAll('.workspace-leaf');
      let count = 0;
      for (const leaf of leaves) {
        if (leaf.innerHTML.includes(marker)) count++;
      }
      return count;
    }, MARKERS.codeBlock);
    expect(allLeavesHaveMarker).toBeGreaterThanOrEqual(2);

    // Cleanup: close extra panes
    await browser.execute(() => {
      const workspace = (window as any).app.workspace;
      const leaves = workspace.getLeavesOfType('markdown');
      for (let i = leaves.length - 1; i > 0; i--) {
        leaves[i].detach();
      }
    });
    await browser.pause(2000);
  });

  it('closing one pane preserves code block in the other', async () => {
    // Open note with code block
    await openFile(NOTES.codeBlock);
    await browser.pause(5000);

    // Create split and open same note
    await browser.execute(() => {
      (window as any).app.workspace.getLeaf('split');
    });
    await browser.pause(2000);
    await openFile(NOTES.codeBlock);
    await browser.pause(5000);

    // Close active (second) pane
    await browser.execute(() => {
      (window as any).app.workspace.activeLeaf.detach();
    });
    await browser.pause(3000);

    // Remaining pane should still have code block
    const remainingHasBlock = await browser.execute((marker: string) => {
      const active = document.querySelector('.workspace-leaf.mod-active');
      return active ? active.innerHTML.includes(marker) : false;
    }, MARKERS.codeBlock);
    expect(remainingHasBlock).toBe(true);
  });
});

describe('MutationObserver recovery', () => {
  before(async () => {
    // Ensure single-pane state with known file
    await browser.execute(() => {
      const workspace = (window as any).app.workspace;
      const leaves = workspace.getLeavesOfType('markdown');
      for (let i = leaves.length - 1; i > 0; i--) {
        leaves[i].detach();
      }
    });
    await browser.pause(1000);
  });

  it('re-injects container after DOM removal', async () => {
    await openFile(NOTES.posAboveTitle);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(3000);

    const beforeExists = await browser.execute(() =>
      !!document.querySelector('[data-position="above-title"]')
    );
    expect(beforeExists).toBe(true);

    await browser.execute(() => {
      const container = document.querySelector('[data-position="above-title"]');
      if (container) container.remove();
    });

    await browser.pause(5000);

    const afterExists = await browser.execute(() =>
      !!document.querySelector('[data-position="above-title"]')
    );
    expect(afterExists).toBe(true);

    const hasContent = await browser.execute((marker: string) => {
      const container = document.querySelector('[data-position="above-title"]');
      return container ? container.innerHTML.includes(marker) : false;
    }, MARKERS.aboveTitle);
    expect(hasContent).toBe(true);
  });

  it('re-injection preserves correct position', async () => {
    await browser.execute(() => {
      const container = document.querySelector('[data-position="above-title"]');
      if (container) container.remove();
    });
    await browser.pause(5000);

    const isBeforeTitle = await browser.execute(() => {
      const viewContent = document.querySelector('.workspace-leaf.mod-active .view-content');
      if (!viewContent) return false;
      const mirror = viewContent.querySelector('[data-position="above-title"]');
      const title = viewContent.querySelector('.inline-title');
      if (!mirror || !title) return false;
      return !!(mirror.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(isBeforeTitle).toBe(true);
  });
});
