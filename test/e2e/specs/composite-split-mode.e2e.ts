import { openFile, waitForElement } from 'obsidian-e2e-visual-test-kit';
import { S, NOTES, MARKERS, toggleReadingView, getViewMode } from '../helpers/mirror.js';

/**
 * Composite test: split pane + same file + LP→RV→LP on active pane.
 * Validates that the inactive pane doesn't leak CSS override classes
 * or gain/lose DOM mirrors when the active pane switches mode.
 *
 * Uses Obsidian API (workspace.getLeavesOfType) instead of CSS selectors
 * to target markdown leaves — avoids matching sidebar/explorer leaves.
 */
describe('composite: split pane + mode switch cross-leak', () => {
  const OVERRIDE_CLASSES = ['mirror-hide-properties', 'mirror-force-inline-title', 'mirror-hide-inline-title'];

  /** Query markdown leaves via Obsidian API, return info about active + other leaf */
  async function queryLeaves(marker: string): Promise<{
    total: number;
    activeHasMarker: boolean;
    otherHasMarker: boolean;
    otherMirrorCount: number;
  }> {
    const result = await browser.execute((m: string) => {
      const ws = (window as any).app.workspace;
      const leaves = ws.getLeavesOfType('markdown');
      const active = ws.activeLeaf;
      const other = leaves.find((l: any) => l !== active);
      return {
        total: leaves.length,
        activeHasMarker: active ? active.containerEl.innerHTML.includes(m) : false,
        otherHasMarker: other ? other.containerEl.innerHTML.includes(m) : false,
        otherMirrorCount: other ? other.containerEl.querySelectorAll('.mirror-ui-widget, .mirror-dom-injection').length : 0,
      };
    }, marker);
    return result as any;
  }

  /** Get override classes on the active or other markdown leaf */
  async function getOverrideClasses(target: 'active' | 'other'): Promise<string[]> {
    const result = await browser.execute((t: string, classes: string[]) => {
      const ws = (window as any).app.workspace;
      const leaves = ws.getLeavesOfType('markdown');
      const active = ws.activeLeaf;
      const leaf = t === 'active' ? active : leaves.find((l: any) => l !== active);
      if (!leaf) return [] as string[];
      const viewContent = leaf.containerEl.querySelector('.view-content');
      if (!viewContent) return [] as string[];
      return classes.filter((cls: string) => viewContent.classList.contains(cls));
    }, target, OVERRIDE_CLASSES);
    return result as string[];
  }

  /** Ensure single-pane state */
  before(async () => {
    await browser.execute(() => {
      const ws = (window as any).app.workspace;
      const leaves = ws.getLeavesOfType('markdown');
      for (let i = leaves.length - 1; i > 0; i--) leaves[i].detach();
    });
    await browser.pause(1000);
  });

  after(async () => {
    await browser.execute(() => {
      const ws = (window as any).app.workspace;
      const leaves = ws.getLeavesOfType('markdown');
      for (let i = leaves.length - 1; i > 0; i--) leaves[i].detach();
    });
    await browser.pause(1000);
  });

  it('setup: open same note in split panes, both start in LP', async () => {
    await openFile(NOTES.splitOverride);
    await waitForElement(S.aboveTitle, 15000);
    await browser.pause(2000);

    expect(await getViewMode()).toBe('source');

    // Split pane — duplicate current leaf
    await browser.execute(async () => {
      const ws = (window as any).app.workspace;
      await ws.duplicateLeaf(ws.activeLeaf, 'split');
    });
    await browser.pause(8000);

    const info = await queryLeaves(MARKERS.splitLp);
    expect(info.total).toBeGreaterThanOrEqual(2);
    // At least one pane should have the marker (the new pane may still be rendering)
    expect(info.activeHasMarker || info.otherHasMarker).toBe(true);
  });

  it('both panes have hideProps override (same mirror, same note)', async () => {
    const activeOverrides = await getOverrideClasses('active');
    expect(activeOverrides).toContain('mirror-hide-properties');

    const otherOverrides = await getOverrideClasses('other');
    expect(otherOverrides).toContain('mirror-hide-properties');
  });

  it('LP→RV on active pane: other pane stays in LP with LP template', async () => {
    await toggleReadingView();
    await browser.pause(5000);

    expect(await getViewMode()).toBe('preview');

    // Active pane: RV template
    const activeInfo = await queryLeaves(MARKERS.splitRv);
    expect(activeInfo.activeHasMarker).toBe(true);

    // Other pane: still LP template, NOT RV
    const otherInfo = await queryLeaves(MARKERS.splitLp);
    expect(otherInfo.otherHasMarker).toBe(true);

    const otherHasRv = await browser.execute((m: string) => {
      const ws = (window as any).app.workspace;
      const leaves = ws.getLeavesOfType('markdown');
      const other = leaves.find((l: any) => l !== ws.activeLeaf);
      return other ? other.containerEl.innerHTML.includes(m) : false;
    }, MARKERS.splitRv);
    expect(otherHasRv).toBe(false);
  });

  it('RV→LP on active pane: other pane unaffected', async () => {
    await toggleReadingView();
    await browser.pause(3000);

    expect(await getViewMode()).toBe('source');

    const info = await queryLeaves(MARKERS.splitLp);
    expect(info.activeHasMarker).toBe(true);
    expect(info.otherHasMarker).toBe(true);
  });

  it('no orphan override classes after roundtrip', async () => {
    const activeOverrides = await getOverrideClasses('active');
    const otherOverrides = await getOverrideClasses('other');

    // hideProps should be present (mirror has it configured)
    expect(activeOverrides).toContain('mirror-hide-properties');
    expect(otherOverrides).toContain('mirror-hide-properties');

    // No title override classes (not configured)
    expect(activeOverrides).not.toContain('mirror-force-inline-title');
    expect(activeOverrides).not.toContain('mirror-hide-inline-title');
    expect(otherOverrides).not.toContain('mirror-force-inline-title');
    expect(otherOverrides).not.toContain('mirror-hide-inline-title');
  });
});
