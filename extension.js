const vscode = require('vscode');

class CSVInfo {
    constructor() {
        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.displayInfo(vscode.window.activeTextEditor, vscode.window.activeTextEditor.selections);
        // TODO: devo capire anche se il file è un CSV
        vscode.window.onDidChangeActiveTextEditor(e => e ? this.displayInfo(e.textEditor, e.selections) : this._statusBar.hide());
        vscode.window.onDidChangeTextEditorSelection(e => e && this.displayInfo(e.textEditor, e.selections));
        vscode.window.onDidChangeTextEditorViewColumn(e => e && this.displayInfo(e.textEditor, e.selections));
    }

    displayInfo(textEditor, selections) {
        // TODO: in base a textEditor.document.languageId individuo il separatore (per default ';')

        // mi interessa solo la prima selezione
        // prelevo il testo dall'inizio della riga al primo carattere selezionato
        // quindi conto quanti caratteri separatori ci sono nel testo per calcolare l'indice della colonna
        const selection = selections[0];
        let col1, col2;
        if (selection.start.character === 0) {
            col1 = 1;
        } else {
            col1 = this.calcCol(textEditor, selection.start);
        }
        if (selection.end.character === 0) {
            col2 = 1;
        } else if (selection.end.line === selection.start.line && selection.end.character === selection.start.character) {
            col2 = col1;
        } else {
            col2 = this.calcCol(textEditor, selection.end);
        }
        if (col2 === col1) {
            this._statusBar.text = `CSV c${col1}`;
        } else {
            this._statusBar.text = `CSV c${col1}~${col2}`;
        }
        this._statusBar.show();
    }

    calcCol(textEditor, position) {
        const text = textEditor.document.getText(
            new vscode.Range(new vscode.Position(position.line, 0), position)
        );
        // TODO: gestire diversi separatori
        return (text.match(/;/g) || []).length + 1;
    }

    setSeparatorBySelection() {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.selection 
            && editor.selection.start.line === editor.selection.end.line
            && editor.selection.end.character === editor.selection.start.character + 1) {
                const separator = editor.document.lineAt(editor.selection.start.line).text.charAt(editor.selection.start.character);
            console.log('new separator', separator);
            // TODO: ** assegnare ** il nuovo separatore al documento
            // this.displayInfo(editor, editor.selections);
        } else {
            this.showError('Selection must contain exactly one separator character');
        }
    }

    showError(error) {
        if (vscode.window) {
            vscode.window.showErrorMessage(error);
        }
    }

    dispose() {
        this._statusBar.dispose();
    }
}

exports.activate = (context) => {
    const info = new CSVInfo()

    context.subscriptions.push(vscode.commands.registerCommand('extension.setSeparator', function () {
        info.setSeparatorBySelection();
    }));
    context.subscriptions.push(info);
};

exports.deactivate = () => {};