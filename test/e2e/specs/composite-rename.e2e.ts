import { openFile, waitForPlugin } from 'obsidian-e2e-visual-test-kit';
import { injectMirrorConfig } from '../helpers/mirror.js';
import e2eSettings from '../helpers/e2e-settings.json' with { type: 'json' };

/**
 * Composite test: rename folder/subtree with mirrors sharing LP/RV templates
 * and conditions on the same branch. Validates that updateSettingsPaths()
 * updates all references and mirrors continue rendering post-rename.
 */
describe('composite: folder rename with shared templates and conditions', () => {
  const OLD_FOLDER = 'rename-test';
  const NEW_FOLDER = 'renamed-test';
  const TEMPLATE_NAME = 'rename-tpl.md';
  const NOTE_NAME = 'rename-note.md';
  const LP_MARKER = 'E2E-RENAME-LP';

  /** Create the test folder structure at runtime */
  async function createTestFixtures(): Promise<void> {
    await browser.execute(
      async (folder: string, tplName: string, noteName: string, lpMarker: string) => {
        const vault = (window as any).app.vault;

        // Create folder
        try { await vault.createFolder(folder); } catch { /* may exist */ }

        // Create LP template
        await vault.create(
          `${folder}/${tplName}`,
          `> [!tip] ${lpMarker}\n> Folder: **${folder}** | Note: **{{title}}**`
        );

        // Create RV template (same folder)
        await vault.create(
          `${folder}/rv-${tplName}`,
          `> [!abstract] E2E-RENAME-RV\n> Folder: **${folder}** | Note: **{{title}}**`
        );

        // Create test note
        await vault.create(
          `${folder}/${noteName}`,
          '---\ntitle: Rename Test\ntype: e2e-rename\n---\n\n# Rename Test\n\nThis note tests folder rename.'
        );
      },
      OLD_FOLDER, TEMPLATE_NAME, NOTE_NAME, LP_MARKER
    );
    await browser.pause(2000);
  }

  /** Inject mirror config pointing to the test folder */
  async function injectRenameConfig(folder: string): Promise<void> {
    const renameMirror = {
      id: 'e2e-rename', name: 'E2E Rename', openview: false,
      enable_custom_live_preview_mode: true,
      custom_settings_live_preview_note: `${folder}/${TEMPLATE_NAME}`,
      custom_settings_live_preview_pos: 'above-title',
      enable_custom_preview_mode: true,
      custom_settings_preview_note: `${folder}/rv-${TEMPLATE_NAME}`,
      custom_settings_preview_pos: 'above-title',
      custom_settings_override: false,
      custom_view_overrides: { hideProps: false, readableLineLength: null, showInlineTitle: null },
      custom_show_container_border: true, custom_auto_update_paths: true,
      conditions: [
        { type: 'folder', negated: false, folderPath: folder },
      ],
      conditionLogic: 'all',
    };

    const settings = { ...e2eSettings, customMirrors: [...e2eSettings.customMirrors, renameMirror] };
    await injectMirrorConfig(settings);
  }

  /** Clean up test files (best-effort) */
  async function cleanupTestFiles(): Promise<void> {
    await browser.execute(async (oldFolder: string, newFolder: string) => {
      const vault = (window as any).app.vault;
      for (const folder of [oldFolder, newFolder]) {
        const f = vault.getAbstractFileByPath(folder);
        if (f) {
          try { await vault.delete(f, true); } catch { /* ignore */ }
        }
      }
    }, OLD_FOLDER, NEW_FOLDER);
    await browser.pause(1000);
  }

  before(async () => {
    await waitForPlugin('mirror-notes');
    await cleanupTestFiles();
    await createTestFixtures();
    await injectRenameConfig(OLD_FOLDER);
  });

  after(async () => {
    await cleanupTestFiles();
    // Restore clean E2E settings
    await injectMirrorConfig(e2eSettings);
  });

  it('mirror renders in the original folder', async () => {
    await openFile(`${OLD_FOLDER}/${NOTE_NAME}`);
    await browser.pause(5000);

    const hasMarker = await browser.execute((marker: string) => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      return leaf ? leaf.innerHTML.includes(marker) : false;
    }, LP_MARKER);
    expect(hasMarker).toBe(true);
  });

  it('rename folder updates template paths in settings', async () => {
    // Rename the folder
    await browser.execute(async (oldPath: string, newPath: string) => {
      const vault = (window as any).app.vault;
      const folder = vault.getAbstractFileByPath(oldPath);
      if (folder) await vault.rename(folder, newPath);
    }, OLD_FOLDER, NEW_FOLDER);
    await browser.pause(3000);

    // Check that settings were updated
    const paths = await browser.execute((pluginId: string) => {
      const plugin = (window as any).app.plugins.plugins[pluginId];
      if (!plugin) return null;
      const mirror = plugin.settings.customMirrors.find((m: any) => m.id === 'e2e-rename');
      if (!mirror) return null;
      return {
        lpTemplate: mirror.custom_settings_live_preview_note,
        rvTemplate: mirror.custom_settings_preview_note,
        folderCondition: mirror.conditions[0]?.folderPath,
      };
    }, 'mirror-notes');

    expect(paths).not.toBeNull();
    expect(paths!.lpTemplate).toBe(`${NEW_FOLDER}/${TEMPLATE_NAME}`);
    expect(paths!.rvTemplate).toBe(`${NEW_FOLDER}/rv-${TEMPLATE_NAME}`);
    expect(paths!.folderCondition).toBe(NEW_FOLDER);
  });

  it('mirror still renders after folder rename', async () => {
    // Open the note at its new path
    await openFile(`${NEW_FOLDER}/${NOTE_NAME}`);
    await browser.pause(5000);

    const hasMarker = await browser.execute((marker: string) => {
      const leaf = document.querySelector('.workspace-leaf.mod-active');
      return leaf ? leaf.innerHTML.includes(marker) : false;
    }, LP_MARKER);
    expect(hasMarker).toBe(true);
  });
});
