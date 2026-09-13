# Publication notes for `article-braille-dithering.md`

Not part of the article. Kept beside it so the two travel together.

**Status (2026-09-14): figures made, facts re-checked, article is publishable. Publishing remains the owner's decision.**

The three reviews (engine-against-source, standards, HN-reader) agreed on one thing the
draft cannot fix from a text editor: an essay about a visual technique with no pictures
loses to the one with pictures. Three before/after pairs are marked in the text with
*[…]* placeholders. Make them with the tool itself, same source image throughout, 120
columns:

1. `detailed` ramp vs `braille` — the "8× samples" claim.
2. braille with dither **off** vs **on** — the claim the whole article turns on; the
   tool has the toggle.
3. braille rendered with `cellAspect: 1` vs the measured aspect — needs a one-line
   local hack or two screenshots at different fonts; the stretched one is the point.

Done 2026-09-14: the three pairs were rendered with the built engine (`convert` +
`renderPNG`) and the site's own font in headless Chrome 152, composed side by side, and
saved as `docs/images/braille-{1,2,3}-*.webp`. Pair 3 uses `cellAspect: 1` on the left,
which is the "one-line local hack" the note asked for.

**Facts an HN commenter will check, all now verified against the source:**
- Every quoted block is verbatim from `src/ascii-engine.ts` except the packer, which is
  the real loop with the colour-accumulation lines removed — the text says so. Checked
  line by line on 2026-09-14; one folded index expression in the packer was restored to
  the engine's two lines so the claim holds exactly.
- The site does **not** use `1/0.6`; it measures. The article now says exactly that. The
  0.68em figure was re-measured 2026-09-14 the way the site does it (fifty `⣿` at 100px in
  Chrome 152, Apple Braille fallback): 0.6836em, which puts the sample portrait at 80
  rows, not ~82. The article now states the measured numbers and the machine.
- "Tens of milliseconds" was removed. `convert()` records `ms` and the tool shows it; if
  you want a number, measure one and state the machine.
- The gamma section no longer argues that encoded-space dithering is "right". It says
  what the code computes (Y′), why that is a standard quantity, where it is wrong
  (saturated colours), and that the difference is unmeasured. Expect the Ditherpunk link
  anyway; the reply is "yes, and here is the number" once you have made before/after 2
  with a linearised variant.
- Prior art (drawille 2014, chafa, notcurses, btop) is acknowledged up front. Someone may
  add Unicode 16 octants (2×4 filled blocks, no dot gaps); the honest answer is font
  support, and it is not in the article because I could not verify current coverage.

**Outcome (2026-09-14).** Published on `bobochang.cn`; HN and dev.to both skipped because
the owner has no account on either. The plan below is kept as written.

**Where and how.** Canonical home is a post on `bobochang.cn` (feeds the Person entity
and gives the site an inbound link from the author's own domain). Submit that URL to HN
as a plain link — not "Show HN" — with the title as written. Cross-post to dev.to with a
canonical tag. Weekday, 14:00–16:00 UTC; stay two hours for comments.

**Why this instead of the launch post.** The GEO audit put the ceiling for browser
image-to-ASCII "Show HN" posts over 18 months at about 4 points, against 1,353 for the
period's best ASCII technical essay. Explaining the pipeline is the leverage; announcing
the tool is not. The tool is named once, in the first sentence, as the author's — every
later reference is a maker's note, not a plug.

**Owner decision.** Publishing goes out under the owner's name and is not authorised by
this draft existing.
