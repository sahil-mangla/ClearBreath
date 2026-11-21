# ClearBreath: Urban Air Quality Assistant (India)

A GenAI-powered assistant that helps Indian families, especially in Delhi-NCR and the Indo-Gangetic plain, get through severe winter smog. It fetches **live air quality** for your city and builds a personalised plan with:

- a **low-emission daily routine** (cleanest outdoor hour, masks, commute tips, GRAP awareness)
- **indoor air hacks** (sealing, purifier/Corsi-Rosenthal box, cooking and heating safety, a "clean room")
- **sustainable alternatives** (commute swaps, clean cooking, no-burn warmth, community/RWA action)
- a plain-language **impact explanation** for every action, plus a transparent before/after exposure estimate
- a **Gemini-written briefing** (English or Hindi) and an "Ask ClearBreath" Q&A box
- a **living-haze interface**: a canvas of drifting smog whose density is today's live AQI and thins by the plan's modelled exposure cut, with headline text that resolves out of the blur. Smoke clouds drift across the page, the header and the footer, and a pixel-art skyline of the chosen city sits above the form. Earlier designs are archived in `designs/living-haze-v1-showcase-and-tool/` and `designs/living-haze-v2-showcase-smoke-city/`; the current one is final.
- a **"Do these now" strip** beside the live reading: three actions for today's CPCB band (a severe-air shortcut that works before the form is filled in)
- a **"Why can this differ from other apps?"** note explaining modelled CAMS air versus CPCB/SAFAR station readings
- a **whole-page Hindi interface** (header toggle, remembered): form, results, plan actions, alerts, exposure assumptions, briefing, city names, error messages and the disclaimer. **Gemini translates first; a built-in Hindi catalogue is the deterministic backup**, and the page says which one produced the text
- a **print / copy plan** bar for sharing with neighbours, an RWA or a school (print view keeps only the plan)
- a **low-power mode** (weak device, data saver or `?fx=lite`) that draws one lighter smoke canvas and a still skyline; `?fx=full` forces everything on

## Run it

```bash
export GEMINI_API_KEY=your-key      # optional: without it the built-in rules engine writes the briefing
npm start                           # http://127.0.0.1:3000
npm test                            # 116 tests, no network needed
npm run test:browser                # real-Chrome smoke test (canvases, CSP, Hindi, print, low-power); skips if no Chrome
npm run build                       # only after editing web/ (rebuilds public/app.js)
```

The server has zero runtime dependencies (Node 20+). The React front end in `web/` is bundled with esbuild into `public/app.js`, and the bundle and self-hosted fonts are committed, so `npm start` needs no build. React, esbuild and the font packages are dev dependencies only. Environment variables:

Put these in a `.env` file (copy `.env.example`; it is git-ignored and loaded automatically by `server.js`). Real environment variables override it.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | none | Enables the Gemini briefing, Hindi translation and Q&A |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini model name |
| `PORT` / `HOST` | `3000` / `127.0.0.1` | Listen address |
| `RATE_LIMIT_PER_MIN` | `20` | Per-IP API requests per minute |
| `TRUST_PROXY` | unset | Set to `1` behind a reverse proxy to use `X-Forwarded-For` |

## How it works

```
browser ──POST /api/plan──► validate ─► Open-Meteo air data (cached 10 min)
                                     ─► CPCB AQI + cleanest-hour finder
                                     ─► rules engine (actions + impacts) ─► exposure model
                                     ─► Gemini briefing (schema-constrained) ─┐
                                                   fallback: template briefing ◄┘ on any failure
                       lang=hi ─► Gemini translates the plan in chunks ─► validators ─┐
                                      fallback: built-in Hindi (src/hi.js) per chunk ◄┘
```

### Determinism contract

Gemini is an optional enhancement; the app gives a complete, repeatable answer without it.

- Every Gemini call runs at `temperature: 0` with a fixed `seed`, and results are cached by a hash of the request, so identical requests return identical text.
- Nothing from Gemini reaches the page until deterministic validators pass. A briefing may not quote a figure above 10 that is absent from the supplied facts. A translation must have the same count, contain Devanagari, carry no markup or links, and keep every figure unchanged.
- Any failure (no key, timeout, 429/503 after one retry, validation) falls back to built-in text. The built-in Hindi is a pure function of the action id and its parameters, so the same request always gives the same page.
- Translation runs in parallel chunks with per-chunk fallback, so one busy call degrades only its own chunk. The response reports `translation: gemini | builtin | mixed`.
- Server errors carry a stable `code`, which the interface maps to a message in the chosen language.

| File | Role |
|---|---|
| `src/aqi.js` | India CPCB AQI sub-index and categories from PM2.5/PM10 |
| `src/airdata.js` | Open-Meteo client: timeout, per-city cache, in-flight de-dup, cleanest-hour finder |
| `src/rules.js` | Recommendation engine, impact constants, exposure model |
| `src/llm.js` | Gemini client: JSON-schema output, temperature 0 and fixed seed, hash-keyed cache, one retry on 429/503 |
| `src/determinism.js` | Pure guards: number grounding for briefings, translation validation |
| `src/hi.js` | Built-in Hindi: action catalogue, alerts, assumptions, disclaimer, text collect/apply helpers |
| `src/translate.js` | Chunked parallel Gemini translation with per-chunk fallback to the built-in Hindi |
| `src/validate.js` | Allow-list input validation and sanitisation |
| `src/app.js` | HTTP server, routing, security headers, rate limiting |
| `web/` | React front end: smoke canvas, pixel-city canvas, resolving-text component, live readout, form, results, ask panel |
| `web/lib.js` | Pure, unit-tested helpers (haze density, text timing, smoke physics, skyline generation) |
| `scripts/build.mjs` | esbuild bundle of `web/` into `public/app.js`, plus font copy |
| `public/` | Built bundle, stylesheets, self-hosted fonts (Gloock, Hanken Grotesk) and the HTML shell |

