import { ViewPlugin, EditorView, ViewUpdate } from "@codemirror/view";
import { TFile, MarkdownRenderer } from 'obsidian';
import { mirrorStateField, toggleWidgetEffect } from './mirrorState';
import MirrorUIPlugin from '../../main';

export function createMirrorViewPlugin(plugin: MirrorUIPlugin) {
  return ViewPlugin.fromClass(
    class {
      private container: HTMLElement | null = null;
      private currentState: any = null;
      
      constructor(private view: EditorView) {
        // Aguardar um momento para o DOM estabilizar
        setTimeout(() => this.updateWidget(), 100);
      }

      update(update: ViewUpdate) {
        const newState = update.state.field(mirrorStateField, false);
        
        // Verificar se algo mudou
        if (JSON.stringify(this.currentState) !== JSON.stringify(newState)) {
          this.currentState = newState;
          this.updateWidget();
        }
      }

      updateWidget() {
        const state = this.view.state.field(mirrorStateField, false);
        
        // Remover widget se não deve mostrar
        if (!state?.enabled || !state.templatePath || state.frontmatter?.type !== 'project') {
          this.removeWidget();
          return;
        }

        // Criar ou atualizar widget
        if (!this.container) {
          this.createWidget();
        }
        
        this.renderContent(state);
      }

      createWidget() {
        // Remover widget existente se houver
        this.removeWidget();

        // Criar novo container
        this.container = document.createElement('div');
        this.container.className = 'mirror-ui-widget';
        this.container.style.cssText = `
          background: var(--background-secondary);
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
          position: relative;
          min-height: 80px;
        `;

        // Encontrar onde inserir
        const editorDOM = this.view.dom;
        const parent = editorDOM.parentElement;
        
        if (parent) {
          // Inserir ANTES do editor, não dentro
          parent.insertBefore(this.container, editorDOM);
        }
      }

      async renderContent(state: any) {
        if (!this.container) return;

        // Mostrar loading
        this.container.innerHTML = `
          <div style="opacity: 0.5;">Loading template...</div>
        `;

        try {
          // Buscar arquivo do template
          const templateFile = plugin.app.vault.getAbstractFileByPath(state.templatePath);
          
          if (!templateFile || !(templateFile instanceof TFile)) {
            this.container.innerHTML = `
              <div style="color: var(--text-error);">
                Template not found: ${state.templatePath}
              </div>
            `;
            return;
          }

          // Ler template
          const templateContent = await plugin.app.vault.read(templateFile);
          
          // Processar variáveis
          const processedContent = templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return state.frontmatter[key] || match;
          });

          // Limpar container
          this.container.innerHTML = '';

          // Criar div para conteúdo
          const contentDiv = document.createElement('div');
          this.container.appendChild(contentDiv);

          // Renderizar markdown
          const activeFile = plugin.app.workspace.getActiveFile();
          if (activeFile) {
            await MarkdownRenderer.renderMarkdown(
              processedContent,
              contentDiv,
              activeFile.path,
              plugin
            );
          }

          // Adicionar botão fechar
          this.addCloseButton();

        } catch (error) {
          console.error('Error rendering template:', error);
          this.container.innerHTML = `
            <div style="color: var(--text-error);">
              Error: ${error}
            </div>
          `;
        }
      }

      addCloseButton() {
        if (!this.container) return;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          opacity: 0.5;
          padding: 5px 10px;
          line-height: 1;
        `;

        closeBtn.onmouseover = () => { closeBtn.style.opacity = '1'; };
        closeBtn.onmouseout = () => { closeBtn.style.opacity = '0.5'; };
        
        closeBtn.onclick = () => {
          this.view.dispatch({
            effects: toggleWidgetEffect.of(false)
          });
        };

        this.container.appendChild(closeBtn);
      }

      removeWidget() {
        if (this.container) {
          this.container.remove();
          this.container = null;
        }
      }

      destroy() {
        this.removeWidget();
      }
    }
  );
}