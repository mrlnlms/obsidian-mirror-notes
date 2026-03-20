import { TFile, MarkdownRenderChild } from "obsidian";
import MirrorUIPlugin from "../../main";
import { parseBlockContent } from './blockParser';
import { renderMirrorTemplate, clearRenderChild, clearRenderCache } from './templateRenderer';
import { getBlockViewId } from './domInjector';
import { Logger } from '../dev/logger';

export function registerMirrorCodeBlock(plugin: MirrorUIPlugin): void {
  plugin.registerMarkdownCodeBlockProcessor("mirror", async (source, el, ctx) => {
    const config = parseBlockContent(source);

    if ('error' in config) {
      el.createEl('div', {
        text: config.error,
        cls: 'mirror-code-block mirror-block-error'
      });
      Logger.error(`Mirror block error: ${config.error}`);
      return;
    }

    // Container estilizado (sem .mirror-ui-widget pra nao herdar regras CM6)
    const showBorder = plugin.settings.global_show_container_border;
    const container = el.createEl('div', { cls: `mirror-code-block${showBorder ? ' mirror-container-styled' : ''}` });

    // Registrar no lifecycle do Obsidian (necessario pro Reading View)
    const child = new MarkdownRenderChild(container);
    ctx.addChild(child);

    // Per-pane viewId: traverse DOM from el to find pane container.
    // Falls back to 'default' in tests/detached DOM (preserves single-pane behavior).
    const viewId = getBlockViewId(el);

    // Cache key unico por bloco PER PANE (viewId + path + line)
    // Fallback to unique suffix if sectionInfo is null (rare — startup before metadataCache)
    const sectionInfo = ctx.getSectionInfo(el);
    const lineId = sectionInfo?.lineStart ?? `u${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cacheKey = `block-${viewId}-${ctx.sourcePath}-${lineId}`;

    // Funcao de render (reusada no re-render cross-note)
    const doRender = async () => {
      const variables = await resolveVariables(plugin, config.inlineVars, config.sourcePath, ctx.sourcePath);
      await renderMirrorTemplate({
        plugin,
        templatePath: config.templatePath,
        variables,
        sourcePath: ctx.sourcePath,
        container,
        cacheKey,
        component: child
      });
    };

    // Chave unica por bloco PER PANE (usada em ambos registries)
    const blockKey = `${viewId}:${ctx.sourcePath}::${lineId}`;

    // Template dependency (todos os code blocks — re-render quando template muda)
    plugin.templateDeps.register(config.templatePath, blockKey, doRender);
    child.register(() => {
      plugin.templateDeps.unregisterBlock(blockKey);
    });

    // Clean up render caches when block is destroyed (prevents memory leak)
    child.register(() => {
      clearRenderChild(cacheKey);
      clearRenderCache(cacheKey);
    });

    // Source dependency (so se tem source externo — re-render quando source muda)
    if (config.sourcePath) {
      plugin.sourceDeps.register(config.sourcePath, ctx.sourcePath, blockKey, doRender);
      child.register(() => {
        plugin.sourceDeps.unregisterBlock(blockKey);
      });
    }

    // Self-dependency (re-render quando frontmatter da propria nota muda)
    if (!config.sourcePath) {
      plugin.sourceDeps.register(ctx.sourcePath, ctx.sourcePath, blockKey, doRender);
      child.register(() => {
        plugin.sourceDeps.unregisterBlock(blockKey);
      });
    }

    await doRender();
  });
}

export async function resolveVariables(
  plugin: MirrorUIPlugin,
  inlineVars: Record<string, string>,
  sourcePath: string | undefined,
  currentPath: string
): Promise<Record<string, unknown>> {
  // Frontmatter da nota atual
  const currentFile = plugin.app.vault.getAbstractFileByPath(currentPath);
  const currentFm = (currentFile instanceof TFile)
    ? plugin.app.metadataCache.getFileCache(currentFile)?.frontmatter ?? {}
    : {};

  // Frontmatter da nota source (se especificada)
  let sourceFm: Record<string, unknown> = {};
  if (sourcePath) {
    const sourceFile = plugin.app.vault.getAbstractFileByPath(sourcePath);
    if (sourceFile instanceof TFile) {
      sourceFm = plugin.app.metadataCache.getFileCache(sourceFile)?.frontmatter ?? {};
    } else {
      Logger.warn(`Source note not found: ${sourcePath}`);
    }
  }

  // Merge: inline > source > current (inline tem prioridade)
  return { ...currentFm, ...sourceFm, ...inlineVars };
}
