import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildLlmsFull } from "./src/llms-full.ts";

const root = import.meta.dirname;

/* /llms-full.txt is generated, never hand-written: the curated public/llms.txt
   followed by the readable text of every canonical page, in sitemap order. The
   page list comes from the sitemap, so a page registered there (step 5 of the
   checklist in AGENTS.md) is picked up with no further edit. It is served in dev
   too, so the route does not 404 locally while existing in production. */
function llmsFull(): Plugin {
  function render(): string {
    const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
    const pages = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), function (match) {
      const url = match[1];
      const path = new URL(url).pathname;
      const file = path === "/" ? "index.html" : path.slice(1) + ".html";
      return { url: url, html: readFileSync(resolve(root, file), "utf8") };
    });
    return buildLlmsFull(readFileSync(resolve(root, "public/llms.txt"), "utf8"), pages);
  }
  return {
    name: "semaphore:llms-full",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "llms-full.txt", source: render() });
    },
    configureServer(server) {
      server.middlewares.use("/llms-full.txt", function (_req, res) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(render());
      });
    },
  };
}

export default defineConfig({
  plugins: [llmsFull()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        404: resolve(root, "404.html"),
        tool: resolve(root, "tool.html"),
        usecases: resolve(root, "usecases.html"),
        faq: resolve(root, "faq.html"),
        privacy: resolve(root, "privacy.html"),
        zh: resolve(root, "zh.html"),
        "charsets/braille": resolve(root, "charsets/braille.html"),
        "charsets/standard": resolve(root, "charsets/standard.html"),
        "charsets/detailed": resolve(root, "charsets/detailed.html"),
        "charsets/blocks": resolve(root, "charsets/blocks.html"),
        "charsets/minimal": resolve(root, "charsets/minimal.html"),
        "charsets/binary": resolve(root, "charsets/binary.html"),
        "guides/readme-banner": resolve(root, "guides/readme-banner.html"),
        "guides/ssh-motd": resolve(root, "guides/ssh-motd.html"),
      },
    },
  },
});
