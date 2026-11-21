# Design snapshot: Living haze v2 (Showcase, smoke clouds, pixel city)

Saved before the dropdown restyle, hero/form space fill, Hindi interface and "right now" actions.
Not served by the app.

Restore it:

```bash
cp -R designs/living-haze-v2-showcase-smoke-city/web/. web/
cp designs/living-haze-v2-showcase-smoke-city/{index.html,styles.css,tokens.css,base.css} public/
npm run build && npm start
```

Newer files in `web/` (strings.js, quick.js, power.js, share.js, i18n.js, RightNow.jsx) are not part of this
snapshot; delete them if you restore it. `app.js` here is the built bundle, for reference.
