export function createTokenService({ store, createClient, env = {} }) {
  const envKey = (env.GEMINI_API_KEY ?? '').trim();
  const state = { client: null };

  const build = () => {
    const stored = store.load();
    const key = stored || envKey;
    state.client = key ? createClient(key) : null;
  };
  build();

  return {
    getClient: () => state.client,
    configured: () => state.client !== null,
    save(token) {
      store.save(token);
      build();
    },
  };
}
