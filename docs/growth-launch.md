# Growth launch checklist

Operational steps that cannot ship as code alone. Mirror of GitHub issue #8 with final copy.

**Full agent takeover prompt (GSC, CF, posts, awesome PRs, regression):** see [handoff-prompts.md](./handoff-prompts.md).

## Google Search Console

1. Property: `https://semaphore.bobochang.cn` (already verified via HTML meta on home).
2. Sitemap `https://semaphore.bobochang.cn/sitemap.xml` is already successful: GSC
   last read it on 2026-08-14, when it had 13 pages. Do not resubmit it — GSC re-reads
   on its own. It has had 14 entries since 2026-08-30 (`/guides/ssh-motd`), and 13 of
   them carry a `lastmod` of 2026-09-01…03 after the GEO fixes.
3. Request Indexing was completed on 2026-08-14 for the five ramp pages added
   2026-08-13:
   `/charsets/standard`, `/charsets/detailed`, `/charsets/blocks`,
   `/charsets/minimal`, `/charsets/binary`.
   **Pending:** `/guides/ssh-motd` has never been through URL Inspection. Request it,
   plus `/tool` and `/`, both substantially longer since 2026-09-02.
4. Bing Webmaster Tools — **pending, owner only.** Add the site with the meta-tag
   method, paste the code into `index.html` beside `google-site-verification` as
   `<meta name="msvalidate.01" content="…">`, and add a `toMatch` assertion next to the
   Search Console one in `seo.test.ts`. Then import the sitemap. IndexNow alone gives no
   index-coverage diagnostics; this is what unlocks them. ChatGPT search runs on Bing's
   index, so this is not optional for AI visibility.

Production pre-flight passed for all 13 canonical URLs on 2026-08-14. The sitemap was
also confirmed successful in GSC with all 13 pages discovered. With the owner's explicit
authorization to control the logged-in Chrome session, the agent submitted each of the
five URLs above through URL Inspection. Every URL received Google's confirmation:
"Indexing requested" and "URL was added to a priority crawl queue." No quota, CAPTCHA
or eligibility error appeared. This requests recrawling; it does not guarantee or prove
that Google has indexed the pages yet.

## IndexNow

The five new ramp pages were submitted to `https://api.indexnow.org/indexnow` on
2026-08-14. The API returned HTTP 202 after the key file was deployed and verified at
the site root. This covers participating engines such as Bing, Yandex and Seznam;
Google does not participate; the separate Search Console requests above were completed
through the authorized browser session.

**Pending as of 2026-09-03 — needs the owner's go-ahead.** IndexNow writes require
current authorization (see handoff-prompts.md). Thirteen canonical URLs have changed
since the 2026-08-14 submission and `/guides/ssh-motd` has never been submitted at all.
One POST covers everything. The key is the filename of the 64-hex `.txt` in `public/`
and is already live at the site root, so nothing here is secret:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data '{
    "host": "semaphore.bobochang.cn",
    "key": "88829be3dbb668183178343924ec91149a78743b00f26df312b59fb35c080825",
    "keyLocation": "https://semaphore.bobochang.cn/88829be3dbb668183178343924ec91149a78743b00f26df312b59fb35c080825.txt",
    "urlList": [
      "https://semaphore.bobochang.cn/",
      "https://semaphore.bobochang.cn/tool",
      "https://semaphore.bobochang.cn/usecases",
      "https://semaphore.bobochang.cn/privacy",
      "https://semaphore.bobochang.cn/zh",
      "https://semaphore.bobochang.cn/charsets/standard",
      "https://semaphore.bobochang.cn/charsets/detailed",
      "https://semaphore.bobochang.cn/charsets/blocks",
      "https://semaphore.bobochang.cn/charsets/minimal",
      "https://semaphore.bobochang.cn/charsets/binary",
      "https://semaphore.bobochang.cn/charsets/braille",
      "https://semaphore.bobochang.cn/guides/readme-banner",
      "https://semaphore.bobochang.cn/guides/ssh-motd"
    ]
  }'
```

`/faq` is left out: its content has not changed since 2026-08-13. Expect `200` or `202`;
record the date and status here afterwards.

## Cloudflare AI crawl control

**Decision (2026-08-13): allow AI retrieval, keep declining AI training.**

Completed and verified on 2026-08-14:

1. Cloudflare `ai_bots_protection` is `disabled`, so the edge no longer blocks AI
   retrieval crawlers.
2. Cloudflare `is_robots_txt_managed` is `false`, so it no longer prepends blanket
   `Disallow: /` groups to the repository policy.
3. `public/robots.txt` is now the source of truth and declares
   `Content-Signal: search=yes,ai-input=yes,ai-train=no`. A test pins this line and the
   absence of every `Disallow` directive.
4. The deployed `robots.txt` matches the repository file and advertises the sitemap.

No dashboard action remains. Do not re-enable managed robots text, AI crawler blocking,
Cloudflare Web Analytics, or any feature that injects a client-side request.

Googlebot was never at risk: `Google-Extended` is the AI-training token, not the search
crawler, so search indexing is unaffected either way.

## Show HN (English)

**Deferred by the owner on 2026-08-14. Do not publish until explicitly resumed.**

**Title:**

```text
Show HN: Semaphore – image to ASCII in the browser, nothing uploaded (CSP connect-src none)
```

**Body:**

```text
Semaphore turns a photo into ASCII art entirely on-device.

