import * as prettier from 'prettier'
import humnPlugin from 'prettier-plugin-humn'
import * as vscode from 'vscode'

/**
 * This method is called when the extension is activated.
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    'humn',
    {
      /**
       * Provides formatting edits for a given document.
       * @param {vscode.TextDocument} document
       * @returns {Promise<vscode.TextEdit[]>}
       */
      async provideDocumentFormattingEdits(document) {
        const text = document.getText()

        try {
          const options = await resolveConfig(document.fileName)

          // This handles differences between CommonJS and ESM imports
          const plugin = humnPlugin.default || humnPlugin

          const formatted = await prettier.format(text, {
            ...options,
            // These must come after resolveConfig to prevent override
            parser: 'humn-parser',
            plugins: [plugin],
          })

          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length),
          )

          // Replace the whole document with the formatted text
          return [vscode.TextEdit.replace(fullRange, formatted)]
        } catch (error) {
          console.error('Humn formatting failed:', error)
          vscode.window.showErrorMessage(
            'Humn formatting failed: ' + error.message,
          )
          return []
        }
      },
    },
  )

  context.subscriptions.push(formatter)
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {}
