import { describe, expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import toolHtml from "../tool.html?raw";
import usecasesHtml from "../usecases.html?raw";
import faqHtml from "../faq.html?raw";
import privacyHtml from "../privacy.html?raw";
import notFoundHtml from "../404.html?raw";
import brailleHtml from "../charsets/braille.html?raw";
import landingSource from "./landing.ts?raw";
import demoSource from "./demo.ts?raw";
import brailleSource from "./main-braille.ts?raw";
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

const pages = [
  { path: "index.html", canonical: "https://semaphore.bobochang.cn/", html: indexHtml },
  { path: "tool.html", canonical: "https://semaphore.bobochang.cn/tool", html: toolHtml },
  { path: "usecases.html", canonical: "https://semaphore.bobochang.cn/usecases", html: usecasesHtml },
  { path: "faq.html", canonical: "https://semaphore.bobochang.cn/faq", html: faqHtml },
  { path: "privacy.html", canonical: "https://semaphore.bobochang.cn/privacy", html: privacyHtml },
  { path: "charsets/braille.html", canonical: "https://semaphore.bobochang.cn/charsets/braille", html: brailleHtml }
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
  it.each(pages)("keeps $path canonical metadata aligned", function (page) {
    const html = page.html;
    const title = headContent(html, /<title>([^<]+)<\/title>/);
    const description = headContent(html, /<meta name="description" content="([^"]+)">/);
    expect(html).toContain('<link rel="canonical" href="' + page.canonical + '">');
    expect(html).toContain('<meta property="og:url" content="' + page.canonical + '">');
    expect(html).toContain('<meta property="og:title" content="' + title + '">');
    expect(html).toContain('<meta property="og:description" content="' + description + '">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(title).not.toBe("");
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(function () { jsonLd(html); }).not.toThrow();
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

  it("uses the stronger text tone for file metadata", function () {
    expect(toolHtml).toContain('class="fs-xs text-dim" id="srcMeta"');
  });

  it("reserves the default source and desktop workbench geometry", function () {
    expect(toolHtml).toContain('class="term" id="srcInfo"');
    expect(toolHtml).toMatch(
      /id="srcThumb" src="\/static\/sample-portrait\.webp"\s+width="1100" height="1069"/
    );
    expect(toolHtml).toContain("portrait.webp — 1100×1069");
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
      /id="outBody" role="region"\s+aria-label="ASCII output viewport" tabindex="0"/
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

  it("describes the converter on the page where it runs", () => {
    const types = jsonLd(toolHtml).flatMap(schemaTypes);
    expect(types).toContain("WebApplication");
    expect(types).toContain("BreadcrumbList");
  });

  it("declares the preferred site name on the home page", function () {
    const schema = jsonLd(indexHtml)[0] as { "@graph"?: Record<string, unknown>[] };
    const graph = schema["@graph"] || [];
    const website = graph.find(function (node) { return node["@type"] === "WebSite"; });
    const application = graph.find(function (node) {
      return node["@type"] === "WebApplication";
    });

    expect(website).toEqual({
      "@type": "WebSite",
      "@id": "https://semaphore.bobochang.cn/#website",
      url: "https://semaphore.bobochang.cn/",
      name: "Semaphore"
    });
    expect(application).toMatchObject({
      "@id": "https://semaphore.bobochang.cn/#webapp",
      isPartOf: { "@id": "https://semaphore.bobochang.cn/#website" }
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
    expect(usecasesHtml).toContain('"dateModified": "2026-08-06"');
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

  it.each(["tool.html", "usecases.html", "faq.html", "privacy.html", "charsets/braille.html"])(
    "adds breadcrumbs to %s",
    function (path) {
      expect(jsonLd(byPath.get(path) || "").flatMap(schemaTypes)).toContain("BreadcrumbList");
    }
  );

  it.each(["usecases.html", "privacy.html", "charsets/braille.html"])(
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
    expect(sitemapXml).toContain([
      "<loc>https://semaphore.bobochang.cn/</loc>",
      "<lastmod>2026-08-06</lastmod>"
    ].join("\n    "));
    expect(sitemapXml).toContain([
      "<loc>https://semaphore.bobochang.cn/usecases</loc>",
      "<lastmod>2026-08-06</lastmod>"
    ].join("\n    "));
    expect(sitemapXml).toContain([
      "<loc>https://semaphore.bobochang.cn/faq</loc>",
      "<lastmod>2026-08-06</lastmod>"
    ].join("\n    "));
    expect(sitemapXml.match(/<lastmod>2026-08-06<\/lastmod>/g)).toHaveLength(3);
    expect(sitemapXml.match(/<lastmod>2026-07-29<\/lastmod>/g)).toHaveLength(3);
  });

  it("keeps crawl discovery open and advertises the sitemap", function () {
    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Allow: /");
    expect(robotsTxt).not.toMatch(/^Disallow:\s*\/$/m);
    expect(robotsTxt).toContain("Sitemap: https://semaphore.bobochang.cn/sitemap.xml");
  });

  it("prevents edge features from transforming canonical HTML", function () {
    ["/", "/tool", "/usecases", "/faq", "/privacy", "/charsets/braille"].forEach(
      function (path) {
        const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(headersTxt).toMatch(new RegExp(
          "^" + escaped + "\\n  Cache-Control: [^\\n]*\\bno-transform\\b",
          "m"
        ));
      }
    );
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