## How it addresses the judging parameters

**Problem-statement alignment.** Covers all three asks (routines, indoor hacks, sustainable alternatives), tailored by city, live AQI, household (children, seniors, conditions), commute, cooking fuel and heating. India-specific content includes CPCB AQI bands, GRAP in Delhi-NCR, stubble-burning season, PM Ujjwala, RWA action and a carbon-monoxide warning for burning coal or wood indoors. Each action states its direct impact, and the "What your choices change" panel quantifies the combined effect.

**Security.** Cities come from a fixed allow-list (no free-text geocoding, so no SSRF). Inputs are strictly validated: types, ranges and enums are checked, unknown keys are ignored, and `city` is checked against the allow-list with `Object.hasOwn` so `__proto__` cannot select an entry. Bodies are capped at 8 KB, with a 415 for a wrong content type and a 413 for oversized requests. A per-IP rate limiter fails closed. CSP is `default-src 'none'` with no inline script or style, plus `nosniff`, no-referrer and a permissions policy. The UI renders server text only as React text nodes, never as HTML, and fonts are self-hosted so the CSP stays `font-src 'self'`. The Gemini key is server-side and sent in a header, never in a URL or log. For prompt injection, user text is passed only inside a JSON `untrusted` field, the system prompt says to treat it as data, the output is schema-constrained, and ids and lengths are clamped. Errors are generic, with no stack traces.

**Efficiency.** No dependencies, and static files are pre-gzipped at start-up. Air data is cached per city for 10 minutes, with in-flight de-duplication, so many users in one city cost one upstream call. Outbound calls have timeouts. Gemini calls use a small token budget with thinking disabled for the 2.5 models. If Gemini fails, the app still returns a complete plan.

**Testing.** 116 tests with `node --test`, covering CPCB breakpoints, validation and injection strings, the rules engine per scenario, the exposure model, cache/dedupe/timeouts, the Gemini client (key placement, id filtering, clamping, failure logging) and the front-end helpers, the English/Hindi string tables (identical keys and placeholders), and the determinism guards (number grounding, translation validation), the built-in Hindi catalogue and full HTTP integration (headers, traversal, fonts, `/api/air`, 400/405/413/415/429/502/503, fallback vs Gemini paths, Hindi fallback). `npm run test:browser` drives real headless Chrome over the DevTools protocol with a mocked air reading: it checks that the canvases mount and move, that no CSP violation fires, the severe-air strip, themed dropdowns, the Hindi toggle, the print layout, low-power and reduced-motion modes, and phone-width overflow.

**Accessibility.** Skip link, landmarks, a labelled form with fieldset/legend, and help text linked by `aria-describedby`. A polite status line announces progress, focus moves to the results heading after a plan is built (not when only the language changes) and to the error summary after a failed submit, the skyline and smoke both obey the Pause button, and critical alerts use `role="alert"`. AQI is conveyed by number and word as well as colour, and alerts carry text prefixes. Colours are AA-contrast in light and dark mode, focus is visible, touch targets are at least 44 px, `prefers-reduced-motion` is respected (the haze is drawn still and text appears at rest), looping haze motion can be paused (WCAG 2.2.2), the animated headline is exposed to screen readers as plain text, the layout is responsive, the document and Hindi text carry the right `lang` (server-supplied English inside Hindi mode is marked `lang="en"`), the dropdowns are themed with a native fallback, the print view is a light high-contrast plan, and the whole flow works by keyboard.

## Honest limitations

- The rate limiter and all caches are per process and in memory. There is no overall Gemini spending cap; put one at the Google project level.
- No stale-while-error fallback for the air feed, and the JS bundle has no content hash or ETag yet; both are listed as follow-ups from the efficiency review.
- Form validation messages from the server are not tied to individual fields (only the manual PM2.5 field is marked invalid); they are summarised in a focused error block.

- Air data is a **model estimate** (CAMS via Open-Meteo), not CPCB station readings, and the CPCB bands are applied to current rather than 24-hour averages. The UI says so.
- Impact figures (mask efficiency, purifier reduction, CO2 per km) are **typical-value approximations** and are labelled as such. The exposure model is deliberately simple, and its assumptions are shown in the UI.
- The built-in Hindi and Gemini's Hindi are both unreviewed by a native speaker and should get one. Validation detail lines (rare, since the form constrains inputs) stay in English and are marked `lang="en"`.
- Gemini is sometimes busy (503). The page then shows built-in Hindi for the affected parts and says so; each Gemini call has one shared deadline (9 s, 8 s for translation) covering its retry, so the added wait is bounded by that deadline.
- Low-power detection is a static heuristic (device memory, cores, data saver), not a frame-time probe; use `?fx=` to override.
- Not medical advice. High-risk households are told when to seek care.
