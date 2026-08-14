# Growth launch checklist

Operational steps that cannot ship as code alone. Mirror of GitHub issue #8 with final copy.

**Full agent takeover prompt (GSC, CF, posts, awesome PRs, regression):** see [handoff-prompts.md](./handoff-prompts.md).

## Google Search Console

1. Property: `https://semaphore.bobochang.cn` (already verified via HTML meta on home).
2. Sitemap `https://semaphore.bobochang.cn/sitemap.xml` is already successful: GSC
   last read it on 2026-08-14 and reports all 13 discovered pages. Do not resubmit it.
3. Request Indexing was completed on 2026-08-14 for the five ramp pages added
   2026-08-13:
   `/charsets/standard`, `/charsets/detailed`, `/charsets/blocks`,
   `/charsets/minimal`, `/charsets/binary`.
4. Bing Webmaster (optional): import the same sitemap

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

Existing submissions were rechecked on 2026-08-14. Three PRs remain open and
mergeable: `devtooligan/awesome-ascii-art#3`, `pluja/awesome-privacy#967`, and
`moul/awesome-ascii-art#7`. `paulaime/awesome-privacy#52` is closed. Do not open
more list PRs or nudge maintainers without new activity; the intended 2-3 quality
submissions already exist.

## After posts

- Note referrers in Cloudflare Pages metrics (edge counts only — no in-page analytics).
- Re-check GSC impressions for `image to ascii` and related queries after 1–2 weeks.
