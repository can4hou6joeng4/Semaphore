import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHARSETS } from "./ascii-engine";
import indexHtml from "../index.html?raw";
import toolHtml from "../tool.html?raw";
import usecasesHtml from "../usecases.html?raw";
import faqHtml from "../faq.html?raw";
import privacyHtml from "../privacy.html?raw";
import notFoundHtml from "../404.html?raw";
import brailleHtml from "../charsets/braille.html?raw";
import standardHtml from "../charsets/standard.html?raw";
import detailedHtml from "../charsets/detailed.html?raw";
import blocksHtml from "../charsets/blocks.html?raw";
import minimalHtml from "../charsets/minimal.html?raw";
import binaryHtml from "../charsets/binary.html?raw";
import readmeBannerHtml from "../guides/readme-banner.html?raw";
import sshMotdHtml from "../guides/ssh-motd.html?raw";
import zhHtml from "../zh.html?raw";
import landingSource from "./landing.ts?raw";
import demoSource from "./demo.ts?raw";
import brailleSource from "./main-braille.ts?raw";
import zhSource from "./main-zh.ts?raw";
import readmeBannerSource from "./main-readme-banner.ts?raw";
import sshMotdSource from "./main-ssh-motd.ts?raw";
import sharedSource from "./shared.ts?raw";
import toolSource from "./tool.ts?raw";
import engineSource from "./ascii-engine.ts?raw";
import sitemapXml from "../public/sitemap.xml?raw";
import llmsTxt from "../public/llms.txt?raw";
import readme from "../README.md?raw";
import readmeCn from "../README_CN.md?raw";
import robotsTxt from "../public/robots.txt?raw";
import redirectsTxt from "../public/_redirects?raw";
import headersTxt from "../public/_headers?raw";

/* Vite 8 returns an empty string for `*.css?raw` under vitest; read the file. */
const terminalCss = readFileSync(new URL("./terminal.css", import.meta.url), "utf8");
const fallbackFavicon = readFileSync(
  new URL("../public/favicon.ico", import.meta.url), "latin1"
);

const pages = [
  { path: "index.html", canonical: "https://semaphore.bobochang.cn/", html: indexHtml },
  { path: "tool.html", canonical: "https://semaphore.bobochang.cn/tool", html: toolHtml },
  { path: "usecases.html", canonical: "https://semaphore.bobochang.cn/usecases", html: usecasesHtml },
  { path: "faq.html", canonical: "https://semaphore.bobochang.cn/faq", html: faqHtml },
  { path: "privacy.html", canonical: "https://semaphore.bobochang.cn/privacy", html: privacyHtml },
  { path: "charsets/braille.html", canonical: "https://semaphore.bobochang.cn/charsets/braille", html: brailleHtml },
  { path: "charsets/standard.html", canonical: "https://semaphore.bobochang.cn/charsets/standard", html: standardHtml },
  { path: "charsets/detailed.html", canonical: "https://semaphore.bobochang.cn/charsets/detailed", html: detailedHtml },
  { path: "charsets/blocks.html", canonical: "https://semaphore.bobochang.cn/charsets/blocks", html: blocksHtml },
  { path: "charsets/minimal.html", canonical: "https://semaphore.bobochang.cn/charsets/minimal", html: minimalHtml },
  { path: "charsets/binary.html", canonical: "https://semaphore.bobochang.cn/charsets/binary", html: binaryHtml },
  { path: "guides/readme-banner.html", canonical: "https://semaphore.bobochang.cn/guides/readme-banner", html: readmeBannerHtml },
  { path: "guides/ssh-motd.html", canonical: "https://semaphore.bobochang.cn/guides/ssh-motd", html: sshMotdHtml },
  { path: "zh.html", canonical: "https://semaphore.bobochang.cn/zh", html: zhHtml }
];

const byPath = new Map(pages.map(function (page) { return [page.path, page.html]; }));

function jsonLd(html: string): unknown[] {
  return Array.from(html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  ), function (match) { return JSON.parse(match[1]); });
}

function schemaTypes(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const node = value as Record<string, unknown>;
  const own = typeof node["@type"] === "string" ? [node["@type"] as string] : [];
  const graph = Array.isArray(node["@graph"])
    ? node["@graph"].flatMap(schemaTypes)
    : [];
  return own.concat(graph);
}

function headContent(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match ? match[1] : "";
}

