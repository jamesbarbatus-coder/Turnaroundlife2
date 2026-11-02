// Phase 1 scaffold. USDA proxy implementation is scheduled for Phase 2.
// Keep this function path excluded from the service worker at all times.
export default async function handler() {
  return new Response(JSON.stringify({
    error: 'USDA integration is not enabled in this Phase 1 build.',
    code: 'USDA_NOT_IMPLEMENTED'
  }), {
    status: 501,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