- Live: https://semaphore.bobochang.cn/tool
- Six charsets, including dithered 2×4 braille
- Copy plain text, .txt, .png, or a share card
- No upload, no account, no third-party requests
- Production CSP is connect-src 'none' — open devtools and the network tab stays quiet after load
- README banner walkthrough: https://semaphore.bobochang.cn/guides/readme-banner

Source: https://github.com/can4hou6joeng4/Semaphore

I built it because most “image to ASCII” sites want the file on their server. Happy to answer questions about the engine, braille dither, or the CSP choice.
```

Post on a weekday morning US time; stay for ~2h of comments.

## V2EX (中文)

**Deferred by the owner on 2026-08-14. Do not publish until explicitly resumed.**

**标题:**

```text
Semaphore — 浏览器里把图片转成 ASCII，不上传，CSP 直接 connect-src none
```

**正文:**

```text
做了个纯前端的图片转 ASCII 工具：https://semaphore.bobochang.cn/tool

中文简介：https://semaphore.bobochang.cn/zh

特点：
- 本地 canvas 采样，没有上传接口
- 生产环境 CSP：connect-src 'none'（页面无法对外 fetch）
- 六套字符集，含 braille 点阵 + 抖动
- 复制文本 / 下 txt / 出 png / 分享卡
- README 横幅教程：https://semaphore.bobochang.cn/guides/readme-banner

源码 MIT：https://github.com/can4hou6joeng4/Semaphore

求拍砖：文案、体验、还有哪些 charset 值得加。
```

发在 share 或 create 节点；避免同小时多站群发。

## Awesome lists

Rechecked on 2026-09-01 during the GEO audit, correcting the 2026-08-14 note: of the
three PRs recorded as "open and mergeable", two target repositories that are effectively
dead. `devtooligan/awesome-ascii-art#3` — last push 2024-04-24, and the repo has never
merged a single PR. `moul/awesome-ascii-art#7` — last push 2023-12-01, last merged PR
2022-07-17. Treat only `pluja/awesome-privacy#967` as live (19.6k stars, 100+ open PRs;
one polite rebase or nudge is reasonable). `paulaime/awesome-privacy#52` is closed.

Two listings are merged and verified: `marcelscruz/dev-resources` #1198 (2026-08-03,
1.3k stars) and `90dy/awesome-ascii` #3 (2026-07-21). **The `90dy/awesome-ascii` entry
at README line 59 links the GitHub repo, not the site.** A one-line PR pointing it at
`https://semaphore.bobochang.cn/` is the cheapest citation-surface fix available and the
one exception to "do not open more list PRs" — owner's call, since it is public under the
owner's account.

## Wikidata item

**Not created yet — needs a logged-in Wikidata account; anonymous users cannot create
items.** This is the largest single lever left for entity recognition. "Semaphore"
collides with Semaphore CI, the Semaphore zero-knowledge protocol, Semaphore UI (Ansible)
and the concurrency primitive — which has its own Wikipedia article — so nothing today
anchors "Semaphore the ASCII converter" as an entity for ChatGPT, Gemini or Perplexity.

Values verified against the live Wikidata API on 2026-09-03. Description must not start
with an article and stays lowercase, per Wikidata style.

| statement | property | value |
|---|---|---|
| label (en) | — | Semaphore |
| description (en) | — | browser-based image to ASCII art converter that runs entirely on the user's device |
| label / description (zh) | — | Semaphore / 在浏览器本地运行的图片转 ASCII 字符画工具 |
| instance of | P31 | web application — Q189210 |
| official website | P856 | `https://semaphore.bobochang.cn/` |
| source code repository URL | P1324 | `https://github.com/can4hou6joeng4/Semaphore` |
| copyright license | P275 | MIT License — Q334661 |
| programmed in | P277 | TypeScript — Q978185 |
| platform | P400 | web browser — Q6368 |
| language of work or name | P407 | English — Q1860; Simplified Chinese — Q13414913 |
| inception | P571 | 2026-07-19 (first commit) |
| software version identifier | P348 | 1.2.0 — from `package.json`; update on release |

Attach references (P854 reference URL) to the key statements or the item risks deletion
under the notability policy: the `90dy/awesome-ascii` listing, the `marcelscruz/dev-resources`
entry and the repository itself are the citable ones. Do not add a `developer` (P178)
statement — there is no item for the author and inventing one is worse than omitting it.

Afterwards, put the new Q-number into `sameAs` on the `WebSite` and `WebApplication` nodes
in `index.html`. `seo.test.ts` uses `toEqual` on the WebSite node, so extend that assertion
in the same commit or the build goes red.

## After posts

- Note referrers in Cloudflare Pages metrics (edge counts only — no in-page analytics).
- Re-check GSC impressions for `image to ascii` and related queries after 1–2 weeks.