describe("SEO page contract", () => {
  it("ships the conventional root favicon fallback crawlers request", function () {
    const header = Array.from(fallbackFavicon.slice(0, 6), function (char) {
      return char.charCodeAt(0);
    });
    expect(header).toEqual([
      0x00, 0x00, 0x01, 0x00, 0x03, 0x00
    ]);
  });

  it.each([
    ["zh", zhSource],
    ["README banner", readmeBannerSource],
    ["SSH MOTD", sshMotdSource]
  ])("loads the shared design system from the %s entry", function (_name, source) {
    expect(source).toContain('import "./terminal.css";');
    expect(source).toContain('import "./shared";');
  });

  it("allows the README guide steps to shrink around scrollable code", function () {
    expect(readmeBannerHtml).toMatch(
      /\.guide-steps\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/
    );
  });

  it.each(pages)("keeps $path canonical metadata aligned", function (page) {
    const html = page.html;
    const title = headContent(html, /<title>([^<]+)<\/title>/);
    const description = headContent(html, /<meta name="description" content="([^"]+)">/);
    expect(html).toContain('<link rel="canonical" href="' + page.canonical + '">');
    expect(html).toContain('<meta property="og:url" content="' + page.canonical + '">');
    expect(html).toContain('<meta property="og:title" content="' + title + '">');
    expect(html).toContain('<meta property="og:description" content="' + description + '">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain('<meta name="twitter:title" content="' + title + '">');
    expect(html).toContain('<meta name="twitter:description" content="' + description + '">');
    expect(html).toMatch(
      /<meta name="twitter:image" content="https:\/\/semaphore\.bobochang\.cn\/static\/social-card[^"]*\.jpg">/
    );
    expect(html).toMatch(
      /<meta property="og:image" content="https:\/\/semaphore\.bobochang\.cn\/static\/social-card[^"]*\.jpg">/
    );
    expect(title).not.toBe("");
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(function () { jsonLd(html); }).not.toThrow();
  });

  it("uses Open Graph locale values in language_TERRITORY format", function () {
    pages.filter(function (page) { return page.path !== "zh.html"; })
      .forEach(function (page) {
        expect(page.html).toContain(
          '<meta property="og:locale" content="en_US">'
        );
      });
    expect(zhHtml).toContain('<meta property="og:locale" content="zh_CN">');
    expect(zhHtml).toContain(
      '<meta property="og:locale:alternate" content="en_US">'
    );
    pages.forEach(function (page) {
      const locales = Array.from(
        page.html.matchAll(/<meta property="og:locale(?:[:][^"]+)?" content="([^"]+)">/g),
        function (match) { return match[1]; }
      );
      locales.forEach(function (locale) {
        expect(locale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
      });
    });
  });

  it.each(pages)("keeps $path heading levels sequential", function (page) {
    const levels = Array.from(page.html.matchAll(/<h([1-6])\b/g), function (match) {
      return Number(match[1]);
    });
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach(function (level, index) {
      expect(level - levels[index]).toBeLessThanOrEqual(1);
    });
  });

  it.each(pages)("gives every image in $path a source", function (page) {
    const images = Array.from(page.html.matchAll(/<img\b[^>]*>/g), function (match) {
      return match[0];
    });
    images.forEach(function (image) {
      expect(image).toMatch(/\s(?:src|srcset)="[^"]+"/);
    });
  });

  it.each(pages)("keeps accessible names off generic pre elements in $path", function (page) {
    const namedPreElements = Array.from(
      page.html.matchAll(/<pre\b[^>]*aria-label="[^"]+"[^>]*>/g),
      function (match) { return match[0]; }
    );
    namedPreElements.forEach(function (pre) {
      expect(pre).toContain('role="img"');
    });
  });

  it("keeps visual tool output out of the accessibility tree", function () {
    expect(toolHtml).toContain(
      'aria-label="ASCII output viewport — no source loaded yet" tabindex="0">'
    );
    expect(toolHtml).toContain(
      '<pre class="ascii-pre is-empty" id="out" aria-hidden="true">'
    );
    expect(toolSource).toContain('els.outBody.setAttribute("aria-label",');
    expect(toolSource).not.toContain('els.out.setAttribute("aria-label",');
  });

  it.each(pages)("gives every section in $path a heading or landmark name", function (page) {
    const sections = Array.from(
      page.html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g),
      function (match) { return { attributes: match[1], content: match[2] }; }
    );

    sections.forEach(function (section) {
      const contentWithoutNestedSections = section.content
        .replace(/<(?:article|aside|nav)\b[^>]*>[\s\S]*?<\/(?:article|aside|nav)>/g, "");
      const hasHeading = /<h[1-6]\b/.test(contentWithoutNestedSections);
      const hasLandmarkName = /\saria-label="[^"]+"/.test(section.attributes);

      expect(hasHeading || hasLandmarkName).toBe(true);
    });
  });

  it("keeps the share-card preview valid between renders", function () {
    expect(toolHtml).toMatch(
      /<img id="cardPreview"\s+src="data:image\/gif;base64,[^"]+"/
    );
    expect(toolSource).toContain("els.cardPreview.src = CARD_PREVIEW_PLACEHOLDER");
    expect(toolSource).not.toContain('els.cardPreview.removeAttribute("src")');
  });

  it("releases the share-card preview busy state when the modal closes", function () {
    expect(toolSource).toContain('const CARD_PREVIEW_STATE = "rendering card preview…";');
    expect(toolSource).toContain('els.cardPreview.setAttribute("aria-busy", "true")');
    expect(toolSource).toContain('els.cardPreview.setAttribute("aria-busy", "false")');
    expect(toolSource).toContain("finishOwnedState(CARD_PREVIEW_STATE);");
    expect(toolSource).toContain("if (cardPreviewBusy) finishCardPreview();");
  });

  it("keeps asynchronous PNG exports bound to their click-time snapshot", function () {
    expect(toolSource).toContain("let pngExportSeq = 0;");
    expect(toolSource).toContain("let cardDownloadSeq = 0;");
    expect(toolSource).toContain('const filename = base() + "-ascii.png";');
    expect(toolSource).toContain('const filename = base() + "-card.png";');
    expect(toolSource).toContain("AsciiEngine.renderPNG(result, {");
    expect(toolSource).toContain("ShareCard.pngBlob(result, opts).then(");
    expect(toolSource).toContain(
      "if (seq === pngExportSeq) finishOwnedState(PNG_EXPORT_STATE);"
    );
    expect(toolSource).toContain(
      "if (seq === cardDownloadSeq) finishOwnedState(CARD_DOWNLOAD_STATE);"
    );
    expect(toolSource).not.toContain('Util.download(base() + "-ascii.png"');
    expect(toolSource).not.toContain('Util.download(base() + "-card.png"');
  });

  it("uses the current charset advance for conversion, fit and regular PNGs", function () {
    expect(toolSource).toMatch(
      /cellAspect:\s*1 \/ Util\.advanceRatio\(\s*AsciiEngine\.advanceSample\(params\.charset\)\)/
    );
    expect(toolSource).toContain(
      "sample: AsciiEngine.advanceSample(state.result.charset)"
    );
    expect(toolSource).toContain(
      "min: 1"
    );
    expect(landingSource).toContain(
      "cellAspect: 1 / Util.advanceRatio(sample)"
    );
    expect(landingSource).toContain(
      "sample: sample"
    );
    expect(landingSource).toContain(
      "max: innerH / res.rows"
    );
    expect(demoSource).toContain(
      "cellAspect: 1 / Util.advanceRatio(sample)"
    );
    expect(demoSource).toContain(
      "sample: AsciiEngine.advanceSample(res.charset)"
    );
    expect(brailleSource).toContain(
      "cellAspect: 1 / Util.advanceRatio(BRAILLE_SAMPLE)"
    );
    expect(brailleSource).toContain(
      "sample: BRAILLE_SAMPLE"
    );
    expect(sharedSource).toContain("Util.advanceRatio(opts.sample)");
    expect(engineSource).toContain(
      "ctx.measureText(advanceSample(result.charset)).width"
    );
  });

  it("keeps the newest source selection when asynchronous loads finish out of order", function () {
    expect(toolSource).toContain("let sourceSeq = 0;");
    expect(toolSource).toContain("return ++sourceSeq;");
    expect(toolSource.match(/const seq = beginSourceIntent\(\);/g)).toHaveLength(2);
    expect(toolSource.match(/if \(seq !== sourceSeq\) return;/g)).toHaveLength(3);
    expect(toolSource).toContain(
      '(img) => setSource(img, file.name || "pasted.png", seq)'
    );
    expect(toolSource).toContain('(img) => setSource(img, "portrait.webp", seq)');
    expect(toolSource).toContain('setSource(planet!, "planet.png", beginSourceIntent())');
  });

  it("names the drop target from its visible label", function () {
    expect(toolHtml).toContain(
      'aria-labelledby="dropTitle dropHint"'
    );
    expect(toolHtml).toContain(
      '<div class="drop-title" id="dropTitle">[ drop image here ]</div>'
    );
    expect(toolHtml).toContain(
      '<div class="fs-xs text-faint" id="dropHint">or click to browse'
    );
    expect(toolHtml).not.toContain(
      'aria-label="choose an image to convert to ASCII"'
    );
  });

  it("puts the conversion workflow before secondary tool navigation", function () {
    expect(toolHtml).toContain(
      "Drop a photo and copy plain-text ASCII. Tune it live; nothing leaves this tab or gets uploaded."
    );
    expect(toolHtml.indexOf('data-screen-label="tool-workbench"')).toBeLessThan(
      toolHtml.indexOf('data-screen-label="tool-guides"')
    );
    expect(toolHtml).toContain(
      '<nav class="row" aria-label="ASCII converter guides">'
    );
    expect(toolHtml).toContain('<a href="/">overview</a>');
    expect(toolHtml).toContain('<a href="/charsets/braille">braille ASCII guide</a>');
    expect(toolHtml).toContain('<a href="/faq">FAQ</a>');
    expect(toolHtml).not.toContain("New here? Skim the");
  });

  it("uses the stronger text tone for file metadata", function () {
    expect(toolHtml).toContain('class="fs-xs text-dim" id="srcMeta"');
  });

  it("reserves the default source and desktop workbench geometry", function () {
    expect(toolHtml).toContain('class="term" id="srcInfo"');
    expect(toolHtml).toMatch(
      /id="srcThumb" src="\/static\/sample-portrait\.webp"\s+width="1100" height="1069"/
    );
    expect(toolHtml).toContain("portrait.webp — 1100×1069");
    expect(toolHtml).toMatch(
      /\.source-thumb\s*\{\s*width: auto; height: auto; max-width: 100%; max-height: 110px;\s*margin-inline: auto;\s*\}/
    );
    expect(toolHtml).toContain("height: calc(100vh - var(--header-h) - var(--statusbar-h));");
    expect(toolHtml).toContain(".tool-side > * { flex-shrink: 0; }");
    expect(toolHtml).toContain("min-width: 0; min-height: 0; overflow: hidden;");
    expect(toolHtml).toContain("flex: 1; min-height: 0; overflow: auto;");
    expect(toolHtml).toContain("scrollbar-gutter: stable;");
    expect(toolHtml).toMatch(
      /@media \(max-width: 960px\)[\s\S]*?height: auto; min-height: 0;/
    );
  });

  it("keeps desktop overflow regions keyboard reachable", function () {
    expect(toolHtml).toContain(
      '<aside class="tool-side" aria-label="source and parameters" tabindex="0">'
    );
    expect(toolHtml).toMatch(
      /id="outBody" role="region"\s+aria-label="ASCII output viewport — no source loaded yet" tabindex="0"/
    );
    expect(toolHtml).toContain(
      ".tool-side:focus-visible, .out-body:focus-visible { outline-offset: -2px; }"
    );
  });

  it("keeps boot failure metadata stable without showing a stale portrait", function () {
    expect(toolSource).toMatch(
      /if \(atBoot\) \{\s+els\.srcThumb\.classList\.add\("is-unavailable"\);\s+els\.srcThumb\.alt = "";\s+els\.srcMeta\.textContent = "default sample unavailable";/
    );
    expect(toolSource).toMatch(
      /function setSource[\s\S]*?classList\.remove\("is-unavailable"\);[\s\S]*?els\.srcThumb\.width = d\.w;\s+els\.srcThumb\.height = d\.h;/
    );
  });

  it("keeps the empty output placeholder readable", function () {
    expect(toolHtml).toContain(
      "font-size: var(--fs-s); color: var(--ink-dim); text-shadow: none;"
    );
  });

  it("exposes unavailable export commands as natively disabled", function () {
    ["copy", "savetxt", "sharecard", "savepng", "cardSvg", "cardPng"].forEach(function (id) {
      expect(toolHtml).toContain('id="' + id + '" type="button" disabled');
    });
    expect(toolHtml).not.toContain("is-disabled");
    expect(toolSource).toContain("button.disabled = !on");
    expect(toolSource).not.toContain('classList.toggle("is-disabled"');
  });

  it("only enables export commands for the current rendered result", function () {
    expect(toolSource).toMatch(
      /function beginSourceIntent[\s\S]*?closeCard\(\);\s+sourceIntentPending = true;\s+setExports\(false\);[\s\S]*?return \+\+sourceSeq;/
    );
    expect(toolSource).toContain(
      "[els.copy, els.savetxt, els.sharecard, els.savepng, els.cardSvg, els.cardPng]"
    );
    expect(toolSource.match(/setExports\(!!state\.result\);/g)).toHaveLength(2);
    expect(toolSource).toMatch(
      /function requestConvert[\s\S]*?if \(!state\.source \|\| sourceIntentPending\) return;\s+setExports\(false\);\s+if \(pendingFrame\) return;/
    );
    expect(toolSource).toMatch(
      /function renderResult[\s\S]*?setExports\(true\);/
    );
  });

  it("keeps an older pending conversion from unlocking a newer source intent", function () {
    expect(toolSource).toContain("let sourceIntentPending = false;");
    expect(toolSource).toMatch(
      /function setSource[\s\S]*?sourceIntentPending = false;\s+requestConvert\(\);/
    );
    expect(toolSource).toMatch(
      /function runConvert\(\): void \{\s+if \(!state\.source \|\| sourceIntentPending\) return;/
    );
    expect(toolSource.match(
      /if \(seq !== sourceSeq\) return;\s+sourceIntentPending = false;/g
    )).toHaveLength(2);
  });

  it("keeps source loading state when parameters change mid-load", function () {
    expect(toolSource).toMatch(
      /function requestConvert\(\): void \{\s+if \(!state\.source \|\| sourceIntentPending\) return;\s+setExports\(false\);/
    );
    expect(toolSource).toMatch(
      /function setSource[\s\S]*?sourceIntentPending = false;\s+requestConvert\(\);/
    );
  });

  it("reports clipboard success only after a copy path succeeds", function () {
    expect(sharedSource).toContain(
      'if (!document.execCommand("copy")) throw new Error("clipboard copy failed");'
    );
    expect(sharedSource).toContain("return Promise.reject(err);");
    expect(toolSource).toContain('() => Site.toast("copied to clipboard ✓")');
    expect(toolSource).toContain('() => Site.toast("clipboard copy failed ✕")');
    expect(toolSource).not.toContain(
      'Util.copyText(state.result.text).then(() => Site.toast("copied to clipboard ✓"));'
    );
  });

  it("scopes status announcements to state and toast messages", function () {
    expect(sharedSource).not.toContain('bar.setAttribute("role", "status")');
    expect(sharedSource).toContain(
      '<div class="sb-seg" role="status" aria-live="polite" aria-atomic="true">'
    );
    expect(sharedSource).toContain(
      '<span class="sb-dot" data-sb-dot aria-hidden="true"></span>'
    );
    expect(sharedSource).toContain('seg.setAttribute("role", "status")');
    expect(sharedSource).toContain('seg.setAttribute("aria-live", "polite")');
    expect(sharedSource).toContain('seg.setAttribute("aria-atomic", "true")');
    expect(sharedSource).toContain("right.prepend(seg);\n    seg.textContent = msg;");
  });

  it("keeps shared chrome readable on narrow viewports", function () {
    expect(sharedSource).toContain('"sb-metric--dimensions"');
    expect(sharedSource).toContain('"sb-metric--charset"');
    expect(sharedSource).toContain('"sb-metric--timing"');
    expect(sharedSource).toContain('const classes = "sb-seg sb-metric"');
    expect(terminalCss).toMatch(
      /\.sb-right\s*\{[^}]*min-width: 0; overflow: hidden;/
    );
    expect(terminalCss).toMatch(
      /@media \(max-width: 440px\)[\s\S]*?\.sb-right \.sb-metric--timing,[\s\S]*?\.sb-right \.sb-toast ~ \.sb-metric \{ display: none; \}/
    );
    expect(terminalCss).toMatch(
      /@media \(max-width: 370px\)[\s\S]*?\.sb-right \.sb-metric--charset \{ display: none; \}/
    );
    expect(terminalCss).toMatch(
      /@media \(max-width: 360px\)[\s\S]*?\.site-head \.rail \{ gap: 8px; padding-inline: 10px; \}[\s\S]*?\.brand-name \{ display: none; \}[\s\S]*?\.statusbar:has\(\.sb-toast\) > \.sb-seg\[role="status"\] \{ display: none; \}/
    );
    expect(terminalCss).toMatch(
      /@media \(max-width: 480px\)[\s\S]*?\.kicker \{ white-space: normal; overflow-wrap: anywhere; \}/
    );
    expect(terminalCss).toMatch(
      /@media \(max-width: 360px\)[\s\S]*?\.btn \{ max-width: 100%; white-space: normal; text-align: center; \}/
    );
  });

  it("describes the converter on the page where it runs", () => {
    const types = jsonLd(toolHtml).flatMap(schemaTypes);
    expect(types).toContain("WebPage");
    expect(types).toContain("BreadcrumbList");
    /* The application is ONE entity. /tool points at the site-wide #webapp node
       instead of declaring a second WebApplication, which would split the app
       across two URLs in a consumer's entity graph. */
    expect(types).not.toContain("WebApplication");
    const schema = jsonLd(toolHtml)[0] as { "@graph"?: Record<string, unknown>[] };
    const page = (schema["@graph"] || []).find(function (node) {
      return node["@type"] === "WebPage";
    });
    expect(page?.mainEntity).toEqual({
      "@id": "https://semaphore.bobochang.cn/#webapp"
    });
  });

  it("keeps the visible privacy revision date aligned with structured data", function () {
    const schema = jsonLd(privacyHtml)[0] as { "@graph"?: Record<string, unknown>[] };
    const page = (schema["@graph"] || []).find(function (node) {
      return node["@type"] === "WebPage";
    });
    const modified = String(page?.dateModified || "");
    const visibleDate = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(modified + "T00:00:00Z"));

    expect(modified).not.toBe("");
    expect(privacyHtml).toContain("Last updated: " + visibleDate + ".");
  });

  it("declares the preferred site name on the home page", function () {
    const schema = jsonLd(indexHtml)[0] as { "@graph"?: Record<string, unknown>[] };
    const graph = schema["@graph"] || [];
    const website = graph.find(function (node) { return node["@type"] === "WebSite"; });
    const application = graph.find(function (node) {
      return node["@type"] === "WebApplication";
    });
    const person = graph.find(function (node) { return node["@type"] === "Person"; });

    expect(website).toEqual({
      "@type": "WebSite",
      "@id": "https://semaphore.bobochang.cn/#website",
      url: "https://semaphore.bobochang.cn/",
      name: "Semaphore",
      inLanguage: ["en", "zh-CN"],
      publisher: { "@id": "https://semaphore.bobochang.cn/#person" },
      sameAs: ["https://github.com/can4hou6joeng4/Semaphore"]
    });
    /* A single-author tool competes on trust, so the operator is a real node the
       rest of the graph points at — not an anonymous site with no responsible
       party. The identity must match the one published in llms.txt. */
    expect(person).toEqual({
      "@type": "Person",
      "@id": "https://semaphore.bobochang.cn/#person",
      name: "bobochang",
      url: "https://bobochang.cn",
      sameAs: ["https://github.com/can4hou6joeng4"]
    });
    expect(llmsTxt).toContain("Name: bobochang");
    expect(llmsTxt).toContain("Site: https://bobochang.cn");
    expect(application).toMatchObject({
      "@id": "https://semaphore.bobochang.cn/#webapp",
      isPartOf: { "@id": "https://semaphore.bobochang.cn/#website" },
      author: { "@id": "https://semaphore.bobochang.cn/#person" },
      sameAs: ["https://github.com/can4hou6joeng4/Semaphore"]
    });
    expect(application).not.toHaveProperty("alternateName");
    pages.forEach(function (page) {
      expect(page.html).not.toContain('"aggregateRating"');
    });
  });

  it("keeps the Search Console ownership proof on the home page", function () {
    expect(indexHtml).toMatch(
      /<meta name="google-site-verification" content="[A-Za-z0-9_-]+">/
    );
  });

  it("keeps the home title concise and aligned with converter intent", function () {
    const title = headContent(indexHtml, /<title>([^<]+)<\/title>/);
    expect(title).toContain("Image to ASCII Art Converter");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("uses standard use cases spelling in descriptive labels", function () {
    const title = headContent(usecasesHtml, /<title>([^<]+)<\/title>/);
    expect(title).toContain("ASCII Art Use Cases");
    expect(title.length).toBeLessThanOrEqual(60);
    expect(usecasesHtml.match(/"name": "ASCII Art Use Cases"/g)).toHaveLength(2);
    expect(indexHtml).toContain(">browse ASCII art use cases</a>");
    expect(llmsTxt).toContain(
      "[Use Cases](https://semaphore.bobochang.cn/usecases)"
    );
  });

  it("keeps size and performance copy evidence-bounded", function () {
    const sizeLimitCopy = "Semaphore does not impose a fixed source-dimension limit; " +
      "practical limits depend on your browser and available memory. Output is capped at " +
      "40–240 columns. Dense braille at high column counts may take longer on older devices.";
    const faqSchema = jsonLd(faqHtml).find(function (schema) {
      return schemaTypes(schema).includes("FAQPage");
    }) as { mainEntity?: Array<{ name?: string; acceptedAnswer?: { text?: string } }> };
    const sizeQuestion = (faqSchema.mainEntity || []).find(function (question) {
      return question.name === "Any size limits?";
    });

    expect(sizeQuestion?.acceptedAnswer?.text).toBe(sizeLimitCopy);
    expect(faqHtml).toContain("<p>" + sizeLimitCopy + "</p>");
    expect(readme).toContain(
      "drag it into the browser and get live ASCII feedback while you tune the output"
    );
    expect(readmeCn).toContain("即可在本地实时预览并调节字符画");
    expect(llmsTxt).toContain(
      "practical limits depend on the browser and available memory. " +
      "Output is capped at 40–240 columns."
    );
    expect([faqHtml, readme, readmeCn, llmsTxt].join("\n")).not.toMatch(
      /even (?:huge|large) photos convert in milliseconds|ASCII lands \*\*in milliseconds\*\*|字符画\*\*毫秒级\*\*落地/
    );
  });

  it.each([
    "tool.html",
    "usecases.html",
    "faq.html",
    "privacy.html",
    "charsets/braille.html",
    "charsets/standard.html",
    "charsets/detailed.html",
    "charsets/blocks.html",
    "charsets/minimal.html",
    "charsets/binary.html",
    "guides/readme-banner.html",
    "guides/ssh-motd.html",
    "zh.html"
  ])(
    "adds breadcrumbs to %s",
    function (path) {
      expect(jsonLd(byPath.get(path) || "").flatMap(schemaTypes)).toContain("BreadcrumbList");
    }
  );

  it.each([
    "usecases.html",
    "privacy.html",
    "charsets/braille.html",
    "charsets/standard.html",
    "charsets/detailed.html",
    "charsets/blocks.html",
    "charsets/minimal.html",
    "charsets/binary.html",
    "guides/readme-banner.html",
    "guides/ssh-motd.html",
    "zh.html"
  ])(
    "describes content page %s as a WebPage",
    function (path) {
      expect(jsonLd(byPath.get(path) || "").flatMap(schemaTypes)).toContain("WebPage");
    }
  );

  it("publishes every canonical page in the sitemap", () => {
    pages.forEach(function (page) {
      expect(sitemapXml).toContain("<loc>" + page.canonical + "</loc>");
    });
  });

  it("dates sitemap entries from their latest substantive page change", function () {
    /* The old form of this test pinned every entry to one literal date and
       asserted the count matched the page count — which MANDATED a uniform
       lastmod and made accurate per-page dates a test failure. A sitemap where
       all URLs share a date is the standard signal that lastmod is unreliable.
       Assert the real invariant instead: each entry carries a well-formed date
       that equals the dateModified the page itself publishes in its JSON-LD, so
       the two sources of freshness can never disagree. */
    const entries = new Map(Array.from(
      sitemapXml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g),
      function (match) { return [match[1], match[2]] as [string, string]; }
    ));

    expect(entries.size).toBe(pages.length);
    pages.forEach(function (page) {
      const lastmod = entries.get(page.canonical);
      expect(lastmod, page.path + " is missing a sitemap lastmod").toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );

      const declared = Array.from(
        page.html.matchAll(/"dateModified": "([^"]+)"/g),
        function (match) { return match[1]; }
      );
      expect(declared, page.path + " publishes no dateModified").not.toHaveLength(0);
      declared.forEach(function (date) {
        expect(date, page.path + " disagrees with its sitemap lastmod").toBe(lastmod);
      });
    });
  });

  it("keeps the documented ramp lengths equal to the shipped ramps", function () {
    /* Three places state how many steps the detailed ramp has, and all three were
       wrong (70) against an engine that ships 68. Derive the number instead of
       trusting prose. */
    const ramp = CHARSETS.detailed.ramp || "";
    expect(ramp.length).toBe(68);
    [readme, readmeCn, llmsTxt].forEach(function (doc) {
      expect(doc).toContain(String(ramp.length));
      expect(doc).not.toMatch(/70[ -](?:level|级)/);
    });
  });

  it("keeps the IndexNow key file at the site root", function () {
    /* IndexNow proves domain control with a file whose NAME and CONTENTS are the
       same key, served from the root — Bing/Yandex/Seznam re-verify it on every
       submission. It looks like stray build junk, so it is the kind of file that
       gets "cleaned up". Nothing else fails when it disappears; submission just
       silently stops working. Matched by shape, not by literal, so rotating the
       key does not break this test. */
    const keys = readdirSync(new URL("../public/", import.meta.url))
      .filter(function (name) { return /^[0-9a-f]{8,128}\.txt$/.test(name); });
    expect(keys, "no IndexNow key file in public/").toHaveLength(1);
    const contents = readFileSync(
      new URL("../public/" + keys[0], import.meta.url), "utf8").trim();
    expect(contents).toBe(keys[0].replace(/\.txt$/, ""));
  });

  it("keeps crawl discovery open and advertises the sitemap", function () {
    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Allow: /");
    expect(robotsTxt).not.toMatch(/^Disallow:\s*\/$/m);
    expect(robotsTxt).toContain("Sitemap: https://semaphore.bobochang.cn/sitemap.xml");
    expect(robotsTxt).toContain("llms.txt");
    /* The content signal is asserted here, not by Cloudflare's managed block —
       that block was turned off because it also carried a blanket Disallow for
       nine AI user-agents, and the two were not separately controllable. */
    expect(robotsTxt).toContain("Content-Signal: search=yes,ai-input=yes,ai-train=no");
    /* The repo file carries no directive-level Disallow at all. Cloudflare's
       managed block is prepended at the edge and is the only thing that ever
       blocks a bot here, so a Disallow appearing in-repo means someone tightened
       the wrong layer — the AI-retrieval decision lives in the dashboard. */
    expect(robotsTxt.split("\n").filter(function (line) {
      return /^\s*Disallow:/.test(line);
    })).toHaveLength(0);
  });

  it("prevents edge features from transforming canonical HTML", function () {
    [
      "/",
      "/tool",
      "/usecases",
      "/faq",
      "/privacy",
      "/charsets/standard",
      "/charsets/detailed",
      "/charsets/blocks",
      "/charsets/minimal",
      "/charsets/binary",
      "/charsets/braille",
      "/guides/readme-banner",
      "/guides/ssh-motd",
      "/zh"
    ].forEach(
      function (path) {
        const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(headersTxt).toMatch(new RegExp(
          "^" + escaped + "\\n  Cache-Control: [^\\n]*\\bno-transform\\b",
          "m"
        ));
      }
    );
  });

  it("ships a HowTo for the README banner guide", function () {
    expect(jsonLd(readmeBannerHtml).flatMap(schemaTypes)).toContain("HowTo");
    expect(readmeBannerHtml).toContain('href="/tool?charset=blocks&amp;cols=80&amp;color=green"');
  });

  it("ships a visible, task-specific HowTo for the SSH MOTD guide", function () {
    expect(jsonLd(sshMotdHtml).flatMap(schemaTypes)).toContain("HowTo");
    expect(sshMotdHtml).toContain("Five steps from image to MOTD");
    expect(sshMotdHtml).toContain("open a terminal-safe preset");
    expect(sshMotdHtml).toContain("copy and inspect the file");
    expect(sshMotdHtml).toContain("install through the path your OS owns");
    expect(sshMotdHtml).toContain(
      'href="/tool?charset=standard&amp;cols=64&amp;contrast=20&amp;color=gray"'
    );
    expect(sshMotdHtml).toContain("wc -L motd.txt");
  });

  it("links the SSH MOTD workflow from relevant site surfaces", function () {
    [indexHtml, toolHtml, usecasesHtml].forEach(function (html) {
      expect(html).toContain('href="/guides/ssh-motd"');
    });
    expect(llmsTxt).toContain("https://semaphore.bobochang.cn/guides/ssh-motd");
  });

  it("uses page-specific social preview images for key routes", function () {
    expect(toolHtml).toContain("/static/social-card-tool.jpg");
    expect(brailleHtml).toContain("/static/social-card-braille.jpg");
    expect(zhHtml).toContain("/static/social-card-zh.jpg");
    expect(readmeBannerHtml).toContain("/static/social-card-readme.jpg");
    expect(indexHtml).toContain("/static/social-card.jpg");
  });

  it("exposes a Chinese landing page with language alternates", function () {
    expect(zhHtml).toContain('lang="zh-CN"');
    expect(zhHtml).toContain('hreflang="zh-CN"');
    expect(indexHtml).toContain('hreflang="zh-CN" href="https://semaphore.bobochang.cn/zh"');
    expect(llmsTxt).toContain("https://semaphore.bobochang.cn/zh");
  });

  it("remembers last-used charset and color without storing image bytes", function () {
    expect(toolSource).toContain("defaultsWithStoredPrefs(FACTORY_DEFAULTS)");
    expect(toolSource).toContain("persistToolPrefs()");
    expect(toolSource).toContain("clearStoredToolPrefs()");
    expect(toolSource).toContain("saveStoredToolPrefs({ charset: params.charset, color: params.color })");
    expect(privacyHtml).toContain("last-used tool charset and color mode");
  });

  it("keeps returning visitors on HTTPS without covering unverified subdomains", function () {
    expect(headersTxt.match(/^  Strict-Transport-Security: max-age=31536000$/gm)).toHaveLength(1);
    expect(headersTxt).not.toMatch(
      /^  Strict-Transport-Security:.*\b(?:includeSubDomains|preload)\b/im
    );
  });

  it("uses a dedicated small asset for the home demo thumbnail", function () {
    expect(indexHtml).toContain(
      '<img src="/static/sample-portrait-thumb.webp" alt="" width="68" height="56">'
    );
  });

  it("consolidates the homepage privacy position around verifiable facts", function () {
    expect(indexHtml).toContain("reads pixels on a local <code>&lt;canvas&gt;</code>");
    expect(indexHtml).toContain("README files, CLI output, code comments, and chat");
    expect(indexHtml).toContain("there is no upload endpoint or processing queue");
    expect(indexHtml).toContain("The page makes no third-party runtime requests");
    expect(indexHtml).toContain("Content-Security-Policy: connect-src 'none'");
    expect(indexHtml).toContain(
      "Cloudflare edge counts are static-file request logs, not client telemetry"
    );
    expect(indexHtml).toContain("No analytics beacon runs in the tab");
    expect(indexHtml).toContain('data-screen-label="why-local"');
    expect(indexHtml).not.toContain('data-screen-label="vs-upload"');
    expect(indexHtml).not.toContain("Not another upload-based ASCII generator");
  });

  it("loads and degrades the home hero and showcase independently", function () {
    expect(landingSource).toContain(
      'const heroSource = AsciiEngine.loadImage("/static/sample-hero.webp");'
    );
    expect(landingSource).toContain(
      'const portraitSource = AsciiEngine.loadImage("/static/sample-portrait.webp");'
    );
    expect(landingSource).toContain("const heroTask = heroSource.then(");
    expect(landingSource).toContain("const portraitTask = portraitSource.then(");
    expect(landingSource).toContain("degradeHero();");
    expect(landingSource).toContain("degradeShowcase();");
    expect(landingSource).toContain("await Promise.all([heroTask, portraitTask]);");
    expect(landingSource).not.toMatch(
      /Promise\.all\(\[\s*AsciiEngine\.loadImage\("\/static\/sample-hero\.webp"\),\s*AsciiEngine\.loadImage\("\/static\/sample-portrait\.webp"\)/
    );
  });

  it("implements the standard keyboard contract for the home comparison slider", function () {
    expect(landingSource).toMatch(
      /case "ArrowLeft":\s+case "ArrowDown":\s+next = pos - 2;/
    );
    expect(landingSource).toMatch(
      /case "ArrowRight":\s+case "ArrowUp":\s+next = pos \+ 2;/
    );
    expect(landingSource).toMatch(/case "Home":\s+next = 0;/);
    expect(landingSource).toMatch(/case "End":\s+next = 100;/);
    expect(landingSource).toContain("userTouched = true;\n  setPos(next);");
  });

  it("focuses the home comparison slider from both thumb and track input", function () {
    expect(landingSource).toContain(
      'handle.focus({ preventScroll: true });\n  setPos(posFromPointer(e));'
    );
    expect(landingSource).not.toContain(
      "if (handle.contains(e.target as Node)) handle.focus"
    );
  });

  it("permanently redirects the common braille shorthand", function () {
    expect(redirectsTxt).toMatch(/^\/braille\s+\/charsets\/braille\s+301$/m);
  });

  it("ships a crawl-safe top-level error document", function () {
    expect(notFoundHtml).toContain('<meta name="robots" content="noindex, follow">');
    expect(notFoundHtml).not.toContain('rel="canonical"');
    expect(notFoundHtml).not.toContain('property="og:url"');
    expect(notFoundHtml.match(/<h1\b/g)).toHaveLength(1);
  });

  it("centers the error document within the shared chrome", function () {
    expect(notFoundHtml).toContain(
      "min-height: calc(100vh - var(--header-h) - var(--statusbar-h));"
    );
    expect(notFoundHtml).not.toContain("var(--head-h)");
  });

  it.each(pages)("links to the privacy statement from $path", function (page) {
    expect(page.html).toContain('<a href="/privacy">privacy</a>');
  });
});
