# Code quality

How the code is organised, and the checks that keep it that way. Run everything with `npm run check`.

## Layout

| Area | Files | Job |
| --- | --- | --- |
| Server | `src/app.js` | Routing only: static, health, rate limit, `/api/*`, error mapping |
| | `src/http.js` | Security headers, `HttpError`, JSON body reading, client identity for rate limiting |
| | `src/static.js` | Loads the public assets once; ETag, gzip and cache headers |
| | `src/handlers.js`, `src/handlers/` | `handlers.js` wires the endpoints; `handlers/` holds one file per job: `reading` (air data to an AQI), `plan`, `ask` and `errors` |
| Rules engine | `src/rules.js` | Facade that re-exports the public API |
| | `src/rules/` | `constants`, `helpers`, `exposure`, `routine`, `indoor`, `alternatives`, `alerts`, `plan`, `briefing`: one concern per file |
| Domain | `src/aqi.js`, `cities.js`, `validate.js`, `hi.js`, `translate.js`, `llm.js`, `airdata.js`, `determinism.js`, `ratelimit.js` | Pure or injectable; tested directly, or through the endpoints that use them (`cities`, `translate`, `replies`) |
| | `src/llm/` | The Gemini client's parts: `prompts` (instructions, schemas, limits), `budget`, `cache`, `transport` (HTTP, retry, deadline), `runner` (the one cached-generate sequence) and `tasks` (briefing, translation and answer). `llm.js` composes them |
| | `src/limits.js`, `src/languages.js` | The allowed form values and numeric ranges, and the language list, shared by server validation and the form |
| | `src/types.js` | The server's JSDoc types (`PlanProfile`, `Action`, `PlanReply` and the rest); the page's `PlanResult` is `PlanReply`, so a handler that drifts from what the page expects fails `typecheck` |
| | `src/replies.js`, `src/hi/` | The reply blocks and Gemini facts (`replies`); the Hindi catalogue split into `phrases` and `actions`, with `hi.js` applying it |
| Front end | `web/` (React) | `App.jsx` (state and layout) with `appHooks.js`, `sections.jsx` (hero, scale, plan, results), `TopBar.jsx` and `settings.js`; `usePlanRequest.js` (request queue, errors, result); `PlanForm.jsx` with `FormSections.jsx` and `FormFields.jsx`; `Results.jsx` with `ExposureSection.jsx`, `ActionGroup.jsx` and `Share.jsx`; `Smoke.jsx` over `smokeLoop.js` (animation), `smokePainter.js` and `smokeSprites.js` (canvas drawing); `PixelCity.jsx` over `pixelArt.js`, `skyline.js` and `visibility.js`; `copy/en.js` and `copy/hi.js` (interface strings, key-for-key); `types.js` (JSDoc shapes); pure helpers in `lib.js`; bundled to `public/app.js` |
| Scripts | `scripts/` | `build.mjs`, `check-structure.mjs`, and the real-Chrome smoke test: `browser-smoke.mjs` over `smoke/` (`launch`, `session`, `pageScripts`, `checks`) |
| Tests | `test/backend/`, `test/web/`, `test/helpers/` | A test file per area (HTTP helpers, static serving, server, validation, rules, AQI, Hindi, Gemini client, front end); a golden test pins the whole rules engine; `helpers/grid.js` enumerates the scenario grids |

## How the rules engine stays small

Each recommendation is a short function that takes one context object and returns an action or `null`. A group of actions is a list of those functions, so adding advice means adding one function and one list entry. The plan is built from the lists in a fixed order, and `test/backend/rules.golden.test.js` hashes every plan, exposure estimate and fallback briefing over 27,648 scenarios and fails if any output changes. The refactor was also checked against the original engine over a larger grid of 207,360 scenarios.

## Enforced checks (all in CI)

- `npm run lint`: oxlint with `--deny-warnings` (correctness errors, suspicious patterns, React hook rules) plus function-level limits that apply to source and tests alike: cyclomatic complexity 12, 60 lines per function, 4 parameters, nesting depth 4. Currently zero findings.
- `npm run structure`: `scripts/check-structure.mjs` fails if a file in `src/`, `web/`, `api/`, `scripts/` or `server.js` is over 200 lines, or any line of code or comment (tests included) is over 120 characters. The one exemption is a plain string literal with no interpolation (advice text, prompts, Hindi strings), which a formatter cannot wrap. The rules have their own tests.
- `npm run typecheck`: `tsc` checks `src/`, `web/`, `server.js`, `api/` and `scripts/` against their JSDoc types with `strictNullChecks` and `noImplicitAny` on. Every function parameter is annotated, every component documents its props, and the server's reply type is the page's `PlanResult`. Currently zero errors.
- `npm run format:check`: Prettier, with `.editorconfig` for editors.
- `npm test`: 157 tests (backend, validation, rules, determinism, components, deploy config, and the structure check itself).
- `npm run test:browser`: 18 checks in real Chrome (layout, motion, contrast, keyboard, phone layout, console errors).

## Conventions

- Zero runtime dependencies on the server; dev tooling only in `devDependencies`.
- User-supplied text is treated as data: length-capped, stripped of control characters, never placed in the instruction part of a model prompt.
- One definition for each shared fact: the AQI bands, the language list and default, the question length limits, the mask rule and the outdoor hours live in one module each and are imported by both sides; tests fail if the English and Hindi catalogues drift.
- `public/app.js` is generated from `web/`; CI fails if the committed copy differs from a fresh build.
