import { TFile, MarkdownRenderer, MarkdownRenderChild, Component } from "obsidian";
import MirrorUIPlugin from "../../main";
import { Logger } from '../logger';

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
    debugComputedStyles(contentDiv, cacheKey);
  } catch (error) {
    Logger.error('Error rendering template:', error);
    container.innerHTML = `<div style="color: var(--text-error);">Error: ${error}</div>`;
  }
}

/** DEBUG temporário — captura computed styles de mirror + nativo + ancestors + diff */
function debugComputedStyles(contentDiv: HTMLElement, cacheKey: string): void {
  // Delay pra garantir layout completo (nativo pode demorar um pouco mais)
  setTimeout(() => {
    const focusProps = ['margin-top', 'margin-bottom', 'padding-top', 'padding-bottom'];
    const selectors: Record<string, string> = {
      'h1': 'h1',
      'h2': 'h2',
      'p': 'p',
      '.callout': '.callout',
      '.callout-content': '.callout-content',
      'hr': 'hr',
      'ul': 'ul',
      'li': 'li',
      'blockquote': 'blockquote',
      'pre': 'pre',
      '.markdown-rendered': '',
    };

    // --- Helper: extrair styles compactos de um root ---
    function getStyles(root: HTMLElement): Record<string, Record<string, string>> {
      const result: Record<string, Record<string, string>> = {};
      for (const [label, selector] of Object.entries(selectors)) {
        const el = selector ? root.querySelector(selector) as HTMLElement : root;
        if (!el) continue;
        const cs = window.getComputedStyle(el);
        const vals: Record<string, string> = {};
        for (const p of focusProps) vals[p] = cs.getPropertyValue(p);
        result[label] = vals;
      }
      return result;
    }

    // --- Helper: cadeia de ancestrais (até 5 níveis) ---
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
    function formatStyles(label: string, styles: Record<string, Record<string, string>>): string {
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

    // === A) Mirror container ===
    const mirrorStyles = getStyles(contentDiv);

    // === B) Nativo: buscar rendering nativo em qualquer view (Reading/Live Preview) ===
    let nativeRoot: HTMLElement | null = null;
    // Tentar múltiplos seletores: Reading View e Live Preview
    const nativeCandidates = [
      ...Array.from(document.querySelectorAll('.markdown-preview-view .markdown-preview-sizer')),
      ...Array.from(document.querySelectorAll('.markdown-preview-view .markdown-rendered')),
      ...Array.from(document.querySelectorAll('.markdown-reading-view .markdown-rendered')),
    ];
    for (const view of nativeCandidates) {
      // Ignorar nossos próprios containers mirror
      if (view.closest('.mirror-ui-widget') || view.closest('.mirror-codeblock-container') || view.closest('.mirror-dom-injection')) continue;
      // Pegar o primeiro que tenha conteúdo real (h1 ou p)
      if (view.querySelector('h1') || view.querySelector('p')) {
        nativeRoot = view as HTMLElement;
        break;
      }
    }
    const nativeStyles = nativeRoot ? getStyles(nativeRoot) : null;

    // === Log compacto ===
    Logger.log(`\n========== CSS DIAGNOSTIC: ${cacheKey} ==========`);
    Logger.log(formatStyles('MIRROR', mirrorStyles));
    if (nativeStyles) {
      Logger.log(formatStyles('NATIVE', nativeStyles));
    } else {
      Logger.log('[NATIVE] not found — abra o template em outra aba (Reading View)');
    }

    // === C) Filhos diretos do .markdown-rendered (pra entender :first-child) ===
    const children = Array.from(contentDiv.children).slice(0, 5);
    const childInfo = children.map((c, i) => {
      const el = c as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const cls = el.className ? `.${el.className.split(/\s+/).join('.')}` : '';
      const display = window.getComputedStyle(el).display;
      const mt = window.getComputedStyle(el).marginTop;
      return `[${i}] ${tag}${cls} (display:${display}, mt:${mt})`;
    });
    Logger.log(`[CHILDREN: mirror] ${childInfo.join(' | ')}`);
    if (nativeRoot) {
      const nativeChildren = Array.from(nativeRoot.children).slice(0, 5);
      const nChildInfo = nativeChildren.map((c, i) => {
        const el = c as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const cls = el.className ? `.${el.className.split(/\s+/).join('.')}` : '';
        const display = window.getComputedStyle(el).display;
        const mt = window.getComputedStyle(el).marginTop;
        return `[${i}] ${tag}${cls} (display:${display}, mt:${mt})`;
      });
      Logger.log(`[CHILDREN: native] ${nChildInfo.join(' | ')}`);
    }

    // === D) Ancestor chains ===
    Logger.log(`[ANCESTORS: mirror] ${getAncestorChain(contentDiv)}`);
    if (nativeRoot) {
      Logger.log(`[ANCESTORS: native] ${getAncestorChain(nativeRoot)}`);
    }

    // === D) Diff automático ===
    if (nativeStyles) {
      Logger.log('[DIFF] --- comparing mirror vs native ---');
      let hasMismatch = false;
      for (const [sel, mirrorVals] of Object.entries(mirrorStyles)) {
        const nativeVals = nativeStyles[sel];
        if (!nativeVals) {
          Logger.log(`[DIFF] ${sel}: present in mirror, missing in native`);
          hasMismatch = true;
          continue;
        }
        for (const prop of focusProps) {
          const mv = mirrorVals[prop] || '?';
          const nv = nativeVals[prop] || '?';
          if (mv !== nv) {
            Logger.log(`[DIFF] ${sel} ${prop}: mirror=${mv} native=${nv} (MISMATCH)`);
            hasMismatch = true;
          }
        }
      }
      // Check selectors in native but not in mirror
      for (const sel of Object.keys(nativeStyles)) {
        if (!mirrorStyles[sel]) {
          Logger.log(`[DIFF] ${sel}: present in native, missing in mirror`);
          hasMismatch = true;
        }
      }
      if (!hasMismatch) {
        Logger.log('[DIFF] all compared properties match!');
      }
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
