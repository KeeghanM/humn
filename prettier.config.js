import * as humnPlugin from './packages/prettier-plugin-humn/src/index.js'

const config = {
  plugins: ['@trivago/prettier-plugin-sort-imports', humnPlugin],
  semi: false,
  printWidth: 80,
  singleQuote: true,
  importOrder: [
    '<THIRD_PARTY_MODULES>',
    '^[./]', // Other imports
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
}

export default config
