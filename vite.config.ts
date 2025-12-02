import terser from '@rollup/plugin-terser'
import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

import humnCompiler from './compiler/index.js'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'Humn',
      fileName: (format) => `humn.${format === 'es' ? 'js' : 'umd.js'}`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        compact: isProduction,
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  plugins: [
    humnCompiler(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
    isProduction &&
      terser({
        format: {
          comments: false,
        },
        compress: {
          drop_console: true,
        },
      }),
  ],
})
