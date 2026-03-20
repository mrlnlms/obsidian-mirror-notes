describe('Suggest: AbstractInputSuggest smoke test', () => {
  it('plugin loads without errors after suggest migration', async () => {
    // Verify plugin loaded successfully (no crash from suggest migration)
    const loaded = await browser.execute((id: string) => {
      return !!(window as any).app?.plugins?.plugins?.[id];
    }, 'mirror-notes');
    expect(loaded).toBe(true);
  });

  it('settings tab opens without errors', async () => {
    await browser.executeObsidianCommand('app:open-settings');
    await browser.pause(1000);

    const tabs = await browser.$$('.vertical-tab-nav-item');
    let found = false;
    for (const tab of tabs) {
      const text = await tab.getText();
      if (text.includes('Mirror')) {
        await tab.click();
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    await browser.pause(500);

    // Verify settings rendered (main container exists)
    const container = await browser.$('.mirror-settings_main');
    expect(await container.isExisting()).toBe(true);

    await browser.keys('Escape');
    await browser.pause(500);
  });
});
