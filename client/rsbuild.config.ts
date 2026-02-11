import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

import pkgJson from './package.json';
import { pluginPrimeThemes } from './rsbuild-plugins/plugin-prime-themes';

const defaultPort = 3024;
const SERVER_PORT = process.env.SERVER_PORT ?? defaultPort;

// Base path for GitHub Pages (set via GITHUB_PAGES_BASE_PATH env var)
// For project pages: /repo-name/
// For user/organization pages: /
const basePath = process.env.GITHUB_PAGES_BASE_PATH ?? '/';
console.log(`Using base path: "${basePath}"`);

const version = pkgJson.version;

export default defineConfig({
  plugins: [pluginReact(), pluginSass(), pluginPrimeThemes()],
  html: {
    template: './public/index.html',
  },
  output: {
    distPath: {
      root: '../dist',
    },
    assetPrefix: basePath,
  },
  source: {
    define: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __GITHUB_PAGES_BASE_PATH__: JSON.stringify(basePath),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __VERSION__: JSON.stringify(version),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __SERVER_PORT__: JSON.stringify(SERVER_PORT),
    },
  },
  server: {
    proxy: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '/api': {
        target: `http://127.0.0.1:${SERVER_PORT}`,
      },
    },
    open: true,
  },
});
