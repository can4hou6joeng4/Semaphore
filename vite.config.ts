import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        404: resolve(import.meta.dirname, "404.html"),
        tool: resolve(import.meta.dirname, "tool.html"),
        usecases: resolve(import.meta.dirname, "usecases.html"),
        faq: resolve(import.meta.dirname, "faq.html"),
        privacy: resolve(import.meta.dirname, "privacy.html"),
        zh: resolve(import.meta.dirname, "zh.html"),
        "charsets/braille": resolve(import.meta.dirname, "charsets/braille.html"),
        "charsets/standard": resolve(import.meta.dirname, "charsets/standard.html"),
        "charsets/detailed": resolve(import.meta.dirname, "charsets/detailed.html"),
        "charsets/blocks": resolve(import.meta.dirname, "charsets/blocks.html"),
        "charsets/minimal": resolve(import.meta.dirname, "charsets/minimal.html"),
        "charsets/binary": resolve(import.meta.dirname, "charsets/binary.html"),
        "guides/readme-banner": resolve(import.meta.dirname, "guides/readme-banner.html"),
      },
    },
  },
});
