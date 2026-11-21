---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: []
---

# Surface brief: ClearBreath single page

Scope: whole page (web). Visitor mode: Operate with a Persuade first screen. One page shape, Showcase (hero-first); the user dropped the Tool shape. The earlier design is kept in designs/living-haze-v1-showcase-and-tool/.

Audience, job, action: Indian families in smog season; read the air now, build a household plan, ask a follow-up. Proof is live Open-Meteo data and the exposure model; no invented stats.

Unresolved: none.

## Direction contract

THESIS: The page is a room of air. Drifting smoke clouds (canvas, also in the header and footer) have the density of today's real AQI, headline letters begin as blurred smog and resolve to sharp type, and building a plan visibly thins the haze by the estimated exposure cut. Refuses the dashboard-of-cards arrangement.

OWN-WORLD: Smog-dusk ground (warm brown-grey, oklch L about 0.18), pale warm ink, amber for sun-through-smog and pollution, one cool clear-air teal that only marks what is clean or improved. Gloock display serif over Hanken Grotesk body. Panels are lightness steps, not glass or cards-in-cards. AQI badge uses its six CPCB category colours as data tokens. Recognizable with all content removed by the moving smoke, the pixel-art city above the form and the amber/teal pair.

STORY: Visitor sees today's real AQI in their city dissolve into focus, understands the air is bad and what that means for a family, tells the page about their home, watches the haze thin, and leaves with three top actions and the reasons.

FIRST VIEWPORT (Showcase): full-height moving smoke; left-aligned giant headline resolving from blur; one sentence; primary action "Build my plan"; live city readout (city select, AQI number, category word) large at right-bottom. TOOLSET: the form sits under a pixel-art skyline of the chosen city (Delhi gets a minar and a gate); far towers fade as the air thickens and windows glow amber.

FORM: Canvas-first atmospheric showcase, pinned by the user's words "Living haze", "keep the showcase" and "smoky cloud animation ... pixel city background". seed: none (pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

FINAL ADDITIONS (this design is final): themed selects (CSS customizable select with a gradient-chevron fallback), a "Do these now" strip under the live readout (three actions per CPCB band, urgent from "Poor"), a two-column balanced form with a "What you will get" list beside the submit button, a Hindi/English header toggle, a print/copy share bar, a print stylesheet (light tokens, plan only) and a low-power mode (`?fx=lite|full`). Verified by `npm run test:browser`.
