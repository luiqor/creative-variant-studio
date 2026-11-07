import { DEFAULT_WORD_LIMIT, WORD_LIMITS, WORD_MINIMUMS, wordLimit } from '../public/js/idea-types.js';

export const LIMITS = WORD_LIMITS;
export { DEFAULT_WORD_LIMIT, WORD_MINIMUMS, wordLimit };

export function loadConfig(env) {
  const apiKey = (env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is required. Set it in the environment and restart, e.g. GEMINI_API_KEY=... npm start',
    );
  }
  return {
    apiKey,
    model: env.MODEL || 'gemini-3.5-flash-lite',
    port: Number(env.PORT) || 3000,
  };
}
