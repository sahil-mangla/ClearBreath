import { createApp } from './src/app.js';

// Optional local config: a .env file next to this script. Real environment variables win over it.
try {
  process.loadEnvFile(new URL('./.env', import.meta.url));
} catch {
  /* no .env file (or Node < 20.12): the environment alone is used */
}

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';

createApp().listen(port, host, () => {
  const ai = process.env.GEMINI_API_KEY ? 'Gemini enabled' : 'no GEMINI_API_KEY: using built-in rules engine only';
  console.log(`ClearBreath running at http://${host}:${port} (${ai})`);
});
