import { handleLiveData } from '../../src/server/control-plane/live-data.mjs';

const SUCCESS_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600';
const ERROR_CACHE_CONTROL = 'no-store, max-age=0';

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const { status, body } = await handleLiveData(searchParams);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status >= 200 && status < 300 ? SUCCESS_CACHE_CONTROL : ERROR_CACHE_CONTROL
    }
  });
}
