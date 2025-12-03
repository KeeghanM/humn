# Prettier Plugin for Humn

This package provides a Prettier plugin for formatting `.humn` files. It formats the content of `<script>`, `<style>`, and template blocks.

## Installation

Install `prettier` and the plugin:

```bash
npm install prettier prettier-plugin-humn --save-dev
# or
yarn add prettier prettier-plugin-humn --dev
```

## Usage

The plugin will be automatically loaded by Prettier if it's in the same `package.json` file.

You can then run Prettier from the command line:

```bash
npx prettier --write "**/*.humn"
```

Or, if you use a Prettier configuration file (e.g., `.prettierrc.json`), you can add a `plugins` entry, though this is often not necessary with modern versions of Prettier.

```json
{
  "plugins": ["prettier-plugin-humn"]
}
```

For more information, please see the [main project README](https://github.com/KeeghanM/humn).