import { describe, expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import toolHtml from "../tool.html?raw";
import usecasesHtml from "../usecases.html?raw";
import faqHtml from "../faq.html?raw";
import privacyHtml from "../privacy.html?raw";
import notFoundHtml from "../404.html?raw";
import brailleHtml from "../charsets/braille.html?raw";
import sitemapXml from "../public/sitemap.xml?raw";
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

  it("describes the converter on the page where it runs", () => {
    const types = jsonLd(toolHtml).flatMap(schemaTypes);
    expect(types).toContain("WebApplication");
    expect(types).toContain("BreadcrumbList");
  });

  it("keeps the Search Console ownership proof on the home page", function () {
    expect(indexHtml).toMatch(
      /<meta name="google-site-verification" content="[A-Za-z0-9_-]+">/
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
