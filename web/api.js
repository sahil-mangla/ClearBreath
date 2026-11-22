// Thin fetch wrapper: timeout, abort passthrough, and human-readable errors.
const TIMEOUT_MS = 25_000;

/** @param {string} path @param {RequestInit} [options] @returns {Promise<any>} the parsed JSON reply */
async function request(path, { signal, ...options } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(path, { ...options, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), {
        details: data.details,
        fields: data.fields,
        code: data.code,
      });
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      if (timedOut)
        throw Object.assign(new Error('The request took too long. Please try again.'), { code: 'timeout' });
      throw err; // caller cancelled: let it through untouched
    }
    if (err instanceof TypeError)
      throw Object.assign(new Error('Could not reach the server. Check your connection.'), {
        code: 'offline',
      });
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** @param {unknown} body */
const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const getCities = () => request('/api/cities');
/** @param {string} city @param {AbortSignal} [signal] */
export const getAir = (city, signal) => request(`/api/air?city=${encodeURIComponent(city)}`, { signal });
/** @param {unknown} body */
export const postPlan = (body) => request('/api/plan', json(body));
/** @param {unknown} body */
export const postAsk = (body) => request('/api/ask', json(body));
