import { describe, expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import toolHtml from "../tool.html?raw";
import usecasesHtml from "../usecases.html?raw";
import faqHtml from "../faq.html?raw";
import privacyHtml from "../privacy.html?raw";
import notFoundHtml from "../404.html?raw";
import brailleHtml from "../charsets/braille.html?raw";
import toolSource from "./tool.ts?raw";
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

  it("uses a dedicated small asset for the home demo thumbnail", function () {
    expect(indexHtml).toContain(
      '<img src="/static/sample-portrait-thumb.webp" alt="" width="68" height="56">'
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

  it.each(pages)("links to the privacy statement from $path", function (page) {
    expect(page.html).toContain('<a href="/privacy">privacy</a>');
  });
});
