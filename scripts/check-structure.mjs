/**
 * Structure rules that a linter has no setting for, enforced in `npm run check` and CI:
 *  - a file in src/, web/, api/, scripts/ or server.js is at most MAX_LINES lines (test files may be longer:
 *    a test file groups many small cases, so only its lines are capped);
 *  - a line, in those files and in test/, is at most MAX_COLUMNS characters, except a line of prose copy (a
 *    plain string or backtick literal with no `${}` in it: advice text, a prompt, a message), which a formatter
 *    cannot wrap, and tool directives.
 * Pure helpers are exported so test/backend/structure.test.js can pin the rules down.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_LINES = 200;
export const MAX_COLUMNS = 120;

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SOURCE_DIRS = ['src', 'web', 'api', 'scripts'];
const SOURCE_FILES = ['server.js'];
const TEST_DIRS = ['test'];
const EXTENSIONS = /\.(js|jsx|mjs)$/;

/** Prose copy: a line that opens with a string literal (after an optional key, `?` or `:`), or a prompt line. */
const PROSE =
  /^\s*(?:export const \w+ = |\w+: |[?:]\s*|\[\s*)?(?:['"`]|- )|^(?:Task|Rules?|Output|Input|Example): /;
const DIRECTIVE = /^\s*\/\/\s*(?:oxlint|eslint|prettier|@ts-)/;

/** A literal with interpolation is code, not prose: it can be split across lines. */
/** @param {string} line */
const isProse = (line) => PROSE.test(line) && !line.includes('${');

/**
 * @param {string} line
 * @returns {boolean} whether this line is too long to be allowed.
 */
export function isTooLong(line) {
  return [...line].length > MAX_COLUMNS && !isProse(line) && !DIRECTIVE.test(line);
}

/**
 * @param {string} name
 * @param {string} text
 * @param {{capLines?:boolean}} [options] `capLines: false` for test files, which only have their lines capped
 * @returns {string[]} one message per rule broken by a file's text.
 */
export function problemsIn(name, text, { capLines = true } = {}) {
  const lines = text.split('\n');
  const found = [];
  if (capLines && lines.length > MAX_LINES + 1)
    found.push(`${name}: ${lines.length - 1} lines (limit ${MAX_LINES})`);
  lines.forEach((line, i) => {
    if (isTooLong(line))
      found.push(`${name}:${i + 1}: ${[...line].length} characters (limit ${MAX_COLUMNS})`);
  });
  return found;
}

/**
 * @param {string} dir
 * @returns {Generator<string>}
 */
function* sourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (EXTENSIONS.test(entry.name)) yield path;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  /** @param {string[]} dirs */
  const filesIn = (dirs) => dirs.flatMap((d) => [...sourceFiles(join(ROOT, d))]);
  const source = [...SOURCE_FILES.map((f) => join(ROOT, f)), ...filesIn(SOURCE_DIRS)];
  const tests = filesIn(TEST_DIRS);
  /** @param {string} file @param {{capLines?:boolean}} [options] */
  const check = (file, options) => problemsIn(relative(ROOT, file), readFileSync(file, 'utf8'), options);
  const problems = [
    ...source.flatMap((f) => check(f)),
    ...tests.flatMap((f) => check(f, { capLines: false })),
  ];
  if (problems.length) {
    console.error(problems.join('\n'));
    console.error(`\n${problems.length} structure problem(s).`);
    process.exit(1);
  }
  console.log(
    `structure ok: ${source.length} source files within ${MAX_LINES} lines and ${MAX_COLUMNS} columns, ` +
      `${tests.length} test files within ${MAX_COLUMNS} columns`,
  );
}
