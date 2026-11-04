import { handleLiveData } from '../src/server/control-plane/live-data.mjs';

export const config = { runtime: 'edge' };

const SUCCESS_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600';
const ERROR_CACHE_CONTROL = 'no-store, max-age=0';

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const { status, body } = await handleLiveData(searchParams, typeof process !== 'undefined' ? process.env : {});
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status >= 200 && status < 300 ? SUCCESS_CACHE_CONTROL : ERROR_CACHE_CONTROL
    }
  });
}
