# ClearBreath

**A GenAI urban air quality assistant for Indian families facing winter smog.**
Prompt Wars, Challenge 6: *GenAI Urban Air Quality Assistant*.

ClearBreath takes the live air quality for a city, asks a few questions about the household, and returns a plan: a low-emission daily routine, indoor air hacks and sustainable alternatives. Every recommendation states the direct impact of the choice, and a before/after exposure estimate shows what the whole plan changes. It works in English and Hindi, and it still gives a complete answer when Gemini is unavailable.

## The problem

Every winter, Delhi-NCR and the Indo-Gangetic plain spend weeks in the CPCB "Very Poor" to "Severe" bands. Generic advice ("avoid going out") does not help a parent deciding on the school run, a family that cooks on biomass, or a household with an asthmatic grandparent. ClearBreath ties advice to three things: today's air, who is in the house, and how they live.

## What it does

| Ask in the brief | How ClearBreath answers it |
|---|---|
| Low-emission daily routine | The cleanest outdoor hour from the forecast, mask guidance by risk level, commute tips by mode (including "wear an N95 in an auto-rickshaw, keep windows up in a cab"), GRAP awareness |
| Indoor air quality hacks | Sealing, purifier or Corsi-Rosenthal box, cooking and heating safety (including a carbon-monoxide warning for indoor coal or wood), a clean room for vulnerable members |
| Sustainable alternatives | Commute swaps with CO2 per km, clean cooking (LPG, PNG, induction, PM Ujjwala), no-burn warmth, community and RWA action |
| Tailored to location and lifestyle | 22 Indian cities; household (children, seniors, asthma, heart condition, pregnancy); commute mode and distance; cooking fuel; heating; purifier and N95 on hand |
| Clearly explain the impact of choices | Each action carries a plain-language impact line, and the "What your choices change" panel shows a transparent exposure estimate with its assumptions listed |

Also included:

- **Gemini briefing and Q&A.** A short written briefing and an "Ask ClearBreath" box, in English or Hindi.
- **Whole-page Hindi.** Gemini translates first; a built-in Hindi catalogue is the deterministic backup, and the page says which one wrote the text.
- **"Do these now" strip.** Three actions for today's CPCB band, available before the form is filled in.
- **Living-haze interface.** A canvas of smoke whose density is today's AQI and thins by the plan's modelled exposure cut, with a pixel-art skyline of the chosen city.
- **Print and copy.** The print view keeps only the plan, so it can be shared with neighbours, an RWA or a school.
- **Low-power mode.** Used on weak devices or with data saver (`?fx=lite`; `?fx=full` forces everything on).

## Quick start

Requires Node 22 or later. The server has no runtime dependencies, and the built front end is committed, so there is nothing to install to run it.

```bash
cp .env.example .env     # optional: add GEMINI_API_KEY; without it the rules engine writes everything
npm start                # http://127.0.0.1:3000
```

```bash
npm install              # only needed for development (React, esbuild, fonts)
npm test                 # 140 tests (backend, front-end components, deploy config), no network needed
npm run test:browser     # real headless Chrome smoke test (skips if Chrome is absent)
npm run build            # rebuild public/app.js after editing web/
```

### Configuration

