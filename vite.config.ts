import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: "Humn",
      fileName: (format) => `humn.${format === "es" ? "js" : "umd.js"}`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    sourcemap: true,
    minify: "esbuild",
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
});
