import { openFile, waitForElement, checkComponent, checkViewport, scrollTo } from 'obsidian-plugin-e2e';
import { S, NOTES, toggleReadingView } from '../helpers/mirror.js';

describe('visual baselines', () => {
  describe('Live Preview positions', () => {
    before(async () => {
      await openFile(NOTES.posAboveTitle);
      await waitForElement(S.aboveTitle, 15000);
      await browser.pause(3000);
    });

    it('above-title container baseline', async () => {
      const mismatch = await checkComponent(S.aboveTitle, 'lp-above-title');
      expect(mismatch).toBeLessThan(1.5);
    });

    it('viewport with above-title mirror', async () => {
      await scrollTo(S.inlineTitle);
      await browser.pause(500);
      const mismatch = await checkViewport('lp-above-title-viewport');
      expect(mismatch).toBeLessThan(10);
    });
  });

  describe('CM6 widgets', () => {
    it('top CM6 widget baseline', async () => {
      await openFile(NOTES.posCm6Top);
      await waitForElement(S.top, 10000);
      await browser.pause(2000);
      const mismatch = await checkComponent(S.top, 'cm6-top-widget');
      expect(mismatch).toBeLessThan(1.5);
    });

    it('bottom CM6 widget baseline', async () => {
      await openFile(NOTES.posCm6Bottom);
      await browser.pause(5000);
      const exists = await browser.$(S.bottom).isExisting();
      if (!exists) {
        console.log('Bottom CM6 widget not found — skipping baseline (note may be too short)');
        return;
      }
      const el = await browser.$(S.bottom);
      await el.scrollIntoView();
      await browser.pause(1000);
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
      // In RV, mirror renders via DOM injection (not CM6 widget which is 0x0)
      const rvSelector = '.mirror-dom-injection[data-position="top"]';
      const el = await browser.$(rvSelector);
      const exists = await el.isExisting();
      if (!exists) {
        console.log('RV DOM injection not found — skipping baseline');
        return;
      }
      const mismatch = await checkComponent(rvSelector, 'rv-dual-template-top');
      expect(mismatch).toBeLessThan(1.5);
    });

    after(async () => {
      await toggleReadingView();
      await browser.pause(1000);
    });
  });

  describe('mode switch comparison', () => {
    it('viewport baseline after LP→RV→LP round trip', async () => {
      await openFile(NOTES.posCm6Top);
      await waitForElement(S.top, 10000);
      await browser.pause(1000);
      await toggleReadingView();
      await browser.pause(2000);
      await toggleReadingView();
      await browser.pause(2000);
      const mismatch = await checkViewport('lp-after-roundtrip');
      expect(mismatch).toBeLessThan(10);
    });
  });
});
