/**
 * Structure rules that a linter has no setting for, enforced in `npm run check` and CI:
 *  - a source file in src/, web/, api/ or server.js is at most MAX_LINES lines;
 *  - a line is at most MAX_COLUMNS characters, except a line of prose copy (a string or template literal that
 *    holds advice text, a prompt or a message), which a formatter cannot wrap, and tool directives.
 * Pure helpers are exported so test/backend/structure.test.js can pin the rules down.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_LINES = 200;
export const MAX_COLUMNS = 120;

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SOURCE_DIRS = ['src', 'web', 'api'];
const SOURCE_FILES = ['server.js'];
const EXTENSIONS = /\.(js|jsx|mjs)$/;

/** Prose copy: a line that opens with a string or template literal (after an optional key, `?` or `:`), or a prompt line. */
const PROSE =
  /^\s*(?:export const \w+ = |\w+: |[?:]\s*|\[\s*)?(?:['"`]|- )|^(?:Task|Rules?|Output|Input|Example): /;
const DIRECTIVE = /^\s*\/\/\s*(?:oxlint|eslint|prettier|@ts-)/;

/** @returns {boolean} whether this line is too long to be allowed. */
export function isTooLong(line) {
  return [...line].length > MAX_COLUMNS && !PROSE.test(line) && !DIRECTIVE.test(line);
}

/** @returns {string[]} one message per rule broken by a file's text. */
export function problemsIn(name, text) {
  const lines = text.split('\n');
  const found = [];
  if (lines.length > MAX_LINES + 1) found.push(`${name}: ${lines.length - 1} lines (limit ${MAX_LINES})`);
  lines.forEach((line, i) => {
    if (isTooLong(line))
      found.push(`${name}:${i + 1}: ${[...line].length} characters (limit ${MAX_COLUMNS})`);
  });
  return found;
}

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (EXTENSIONS.test(entry.name)) yield path;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = [
    ...SOURCE_FILES.map((f) => join(ROOT, f)),
    ...SOURCE_DIRS.filter((d) => !d.startsWith('.')).flatMap((d) => [...sourceFiles(join(ROOT, d))]),
  ].filter((f) => !f.includes('public'));
  const problems = files.flatMap((f) => problemsIn(relative(ROOT, f), readFileSync(f, 'utf8')));
  if (problems.length) {
    console.error(problems.join('\n'));
    console.error(`\n${problems.length} structure problem(s).`);
    process.exit(1);
  }
  console.log(`structure ok: ${files.length} files within ${MAX_LINES} lines and ${MAX_COLUMNS} columns`);
}
