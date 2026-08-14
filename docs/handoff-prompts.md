# Agent handoff prompts — Semaphore growth & launch

**Purpose:** Copy-paste prompts for Claude Code, Codex, Cursor, or any agent that may use the browser, GitHub CLI, and the user’s logged-in sessions to finish post-deploy growth work.

**Start here:** [handoff-2026-08-14-followups.md](./handoff-2026-08-14-followups.md)
carries the measured completion record and takes precedence over this file where
they overlap. Phases 2, 3, 5 and 6 are complete except for five owner-only Google
Search Console Request Indexing clicks. The sitemap is already successful with 13
discovered pages. Phase 4 was explicitly deferred by the owner on 2026-08-14; do not
publish Show HN or V2EX until that decision is explicitly reversed.

**Related docs:**

- [growth-launch.md](./growth-launch.md) — GSC / CF / Show HN / V2EX copy
- [growth-awesome-lists.md](./growth-awesome-lists.md) — awesome-list PR templates
- GitHub issue [#8](https://github.com/can4hou6joeng4/Semaphore/issues/8) — checklist tracker
- Root [AGENTS.md](../AGENTS.md) — product traps and hard constraints

**Product (do not violate):**

- Site: https://semaphore.bobochang.cn  
- Repo: https://github.com/can4hou6joeng4/Semaphore  
- Static client-side only; **no uploads**, **no in-page analytics**, production CSP includes **`connect-src 'none'`**  
- Internal links are extensionless (`/tool`, not `tool.html`)  
- User-visible site copy is English (except `/zh`); no emoji on the site itself  

**Already shipped on `main` (do not re-implement):**

- SEO: twitter meta, `sameAs`, sitemap, hreflang, HowTo on README guide  
- Pages: **13 canonical pages** as of v1.2.0 — including all six charset landing pages
  (`/charsets/{standard,detailed,blocks,minimal,binary,braille}`), `/zh`,
  `/guides/readme-banner`; prefs in `localStorage` (charset + color only)
- OG images: `social-card.jpg` + `social-card-{tool,braille,zh,readme}.jpg`  
- Growth docs under `docs/`  

---

## How to use this file

| Section | When |
|---------|------|
| [Master prompt](#master-prompt-full-takeover) | Default: one agent owns **everything** end-to-end |
| [Phase prompts](#phase-prompts-if-you-split-work) | Split across agents or resume after interruption |
| [Constraints & verification](#global-constraints) | Always apply |
| [Success criteria](#success-criteria) | Done definition |

Paste the **Master prompt** into a new agent session with browser + `gh` access. Point the agent at this file path so it can re-read details.

---

## Master prompt (full takeover)

Copy everything inside the fence below.

```text
You are the launch operator for Semaphore (image-to-ASCII, local-only). Respect the completion status at the top of this file before acting. Do not repeat completed phases, publish Phase 4 posts, or open more awesome-list PRs unless the owner explicitly reverses the recorded decision.

## Repo & live site
- Working directory: the Semaphore git repo (root has AGENTS.md, package.json, public/, src/).
- Live: https://semaphore.bobochang.cn
- GitHub: https://github.com/can4hou6joeng4/Semaphore
- Canonical checklist issue: https://github.com/can4hou6joeng4/Semaphore/issues/8
- Read first: AGENTS.md, STYLEGUIDE.md, docs/growth-launch.md, docs/growth-awesome-lists.md, docs/handoff-prompts.md, CHANGELOG.md (Unreleased).

## Non-negotiable product constraints
1. Do NOT add analytics, beacons, third-party CDNs, font hosts, or any runtime network call from page JS.
2. Do NOT weaken production CSP; keep connect-src 'none' as the privacy guarantee.
3. Do NOT store image bytes in localStorage/cookies; tool prefs are charset + color only.
4. Internal links: extensionless paths only (/tool not tool.html).
5. Site UI copy: English (except /zh); no emoji on the site; real copy only.
6. Before any code commit: npm test && npm run build must pass.
7. No force-push to main; no rewriting published history; no git config changes.
8. Prefer honest, evidence-bounded claims (no “milliseconds for any photo” hype).

## Execution order (historical; skip phases marked done or deferred)

### Phase 0 — Orient
- Confirm git status, branch (prefer main up to date with origin), node version, npm test/build green.
- curl/browser-check live homepage CSP and that /zh and /guides/readme-banner return 200.

### Phase 1 — Production regression (read-only first)
Verify and record Pass/Fail:
1. HTTP 200: / /tool /zh /guides/readme-banner /charsets/braille /usecases /faq /privacy
2. Redirects: /tool.html → /tool; /braille → /charsets/braille
3. /sitemap.xml lists every canonical page (including /zh and /guides/readme-banner)
4. Each page has canonical + og:image + twitter:image; image URLs return 200
5. Response headers include Content-Security-Policy with connect-src 'none'
6. /llms.txt and /robots.txt load; note whether Cloudflare injected managed AI Disallow rules
7. Tool smoke (browser): sample image loads; change charset/color; reload without query — prefs restore; open /tool?charset=braille — URL wins; exports disabled until result exists
If you find a P0 bug, fix in a focused PR/commit, re-test, deploy via push to main (if CI deploy is configured), then continue.

### Phase 2 — Google Search Console — **SUPERSEDED, use the followups doc**
Replaced by Task 1 of [handoff-2026-08-14-followups.md](./handoff-2026-08-14-followups.md).
Two reasons the version below is wrong now: its URL list predates v1.2.0 and omits
the five charset pages (the sitemap has 13 URLs, not 8), and it assumes browser
automation. There is no public Google API for requesting indexing of an ordinary
page — the Indexing API covers only JobPosting and BroadcastEvent — so submission
is a human action and the followups doc says so explicitly. Kept for context:
Using the browser with the user’s Google account (ask them to complete login if needed):
1. Open Search Console for https://semaphore.bobochang.cn (HTML meta verification already on home).
2. Sitemaps → submit https://semaphore.bobochang.cn/sitemap.xml if not already submitted; confirm success status.
3. URL Inspection → Request indexing for at least:
   - https://semaphore.bobochang.cn/
   - https://semaphore.bobochang.cn/tool
   - https://semaphore.bobochang.cn/zh
   - https://semaphore.bobochang.cn/guides/readme-banner
   - https://semaphore.bobochang.cn/charsets/braille
   - https://semaphore.bobochang.cn/usecases
   - https://semaphore.bobochang.cn/faq
4. Optional: Bing Webmaster — add site / import GSC / submit same sitemap.
5. Comment on issue #8 with what was submitted and any quota/errors (verbatim).

### Phase 3 — Cloudflare AI crawl vs llms.txt — **DONE 2026-08-14, skip**
Resolved exactly as the recommendation below proposed. `ai_bots_protection` is
`disabled` and `is_robots_txt_managed` is `false`; the nine blanket
`Disallow: /` rules for AI user-agents are gone from the live robots.txt. The
`Content-Signal: search=yes,ai-input=yes,ai-train=no` line is now declared in
`public/robots.txt` in-repo and pinned by a test, rather than injected at the
edge — the two Cloudflare switches turned out to be independent, and turning
off enforcement alone did not remove the Disallow lines. Do not redo this.
Original steps kept below for context only:
1. Fetch live https://semaphore.bobochang.cn/robots.txt and compare to public/robots.txt.
2. In Cloudflare dashboard (user session): AI Crawl Control / bot / robots managed content.
3. Recommended default for this product (unless user overrides):
   - Allow normal search crawlers
   - Prefer allowing AI answer/retrieval bots so /llms.txt can work; training (ai-train) may stay restricted
   - Do NOT enable Web Analytics injection or anything that needs connect-src holes
4. Apply the chosen policy; re-fetch live robots.txt; document the decision in a short note on issue #8 and optionally append a “Decision log” section to docs/growth-launch.md.

### Phase 4 — Community posts — **DEFERRED BY OWNER, skip**
Do not publish Show HN, V2EX or optional extras until the owner explicitly resumes
this phase. The copy below is retained only as a future draft.

Use final copy from docs/growth-launch.md; lightly update if new routes exist; keep facts accurate.

#### 4a Show HN (Hacker News)
- Title (exact style):
  Show HN: Semaphore – image to ASCII in the browser, nothing uploaded (CSP connect-src none)
- Body must include: live /tool, six charsets + braille, no upload + connect-src none, export paths, GitHub repo, optional /guides/readme-banner and /zh.
- Prefer weekday morning US time if scheduling; if user says post now, post now.
- After submit: save thread URL; stay ready to answer technical comments (engine, braille dither, CSP).
- Do not multi-account or vote-manipulate.

#### 4b V2EX
- Node: share or create (not spam nodes).
- Title/body: use Chinese copy in docs/growth-launch.md; include https://semaphore.bobochang.cn/zh and /tool and GitHub.
- One post only; do not cross-post identical spam the same hour to many Chinese forums unless user explicitly asks.
- Save post URL.

#### 4c Optional extras (only if user wants more reach in same session)
- One thoughtful post each max: r/commandline or r/privacy or r/webdev OR a single Twitter/X post with share-card framing — no flood.
- Always lead with the privacy/CSP differentiator and live demo link.

### Phase 5 — Awesome lists — **DONE, do not duplicate**
Three suitable PRs are already open and mergeable: `devtooligan/awesome-ascii-art#3`,
`pluja/awesome-privacy#967`, and `moul/awesome-ascii-art#7`. Monitor those; do not
open more without new evidence that another list reaches a distinct, suitable audience.

Original steps retained for context:
1. Read docs/growth-awesome-lists.md.
2. Select 2–3 active lists (e.g. privacy tools, browser tools, terminal/ASCII) that fit and still accept PRs.
3. For each: fork if needed, branch, add one factual bullet, open PR with the template body.
4. Do not spam 10 lists; quality over quantity.
5. Collect PR URLs; comment on issue #8.

### Phase 6 — Issue & docs sync — **DONE 2026-08-14**
1. Update GitHub issue #8 checkboxes via comment (or edit body if you have permission) to reflect completed GSC, CF, Show HN, V2EX, awesome PRs.
2. If docs/growth-launch.md checkboxes are outdated, update them to match reality.
3. If you shipped code fixes, ensure CHANGELOG Unreleased notes them.

### Phase 7 — Final report to the user
Deliver a single structured report:
1. Production regression table (Pass/Fail)
2. GSC: sitemap status + indexed-request results
3. Cloudflare robots decision + live robots summary
4. Published post URLs (HN, V2EX, others)
5. Awesome PR URLs
6. Code commits/PRs you made (if any)
7. Remaining blockers (login, rate limits) with exact next action
8. Suggested follow-up (keywords to watch in GSC after 1–2 weeks)

## If blocked
- Missing login: pause that phase, write exact URL + what the user must click, continue other phases.
- Rate limits: wait/retry once; then document.
- Deploy secrets missing: do not invent tokens; report.

## Tone when posting
- Builder-honest, short, technical.
- Privacy claim is enforced by CSP, not marketing fluff.
- Invite critique on charsets/UX; no “best converter” language.
```

---

## Phase prompts (if you split work)

Use these when the master session is too long or a specialist agent resumes one phase. Each phase still inherits [Global constraints](#global-constraints).

### Phase 1 only — production regression

```text
Read docs/handoff-prompts.md (Global constraints + Phase 1). Run full production regression for https://semaphore.bobochang.cn and the Semaphore repo. Fix only P0 bugs that block launch; otherwise report. Output a Pass/Fail table and any repro steps. npm test && npm run build before/after code changes.
```

### Phase 2 only — Google Search Console + Bing

```text
Read docs/handoff-2026-08-14-followups.md Task 1 and docs/growth-launch.md. Do not use Google's Indexing API for ordinary pages and do not claim browser automation is API access. The sitemap is already successful with 13 discovered pages; do not resubmit it. Give the owner the five exact URL Inspection Request Indexing clicks. Record only actions the owner confirms they performed. Do not add site analytics.
```

### Phase 3 only — Cloudflare AI crawl

```text
Phase 3 is complete. Verify only if current production evidence contradicts the recorded state: ai_bots_protection=disabled, is_robots_txt_managed=false, and repo-owned Content-Signal search=yes,ai-input=yes,ai-train=no. Do not change the dashboard or enable Web Analytics.
```

### Phase 4 only — publish Show HN + V2EX

```text
Inactive. The owner deferred Show HN and V2EX on 2026-08-14. Do not publish unless the owner explicitly reverses that decision in a newer instruction.
```

### Phase 5 only — awesome-list PRs

```text
Phase 5 is complete. Read-only check the three existing open PRs and report maintainer activity; do not open more or nudge maintainers without new evidence.
```

### Optional code follow-up — another long-tail guide

```text
Read AGENTS.md + STYLEGUIDE.md. Add one more long-tail guide page (suggested: /guides/ssh-motd or /charsets/blocks) following /guides/readme-banner patterns: head contract (og + twitter tags), vite input, _headers no-transform, sitemap, llms.txt, seo.test.ts, preset deep link to /tool?…. No third-party requests. npm test && npm run build. Commit with a clear message; push only if user/session already uses main deploy workflow.
```

---

## Global constraints

Copy for any sub-agent that did not see the master prompt:

```text
Semaphore constraints:
- Privacy product: no upload, no in-page analytics, CSP connect-src 'none' must remain.
- No third-party runtime requests (CDN, fonts host, beacons).
- Extensionless internal URLs; STYLEGUIDE is binding for HTML/CSS.
- localStorage may hold theme + tool charset/color only — never image bytes.
- Tests: npm test; build: npm run build (tsc --noEmit + vite).
- No force-push; no secrets in repo; edge metrics (CF request counts) OK, client beacons not OK.
```

---

## Success criteria

Launch handoff is **complete** when:

| # | Criterion |
|---|-----------|
| 1 | Production regression has no open P0s |
| 2 | GSC sitemap submitted; primary URLs requested for indexing (or blockers logged) |
| 3 | CF AI/robots policy decided and applied (or blocker logged) |
| 4 | Owner's Phase 4 deferral is recorded and no post is published |
| 5 | Existing awesome-list PRs are recorded without duplicate submissions |
| 6 | Issue #8 updated with links and checkbox progress |
| 7 | User receives the Phase 7 final report |

---

## Final post copy (canonical — keep in sync with growth-launch.md)

Agents should prefer the live file `docs/growth-launch.md`. Snapshot below for offline sessions.

### Show HN

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
- 中文: https://semaphore.bobochang.cn/zh

Source: https://github.com/can4hou6joeng4/Semaphore

I built it because most “image to ASCII” sites want the file on their server. Happy to answer questions about the engine, braille dither, or the CSP choice.
```

### V2EX

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

### Awesome one-liner

```markdown
- [Semaphore](https://semaphore.bobochang.cn) - Free image-to-ASCII converter that runs entirely in the browser. No upload, no account; production CSP uses `connect-src 'none'`. Six charsets including dithered braille. ([Source](https://github.com/can4hou6joeng4/Semaphore))
```

---

## Comment FAQ (for HN / V2EX replies)

Agents answering public comments should stay consistent:

| Question | Answer gist |
|----------|-------------|
| Do you upload my image? | No. Canvas sampling in-tab; CSP `connect-src 'none'` blocks phone-home. |
| Analytics? | No in-page analytics. Operator may see aggregate CF edge request counts for static files only. |
| GIF? | First frame only. |
| Size limits? | No fixed max source pixels; output columns 40–240; heavy braille may be slow on old devices. |
| Braille font? | JetBrains Mono has no braille glyphs; OS fallback is expected. |
| License of output? | Your art; tool is MIT. |

---

## Maintenance

When launch steps change:

1. Update `docs/growth-launch.md` (operational checklist + copy).  
2. Update this file’s master prompt phases and success criteria.  
3. Keep issue #8 as the public progress tracker.  

Last aligned with post-1.1.0 growth work (zh page, README guide, OG variants, prefs).
```
