import * as humnPlugin from './packages/prettier-plugin-humn/src/index.js'

const config = {
  plugins: [humnPlugin],
  semi: false,
  printWidth: 80,
  singleQuote: true,
}

export default config
