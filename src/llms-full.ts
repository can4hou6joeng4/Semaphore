/* Builds /llms-full.txt: the curated llms.txt followed by the readable text of
   every canonical page as markdown, in sitemap order.

   Pure string processing — no DOM, no Node — so vite.config.ts can run it at
   build time and seo.test.ts can run the same function over the same HTML and
   assert on the result. The pages are hand-written and validated well-formed,
   which is what makes a stack walker over a tag tokenizer sufficient here; this
   is not a general HTML-to-markdown converter and should not grow into one.

   What is kept: headings, paragraphs, list items, tables, <pre> blocks that are
   real content, and FAQ <summary> lines. What is dropped: head, scripts, styles,
   noscript, the footer, terminal chrome (<figcaption>), navigation, form
   controls, anything aria-hidden, and <pre> stages the page fills at runtime
   (role="img") — their static text is a "rendering…" placeholder. Text outside
   any kept block (button labels, kickers, tag rows) is dropped too. */

export interface LlmsPage {
  url: string;
  html: string;
}

const SKIP = new Set([
  "head", "script", "style", "noscript", "footer", "figcaption", "nav",
  "button", "select", "label", "option", "template", "svg"
]);
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "source", "track", "wbr"
]);
const HEADING = /^h([1-6])$/;
const TEXT_BLOCKS = new Set(["p", "li", "pre", "summary", "caption", "th", "td", "blockquote"]);

interface Block {
  tag: string;
  cls: string;
  text: string;
  parts: string[];
}
interface Table {
  caption: string;
  rows: string[][];
  row: string[];
}
interface ListState {
  ordered: boolean;
  n: number;
}

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, function (_m, hex: string) {
      return String.fromCodePoint(parseInt(hex, 16));
    })
    .replace(/&#(\d+);/g, function (_m, dec: string) {
      return String.fromCodePoint(Number(dec));
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp("\\b" + name + "\\s*=\\s*\"([^\"]*)\"", "i"));
  return match ? match[1] : null;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function fence(code: string): string {
  /* readme-banner's example is itself a fenced block, so a longer fence is
     needed to contain it — the standard markdown rule. */
  const ticks = /```/.test(code) ? "````" : "```";
  return ticks + "\n" + code + "\n" + ticks;
}

function mdTable(table: Table): string {
  if (!table.rows.length) return "";
  const width = Math.max.apply(null, table.rows.map(function (r) { return r.length; }));
  function line(row: string[]): string {
    const cells = row.slice();
    while (cells.length < width) cells.push("");
    return "| " + cells.map(function (c) { return c.replace(/\|/g, "\\|"); }).join(" | ") + " |";
  }
  const out: string[] = [];
  if (table.caption) out.push("_" + table.caption + "_", "");
  out.push(line(table.rows[0]), "|" + " --- |".repeat(width));
  table.rows.slice(1).forEach(function (row) { out.push(line(row)); });
  return out.join("\n");
}

