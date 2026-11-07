export const LIMITS = Object.freeze({
  hookMaxWords: 15,
  onScreenTextMaxWords: 8,
});

export function loadConfig(env) {
  const apiKey = (env.ANTHROPIC_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Set it in the environment and restart, e.g. ANTHROPIC_API_KEY=sk-... npm start',
    );
  }
  return {
    apiKey,
    model: env.MODEL || 'claude-haiku-5-5',
    port: Number(env.PORT) || 3000,
  };
}
