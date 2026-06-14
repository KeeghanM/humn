import humnCompiler from 'vite-plugin-humn'
import { defineConfig } from 'vite'
import path from 'path'

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
  plugins: [humnCompiler()],
})
