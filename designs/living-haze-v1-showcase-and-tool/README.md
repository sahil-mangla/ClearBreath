# Design snapshot: Living haze v1 (Showcase + Tool tabs)

Saved before the smoke-cloud and pixel-city iteration. Not served by the app.

What it is: soft radial-gradient haze canvas whose density follows the live AQI, resolving-from-blur
headline text (Gloock over Hanken Grotesk), live AQI numeral, CPCB band scale, and two page shapes
(Showcase, Tool) switchable from header tabs or `?layout=showcase|tool`.

Restore it:

```bash
cp -R designs/living-haze-v1-showcase-and-tool/web/. web/
cp designs/living-haze-v1-showcase-and-tool/public/{index.html,styles.css,tokens.css,base.css} public/
cp designs/living-haze-v1-showcase-and-tool/web-lib.test.js test/web-lib.test.js
npm run build && npm start
```

`public/app.js` here is the built bundle of this version, for reference. Fonts are shared with the live app (`public/fonts/`).
