# Agent handoff — 2026-08-14 follow-ups

This file records two follow-ups from the v1.2.0 release. Both were completed on
2026-08-14, including the five Google Search Console actions after the owner explicitly
authorized the agent to control the logged-in Chrome session.

## Completion record

- Task 1A passed against production after deploy `30fdfe3`: all 13 canonical URLs
  returned 200 with indexable robots directives, self-canonical URLs, `no-transform`,
  and sitemap/JSON-LD date agreement. Sitemap, robots and the real 404 also passed.
- Task 1B was completed through the authorized Search Console browser session. The
  sitemap is successful, was last read on 2026-08-14, and reports 13 discovered pages.
  Each of the five new ramp URLs received Google's "Indexing requested" confirmation
  and was added to the priority crawl queue. No quota, CAPTCHA or eligibility error
  appeared. Google says recrawling can take days to weeks, and acceptance is not proof
  that a page has already entered the index.
- Task 1C was authorized and completed. The IndexNow API accepted the five ramp URLs
  with HTTP 202 after its root key file was deployed and verified.
- Task 2 used Option B. The unused `AsciiEngine.VERSION` export, synchronization test,
  and AGENTS trap were deleted. Local tests passed 183/183, Node 22 CI passed, the
  production deploy succeeded, and real-browser conversion/share-card smoke passed.

The detailed instructions below are retained as the acceptance record. Do not rerun
completed work unless current production evidence contradicts this status.

## How to use this file

Read **Shared context** and **Non-negotiable constraints** first — they apply to
both tasks. Then do Task 1, then Task 2, in that order: Task 1 is read-only
verification of the live site, Task 2 changes code and may trigger a deploy, so
doing it second keeps Task 1's observations valid.

Do not merge the two tasks' reporting. A single "done" for both is not an
acceptable answer.

## Shared context

- Repo: `/Users/bobochang/Documents/CODE/Semaphore`
- Live: <https://semaphore.bobochang.cn> (Cloudflare Pages, deploys from `main`)
- Read before touching anything: `AGENTS.md` (repository rules and the traps a
  fresh read will not reveal) and `STYLEGUIDE.md` (the **binding** page authoring
  contract). `src/seo.test.ts` is the enforcement arm of the styleguide — it
  asserts on raw source text, so rewording copy can turn a test red with no
  behaviour change. That is intentional; read the failing assertion before
  "fixing" either side.
- Verify with `npm test` (183 tests after removing the version-only assertion) and
  `npm run build` (`tsc --noEmit` first).
  Node 22 is what CI uses.

### Already done — do not redo

- v1.2.0 is tagged, released and deployed. 13 canonical pages are live.
- Cloudflare AI crawl control is **settled**: `ai_bots_protection` is `disabled`
  and `is_robots_txt_managed` is `false`. The `Content-Signal:
  search=yes,ai-input=yes,ai-train=no` line is now asserted from
  `public/robots.txt` in-repo, not injected at the edge, and a test pins it.
  `docs/handoff-prompts.md` still contains a "Phase 3 — Cloudflare AI crawl"
  section describing this as outstanding; it is not.
- The CI deploy token was invalid and has been replaced; a `workflow_dispatch`
  run was verified green.

## Non-negotiable constraints

These are product invariants, not preferences. Violating one is a correctness
bug.

1. **No third-party request. Ever.** No CDN, no font host, no error reporter, no
   analytics beacon — Cloudflare Web Analytics included. The deployed CSP is
   `connect-src 'none'`, so anything that tries will pass locally (vite dev does
   not apply `public/_headers`) and fail in production.
2. **Nothing about the user's image leaves the device.** The conversion runs on a
   local `<canvas>`. This claim is the product.
3. Internal links are extensionless (`/tool`, never `tool.html`).
4. Every user-visible string is real English copy. No lorem ipsum, no emoji on
   the site itself.
5. Keep the code voice: `function` declarations, explicit return types, comments
   that explain *why* rather than *what*.
6. **Do not claim to have done something you did not do.** If a step needs a
   human, say so explicitly and name the step.

---

# Task 1 — Get the five new charset pages indexed

v1.2.0 added five landing pages and the sitemap went from 8 URLs to 13:

```
/charsets/standard   /charsets/detailed   /charsets/blocks
/charsets/minimal    /charsets/binary
```

They need to reach Google's index.

## Read this before planning — four things that are impossible

Skipping this section wastes an hour and produces a false report.

1. **Google has no public API for requesting indexing of an ordinary web page.**
   The Indexing API supports only `JobPosting` and `BroadcastEvent`. Do not call
   it for these URLs. Do not fabricate a response.
2. **The sitemap ping endpoint was retired in 2023.** There is no anonymous
   submit path.
3. **The Search Console API can submit a sitemap, but needs credentials.**
   Verified absent on this machine: no `gcloud`, no
   `~/.config/gcloud/application_default_credentials.json`, no
   `GOOGLE_*` environment variables. Unless the user supplies OAuth or a service
   account, this route is closed too.
4. **A browser session is not API access.** Browser control requires the user's explicit
   authorization and an authenticated session; do not describe UI automation as an API
   response.

The owner supplied that authorization on 2026-08-14. The agent then completed the five
UI submissions and recorded Google's actual confirmation for each one.

## 1A. Pre-flight verification (fully automatable — show measured output)

For each of the 13 canonical URLs:

