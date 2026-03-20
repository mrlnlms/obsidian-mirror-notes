import { openFile, waitForElement } from 'obsidian-e2e-visual-test-kit';
import { S, NOTES, MARKERS, toggleReadingView, getViewMode } from '../helpers/mirror.js';

/**
 * Composite test: split pane + same file + LP→RV→LP on active pane.
 * Validates that the inactive pane doesn't leak CSS override classes
 * or gain/lose DOM mirrors when the active pane switches mode.
 */
describe('composite: split pane + mode switch cross-leak', () => {
  const OVERRIDE_CLASSES = ['mirror-hide-properties', 'mirror-force-inline-title', 'mirror-hide-inline-title'];

  /** Count override classes on a specific leaf (active or inactive) */
  async function getOverrideClasses(target: 'active' | 'inactive'): Promise<string[]> {
    return browser.execute((t: string, classes: string[]) => {
      const selector = t === 'active'
        ? '.workspace-leaf.mod-active .view-content'
        : '.workspace-leaf:not(.mod-active) .view-content';
      const el = document.querySelector(selector);
      if (!el) return [];
      return classes.filter(cls => el.classList.contains(cls));
    }, target, OVERRIDE_CLASSES);
  }

  /** Get mirror marker content from a specific leaf */
  async function leafHasMarker(target: 'active' | 'inactive', marker: string): Promise<boolean> {
    return browser.execute((t: string, m: string) => {
      const selector = t === 'active'
        ? '.workspace-leaf.mod-active'
        : '.workspace-leaf:not(.mod-active)';
      const leaf = document.querySelector(selector);
      return leaf ? leaf.innerHTML.includes(m) : false;
    }, target, marker);
  }

  /** Ensure single-pane state before tests */
  before(async () => {
    await browser.execute(() => {
      const ws = (window as any).app.workspace;
      const leaves = ws.getLeavesOfType('markdown');
      for (let i = leaves.length - 1; i > 0; i--) leaves[i].detach();
    });
    await browser.pause(1000);
  });

  after(async () => {
    // Cleanup: close split panes
    await browser.execute(() => {
      const ws = (window as any).app.workspace;
      const leaves = ws.getLeavesOfType('markdown');
      for (let i = leaves.length - 1; i > 0; i--) leaves[i].detach();
    });
    await browser.pause(1000);
  });

  it('setup: open same note in split panes, both start in LP', async () => {
    // Open override note in first pane
    await openFile(NOTES.splitOverride);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(2000);

    // Verify LP mode and mirror rendered
    expect(await getViewMode()).toBe('source');
    expect(await leafHasMarker('active', MARKERS.splitLp)).toBe(true);

    // Split and open same file
    await browser.execute(() => {
      (window as any).app.workspace.getLeaf('split');
    });
    await browser.pause(2000);
    await openFile(NOTES.splitOverride);
    await browser.pause(5000);

    // Both panes should have LP template
    expect(await leafHasMarker('active', MARKERS.splitLp)).toBe(true);
    expect(await leafHasMarker('inactive', MARKERS.splitLp)).toBe(true);
  });

  it('active pane override classes do not leak to inactive pane', async () => {
    // Active pane should have hideProps override (configured in mirror)
    const activeOverrides = await getOverrideClasses('active');
    expect(activeOverrides).toContain('mirror-hide-properties');

    // Inactive pane should also have it (same mirror, same note)
    const inactiveOverrides = await getOverrideClasses('inactive');
    expect(inactiveOverrides).toContain('mirror-hide-properties');
  });

  it('LP→RV on active pane: inactive pane stays in LP with LP template', async () => {
    // Toggle active pane to Reading View
    await toggleReadingView();
    await browser.pause(3000);

    // Active pane: should now show RV template
    expect(await getViewMode()).toBe('preview');
    expect(await leafHasMarker('active', MARKERS.splitRv)).toBe(true);

    // Inactive pane: should STILL have LP template, NOT RV
    expect(await leafHasMarker('inactive', MARKERS.splitLp)).toBe(true);
    expect(await leafHasMarker('inactive', MARKERS.splitRv)).toBe(false);
  });

  it('RV→LP on active pane: inactive pane unaffected', async () => {
    // Toggle back to LP
    await toggleReadingView();
    await browser.pause(3000);

    // Active pane: back to LP template
    expect(await getViewMode()).toBe('source');
    expect(await leafHasMarker('active', MARKERS.splitLp)).toBe(true);

    // Inactive pane: still LP, no change
    expect(await leafHasMarker('inactive', MARKERS.splitLp)).toBe(true);
  });

  it('no orphan override classes after roundtrip', async () => {
    // After LP→RV→LP roundtrip, both panes should have hideProps
    // (the mirror is active in both) but no unexpected classes
    const activeOverrides = await getOverrideClasses('active');
    const inactiveOverrides = await getOverrideClasses('inactive');

    // hideProps should be present (mirror has it configured)
    expect(activeOverrides).toContain('mirror-hide-properties');
    expect(inactiveOverrides).toContain('mirror-hide-properties');

    // No title override classes (not configured)
    expect(activeOverrides).not.toContain('mirror-force-inline-title');
    expect(activeOverrides).not.toContain('mirror-hide-inline-title');
    expect(inactiveOverrides).not.toContain('mirror-force-inline-title');
    expect(inactiveOverrides).not.toContain('mirror-hide-inline-title');
  });
});
