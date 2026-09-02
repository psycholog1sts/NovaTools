import { accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import baseConfig from './vite.config.js';

const canonicalToolDevRoutes = {
  name: 'novatools-canonical-tool-dev-routes',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      const requestUrl = String(request.url || '');
      const queryIndex = requestUrl.indexOf('?');
      const rawPath = queryIndex >= 0 ? requestUrl.slice(0, queryIndex) : requestUrl;
      const query = queryIndex >= 0 ? requestUrl.slice(queryIndex) : '';

      let pathname;
      try {
        pathname = decodeURIComponent(rawPath);
      } catch {
        return next();
      }

      const match = pathname.match(/^\/(?:(en|tr|ar)\/)?tools\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/index\.html|\/)?$/i);
      if (!match) return next();

      const [, , category, slug] = match;
      const sourceFile = resolve(process.cwd(), 'src', 'tools', category, slug, 'index.html');

      try {
        accessSync(sourceFile, constants.R_OK);
      } catch {
        return next();
      }

      request.url = `/src/tools/${category}/${slug}/index.html${query}`;
      return next();
    });
  }
};

export default defineConfig({
  ...baseConfig,
  plugins: [canonicalToolDevRoutes, ...(baseConfig.plugins || [])]
});
