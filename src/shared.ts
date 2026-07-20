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
const THEME_KEY = "img2ascii-theme";

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
  if (btn) btn.setAttribute("aria-label", "switch color theme (current: " + t + ")");
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
  { id: "usecases", href: "usecases.html", label: "usecases" },
  { id: "faq",      href: "faq.html",      label: "faq" }
];

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
  const head = el("header", "site-head");
  const rail = el("div", "rail");

  const brand = el("a", "brand") as HTMLAnchorElement;
  brand.href = "index.html";
  brand.setAttribute("aria-label", "image to ascii — home");
  brand.innerHTML = '<span class="brand-mark" aria-hidden="true">▚</span>' +
                    '<span class="brand-name">Image to ASCII</span>';
  rail.appendChild(brand);

  const nav = el("nav", "site-nav");
  nav.setAttribute("aria-label", "site");
  NAV.forEach(function (item) {
    const a = el("a", null, esc(item.label)) as HTMLAnchorElement;
    a.href = item.href;
    if (page === item.id) a.setAttribute("aria-current", "page");
    nav.appendChild(a);
  });

  const tt = el("button", "theme-toggle") as HTMLButtonElement;
  tt.type = "button";
  tt.setAttribute("aria-label", "switch color theme (current: " + currentTheme() + ")");
  tt.innerHTML = '[ <span data-theme-label>' + esc(currentTheme()) + "</span> ]";
  tt.addEventListener("click", function () {
    setTheme(currentTheme() === "crt" ? "paper" : "crt");
  });
  nav.appendChild(tt);

  const cta = el("a", "btn btn--amber btn--sm", "► open tool") as HTMLAnchorElement;
  cta.href = "tool.html";
  if (page === "tool") cta.setAttribute("aria-current", "page");
  nav.appendChild(cta);

  rail.appendChild(nav);
  head.appendChild(rail);
  return head;
}

function buildStatusbar(page: string, path: string): HTMLElement {
  const bar = el("div", "statusbar");
  bar.setAttribute("role", "status");
  bar.innerHTML =
    '<div class="sb-seg sb-seg--brand">semaphore</div>' +
    '<div class="sb-seg sb-hide-m">' + esc(path) + "</div>" +
    '<div class="sb-seg"><span class="sb-dot" data-sb-dot></span>' +
    '<span data-sb-state>ready</span></div>' +
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
    (items || []).forEach(function (t) {
      right.appendChild(el("div", "sb-seg", esc(t)));
    });
  },
  toast: function (msg: string): void {
    const right = document.querySelector("[data-sb-right]");
    if (!right) return;
    const old = right.querySelector(".sb-toast");
    if (old) old.remove();
    const seg = el("div", "sb-seg sb-toast", esc(msg));
    right.prepend(seg);
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { seg.remove(); }, 2200);
  }
};

/* -------------------------- Util ----------------------------- */
let _advance: number | null = null;

export interface FitPreOptions {
  container?: HTMLElement | null;
  padding?: number;
  min?: number;
  max?: number;
}

export const Util = {
  copyText: function (text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext !== false) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return Promise.resolve(fallback());
    function fallback(): void {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (_) { /* noop */ }
      ta.remove();
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

  /* measured advance width of the mono font, in em (≈0.6) */
  advanceRatio: function (): number {
    if (_advance) return _advance;
    const s = document.createElement("span");
    s.style.cssText =
      "position:absolute;left:-9999px;top:0;font-family:var(--mono);" +
      "font-size:100px;line-height:1;white-space:pre;font-variant-ligatures:none";
    s.textContent = new Array(51).join("M");
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    _advance = w > 0 ? w / 50 / 100 : 0.6;
    return _advance;
  },

  /* size a <pre> so that `cols` characters exactly fill its
     container width; returns the font size used              */
  fitPre: function (pre: HTMLElement, cols: number, opts?: FitPreOptions): number {
    opts = opts || {};
    const box = opts.container || pre.parentElement;
    if (!box) return 10;
    const w = box.clientWidth
      - (opts.padding != null ? opts.padding * 2 : 0);
    let fs = w / (cols * Util.advanceRatio());
    fs = Math.max(opts.min || 2.5, Math.min(opts.max || 20, fs));
    pre.style.fontSize = fs + "px";
    pre.style.lineHeight = "1";
    return fs;
  }
};
