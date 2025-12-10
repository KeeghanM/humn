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
      external: ['vscode', 'prettier'],
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
