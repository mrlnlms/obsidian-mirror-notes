import { Editor, MarkdownView, Menu, Modal, Setting } from 'obsidian';
import MirrorUIPlugin from '../../main';
import { FileSuggest } from '../../utils/file-suggest';

// --- Modal ---
class InsertMirrorBlockModal extends Modal {
  private templatePath = '';
  private sourcePath = '';
  private onSubmit: (templatePath: string, sourcePath: string) => void;

  constructor(plugin: MirrorUIPlugin, onSubmit: (t: string, s: string) => void) {
    super(plugin.app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: 'Insert mirror block' });

    // Template path (com FileSuggest)
    new Setting(contentEl)
      .setName('Template')
      .setDesc('Path to the template note')
      .addText(cb => {
        new FileSuggest(this.app, cb.inputEl);
        cb.setPlaceholder('path/to/template.md')
          .onChange(v => this.templatePath = v);
      });

    // Source path (opcional, com FileSuggest)
    new Setting(contentEl)
      .setName('Source')
      .setDesc('Source note for variables (optional)')
      .addText(cb => {
        new FileSuggest(this.app, cb.inputEl);
        cb.setPlaceholder('path/to/source.md')
          .onChange(v => this.sourcePath = v);
      });

    // Botao de inserir
    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Insert')
        .setCta()
        .onClick(() => {
          this.onSubmit(this.templatePath, this.sourcePath);
          this.close();
        }));
  }

  onClose() {
    this.contentEl.empty();
  }
}

// --- Insert logic ---
function insertMirrorBlock(editor: Editor, templatePath: string, sourcePath: string): void {
  const cursor = editor.getCursor();
  const currentLine = editor.getLine(cursor.line);

  // Se cursor no meio de conteudo, quebrar linha antes
  const prefix = (currentLine.trim().length > 0 && cursor.ch > 0) ? '\n\n' : '\n';

  // Montar bloco
  let body = `template: ${templatePath}`;
  if (sourcePath) body += `\nsource: ${sourcePath}`;

  const block = `${prefix}\`\`\`mirror\n${body}\n\`\`\`\n`;

  if (editor.somethingSelected()) {
    editor.replaceSelection(block);
  } else {
    editor.replaceRange(block, cursor);
  }

  // Se template vazio, posicionar cursor em "template: " pra digitar
  if (!templatePath) {
    const prefixLines = prefix.split('\n').length - 1;
    const templateLine = cursor.line + prefixLines + 1;
    editor.setCursor({ line: templateLine, ch: 'template: '.length });
  }
}

// --- Registration ---
export function registerInsertMirrorBlock(plugin: MirrorUIPlugin): void {
  const openModal = (editor: Editor) => {
    new InsertMirrorBlockModal(plugin, (templatePath, sourcePath) => {
      insertMirrorBlock(editor, templatePath, sourcePath);
    }).open();
  };

  // Command palette
  plugin.addCommand({
    id: 'insert-mirror-block',
    name: 'Insert mirror block',
    editorCallback: (editor: Editor, view: MarkdownView) => openModal(editor),
  });

  // Editor context menu
  plugin.registerEvent(
    plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
      menu.addItem((item) => {
        item
          .setTitle('Insert mirror block')
          .setIcon('copy')
          .onClick(() => openModal(editor));
      });
    })
  );
}