Set in `.env` (git-ignored, loaded by `server.js`) or the environment. Real environment variables override `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | none | Enables the Gemini briefing, Hindi translation and Q&A |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model name |
| `GEMINI_MAX_CALLS_PER_MIN` | `120` | Global ceiling on Gemini calls per minute (retries count) |
| `PORT` / `HOST` | `3000` / `127.0.0.1` | Listen address |
| `RATE_LIMIT_PER_MIN` | `20` | Per-IP API requests per minute |
| `TRUST_PROXY` | unset | Set to `1` behind a reverse proxy to read `X-Forwarded-For` |

## Deploying to Vercel

The repo is ready to import into Vercel as-is (framework preset: Other; the settings are in `vercel.json`).

- **Static site:** `public/` is served from Vercel's CDN, with the same security headers the Node server sends (a test enforces that they match).
- **API:** `api/index.js` runs the same request handler as `server.js` for `/api/*` and `/healthz`, in the Mumbai region (`bom1`) with a 30 second limit. Behind Vercel the rate limiter trusts `X-Forwarded-For`.
- **Build gate:** Vercel runs `npm run build && npm test`, so a deploy that fails a test does not go live.
- **Environment variables:** set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, `GEMINI_MAX_CALLS_PER_MIN`, `RATE_LIMIT_PER_MIN`) in the project settings. Without a key the app serves the rules-engine answers.
- **CI:** `.github/workflows/ci.yml` builds, checks that the committed bundle matches `web/`, and runs the unit and real-browser tests on every push.
- **Scaling:** caches and the rate limiter live in each function instance. Gemini's own per-minute ceiling and a spend quota on the Google project bound the cost.

```bash
npm i -g vercel && vercel        # preview deploy; `vercel --prod` to promote
```

## Architecture

```
browser ──POST /api/plan──► validate (allow-list) ─► Open-Meteo CAMS air data (cached, de-duplicated)
                                                  ─► CPCB AQI + cleanest-hour finder
                                                  ─► rules engine (actions + impacts) ─► exposure model
                                                  ─► Gemini briefing (JSON schema) ─┐
                                                       fallback: rules-written briefing ◄┘ on any failure
                            lang=hi ─► Gemini translates in chunks ─► validators ─┐
                                          fallback: built-in Hindi (src/hi.js) ◄──┘ per chunk
```

The design principle is that **the rules engine is the product and Gemini is an enhancement.** Every number comes from deterministic code; Gemini phrases, explains and translates, and nothing it writes reaches the page until it passes validation.

| Path | Role |
|---|---|
| `server.js` | Local entry point: loads `.env`, starts the server |
| `api/index.js` | Vercel entry point: the same handler, API only |
| `vercel.json` | Vercel build, routing and header configuration |
| `src/app.js` | HTTP routing, security headers, rate limiting, static serving (ETag, gzip) |
| `src/validate.js` | Allow-list validation and sanitisation of every input |
| `src/cities.js` | The fixed list of 22 supported cities |
| `src/airdata.js` | Open-Meteo client: timeout, 10-minute cache, in-flight de-duplication, stale-while-error, cleanest-hour finder |
| `src/aqi.js` | India CPCB AQI sub-index and bands from PM2.5 and PM10 |
| `src/rules.js` | Recommendation engine, impact constants, exposure model |
| `src/llm.js` | Gemini client: schema-constrained output, temperature 0, fixed seed, hash-keyed caches, call budget |
| `src/determinism.js` | Number-grounding and translation validators |
| `src/hi.js`, `src/translate.js` | Built-in Hindi catalogue and the chunked Gemini translation with per-chunk fallback |
| `web/` | React front end source (form, results, readout, ask panel, smoke and skyline canvases) |
| `public/` | Built bundle, stylesheets, self-hosted fonts and the HTML shell |
| `scripts/` | esbuild build script and the real-Chrome smoke test |
| `test/` | Unit and integration tests |

The backend is `server.js` and `src/`; the front end is `web/` built into `public/`. The front end imports two backend modules, `src/aqi.js` for the CPCB bands and `src/constants.js` for the language list, so both sides share one definition.

## How it meets the judging parameters

### Problem statement alignment

All three asks from the brief are answered with India-specific content: CPCB AQI bands, GRAP in Delhi-NCR, stubble-burning season, PM Ujjwala, RWA action, and mask and commute guidance for Indian transport (including open auto-rickshaws). The plan responds to the inputs: a child or senior raises the protection level, a heart or asthma condition adds its own advice (with "follow your own doctor's advice first"), and a clean-air day does not promise exposure reductions that do not exist. Impact is explained at two levels, per action and for the plan as a whole.

### Code quality

- Small modules with one job each; pure functions for the rules, the AQI maths, the validators and the Hindi catalogue, so the logic is testable without a server or a network.
- One definition of shared facts (AQI bands, language list, mask rule) rather than copies on each side.
- Zero runtime dependencies on the server; the front end is bundled once and committed.
- English and Hindi plan text are kept in step by a test that checks identical keys and placeholders.
- Errors carry a stable `code`, which the interface maps to a message in the chosen language.

### Security

- **No free-text location.** Cities come from a fixed allow-list, so there is no geocoding and no SSRF surface. The lookup uses `Object.hasOwn`, so `__proto__` cannot select an entry.
- **Strict input validation.** Types, ranges and enums are checked, and unknown keys are ignored. Bodies are capped at 8 KB (413), a wrong content type gets 415, and a wrong method gets 405.
- **Headers.** CSP is `default-src 'none'` with no inline script or style, plus `nosniff`, no-referrer and a permissions policy. Fonts are self-hosted so the policy stays `font-src 'self'`.
- **No HTML from the server.** The interface renders server and model text only as React text nodes.
- **Secrets.** The Gemini key stays on the server, travels in a header, and is never placed in a URL or a log line. `.env` is git-ignored.
- **Prompt injection.** User text goes only into a JSON `untrusted` field, the system prompt says to treat it as data, output is schema-constrained, ids and lengths are clamped, and answers containing links or markup are rejected.
- **Abuse limits.** A per-IP rate limiter (IPv6 keyed by /64, bounded memory) and a global Gemini call ceiling cap both load and cost.
- **Generic errors.** No stack traces or upstream details leave the server.

### Efficiency

- One upstream air call per city per 10 minutes, however many users ask, with in-flight de-duplication and a one-hour stale reading if Open-Meteo fails.
- Gemini responses are cached by a hash of the request (separate caches for briefings, answers and translations), with a small token budget and a single retry on 429 or 503 that shares one deadline.
- Static files are pre-gzipped at start-up and served with ETag and 304, long-lived caching for fonts, and `no-cache` revalidation for the bundle.
- The smoke and skyline canvases pause when off-screen or when the user presses Pause, and low-power devices get a lighter scene.
- Translation runs in parallel chunks, so one slow call delays only its own part.

### Testing

140 tests with `node --test`, no network required, split between the server, the front end and the deployment:

- CPCB breakpoints and band edges; validation and injection strings; prototype-key and oversize inputs.
- The rules engine per scenario, and the exposure model (including clean-air days and open versus closed cabins).
- Air client: cache, de-duplication, timeouts, stale-while-error.
- Gemini client: key placement, retry, budget, id filtering, clamping, rejection of ungrounded figures and links.
- Determinism: identical requests give identical output; the Hindi catalogue is exhaustive over every action; translation validators reject wrong counts, missing Devanagari, markup and changed figures.
- Front end: the real React components are bundled with esbuild and rendered to HTML in the test run (no browser, no extra dependencies). Tests check that every control has a bound label, fieldsets have legends, server field errors set `aria-invalid` with an inline message and a focusable summary, Hindi renders the same controls, the busy button stays focusable, and the animated headline is read once as plain text. Pure helpers (haze density, text timing, skyline, share text, low-power detection) and the English/Hindi string tables are tested too.
- Deployment: `vercel.json` is checked (output folder, rewrites, build command, immutable font caching), the CDN's security headers must equal the server's, and the Vercel function is driven over a real socket (health, cities, 404, 405, 415, and rate limiting keyed on `X-Forwarded-For`).
- HTTP integration: security headers, path traversal, fonts, `/api/air`, and the 400, 405, 413, 415, 429, 502 and 503 paths, with and without Gemini.

`npm run test:browser` drives real headless Chrome with a mocked air reading and checks that the canvases mount and move, that no CSP violation fires, the severe-air strip, themed dropdowns, the Hindi toggle, the print layout, low-power and reduced-motion modes, and that nothing scrolls sideways at phone width.

### Accessibility

- Skip link, landmarks, labelled fields in fieldsets, help text tied by `aria-describedby`.
- After a failed submit, focus moves to an error summary and the offending fields are marked `aria-invalid` with an inline message; after a new plan, focus moves to the results heading (not when only the language changes).
- A polite status line announces progress; critical alerts use `role="alert"`.
- AQI is conveyed by number and word as well as colour. Body text measured over the animated smoke is at least 5:1 against the pixels behind it, and the palette is designed for AA contrast in light, dark and print.
- All motion respects `prefers-reduced-motion`, looping motion can be paused (WCAG 2.2.2), and the animated headline is exposed to screen readers as plain text.
- Correct `lang` on the document and on mixed-language text, 44 px touch targets, visible focus, a responsive layout, and a flow that works by keyboard alone.

## Determinism

Gemini is optional, and the output is repeatable.

- Every call runs at `temperature: 0` with a fixed seed, and results are cached by a hash of the request.
- A briefing or answer may not quote a figure above 10 that is absent from the facts supplied to the model. A translation must have the same count, contain Devanagari, carry no markup, and keep every figure unchanged.
- On any failure (no key, timeout, rate limit, validation, exhausted budget) the app falls back to built-in text. The built-in Hindi is a pure function of the action id and its parameters.
- The response reports whether the Hindi came from `gemini`, `builtin` or `mixed`, and the page says so.

## Data and assumptions

- **Air data** is the CAMS model estimate from Open-Meteo, not CPCB station readings, and the CPCB bands are applied to current rather than 24-hour averages. The interface explains why it can differ from other apps.
- **Impact figures** (mask efficiency, purifier reduction, CO2 per km) are typical-value approximations, labelled as such, and the exposure model's assumptions are shown beside its result.
- **Scaling.** The rate limiter and caches are per process. Behind several instances, put a shared limiter in front and set a spend quota on the Gemini project.
- **Not medical advice.** Households with vulnerable members are told when to seek care.
