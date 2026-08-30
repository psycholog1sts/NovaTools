import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const configFile = fileURLToPath(new URL('../vite.dev.config.js', import.meta.url));

const server = await createServer({
  configFile,
  logLevel: 'silent',
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: false,
    open: false
  }
});

try {
  await server.listen();

  const address = server.httpServer?.address();
  assert.ok(address && typeof address === 'object', 'Vite dev server did not expose a listening address.');
  const origin = `http://127.0.0.1:${address.port}`;

  for (const [route, marker] of [
    ['/tools/converters/age-calculator/', /Age Calculator/i],
    ['/tools/converters/unix-timestamp/', /Unix Timestamp/i]
  ]) {
    const response = await fetch(`${origin}${route}`, { redirect: 'manual' });
    const body = await response.text();
    assert.equal(
      response.status,
      200,
      `Canonical dev route ${route} must resolve to its source MPA page instead of Not Found. Got ${response.status}: ${body.slice(0, 160)}`
    );
    assert.match(body, marker, `Canonical dev route ${route} returned the wrong HTML document.`);
  }

  const missing = await fetch(`${origin}/tools/converters/definitely-not-a-real-tool/`, { redirect: 'manual' });
  assert.equal(missing.status, 404, 'Unknown canonical tool routes must remain fail-closed with HTTP 404.');

  console.log('✅ Vite dev canonical tool routes resolve and unknown routes stay fail-closed.');
} finally {
  await server.close();
}
