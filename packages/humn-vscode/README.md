# Humn Language Support for VSCode

This extension provides language support for Humn single-file components in Visual Studio Code.

## Features

- **Syntax highlighting:** Highlights `.humn` files, including template markup, embedded JavaScript/TSX expressions, `<script>` blocks and `<style>` blocks.
- **Language server:** Starts the Humn language server for `.humn` files.
- **Completions:** Suggests script symbols in template expressions and imported components after `<`.
- **Go to definition:** Supports local script/template symbols and imported component tags such as `<Button />`.
- **Hover docs:** Shows docs for Humn APIs such as `Cortex`, `persist`, `resource`, `resourceSynapse`, `onMount`, `onCleanup` and `mount`.
- **References and rename:** Finds and renames identifiers across the script block and template expressions.
- **Semantic highlighting:** Marks identifiers inside template expressions so JavaScript variables are not treated as plain template text.
- **Diagnostics:** Reports Humn structure issues, unknown component tags, unclosed expressions/tags, and render-path side effects such as direct `fetch()` calls in component scripts.
- **Region-aware comments:** `Ctrl+/` or `Cmd+/` uses `//` in `<script>`, `/* */` in `<style>`, and `<!-- -->` in template markup.
- **Snippets:** Includes snippets for components, props, lifecycle hooks, lists, conditionals, Cortexes and resources.

## Architecture

The extension is intentionally split into two parts:

- `humn-vscode` owns VS Code activation, syntax grammar, snippets, keybindings and editor commands.
- `humn-language-server` owns parsing, diagnostics, completions, definitions, hover, references, rename and semantic tokens.

The language server builds a virtual TypeScript/TSX view of each `.humn` file by preserving the script block and template expression offsets. This lets TypeScript power JavaScript completions and definitions while Humn-specific parsing handles component tags and framework rules.

## Installation

You can install this extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/).

1. Open Visual Studio Code.
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Search for "Humn Language Support".
4. Click "Install".

Alternatively, you can find the extension on the [Marketplace Website](https://marketplace.visualstudio.com/items?itemName=HumanSideOfCode.humn-vscode) and click "Install" there.

## Contributing

If you'd like to contribute to the development of this extension, you can do so from the main [Humn monorepo](https://github.com/KeeghanM/humn).
