---
name: ClearBreath
description: A smog-season plan for Indian families, set in a room of drifting smoke whose density is today's real AQI.
colors:
  smog-dusk: "oklch(18% 0.012 55)"
  smog-dusk-raised: "oklch(22.5% 0.014 55)"
  smog-dusk-high: "oklch(28% 0.016 55)"
  warm-ink: "oklch(94% 0.012 80)"
  warm-ink-soft: "oklch(84% 0.014 75)"
  warm-muted: "oklch(72% 0.016 70)"
  hairline: "oklch(40% 0.016 60)"
  edge: "oklch(60% 0.016 65)"
  sun-amber: "oklch(79% 0.145 68)"
  amber-ink: "oklch(19% 0.03 60)"
  clear-teal: "oklch(80% 0.095 190)"
  focus-cyan: "oklch(88% 0.12 200)"
  error-coral: "oklch(77% 0.14 27)"
  aqi-good: "oklch(78% 0.15 150)"
  aqi-satisfactory: "oklch(83% 0.15 125)"
  aqi-moderate: "oklch(87% 0.15 95)"
  aqi-poor: "oklch(77% 0.155 60)"
  aqi-very-poor: "oklch(71% 0.18 30)"
  aqi-severe: "oklch(65% 0.2 12)"
typography:
  display:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "clamp(2.5rem, 4.6vw + 0.75rem, 5.5rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  readout:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "clamp(4.5rem, 9vw + 1rem, 9rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.6vw + 1rem, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "clamp(1.25rem, 0.75vw + 0.9rem, 1.625rem)"
    fontWeight: 400
    lineHeight: 1.55
  lead:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 0.35vw + 1rem, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 550
    lineHeight: 1.55
  caption:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  card: "6px"
  pill: "999px"
spacing:
  3xs: "2px"
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  3xl: "96px"
  4xl: "144px"
components:
  button-primary:
    backgroundColor: "{colors.sun-amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-primary-hover:
    backgroundColor: "oklch(76% 0.13 70)"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-quiet:
    textColor: "{colors.warm-ink-soft}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 16px"
  panel:
    backgroundColor: "{colors.smog-dusk-raised}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.card}"
    padding: "40px"
  input:
    backgroundColor: "{colors.smog-dusk}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.card}"
    height: "44px"
    padding: "8px 16px"
  alert:
    backgroundColor: "{colors.smog-dusk-high}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  action-tag:
    textColor: "{colors.sun-amber}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
---

# Design System: ClearBreath

## 1. Overview

**Creative North Star: "The Room of Air"**

The page is a room filled with the air it reports on. A fixed canvas of drifting smoke clouds sits behind everything, and its density is today's real AQI: thick amber-grey when the air is bad, thin cool wisps when it is clean. The headline letters begin as blurred smog and resolve to sharp type. Building a plan visibly thins the haze by the estimated exposure cut. Panels sit in this room as lightness steps of the same warm brown-grey, never as floating glass or cards on cards.

The mood is dusk smog, ember light, cautious hope, matching PRODUCT.md's "plain, kind, non-alarmist" voice. Density is generous: one Showcase page, hero first, then a pixel-art skyline standing on the plan form, then results, a band scale, a follow-up question and a footer under a smoke bank. The system rejects the dashboard-of-cards arrangement, and per PRODUCT.md, "Not another AQI number": the number is large and set in the display serif, but it is always paired with a category word so colour is never the only signal.

The recognizable signature, with all copy removed, is the moving smoke, the pixel-art city above the form, and the amber/teal pair.

**Key Characteristics:**
- Dark-only (`color-scheme: dark`), warm brown-grey ground at L about 18%, pale warm ink.
- One action colour (amber) and one cool colour (teal) that means only "clean or improved".
- Gloock display serif over Hanken Grotesk body; the AQI numeral is display-serif scale.
- Flat: depth comes from lightness steps, hairlines and the smoke, not shadows.
- Motion is atmospheric (smoke, letter resolve, bar grow, slow marker) and every piece has a pause and a reduced-motion path.

## 2. Colors

A restrained smog-dusk palette: warm neutrals carry the surface, amber is the sun through smog and the single action colour, teal appears only where the air is clean or improved, and six CPCB category colours exist purely as data.

### Primary
- **Sun-Through-Smog Amber** (oklch(79% 0.145 68)): the primary button fill, the caret, selection tint, checkbox accent, action tags and the "baseline exposure" bar. It reads as both sun and pollution; keep it to actions and the baseline figure.

### Secondary
- **Clear-Air Teal** (oklch(80% 0.095 190)): the "with your plan" exposure bar, the totals panel tint and success states. It only ever marks what is clean or improved.

### Neutral
- **Smog Dusk** (oklch(18% 0.012 55)): page ground, input fill, and the nearest skyline layer.
- **Smog Dusk Raised** (oklch(22.5% 0.014 55)): panels (at 84% mix) and the scale bands' base.
- **Smog Dusk High** (oklch(28% 0.016 55)): bar tracks, alerts, the middle skyline layer.
- **Warm Ink** (oklch(94% 0.012 80)): primary text.
- **Warm Ink Soft** (oklch(84% 0.014 75)): secondary text, labels, lead copy.
- **Warm Muted** (oklch(72% 0.016 70)): help text, placeholders, disclaimers.
- **Hairline** (oklch(40% 0.016 60)): panel borders and list dividers.
- **Edge** (oklch(60% 0.016 65)): input and ghost-button strokes, the readout top rule.
- **Focus Cyan** (oklch(88% 0.12 200)): the 2px focus outline only.
- **Error Coral** (oklch(77% 0.14 27)): form errors.

### Data: CPCB categories
Good oklch(78% 0.15 150), Satisfactory oklch(83% 0.15 125), Moderate oklch(87% 0.15 95), Poor oklch(77% 0.155 60), Very Poor oklch(71% 0.18 30), Severe oklch(65% 0.2 12). They colour the readout numeral, the scale bands (as tints mixed into the raised ground, 16% idle, 38% for the current band) and the results AQI figure. Haze canvas tones (smoke oklch(48% 0.04 65), ember oklch(58% 0.11 62), clear oklch(60% 0.075 195)) are read by script for the smoke and skyline.

### Named Rules
**The Teal Means Clean Rule.** Teal marks only clean or improved air. It is never an accent, link or decoration.
**The Data Colours Rule.** The six CPCB colours are data: number, band, bar. They are never used for buttons, borders or ornament, and the category word always accompanies them.
**The One Sun Rule.** Amber is the only action colour. A second warm accent is prohibited.

## 3. Typography

**Display Font:** Gloock (with ui-serif, Georgia, serif)
**Body Font:** Hanken Grotesk (variable 100-900, with ui-sans-serif, system-ui, sans-serif)

**Character:** A high-contrast display serif with weight at one regular cut gives the smoke room a printed, almost newspaper-of-record gravity; the humanist grotesk keeps instructions plain and legible in poor light. Both are self-hosted woff2.

### Hierarchy
- **Display** (400, clamp(2.5rem, 4.6vw + 0.75rem, 5.5rem), 1.02, -0.015em): the hero headline, capped at 13ch, resolved letter by letter from blur.
- **Readout** (400, clamp(4.5rem, 9vw + 1rem, 9rem), 0.9): the live AQI numeral, tinted by its category, tabular figures.
- **Headline** (400, clamp(1.75rem, 1.6vw + 1rem, 2.75rem), 1.1): panel, band, results and ask titles.
- **Title** (400, clamp(1.25rem, 0.75vw + 0.9rem, 1.625rem)): the category word beside the readout; the brand wordmark uses 1.5625rem.
- **Lead** (400, clamp(1.125rem, 0.35vw + 1rem, 1.375rem)): the hero sentence (32ch) and the answer text (60ch).
- **Body** (400, 1rem, 1.55): prose at 65ch maximum. Action headings (h4) use Hanken at 650.
- **Label** (550, 0.875rem): field labels, quiet buttons, readout meta. Legends and button text use 650.
- **Caption** (400, 0.8125rem): help text, scale band names, action tags (600).

### Named Rules
**The Display Is Serif Rule.** Headings and the AQI numeral are Gloock at weight 400 with font synthesis off; never faux-bold the display face.
**The Sentence Case Rule.** Labels and tags are sentence case at their natural tracking. All-caps, letterspaced kickers or eyebrows are not part of this system.

## 4. Elevation

Flat. There are no box-shadows anywhere (`--shadow-card: none`). Depth is conveyed by lightness steps (ground, raised, high), 1px hairlines, the smoke canvas behind the content, and by the pixel city's three tonal layers (far haze, mid, near). The header and footer smoke bands are feathered into the ground with a linear mask rather than a shadow. The skyline panel squares its top corners so the city appears to stand on the form.

### Named Rules
**The Flat-By-Default Rule.** Surfaces carry no shadow at rest or on hover. State changes are colour mixes (ink mixed 10% into transparent on hover) and a 1px press translate.
**The No Glass Rule.** Panels are 84% mixes of the raised ground, with no backdrop-filter and no cards nested in cards.

## 5. Components

### Buttons
- **Shape:** fully rounded pill (999px), minimum height 48px, 0 24px padding, weight 650.
- **Primary:** amber fill with amber-ink text (oklch(19% 0.03 60)); hover mixes 14% ink into the amber and drops the border; one per view ("Build my plan").
- **Ghost (default .btn):** transparent, 1px Edge stroke, ink text; hover tints 10% ink and lifts the stroke to Warm Ink Soft; pressed state (`aria-pressed`) is a 14% ink fill.
- **Quiet:** 44px high, 16px padding, 0.875rem, soft ink; for the smoke pause toggle and secondary actions.
- **Active/disabled:** 1px press translate; busy buttons are `aria-disabled` at 70% opacity with a progress cursor.
- **Focus:** 2px Focus Cyan outline, 2px offset, on everything.

### Panels
- **Corner Style:** 6px. **Background:** Smog Dusk Raised at 84%. **Border:** 1px Hairline. **Padding:** 40px (24px under 60rem). **Shadow:** none.
- The panel under the skyline squares its top corners and swaps its top border to Edge.

### Inputs / Fields
- **Style:** 44px minimum height, 6px radius, Smog Dusk fill (darker than the panel), 1px Edge stroke, 8px 16px padding; hover lifts the stroke to Warm Ink Soft.
- **Labels:** 0.875rem soft ink above; help text Warm Muted 0.8125rem; "optional" in Muted.
- **Checks:** 44px rows with a 22px amber-accent checkbox. Errors are Error Coral text with a list, never colour alone.

### Readout (signature)
A top-ruled block at the hero's bottom right: city select, then the AQI numeral in Readout size coloured by category, the category word in Title size beside it, and a 44ch meta line stating that the figure is a modelled estimate. Its `data-level` attribute drives the category colour.

### AQI Band Scale (signature)
Six equal tiles (6px radius, 3px gaps) tinted by their CPCB colour, each labelled with its name, with the current band brightened to a 38% tint and a 3px ink tick marker that slides to the AQI position over 900ms. Under 40rem it stacks vertically and the marker is hidden.

### Exposure Bars and Action List
Two 14px pill tracks on Smog Dusk High: baseline in amber, with-plan in teal, growing by scaleX over 900ms. Actions are a ruled list (1px Hairline top borders) rising in on a 60ms stagger; each has an h4, an amber pill tag and an ink "impact" line explaining the choice. Totals sit in a 14% teal tint panel. Alerts are Smog Dusk High blocks; the critical variant mixes 22% Severe red into the raised ground.

### Smoke (signature)
Canvas clouds in three parallax layers, tinted from the haze tokens, at 30fps, with the pointer parting them. Variant `page` is a fixed full-viewport backdrop with a low amber sun glow and fine grain; variant `band` is a transparent strip used in the header (320px, fading down), footer (360px, fading up) and behind the city. Density follows the AQI and thins as the plan is built. It stops when the tab is hidden, when paused by the user, and under reduced motion (drawn still).

### Pixel City (signature)
A pixelated canvas skyline (5 CSS pixels per art pixel, `image-rendering: pixelated`), 200 to 300px tall, in three tonal layers from the haze tokens. Windows glow amber and flicker slowly at 1.4s ticks; far towers fade as the air thickens. Delhi gets a minar and a gate.

### Smog Text (signature)
Per-letter resolve (1100ms, ease-out): each letter begins at opacity 0, blur up to 12px, with a small rise, on a staggered delay; thicker air starts blurrier. Screen readers get the plain string. Used on the hero headline and the plan results title only.

### Navigation
A minimal bar: the Gloock wordmark at left and the quiet smoke-pause control, over the header smoke band. A skip link appears at focus as an amber pill. Sticky navigation is not used.

## 6. Do's and Don'ts

### Do:
- **Do** keep the smoke density bound to the live AQI and let it thin when a plan is built.
- **Do** pair every AQI colour with its category word or number; never colour alone.
- **Do** use amber (oklch(79% 0.145 68)) for the single primary action per view and teal (oklch(80% 0.095 190)) only for clean or improved air.
- **Do** build depth from the three ground steps (L 18%, 22.5%, 28%) and 1px hairlines.
- **Do** keep targets at least 44px (buttons 48px) and body at 4.5:1 or better on the ground.
- **Do** keep a pause control and a reduced-motion path for every animation; reduced motion shows text at rest and smoke still.
- **Do** label estimates as approximate and keep safety messages prominent and unanimated (PRODUCT.md: "Safety information is never decorative or hidden behind motion").

### Don't:
- **Don't** arrange the page as a dashboard of cards, or nest cards in cards.
- **Don't** use glass, backdrop-filter or drop shadows.
- **Don't** use the CPCB data colours for buttons, borders or decoration.
- **Don't** use teal as a general accent or link colour.
- **Don't** set all-caps letterspaced kickers or eyebrows above headings.
- **Don't** invent statistics, testimonials or logos (PRODUCT.md: "No invented stats").
- **Don't** animate blur on more than the hero headline and results title.
- **Don't** introduce a second display face or a light theme without a deliberate system change.
