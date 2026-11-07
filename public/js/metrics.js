export function reportEvent(type, data = {}, fetchFn = fetch) {
  try {
    Promise.resolve(
      fetchFn('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data }),
      }),
    ).catch(() => {});
  } catch {
    // Metrics must never break the UI.
  }
}