- returns HTTP 200
- carries no `noindex` — check **both** the `robots` meta tag and the
  `X-Robots-Tag` response header
- `rel=canonical` is self-referential and byte-identical to that URL's `<loc>` in
  the sitemap
- response carries `no-transform` in `Cache-Control`

For the crawl files:

- `https://semaphore.bobochang.cn/sitemap.xml` is fetchable, valid XML, exactly
  13 `<loc>` entries
- every `<lastmod>` is a well-formed date **and equals the `dateModified` that
  page publishes in its own JSON-LD** (`src/seo.test.ts` asserts this against the
  repo; confirm the deployed artifacts agree)
- `robots.txt` advertises the sitemap and contains no `Disallow` directive

Also confirm an unknown path returns a real **404**, not a soft 404 with a 200
status. `404.html` must stay a top-level Vite input for this to hold — that
registration is load-bearing.

If any check fails, fix it, re-run `npm test` and `npm run build`, and say what
you changed.

## 1B. Search Console submission (completed)

The sitemap was already successful with 13 discovered pages, so it was not resubmitted.
URL Inspection -> Request Indexing was completed for:

- `https://semaphore.bobochang.cn/charsets/standard`
- `https://semaphore.bobochang.cn/charsets/detailed`
- `https://semaphore.bobochang.cn/charsets/blocks`
- `https://semaphore.bobochang.cn/charsets/minimal`
- `https://semaphore.bobochang.cn/charsets/binary`

For every URL, Search Console displayed "Indexing requested" and "URL was added to a
priority crawl queue." Google publishes no numeric daily quota and says recrawling can
take days to weeks.

## 1C. Optional — IndexNow (ask the user before doing it)

IndexNow is a **server-side** ping supported by Bing, Yandex and Seznam; Google
does not participate. Because it is not a request made by the page, it does not
touch `connect-src 'none'` and does not violate constraint 1.

Doing it means placing a key file under `public/` and POSTing the URL list from
a shell or a workflow. That is an outbound submission on the user's behalf, so
**ask first**. If they decline, drop it without argument.

## Task 1 acceptance

- every pre-flight check above, with the actual command output
- the five per-URL Search Console confirmations
- an explicit distinction between a request accepted by Google and a page already
  present in the index

---

# Task 2 — Decide the fate of `AsciiEngine.VERSION`

## Background — verified, and it contradicts older docs

`src/ascii-engine.ts:96` exports `VERSION`, commented "keep in sync with
package.json". Documentation used to claim it is stamped onto share cards. **That
is false**, measured:

- `grep -rn VERSION src/*.ts` outside the tests matches only its own declaration
- nothing imports it, so Rollup tree-shakes it — no built chunk contains the
  string, and bumping it from `1.1.0` to `1.2.0` did not even change the
  `ascii-engine` chunk's content hash
- `src/sharecard.ts` never references a version

`src/seo.test.ts` now asserts `VERSION` equals the `package.json` version, so it
cannot drift again. But it remains an export with no consumer: a maintenance
obligation that returns nothing.

Pick one of the two options below and justify the choice.

## Option A — wire it into the share card (the original intent)

`src/sharecard.ts` geometry you need to know:

- **`layout()` is the single shared layout maths, and both renderers read it.**
  `svg()` and `pngBlob()` produce the same card two ways. Changing one without
  the other makes them drift silently, and no unit test will catch it. This is
  the most important constraint in the file.
- Header row: a mark square, then the `semaphore` wordmark — canvas draws it at
  `ctx.fillText("semaphore", PAD + 38, L.headCY)`, the SVG emits the equivalent
  `<text>` — plus a `meta` field from `layout()` reading
  `--charset <name> --cols <n>`.
- Footer row: `fileLabel` left-aligned, `caption` right-aligned, `FOOT_GAP = 24`,
  with deterministic ellipsizing on overflow. `STYLEGUIDE.md` states plainly:
  **never let the two footer labels overlap.**

Consequences to handle:

- Header text does not currently participate in the `contentW` width
  calculation — only the footer labels get fitted. Adding text there can overflow
  a narrow card. Handle the width.
- The footer already carries two labels; a third collides with the
  no-overlap rule. The header is the better home.
- Braille has special handling because JetBrains Mono ships no braille glyphs:
  SVG uses `textLength` / `lengthAdjust`, PNG applies equivalent horizontal
  canvas scaling. Do not break it.
- Change **both** renderers in the same commit and add a test showing they agree.

## Option B — delete it

Remove all three of:

- the export in `src/ascii-engine.ts`
- the assertion in `src/seo.test.ts` tying it to the `package.json` version
- `AGENTS.md` trap 15 in full — it describes something that will no longer exist

Justify it on the grounds that an export with no consumer is an unpaid
maintenance cost.

## Task 2 acceptance

- `npm test` and `npm run build` green, with actual output pasted
- **If Option A:** prove the string actually ships —
  `grep -c "1\.2\.0" dist/assets/*.js` must find it. If it does not, the change
  did not take effect and it is still being tree-shaken.
- **If Option A:** explain how you verified the SVG and PNG paths agree.
- If you changed a pattern that `STYLEGUIDE.md` or `AGENTS.md` documents, update
  those files in the **same** commit. Otherwise the next author reintroduces
  what you just fixed.
- `convert()` and `renderPNG()` need a real canvas and are not unit-testable.
  Confirm visual results in a real browser, and state plainly which parts you did
  not verify.
