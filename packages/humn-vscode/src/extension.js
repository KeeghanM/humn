import * as humnPlugin from 'prettier-plugin-humn'
import * as prettier from 'prettier'
import * as vscode from 'vscode'

/**
 * This method is called when the extension is activated.
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
  // Register the formatter
  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    'humn',
    {
      async provideDocumentFormattingEdits(document) {
        const text = document.getText()

        try {
          // Format the text using Prettier and this plugin
          const formatted = await prettier.format(text, {
            ...(await prettier.resolveConfig(document.fileName)),
            // These must come after resolveConfig to prevent override
            parser: 'humn-parser',
            plugins: [humnPlugin],
          })

          // Calculate the range of the entire document
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

export function deactivate() {}
