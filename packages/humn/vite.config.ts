import humnCompiler from 'vite-plugin-humn'
import terser from '@rollup/plugin-terser'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  resolve: {
    alias: {
      humn: path.resolve(__dirname, './src/index.js'),
    },
  },
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
