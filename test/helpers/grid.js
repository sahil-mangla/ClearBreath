/**
 * Every combination of the given dimensions, the last varying fastest:
 * `grid({ a: [1, 2], b: ['x'] })` yields `{ a: 1, b: 'x' }` then `{ a: 2, b: 'x' }`.
 * @param {Record<string, readonly unknown[]>} dimensions
 * @returns {Generator<Record<string, any>>}
 */
export function* grid(dimensions) {
  const entries = Object.entries(dimensions);
  function* walk(index, picked) {
    if (index === entries.length) {
      yield picked;
      return;
    }
    const [name, values] = entries[index];
    for (const value of values) yield* walk(index + 1, { ...picked, [name]: value });
  }
  yield* walk(0, {});
}
