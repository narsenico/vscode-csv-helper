/*!
 * vscode-csv-helper
 * https://github.com/narsenico/vscode-csv-helper
 *
 * Copyright (c) 2019, Gianfranco Caldi.
 * Released under the MIT License.
 *
 * Icon made by Darius Dan from www.flaticon.com
 */
const vscode = require('vscode');
const CSV_LANG_IDS = [
    'csv',
    'csv-comma',
    'csv-pipe',
    'csv-dollar',
    'csv-section-sign'
];
const SEPARATORS = {
    'csv': ';',
    'csv-comma': ',',
    'csv-pipe': '|',
    'csv-dollar': '$',
    'csv-section-sign': '§' // \u00A7
};
const DEFAULT_SEPARATOR = ';';

/**
 * note
 *
 * eventi cambio linguaggio
 * - closed
 * - opened
 * - changed
 *
 * eventi nuovo file
 * - opened
 * - changed
 *
 * impostare lingua a documento
 * - vscode.langauges.setTextDocument
 * */

 /**
  * TODO:
  *
  * - nuovo comando: rimuove o racchiude i campi in ""
  *
  */

class CSVHelper extends vscode.Disposable {
    constructor(callOnDispose) {
        super(callOnDispose);
        this._enabled = false;
        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this._onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(e => this._documentChanged(e ? e.document : undefined));
        this._onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(e => this._documentOpened(e));
        this._onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument(e => this._documentClosed(e));
        if (vscode.window.activeTextEditor) {
            this._documentChanged(vscode.window.activeTextEditor.document);
        }
    }

    _documentOpened(document) {
        console.log('opened', document && `${document.fileName}(${document.languageId})`);
        // se apro un documento CSV abilito tutto
        if (this.isCSV(document)) {
            !this._enabled && this.enable();
        }
    }

    _documentClosed(document) {
        console.log('closed', document && `${document.fileName}(${document.languageId})`);
        // se ho chiuso un documento CSV disabilito tutto
        if (this.isCSV(document)) {
            this._enabled && this.disable();
        }
    }

    _documentChanged(document) {
        console.log('changed', document && `${document.fileName}(${document.languageId})`);
        if (this.isCSV(document)) {
            !this._enabled && this.enable();
        } else {
            this._enabled && this.disable();
        }
    }

    /**
     * Individua il numero di colonna sul quale è posizionato il cursore
     * e lo riporta sulla barra stato.
     * Se la selezione coinvolge più colonne (anche se su righe diverse, non importa),
     * viene riportata la colonna di inzio selezione e quella di fine.
     *
     * Il carattere separatore è dato dal tipo di linguaggio associato al documento.
     *
     * @param {TextEditor} textEditor editor per il quale mostrare le info
     * @param {Selection[]} selections array di selezioni attive sull'editor,
     * viene considerata solo la prima selezione
     */
    _displayColInfo(textEditor, selections) {
        const separator = SEPARATORS[textEditor.document.languageId] || DEFAULT_SEPARATOR;
        // mi interessa solo la prima selezione
        // prelevo il testo dall'inizio della riga al primo carattere selezionato
        // quindi conto quanti caratteri separatori ci sono nel testo per calcolare l'indice della colonna
        const selection = selections[0];
        let col1, col2;
        // calcol la colonna di inizio selezione
        if (selection.start.character === 0) {
            col1 = 1;
        } else {
            col1 = this._calcCol(textEditor, selection.start, separator);
        }
        // calcolo la colonna di fine selezione
        if (selection.end.character === 0) {
            col2 = 1;
        } else if (selection.end.line === selection.start.line && selection.end.character === selection.start.character) {
            col2 = col1;
        } else {
            col2 = this._calcCol(textEditor, selection.end, separator);
        }
        // se inizio e fine coincidono riporto solo la prima colonna, altrimenti entrambe
        if (col2 === col1) {
            this._statusBar.text = `CSV c${col1}`;
        } else {
            this._statusBar.text = `CSV c${col1}~${col2}`;
        }
    }

