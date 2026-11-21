// Renders the real React components to HTML inside `node --test`, with no browser and no extra dependencies:
// esbuild (already a dev dependency) bundles a tiny entry, and react-dom/server turns it into markup.
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ENTRY = `
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LangContext } from './web/i18n.js';
import PlanForm from './web/PlanForm.jsx';
import AskPanel from './web/AskPanel.jsx';
import SmogText from './web/SmogText.jsx';
import Readout, { BandScale } from './web/Readout.jsx';
export const render = (node, lang = 'en') => renderToStaticMarkup(h(LangContext.Provider, { value: lang }, node));
export { h, PlanForm, AskPanel, SmogText, Readout, BandScale };
`;

let loaded;
export function loadComponents() {
  loaded ??= (async () => {
    const out = await build({
      stdin: { contents: ENTRY, resolveDir: root, loader: 'jsx' },
      bundle: true,
      write: false,
      platform: 'node',
      format: 'cjs',
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      logLevel: 'silent',
    });
    const dir = await mkdtemp(join(tmpdir(), 'clearbreath-'));
    const file = join(dir, 'components.cjs');
    await writeFile(file, out.outputFiles[0].text);
    return createRequire(import.meta.url)(file);
  })();
  return loaded;
}
