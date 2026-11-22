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
| Front end | `web/` (React) | Components, hooks, strings, pure helpers in `lib.js`; bundled to `public/app.js` |

## How the rules engine stays small

Each recommendation is a short function that takes one context object and returns an action or `null`. A group of actions is a list of those functions, so adding advice means adding one function and one list entry. The plan is built from the lists in a fixed order, and a test suite plus a one-off comparison over 207,360 input combinations confirmed that splitting the engine did not change any output.

## Enforced checks (all in CI)

- `npm run lint`: oxlint with `--deny-warnings` (correctness errors, suspicious patterns, React hook rules). Currently zero findings.
- `npm run typecheck`: `tsc` checks the server's JavaScript against its JSDoc types, with `strictNullChecks` on. Currently zero errors.
- `npm run format:check`: Prettier, with `.editorconfig` for editors.
- `npm test`: 140 tests (backend, validation, rules, determinism, components, deploy config).
- `npm run test:browser`: 17 checks in real Chrome (layout, motion, contrast, keyboard, console errors).

## Conventions

- Zero runtime dependencies on the server; dev tooling only in `devDependencies`.
- User-supplied text is treated as data: length-capped, stripped of control characters, never placed in the instruction part of a model prompt.
- One definition for each shared fact (AQI bands, languages, mask rule); tests fail if the English and Hindi catalogues drift.
- `public/app.js` is generated from `web/`; CI fails if the committed copy differs from a fresh build.
