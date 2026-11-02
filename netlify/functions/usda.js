const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

export default async function handler(request) {
  if (request.method !== 'GET') return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for USDA searches and food details.' } }, 405);
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return json({ ok: false, error: { code: 'USDA_KEY_MISSING', message: 'The USDA API key is not configured on this Netlify site. Add USDA_API_KEY to the site environment variables.' } }, 503);

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  let upstreamUrl;
  let options;
  if (action === 'search') {
    const query = (url.searchParams.get('q') || '').trim();
    if (query.length < 2 || query.length > 120) return json({ ok: false, error: { code: 'INVALID_QUERY', message: 'Enter a search term between 2 and 120 characters.' } }, 400);
    upstreamUrl = `${USDA_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}`;
    options = { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ query, pageSize: 12, pageNumber: 1 }) };
  } else if (action === 'food') {
    const fdcId = url.searchParams.get('fdcId') || '';
    if (!/^\d{1,12}$/.test(fdcId)) return json({ ok: false, error: { code: 'INVALID_FDC_ID', message: 'A valid USDA food identifier is required.' } }, 400);
    upstreamUrl = `${USDA_BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;
    options = { method: 'GET', headers: { accept: 'application/json' } };
  } else {
    return json({ ok: false, error: { code: 'INVALID_ACTION', message: 'Supported actions are search and food.' } }, 400);
  }

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, { ...options, signal: AbortSignal.timeout(12000) });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return json({ ok: false, error: { code: timeout ? 'USDA_TIMEOUT' : 'USDA_NETWORK_ERROR', message: timeout ? 'USDA did not respond in time. Please try again.' : 'The USDA service could not be reached. Check the connection and try again.' } }, 502);
  }

  if (upstream.status === 401 || upstream.status === 403) return json({ ok: false, error: { code: 'USDA_AUTH_ERROR', message: 'USDA rejected the API key. Check the USDA_API_KEY Netlify environment variable.' } }, 502);
  if (upstream.status === 429) return json({ ok: false, error: { code: 'USDA_RATE_LIMIT', message: 'USDA search is temporarily rate-limited. Please wait and try again.' } }, 429);
  if (upstream.status >= 500) return json({ ok: false, error: { code: 'USDA_UNAVAILABLE', message: 'USDA FoodData Central is temporarily unavailable.' } }, 503);
  if (!upstream.ok) return json({ ok: false, error: { code: 'USDA_API_ERROR', message: `USDA returned an unexpected response (${upstream.status}).` } }, 502);

  let data;
  try { data = await upstream.json(); }
  catch { return json({ ok: false, error: { code: 'USDA_INVALID_RESPONSE', message: 'USDA returned data that could not be read.' } }, 502); }
  if (!data || typeof data !== 'object') return json({ ok: false, error: { code: 'USDA_INVALID_RESPONSE', message: 'USDA returned an invalid data structure.' } }, 502);
  return json({ ok: true, action, data });
}
