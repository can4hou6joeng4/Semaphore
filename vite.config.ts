import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        404: resolve(__dirname, "404.html"),
        tool: resolve(__dirname, "tool.html"),
        usecases: resolve(__dirname, "usecases.html"),
        faq: resolve(__dirname, "faq.html"),
        privacy: resolve(__dirname, "privacy.html"),
        zh: resolve(__dirname, "zh.html"),
        "charsets/braille": resolve(__dirname, "charsets/braille.html"),
        "guides/readme-banner": resolve(__dirname, "guides/readme-banner.html"),
      },
    },
  },
});
