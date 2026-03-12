import { TFile, MarkdownRenderer, MarkdownRenderChild, Component, MarkdownView } from "obsidian";
import MirrorUIPlugin from "../../main";
import { Logger } from '../logger';
import { getEditorView } from '../utils/obsidianInternals';

export interface RenderContext {
  plugin: MirrorUIPlugin;
  templatePath: string;
  variables: Record<string, string>;
  sourcePath: string;
  container: HTMLElement;
  cacheKey: string;
  component?: Component;
}

// Caches compartilhados entre CM6 widget e code block processor
const lastRenderedContent = new Map<string, string>();
const renderingPromises = new Map<string, Promise<void>>();

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

export async function renderMirrorTemplate(ctx: RenderContext): Promise<void> {
  const { cacheKey } = ctx;

  // Guard: ja renderizando este cache key?
  if (renderingPromises.has(cacheKey)) {
    return renderingPromises.get(cacheKey);
  }

  const renderPromise = doRender(ctx);
  renderingPromises.set(cacheKey, renderPromise);
  try {
    await renderPromise;
  } finally {
    renderingPromises.delete(cacheKey);
  }
}

async function doRender(ctx: RenderContext): Promise<void> {
  const { plugin, templatePath, variables, sourcePath, container, cacheKey } = ctx;

  try {
    Logger.log(`Loading template: ${templatePath}`);
    const templateFile = plugin.app.vault.getAbstractFileByPath(templatePath);
    if (!templateFile || !(templateFile instanceof TFile)) {
      const errorMsg = `Template not found: ${templatePath}`;
      Logger.error(errorMsg);

      container.innerHTML = '';
      const errorDiv = container.createEl('div', { cls: 'mirror-template-error' });
      errorDiv.style.cssText = 'color: var(--text-error); pointer-events: auto; user-select: text; -webkit-user-select: text;';
      errorDiv.createEl('span', { text: errorMsg + ' ' });
      const link = errorDiv.createEl('a', {
        text: 'Open settings',
        attr: { style: 'cursor: pointer; text-decoration: underline;' }
      });
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        plugin.openSettingsToField(templatePath);
      });
      return;
    }

    Logger.log(`Template file found: ${templateFile.path}`);
    const templateContent = await plugin.app.vault.cachedRead(templateFile);
    Logger.log(`Template content length: ${templateContent.length}`);

    let processedContent = templateContent;
    if (variables && Object.keys(variables).length > 0) {
      processedContent = templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    }

    const contentHash = simpleHash(processedContent);
    const lastContent = lastRenderedContent.get(cacheKey);
    // Cache de hash so para CM6 widgets (container reusado). Code blocks (com component) sempre renderizam.
    if (!ctx.component && lastContent === contentHash && container.children.length > 0) {
      Logger.log('Content unchanged and container has content, skipping render');
      return;
    }

    lastRenderedContent.set(cacheKey, contentHash);
    container.innerHTML = "";
    const contentDiv = document.createElement("div");
    contentDiv.className = "markdown-rendered";
    contentDiv.style.cssText = "pointer-events: auto;";
    container.appendChild(contentDiv);

    const component = ctx.component ?? plugin;

    Logger.log(`Rendering markdown for: ${sourcePath}`);
    await MarkdownRenderer.renderMarkdown(
      processedContent,
      contentDiv,
      sourcePath,
      component
    );

    // Registrar no lifecycle do Obsidian (necessario pro Reading View)
    if (ctx.component) {
      const renderChild = new MarkdownRenderChild(contentDiv);
      ctx.component.addChild(renderChild);
    }

    Logger.log('Markdown rendered successfully');

    // DEBUG: Capturar computed styles para comparar com rendering nativo
    debugComputedStyles(contentDiv, cacheKey, plugin, templatePath);
  } catch (error) {
    Logger.error('Error rendering template:', error);
    container.innerHTML = `<div style="color: var(--text-error);">Error: ${error}</div>`;
  }
}

