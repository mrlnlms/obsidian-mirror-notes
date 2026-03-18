import { openFile, waitForElement, checkComponent, checkViewport, scrollTo } from 'obsidian-plugin-e2e';
import { S, NOTES, toggleReadingView } from '../helpers/mirror.js';

describe('visual baselines', () => {
  describe('Live Preview positions', () => {
    before(async () => {
      await openFile(NOTES.allPositions);
      await waitForElement(S.aboveTitle, 15000);
      await browser.pause(3000);
    });

    it('above-title container baseline', async () => {
      const mismatch = await checkComponent(S.aboveTitle, 'lp-above-title');
      expect(mismatch).toBeLessThan(1.5);
    });

    it('viewport with top area mirrors', async () => {
      await scrollTo(S.inlineTitle);
      await browser.pause(500);
      const mismatch = await checkViewport('lp-all-positions-top-area');
      expect(mismatch).toBeLessThan(2);
    });
  });

  describe('CM6 widgets', () => {
    before(async () => {
      await openFile(NOTES.topBottom);
      await waitForElement(S.top, 10000);
      await browser.pause(2000);
    });

    it('top CM6 widget baseline', async () => {
      const mismatch = await checkComponent(S.top, 'cm6-top-widget');
      expect(mismatch).toBeLessThan(1.5);
    });

    it('bottom CM6 widget baseline', async () => {
      await scrollTo(S.bottom);
      await browser.pause(500);
      const mismatch = await checkComponent(S.bottom, 'cm6-bottom-widget');
      expect(mismatch).toBeLessThan(1.5);
    });
  });

  describe('Reading View', () => {
    before(async () => {
      await openFile(NOTES.dualTemplate);
      await waitForElement(S.top, 10000);
      await toggleReadingView();
      await browser.pause(3000);
    });

    it('RV template container baseline', async () => {
      const rvWidget = await browser.$(S.posTop);
      await rvWidget.waitForExist({ timeout: 10000 });
      const mismatch = await checkComponent(S.posTop, 'rv-dual-template-top');
      expect(mismatch).toBeLessThan(1.5);
    });

    after(async () => {
      await toggleReadingView();
      await browser.pause(1000);
    });
  });

  describe('mode switch comparison', () => {
    it('viewport baseline after LP→RV→LP round trip', async () => {
      await openFile(NOTES.topBottom);
      await waitForElement(S.top, 10000);
      await browser.pause(1000);
      await toggleReadingView();
      await browser.pause(2000);
      await toggleReadingView();
      await browser.pause(2000);
      const mismatch = await checkViewport('lp-after-roundtrip');
      expect(mismatch).toBeLessThan(2);
    });
  });
});
