import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/extension.js'),
      fileName: () => 'extension.js',
      formats: ['cjs'], // VS Code extensions must be CommonJS
    },
    rollupOptions: {
      // Vital: 'vscode' module is provided by the host, never bundle it.
      external: ['vscode'],
    },
    target: 'node16',
    minify: true,
    sourcemap: true,
  },
  resolve: {
    // Ensure we prioritize source files if needed, though usually automatic
    extensions: ['.js', '.json'],
  },
})