/** DEBUG temporário — captura computed styles de mirror + Reading View + Live Preview + diff triplo */
function debugComputedStyles(contentDiv: HTMLElement, cacheKey: string, plugin: MirrorUIPlugin, templatePath: string): void {
  // Delay pra garantir layout completo
  setTimeout(() => {
    const focusProps = ['margin-top', 'margin-bottom', 'padding-top', 'padding-bottom'];

    // Seletores para .markdown-rendered (mirror e Reading View)
    const htmlSelectors: Record<string, string> = {
      'h1': 'h1',
      'h2': 'h2',
      'h3': 'h3',
      'p': 'p',
      '.callout': '.callout',
      '.callout-content': '.callout-content',
      'hr': 'hr',
      'ul': 'ul',
      'li': 'li',
      'blockquote': 'blockquote',
      'pre': 'pre:not(.frontmatter)',
      '.markdown-rendered': '',
    };

    // Mapeamento CM6 Live Preview: classes CM6 → label equivalente
    const cm6Selectors: Record<string, string> = {
      'h1': '.HyperMD-header.HyperMD-header-1',
      'h2': '.HyperMD-header.HyperMD-header-2',
      'h3': '.HyperMD-header.HyperMD-header-3',
      'p': '.cm-line:not(.HyperMD-header):not(.HyperMD-list-line):not(.HyperMD-quote):not(.HyperMD-codeblock):not(.HyperMD-hr):not(.cm-active)',
      '.callout': '.cm-callout .callout',
      '.callout-content': '.cm-callout .callout-content',
      'hr': '.HyperMD-hr hr',
      'ul': '.HyperMD-list-line',
      'li': '.HyperMD-list-line',
      'blockquote': '.HyperMD-quote',
      'pre': '.HyperMD-codeblock',
    };

    type StyleMap = Record<string, Record<string, string>>;

    // --- Helper: extrair styles de um root com seletores customizaveis ---
    function getStyles(root: HTMLElement, sels: Record<string, string>): StyleMap {
      const result: StyleMap = {};
      for (const [label, selector] of Object.entries(sels)) {
        const el = selector ? root.querySelector(selector) as HTMLElement : root;
        if (!el) continue;
        const cs = window.getComputedStyle(el);
        const vals: Record<string, string> = {};
        for (const p of focusProps) vals[p] = cs.getPropertyValue(p);
        result[label] = vals;
      }
      return result;
    }

    // --- Helper: cadeia de ancestrais ---
    function getAncestorChain(el: HTMLElement, levels = 5): string {
      const chain: string[] = [];
      let current: HTMLElement | null = el;
      for (let i = 0; i < levels && current; i++) {
        const tag = current.tagName.toLowerCase();
        const cls = current.className ? `.${current.className.split(/\s+/).join('.')}` : '';
        chain.push(`${tag}${cls}`);
        current = current.parentElement;
      }
      return chain.join(' → ');
    }

    // --- Helper: formatar styles compactos ---
    function formatStyles(label: string, styles: StyleMap): string {
      const parts: string[] = [];
      for (const [sel, vals] of Object.entries(styles)) {
        const mt = vals['margin-top'] || '?';
        const mb = vals['margin-bottom'] || '?';
        const pt = vals['padding-top'] || '?';
        const pb = vals['padding-bottom'] || '?';
        parts.push(`${sel} → mt:${mt} mb:${mb} pt:${pt} pb:${pb}`);
      }
      return `[${label}] ${parts.join(' | ')}`;
    }

    // --- Helper: diff entre dois StyleMaps ---
    function logDiff(labelA: string, stylesA: StyleMap, labelB: string, stylesB: StyleMap): void {
      Logger.log(`[DIFF: ${labelA} vs ${labelB}] ---`);
      let hasMismatch = false;
      for (const [sel, valsA] of Object.entries(stylesA)) {
        const valsB = stylesB[sel];
        if (!valsB) {
          Logger.log(`  ${sel}: present in ${labelA}, missing in ${labelB}`);
          hasMismatch = true;
          continue;
        }
        for (const prop of focusProps) {
          const a = valsA[prop] || '?';
          const b = valsB[prop] || '?';
          if (a !== b) {
            Logger.log(`  ${sel} ${prop}: ${labelA}=${a} ${labelB}=${b} ← MISMATCH`);
            hasMismatch = true;
          }
        }
      }
      for (const sel of Object.keys(stylesB)) {
        if (!stylesA[sel]) {
          Logger.log(`  ${sel}: present in ${labelB}, missing in ${labelA}`);
          hasMismatch = true;
        }
      }
      if (!hasMismatch) Logger.log(`  all compared properties match!`);
    }

    // --- Helper: children info ---
    function logChildren(label: string, root: HTMLElement): void {
      const children = Array.from(root.children).slice(0, 8);
      const info = children.map((c, i) => {
        const el = c as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const cls = el.className ? `.${Array.from(el.classList).slice(0, 3).join('.')}` : '';
        const display = window.getComputedStyle(el).display;
        const mt = window.getComputedStyle(el).marginTop;
        return `[${i}] ${tag}${cls} (d:${display}, mt:${mt})`;
      });
      Logger.log(`[CHILDREN: ${label}] ${info.join(' | ')}`);
    }

    // =============================================
    // Encontrar leaves do template via workspace
    // =============================================
    let rvRoot: HTMLElement | null = null;  // Reading View
    let lpRoot: HTMLElement | null = null;  // Live Preview (.cm-content)

    plugin.app.workspace.iterateAllLeaves((leaf) => {
      if (rvRoot && lpRoot) return; // ja encontrou ambos
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) return;
      if (view.file?.path !== templatePath) return;

      const state = leaf.getViewState();
      const mode = state?.state?.mode;
      const source = state?.state?.source;

      if (mode === 'preview' && !rvRoot) {
        // Reading View — buscar .markdown-preview-sizer
        const container = view.containerEl;
        const sizer = container.querySelector('.markdown-preview-view .markdown-preview-sizer') as HTMLElement
          ?? container.querySelector('.markdown-preview-view') as HTMLElement;
        if (sizer && (sizer.querySelector('h1') || sizer.querySelector('p'))) {
          rvRoot = sizer;
        }
      } else if (mode === 'source' && source === false && !lpRoot) {
        // Live Preview — buscar .cm-content
        const editorView = getEditorView(view);
        if (editorView) {
          lpRoot = editorView.contentDOM as HTMLElement;
        }
      }
    });

    // === Capturar styles ===
    const mirrorStyles = getStyles(contentDiv, htmlSelectors);
    const rvStyles = rvRoot ? getStyles(rvRoot, htmlSelectors) : null;
    const lpStyles = lpRoot ? getStyles(lpRoot, cm6Selectors) : null;

    // === LOG ===
    Logger.log(`\n========== CSS DIAGNOSTIC: ${cacheKey} ==========`);
    Logger.log(`[template] ${templatePath}`);

    // Mirror
    Logger.log(formatStyles('MIRROR', mirrorStyles));
    logChildren('mirror', contentDiv);
    Logger.log(`[ANCESTORS: mirror] ${getAncestorChain(contentDiv)}`);

    // Reading View
    if (rvStyles && rvRoot) {
      Logger.log(formatStyles('NATIVE-RV', rvStyles));
      logChildren('native-rv', rvRoot);
      Logger.log(`[ANCESTORS: native-rv] ${getAncestorChain(rvRoot)}`);
    } else {
      Logger.log('[NATIVE-RV] not found — abra o template em Reading View');
    }

    // Live Preview
    if (lpStyles && lpRoot) {
      Logger.log(formatStyles('NATIVE-LP', lpStyles));
      logChildren('native-lp', lpRoot);
      Logger.log(`[ANCESTORS: native-lp] ${getAncestorChain(lpRoot)}`);
    } else {
      Logger.log('[NATIVE-LP] not found — abra o template em Live Preview');
    }

    // === Diff triplo ===
    if (rvStyles) {
      logDiff('mirror', mirrorStyles, 'native-rv', rvStyles);
    }
    if (lpStyles) {
      logDiff('mirror', mirrorStyles, 'native-lp', lpStyles);
    }
    if (rvStyles && lpStyles) {
      logDiff('native-rv', rvStyles, 'native-lp', lpStyles);
    }

    Logger.log(`========== END CSS DIAGNOSTIC ==========\n`);
  }, 500);
}

export function clearRenderCache(cacheKey?: string): void {
  if (cacheKey) {
    lastRenderedContent.delete(cacheKey);
  } else {
    lastRenderedContent.clear();
  }
}
