async function send(method, url, request, fetchFn) {
  const init = { method };
  if (request !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(request);
  }
  const response = await fetchFn(url, init).catch(() => {
    throw new Error('Could not reach the server.');
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(body?.error || `Request failed (${response.status}).`), { code: body?.code ?? null });
  }
  return body;
}

export const requestBatch = (request, fetchFn = fetch) => send('POST', '/api/generate', request, fetchFn);

export const requestMore = (request, fetchFn = fetch) => send('POST', '/api/more-like-this', request, fetchFn);

export const getTokenStatus = (fetchFn = fetch) => send('GET', '/api/token', undefined, fetchFn);

export const saveToken = (token, fetchFn = fetch) => send('PUT', '/api/token', { token }, fetchFn);
