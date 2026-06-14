const vscode = require('vscode')
const path = require('node:path')
const {
  LanguageClient,
  State,
  TransportKind,
} = require('vscode-languageclient/node')
const {
  getRegionAtOffset,
  parseHumn,
} = require('humn-language-server/src/core.cjs')

let client

async function activate(context) {
  const serverModule = path.join(__dirname, 'server.cjs')
  const outputChannel = vscode.window.createOutputChannel(
    'Humn Language Server',
  )

  context.subscriptions.push(outputChannel)
  outputChannel.appendLine(`Starting Humn language server: ${serverModule}`)

  client = new LanguageClient(
    'humnLanguageServer',
    'Humn Language Server',
    {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { execArgv: ['--nolazy', '--inspect=6009'] },
      },
    },
    {
      documentSelector: [{ scheme: 'file', language: 'humn' }],
      outputChannel,
      traceOutputChannel: outputChannel,
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher('**/*.humn'),
      },
    },
  )

  context.subscriptions.push(client)
  context.subscriptions.push(
    client.onDidChangeState((event) => {
      outputChannel.appendLine(
        `Language server state: ${stateName(event.oldState)} -> ${stateName(
          event.newState,
        )}`,
      )
    }),
  )

  try {
    await client.start()
    outputChannel.appendLine('Humn language server started.')
  } catch (error) {
    const message = formatError(error)
    outputChannel.appendLine(
      `Failed to start Humn language server:\n${message}`,
    )
    outputChannel.show(true)
    void vscode.window.showErrorMessage(
      'Humn language server failed to start. See the Humn Language Server output for details.',
    )
    throw error
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('humn.toggleComment', toggleComment),
  )
}

function deactivate() {
  const currentClient = client
  client = undefined
  return currentClient?.stop()
}

function stateName(state) {
  return State[state] || String(state)
}

function formatError(error) {
  if (error instanceof Error) return error.stack || error.message
  return String(error)
}

async function toggleComment() {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== 'humn') return

  const source = editor.document.getText()
  const parsed = parseHumn(source)
  const selections = [...editor.selections].sort(
    (left, right) =>
      editor.document.offsetAt(right.start) -
      editor.document.offsetAt(left.start),
  )

  await editor.edit((edit) => {
    for (const selection of selections) {
      const offset = editor.document.offsetAt(selection.start)
      const region = getRegionAtOffset(parsed, offset)
      if (region === 'script') {
        toggleLineComment(editor.document, edit, selection)
      } else if (region === 'style') {
        toggleBlockComment(editor.document, edit, selection, '/*', '*/')
      } else {
        toggleBlockComment(editor.document, edit, selection, '<!--', '-->')
      }
    }
  })
}

function toggleLineComment(document, edit, selection) {
  const startLine = selection.start.line
  const endLine =
    selection.isEmpty || selection.end.character > 0
      ? selection.end.line
      : selection.end.line - 1
  const lines = []

  for (let line = startLine; line <= endLine; line++) {
    const text = document.lineAt(line).text
    if (text.trim()) lines.push({ line, text })
  }

  const shouldUncomment =
    lines.length > 0 &&
    lines.every(({ text }) => text.trimStart().startsWith('//'))

  for (const { line, text } of lines) {
    const indent = text.match(/^\s*/)[0].length
    if (shouldUncomment) {
      const commentIndex = text.indexOf('//', indent)
      edit.delete(
        new vscode.Range(
          line,
          commentIndex,
          line,
          commentIndex + 2 + (text[commentIndex + 2] === ' ' ? 1 : 0),
        ),
      )
    } else {
      edit.insert(new vscode.Position(line, indent), '// ')
    }
  }
}

function toggleBlockComment(document, edit, selection, open, close) {
  const range = selection.isEmpty
    ? document.lineAt(selection.start.line).range
    : selection
  const text = document.getText(range)
  const trimmedStart = text.match(/^\s*/)[0].length
  const trimmedEnd = text.length - text.trimEnd().length
  const trimmed = text.trim()

  if (trimmed.startsWith(open) && trimmed.endsWith(close)) {
    const start = document.offsetAt(range.start) + trimmedStart
    const end = document.offsetAt(range.end) - trimmedEnd
    edit.delete(
      new vscode.Range(
        document.positionAt(end - close.length),
        document.positionAt(end),
      ),
    )
    edit.delete(
      new vscode.Range(
        document.positionAt(start),
        document.positionAt(start + open.length),
      ),
    )
    return
  }

  edit.insert(range.start, open)
  edit.insert(range.end, close)
}

module.exports = { activate, deactivate }
