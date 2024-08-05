
```dataviewjs
// Defina os caminhos dos arquivos .md que você deseja carregar para cada modo
const livePreviewFilePath = "templates/ui-preview-mode.md";
const previewFilePath = "templates/ui-live_preview-mode.md";

// Função para carregar e exibir o conteúdo do arquivo
async function loadFileContent(filePath) {
    const content = await app.vault.adapter.read(filePath);
    dv.el("div", content);
}

// Função para verificar o modo de visualização
function getMode() {
    const activeLeaf = app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view) {
        return activeLeaf.view.getViewType() === 'markdown' && activeLeaf.view.getMode();
    }
    return null;
}

// Verificar o modo de visualização e carregar o arquivo correspondente
const mode = getMode();
if (mode === "preview") {
    loadFileContent(previewFilePath);
} else if (mode === "source") {
    loadFileContent(livePreviewFilePath);
} else {
    dv.span("Modo de visualização não reconhecido ou não foi possível determinar o modo.");
}

```