function absolute(href: string, origin: string): string | null {
  if (/^https?:\/\//.test(href)) return href;
  if (href.startsWith("/")) return origin + href;
  return null;
}

/* Renders one list item from its own inline text plus the child blocks that
   closed inside it. The guides put an <h3> and a <p> (sometimes a <pre>) in
   every <li>; the heading becomes bold rather than a markdown heading, and a
   leading "01"-style number that repeats the list counter is dropped. */
function renderItem(block: Block, list: ListState | undefined): string {
  const marker = list && list.ordered ? list.n + ". " : "- ";
  const parts = block.parts.slice();
  const own = collapse(block.text);
  if (own) parts.unshift(own);
  if (!parts.length) return "";
  let first = parts.shift() as string;
  if (list && list.ordered) {
    first = first.replace(/^\*\*0?(\d+) /, function (m, n: string) {
      return Number(n) === list.n ? "**" : m;
    });
  }
  const indent = " ".repeat(marker.length);
  const rest = parts.map(function (p) {
    return p.split("\n").map(function (l) { return l ? indent + l : l; }).join("\n");
  });
  return [marker + first].concat(rest).join("\n");
}

export function pageToMarkdown(html: string, origin: string): { title: string; body: string } {
  const out: string[] = [];
  const blocks: Block[] = [];
  const open: { tag: string; skipping: boolean }[] = [];
  const lists: ListState[] = [];
  const tables: Table[] = [];
  const hrefs: (string | null)[] = [];
  let skip = 0;
  let title = "";
  let lastHeading = 1;

  function top(): Block | undefined { return blocks[blocks.length - 1]; }
  function append(text: string): void {
    const block = top();
    if (block) block.text += text;
  }
  function emit(formatted: string): void {
    if (!formatted) return;
    const parent = top();
    if (parent && parent.tag === "li") parent.parts.push(formatted);
    else out.push(formatted);
  }

  function closeBlock(block: Block): void {
    const heading = block.tag.match(HEADING);
    const inItem = top() !== undefined && (top() as Block).tag === "li";
    if (heading) {
      const level = Number(heading[1]);
      const text = collapse(block.text);
      if (inItem) { emit("**" + text + "**"); return; }
      if (level === 1 && !title) { title = text; lastHeading = 1; return; }
      lastHeading = level;
      /* shifted one level: the file's H1 is llms.txt's, each page is an H2 */
      emit("#".repeat(Math.min(level + 1, 6)) + " " + text);
      return;
    }
    switch (block.tag) {
      case "summary": {
        const level = Math.min(lastHeading + 2, 6);
        emit("#".repeat(level) + " " + collapse(block.text));
        return;
      }
      case "p":
        emit(collapse(block.text));
        return;
      case "blockquote":
        emit("> " + collapse(block.text));
        return;
      case "pre":
        emit(fence(block.text.replace(/^\n/, "").replace(/\s+$/, "")));
        return;
      case "li":
        emit(renderItem(block, lists[lists.length - 1]));
        return;
      case "caption": {
        const table = tables[tables.length - 1];
        if (table) table.caption = collapse(block.text);
        return;
      }
      case "th":
      case "td": {
        const table = tables[tables.length - 1];
        if (!table) return;
        /* .ramp cells print a charset's raw glyphs, and the leading space is
           the ramp's darkest step — collapsing it would misquote the ramp. A
           code span keeps it; only trailing whitespace and newlines go. */
        const ramp = /\bramp\b/.test(block.cls);
        table.row.push(ramp
          ? "`" + block.text.replace(/\n/g, "").replace(/\s+$/, "") + "`"
          : collapse(block.text));
        return;
      }
      default:
        return;
    }
  }

  const token = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\/?>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html)) !== null) {
    const [raw, tagName, attrs, text] = match;
    if (text !== undefined) {
      if (skip || !top()) continue;
      append(decode(text));
      continue;
    }
    if (!tagName) continue;            /* comment */
    const tag = tagName.toLowerCase();
    const closing = raw.startsWith("</");

    if (closing) {
      /* pop to the matching open tag; well-formed pages pop exactly one */
      for (let i = open.length - 1; i >= 0; i--) {
        const popped = open.pop() as { tag: string; skipping: boolean };
        if (popped.skipping) skip--;
        if (popped.tag === tag) break;
      }
      if (skip) continue;
      if (HEADING.test(tag) || TEXT_BLOCKS.has(tag)) {
        const block = blocks.pop();
        if (block && block.tag === tag) closeBlock(block);
        else if (block) blocks.push(block);
        continue;
      }
      if (tag === "ol" || tag === "ul") { lists.pop(); continue; }
      if (tag === "tr") {
        const table = tables[tables.length - 1];
        if (table && table.row.length) { table.rows.push(table.row); table.row = []; }
        continue;
      }
      if (tag === "table") {
        const table = tables.pop();
        if (table) emit(mdTable(table));
        continue;
      }
      if (tag === "a") {
        const href = hrefs.pop();
        const url = href ? absolute(href, origin) : null;
        const block = top();
        if (block && !skip) {
          block.text = block.text.replace(/\u0001([^\u0001]*)$/, function (_m, inner: string) {
            return url ? "[" + collapse(inner) + "](" + url + ")" : inner;
          });
        }
        continue;
      }
      if (tag === "code") append("`");
      else if (tag === "b" || tag === "strong") append("**");
      else if (tag === "em" || tag === "i") append("*");
      continue;
    }

    /* opening tag */
    const skipping = SKIP.has(tag)
      || attr(attrs, "aria-hidden") === "true"
      || (tag === "pre" && attr(attrs, "role") === "img");
    if (!VOID.has(tag)) {
      open.push({ tag: tag, skipping: skipping });
      if (skipping) skip++;
    }
    if (skip) continue;

    if (HEADING.test(tag) || TEXT_BLOCKS.has(tag)) {
      if (tag === "li") {
        const list = lists[lists.length - 1];
        if (list) list.n++;
      }
      blocks.push({ tag: tag, cls: attr(attrs, "class") || "", text: "", parts: [] });
      continue;
    }
    if (tag === "ol" || tag === "ul") { lists.push({ ordered: tag === "ol", n: 0 }); continue; }
    if (tag === "table") { tables.push({ caption: "", rows: [], row: [] }); continue; }
    if (tag === "a") { hrefs.push(attr(attrs, "href")); append("\u0001"); continue; }
    if (tag === "br") { append("\n"); continue; }
    if (tag === "code") append("`");
    else if (tag === "b" || tag === "strong") append("**");
    else if (tag === "em" || tag === "i") append("*");
  }

  if (!title) {
    const fromHead = html.match(/<title>([^<]*)<\/title>/);
    title = fromHead ? collapse(decode(fromHead[1])) : origin;
  }
  return { title: title, body: out.join("\n\n") };
}

export function buildLlmsFull(summary: string, pages: LlmsPage[]): string {
  const sections = pages.map(function (page) {
    const origin = new URL(page.url).origin;
    const md = pageToMarkdown(page.html, origin);
    return "## " + md.title + "\n\n" + page.url + "\n\n" + md.body;
  });
  return summary.trim() + "\n\n---\n\n" + sections.join("\n\n---\n\n") + "\n";
}
