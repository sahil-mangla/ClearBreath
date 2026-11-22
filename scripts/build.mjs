// Bundles the React front end (web/main.jsx) into public/app.js and copies the self-hosted fonts.
// Dev-time only: the server itself has no runtime dependencies. The built output is committed.
import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string[]} p */
const at = (...p) => join(root, ...p);

await build({
  entryPoints: [at('web/main.jsx')],
  outfile: at('public/app.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'info',
});

const FONTS = [
  ['node_modules/@fontsource/gloock/files/gloock-latin-400-normal.woff2', 'gloock-latin-400-normal.woff2'],
  [
    'node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2',
    'hanken-grotesk-latin-wght-normal.woff2',
  ],
  [
    'node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-ext-wght-normal.woff2',
    'hanken-grotesk-latin-ext-wght-normal.woff2',
  ],
];
await mkdir(at('public/fonts'), { recursive: true });
for (const [from, to] of FONTS) await copyFile(at(from), at('public/fonts', to));
console.log(`copied ${FONTS.length} fonts`);
