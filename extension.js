const vscode = require('vscode');
const LANG_CSV = 'csv';

class CSVInfo {
    constructor() {
        this._enabled = false;
        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this._onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(() => this.onDidOpenTextDocument());
        this._onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => this.onDidChangeActiveTextEditor());
        this.onDidChangeActiveTextEditor();
    }

    onDidOpenTextDocument() {
        this.onDidChangeActiveTextEditor();
    }

    onDidChangeActiveTextEditor() {
        const textEditor = vscode.window.activeTextEditor;
        // elaboro la posizione solo se è un documento CSV
        if (textEditor && textEditor.document && textEditor.document.languageId === LANG_CSV) {
            // se ancora non l'ho fatto attivo i listener
            if (!this._onDidChangeTextEditorSelection) {
                this._onDidChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(e => e && this.displayInfo(e.textEditor, e.selections));
            }
            if (!this._onDidChangeTextEditorViewColumn) {
                this._onDidChangeTextEditorViewColumn = vscode.window.onDidChangeTextEditorViewColumn(e => e && this.displayInfo(e.textEditor, e.selections));
            }
            this._enabled = true;
            this.displayInfo(textEditor, textEditor.selections);
        } else {
            // nascondo la barra e disabilito i listener
            this._enabled = false;
            this._statusBar.hide();            
        }
    }

    displayInfo(textEditor, selections) {
        if (!this._enabled) return;
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
            console.log('new separator', separator, editor.document.id);
            // TODO: ** assegnare ** il nuovo separatore al documento
            //  volevo usare editor.id per tenere traccia dell'editor, ma l'id cambia al salvataggio
            // this.displayInfo(editor, editor.selections);
        } else {
            this.showError('Selection must contain exactly one separator character');
        }
    }

    toggleHeader() {
        const editor = vscode.window.activeTextEditor;
        // TODO: considerare la prima riga come intestazinoe
        console.log('toggleHeader', editor.id);
    }

    showError(error) {
        if (vscode.window) {
            vscode.window.showErrorMessage(error);
        }
    }

    dispose() {
        this._statusBar && this._statusBar.dispose();
        this._onDidOpenTextDocument && this._onDidOpenTextDocument.dispose();
        this._onDidChangeActiveTextEditor && this._onDidChangeActiveTextEditor.dispose();
        this._onDidChangeTextEditorSelection && this._onDidChangeTextEditorSelection.dispose();
        this._onDidChangeTextEditorViewColumn && this._onDidChangeTextEditorViewColumn.dispose();
    }
}

exports.activate = (context) => {
    const info = new CSVInfo()

    context.subscriptions.push(vscode.commands.registerCommand('extension.setSeparator', function () {
        info.setSeparatorBySelection();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.toggleHeader', function () {
        info.toggleHeader();
    }));
    context.subscriptions.push(info);
};

exports.deactivate = () => {};