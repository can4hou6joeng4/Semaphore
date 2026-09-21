/* ============================================================
   semaphore — shared chrome + helpers
   Injects the site header, vim-style status bar, CRT overlays
   and favicon on every page, and exposes small utilities.

   Contract for pages:
     <body data-page="home|tool|usecases|faq" data-path="~/main">
     — do NOT hand-write header / statusbar / overlay markup.
   API (exports):
     Site.setState(text, {busy})     status dot + label
     Site.setRight([...strings])     right-hand statusbar segments
     Site.toast(msg)                 transient green segment (2.2s)
     Util.copyText(str) -> Promise
     Util.download(filename, data, mime)
     Util.fitPre(pre, cols, opts)    size a <pre> so `cols` chars fill it
     Util.advanceRatio()             measured mono advance width (em)
   ============================================================ */

declare global {
  interface Window {
    __errors: string[];
  }
}

/* ---- error collector (read by headless QA via data attr) --- */
window.__errors = [];
function recordErr(msg: unknown): void {
  try {
    window.__errors.push(String(msg));
    document.documentElement.setAttribute(
      "data-js-errors", window.__errors.join(" || ").slice(0, 600));
  } catch (_) { /* noop */ }
}
window.addEventListener("error", function (e) { recordErr(e.message || e); });
window.addEventListener("unhandledrejection", function (e) {
  recordErr("unhandledrejection: " + ((e.reason && e.reason.message) || e.reason));
});

/* --------------------------- theme --------------------------- */
/* "crt" (default, phosphor dark) | "paper" (print light).
   Priority: ?theme= URL param (preview, not persisted) >
   localStorage > default. Applied to <html data-theme> ASAP.   */
const THEME_KEY = "semaphore-theme";

function detectTheme(): string {
  try {
    const m = location.search.match(/[?&]theme=(crt|paper)\b/);
    if (m) return m[1];
  } catch (_) { /* noop */ }
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "crt" || t === "paper") return t;
  } catch (_) { /* noop */ }
  return "crt";
}

let _theme = detectTheme();

function currentTheme(): string { return _theme; }

function paintTheme(t: string): void {
  document.documentElement.setAttribute("data-theme", t);
  const lab = document.querySelector("[data-theme-label]");
  if (lab) lab.textContent = t;
  const btn = document.querySelector(".theme-toggle");
  if (btn) btn.setAttribute("aria-label", themeLabel(t));
}

function setTheme(t: string): void {
  if (t !== "crt" && t !== "paper") return;
  _theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch (_) { /* noop */ }
  paintTheme(t);
  try {
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: t } }));
  } catch (_) { /* noop */ }
}

paintTheme(_theme); // before chrome injection, pre-paint

/* ------------------------- data ----------------------------- */
const NAV = [
  { id: "usecases", href: "/usecases" },
  { id: "faq",      href: "/faq"      }
];

/* Chrome strings. /zh is the only page with lang="zh-CN"; every other page is
   English, so the header and statusbar it injects were English there too and
   a rendering crawler saw mixed-language chrome on the one Chinese page. Only
   labels switch — hrefs, theme names and the metric tokens are the same. */
interface ChromeStrings {
  labels: Record<string, string>;
  home: string; nav: string; cta: string; ready: string;
  themeBefore: string; themeAfter: string;
}
const CHROME: Record<"en" | "zh", ChromeStrings> = {
  en: {
    labels: { usecases: "usecases", faq: "faq" },
    home: "semaphore — home", nav: "site", cta: "► open tool", ready: "ready",
    themeBefore: "switch color theme (current: ", themeAfter: ")"
  },
  zh: {
    labels: { usecases: "使用场景", faq: "常见问题" },
    home: "semaphore — 首页", nav: "站点", cta: "► 打开工具", ready: "就绪",
    themeBefore: "切换配色（当前：", themeAfter: "）"
  }
};
function strings(): ChromeStrings {
  return document.documentElement.lang.toLowerCase().startsWith("zh") ? CHROME.zh : CHROME.en;
}
function themeLabel(t: string): string {
  const s = strings();
  return s.themeBefore + t + s.themeAfter;
}

const FAVICON =
  "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" fill="#0c110c"/>' +
    '<text x="16" y="23" font-family="monospace" font-size="20" fill="#4dff7c" text-anchor="middle">▚</text>' +
    "</svg>");

function el(tag: string, cls?: string | null, html?: string | null): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function esc(s: unknown): string {
  return String(s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[c];
  });
}

/* ---------------------- chrome builders --------------------- */
function buildHeader(page: string): HTMLElement {
  const s = strings();
  const head = el("header", "site-head");
  const rail = el("div", "rail");

  const brand = el("a", "brand") as HTMLAnchorElement;
  brand.href = "/";
  brand.setAttribute("aria-label", s.home);
  brand.innerHTML = '<span class="brand-mark" aria-hidden="true">▚</span>' +
                    '<span class="brand-name">Semaphore</span>';
  rail.appendChild(brand);

  const nav = el("nav", "site-nav");
  nav.setAttribute("aria-label", s.nav);
  NAV.forEach(function (item) {
    const a = el("a", null, esc(s.labels[item.id])) as HTMLAnchorElement;
    a.href = item.href;
    if (page === item.id) a.setAttribute("aria-current", "page");
    nav.appendChild(a);
  });

  const tt = el("button", "theme-toggle") as HTMLButtonElement;
  tt.type = "button";
  tt.setAttribute("aria-label", themeLabel(currentTheme()));
  tt.innerHTML = '[ <span data-theme-label>' + esc(currentTheme()) + "</span> ]";
  tt.addEventListener("click", function () {
    setTheme(currentTheme() === "crt" ? "paper" : "crt");
  });
  nav.appendChild(tt);

  const cta = el("a", "btn btn--amber btn--sm", esc(s.cta)) as HTMLAnchorElement;
  cta.href = "/tool";
  if (page === "tool") cta.setAttribute("aria-current", "page");
  nav.appendChild(cta);

  rail.appendChild(nav);
  head.appendChild(rail);
  return head;
}

