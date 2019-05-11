const vscode = require('vscode');
const CSV_LANG_IDS = [
    'csv',
    'csv-semicolon',
    'csv-comma',
    'csv-pipe',
    'csv-dollar'
];
const SEPARATORS = {
    'csv': ';',
    'csv-semicolon': ';',
    'csv-comma': ',',
    'csv-pipe': '|',
    'csv-dollar': '$',
};
const DEFAULT_SEPARATOR = ';';

class CSVHelper {
    constructor() {
        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this._onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(e => e && this._documentChanged(e.document));
        if (vscode.window.activeTextEditor) {
            this._documentChanged(vscode.window.activeTextEditor.document);
        }

        // TODO: intercettare il cambio di languageId
    }

    _documentChanged(document) {
        if (document && CSV_LANG_IDS.indexOf(document.languageId) >= 0) {
            if (!this._onDidChangeTextEditorSelection) {
                this._onDidChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(e =>
                    e && this._displayColInfo(e.textEditor, e.selections));
            }
            if (!this._onDidChangeTextEditorViewColumn) {
                this._onDidChangeTextEditorViewColumn = vscode.window.onDidChangeTextEditorViewColumn(e =>
                    e && this._displayColInfo(e.textEditor, e.selections));
            }
            this._statusBar && !this._statusBar._visible && this._statusBar.show();
            this._displayColInfo(vscode.window.activeTextEditor, vscode.window.activeTextEditor.selections);
        } else {
            if (this._onDidChangeTextEditorSelection) {
                this._onDidChangeTextEditorSelection.dispose();
                this._onDidChangeTextEditorSelection = null;
            }
            if (this._onDidChangeTextEditorViewColumn) {
                this._onDidChangeTextEditorViewColumn.dispose();
                this._onDidChangeTextEditorViewColumn = null;
            }
            this._statusBar && this._statusBar._visible && this._statusBar.hide();
        }
    }

    _displayColInfo(textEditor, selections) {
        const separator = SEPARATORS[textEditor.document.languageId] || DEFAULT_SEPARATOR;
        // mi interessa solo la prima selezione
        // prelevo il testo dall'inizio della riga al primo carattere selezionato
        // quindi conto quanti caratteri separatori ci sono nel testo per calcolare l'indice della colonna
        const selection = selections[0];
        let col1, col2;
        if (selection.start.character === 0) {
            col1 = 1;
        } else {
            col1 = this._calcCol(textEditor, selection.start, separator);
        }
        if (selection.end.character === 0) {
            col2 = 1;
        } else if (selection.end.line === selection.start.line && selection.end.character === selection.start.character) {
            col2 = col1;
        } else {
            col2 = this._calcCol(textEditor, selection.end, separator);
        }
        if (col2 === col1) {
            this._statusBar.text = `CSV c${col1}`;
        } else {
            this._statusBar.text = `CSV c${col1}~${col2}`;
        }
        this._statusBar.show();
    }

    _calcCol(textEditor, position, separator) {
        // considero il testo dall'inizio della riga fino alla posizione
        const text = textEditor.document.getText(
            new vscode.Range(new vscode.Position(position.line, 0), position)
        );
        // scorro i caratteri (lo so fa cagare) perché il separatore racchiuso tra "" non deve essere contato
        let inquote = false;
        let count = 1;
        for (let ch of text) {
            switch (ch) {
                case '"':
                    inquote = !inquote;
                    break;
                case separator:
                    !inquote && ++count;
                    break;
            }
        }
        return count;
    }

    _showError(error) {
        if (vscode.window) {
            vscode.window.showErrorMessage(error);
        }
    }

    dispose() {
        this._onDidChangeTextEditorSelection && this._onDidChangeTextEditorSelection.dispose();
        this._onDidChangeTextEditorViewColumn && this._onDidChangeTextEditorViewColumn.dispose();
        this._onDidChangeActiveTextEditor && this._onDidChangeActiveTextEditor.dispose();
        this._statusBar && this._statusBar.dispose();
    }
}

// TODO: gestire meglio attivazione e disattivazione (chiamare CSVHelper.dispose()?)

exports.activate = (context) => {
    const info = new CSVHelper();
    context.subscriptions.push(info);
};

exports.deactivate = () => { };