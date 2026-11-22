# Code quality

How the code is organised, and the checks that keep it that way. Run everything with `npm run check`.

## Layout

| Area | Files | Job |
| --- | --- | --- |
| Server | `src/app.js` | Routing only: static, health, rate limit, `/api/*`, error mapping |
| | `src/http.js` | Security headers, `HttpError`, JSON body reading, client identity for rate limiting |
| | `src/static.js` | Loads the public assets once; ETag, gzip and cache headers |
| | `src/handlers.js` | `plan`, `airNow` and `ask`: validate, fetch, compute, respond |
| Rules engine | `src/rules.js` | Facade that re-exports the public API |
| | `src/rules/` | `constants`, `helpers`, `exposure`, `routine`, `indoor`, `alternatives`, `alerts`, `plan`, `briefing`: one concern per file |
| Domain | `src/aqi.js`, `cities.js`, `validate.js`, `hi.js`, `translate.js`, `llm.js`, `airdata.js`, `determinism.js`, `ratelimit.js` | Pure or injectable, each with its own test file |
| | `src/limits.js` | The allowed form values and numeric ranges, shared by server validation and the form |
| Front end | `web/` (React) | `App.jsx` (layout), `usePlanRequest.js` (request queue, errors, result), `PlanForm.jsx` with `FormSections.jsx` and `FormFields.jsx`, pure helpers in `lib.js`; bundled to `public/app.js` |
| Tests | `test/backend/`, `test/web/`, `test/helpers/` | A test file per area (HTTP helpers, static serving, server, validation, rules, AQI, Hindi, Gemini client, front end); a golden test pins the whole rules engine |

## How the rules engine stays small

Each recommendation is a short function that takes one context object and returns an action or `null`. A group of actions is a list of those functions, so adding advice means adding one function and one list entry. The plan is built from the lists in a fixed order, and `test/backend/rules.golden.test.js` hashes every plan, exposure estimate and fallback briefing over 27,648 scenarios and fails if any output changes. The refactor was also checked against the original engine over a larger grid of 207,360 scenarios.

## Enforced checks (all in CI)

- `npm run lint`: oxlint with `--deny-warnings` (correctness errors, suspicious patterns, React hook rules). Currently zero findings.
- `npm run typecheck`: `tsc` checks the server's JavaScript (`src/`, `server.js`, `api/`) against its JSDoc types with `strictNullChecks` on; the shared types (`PlanProfile`, `Action`, `PlanContext`) are documented in JSDoc. The React code in `web/` is covered by lint and tests, not by `tsc`. Currently zero errors.
- `npm run format:check`: Prettier, with `.editorconfig` for editors.
- `npm test`: 141 tests (backend, validation, rules, determinism, components, deploy config).
- `npm run test:browser`: 17 checks in real Chrome (layout, motion, contrast, keyboard, console errors).

## Conventions

- Zero runtime dependencies on the server; dev tooling only in `devDependencies`.
- User-supplied text is treated as data: length-capped, stripped of control characters, never placed in the instruction part of a model prompt.
- One definition for each shared fact (AQI bands, languages, mask rule); tests fail if the English and Hindi catalogues drift.
- `public/app.js` is generated from `web/`; CI fails if the committed copy differs from a fresh build.