    /**
     * Calcola il numero di colonna.
     * Vengono considerati i campi sia racchiusi tra "" che non.
     *
     * @param {TextEditor} textEditor editor sul quale operare il conteggio
     * @param {Position} position posizione (linea, num. carattere) da cui estrapolare il numero di colonna
     * @param {String} separator carattere separatore
     */
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
                // TODO: forse ha senso solo se " è il primo carattere non vuoto del campo
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

    /**
     * Valore se un documento è CSV in base al tipo di linguaggio associato ad esso.
     *
     * @param {TextDocument} document documento da valutare, può essere null/undefined
     * @returns true se è un documento CSV, false altrimenti
     */
    isCSV(document) {
        return (!!document && CSV_LANG_IDS.indexOf(document.languageId) >= 0);
    }

    /**
     * Abilita tutte le funzionalità dell'estensione.
     * Tutti i listeners sull'editor vengono creati e la barra stato mostrata.
     */
    enable() {
        console.log('-> enable');
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
        this._enabled = true;
    }

    /**
     * Disabilita tutte le funzionalità dell'estensione.
     * Tutti i listeners sull'editor venono dismessi, la barra stato è nascosta.
     */
    disable() {
        console.log('-> disable');
        if (this._onDidChangeTextEditorSelection) {
            this._onDidChangeTextEditorSelection.dispose();
            this._onDidChangeTextEditorSelection = null;
        }
        if (this._onDidChangeTextEditorViewColumn) {
            this._onDidChangeTextEditorViewColumn.dispose();
            this._onDidChangeTextEditorViewColumn = null;
        }
        this._statusBar && this._statusBar._visible && this._statusBar.hide();
        this._enabled = false;
    }

    /**
     * Estrae il primo carattere della selezione (che deve contenere quindi almeno un carattere).
     * Se il carattere è compreso tra i separatori per cui è disponibile un languageId, lo assegna al documento.
     *
     * @param {TextEditor} textEditor   editor al cui documento verrà assegnato un diverso separatore di campi
     */
    setSeparatorFromSelection(textEditor) {
        const selection = textEditor.selection;
        // considero il primo carattere della selezione
        const separator = textEditor.document.getText(
            new vscode.Range(selection.start, selection.end)
        ).charAt(0);
        console.log('setSeparatorFromSelection', separator);
        if (separator) {
            for (let key in SEPARATORS) {
                if (SEPARATORS[key] === separator) {
                    vscode.languages.setTextDocumentLanguage(textEditor.document, key);
                    return;
                }
            }
        }
        this._showError('Separator not supported. Available character separators are ' + Object.values(SEPARATORS).join(' '));
    }

    dispose() {
        this._onDidOpenTextDocument && this._onDidOpenTextDocument.dispose();
        this._onDidCloseTextDocument && this._onDidCloseTextDocument.dispose();
        this._onDidChangeTextEditorSelection && this._onDidChangeTextEditorSelection.dispose();
        this._onDidChangeTextEditorViewColumn && this._onDidChangeTextEditorViewColumn.dispose();
        this._onDidChangeActiveTextEditor && this._onDidChangeActiveTextEditor.dispose();
        this._statusBar && this._statusBar.dispose();
        this._enabled = false;
        super.dispose();
    }
}

// TODO: gestire meglio attivazione e disattivazione (chiamare CSVHelper.dispose()?)

let info;

exports.activate = (context) => {
    console.log('activate')
    !info && (info = new CSVHelper());
    context.subscriptions.push(info);
    vscode.commands.registerTextEditorCommand('extension.setSeparatorFromSelection', textEditor => info.setSeparatorFromSelection(textEditor));
};

exports.deactivate = () => {
    console.log('deactivate')
    info && info.dispose();
};