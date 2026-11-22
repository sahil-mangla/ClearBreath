import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { MAX_COLUMNS, MAX_LINES, isTooLong, problemsIn } from '../../scripts/check-structure.mjs';

test('a code or comment line past the column limit is a problem; plain prose copy and tool directives are not', () => {
  const long = 'x'.repeat(MAX_COLUMNS + 1);
  assert.equal(isTooLong(`const a = ${long};`), true);
  assert.equal(isTooLong(`  // ${long}`), true);
  assert.equal(isTooLong(`  'detail': '${long}',`), false);
  assert.equal(isTooLong(`  text: '${long}',`), false);
  assert.equal(isTooLong(`  \`${long}\``), false);
  assert.equal(isTooLong(`  \`${long} \${value}\`,`), true); // interpolation makes it code: split it
  assert.equal(isTooLong(`// oxlint-disable-next-line some-rule -- ${long}`), false);
  assert.equal(isTooLong('const short = 1;'), false);
});

test('a file past the line limit is reported once, with its length', () => {
  const text = `${'const a = 1;\n'.repeat(MAX_LINES + 1)}`;
  assert.deepEqual(problemsIn('big.js', text), [`big.js: ${MAX_LINES + 1} lines (limit ${MAX_LINES})`]);
  assert.deepEqual(problemsIn('ok.js', 'const a = 1;\n'.repeat(MAX_LINES)), []);
});

test('test files have their lines capped but not their length', () => {
  const text = `${'const a = 1;\n'.repeat(MAX_LINES + 1)}const b = '${'x'.repeat(MAX_COLUMNS)}';\n`;
  assert.equal(problemsIn('long.test.js', text, { capLines: false }).length, 1);
  assert.match(problemsIn('long.test.js', text, { capLines: false })[0], /^long\.test\.js:\d+: /);
});

test('every source file in the repository is within the limits', () => {
  const out = execFileSync(process.execPath, ['scripts/check-structure.mjs'], { encoding: 'utf8' });
  assert.match(out, /^structure ok/);
});
