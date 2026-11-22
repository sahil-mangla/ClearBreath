// A Chrome DevTools Protocol session: send commands, evaluate page scripts, load pages, collect problems.
import { until, sleep } from './launch.mjs';

// What the stubbed /api/air returns, so every run sees the same "Very Poor" reading.
const AIR_LEVEL = { aqi: 350, levelIndex: 4, category: 'Very Poor', pm25: 250 };

const airReply = () => ({
  city: { key: 'delhi', name: 'Delhi' },
  air: { ...AIR_LEVEL, dominant: 'PM2.5', observedAt: new Date().toISOString(), source: 'smoke-test' },
});

/**
 * The command that answers a paused request: the stubbed air reading for /api/air, else let it through.
 * @param {{requestId:string, request:{url:string}}} paused
 * @returns {[string, object]}
 */
const stubAir = ({ requestId, request }) =>
  request.url.includes('/api/air')
    ? [
        'Fetch.fulfillRequest',
        {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'content-type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify(airReply())).toString('base64'),
        },
      ]
    : ['Fetch.continueRequest', { requestId }];

/**
 * @typedef {(name:string, ok:boolean, extra?:string) => void} Check
 * @typedef {Awaited<ReturnType<typeof connect>>} Session
 */

/**
 * Open the first page target of the Chrome on `debugPort` and drive it.
 * @param {{debugPort:number, base:string}} options
 */
export async function connect({ debugPort, base }) {
  const targets = await until(
    async () =>
      (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(
        (/** @type {{type:string}} */ t) => t.type === 'page',
      ),
    30000, // a cold CI runner can take over ten seconds to open the first page
    'Chrome',
  );
  const ws = new WebSocket(targets.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let nextId = 0;
  /** @type {Map<number, (message: any) => void>} */
  const pending = new Map();
  /** @type {string[]} console errors, exceptions, CSP violations */
  const problems = [];
  /** @param {string} method @param {object} [params] @returns {Promise<any>} */
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  /** @param {{method?:string, params?:any}} event */
  const onEvent = ({ method, params }) => {
    if (method === 'Log.entryAdded' && params.entry.level === 'error')
      problems.push(`log: ${params.entry.text}`.slice(0, 200));
    if (method === 'Runtime.exceptionThrown')
      problems.push(`exception: ${JSON.stringify(params.exceptionDetails).slice(0, 200)}`);
    if (method === 'Fetch.requestPaused') send(...stubAir(params));
  };
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const resolve = pending.get(message.id);
    if (resolve) {
      resolve(message);
      pending.delete(message.id);
    }
    onEvent(message);
  };

  /** @param {string} expression */
  const js = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(`page script failed: ${expression.slice(0, 80)}`);
    return r.result?.result?.value;
  };
  const load = async (query = '', { reduced = false, width = 1280, height = 800, mobile = false } = {}) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }],
    });
    await send('Page.navigate', { url: `${base}${query}` });
    await until(() => js(`!!document.querySelector('.readout__num')`), 8000, 'the AQI readout');
    await sleep(600);
  };
  const close = () => ws.close();

  return { send, js, load, problems, close };
}
