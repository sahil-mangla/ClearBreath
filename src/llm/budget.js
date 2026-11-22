const WINDOW_MS = 60_000;

/**
 * A global ceiling on Gemini calls per minute (retries count), so many visitors cannot run up an unbounded
 * bill. Past the ceiling `take()` returns false and callers fall back to the rules engine and built-in Hindi.
 * @param {{maxCallsPerMin:number, now:() => number}} options
 */
export function createBudget({ maxCallsPerMin, now }) {
  let windowStart = now();
  let used = 0;
  return {
    take() {
      if (now() - windowStart >= WINDOW_MS) {
        windowStart = now();
        used = 0;
      }
      if (used >= maxCallsPerMin) return false;
      used += 1;
      return true;
    },
  };
}