function buildStatusbar(page: string, path: string): HTMLElement {
  const bar = el("div", "statusbar");
  bar.innerHTML =
    '<div class="sb-seg sb-seg--brand">semaphore</div>' +
    '<div class="sb-seg sb-hide-m">' + esc(path) + "</div>" +
    '<div class="sb-seg" role="status" aria-live="polite" aria-atomic="true">' +
    '<span class="sb-dot" data-sb-dot aria-hidden="true"></span>' +
    '<span data-sb-state>' + esc(strings().ready) + "</span></div>" +
    '<div class="sb-right" data-sb-right></div>';
  const right = bar.querySelector("[data-sb-right]")!;
  defaultRight().forEach(function (t) {
    right.appendChild(el("div", "sb-seg" + (t.hideM ? " sb-hide-m" : ""), esc(t.text)));
  });
  return bar;
}

function defaultRight(): Array<{ text: string; hideM?: boolean }> {
  return [
    { text: "utf-8", hideM: true },
    { text: "ascii-art", hideM: true },
    { text: "100%" }
  ];
}

/* -------------------------- init ----------------------------- */
function init(): void {
  const body = document.body;
  const page = body.getAttribute("data-page") || "home";
  const path = body.getAttribute("data-path") || "~/main";

  // favicon + title guard
  if (!document.querySelector('link[rel="icon"]')) {
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.href = FAVICON;
    document.head.appendChild(fav);
  }

  body.prepend(buildHeader(page));
  body.appendChild(buildStatusbar(page, path));
  body.appendChild(el("div", "crt-scanlines"));
  body.appendChild(el("div", "crt-vignette"));

  document.documentElement.setAttribute("data-chrome", "ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* -------------------------- Site API ------------------------- */
let toastTimer: number | undefined;
const rightMetricClasses = [
  "sb-metric--dimensions",
  "sb-metric--charset",
  "sb-metric--timing"
];

export const Site = {
  theme: {
    get: currentTheme,
    set: setTheme,
    toggle: function (): void { setTheme(currentTheme() === "crt" ? "paper" : "crt"); }
  },
  setState: function (text: string, opts?: { busy?: boolean }): void {
    const dot = document.querySelector("[data-sb-dot]");
    const lab = document.querySelector("[data-sb-state]");
    if (lab) lab.textContent = text;
    if (dot) dot.classList.toggle("sb-dot--busy", !!(opts && opts.busy));
  },
  setRight: function (items?: string[]): void {
    const right = document.querySelector("[data-sb-right]");
    if (!right) return;
    right.innerHTML = "";
    (items || []).forEach(function (t, index) {
      const kind = rightMetricClasses[index];
      const classes = "sb-seg sb-metric" + (kind ? " " + kind : "");
      right.appendChild(el("div", classes, esc(t)));
    });
  },
  toast: function (msg: string): void {
    const right = document.querySelector("[data-sb-right]");
    if (!right) return;
    const old = right.querySelector(".sb-toast");
    if (old) old.remove();
    const seg = el("div", "sb-seg sb-toast");
    seg.setAttribute("role", "status");
    seg.setAttribute("aria-live", "polite");
    seg.setAttribute("aria-atomic", "true");
    right.prepend(seg);
    seg.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { seg.remove(); }, 2200);
  }
};

/* -------------------------- Util ----------------------------- */
const _advances: Record<string, number> = Object.create(null) as Record<string, number>;

export interface FitPreOptions {
  container?: HTMLElement | null;
  padding?: number;
  min?: number;
  max?: number;
  sample?: string;
}

export const Util = {
  copyText: function (text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext !== false) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    try {
      fallback();
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
    function fallback(): void {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      try {
        if (!document.execCommand("copy")) throw new Error("clipboard copy failed");
      } finally {
        ta.remove();
      }
    }
  },

  download: function (filename: string, data: Blob | string, mime?: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  },

  /* measured advance width of a representative glyph, in em */
  advanceRatio: function (sample?: string): number {
    const glyph = sample || "M";
    if (_advances[glyph]) return _advances[glyph];
    const s = document.createElement("span");
    s.style.cssText =
      "position:absolute;left:-9999px;top:0;font-family:var(--mono);" +
      "font-size:100px;line-height:1;white-space:pre;font-variant-ligatures:none";
    s.textContent = glyph.repeat(50);
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    _advances[glyph] = w > 0 ? w / 50 / 100 : 0.6;
    return _advances[glyph];
  },

  /* size a <pre> so that `cols` characters exactly fill its
     container width; returns the font size used              */
  fitPre: function (pre: HTMLElement, cols: number, opts?: FitPreOptions): number {
    opts = opts || {};
    const box = opts.container || pre.parentElement;
    if (!box) return 10;
    const w = box.clientWidth
      - (opts.padding != null ? opts.padding * 2 : 0);
    let fs = w / (cols * Util.advanceRatio(opts.sample));
    fs = Math.max(opts.min || 2.5, Math.min(opts.max || 20, fs));
    pre.style.fontSize = fs + "px";
    pre.style.lineHeight = "1";
    return fs;
  }
};
