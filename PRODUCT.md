# Product

ClearBreath: a GenAI-powered assistant that helps Indian families and communities get through severe winter smog.

## Platform

web

## Stack

Node 20+ HTTP server with zero runtime dependencies (`src/`), serving a single-page React 18 front end. The front end is written in JSX under `web/` and bundled with esbuild into `public/app.js` (committed). Fonts are self-hosted. Gemini API for the briefing and Q&A, with a rules-engine fallback. Live air data from Open-Meteo.

## Users

Families and neighbourhood groups in Delhi-NCR and the wider Indo-Gangetic plain, plus other Indian cities. Parents of young children, households with elders or asthma, people who commute by car, two-wheeler or metro. Often on a phone, often at the moment the air looks bad. Some prefer Hindi.

## Product Purpose

Turn live air quality for a city into a personalised plan: a low-emission daily routine, indoor air hacks and sustainable alternatives, each with the direct impact of the choice explained. Success is a family leaving with three concrete things to do today and understanding why each helps.

## Positioning

Not another AQI number. It converts the number into decisions tailored to the household, shows the estimated effect of those decisions, and is honest about uncertainty.

## Operating Context

Surface is a tool used briefly and repeatedly in smog season (October to February), at home, on a phone, in poor air and often in low light. Evidence says answers must be fast, readable and calm. Judged in a hackathon on code quality, security, efficiency, testing, accessibility and alignment with the problem statement.

## Capabilities and Constraints

- Strict CSP (`default-src 'none'`, no inline script or style). All UI text is inserted through React text nodes, never raw HTML.
- Cities come from a fixed allow-list. No free-text geocoding.
- Air data is a modelled estimate (CAMS via Open-Meteo), not CPCB station data, and the UI says so.
- Impact numbers are labelled approximate. No invented statistics, testimonials or logos.
- Works without a Gemini key.

## Brand Commitments

Name: ClearBreath. India-first (CPCB AQI bands, GRAP, RWA, PM Ujjwala). English and Hindi. Plain, kind, non-alarmist language; safety messages (carbon monoxide, seeking care) stay prominent.

## Evidence on Hand

Live Open-Meteo data per city. The rules engine and exposure model in `src/rules.js`. No user photos, testimonials or usage metrics exist, so none appear.

## Product Principles

1. Explain the impact of every choice in plain words.
2. Be honest about what is estimated.
3. Safety information is never decorative or hidden behind motion.
4. Useful offline of any AI: the AI improves the briefing, it is never required.

## Accessibility & Inclusion

WCAG 2.2 AA: keyboard operable, visible focus, 4.5:1 body contrast, never colour alone for AQI, `aria-live` results, `prefers-reduced-motion` respected, motion can be paused, Hindi text marked `lang="hi"`, touch targets at least 44px.
