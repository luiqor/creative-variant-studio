async function postJson(url, request, fetchFn) {
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }).catch(() => {
    throw new Error('Could not reach the server.');
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

export const requestBatch = (request, fetchFn = fetch) => postJson('/api/generate', request, fetchFn);

export const requestMore = (request, fetchFn = fetch) => postJson('/api/more-like-this', request, fetchFn);
