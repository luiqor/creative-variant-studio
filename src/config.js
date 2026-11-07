export const LIMITS = Object.freeze({
  hook: 15,
  on_screen_text: 8,
});

export const DEFAULT_WORD_LIMIT = 15;

export const wordLimit = (type, limits = LIMITS) => limits[type] ?? DEFAULT_WORD_LIMIT;

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
