import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        tool: resolve(__dirname, "tool.html"),
        usecases: resolve(__dirname, "usecases.html"),
        faq: resolve(__dirname, "faq.html"),
      },
    },
  },
});
